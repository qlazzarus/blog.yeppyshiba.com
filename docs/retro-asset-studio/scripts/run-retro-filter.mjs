import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
    defaultComfyUrl,
    downloadImage,
    findOutputImages,
    getSystemStats,
    queuePrompt,
    uploadImage,
    waitForPrompt,
} from './comfy-client.mjs';
import { paletteLockRetroVehicleSheet } from './palette-lock.mjs';
import { loadJson, patchRetroPrompt, workflowToApiPrompt, writeJson } from './workflow.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(studioRoot, '..', '..');

const vehiclePresets = {
    ft86: {
        input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-magenta-preview.png',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png',
    },
    g70: {
        input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png',
    },
    stinger: {
        input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-magenta-preview.png',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-ai-retro-v1.png',
    },
};

const config = {
    apiOutput: path.join(studioRoot, 'workflows', 'retro_style_filter_v1.api.json'),
    cannyHigh: 0.75,
    cannyLow: 0.35,
    cfg: 4.5,
    checkpoint: 'dreamshaper_8.safetensors',
    comfyUrl: defaultComfyUrl,
    controlNet: 'control_v11p_sd15_canny.pth',
    controlNetEnd: 0.6,
    controlNetStart: 0,
    controlNetStrength: 0.35,
    denoise: 0.1,
    dryRun: false,
    filenamePrefix: 'apex-seoul-retro-v1',
    input: path.join(workspaceRoot, 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png'),
    lora: '[Qwen.Image]PixelArt_Redmond.safetensors',
    loraStrengthClip: 0.7,
    loraStrengthModel: 0.45,
    output: path.join(workspaceRoot, 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png'),
    paletteLock: true,
    ping: false,
    run: false,
    sampler: 'euler',
    scheduler: 'simple',
    seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    steps: 20,
    vehicle: null,
    workflow: path.join(studioRoot, 'retro_style_filter_v1.json'),
};
let comfyUrlWasExplicit = Boolean(process.env.COMFYUI_URL ?? process.env.COMFY_URL);

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--api-output' && next) {
        config.apiOutput = path.resolve(next);
        index += 1;
    } else if (arg === '--canny-high' && next) {
        config.cannyHigh = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--canny-low' && next) {
        config.cannyLow = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--cfg' && next) {
        config.cfg = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--checkpoint' && next) {
        config.checkpoint = next;
        index += 1;
    } else if (arg === '--comfy-url' && next) {
        config.comfyUrl = next;
        comfyUrlWasExplicit = true;
        index += 1;
    } else if (arg === '--controlnet' && next) {
        config.controlNet = next;
        index += 1;
    } else if (arg === '--controlnet-end' && next) {
        config.controlNetEnd = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--controlnet-start' && next) {
        config.controlNetStart = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--controlnet-strength' && next) {
        config.controlNetStrength = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--denoise' && next) {
        config.denoise = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--dry-run') {
        config.dryRun = true;
    } else if (arg === '--filename-prefix' && next) {
        config.filenamePrefix = next;
        index += 1;
    } else if (arg === '--input' && next) {
        config.input = path.resolve(next);
        index += 1;
    } else if (arg === '--lora' && next) {
        config.lora = next;
        index += 1;
    } else if (arg === '--lora-strength-clip' && next) {
        config.loraStrengthClip = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--lora-strength-model' && next) {
        config.loraStrengthModel = parseNumber(arg, next);
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = path.resolve(next);
        index += 1;
    } else if (arg === '--no-palette-lock') {
        config.paletteLock = false;
    } else if (arg === '--ping') {
        config.ping = true;
    } else if (arg === '--run') {
        config.run = true;
    } else if (arg === '--sampler' && next) {
        config.sampler = next;
        index += 1;
    } else if (arg === '--scheduler' && next) {
        config.scheduler = next;
        index += 1;
    } else if (arg === '--seed' && next) {
        config.seed = parseInteger(arg, next);
        index += 1;
    } else if (arg === '--steps' && next) {
        config.steps = parseInteger(arg, next);
        index += 1;
    } else if (arg === '--vehicle' && next) {
        config.vehicle = next;
        index += 1;
    } else if (arg === '--workflow' && next) {
        config.workflow = path.resolve(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

if (!config.ping && !config.dryRun && !config.run) {
    config.ping = true;
}

if (config.ping) {
    const connection = await connectToComfy(config.comfyUrl, { allowWslFallback: !comfyUrlWasExplicit });
    config.comfyUrl = connection.comfyUrl;
    const stats = connection.stats;

    console.log(`Connected to ComfyUI ${stats.system?.comfyui_version ?? 'unknown'} at ${config.comfyUrl}`);
}

const workflow = await loadJson(config.workflow);
const apiPrompt = workflowToApiPrompt(workflow);
let jobs = buildJobs(config);

if (config.dryRun) {
    const prompt = buildPrompt(apiPrompt, jobs[0]);

    await writeJson(config.apiOutput, prompt);
    console.log(`Wrote API prompt ${path.relative(workspaceRoot, config.apiOutput)}`);
}

if (config.run) {
    if (!config.ping) {
        const connection = await connectToComfy(config.comfyUrl, { allowWslFallback: !comfyUrlWasExplicit });
        config.comfyUrl = connection.comfyUrl;
        console.log(`Connected to ComfyUI ${connection.stats.system?.comfyui_version ?? 'unknown'} at ${config.comfyUrl}`);
        jobs = buildJobs(config);
    }

    for (const job of jobs) {
        await runJob(apiPrompt, job);
    }
}

async function connectToComfy(comfyUrl, { allowWslFallback = true } = {}) {
    const candidates = await buildComfyUrlCandidates(comfyUrl, allowWslFallback);
    const failures = [];

    for (const candidate of candidates) {
        try {
            return {
                comfyUrl: candidate,
                stats: await getSystemStats(candidate),
            };
        } catch (error) {
            failures.push(`${candidate}: ${formatError(error)}`);
        }
    }

    throw new Error([
        'Unable to connect to ComfyUI.',
        '',
        'Tried:',
        ...failures.map((failure) => `- ${failure}`),
        '',
        'If ComfyUI is running on Windows while this script runs in WSL, set COMFYUI_URL to the Windows host address, for example:',
        '  COMFYUI_URL=http://<windows-host-ip>:8188 npm run ping',
        '',
        'If ComfyUI runs from this directory with Docker Compose, 127.0.0.1:8188 should work after the service is healthy.',
    ].join('\n'));
}

async function buildComfyUrlCandidates(comfyUrl, allowWslFallback) {
    const candidates = [comfyUrl];

    if (!allowWslFallback || !isLoopbackComfyUrl(comfyUrl)) {
        return candidates;
    }

    for (const host of await getWslHostCandidates()) {
        const candidate = rewriteUrlHost(comfyUrl, host);

        if (!candidates.includes(candidate)) {
            candidates.push(candidate);
        }
    }

    return candidates;
}

function isLoopbackComfyUrl(comfyUrl) {
    try {
        const url = new URL(comfyUrl);

        return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1';
    } catch {
        return false;
    }
}

async function getWslHostCandidates() {
    if (!process.env.WSL_DISTRO_NAME && !process.env.WSL_INTEROP) {
        return [];
    }

    const candidates = ['host.docker.internal'];

    try {
        const resolvConf = await readFile('/etc/resolv.conf', 'utf8');
        const match = resolvConf.match(/^nameserver\s+([^\s]+)/m);

        if (match?.[1]) {
            candidates.push(match[1]);
        }
    } catch {
        // Ignore; host.docker.internal is still worth trying in recent WSL setups.
    }

    return candidates;
}

function rewriteUrlHost(comfyUrl, host) {
    const url = new URL(comfyUrl);

    url.hostname = host;

    return url.toString().replace(/\/$/, '');
}

function formatError(error) {
    if (error?.cause?.code) {
        return `${error.cause.code} ${error.message}`;
    }

    return error?.message ?? String(error);
}

function buildJobs(currentConfig) {
    if (!currentConfig.vehicle) {
        return [{
            ...currentConfig,
            label: 'custom',
        }];
    }

    if (currentConfig.vehicle === 'all') {
        return Object.entries(vehiclePresets).map(([label, preset]) => buildPresetJob(currentConfig, label, preset));
    }

    const preset = vehiclePresets[currentConfig.vehicle];

    if (!preset) {
        throw new Error(`Unknown --vehicle value: ${currentConfig.vehicle}. Use one of: ${Object.keys(vehiclePresets).join(', ')}, all`);
    }

    return [buildPresetJob(currentConfig, currentConfig.vehicle, preset)];
}

function buildPresetJob(currentConfig, label, preset) {
    return {
        ...currentConfig,
        filenamePrefix: `apex-seoul-retro-v1-${label}`,
        input: path.join(workspaceRoot, preset.input),
        label,
        output: path.join(workspaceRoot, preset.output),
        seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    };
}

function buildPrompt(apiPrompt, job) {
    return patchRetroPrompt(apiPrompt, {
        ...job,
        inputImageName: path.basename(job.input),
    });
}

async function runJob(apiPrompt, job) {
    const prompt = buildPrompt(apiPrompt, job);

    console.log(`[${job.label}] Uploading ${path.relative(workspaceRoot, job.input)}`);
    const upload = await uploadImage({
        comfyUrl: job.comfyUrl,
        filename: path.basename(job.input),
        imagePath: job.input,
    });

    console.log(`[${job.label}] Uploaded ${upload.name ?? path.basename(job.input)}`);

    const queued = await queuePrompt({
        comfyUrl: job.comfyUrl,
        prompt,
    });
    const promptId = queued.prompt_id;

    console.log(`[${job.label}] Queued prompt ${promptId}`);

    const historyItem = await waitForPrompt({
        comfyUrl: job.comfyUrl,
        promptId,
    });
    const images = findOutputImages(historyItem);

    if (images.length === 0) {
        throw new Error(`Prompt ${promptId} finished without output images.`);
    }

    await downloadImage({
        comfyUrl: job.comfyUrl,
        image: images[0],
        outputPath: job.output,
    });

    if (job.paletteLock) {
        await paletteLockRetroVehicleSheet(job.output);
        console.log(`[${job.label}] Applied retro vehicle palette lock`);
    }

    console.log(`[${job.label}] Saved ${path.relative(workspaceRoot, job.output)}`);
}

function parseNumber(option, rawValue) {
    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return value;
}

function parseInteger(option, rawValue) {
    const value = Number(rawValue);

    if (!Number.isInteger(value)) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return value;
}
