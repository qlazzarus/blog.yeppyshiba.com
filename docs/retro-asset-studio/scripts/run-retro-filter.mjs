import { createHash } from 'node:crypto';
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
        negativePrompt: 'large luxury sedan, heavy grand tourer, muscle car, SUV, changed rear silhouette, changed viewpoint, extra wheels, white tires, chrome tires',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1.png',
        positivePrompt: 'nimble compact rear-wheel-drive street coupe, short rear deck, lightweight downhill drift character, compact taillights, balanced rear three-quarter silhouette',
    },
    g70: {
        input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png',
        negativePrompt: 'two-door coupe, hatchback, SUV, pickup, changed rear silhouette, changed viewpoint, extra wheels, white tires, chrome tires',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png',
        positivePrompt: 'compact sport sedan, planted rear stance, restrained premium body lines, stable downhill grip character, crisp horizontal taillights',
    },
    stinger: {
        input: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-magenta-preview.png',
        negativePrompt: 'small coupe, SUV, pickup, changed rear silhouette, changed viewpoint, extra wheels, white tires, chrome tires',
        output: 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/kia-stinger-256/sheet-256-ai-retro-v1.png',
        positivePrompt: 'wide fastback grand tourer, long wheelbase, muscular rear haunches, twin-turbo downhill express character, wide horizontal taillight signature',
    },
};

const BASE_NEGATIVE_PROMPT = 'different car, convertible, pickup truck, changed viewpoint, changed body color, white tires, chrome tires, extra wheels, deformed car, photo, realistic, blur, watermark, text, logo, gradient';
const BASE_POSITIVE_PROMPT = 'pixel art, retro game sprite sheet, same car as input image, preserve original silhouette, preserve original viewpoint, preserve input body color, dark rubber tires, clean outline, limited color palette, subtle pixel detail';

const variantPresets = {
    safe: {
        cannyHigh: 0.75,
        cannyLow: 0.35,
        cfg: 4.0,
        controlNetEnd: 0.7,
        controlNetStart: 0,
        controlNetStrength: 0.45,
        denoise: 0.08,
        loraStrengthClip: 0.6,
        loraStrengthModel: 0.35,
        steps: 16,
    },
    balanced: {
        cannyHigh: 0.75,
        cannyLow: 0.35,
        cfg: 4.5,
        controlNetEnd: 0.6,
        controlNetStart: 0,
        controlNetStrength: 0.35,
        denoise: 0.12,
        loraStrengthClip: 0.7,
        loraStrengthModel: 0.45,
        steps: 20,
    },
    stylized: {
        cannyHigh: 0.75,
        cannyLow: 0.3,
        cfg: 4.8,
        controlNetEnd: 0.5,
        controlNetStart: 0,
        controlNetStrength: 0.28,
        denoise: 0.16,
        loraStrengthClip: 0.75,
        loraStrengthModel: 0.55,
        steps: 22,
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
    controlNetEnd: 0.7,
    controlNetStart: 0,
    controlNetStrength: 0.45,
    denoise: 0.08,
    dryRun: false,
    filenamePrefix: 'apex-seoul-retro-v1',
    input: path.join(workspaceRoot, 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-magenta-preview.png'),
    inputWasExplicit: false,
    lora: '[Qwen.Image]PixelArt_Redmond.safetensors',
    loraStrengthClip: 0.6,
    loraStrengthModel: 0.35,
    output: path.join(workspaceRoot, 'games/apex-seoul/assets/vehicles/generated/pixel-candidates/genesis-g70-256/sheet-256-ai-retro-v1.png'),
    outputWasExplicit: false,
    paletteLock: true,
    ping: false,
    negativePrompt: null,
    positivePrompt: null,
    run: false,
    sampler: 'euler',
    scheduler: 'simple',
    seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    seedWasExplicit: false,
    steps: 16,
    variant: 'balanced',
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
        config.inputWasExplicit = true;
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
        config.outputWasExplicit = true;
        index += 1;
    } else if (arg === '--no-palette-lock') {
        config.paletteLock = false;
    } else if (arg === '--negative-prompt' && next) {
        config.negativePrompt = next;
        index += 1;
    } else if (arg === '--ping') {
        config.ping = true;
    } else if (arg === '--positive-prompt' && next) {
        config.positivePrompt = next;
        index += 1;
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
        config.seedWasExplicit = true;
        index += 1;
    } else if (arg === '--steps' && next) {
        config.steps = parseInteger(arg, next);
        index += 1;
    } else if (arg === '--vehicle' && next) {
        config.vehicle = next;
        index += 1;
    } else if (arg === '--variant' && next) {
        config.variant = next;
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
    const variantLabels = resolveVariantLabels(currentConfig.variant);

    if (variantLabels.length > 1 && currentConfig.outputWasExplicit) {
        throw new Error('--output cannot be used with --variant all. Run a single variant or omit --output.');
    }

    if (!currentConfig.vehicle) {
        return variantLabels.map((variantLabel) => buildCustomJob(currentConfig, variantLabel, {
            forceVariantSuffix: variantLabels.length > 1,
        }));
    }

    if (currentConfig.vehicle === 'all') {
        if (currentConfig.inputWasExplicit || currentConfig.outputWasExplicit) {
            throw new Error('--input and --output overrides can only be used with a single --vehicle preset, not --vehicle all.');
        }

        return Object.entries(vehiclePresets).flatMap(([vehicleLabel, preset]) => (
            variantLabels.map((variantLabel) => buildPresetJob(currentConfig, vehicleLabel, preset, variantLabel, {
                forceVariantSuffix: variantLabels.length > 1,
            }))
        ));
    }

    const preset = vehiclePresets[currentConfig.vehicle];

    if (!preset) {
        throw new Error(`Unknown --vehicle value: ${currentConfig.vehicle}. Use one of: ${Object.keys(vehiclePresets).join(', ')}, all`);
    }

    return variantLabels.map((variantLabel) => buildPresetJob(currentConfig, currentConfig.vehicle, preset, variantLabel, {
        forceVariantSuffix: variantLabels.length > 1,
    }));
}

function resolveVariantLabels(rawVariant) {
    if (rawVariant === 'all') {
        return Object.keys(variantPresets);
    }

    if (!variantPresets[rawVariant]) {
        throw new Error(`Unknown --variant value: ${rawVariant}. Use one of: ${Object.keys(variantPresets).join(', ')}, all`);
    }

    return [rawVariant];
}

function buildCustomJob(currentConfig, variantLabel, { forceVariantSuffix = false } = {}) {
    const variant = variantPresets[variantLabel];
    const shouldSuffix = forceVariantSuffix || variantLabel !== 'balanced';

    return {
        ...currentConfig,
        ...variant,
        label: `custom-${variantLabel}`,
        variant: variantLabel,
        filenamePrefix: `${currentConfig.filenamePrefix}-custom-${variantLabel}`,
        output: currentConfig.outputWasExplicit
            ? currentConfig.output
            : withVariantSuffix(currentConfig.output, variantLabel, shouldSuffix),
        seed: resolveJobSeed(currentConfig),
    };
}

function buildPresetJob(currentConfig, vehicleLabel, preset, variantLabel, { forceVariantSuffix = false } = {}) {
    const variant = variantPresets[variantLabel];
    const baseInput = currentConfig.inputWasExplicit ? currentConfig.input : path.join(workspaceRoot, preset.input);
    const baseOutput = currentConfig.outputWasExplicit ? currentConfig.output : path.join(workspaceRoot, preset.output);

    // 기본 run:ft86는 balanced를 최종 후보 파일명 sheet-256-ai-retro-v1.png로 저장한다.
    // safe/stylized 또는 variant all에서는 suffix를 붙여 비교 산출물로 만든다.
    const shouldSuffix = forceVariantSuffix || variantLabel !== 'balanced';

    return {
        ...currentConfig,
        ...variant,
        filenamePrefix: `apex-seoul-retro-v1-${vehicleLabel}-${variantLabel}`,
        input: baseInput,
        label: `${vehicleLabel}-${variantLabel}`,
        negativePrompt: buildPromptText(BASE_NEGATIVE_PROMPT, preset.negativePrompt, currentConfig.negativePrompt),
        output: currentConfig.outputWasExplicit
            ? baseOutput
            : withVariantSuffix(baseOutput, variantLabel, shouldSuffix),
        positivePrompt: buildPromptText(BASE_POSITIVE_PROMPT, preset.positivePrompt, currentConfig.positivePrompt),
        seed: resolveJobSeed(currentConfig),
        variant: variantLabel,
    };
}

function buildPromptText(...parts) {
    return parts.filter(Boolean).join(', ');
}

function resolveJobSeed(currentConfig) {
    return currentConfig.seedWasExplicit
        ? currentConfig.seed
        : Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function withVariantSuffix(outputPath, variantLabel, shouldSuffix) {
    if (!shouldSuffix) {
        return outputPath;
    }

    const parsed = path.parse(outputPath);

    return path.join(parsed.dir, `${parsed.name}-${variantLabel}${parsed.ext}`);
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

    await writeRunMetadata(job, prompt);

    console.log(`[${job.label}] Saved ${path.relative(workspaceRoot, job.output)}`);
}

async function writeRunMetadata(job, prompt) {
    const input = await readFile(job.input);
    const metadataPath = `${job.output}.pipeline.json`;
    const metadata = {
        checkpoint: job.checkpoint,
        controlNet: {
            endPercent: job.controlNetEnd,
            model: job.controlNet,
            startPercent: job.controlNetStart,
            strength: job.controlNetStrength,
        },
        generatedAt: new Date().toISOString(),
        input: path.relative(workspaceRoot, job.input),
        inputSha256: sha256(input),
        lora: {
            clipStrength: job.loraStrengthClip,
            model: job.lora,
            modelStrength: job.loraStrengthModel,
        },
        output: path.relative(workspaceRoot, job.output),
        prompt: {
            negative: job.negativePrompt ?? null,
            positive: job.positivePrompt ?? null,
        },
        sampler: {
            cfg: job.cfg,
            denoise: job.denoise,
            name: job.sampler,
            scheduler: job.scheduler,
            steps: job.steps,
        },
        seed: job.seed,
        variant: job.variant,
        vehicle: job.vehicle ?? null,
        workflowSha256: sha256(Buffer.from(JSON.stringify(prompt))),
    };

    await writeJson(metadataPath, metadata);
    console.log(`[${job.label}] Wrote ${path.relative(workspaceRoot, metadataPath)}`);
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
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
