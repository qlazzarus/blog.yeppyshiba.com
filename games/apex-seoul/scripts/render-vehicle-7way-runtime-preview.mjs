import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const config = { cellSize: 256, vehicleId: 'raven-coupe' };

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleId = next;
        index += 1;
    } else if (arg === '--cell-size' && next) {
        config.cellSize = Number(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

if (!/^[a-z0-9-]+$/.test(config.vehicleId) || ![192, 256].includes(config.cellSize)) {
    throw new Error('Only safe 192px or 256px temporary runtime previews are supported');
}

const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', config.vehicleId);
const sourcePath = path.join(candidateDir, 'source-17pose-512.png');
const sourceMetadataPath = path.join(candidateDir, 'source-17pose-512.json');
const adapterPath = path.join(candidateDir, 'runtime-128/runtime-128.atlas.json');
const outputDir = path.join(candidateDir, `runtime-preview-${config.cellSize}`);
const bodyPath = path.join(outputDir, `sheet-${config.cellSize}.png`);
const shadowPath = path.join(outputDir, `shadow-${config.cellSize}.png`);
const atlasPath = path.join(outputDir, `runtime-${config.cellSize}.atlas.json`);
const qaPath = path.join(outputDir, `runtime-${config.cellSize}.qa.json`);
const [metadata, adapter, source] = await Promise.all([
    readJson(sourceMetadataPath),
    readJson(adapterPath),
    sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
]);

if (metadata.cellSize !== 512 || metadata.columns !== 3 || metadata.rows !== 6 || metadata.poses?.length !== 17) {
    throw new Error('Expected a 3x6, 17-pose 512px source sheet');
}
const width = metadata.columns * config.cellSize;
const height = metadata.rows * config.cellSize;
const body = await sharp(source.data, {
    raw: { width: source.info.width, height: source.info.height, channels: 4 },
}).resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
const bodyRaw = await sharp(body).ensureAlpha().raw().toBuffer();
const shadowRaw = Buffer.alloc(bodyRaw.length, 0);
for (let offset = 0; offset < bodyRaw.length; offset += 4) {
    if (bodyRaw[offset + 3] > 0) shadowRaw[offset + 3] = 210;
}
const scale = config.cellSize / adapter.apex.targetCellSize;
const atlas = {
    ...adapter,
    apex: {
        ...adapter.apex,
        candidateOnly: true,
        targetCellSize: config.cellSize,
        runtimeAdapter: {
            ...adapter.apex.runtimeAdapter,
            contract: 'temporary-256px-beauty-preview',
            note: 'Direct 512px beauty downsample for readability comparison. It is not the approved retro/palette output.',
        },
    },
    frames: Object.fromEntries(Object.entries(adapter.frames).map(([id, frame]) => [id, scaleFrame(frame, scale)])),
};
const qa = makeQa(metadata, bodyRaw, shadowRaw, width, config.cellSize, atlas);
if (!qa.pass) throw new Error('Temporary preview QA failed');

await mkdir(outputDir, { recursive: true });
await writeFile(bodyPath, body);
await sharp(shadowRaw, { raw: { width, height, channels: 4 } }).png().toFile(shadowPath);
await writeFile(atlasPath, `${JSON.stringify(atlas, null, 2)}\n`);
await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
console.log(`7way ${config.cellSize}px beauty preview: ${path.relative(projectRoot, bodyPath)}`);

function scaleFrame(frame, scale) {
    return {
        ...frame,
        anchor: { x: frame.anchor.x * scale, y: frame.anchor.y * scale },
        baselineY: frame.baselineY * scale,
        frame: scaleRect(frame.frame, scale),
        sourceSize: scaleRect(frame.sourceSize, scale),
        spriteSourceSize: scaleRect(frame.spriteSourceSize, scale),
    };
}

function scaleRect(rect, scale) {
    return Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, value * scale]));
}

function makeQa(metadata, body, shadow, width, cellSize, atlas) {
    const occupied = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    let alphaMismatches = 0;
    let blankOpaquePixels = 0;
    for (let y = 0; y < metadata.rows * cellSize; y += 1) for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        if ((body[offset + 3] > 0) !== (shadow[offset + 3] > 0)) alphaMismatches += 1;
        if (!occupied.has(`${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`) && body[offset + 3] > 0) blankOpaquePixels += 1;
    }
    const incorrectFrames = Object.entries(atlas.frames).filter(([, frame]) =>
        frame.frame.w !== cellSize || frame.frame.h !== cellSize,
    ).map(([id]) => id);
    return {
        cellSize,
        policy: 'temporary direct 512px beauty downsample; body remains shadow-free and shadow is an external alpha silhouette',
        checks: {
            alphaShape: { alphaMismatches, pass: alphaMismatches === 0 },
            blankCell: { blankOpaquePixels, pass: blankOpaquePixels === 0 },
            frames: { incorrectFrames, pass: incorrectFrames.length === 0 },
            poseCount: { actual: metadata.poses.length, expected: 17, pass: metadata.poses.length === 17 },
        },
        pass: alphaMismatches === 0 && blankOpaquePixels === 0 && incorrectFrames.length === 0 && metadata.poses.length === 17,
    };
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}
