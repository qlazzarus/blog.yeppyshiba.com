import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const VARIANTS = ['blue', 'red', 'silver', 'black'];
const CELL_SIZE = 128;
const NEUTRAL_BODY_RAMP = [[20, 34, 51], [48, 76, 103], [94, 139, 169], [178, 211, 224]];
const BODY_RAMPS = {
    black: [[8, 14, 25], [20, 33, 47], [45, 65, 79], [94, 119, 130]],
    blue: [[16, 35, 65], [27, 64, 110], [61, 120, 175], [126, 191, 226]],
    red: [[62, 28, 33], [114, 45, 49], [176, 75, 68], [235, 139, 111]],
    silver: [[38, 48, 60], [75, 91, 104], [130, 149, 159], [205, 217, 217]],
};
const LAMP_PROTECTION = new Set(['91,25,37', '191,47,57', '255,127,103']);

const config = { vehicleIds: [], variants: [] };
for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleIds.push(next);
        index += 1;
    } else if (arg === '--variant' && next) {
        config.variants.push(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : VEHICLE_IDS;
const variants = config.variants.length > 0 ? config.variants : VARIANTS;
for (const vehicleId of vehicleIds) if (!VEHICLE_IDS.includes(vehicleId)) throw new Error(`Unknown vehicle: ${vehicleId}`);
for (const variant of variants) if (!VARIANTS.includes(variant)) throw new Error(`Unknown variant: ${variant}`);
for (const vehicleId of vehicleIds) await swapVehiclePalettes(vehicleId, variants);

async function swapVehiclePalettes(vehicleId, requestedVariants) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const detailsDir = path.join(candidateDir, 'processed/neutral-128');
    const inputPath = path.join(detailsDir, 'sheet-128-details.png');
    const metadata = JSON.parse(await readFile(path.join(detailsDir, 'sheet-128-details.json'), 'utf8'));
    const width = metadata.columns * CELL_SIZE;
    const rows = Math.max(...metadata.poses.map((pose) => pose.cell.row)) + 1;
    const height = rows * CELL_SIZE;
    const [input, bodyMask] = await Promise.all([
        sharp(inputPath).ensureAlpha().raw().toBuffer(),
        sharp(path.join(candidateDir, 'masks/body.png')).ensureAlpha()
            .resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest }).raw().toBuffer(),
    ]);

    for (const variant of requestedVariants) {
        const outputDir = path.join(candidateDir, 'processed', `${variant}-128`);
        const outputPath = path.join(outputDir, 'sheet-128.png');
        const metadataPath = path.join(outputDir, 'sheet-128.json');
        const qaPath = path.join(outputDir, 'sheet-128.qa.json');
        const { output, qa } = swapPalette({ input, bodyMask, width, height, metadata, variant });
        await mkdir(outputDir, { recursive: true });
        await writePng(output, width, height, outputPath);
        await writeFile(metadataPath, `${JSON.stringify({
            ...metadata,
            output: relative(outputPath),
            source: { ...metadata.source, detailMaster: relative(inputPath) },
            palette: { bodyOnly: true, name: `${variant}-v1`, ramp: BODY_RAMPS[variant] },
        }, null, 2)}\n`);
        await writeFile(qaPath, `${JSON.stringify({ ...qa, input: relative(inputPath), output: relative(outputPath), vehicleId, variant }, null, 2)}\n`);
        console.log(`Palette ${vehicleId}/${variant}: ${relative(outputPath)}`);
    }
}

function swapPalette({ input, bodyMask, width, height, metadata, variant }) {
    const output = Buffer.from(input);
    const changedBodyPixels = [];
    let bodyFringePixels = 0;
    let protectedPixelsChanged = 0;
    let protectedPixelsTested = 0;
    let alphaChangedPixels = 0;
    for (let offset = 0; offset < input.length; offset += 4) {
        if (input[offset + 3] === 0) continue;
        const key = `${input[offset]},${input[offset + 1]},${input[offset + 2]}`;
        // Detail pass may turn a tiny body gap into lamp mass; retain it as lamp.
        if (LAMP_PROTECTION.has(key)) continue;
        const isBodyMaskPixel = bodyMask[offset + 3] >= 128;
        // Lanczos downsampling creates a one-pixel opaque body fringe beyond
        // the nearest-resized source mask. It uses an exact neutral body ramp
        // color, so it is safe to include without recolouring protected roles.
        const isNeutralBodyFringe = isNeutralBodyColor(input, offset);
        if (!isBodyMaskPixel && !isNeutralBodyFringe) continue;
        const shadeIndex = closestColorIndex(input, offset, NEUTRAL_BODY_RAMP);
        const replacement = BODY_RAMPS[variant][shadeIndex];
        setRgb(output, offset, replacement);
        changedBodyPixels.push(offset / 4);
        if (!isBodyMaskPixel) bodyFringePixels += 1;
    }
    const changedBodySet = new Set(changedBodyPixels);
    for (let offset = 0; offset < input.length; offset += 4) {
        const isBody = !LAMP_PROTECTION.has(`${input[offset]},${input[offset + 1]},${input[offset + 2]}`) &&
            (bodyMask[offset + 3] >= 128 || isNeutralBodyColor(input, offset));
        if (!isBody) {
            protectedPixelsTested += 1;
            if (!sameRgba(input, output, offset)) protectedPixelsChanged += 1;
        }
        if (input[offset + 3] !== output[offset + 3]) alphaChangedPixels += 1;
    }
    const blankCellOpaquePixels = countBlankCellOpacity(output, width, metadata);
    if (protectedPixelsChanged !== 0 || alphaChangedPixels !== 0 || blankCellOpaquePixels !== 0) {
        throw new Error(`${variant}: palette protection failed (protected=${protectedPixelsChanged}, alpha=${alphaChangedPixels}, blank=${blankCellOpaquePixels})`);
    }
    return {
        output,
        qa: {
            alphaChangedPixels,
            blankCellOpaquePixels,
            bodyFringePixels,
            changedBodyPixels: changedBodySet.size,
            protectedPixelsChanged,
            protectedPixelsTested,
        },
    };
}

function closestColorIndex(data, offset, ramp) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < ramp.length; index += 1) {
        const color = ramp[index];
        const distance = (data[offset] - color[0]) ** 2 + (data[offset + 1] - color[1]) ** 2 + (data[offset + 2] - color[2]) ** 2;
        if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
    }
    return bestIndex;
}
function isNeutralBodyColor(data, offset) {
    return NEUTRAL_BODY_RAMP.some((color) => data[offset] === color[0] && data[offset + 1] === color[1] && data[offset + 2] === color[2]);
}
function setRgb(data, offset, color) { data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; }
function sameRgba(a, b, offset) { return a[offset] === b[offset] && a[offset + 1] === b[offset + 1] && a[offset + 2] === b[offset + 2] && a[offset + 3] === b[offset + 3]; }
function countBlankCellOpacity(data, width, metadata) {
    const rows = Math.max(...metadata.poses.map((pose) => pose.cell.row)) + 1;
    const occupied = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    let count = 0;
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < metadata.columns; column += 1) {
        if (occupied.has(`${column},${row}`)) continue;
        for (let y = 0; y < CELL_SIZE; y += 1) for (let x = 0; x < CELL_SIZE; x += 1) if (data[((row * CELL_SIZE + y) * width + column * CELL_SIZE + x) * 4 + 3] !== 0) count += 1;
    }
    return count;
}
async function writePng(data, width, height, outputPath) { await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outputPath); }
function relative(filePath) { return path.relative(projectRoot, filePath); }
