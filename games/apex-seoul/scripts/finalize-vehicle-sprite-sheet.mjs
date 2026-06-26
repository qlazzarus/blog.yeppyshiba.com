import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    dropAlphaBelow: 48,
    input: 'assets/vehicles/generated/img2img-candidates/raven-coupe-cleaned.png',
    output: 'assets/vehicles/generated/img2img-candidates/raven-coupe-finalized.png',
    qa: 'assets/vehicles/generated/qa/raven-coupe-finalized.json',
    sourceQa: 'assets/vehicles/generated/qa/raven-coupe-cleaned.json',
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    } else if (arg === '--qa' && next) {
        config.qa = next;
        index += 1;
    } else if (arg === '--source-qa' && next) {
        config.sourceQa = next;
        index += 1;
    } else if (arg === '--drop-alpha-below' && next) {
        config.dropAlphaBelow = parseIntegerInRange(arg, next, 0, 255);
        index += 1;
    }
}

const inputPath = path.resolve(projectRoot, config.input);
const outputPath = path.resolve(projectRoot, config.output);
const qaPath = path.resolve(projectRoot, config.qa);
const sourceQaPath = path.resolve(projectRoot, config.sourceQa);
const sourceQa = JSON.parse(await readFile(sourceQaPath, 'utf8'));

const image = sharp(inputPath).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const output = Buffer.from(data);

let removedLowAlphaPixels = 0;
let hardenedPixels = 0;
let resetTransparentRgbPixels = 0;

for (let index = 0; index < output.length; index += 4) {
    const alpha = output[index + 3];

    if (alpha === 0) {
        if (output[index] || output[index + 1] || output[index + 2]) {
            resetTransparentRgbPixels += 1;
        }

        output[index] = 0;
        output[index + 1] = 0;
        output[index + 2] = 0;
        continue;
    }

    if (alpha < config.dropAlphaBelow) {
        removedLowAlphaPixels += 1;
        output[index] = 0;
        output[index + 1] = 0;
        output[index + 2] = 0;
        output[index + 3] = 0;
        continue;
    }

    if (alpha !== 255) {
        hardenedPixels += 1;
        output[index + 3] = 255;
    }
}

const poses = sourceQa.poses.map((pose) => analyzePose({
    cellHeight: sourceQa.cellHeight,
    cellWidth: sourceQa.cellWidth,
    data: output,
    imageWidth: info.width,
    pose,
}));
const commonBaselineY = Math.max(...poses.map((pose) => pose.baselineY));

for (const pose of poses) {
    pose.drawOffset = {
        x: Math.round(sourceQa.cellWidth / 2 - pose.anchor.x),
        y: commonBaselineY - pose.baselineY,
    };
}

const qa = {
    alpha: countAlpha(output),
    cellHeight: sourceQa.cellHeight,
    cellWidth: sourceQa.cellWidth,
    columns: sourceQa.columns,
    commonBaselineY,
    dropAlphaBelow: config.dropAlphaBelow,
    input: path.relative(projectRoot, inputPath),
    output: path.relative(projectRoot, outputPath),
    poses,
    removedLowAlphaPixels,
    resetTransparentRgbPixels,
    rows: sourceQa.rows,
    sourceQa: path.relative(projectRoot, sourceQaPath),
    hardenedPixels,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(qaPath), { recursive: true });

await sharp(output, {
    raw: {
        channels: info.channels,
        height: info.height,
        width: info.width,
    },
}).png().toFile(outputPath);

await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);

console.log(`Finalized ${path.relative(projectRoot, outputPath)}`);
console.log(`Wrote ${path.relative(projectRoot, qaPath)}`);

function analyzePose({ cellHeight, cellWidth, data, imageWidth, pose }) {
    const left = pose.cell.column * cellWidth;
    const top = pose.cell.row * cellHeight;
    let minX = cellWidth;
    let minY = cellHeight;
    let maxX = -1;
    let maxY = -1;
    let opaquePixels = 0;
    let darkBottomPixels = 0;

    for (let y = 0; y < cellHeight; y += 1) {
        for (let x = 0; x < cellWidth; x += 1) {
            const index = pixelIndex(imageWidth, left + x, top + y);
            const alpha = data[index + 3];

            if (!alpha) continue;

            const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;

            opaquePixels += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);

            if (luminance < 30 && y > (pose.bbox?.y ?? 0) + (pose.bbox?.height ?? 0) - 40) {
                darkBottomPixels += 1;
            }
        }
    }

    const hasPixels = maxX >= minX && maxY >= minY;
    const bbox = hasPixels
        ? {
            height: maxY - minY + 1,
            width: maxX - minX + 1,
            x: minX,
            y: minY,
        }
        : null;
    const baselineY = hasPixels ? maxY : 0;
    const anchor = hasPixels
        ? {
            x: (minX + maxX + 1) / 2,
            y: baselineY,
        }
        : {
            x: cellWidth / 2,
            y: 0,
        };

    return {
        anchor,
        baselineY,
        bbox,
        cell: pose.cell,
        darkBottomPixels,
        opaquePixels,
        shadowReviewNeeded: darkBottomPixels > opaquePixels * 0.04,
    };
}

function countAlpha(data) {
    let transparent = 0;
    let opaque = 0;
    let semiTransparent = 0;

    for (let index = 3; index < data.length; index += 4) {
        const alpha = data[index];

        if (alpha === 0) {
            transparent += 1;
        } else if (alpha === 255) {
            opaque += 1;
        } else {
            semiTransparent += 1;
        }
    }

    return {
        opaque,
        semiTransparent,
        transparent,
    };
}

function pixelIndex(width, x, y) {
    return (y * width + x) * 4;
}

function parseIntegerInRange(arg, rawValue, min, max) {
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`Invalid ${arg} value: ${rawValue}`);
    }

    return value;
}
