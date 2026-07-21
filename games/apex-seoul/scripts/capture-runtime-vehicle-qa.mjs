import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    baseUrl: 'http://localhost:5173/game-assets/apex-seoul/',
    browser: '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    capture: true,
    contactSheet: true,
    contactSheetOnly: false,
    guideDir: null,
    outputDir: 'assets/vehicles/generated/runtime-qa/genesis-g70-poc',
    track: null,
    vehicle: null,
    vehicleColors: [],
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
    } else if (arg === '--vehicle' && next) {
        config.vehicle = next;
        index += 1;
    } else if (arg === '--vehicle-colors' && next) {
        config.vehicleColors = next.split(',').map((value) => value.trim()).filter(Boolean);
        index += 1;
    } else if (arg === '--width' && next) {
        config.viewportWidth = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--height' && next) {
        config.viewportHeight = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--guide-dir' && next) {
        config.guideDir = next;
        index += 1;
    } else if (arg === '--virtual-time-budget' && next) {
        config.virtualTimeBudget = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--manifest-only') {
        config.capture = false;
    } else if (arg === '--skip-contact-sheet') {
        config.contactSheet = false;
    } else if (arg === '--contact-sheet-only') {
        config.capture = false;
        config.contactSheetOnly = true;
    }
}

const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
const guideDir = config.guideDir
    ? resolveProjectPath(config.guideDir, '--guide-dir')
    : null;
const screenshotDir = path.join(outputDir, 'screenshots');
const scenarios = buildRuntimeQaScenarios();

if (config.contactSheetOnly) {
    const manifestPath = path.join(outputDir, 'runtime-qa.manifest.json');
    const existingReport = JSON.parse(await readFile(manifestPath, 'utf8'));
    const capturedScenarios = existingReport.scenarios.filter(
        (scenario) => scenario.status === 'captured',
    );

    await buildContactSheet(
        capturedScenarios,
        path.join(outputDir, 'contact-sheet.png'),
        guideDir,
    );
    console.log(`Contact sheet wrote ${path.relative(projectRoot, path.join(outputDir, 'contact-sheet.png'))}`);
    process.exit(0);
}

if (process.platform !== 'win32' && config.capture && config.browser.startsWith('/mnt/')) {
    await runCaptureWithWindowsNode();

    if (config.contactSheet) {
        const manifestPath = path.join(outputDir, 'runtime-qa.manifest.json');
        const delegatedReport = JSON.parse(await readFile(manifestPath, 'utf8'));
        const capturedScenarios = delegatedReport.scenarios.filter(
            (scenario) => scenario.status === 'captured',
        );

        await buildContactSheet(
            capturedScenarios,
            path.join(outputDir, 'contact-sheet.png'),
            guideDir,
        );
        console.log(`Contact sheet wrote ${path.relative(projectRoot, path.join(outputDir, 'contact-sheet.png'))}`);
    }

    process.exit(0);
}

const report = {
    baseUrl: config.baseUrl,
    browser: config.browser,
    contactSheet: path.relative(projectRoot, path.join(outputDir, 'contact-sheet.png')),
    guideDir: guideDir ? path.relative(projectRoot, guideDir) : null,
    generatedAt: new Date().toISOString(),
    notes: [
        'Screenshots are deterministic runtime experience samples, not final aesthetic approval.',
        'Use qaFreeze/qaSteer/qaSpeed/qaZ to compare the same map and sprite state repeatedly.',
    ],
    outputDir: path.relative(projectRoot, outputDir),
    track: config.track,
    vehicle: config.vehicle,
    vehicleColors: config.vehicleColors,
    scenarios: [],
    viewport: {
        height: config.viewportHeight,
        width: config.viewportWidth,
    },
};

await mkdir(screenshotDir, { recursive: true });

const captureBrowser = config.capture ? await launchCaptureBrowser() : null;

try {
    for (const scenario of scenarios) {
        const url = buildScenarioUrl(config.baseUrl, scenario.params);
        const screenshotPath = path.join(screenshotDir, `${scenario.id}.png`);
        const scenarioReport = {
            ...scenario,
            screenshot: path.relative(projectRoot, screenshotPath),
            status: config.capture ? 'pending' : 'manifest-only',
            url,
        };

        if (captureBrowser) {
            try {
                await captureScreenshot(captureBrowser.context, url, screenshotPath);
                scenarioReport.status = 'captured';
            } catch (error) {
                scenarioReport.status = 'capture-failed';
                scenarioReport.error = error instanceof Error ? error.message : String(error);
            }
        }

        report.scenarios.push(scenarioReport);
    }
} finally {
    await captureBrowser?.close();
}

const capturedScenarios = report.scenarios.filter((scenario) => scenario.status === 'captured');

if (capturedScenarios.length > 0 && config.contactSheet) {
    await buildContactSheet(
        capturedScenarios,
        path.join(outputDir, 'contact-sheet.png'),
        guideDir,
    );
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
    const vehicleSamples = buildVehicleSamples();
    const steeringSamples = [
        { id: 'left-strong', qaSteer: -1 },
        { id: 'left-medium', qaSteer: -0.5 },
        { id: 'center', qaSteer: 0 },
        { id: 'right-medium', qaSteer: 0.5 },
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

    for (const vehicle of vehicleSamples) {
        for (const terrain of terrainSamples) {
            for (const steering of steeringSamples) {
                scenarios.push({
                    expected: {
                        steering: steering.id,
                        terrain: terrain.id,
                        vehicle: vehicle.id,
                        vehicleColor: vehicle.color ?? null,
                    },
                    id: [
                        vehicle.id,
                        vehicle.color,
                        'fov69',
                        terrain.id,
                        steering.id,
                    ].filter(Boolean).join('-'),
                    params: {
                        anchorResponse: 0.22,
                        curveCarBias: 32,
                        fov: 69,
                        ...(config.track ? { track: config.track } : {}),
                        ...(vehicle.id ? { vehicle: vehicle.id } : {}),
                        ...(vehicle.color ? { vehicleColor: vehicle.color } : {}),
                        qaFreeze: 1,
                        qaSpeed: 440,
                        qaSteer: steering.qaSteer,
                        qaZ: terrain.qaZ,
                        terrainThreshold: terrain.terrainThreshold,
                    },
                });
            }
        }
    }

    return scenarios;
}

function buildVehicleSamples() {
    if (!config.vehicle) {
        return [{ color: null, id: null }];
    }

    const colors = config.vehicleColors.length > 0 ? config.vehicleColors : [null];

    return colors.map((color) => ({
        color,
        id: config.vehicle,
    }));
}

function buildScenarioUrl(baseUrl, params) {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
    }

    return url.toString();
}

async function captureScreenshot(context, url, outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    const page = await context.newPage();

    try {
        await page.setViewportSize({
            height: config.viewportHeight,
            width: config.viewportWidth,
        });
        await page.goto(url, {
            timeout: 15000,
            waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(
            () => {
                const canvas = document.querySelector('canvas');

                return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
            },
            null,
            { timeout: 10000 },
        );
        await page.waitForTimeout(config.virtualTimeBudget);
        await page.screenshot({ path: outputPath });
    } finally {
        await page.close();
    }
}

async function launchCaptureBrowser() {
    const browser = await chromium.launch({
        args: [
            '--enable-webgl',
            '--enable-unsafe-swiftshader',
            '--use-angle=swiftshader',
            '--use-gl=angle',
        ],
        executablePath: config.browser,
        headless: true,
    });

    return {
        close: () => browser.close(),
        context: await browser.newContext(),
    };
}

async function runCaptureWithWindowsNode() {
    const windowsNodePath = '/mnt/c/Program Files/nodejs/node.exe';
    const forwardedArgs = [];

    for (let index = 2; index < process.argv.length; index += 1) {
        if (process.argv[index] === '--browser') {
            index += 1;
            continue;
        }

        if (process.argv[index] === '--contact-sheet-only') continue;

        forwardedArgs.push(process.argv[index]);
    }

    forwardedArgs.push(
        '--browser',
        toWindowsPath(config.browser),
        '--skip-contact-sheet',
    );

    await new Promise((resolve, reject) => {
        const child = spawn(windowsNodePath, [
            toWindowsPath(fileURLToPath(import.meta.url)),
            ...forwardedArgs,
        ], {
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Windows runtime QA process exited with code ${code}`));
        });
    });
}

function toWindowsPath(filePath) {
    const result = spawnSync('wslpath', ['-w', filePath], {
        encoding: 'utf8',
    });

    if (result.status !== 0) return filePath;

    return result.stdout.trim();
}

async function buildContactSheet(scenarios, outputPath, comparisonGuideDir = null) {
    const { default: sharp } = await import('sharp');
    const cellWidth = 320;
    const sampleHeight = 203;
    const cellHeight = comparisonGuideDir ? sampleHeight * 2 : sampleHeight;
    const columns = 5;
    const rows = Math.ceil(scenarios.length / columns);
    const composites = [];

    for (let index = 0; index < scenarios.length; index += 1) {
        const scenario = scenarios[index];
        const screenshotPath = path.resolve(
            projectRoot,
            scenario.screenshot.replaceAll('\\', '/'),
        );
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

        if (comparisonGuideDir) {
            const guideScreenshotPath = path.join(
                comparisonGuideDir,
                'screenshots',
                path.basename(screenshotPath),
            );
            const guideImage = await sharp(guideScreenshotPath)
                .resize(cellWidth, sampleHeight, {
                    fit: 'cover',
                    position: 'center',
                })
                .png()
                .toBuffer();

            composites.push({
                input: guideImage,
                left: (index % columns) * cellWidth,
                top: Math.floor(index / columns) * cellHeight + sampleHeight,
            });
        }
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
