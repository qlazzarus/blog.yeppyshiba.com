import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const defaultComfyUrl = process.env.COMFYUI_URL ?? process.env.COMFY_URL ?? 'http://127.0.0.1:8188';

export async function getSystemStats(comfyUrl = defaultComfyUrl) {
    return requestJson(comfyUrl, '/system_stats');
}

export async function uploadImage({ comfyUrl = defaultComfyUrl, imagePath, filename = path.basename(imagePath), type = 'input' }) {
    const bytes = await readFile(imagePath);
    const form = new FormData();

    form.append('image', new Blob([bytes]), filename);
    form.append('overwrite', 'true');
    form.append('type', type);

    const response = await fetch(buildUrl(comfyUrl, '/upload/image'), {
        body: form,
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`ComfyUI upload failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

export async function queuePrompt({ comfyUrl = defaultComfyUrl, prompt, clientId = `retro-asset-studio-${Date.now()}` }) {
    return requestJson(comfyUrl, '/prompt', {
        body: JSON.stringify({
            client_id: clientId,
            prompt,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
    });
}

export async function getHistory({ comfyUrl = defaultComfyUrl, promptId }) {
    return requestJson(comfyUrl, `/history/${encodeURIComponent(promptId)}`);
}

export async function waitForPrompt({ comfyUrl = defaultComfyUrl, promptId, intervalMs = 1000, timeoutMs = 10 * 60 * 1000 }) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const history = await getHistory({ comfyUrl, promptId });
        const item = history[promptId];

        if (item) {
            return item;
        }

        await sleep(intervalMs);
    }

    throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
}

export function findOutputImages(historyItem) {
    const outputs = historyItem?.outputs ?? {};
    const images = [];

    for (const [nodeId, output] of Object.entries(outputs)) {
        for (const image of output.images ?? []) {
            images.push({
                filename: image.filename,
                nodeId,
                subfolder: image.subfolder ?? '',
                type: image.type ?? 'output',
            });
        }
    }

    return images;
}

export async function downloadImage({ comfyUrl = defaultComfyUrl, image, outputPath }) {
    const url = buildUrl(comfyUrl, '/view');

    url.searchParams.set('filename', image.filename);
    url.searchParams.set('subfolder', image.subfolder ?? '');
    url.searchParams.set('type', image.type ?? 'output');

    const response = await fetch(url);

    if (!response.ok || !response.body) {
        throw new Error(`ComfyUI image download failed: ${response.status} ${await response.text()}`);
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await pipeline(response.body, createWriteStream(outputPath));
}

async function requestJson(comfyUrl, pathname, init) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response;

    try {
        response = await fetch(buildUrl(comfyUrl, pathname), {
            ...init,
            signal: init?.signal ?? controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new Error(`ComfyUI request failed: ${pathname} ${response.status} ${await response.text()}`);
    }

    return response.json();
}

function buildUrl(comfyUrl, pathname) {
    return new URL(pathname, comfyUrl.endsWith('/') ? comfyUrl : `${comfyUrl}/`);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
