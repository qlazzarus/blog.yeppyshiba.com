import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    baseUrl: 'http://localhost:5174/game-assets/apex-seoul/',
    browser: null,
    durationSec: 60,
    outputDir: 'assets/telemetry/generated/drive-logs',
    sampleHz: 10,
    track: null,
    viewportHeight: 760,
    viewportWidth: 1200,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--base-url' && next) {
        config.baseUrl = next;
        index += 1;
    } else if (arg === '--browser' && next) {
        config.browser = next;
        index += 1;
    } else if (arg === '--duration-sec' && next) {
        config.durationSec = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--height' && next) {
        config.viewportHeight = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--track' && next) {
        config.track = next;
        index += 1;
    } else if (arg === '--width' && next) {
        config.viewportWidth = parsePositiveInteger(arg, next);
        index += 1;
    }
}

const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
await mkdir(outputDir, { recursive: true });

const url = buildTelemetryUrl();
const startedAt = new Date();
const sessionId = startedAt.toISOString().replace(/[:.]/g, '-');
const jsonlPath = path.join(outputDir, `apex-seoul-drive-${sessionId}.jsonl`);
const summaryPath = path.join(outputDir, `apex-seoul-drive-${sessionId}.summary.json`);
const samples = [];

let browser;

try {
    browser = await chromium.launch({
        ...(config.browser ? { executablePath: config.browser } : {}),
        headless: true,
    });
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error([
        'Unable to launch a browser for Apex Seoul drive telemetry.',
        'Install Playwright browser dependencies, or pass a working browser with --browser.',
        'On Linux this is usually: npx playwright install-deps chromium',
        `Original error: ${message}`,
    ].join('\n'));
}

const page = await browser.newPage({
    viewport: {
        height: config.viewportHeight,
        width: config.viewportWidth,
    },
});

try {
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => Boolean(window.__apexSeoulQaReady), null, {
        timeout: 10000,
    });

    const sampleIntervalMs = 1000 / config.sampleHz;
    const sampleCount = Math.max(1, Math.round(config.durationSec * config.sampleHz));

    for (let index = 0; index < sampleCount; index += 1) {
        await page.waitForTimeout(index === 0 ? 0 : sampleIntervalMs);
        const state = await page.evaluate(() => window.__apexSeoulQaState ?? null);

        if (!state) continue;

        samples.push({
            index,
            sampledAtMs: Math.round(index * sampleIntervalMs),
            state,
            type: 'drive_sample',
        });
    }
} finally {
    await browser.close();
}

const summary = buildSummary({
    config,
    finishedAt: new Date(),
    jsonlPath,
    samples,
    sessionId,
    startedAt,
    url,
});

await writeFile(jsonlPath, `${samples.map((sample) => JSON.stringify(sample)).join('\n')}\n`);
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Drive telemetry samples: ${samples.length}`);
console.log(`Drive telemetry wrote ${path.relative(projectRoot, jsonlPath)}`);
console.log(`Drive telemetry summary wrote ${path.relative(projectRoot, summaryPath)}`);

function buildTelemetryUrl() {
    const url = new URL(config.baseUrl);

    if (config.track) {
        url.searchParams.set('track', config.track);
    }

    return url.toString();
}

function buildSummary({ config, finishedAt, jsonlPath, samples, sessionId, startedAt, url }) {
    const terrainCounts = new Map();
    const frameCounts = new Map();
    const ranges = {
        cameraPitch: createRange(),
        horizonGapY: createRange(),
        horizonY: createRange(),
        slopeAcceleration: createRange(),
        speed: createRange(),
        vehicleY: createRange(),
    };
    let maxVehicleYDelta = 0;
    let previousVehicleY = null;

    for (const sample of samples) {
        const state = sample.state;
        const terrainCue = state.vehicle?.anchor?.terrainCue ?? 'unknown';
        const frame = state.vehicle?.frame ?? 'unknown';
        const vehicleY = state.vehicle?.anchor?.y;

        increment(terrainCounts, terrainCue);
        increment(frameCounts, frame);
        addRangeValue(ranges.cameraPitch, state.camera?.pitch);
        addRangeValue(ranges.horizonGapY, state.road?.horizonGapY);
        addRangeValue(ranges.horizonY, state.horizonY);
        addRangeValue(ranges.slopeAcceleration, state.player?.slopeAcceleration);
        addRangeValue(ranges.speed, state.player?.speed);
        addRangeValue(ranges.vehicleY, vehicleY);

        if (typeof vehicleY === 'number' && previousVehicleY !== null) {
            maxVehicleYDelta = Math.max(maxVehicleYDelta, Math.abs(vehicleY - previousVehicleY));
        }

        if (typeof vehicleY === 'number') previousVehicleY = vehicleY;
    }

    return {
        config: {
            baseUrl: config.baseUrl,
            browser: config.browser ?? 'playwright-chromium',
            durationSec: config.durationSec,
            sampleHz: config.sampleHz,
            track: config.track,
            viewport: {
                height: config.viewportHeight,
                width: config.viewportWidth,
            },
        },
        finishedAt: finishedAt.toISOString(),
        jsonl: path.relative(projectRoot, jsonlPath),
        maxVehicleYDelta: Number(maxVehicleYDelta.toFixed(3)),
        sampleCount: samples.length,
        sessionId,
        startedAt: startedAt.toISOString(),
        terrainCounts: Object.fromEntries(terrainCounts),
        frameCounts: Object.fromEntries(frameCounts),
        ranges: Object.fromEntries(
            Object.entries(ranges).map(([key, range]) => [
                key,
                {
                    max: range.max === -Infinity ? null : Number(range.max.toFixed(3)),
                    min: range.min === Infinity ? null : Number(range.min.toFixed(3)),
                },
            ]),
        ),
        url,
    };
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

function parsePositiveInteger(option, value) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${option} must be a positive integer`);
    }

    return parsed;
}

function parsePositiveNumber(option, value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${option} must be a positive number`);
    }

    return parsed;
}

function resolveProjectPath(rawPath, option) {
    if (!rawPath) throw new Error(`${option} is required`);

    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}
