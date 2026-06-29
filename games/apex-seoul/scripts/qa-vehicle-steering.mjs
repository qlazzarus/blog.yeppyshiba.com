import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    atlas: 'assets/vehicles/approved/atlases/genesis-g70-poc-128.json',
    minChangedPixelRatio: 0.08,
    minWidthDelta: 8,
    output: null,
    sprite: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--atlas' && next) {
        config.atlas = next;
        index += 1;
    } else if (arg === '--sprite' && next) {
        config.sprite = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    } else if (arg === '--min-width-delta' && next) {
        config.minWidthDelta = parseNonNegativeNumber(arg, next);
        index += 1;
    } else if (arg === '--min-changed-pixel-ratio' && next) {
        config.minChangedPixelRatio = parseNonNegativeNumber(arg, next);
        index += 1;
    }
}

const atlasPath = resolveProjectPath(config.atlas, '--atlas');
const atlas = JSON.parse(await readFile(atlasPath, 'utf8'));
const spritePath = resolveProjectPath(config.sprite ?? resolveSpritePathFromAtlas(atlasPath, atlas), '--sprite');
const outputPath = resolveProjectPath(config.output ?? defaultOutputPath(config.atlas), '--output');
const steeringStates = atlas.apex?.steeringStates ?? {};
const requiredStates = ['steer-left-2', 'steer-left-1', 'center', 'steer-right-1', 'steer-right-2'];
const missingStates = requiredStates.filter((state) => !steeringStates[state]);
const sourceFrames = new Map();

for (const state of requiredStates) {
    const frameId = steeringStates[state]?.frame;

    if (!frameId || sourceFrames.has(frameId)) continue;

    const frame = atlas.frames?.[frameId]?.frame;

    if (!frame) continue;

    sourceFrames.set(frameId, await readFrame(spritePath, frame));
}

const frameMetrics = {};

for (const [frameId, frame] of sourceFrames) {
    frameMetrics[frameId] = analyzeFrame(frame);
}

const center = frameMetrics.center;
const right1 = frameMetrics['steer-right-1'];
const right2 = frameMetrics['steer-right-2'];
const pairMetrics = [
    comparePair('center_to_steer_right_1', sourceFrames.get('center'), sourceFrames.get('steer-right-1')),
    comparePair('steer_right_1_to_steer_right_2', sourceFrames.get('steer-right-1'), sourceFrames.get('steer-right-2')),
].filter(Boolean);
const widthDeltas = [
    widthDelta(center, right1),
    widthDelta(right1, right2),
].filter(Number.isFinite);
const minWidthDelta = widthDeltas.length > 0 ? Math.min(...widthDeltas) : null;
const minChangedPixelRatio = pairMetrics.length > 0
    ? Math.min(...pairMetrics.map((pair) => pair.changedPixelRatio))
    : null;
const originWarnings = collectOriginWarnings(atlas);
const deductions = [];
const warnings = [];

if (missingStates.length > 0) {
    deductions.push({
        code: 'missing_steering_state',
        message: `Missing steering state(s): ${missingStates.join(', ')}.`,
        points: 40,
    });
}

if (minWidthDelta !== null && minWidthDelta < config.minWidthDelta) {
    deductions.push({
        code: 'steering_width_delta_too_small',
        message: `Minimum steering bbox width delta is ${formatNumber(minWidthDelta)}px.`,
        points: 25,
    });
}

if (minChangedPixelRatio !== null && minChangedPixelRatio < config.minChangedPixelRatio) {
    deductions.push({
        code: 'steering_pixel_difference_too_small',
        message: `Minimum changed pixel ratio is ${formatNumber(minChangedPixelRatio)}.`,
        points: 25,
    });
}

warnings.push(...originWarnings);

const score = Math.max(0, 100 - deductions.reduce((total, deduction) => total + deduction.points, 0));
const decision = score >= 80 ? 'pass' : score >= 65 ? 'review' : 'fail';
const report = {
    atlas: path.relative(projectRoot, atlasPath),
    decision,
    deductions,
    frameMetrics,
    minChangedPixelRatio: config.minChangedPixelRatio,
    minWidthDelta: config.minWidthDelta,
    metrics: {
        minChangedPixelRatio,
        minWidthDelta,
        pairMetrics,
    },
    missingStates,
    score,
    sprite: path.relative(projectRoot, spritePath),
    steeringStates,
    vehicleId: atlas.apex?.vehicleId ?? null,
    warnings,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Vehicle steering QA: ${score} (${decision})`);
console.log(`Steering QA wrote ${path.relative(projectRoot, outputPath)}`);

async function readFrame(spritePath, frame) {
    const { data, info } = await sharp(spritePath)
        .ensureAlpha()
        .extract({
            height: frame.h,
            left: frame.x,
            top: frame.y,
            width: frame.w,
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    return {
        data,
        height: info.height,
        width: info.width,
    };
}

function analyzeFrame(frame) {
    let minX = frame.width;
    let minY = frame.height;
    let maxX = -1;
    let maxY = -1;
    let opaquePixels = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let y = 0; y < frame.height; y += 1) {
        for (let x = 0; x < frame.width; x += 1) {
            const index = (y * frame.width + x) * 4;

            if (frame.data[index + 3] === 0) continue;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            opaquePixels += 1;
            weightedX += x;
            weightedY += y;
        }
    }

    if (opaquePixels === 0) {
        return {
            bbox: null,
            centroid: null,
            opaquePixels,
        };
    }

    return {
        bbox: {
            height: maxY - minY + 1,
            width: maxX - minX + 1,
            x: minX,
            y: minY,
        },
        centroid: {
            x: weightedX / opaquePixels,
            y: weightedY / opaquePixels,
        },
        opaquePixels,
    };
}

function comparePair(id, a, b) {
    if (!a || !b || a.width !== b.width || a.height !== b.height) return null;

    let changedPixels = 0;
    let unionPixels = 0;

    for (let index = 0; index < a.data.length; index += 4) {
        const aAlpha = a.data[index + 3];
        const bAlpha = b.data[index + 3];
        const visible = aAlpha > 0 || bAlpha > 0;
        const changed = aAlpha !== bAlpha ||
            a.data[index] !== b.data[index] ||
            a.data[index + 1] !== b.data[index + 1] ||
            a.data[index + 2] !== b.data[index + 2];

        if (visible) unionPixels += 1;
        if (visible && changed) changedPixels += 1;
    }

    return {
        changedPixelRatio: unionPixels > 0 ? changedPixels / unionPixels : 0,
        changedPixels,
        id,
        unionPixels,
    };
}

function collectOriginWarnings(atlas) {
    const warnings = [];

    for (const [state, stateConfig] of Object.entries(atlas.apex?.steeringStates ?? {})) {
        const origin = atlas.frames?.[stateConfig.frame]?.origin;

        if (!origin) continue;

        if (stateConfig.flipX && Math.abs(origin.x - 0.5) > 0.02) {
            warnings.push({
                code: 'flipx_origin_not_centered',
                message: `${state} uses flipX with origin.x ${formatNumber(origin.x)}.`,
                state,
            });
        }
    }

    return warnings;
}

function widthDelta(a, b) {
    if (!a?.bbox || !b?.bbox) return null;
    return Math.abs(a.bbox.width - b.bbox.width);
}

function resolveSpritePathFromAtlas(atlasPath, atlas) {
    const image = atlas.meta?.image;

    if (!image) {
        throw new Error('Atlas does not include meta.image; pass --sprite explicitly.');
    }

    return path.join(path.dirname(atlasPath), '..', 'sprites', image);
}

function defaultOutputPath(input) {
    return input.replace(/\.json$/i, '.steering-qa.json');
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

function parseNonNegativeNumber(option, rawValue) {
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}

function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
}
