import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '../..');
const edgeExecutablePath = '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const config = {
    cellSize: 256,
    columns: 3,
    model: 'raven-coupe-procedural',
    modelPitchOffsetDeg: 0,
    modelPath: null,
    modelRollOffsetDeg: 0,
    modelScaleX: 1,
    modelScaleY: 1,
    modelScaleZ: 1,
    modelYawOffsetDeg: 0,
    output: 'assets/vehicles/generated/pose-sheets/raven-coupe-prototype.png',
    padding: 1.18,
    referenceLengthM: 4.24,
    referenceLengthUnits: 2.2,
    scaleMode: 'max-dimension',
    frameSizeUnits: null,
    vehicleId: 'raven-coupe',
    vehicleLengthM: null,
};

const poses = [
    {
        camera: [0, 1.2, -5.2],
        flipXSource: null,
        id: 'center',
        modelPitchDeg: 0,
        modelYawDeg: 0,
        rearAngleDeg: 0,
    },
    {
        camera: [-2.12, 1.14, -4.75],
        flipXSource: null,
        id: 'steer-right-1',
        modelPitchDeg: 0,
        modelYawDeg: 0,
        rearAngleDeg: 24,
    },
    {
        camera: [-3.61, 1.08, -3.74],
        flipXSource: null,
        id: 'steer-right-2',
        modelPitchDeg: 0,
        modelYawDeg: 0,
        rearAngleDeg: 44,
    },
    {
        camera: [-4.6, 1.02, -2.72],
        flipXSource: null,
        id: 'spin-right-1',
        modelPitchDeg: 0,
        modelYawDeg: 12,
        rearAngleDeg: 62,
    },
    {
        camera: [-5.0, 0.98, -1.15],
        flipXSource: null,
        id: 'spin-right-2',
        modelPitchDeg: 0,
        modelYawDeg: 24,
        rearAngleDeg: 78,
    },
    {
        camera: [0, 1.2, -5.2],
        flipXSource: null,
        id: 'downhill-center',
        modelPitchDeg: -8,
        modelYawDeg: 0,
        rearAngleDeg: 0,
    },
    {
        camera: [-2.12, 1.14, -4.75],
        flipXSource: null,
        id: 'downhill-right-1',
        modelPitchDeg: -8,
        modelYawDeg: 0,
        rearAngleDeg: 24,
    },
    {
        camera: [-3.61, 1.08, -3.74],
        flipXSource: null,
        id: 'downhill-right-2',
        modelPitchDeg: -8,
        modelYawDeg: 0,
        rearAngleDeg: 44,
    },
    {
        camera: [0, 1.2, -5.2],
        flipXSource: null,
        id: 'uphill-center',
        modelPitchDeg: 8,
        modelYawDeg: 0,
        rearAngleDeg: 0,
    },
    {
        camera: [-2.12, 1.14, -4.75],
        flipXSource: null,
        id: 'uphill-right-1',
        modelPitchDeg: 8,
        modelYawDeg: 0,
        rearAngleDeg: 24,
    },
    {
        camera: [-3.61, 1.08, -3.74],
        flipXSource: null,
        id: 'uphill-right-2',
        modelPitchDeg: 8,
        modelYawDeg: 0,
        rearAngleDeg: 44,
    },
];

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--model' && next) {
        config.model = next;
        index += 1;
    } else if (arg === '--model-path' && next) {
        config.modelPath = next;
        index += 1;
    } else if (arg === '--model-pitch-offset' && next) {
        config.modelPitchOffsetDeg = parseFiniteNumber(arg, next);
        index += 1;
    } else if (arg === '--model-yaw-offset' && next) {
        config.modelYawOffsetDeg = parseFiniteNumber(arg, next);
        index += 1;
    } else if (arg === '--model-roll-offset' && next) {
        config.modelRollOffsetDeg = parseFiniteNumber(arg, next);
        index += 1;
    } else if (arg === '--model-scale-x' && next) {
        config.modelScaleX = parseNonZeroNumber(arg, next);
        index += 1;
    } else if (arg === '--model-scale-y' && next) {
        config.modelScaleY = parseNonZeroNumber(arg, next);
        index += 1;
    } else if (arg === '--model-scale-z' && next) {
        config.modelScaleZ = parseNonZeroNumber(arg, next);
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    } else if (arg === '--scale-mode' && next) {
        if (!['max-dimension', 'vehicle-length'].includes(next)) {
            throw new Error(`Invalid --scale-mode value: ${next}`);
        }

        config.scaleMode = next;
        index += 1;
    } else if (arg === '--vehicle-length-m' && next) {
        config.vehicleLengthM = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--reference-length-m' && next) {
        config.referenceLengthM = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--reference-length-units' && next) {
        config.referenceLengthUnits = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--frame-size-units' && next) {
        config.frameSizeUnits = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--cell-size' && next) {
        const cellSize = Number(next);

        if (!Number.isFinite(cellSize) || cellSize < 64) {
            throw new Error(`Invalid --cell-size value: ${next}`);
        }

        config.cellSize = cellSize;
        index += 1;
    } else if (arg === '--padding' && next) {
        const padding = Number(next);

        if (!Number.isFinite(padding) || padding <= 1) {
            throw new Error(`Invalid --padding value: ${next}`);
        }

        config.padding = padding;
        index += 1;
    } else if (arg === '--vehicle-id' && next) {
        config.vehicleId = next;
        index += 1;
    }
}

const isProceduralModel = config.model === 'raven-coupe-procedural';
const modelPath = resolveModelPath(config, isProceduralModel);
const outputPath = path.resolve(projectRoot, config.output);
const metadataPath = outputPath.replace(/\.png$/i, '.json');
const server = await startStaticServer(projectRoot);

try {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const browser = await chromium.launch({ headless: true }).catch((error) => {
        console.warn(`Playwright Chromium launch failed; falling back to Edge screenshot. ${error.message}`);
        return null;
    });
    const page = browser
        ? await browser.newPage({
            deviceScaleFactor: 1,
            viewport: {
                height: config.cellSize,
                width: config.cellSize,
            },
        })
        : null;
    const browserLogs = [];

    page?.on('console', (message) => {
        browserLogs.push(`${message.type()}: ${message.text()}`);
    });
    page?.on('pageerror', (error) => {
        browserLogs.push(`pageerror: ${error.message}`);
    });
    const renderedPoses = [];

    for (const pose of poses) {
        const renderConfig = {
            camera: pose.camera,
            height: config.cellSize,
            frameSizeUnits: config.frameSizeUnits,
            modelPitchOffsetDeg: config.modelPitchOffsetDeg,
            modelPath,
            modelPitchDeg: pose.modelPitchDeg,
            modelRollOffsetDeg: config.modelRollOffsetDeg,
            modelScaleX: config.modelScaleX,
            modelScaleY: config.modelScaleY,
            modelScaleZ: config.modelScaleZ,
            modelYawOffsetDeg: config.modelYawOffsetDeg,
            modelYawDeg: pose.modelYawDeg,
            padding: config.padding,
            proceduralModel: isProceduralModel ? config.model : null,
            referenceLengthM: config.referenceLengthM,
            referenceLengthUnits: config.referenceLengthUnits,
            scaleMode: config.scaleMode,
            vehicleLengthM: config.vehicleLengthM,
            width: config.cellSize,
        };
        const url = `${server.url}/__vehicle-renderer?config=${encodeURIComponent(JSON.stringify(renderConfig))}`;
        const buffer = page
            ? await renderPoseWithPlaywright(page, url, pose.id, browserLogs)
            : await renderPoseWithEdgeScreenshot(url, pose.id);

        renderedPoses.push({
            ...pose,
            buffer,
        });
    }

    await browser?.close();

    const rows = Math.ceil(renderedPoses.length / config.columns);
    const sheetWidth = config.columns * config.cellSize;
    const sheetHeight = rows * config.cellSize;
    const composites = renderedPoses.map((pose, index) => ({
        input: pose.buffer,
        left: (index % config.columns) * config.cellSize,
        top: Math.floor(index / config.columns) * config.cellSize,
    }));

    await sharp({
        create: {
            background: { alpha: 0, b: 0, g: 0, r: 0 },
            channels: 4,
            height: sheetHeight,
            width: sheetWidth,
        },
    }).composite(composites).png().toFile(outputPath);

    const metadata = {
        cellSize: config.cellSize,
        columns: config.columns,
        frameSizeUnits: config.frameSizeUnits,
        model: config.model,
        modelPitchOffsetDeg: config.modelPitchOffsetDeg,
        modelRollOffsetDeg: config.modelRollOffsetDeg,
        modelScaleX: config.modelScaleX,
        modelScaleY: config.modelScaleY,
        modelScaleZ: config.modelScaleZ,
        modelYawOffsetDeg: config.modelYawOffsetDeg,
        output: path.relative(projectRoot, outputPath),
        poses: renderedPoses.map((pose, index) => ({
            camera: pose.camera,
            cell: {
                column: index % config.columns,
                row: Math.floor(index / config.columns),
            },
            flipXSource: pose.flipXSource,
            id: pose.id,
            modelPitchDeg: pose.modelPitchDeg,
            modelYawDeg: pose.modelYawDeg,
            rearAngleDeg: pose.rearAngleDeg,
        })),
        rows,
        scaleMode: config.scaleMode,
        sourceModel: modelPath ?? `procedural:${config.model}`,
        vehicleId: config.vehicleId,
        referenceLengthM: config.referenceLengthM,
        referenceLengthUnits: config.referenceLengthUnits,
        vehicleLengthM: config.vehicleLengthM,
    };

    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

    console.log(`Rendered ${path.relative(projectRoot, outputPath)}`);
    console.log(`Wrote ${path.relative(projectRoot, metadataPath)}`);
} finally {
    await server.close();
}

async function startStaticServer(root) {
    const server = createServer(async (request, response) => {
        try {
            const requestUrl = new URL(request.url ?? '/', 'http://localhost');

            if (requestUrl.pathname === '/__vehicle-renderer') {
                response.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                });
                response.end(createRendererHtml(
                    requestUrl.searchParams.get('config') ?? '{}',
                    requestUrl.searchParams.get('screenshot') === '1',
                ));
                return;
            }

            if (requestUrl.pathname === '/__delay') {
                setTimeout(() => {
                    response.writeHead(204);
                    response.end();
                }, 5000);
                return;
            }

            const decodedPath = decodeURIComponent(requestUrl.pathname);
            const staticRoot = decodedPath.startsWith('/node_modules/') ? workspaceRoot : root;
            const filePath = path.resolve(staticRoot, `.${decodedPath}`);

            if (!filePath.startsWith(staticRoot)) {
                response.writeHead(403);
                response.end('Forbidden');
                return;
            }

            const content = await import('node:fs/promises').then((fs) => fs.readFile(filePath));
            response.writeHead(200, {
                'Content-Type': getContentType(filePath),
            });
            response.end(content);
        } catch {
            response.writeHead(404);
            response.end('Not found');
        }
    });

    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    return {
        close: () => new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        }),
        url: `http://127.0.0.1:${address.port}`,
    };
}

function resolveModelPath(renderConfig, isProcedural) {
    if (isProcedural) {
        return null;
    }

    if (!renderConfig.modelPath) {
        return `assets/vehicles/kenney-car-kit/Models/GLB format/${renderConfig.model}.glb`;
    }

    const absolutePath = path.isAbsolute(renderConfig.modelPath)
        ? path.resolve(renderConfig.modelPath)
        : path.resolve(projectRoot, renderConfig.modelPath);

    if (!absolutePath.startsWith(projectRoot)) {
        throw new Error(`--model-path must point inside ${projectRoot}`);
    }

    return path.relative(projectRoot, absolutePath);
}

function parseFiniteNumber(option, value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid ${option} value: ${value}`);
    }

    return parsed;
}

function parsePositiveNumber(option, value) {
    const parsed = parseFiniteNumber(option, value);

    if (parsed <= 0) {
        throw new Error(`Invalid ${option} value: ${value}`);
    }

    return parsed;
}

function parseNonZeroNumber(option, value) {
    const parsed = parseFiniteNumber(option, value);

    if (parsed === 0) {
        throw new Error(`Invalid ${option} value: ${value}`);
    }

    return parsed;
}

async function renderPoseWithPlaywright(page, url, poseId, browserLogs) {
    await page.goto(url);
    await page.waitForFunction(() => window.__vehicleSpriteReady === true, null, { timeout: 15000 }).catch((error) => {
        throw new Error(
            [
                `Timed out rendering pose "${poseId}".`,
                `URL: ${url}`,
                ...browserLogs.slice(-20),
                error.message,
            ].join('\n'),
        );
    });

    const pngBase64 = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Renderer canvas was not created.');
        }

        return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    });

    return Buffer.from(pngBase64, 'base64');
}

async function renderPoseWithEdgeScreenshot(url, poseId) {
    const tempPath = path.join(os.tmpdir(), `apex-seoul-pose-${poseId}-${process.pid}.png`);

    await runEdgeScreenshot(url, tempPath);
    return chromaKeyToTransparentBuffer(tempPath);
}

async function runEdgeScreenshot(url, outputPath) {
    const windowsOutputPath = execFileSync('wslpath', ['-w', outputPath], {
        encoding: 'utf8',
    }).trim();
    const profileId = `pose-sheet-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const edgeProcess = spawn(edgeExecutablePath, [
        '--headless=new',
        '--disable-gpu-sandbox',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--enable-webgl',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--use-gl=angle',
        `--user-data-dir=C:\\Temp\\edge-apex-seoul-pose-render-${profileId}`,
        `--window-size=${config.cellSize},${config.cellSize}`,
        '--virtual-time-budget=7000',
        `--screenshot=${windowsOutputPath}`,
        `${url}&screenshot=1`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    edgeProcess.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    await new Promise((resolve, reject) => {
        edgeProcess.on('error', reject);
        edgeProcess.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Edge screenshot failed with code ${code}\n${stderr}`));
        });
    });
}

async function chromaKeyToTransparentBuffer(inputPath) {
    const image = sharp(inputPath).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const isGreenScreen = green > 80 && green > red * 1.05 && green > blue * 1.05;

        if (isGreenScreen) {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
            data[index + 3] = 0;
        } else if (data[index + 3] === 0) {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
        }
    }

    return sharp(data, {
        raw: {
            channels: info.channels,
            height: info.height,
            width: info.width,
        },
    }).png().toBuffer();
}

function createRendererHtml(rawConfig, screenshotMode) {
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Apex Seoul Vehicle Pose Renderer</title>
    <style>
        html, body {
            margin: 0;
            overflow: hidden;
            background: ${screenshotMode ? '#00ff00' : 'transparent'};
        }

        canvas {
            display: block;
        }
    </style>
</head>
<body>
    ${screenshotMode ? '<img src="/__delay" alt="" style="display:none">' : ''}
    ${screenshotMode ? '<div id="status" style="position:fixed;left:8px;top:8px;z-index:2;color:#ffffff;background:#b00020;font:12px monospace;padding:4px">boot</div>' : ''}
    <script>
        window.addEventListener('error', (event) => {
            const status = document.getElementById('status');
            if (status) status.textContent = 'error: ' + event.message;
        });
        window.addEventListener('unhandledrejection', (event) => {
            const status = document.getElementById('status');
            if (status) status.textContent = 'rejection: ' + (event.reason?.message ?? event.reason);
        });
    </script>
    <script type="importmap">
        {
            "imports": {
                "three": "/node_modules/three/build/three.module.js"
            }
        }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { RoundedBoxGeometry } from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
        import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
        import { MeshoptDecoder } from '/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';

        const config = JSON.parse(decodeURIComponent('${encodeURIComponent(rawConfig)}'));
        const status = document.getElementById('status');
        if (status) status.textContent = 'module loaded';
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
        });

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(1);
        renderer.setSize(config.width, config.height, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xdde8ff, 0x2b2f34, 2.2));

        const key = new THREE.DirectionalLight(0xffffff, 2.5);
        key.position.set(-3.8, 5.2, -4.8);
        scene.add(key);

        const rim = new THREE.DirectionalLight(0x89b7ff, 1.15);
        rim.position.set(3.2, 3.8, 5.2);
        scene.add(rim);

        let model;

        if (config.proceduralModel === 'raven-coupe-procedural') {
            if (status) status.textContent = 'building procedural model';
            model = createRavenCoupeModel();
        } else {
            const loader = new GLTFLoader();
            loader.setMeshoptDecoder(MeshoptDecoder);
            if (status) status.textContent = 'loading glb';
            const gltf = await loader.loadAsync('/' + config.modelPath);
            model = gltf.scene;
        }

        if (status) status.textContent = 'rendering';
        scene.add(model);
        applyModelBaseTransform(model, config);
        normalizeModel(model);
        applyModelPoseTransform(model, config);

        const camera = buildCamera(model, config);
        renderer.render(scene, camera);
        if (status) status.style.display = 'none';
        window.__vehicleSpriteReady = true;

        function normalizeModel(target) {
            const box = new THREE.Box3().setFromObject(target);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const sourceLength = Math.max(size.x, size.z);
            const targetLength = (config.scaleMode === 'vehicle-length' && Number.isFinite(config.vehicleLengthM))
                ? config.referenceLengthUnits * (config.vehicleLengthM / config.referenceLengthM)
                : 2.2;
            const scale = config.scaleMode === 'vehicle-length'
                ? targetLength / sourceLength
                : 2.2 / Math.max(size.x, size.y, size.z);
            const scaleX = scale * (config.modelScaleX ?? 1);
            const scaleY = scale * (config.modelScaleY ?? 1);
            const scaleZ = scale * (config.modelScaleZ ?? 1);

            target.scale.set(scaleX, scaleY, scaleZ);
            target.position.set(-center.x * scaleX, -center.y * scaleY, -center.z * scaleZ);

            const scaledBox = new THREE.Box3().setFromObject(target);
            target.position.y -= scaledBox.min.y;
        }

        function applyModelBaseTransform(target, renderConfig) {
            target.rotation.x = THREE.MathUtils.degToRad(renderConfig.modelPitchOffsetDeg ?? 0);
            target.rotation.y = THREE.MathUtils.degToRad(renderConfig.modelYawOffsetDeg ?? 0);
            target.rotation.z = THREE.MathUtils.degToRad(renderConfig.modelRollOffsetDeg ?? 0);
        }

        function applyModelPoseTransform(target, renderConfig) {
            target.rotation.x += THREE.MathUtils.degToRad(renderConfig.modelPitchDeg ?? 0);
            target.rotation.y += THREE.MathUtils.degToRad(renderConfig.modelYawDeg ?? 0);
        }

        function createRavenCoupeModel() {
            const car = new THREE.Group();
            const body = new THREE.MeshStandardMaterial({
                color: 0x242932,
                metalness: 0.18,
                roughness: 0.52,
            });
            const bodyDark = new THREE.MeshStandardMaterial({
                color: 0x111722,
                metalness: 0.12,
                roughness: 0.62,
            });
            const glass = new THREE.MeshStandardMaterial({
                color: 0x6e7680,
                metalness: 0.02,
                roughness: 0.28,
            });
            const tire = new THREE.MeshStandardMaterial({
                color: 0x080a0f,
                metalness: 0.05,
                roughness: 0.7,
            });
            const rim = new THREE.MeshStandardMaterial({
                color: 0xd8dde8,
                metalness: 0.55,
                roughness: 0.32,
            });
            const trim = new THREE.MeshStandardMaterial({
                color: 0x05070b,
                metalness: 0.05,
                roughness: 0.68,
            });
            const highlight = new THREE.MeshStandardMaterial({
                color: 0x8f9aa7,
                metalness: 0.18,
                roughness: 0.38,
            });
            const lightRed = new THREE.MeshStandardMaterial({
                color: 0xe02832,
                emissive: 0x5a0508,
                emissiveIntensity: 0.45,
                roughness: 0.25,
            });
            const lightAmber = new THREE.MeshStandardMaterial({
                color: 0xff8a1d,
                emissive: 0x442000,
                emissiveIntensity: 0.22,
                roughness: 0.28,
            });
            const accent = new THREE.MeshStandardMaterial({
                color: 0xd23035,
                roughness: 0.45,
            });
            const white = new THREE.MeshStandardMaterial({
                color: 0xe8edf5,
                metalness: 0.08,
                roughness: 0.35,
            });

            addRoundedBox(car, body, [2.76, 0.5, 4.08], [0, 0.55, 0], [0.035, 0, 0], 0.08);
            addRoundedBox(car, body, [2.38, 0.26, 1.7], [0, 0.84, 1.05], [-0.08, 0, 0], 0.06);
            addRoundedBox(car, body, [2.5, 0.24, 0.9], [0, 0.84, -1.5], [0.05, 0, 0], 0.05);
            addRoundedBox(car, bodyDark, [2.86, 0.34, 0.42], [0, 0.45, -2.05], [0, 0, 0], 0.05);
            addBox(car, trim, [2.92, 0.12, 0.1], [0, 0.64, -2.34], [0, 0, 0]);
            addBox(car, trim, [2.72, 0.08, 0.06], [0, 0.87, -2.38], [0, 0, 0]);

            addRoundedBox(car, body, [1.58, 0.7, 1.16], [0, 1.12, -0.38], [-0.09, 0, 0], 0.07);
            addBox(car, trim, [1.72, 0.08, 1.24], [0, 1.49, -0.4], [-0.08, 0, 0]);
            addBox(car, glass, [1.42, 0.04, 0.58], [0, 1.32, -1.0], [0.2, 0, 0]);
            addBox(car, glass, [1.36, 0.04, 0.62], [0, 1.34, 0.34], [-0.24, 0, 0]);
            addBox(car, glass, [0.08, 0.48, 0.68], [-0.78, 1.15, -0.36], [-0.04, -0.24, 0]);
            addBox(car, glass, [0.08, 0.48, 0.68], [0.78, 1.15, -0.36], [-0.04, 0.24, 0]);
            addBox(car, highlight, [1.34, 0.035, 0.07], [0, 1.43, -1.28], [0.2, 0, 0]);
            addBox(car, highlight, [1.24, 0.035, 0.06], [0, 1.43, 0.62], [-0.24, 0, 0]);

            addBox(car, lightAmber, [0.32, 0.22, 0.07], [-1.07, 0.79, -2.55], [0, 0, 0]);
            addBox(car, lightRed, [0.42, 0.22, 0.07], [-0.66, 0.79, -2.56], [0, 0, 0]);
            addBox(car, lightRed, [0.42, 0.22, 0.07], [0.66, 0.79, -2.56], [0, 0, 0]);
            addBox(car, lightAmber, [0.32, 0.22, 0.07], [1.07, 0.79, -2.55], [0, 0, 0]);
            addBox(car, accent, [2.02, 0.045, 0.065], [0, 0.98, -2.57], [0, 0, 0]);
            addBox(car, white, [0.62, 0.2, 0.07], [0, 0.43, -2.59], [0, 0, 0]);
            addBox(car, highlight, [2.58, 0.04, 0.055], [0, 0.78, -2.58], [0, 0, 0]);

            addWheel(car, tire, rim, [-1.18, 0.42, 1.28]);
            addWheel(car, tire, rim, [1.18, 0.42, 1.28]);
            addWheel(car, tire, rim, [-1.18, 0.42, -1.22]);
            addWheel(car, tire, rim, [1.18, 0.42, -1.22]);
            addRoundedBox(car, bodyDark, [0.16, 0.3, 0.86], [-1.34, 0.58, 1.28], [0, 0, 0], 0.04);
            addRoundedBox(car, bodyDark, [0.16, 0.3, 0.86], [1.34, 0.58, 1.28], [0, 0, 0], 0.04);
            addRoundedBox(car, bodyDark, [0.16, 0.3, 0.86], [-1.34, 0.58, -1.22], [0, 0, 0], 0.04);
            addRoundedBox(car, bodyDark, [0.16, 0.3, 0.86], [1.34, 0.58, -1.22], [0, 0, 0], 0.04);
            addBox(car, trim, [0.06, 0.07, 2.35], [-1.39, 0.7, -0.1], [0, 0, 0]);
            addBox(car, trim, [0.06, 0.07, 2.35], [1.39, 0.7, -0.1], [0, 0, 0]);
            addBox(car, highlight, [0.045, 0.035, 1.6], [-1.43, 0.9, -0.22], [0, 0, 0]);
            addBox(car, highlight, [0.045, 0.035, 1.6], [1.43, 0.9, -0.22], [0, 0, 0]);

            return car;
        }

        function addBox(parent, material, scale, position, rotation) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);

            mesh.scale.set(...scale);
            mesh.position.set(...position);
            mesh.rotation.set(...rotation);
            parent.add(mesh);

            return mesh;
        }

        function addRoundedBox(parent, material, scale, position, rotation, radius) {
            const mesh = new THREE.Mesh(new RoundedBoxGeometry(scale[0], scale[1], scale[2], 3, radius), material);

            mesh.position.set(...position);
            mesh.rotation.set(...rotation);
            parent.add(mesh);

            return mesh;
        }

        function addWheel(parent, tireMaterial, rimMaterial, position) {
            const wheel = new THREE.Group();
            const tireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 28), tireMaterial);
            const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.32, 24), rimMaterial);

            tireMesh.rotation.z = Math.PI / 2;
            rimMesh.rotation.z = Math.PI / 2;
            wheel.add(tireMesh, rimMesh);
            wheel.position.set(...position);
            parent.add(wheel);

            return wheel;
        }

        function buildCamera(target, renderConfig) {
            const box = new THREE.Box3().setFromObject(target);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDimension = (renderConfig.frameSizeUnits ?? Math.max(size.x, size.y, size.z)) * renderConfig.padding;
            const aspect = renderConfig.width / renderConfig.height;
            const halfHeight = maxDimension / 2;
            const halfWidth = halfHeight * aspect;
            const camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 0.1, 100);

            camera.position.set(...renderConfig.camera);
            camera.lookAt(center.x, center.y + size.y * 0.18, center.z);
            camera.updateProjectionMatrix();

            return camera;
        }
    </script>
</body>
</html>`;
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.js') return 'text/javascript; charset=utf-8';
    if (ext === '.glb') return 'model/gltf-binary';
    if (ext === '.png') return 'image/png';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.html') return 'text/html; charset=utf-8';

    return 'application/octet-stream';
}
