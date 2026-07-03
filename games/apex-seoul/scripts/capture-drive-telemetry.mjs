import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const scenarios = {
    'brake-on-curve': {
        durationSec: 18,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 4, key: 'ArrowLeft', type: 'down' },
            { atSec: 6.2, key: 'ArrowDown', type: 'down' },
            { atSec: 7.6, key: 'ArrowDown', type: 'up' },
            { atSec: 8, key: 'ArrowLeft', type: 'up' },
            { atSec: 18, key: 'ArrowUp', type: 'up' },
        ],
    },
    'curve-counter-steer': {
        durationSec: 20,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 3, key: 'ArrowRight', type: 'down' },
            { atSec: 6, key: 'ArrowRight', type: 'up' },
            { atSec: 8, key: 'ArrowLeft', type: 'down' },
            { atSec: 10, key: 'ArrowLeft', type: 'up' },
            { atSec: 20, key: 'ArrowUp', type: 'up' },
        ],
    },
    'curve-no-input': {
        durationSec: 24,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 24, key: 'ArrowUp', type: 'up' },
        ],
    },
    'left-hold-3s-release': {
        durationSec: 12,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 2, key: 'ArrowLeft', type: 'down' },
            { atSec: 5, key: 'ArrowLeft', type: 'up' },
            { atSec: 12, key: 'ArrowUp', type: 'up' },
        ],
    },
    'right-hold-3s-release': {
        durationSec: 12,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 2, key: 'ArrowRight', type: 'down' },
            { atSec: 5, key: 'ArrowRight', type: 'up' },
            { atSec: 12, key: 'ArrowUp', type: 'up' },
        ],
    },
    'slalom-40s': {
        durationSec: 40,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 3, key: 'ArrowLeft', type: 'down' },
            { atSec: 5, key: 'ArrowLeft', type: 'up' },
            { atSec: 6, key: 'ArrowRight', type: 'down' },
            { atSec: 8, key: 'ArrowRight', type: 'up' },
            { atSec: 10, key: 'ArrowLeft', type: 'down' },
            { atSec: 12, key: 'ArrowLeft', type: 'up' },
            { atSec: 14, key: 'ArrowRight', type: 'down' },
            { atSec: 16, key: 'ArrowRight', type: 'up' },
            { atSec: 40, key: 'ArrowUp', type: 'up' },
        ],
    },
    'straight-accel-20s': {
        durationSec: 20,
        events: [
            { atSec: 0, key: 'ArrowUp', type: 'down' },
            { atSec: 20, key: 'ArrowUp', type: 'up' },
        ],
    },
};

const config = {
    baseUrl: 'http://localhost:5173/game-assets/apex-seoul/',
    browser: null,
    durationSec: null,
    outputDir: 'assets/telemetry/generated/drive-logs',
    query: null,
    sampleHz: 10,
    scenario: 'straight-accel-20s',
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
    } else if (arg === '--query' && next) {
        config.query = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--scenario' && next) {
        config.scenario = next;
        index += 1;
    } else if (arg === '--track' && next) {
        config.track = next;
        index += 1;
    } else if (arg === '--width' && next) {
        config.viewportWidth = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--list-scenarios') {
        console.log(Object.keys(scenarios).join('\n'));
        process.exit(0);
    }
}

const scenario = scenarios[config.scenario];

if (!scenario) {
    throw new Error(`Unknown scenario "${config.scenario}". Use --list-scenarios to inspect options.`);
}

const durationSec = config.durationSec ?? scenario.durationSec;
const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
await mkdir(outputDir, { recursive: true });

const url = buildTelemetryUrl();
const startedAt = new Date();
const sessionId = [
    startedAt.toISOString().replace(/[:.]/g, '-'),
    config.scenario,
].join('_');
const jsonlPath = path.join(outputDir, `apex-seoul-drive-${sessionId}.jsonl`);
const summaryPath = path.join(outputDir, `apex-seoul-drive-${sessionId}.summary.json`);
const samples = [];

let browserHandle;

try {
    browserHandle = await launchBrowser();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error([
        'Unable to launch a browser for Apex Seoul drive telemetry.',
        'Install Playwright browser dependencies, or pass a working browser with --browser.',
        'On Linux this is usually: npx playwright install-deps chromium',
        `Original error: ${message}`,
    ].join('\n'));
}

const page = await browserHandle.browser.newPage({
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
    await page.keyboard.press('Tab').catch(() => {});

    const sampleIntervalMs = 1000 / config.sampleHz;
    const sampleCount = Math.max(1, Math.round(durationSec * config.sampleHz));
    const events = [...scenario.events].sort((left, right) => left.atSec - right.atSec);
    let nextEventIndex = 0;
    let currentTimeMs = 0;

    for (let index = 0; index < sampleCount; index += 1) {
        const targetTimeMs = Math.round(index * sampleIntervalMs);

        await waitUntilTarget(page, currentTimeMs, targetTimeMs);
        currentTimeMs = targetTimeMs;

        while (
            nextEventIndex < events.length &&
            Math.round(events[nextEventIndex].atSec * 1000) <= currentTimeMs
        ) {
            await applyKeyboardEvent(page, events[nextEventIndex]);
            nextEventIndex += 1;
        }

        const state = await page.evaluate(() => window.__apexSeoulQaState ?? null);

        if (!state) continue;

        samples.push({
            index,
            payload: state,
            sampledAtMs: currentTimeMs,
            scenario: config.scenario,
            type: 'drive_sample',
        });
    }
} finally {
    await releaseScenarioKeys(page, scenario).catch(() => {});
    await browserHandle.close();
}

const summary = buildSummary({
    config,
    durationSec,
    finishedAt: new Date(),
    jsonlPath,
    samples,
    scenario,
    sessionId,
    startedAt,
    url,
});

await writeFile(jsonlPath, `${samples.map((sample) => JSON.stringify(sample)).join('\n')}\n`);
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Drive telemetry scenario: ${config.scenario}`);
console.log(`Drive telemetry samples: ${samples.length}`);
console.log(`Drive telemetry wrote ${path.relative(projectRoot, jsonlPath)}`);
console.log(`Drive telemetry summary wrote ${path.relative(projectRoot, summaryPath)}`);

function buildTelemetryUrl() {
    const url = new URL(config.baseUrl);

    if (config.track) {
        url.searchParams.set('track', config.track);
    }

    if (config.query) {
        const query = new URLSearchParams(config.query);

        for (const [key, value] of query) {
            url.searchParams.set(key, value);
        }
    }

    return url.toString();
}

function buildSummary({ config, durationSec, finishedAt, jsonlPath, samples, scenario, sessionId, startedAt, url }) {
    const terrainCounts = new Map();
    const frameCounts = new Map();
    const ranges = {
        cameraPitch: createRange(),
        horizonGapY: createRange(),
        horizonY: createRange(),
        lateralOffset: createRange(),
        slopeAcceleration: createRange(),
        speed: createRange(),
        steering: createRange(),
        vehicleY: createRange(),
    };
    let maxVehicleYDelta = 0;
    let previousVehicleY = null;

    for (const sample of samples) {
        const state = sample.payload;
        const terrainCue = state.vehicle?.anchor?.terrainCue ?? 'unknown';
        const frame = state.vehicle?.frame ?? 'unknown';
        const vehicleY = state.vehicle?.anchor?.y;

        increment(terrainCounts, terrainCue);
        increment(frameCounts, frame);
        addRangeValue(ranges.cameraPitch, state.camera?.pitch);
        addRangeValue(ranges.horizonGapY, state.road?.horizonGapY);
        addRangeValue(ranges.horizonY, state.horizonY);
        addRangeValue(ranges.lateralOffset, state.player?.lateralOffset);
        addRangeValue(ranges.slopeAcceleration, state.player?.slopeAcceleration);
        addRangeValue(ranges.speed, state.player?.speed);
        addRangeValue(ranges.steering, state.player?.steering);
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
            durationSec,
            query: config.query,
            sampleHz: config.sampleHz,
            scenario: config.scenario,
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
        scenario: {
            durationSec,
            events: scenario.events,
            id: config.scenario,
        },
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

async function waitUntilTarget(page, currentTimeMs, targetTimeMs) {
    const delay = targetTimeMs - currentTimeMs;

    if (delay > 0) {
        await page.waitForTimeout(delay);
    }
}

async function applyKeyboardEvent(page, event) {
    if (event.type === 'down') {
        await page.keyboard.down(event.key);
        return;
    }

    await page.keyboard.up(event.key);
}

async function releaseScenarioKeys(page, scenario) {
    const keys = new Set(scenario.events.map((event) => event.key));

    for (const key of keys) {
        await page.keyboard.up(key);
    }
}

async function launchBrowser() {
    if (config.browser?.startsWith('/mnt/')) {
        return launchWindowsBrowserOverCdp(config.browser);
    }

    const browser = await chromium.launch({
        ...(config.browser ? { executablePath: config.browser } : {}),
        headless: true,
    });

    return {
        browser,
        close: () => browser.close(),
    };
}

async function launchWindowsBrowserOverCdp(browserPath) {
    const port = 9300 + Math.floor(Math.random() * 500);
    const profileDir = path.join('/tmp', `apex-seoul-edge-cdp-${process.pid}-${Date.now()}`);
    await mkdir(profileDir, { recursive: true });

    const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${toWindowsPath(profileDir)}`,
        'about:blank',
    ];
    const child = spawn(browserPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    const cdpEndpoint = await waitForCdp(port, stderr);

    const browser = await chromium.connectOverCDP(cdpEndpoint);

    return {
        browser,
        close: async () => {
            await browser.close().catch(() => {});
            if (!child.killed) child.kill();
        },
    };
}

async function waitForCdp(port, getStderr) {
    const startedAt = Date.now();
    const endpoints = getCdpEndpoints(port);

    while (Date.now() - startedAt < 10000) {
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${endpoint}/json/version`);

                if (response.ok) return endpoint;
            } catch {
                // Edge is still starting, or this host alias does not bridge into Windows.
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error(`Timed out waiting for Edge CDP on ${endpoints.join(', ')}. ${getStderr.trim()}`);
}

function getCdpEndpoints(port) {
    const endpoints = [`http://127.0.0.1:${port}`];
    const result = spawnSync('sh', ['-c', "awk '/nameserver/ { print $2; exit }' /etc/resolv.conf"], {
        encoding: 'utf8',
    });
    const windowsHost = result.status === 0 ? result.stdout.trim() : '';

    if (windowsHost) {
        endpoints.push(`http://${windowsHost}:${port}`);
    }

    return endpoints;
}

function toWindowsPath(filePath) {
    const result = spawnSync('wslpath', ['-w', filePath], {
        encoding: 'utf8',
    });

    if (result.status !== 0) return filePath;

    return result.stdout.trim();
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
