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
    height: 256,
    model: 'race-future',
    outputDir: 'assets/vehicles/rendered',
    padding: 1.34,
    useCdp: false,
    width: 256,
};

const views = [
    { camera: [0, 1.2, -5.2], name: 'rear' },
    { camera: [-1.55, 1.16, -4.95], name: 'rear-left' },
    { camera: [1.55, 1.16, -4.95], name: 'rear-right' },
];

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--model' && next) {
        config.model = next;
        index += 1;
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--size' && next) {
        const size = Number(next);

        if (!Number.isFinite(size) || size < 64) {
            throw new Error(`Invalid --size value: ${next}`);
        }

        config.width = size;
        config.height = size;
        index += 1;
    } else if (arg === '--padding' && next) {
        const padding = Number(next);

        if (!Number.isFinite(padding) || padding <= 1) {
            throw new Error(`Invalid --padding value: ${next}`);
        }

        config.padding = padding;
        index += 1;
    } else if (arg === '--cdp') {
        config.useCdp = true;
    }
}

const outputDir = path.resolve(projectRoot, config.outputDir);
const modelPath = `assets/vehicles/kenney-car-kit/Models/GLB format/${config.model}.glb`;
const server = await startStaticServer(projectRoot);
const browserSession = config.useCdp
    ? await launchEdgeOverCdp().catch((error) => {
        console.warn(`Edge CDP launch failed; falling back to delayed screenshot. ${error.message}`);
        return null;
    })
    : null;

try {
    await mkdir(outputDir, { recursive: true });

    const page = browserSession
        ? await browserSession.context.newPage({
            deviceScaleFactor: 1,
            viewport: {
                height: config.height,
                width: config.width,
            },
        })
        : null;

    for (const view of views) {
        const renderConfig = {
            camera: view.camera,
            height: config.height,
            modelPath,
            padding: config.padding,
            width: config.width,
        };
        const url = `${server.url}/__vehicle-renderer?config=${encodeURIComponent(JSON.stringify(renderConfig))}`;
        const filePath = path.join(outputDir, `player-car-${view.name}.png`);

        if (page) {
            await page.goto(url);
            await page.waitForFunction(() => window.__vehicleSpriteReady === true, null, { timeout: 15000 });

            const pngBase64 = await page.evaluate(() => {
                const canvas = document.querySelector('canvas');

                if (!(canvas instanceof HTMLCanvasElement)) {
                    throw new Error('Renderer canvas was not created.');
                }

                return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            });

            await writeFile(filePath, Buffer.from(pngBase64, 'base64'));
        } else {
            const tempPath = path.join(os.tmpdir(), `apex-seoul-${view.name}-${process.pid}.png`);

            await runEdgeScreenshot(url, tempPath);
            await chromaKeyToTransparent(tempPath, filePath);
        }

        console.log(`Rendered ${path.relative(projectRoot, filePath)}`);
    }
} finally {
    await browserSession?.close();
    await server.close();
}

async function runEdgeScreenshot(url, outputPath) {
    const windowsOutputPath = execFileSync('wslpath', ['-w', outputPath], {
        encoding: 'utf8',
    }).trim();
    const profileId = `screenshot-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const edgeProcess = spawn(edgeExecutablePath, [
        '--headless=new',
        '--disable-gpu-sandbox',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--enable-webgl',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--use-gl=angle',
        `--user-data-dir=C:\\Temp\\edge-apex-seoul-vehicle-render-${profileId}`,
        `--window-size=${config.width},${config.height}`,
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

async function chromaKeyToTransparent(inputPath, outputPath) {
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

    await sharp(data, {
        raw: {
            channels: info.channels,
            height: info.height,
            width: info.width,
        },
    }).png().toFile(outputPath);
}

async function launchEdgeOverCdp() {
    const port = 9330 + Math.floor(Math.random() * 200);
    const profileId = `cdp-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const edgeProcess = spawn(edgeExecutablePath, [
        '--headless=new',
        '--disable-gpu-sandbox',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--enable-webgl',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--use-gl=angle',
        '--remote-debugging-address=0.0.0.0',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=C:\\Temp\\edge-apex-seoul-vehicle-render-${profileId}`,
        `--window-size=${config.width},${config.height}`,
        'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const endpoint = await waitForCdp(port).catch((error) => {
        edgeProcess.kill();
        throw error;
    });
    const browser = await chromium.connectOverCDP(endpoint);
    const context = browser.contexts()[0] ?? await browser.newContext();

    return {
        close: async () => {
            await browser.close();
            edgeProcess.kill();
        },
        context,
    };
}

async function waitForCdp(port) {
    const hosts = ['127.0.0.1', getWindowsHostIp()].filter(Boolean);
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
        for (const host of hosts) {
            const endpoint = `http://${host}:${port}`;

            try {
                const response = await fetch(`${endpoint}/json/version`);

                if (response.ok) return endpoint;
            } catch {
                // Keep polling until Edge exposes the debugging endpoint.
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Timed out waiting for Edge CDP endpoint on port ${port}`);
}

function getWindowsHostIp() {
    const resolvConf = path.resolve('/etc/resolv.conf');

    try {
        const content = readFileSync(resolvConf, 'utf8');
        const match = content.match(/^nameserver\s+(.+)$/m);

        return match?.[1]?.trim();
    } catch {
        return null;
    }
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
        server.listen(0, '0.0.0.0', resolve);
    });

    const address = server.address();

    return {
        close: () => new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        }),
        url: `http://127.0.0.1:${address.port}`,
    };
}

function createRendererHtml(rawConfig, screenshotMode) {
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Apex Seoul Vehicle Sprite Renderer</title>
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

        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        if (status) status.textContent = 'loading glb';
        const gltf = await loader.loadAsync('/' + config.modelPath);
        const model = gltf.scene;

        if (status) status.textContent = 'rendering';
        scene.add(model);
        normalizeModel(model);

        const camera = buildCamera(model, config);
        renderer.render(scene, camera);
        if (status) status.style.display = 'none';
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
