import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
    cellSize: 256,
    columns: 3,
    model: 'race-future',
    output: 'assets/vehicles/generated/pose-sheets/raven-coupe-prototype.png',
    padding: 1.34,
    vehicleId: 'raven-coupe',
};

const poses = [
    {
        camera: [0, 1.2, -5.2],
        flipXSource: null,
        id: 'center',
    },
    {
        camera: [-1.25, 1.16, -5.02],
        flipXSource: null,
        id: 'steer-left-1',
    },
    {
        camera: [-1.9, 1.12, -4.82],
        flipXSource: null,
        id: 'steer-left-2',
    },
];

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--model' && next) {
        config.model = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
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

const modelPath = `assets/vehicles/kenney-car-kit/Models/GLB format/${config.model}.glb`;
const outputPath = path.resolve(projectRoot, config.output);
const metadataPath = outputPath.replace(/\.png$/i, '.json');
const server = await startStaticServer(projectRoot);

try {
    await mkdir(path.dirname(outputPath), { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: {
            height: config.cellSize,
            width: config.cellSize,
        },
    });
    const browserLogs = [];

    page.on('console', (message) => {
        browserLogs.push(`${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
        browserLogs.push(`pageerror: ${error.message}`);
    });
    const renderedPoses = [];

    for (const pose of poses) {
        const renderConfig = {
            camera: pose.camera,
            height: config.cellSize,
            modelPath,
            padding: config.padding,
            width: config.cellSize,
        };
        const url = `${server.url}/__vehicle-renderer?config=${encodeURIComponent(JSON.stringify(renderConfig))}`;

        await page.goto(url);
        await page.waitForFunction(() => window.__vehicleSpriteReady === true, null, { timeout: 15000 }).catch((error) => {
            throw new Error(
                [
                    `Timed out rendering pose "${pose.id}".`,
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

        renderedPoses.push({
            ...pose,
            buffer: Buffer.from(pngBase64, 'base64'),
        });
    }

    await browser.close();

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
        model: config.model,
        output: path.relative(projectRoot, outputPath),
        poses: renderedPoses.map((pose, index) => ({
            camera: pose.camera,
            cell: {
                column: index % config.columns,
                row: Math.floor(index / config.columns),
            },
            flipXSource: pose.flipXSource,
            id: pose.id,
        })),
        rows,
        sourceModel: modelPath,
        vehicleId: config.vehicleId,
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
                response.end(createRendererHtml(requestUrl.searchParams.get('config') ?? '{}'));
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

function createRendererHtml(rawConfig) {
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Apex Seoul Vehicle Pose Renderer</title>
    <style>
        html, body {
            margin: 0;
            overflow: hidden;
            background: transparent;
        }

        canvas {
            display: block;
        }
    </style>
</head>
<body>
    <script type="importmap">
        {
            "imports": {
                "three": "/node_modules/three/build/three.module.js"
            }
        }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

        const config = JSON.parse(decodeURIComponent('${encodeURIComponent(rawConfig)}'));
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

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync('/' + config.modelPath);
        const model = gltf.scene;

        scene.add(model);
        normalizeModel(model);

        const camera = buildCamera(model, config);
        renderer.render(scene, camera);
        window.__vehicleSpriteReady = true;

        function normalizeModel(target) {
            const box = new THREE.Box3().setFromObject(target);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);

            target.position.sub(center);
            target.scale.setScalar(2.2 / maxDimension);

            const scaledBox = new THREE.Box3().setFromObject(target);
            target.position.y -= scaledBox.min.y;
        }

        function buildCamera(target, renderConfig) {
            const box = new THREE.Box3().setFromObject(target);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z) * renderConfig.padding;
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
