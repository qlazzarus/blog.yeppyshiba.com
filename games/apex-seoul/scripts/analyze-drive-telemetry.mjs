import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    input: null,
    output: null,
    scoreOutput: null,
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
    } else if (arg === '--score-output' && next) {
        config.scoreOutput = next;
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
const scoreOutputPath = config.scoreOutput
    ? resolveProjectPath(config.scoreOutput)
    : inputPath.replace(/\.jsonl$/i, '.score.json');
const raw = await readFile(inputPath, 'utf8');
const events = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const samples = events
    .filter((event) => event.type === 'drive_sample')
    .map((event) => ({
        ...event,
        payload: event.payload ?? event.state,
    }))
    .filter((event) => event.payload);
const summary = buildSummary(events, samples, inputPath);
const score = buildScore(summary, samples);

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(scoreOutputPath, `${JSON.stringify(score, null, 2)}\n`);

console.log(`Drive telemetry events: ${events.length}`);
console.log(`Drive telemetry samples: ${samples.length}`);
console.log(`Drive telemetry summary wrote ${path.relative(projectRoot, outputPath)}`);
console.log(`Drive telemetry score wrote ${path.relative(projectRoot, scoreOutputPath)}`);
console.log(`Drive telemetry score: ${score.pass ? 'PASS' : 'FAIL'} ${score.totalScore}/100`);

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
        lateralOffset: createRange(),
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
        addRangeValue(ranges.lateralOffset, state.player?.lateralOffset);
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
        scenario: samples[0]?.scenario ?? 'unknown',
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

function buildScore(summary, samples) {
    const scenario = summary.scenario;
    const metrics = collectMetrics(samples);
    const checks = [
        checkAtMost('vehicleY.maxDeltaSameViewport', summary.maxVehicleYDeltaSameViewport, 8, 18, 18),
        checkAtMost('offsetClampHitCount', metrics.offsetClampHitCount, 0, 3, 14),
        checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 620, 700, 14),
        checkAtMost('terrainContactMismatchRatio', summary.terrainContactMismatchRatio, 0.45, 0.7, 8),
        checkAtMost('speedDropFromPeak', metrics.speedDropFromPeak, 140, 230, 10),
    ];

    if (scenario === 'straight-accel-20s') {
        checks.push(checkAtLeast('speedGain', metrics.speedGain, 80, 40, 18));
        checks.push(checkAtMost('straightDrift.maxAbs', metrics.lateralOffsetMaxAbs, 160, 260, 18));
    }

    if (scenario === 'left-hold-3s-release' || scenario === 'right-hold-3s-release') {
        checks.push(checkAtMost('steeringResponseMs', metrics.steeringResponseMs, 250, 650, 16));
        checks.push(checkAtMost('steeringRecoveryMs', metrics.steeringRecoveryMs, 500, 1100, 16));
    }

    if (scenario === 'curve-no-input') {
        checks.push(checkAtMost('curveNoInputDriftMax', metrics.lateralOffsetMaxAbs, 260, 420, 22));
    }

    const penalty = checks.reduce((total, check) => total + check.penalty, 0);
    const totalScore = Math.max(0, Math.round(100 - penalty));

    return {
        checks,
        metrics,
        pass: checks.every((check) => check.status !== 'fail'),
        scenario,
        thresholds: {
            curveNoInputDriftMax: 260,
            lateralOffsetClamp: 700,
            steeringRecoveryMs: 500,
            steeringResponseMs: 250,
            vehicleYMaxDeltaSameViewport: 8,
        },
        totalScore,
    };
}

function collectMetrics(samples) {
    const speeds = samples.map((sample) => sample.payload.player?.speed).filter(isFiniteNumber);
    const offsets = samples.map((sample) => sample.payload.player?.lateralOffset).filter(isFiniteNumber);
    const steering = samples.map((sample) => sample.payload.player?.steering).filter(isFiniteNumber);
    const timedSamples = samples.map((sample) => ({
        offset: sample.payload.player?.lateralOffset,
        speed: sample.payload.player?.speed,
        steering: sample.payload.player?.steering,
        tMs: sample.sampledAtMs ?? Math.round((sample.payload.elapsedSec ?? 0) * 1000),
    }));
    const speedMin = minOf(speeds);
    const speedMax = maxOf(speeds);
    const speedFirst = speeds[0] ?? null;
    const speedLast = speeds[speeds.length - 1] ?? null;
    const speedDropFromPeak = speedMax !== null && speedLast !== null
        ? speedMax - speedLast
        : null;
    const offsetClampHitCount = offsets.filter((value) => Math.abs(value) >= 690).length;

    return {
        lateralOffsetMaxAbs: maxAbs(offsets),
        lateralOffsetRms: rms(offsets),
        offsetClampHitCount,
        speedAvg: average(speeds),
        speedDropFromPeak: roundNullable(speedDropFromPeak),
        speedGain: speedFirst !== null && speedLast !== null ? roundNullable(speedLast - speedFirst) : null,
        speedMax: roundNullable(speedMax),
        speedMin: roundNullable(speedMin),
        steeringMaxAbs: maxAbs(steering),
        steeringRecoveryMs: measureSteeringRecoveryMs(timedSamples),
        steeringResponseMs: measureSteeringResponseMs(timedSamples),
    };
}

function measureSteeringResponseMs(samples) {
    const startMs = 2000;
    const sample = samples.find((entry) => entry.tMs >= startMs && Math.abs(entry.steering ?? 0) >= 0.25);

    return sample ? sample.tMs - startMs : null;
}

function measureSteeringRecoveryMs(samples) {
    const releaseMs = 5000;
    const sample = samples.find((entry) => entry.tMs >= releaseMs && Math.abs(entry.steering ?? 0) <= 0.12);

    return sample ? sample.tMs - releaseMs : null;
}

function checkAtMost(id, value, target, failAt, weight) {
    if (value === null || value === undefined) {
        return {
            id,
            penalty: weight,
            status: 'missing',
            target,
            value,
        };
    }

    if (value <= target) {
        return {
            id,
            penalty: 0,
            status: 'pass',
            target,
            value,
        };
    }

    const ratio = failAt <= target ? 1 : Math.min(1, (value - target) / (failAt - target));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
    };
}

function checkAtLeast(id, value, target, failAt, weight) {
    if (value === null || value === undefined) {
        return {
            id,
            penalty: weight,
            status: 'missing',
            target,
            value,
        };
    }

    if (value >= target) {
        return {
            id,
            penalty: 0,
            status: 'pass',
            target,
            value,
        };
    }

    const ratio = failAt >= target ? 1 : Math.min(1, (target - value) / (target - failAt));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
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
    if (!isFiniteNumber(value)) return;

    range.max = Math.max(range.max, value);
    range.min = Math.min(range.min, value);
}

function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function average(values) {
    if (values.length === 0) return null;

    return roundNullable(values.reduce((total, value) => total + value, 0) / values.length);
}

function maxAbs(values) {
    if (values.length === 0) return null;

    return roundNullable(Math.max(...values.map((value) => Math.abs(value))));
}

function maxOf(values) {
    if (values.length === 0) return null;

    return Math.max(...values);
}

function minOf(values) {
    if (values.length === 0) return null;

    return Math.min(...values);
}

function rms(values) {
    if (values.length === 0) return null;

    return roundNullable(Math.sqrt(
        values.reduce((total, value) => total + value * value, 0) / values.length,
    ));
}

function roundNullable(value) {
    return isFiniteNumber(value) ? Number(value.toFixed(3)) : null;
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function resolveProjectPath(rawPath) {
    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}
