import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    baseUrl: 'http://localhost:5173/game-assets/apex-seoul/',
    browser: '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    capture: true,
    outputDir: 'assets/vehicles/generated/runtime-qa/genesis-g70-poc',
    track: null,
    virtualTimeBudget: 5000,
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
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--track' && next) {
        config.track = next;
        index += 1;
    } else if (arg === '--width' && next) {
        config.viewportWidth = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--height' && next) {
        config.viewportHeight = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--virtual-time-budget' && next) {
        config.virtualTimeBudget = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--manifest-only') {
        config.capture = false;
    }
}

const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
const screenshotDir = path.join(outputDir, 'screenshots');
const scenarios = buildRuntimeQaScenarios();
const report = {
    baseUrl: config.baseUrl,
    browser: config.browser,
    contactSheet: path.relative(projectRoot, path.join(outputDir, 'contact-sheet.png')),
    generatedAt: new Date().toISOString(),
    notes: [
        'Screenshots are deterministic runtime experience samples, not final aesthetic approval.',
        'Use qaFreeze/qaSteer/qaSpeed/qaZ to compare the same map and sprite state repeatedly.',
    ],
    outputDir: path.relative(projectRoot, outputDir),
    track: config.track,
    scenarios: [],
    viewport: {
        height: config.viewportHeight,
        width: config.viewportWidth,
    },
};

await mkdir(screenshotDir, { recursive: true });

for (const scenario of scenarios) {
    const url = buildScenarioUrl(config.baseUrl, scenario.params);
    const screenshotPath = path.join(screenshotDir, `${scenario.id}.png`);
    const scenarioReport = {
        ...scenario,
        screenshot: path.relative(projectRoot, screenshotPath),
        status: config.capture ? 'pending' : 'manifest-only',
        url,
    };

    if (config.capture) {
        try {
            await captureScreenshot(url, screenshotPath);
            scenarioReport.status = 'captured';
        } catch (error) {
            scenarioReport.status = 'capture-failed';
            scenarioReport.error = error instanceof Error ? error.message : String(error);
        }
    }

    report.scenarios.push(scenarioReport);
}

const capturedScenarios = report.scenarios.filter((scenario) => scenario.status === 'captured');

if (capturedScenarios.length > 0) {
    await buildContactSheet(capturedScenarios, path.join(outputDir, 'contact-sheet.png'));
} else {
    report.contactSheet = null;
}

await writeFile(path.join(outputDir, 'runtime-qa.manifest.json'), `${JSON.stringify(report, null, 2)}\n`);

const capturedCount = capturedScenarios.length;
const failedCount = report.scenarios.filter((scenario) => scenario.status === 'capture-failed').length;

console.log(`Runtime vehicle QA scenarios: ${report.scenarios.length}`);
console.log(`Captured: ${capturedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Manifest wrote ${path.relative(projectRoot, path.join(outputDir, 'runtime-qa.manifest.json'))}`);

function buildRuntimeQaScenarios() {
    const steeringSamples = [
        { id: 'left-strong', qaSteer: -1 },
        { id: 'center', qaSteer: 0 },
        { id: 'right-strong', qaSteer: 1 },
    ];
    const terrainSamples = [
        {
            id: 'downhill',
            qaZ: 1200,
            terrainThreshold: 12,
        },
        {
            id: 'level',
            qaZ: 1200,
            terrainThreshold: 80,
        },
        {
            id: 'uphill',
            qaZ: 66240,
            terrainThreshold: 12,
        },
    ];
    const scenarios = [];

    for (const terrain of terrainSamples) {
        for (const steering of steeringSamples) {
            scenarios.push({
                expected: {
                    steering: steering.id,
                    terrain: terrain.id,
                },
                id: `fov69-${terrain.id}-${steering.id}`,
                params: {
                    anchorResponse: 0.22,
                    curveCarBias: 32,
                    fov: 69,
                    ...(config.track ? { track: config.track } : {}),
                    qaFreeze: 1,
                    qaSpeed: 440,
                    qaSteer: steering.qaSteer,
                    qaZ: terrain.qaZ,
                    terrainThreshold: terrain.terrainThreshold,
                },
            });
        }
    }

    return scenarios;
}

function buildScenarioUrl(baseUrl, params) {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
    }

    return url.toString();
}

async function captureScreenshot(url, outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const args = [
        '--headless=new',
        '--disable-gpu',
        `--window-size=${config.viewportWidth},${config.viewportHeight}`,
        `--virtual-time-budget=${config.virtualTimeBudget}`,
        `--screenshot=${toBrowserPath(outputPath)}`,
        url,
    ];

    await new Promise((resolve, reject) => {
        const child = spawn(config.browser, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Browser exited with code ${code}: ${stderr.trim()}`));
        });
    });
}

function toBrowserPath(filePath) {
    if (!config.browser.startsWith('/mnt/')) return filePath;

    const result = spawnSync('wslpath', ['-w', filePath], {
        encoding: 'utf8',
    });

    if (result.status !== 0) return filePath;

    return result.stdout.trim();
}

async function buildContactSheet(scenarios, outputPath) {
    const cellWidth = 400;
    const cellHeight = 253;
    const columns = 3;
    const rows = Math.ceil(scenarios.length / columns);
    const composites = [];

    for (let index = 0; index < scenarios.length; index += 1) {
        const scenario = scenarios[index];
        const screenshotPath = path.resolve(projectRoot, scenario.screenshot);
        const image = await sharp(screenshotPath)
            .resize(cellWidth, cellHeight, {
                fit: 'cover',
                position: 'center',
            })
            .png()
            .toBuffer();

        composites.push({
            input: image,
            left: (index % columns) * cellWidth,
            top: Math.floor(index / columns) * cellHeight,
        });
    }

    await sharp({
        create: {
            background: '#101316',
            channels: 4,
            height: rows * cellHeight,
            width: columns * cellWidth,
        },
    })
        .composite(composites)
        .png()
        .toFile(outputPath);
}

function resolveProjectPath(rawPath, option) {
    const absolutePath = path.isAbsolute(rawPath)
        ? path.resolve(rawPath)
        : path.resolve(projectRoot, rawPath);

    if (!absolutePath.startsWith(projectRoot)) {
        throw new Error(`${option} must point inside ${projectRoot}`);
    }

    return absolutePath;
}

function parsePositiveInteger(option, rawValue) {
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}
