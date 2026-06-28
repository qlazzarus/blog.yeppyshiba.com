import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    output: null,
    uid: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--uid' && next) {
        config.uid = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    }
}

if (!config.uid) {
    throw new Error('Missing --uid');
}

if (!config.output) {
    throw new Error('Missing --output');
}

const token = process.env.SKETCHFAB_TOKEN;

if (!token) {
    throw new Error('Set SKETCHFAB_TOKEN before downloading Sketchfab model archives.');
}

const outputPath = path.resolve(projectRoot, config.output);

if (!outputPath.startsWith(projectRoot)) {
    throw new Error(`--output must point inside ${projectRoot}`);
}

const model = await fetchJson(`https://api.sketchfab.com/v3/models/${config.uid}`);
const download = await fetchJson(`https://api.sketchfab.com/v3/models/${config.uid}/download`, {
    Authorization: `Token ${token}`,
});

if (!download.glb?.url) {
    throw new Error(`Model ${config.uid} does not expose a GLB download URL.`);
}

const response = await fetch(download.glb.url);

if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status} ${response.statusText}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));

const metadataPath = outputPath.replace(/\.glb$/i, '.sketchfab.json');
const metadata = {
    downloadedAt: new Date().toISOString(),
    license: model.license?.label ?? null,
    modelUid: model.uid,
    name: model.name,
    source: model.viewerUrl,
    user: model.user
        ? {
            displayName: model.user.displayName,
            profileUrl: model.user.profileUrl,
            username: model.user.username,
        }
        : null,
};

await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(`Downloaded ${path.relative(projectRoot, outputPath)}`);
console.log(`Wrote ${path.relative(projectRoot, metadataPath)}`);

async function fetchJson(url, headers = {}) {
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Request failed: ${response.status} ${response.statusText}\n${detail}`);
    }

    return response.json();
}
