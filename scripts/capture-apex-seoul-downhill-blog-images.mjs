import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const outputDir = path.join(publicDir, 'images/posts/202607');
const browser = '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 5174;

const scenarios = [
    {
        id: 'apex-seoul-road-relative-level',
        label: 'level road · stable reference',
        params: { qaFreeze: 1, qaSpeed: 650, qaSteer: 0, qaZ: 1200 },
    },
    {
        id: 'apex-seoul-road-relative-downhill',
        label: 'downhill road · scale follows the road',
        params: { qaFreeze: 1, qaSpeed: 650, qaSteer: 0.45, qaZ: 42011 },
    },
    {
        id: 'apex-seoul-road-relative-uphill',
        label: 'ridge horizon · player anchor remains readable',
        params: { qaFreeze: 1, qaSpeed: 650, qaSteer: -0.32, qaZ: 30000 },
    },
];
const requestedScenarioId = process.argv.includes('--scenario')
    ? process.argv[process.argv.indexOf('--scenario') + 1]
    : null;
const chartOnly = process.argv.includes('--chart-only');
const selectedScenarios = requestedScenarioId
    ? scenarios.filter((scenario) => scenario.id === requestedScenarioId)
    : scenarios;

if (requestedScenarioId && selectedScenarios.length === 0) {
    throw new Error(`Unknown scenario: ${requestedScenarioId}`);
}

await mkdir(outputDir, { recursive: true });
if (chartOnly) {
    await createDownhillCostChart(path.join(outputDir, 'apex-seoul-downhill-grip-cost-matrix.png'));
} else {
    const server = await startStaticServer();
    try {
        for (const scenario of selectedScenarios) {
            const url = new URL(`http://127.0.0.1:${port}/game-assets/apex-seoul/`);
            url.searchParams.set('vehicle', 'ft86-retro');
            url.searchParams.set('vehicleColor', 'blue');
            for (const [key, value] of Object.entries(scenario.params)) {
                url.searchParams.set(key, String(value));
            }

            const outputPath = path.join(outputDir, `${scenario.id}.png`);
            await capture(url.toString(), outputPath);
            console.log(`captured ${path.relative(root, outputPath)}`);
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

async function startStaticServer() {
    const server = createServer(async (request, response) => {
        const requestPath = new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname;
        const decoded = decodeURIComponent(requestPath);
        const safePath = path.normalize(decoded).replace(/^([/\\])+/, '');
        let filePath = path.join(publicDir, safePath);

        try {
            const fileStat = await stat(filePath);
            if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html');
        } catch {
            response.writeHead(404);
            response.end('Not found');
            return;
        }

        try {
            const body = await readFile(filePath);
            response.writeHead(200, { 'content-type': contentType(filePath) });
            response.end(body);
        } catch {
            response.writeHead(404);
            response.end('Not found');
        }
    });

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    return server;
}

function contentType(filePath) {
    if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
    if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.png')) return 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
    if (filePath.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
}

async function capture(url, outputPath) {
    const windowsPath = toBrowserPath(outputPath);
    const args = [
        '--headless=new',
        '--disable-gpu',
        '--window-size=1200,760',
        '--virtual-time-budget=5000',
        `--screenshot=${windowsPath}`,
        url,
    ];

    await new Promise((resolve, reject) => {
        const child = spawn(browser, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', reject);
        child.on('close', (code) => code === 0
            ? resolve()
            : reject(new Error(`Edge screenshot failed (${code}): ${stderr.trim()}`)));
    });
}

function toBrowserPath(filePath) {
    const result = spawnSync('wslpath', ['-w', filePath], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : filePath;
}

async function createDownhillCostChart(outputPath) {
    const rows = [
        { label: 'Level sharp / full throttle', budget: 448.4, over: 283.3, outside: 133.7, exit: 609.1, color: '#7fc8ff' },
        { label: 'Downhill sharp / full throttle', budget: 412.5, over: 321.4, outside: 177.0, exit: 531.0, color: '#ffcf5a' },
        { label: 'Downhill sharp / prepared grip', budget: 412.5, over: 111.4, outside: 164.1, exit: 533.8, color: '#86e6c2' },
    ];
    const rowSvg = rows.map((row, index) => {
        const y = 220 + index * 130;
        const width = Math.round(row.exit / 650 * 310);
        return `<text x="70" y="${y}" fill="#eaf3f6" font-size="20" font-weight="700">${row.label}</text>
<text x="70" y="${y + 34}" fill="#9db1b9" font-size="16">budget ${row.budget.toFixed(1)}u  ·  entry over +${row.over.toFixed(1)}u  ·  outside ${row.outside.toFixed(1)}u</text>
<rect x="760" y="${y - 20}" width="310" height="28" rx="4" fill="#223139"/>
<rect x="760" y="${y - 20}" width="${width}" height="28" rx="4" fill="${row.color}"/>
<text x="1090" y="${y + 1}" fill="#f4fbfd" font-size="19">exit ${row.exit.toFixed(1)}u</text>`;
    }).join('\n');
    const svg = `<svg width="1200" height="650" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="650" fill="#09151d"/>
<rect x="44" y="40" width="1112" height="570" rx="18" fill="#10222d" stroke="#214255"/>
<text x="70" y="94" fill="#effaff" font-family="Arial, sans-serif" font-size="34" font-weight="700">Downhill corner cost: same road, different commitment</text>
<text x="70" y="130" fill="#a9c2cd" font-family="Arial, sans-serif" font-size="18">Apex Seoul handling simulation · baseline 93.9 / 100 · drift stays at 0 in all three grip scenarios</text>
<text x="760" y="178" fill="#a9c2cd" font-family="Arial, sans-serif" font-size="16">Exit speed (higher is better)</text>
<g font-family="Arial, sans-serif">${rowSvg}</g>
<line x1="70" y1="530" x2="1130" y2="530" stroke="#295064"/>
<text x="70" y="568" fill="#80d7ff" font-family="Arial, sans-serif" font-size="18">Downhill full throttle: budget -35.9u · outside +43.3u · exit -78.2u versus level</text>
</svg>`;

    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`wrote ${path.relative(root, outputPath)}`);
}
