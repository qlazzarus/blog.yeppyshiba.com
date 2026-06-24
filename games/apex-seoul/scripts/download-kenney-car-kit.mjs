import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourcePageUrl = 'https://kenney.nl/assets/car-kit';
const outputDir = path.resolve(projectRoot, 'assets/vehicles/kenney-car-kit');
const tempZipPath = path.join(os.tmpdir(), 'kenney_car-kit.zip');

await mkdir(outputDir, { recursive: true });

const sourcePage = await fetchText(sourcePageUrl);
const zipUrl = findZipUrl(sourcePage);
const zip = await fetchBuffer(zipUrl);

await writeFile(tempZipPath, zip);
await unzip(tempZipPath, outputDir);

console.log(`Downloaded ${zipUrl}`);
console.log(`Extracted to ${path.relative(projectRoot, outputDir)}`);

async function fetchText(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return response.text();
}

async function fetchBuffer(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
}

function findZipUrl(html) {
    const match = html.match(/href='(https:\/\/kenney\.nl\/media\/pages\/assets\/car-kit\/[^']+\/kenney_car-kit\.zip)'/);

    if (!match) {
        throw new Error('Could not find Kenney Car Kit zip URL on source page.');
    }

    return match[1];
}

async function unzip(zipPath, destination) {
    const child = spawn('unzip', ['-o', zipPath, '-d', destination], {
        stdio: 'inherit',
    });

    await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`unzip failed with code ${code}`));
        });
    });
}
