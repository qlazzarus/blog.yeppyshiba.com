import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    input: null,
    output: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    }
}

if (!config.input) {
    throw new Error('Usage: npm run analyze:drive-telemetry --workspace @games/apex-seoul -- --input <apex-seoul-drive.jsonl>');
}

const inputPath = resolveProjectPath(config.input);
const outputPath = config.output
    ? resolveProjectPath(config.output)
    : inputPath.replace(/\.jsonl$/i, '.summary.json');
const raw = await readFile(inputPath, 'utf8');
const events = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const samples = events.filter((event) => event.type === 'drive_sample');
const summary = buildSummary(events, samples, inputPath);

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Drive telemetry events: ${events.length}`);
console.log(`Drive telemetry samples: ${samples.length}`);
console.log(`Drive telemetry summary wrote ${path.relative(projectRoot, outputPath)}`);

function buildSummary(events, samples, inputPath) {
    const terrainCounts = new Map();
    const contactTerrainCounts = new Map();
    const frameCounts = new Map();
    const viewportCounts = new Map();
    const ranges = {
        cameraPitch: createRange(),
        contactElevationDelta: createRange(),
        elapsedSec: createRange(),
        elevationDelta: createRange(),
        horizonGapY: createRange(),
        horizonY: createRange(),
        rpm: createRange(),
        slopeAcceleration: createRange(),
        speed: createRange(),
        steering: createRange(),
        vehicleY: createRange(),
    };
    let maxVehicleYDelta = 0;
    let maxVehicleYDeltaSameViewport = 0;
    let terrainContactMismatchCount = 0;
    let previousVehicleY = null;
    let previousViewportKey = null;

    for (const sample of samples) {
        const state = sample.payload;
        const anchor = state.vehicle?.anchor;
        const vehicleY = anchor?.y;
        const viewportKey = getViewportKey(state.viewport);

        increment(terrainCounts, anchor?.terrainCue ?? 'unknown');
        increment(contactTerrainCounts, anchor?.contactTerrainCue ?? 'unknown');
        increment(frameCounts, state.vehicle?.frame ?? 'unknown');
        increment(viewportCounts, viewportKey);
        if (
            anchor?.terrainCue &&
            anchor?.contactTerrainCue &&
            anchor.terrainCue !== anchor.contactTerrainCue
        ) {
            terrainContactMismatchCount += 1;
        }
        addRangeValue(ranges.cameraPitch, state.camera?.pitch);
        addRangeValue(ranges.contactElevationDelta, anchor?.contactElevationDelta);
        addRangeValue(ranges.elapsedSec, state.elapsedSec);
        addRangeValue(ranges.elevationDelta, anchor?.elevationDelta);
        addRangeValue(ranges.horizonGapY, state.road?.horizonGapY);
        addRangeValue(ranges.horizonY, state.horizonY);
        addRangeValue(ranges.rpm, state.player?.rpm);
        addRangeValue(ranges.slopeAcceleration, state.player?.slopeAcceleration);
        addRangeValue(ranges.speed, state.player?.speed);
        addRangeValue(ranges.steering, state.player?.steering);
        addRangeValue(ranges.vehicleY, vehicleY);

        if (typeof vehicleY === 'number' && previousVehicleY !== null) {
            const vehicleYDelta = Math.abs(vehicleY - previousVehicleY);

            maxVehicleYDelta = Math.max(maxVehicleYDelta, vehicleYDelta);

            if (viewportKey === previousViewportKey) {
                maxVehicleYDeltaSameViewport = Math.max(maxVehicleYDeltaSameViewport, vehicleYDelta);
            }
        }

        if (typeof vehicleY === 'number') previousVehicleY = vehicleY;
        previousViewportKey = viewportKey;
    }

    return {
        eventCount: events.length,
        frameCounts: Object.fromEntries(frameCounts),
        input: path.relative(projectRoot, inputPath),
        maxVehicleYDelta: Number(maxVehicleYDelta.toFixed(3)),
        maxVehicleYDeltaSameViewport: Number(maxVehicleYDeltaSameViewport.toFixed(3)),
        sampleCount: samples.length,
        terrainContactMismatchCount,
        terrainContactMismatchRatio: samples.length > 0
            ? Number((terrainContactMismatchCount / samples.length).toFixed(3))
            : 0,
        terrainCounts: Object.fromEntries(terrainCounts),
        contactTerrainCounts: Object.fromEntries(contactTerrainCounts),
        viewportCounts: Object.fromEntries(viewportCounts),
        ranges: Object.fromEntries(
            Object.entries(ranges).map(([key, range]) => [
                key,
                {
                    max: range.max === -Infinity ? null : Number(range.max.toFixed(3)),
                    min: range.min === Infinity ? null : Number(range.min.toFixed(3)),
                },
            ]),
        ),
    };
}

function getViewportKey(viewport) {
    if (!viewport || typeof viewport.width !== 'number' || typeof viewport.height !== 'number') {
        return 'unknown';
    }

    return `${Math.round(viewport.width)}x${Math.round(viewport.height)}`;
}

function createRange() {
    return {
        max: -Infinity,
        min: Infinity,
    };
}

function addRangeValue(range, value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;

    range.max = Math.max(range.max, value);
    range.min = Math.min(range.min, value);
}

function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function resolveProjectPath(rawPath) {
    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}
