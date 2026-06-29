import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    alphaThreshold: 24,
    input: 'assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.png',
    metadata: 'assets/vehicles/generated/pose-sheets/poc-toyota-gt86-scaled.json',
    outline: true,
    outputDir: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-96',
    targetCellSize: 96,
    wheelRestore: true,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--metadata' && next) {
        config.metadata = next;
        index += 1;
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--target-cell-size' && next) {
        config.targetCellSize = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--alpha-threshold' && next) {
        config.alphaThreshold = parseIntegerInRange(arg, next, 0, 255);
        index += 1;
    } else if (arg === '--no-outline') {
        config.outline = false;
    } else if (arg === '--no-wheel-restore') {
        config.wheelRestore = false;
    }
}

const inputPath = resolveProjectPath(config.input, '--input');
const metadataPath = resolveProjectPath(config.metadata, '--metadata');
const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
const outputPath = path.join(outputDir, `sheet-${config.targetCellSize}.png`);
const previewPath = path.join(outputDir, `sheet-${config.targetCellSize}-magenta-preview.png`);
const qaPath = path.join(outputDir, `sheet-${config.targetCellSize}.qa.json`);
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

if (!Number.isInteger(metadata.cellSize) || metadata.cellSize <= 0) {
    throw new Error(`Metadata must include a positive cellSize: ${config.metadata}`);
}

if (!Number.isInteger(metadata.columns) || metadata.columns <= 0) {
    throw new Error(`Metadata must include a positive columns value: ${config.metadata}`);
}

if (!Array.isArray(metadata.poses) || metadata.poses.length === 0) {
    throw new Error(`Metadata must include poses: ${config.metadata}`);
}

const rows = Math.ceil(metadata.poses.length / metadata.columns);
const outputWidth = metadata.columns * config.targetCellSize;
const outputHeight = rows * config.targetCellSize;
const output = Buffer.alloc(outputWidth * outputHeight * 4);
const qa = {
    alphaThreshold: config.alphaThreshold,
    columns: metadata.columns,
    input: path.relative(projectRoot, inputPath),
    metadata: path.relative(projectRoot, metadataPath),
    outline: config.outline,
    output: path.relative(projectRoot, outputPath),
    outputPreview: path.relative(projectRoot, previewPath),
    posePlanId: metadata.posePlanId ?? null,
    poses: [],
    rows,
    sourceCellSize: metadata.cellSize,
    targetCellSize: config.targetCellSize,
    vehicleId: metadata.vehicleId ?? null,
    wheelRestore: config.wheelRestore,
};

for (let index = 0; index < metadata.poses.length; index += 1) {
    const pose = metadata.poses[index];
    const left = pose.cell.column * metadata.cellSize;
    const top = pose.cell.row * metadata.cellSize;
    const processed = await processCell({ left, pose, top });
    const destinationLeft = (index % metadata.columns) * config.targetCellSize;
    const destinationTop = Math.floor(index / metadata.columns) * config.targetCellSize;

    blitCell({
        cell: processed.data,
        destinationLeft,
        destinationTop,
        output,
        outputWidth,
        sourceWidth: config.targetCellSize,
    });

    qa.poses.push({
        ...processed.qa,
        cell: {
            column: index % metadata.columns,
            row: Math.floor(index / metadata.columns),
        },
        sourceCell: pose.cell,
    });
}

const preview = Buffer.from(output);

for (let index = 0; index < preview.length; index += 4) {
    if (preview[index + 3] !== 0) continue;

    preview[index] = 255;
    preview[index + 1] = 0;
    preview[index + 2] = 255;
    preview[index + 3] = 255;
}

await mkdir(outputDir, { recursive: true });

await sharp(output, {
    raw: {
        channels: 4,
        height: outputHeight,
        width: outputWidth,
    },
}).png().toFile(outputPath);

await sharp(preview, {
    raw: {
        channels: 4,
        height: outputHeight,
        width: outputWidth,
    },
}).png().toFile(previewPath);

await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);

console.log(`Pixel pass wrote ${path.relative(projectRoot, outputPath)}`);
console.log(`Pixel pass wrote ${path.relative(projectRoot, previewPath)}`);
console.log(`Pixel pass wrote ${path.relative(projectRoot, qaPath)}`);

async function processCell({ left, pose, top }) {
    const resized = await sharp(inputPath)
        .ensureAlpha()
        .extract({
            height: metadata.cellSize,
            left,
            top,
            width: metadata.cellSize,
        })
        .resize(config.targetCellSize, config.targetCellSize, {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3,
        })
        .raw()
        .toBuffer();
    const quantized = Buffer.from(resized);
    const alphaMask = new Uint8Array(config.targetCellSize * config.targetCellSize);
    let droppedPixels = 0;
    let opaquePixels = 0;
    let semiTransparentPixels = 0;

    for (let index = 0; index < quantized.length; index += 4) {
        const alpha = quantized[index + 3];
        const maskIndex = index / 4;

        if (alpha < config.alphaThreshold) {
            quantized[index] = 0;
            quantized[index + 1] = 0;
            quantized[index + 2] = 0;
            quantized[index + 3] = 0;
            droppedPixels += alpha > 0 ? 1 : 0;
            continue;
        }

        if (alpha !== 255) {
            semiTransparentPixels += 1;
        }

        const color = quantizeColor(quantized[index], quantized[index + 1], quantized[index + 2]);

        quantized[index] = color[0];
        quantized[index + 1] = color[1];
        quantized[index + 2] = color[2];
        quantized[index + 3] = 255;
        alphaMask[maskIndex] = 1;
        opaquePixels += 1;
    }

    const preOutlineAnalysis = analyzeCell(quantized, config.targetCellSize, config.targetCellSize);
    const wheelRestore = config.wheelRestore
        ? restoreWheelAndTirePixels(quantized, alphaMask, config.targetCellSize, config.targetCellSize, preOutlineAnalysis.bbox, pose)
        : {
            rimRestorePixels: 0,
            tireRestorePixels: 0,
            wheelCenters: [],
        };
    let outlinePixels = 0;

    if (config.outline) {
        outlinePixels = addOutline(quantized, alphaMask, config.targetCellSize, config.targetCellSize);
    }

    const analysis = analyzeCell(quantized, config.targetCellSize, config.targetCellSize);

    return {
        data: quantized,
        qa: {
            anchor: analysis.anchor,
            baselineY: analysis.baselineY,
            bbox: analysis.bbox,
            droppedPixels,
            id: pose.id,
            modelPitchDeg: pose.modelPitchDeg,
            modelRollDeg: pose.modelRollDeg,
            modelYawDeg: pose.modelYawDeg,
            opaquePixels,
            outlinePixels,
            paletteColorCount: countPaletteColors(quantized),
            referenceRole: pose.referenceRole ?? null,
            rimRestorePixels: wheelRestore.rimRestorePixels,
            semiTransparentPixels,
            tireRestorePixels: wheelRestore.tireRestorePixels,
            wheelCenters: wheelRestore.wheelCenters,
        },
    };
}

function quantizeColor(red, green, blue) {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = max - min;
    const isRedLight = red > green * 1.35 && red > blue * 1.25 && red > 70;
    const isAmberLight = red > 120 && green > 70 && blue < 85;
    const isBlueGlass = blue > red * 1.05 && blue > green * 0.95 && luminance > 45;

    if (isRedLight) {
        if (luminance > 160) return [238, 64, 54];
        if (luminance > 95) return [176, 34, 34];
        return [96, 18, 24];
    }

    if (isAmberLight) {
        return luminance > 155 ? [242, 148, 46] : [176, 83, 26];
    }

    if (luminance < 28) return [10, 13, 16];
    if (luminance < 48) return [24, 30, 35];

    if (isBlueGlass || (saturation > 18 && luminance < 145)) {
        if (luminance > 150) return [170, 184, 190];
        if (luminance > 95) return [95, 116, 126];
        return [42, 54, 64];
    }

    if (luminance > 225) return [238, 238, 226];
    if (luminance > 185) return [205, 208, 202];
    if (luminance > 140) return [158, 164, 164];
    if (luminance > 92) return [104, 112, 114];
    return [58, 65, 68];
}

function addOutline(data, alphaMask, width, height) {
    const outlineIndexes = [];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x;

            if (alphaMask[index]) continue;

            let hasNeighbor = false;

            for (let dy = -1; dy <= 1 && !hasNeighbor; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

                    if (alphaMask[ny * width + nx]) {
                        hasNeighbor = true;
                        break;
                    }
                }
            }

            if (hasNeighbor) {
                outlineIndexes.push(index);
            }
        }
    }

    for (const pixel of outlineIndexes) {
        const index = pixel * 4;

        data[index] = 13;
        data[index + 1] = 18;
        data[index + 2] = 22;
        data[index + 3] = 255;
    }

    return outlineIndexes.length;
}

function restoreWheelAndTirePixels(data, alphaMask, width, height, bbox, pose) {
    if (!bbox || bbox.width < 16 || bbox.height < 12 || !isWheelRestoreEligiblePose(pose.id)) {
        return {
            rimRestorePixels: 0,
            tireRestorePixels: 0,
            wheelCenters: [],
        };
    }

    const centers = estimateWheelCenters(bbox, pose);
    let rimRestorePixels = 0;
    let tireRestorePixels = 0;

    for (const center of centers) {
        const radiusX = center.radiusX;
        const radiusY = center.radiusY;

        for (let y = Math.max(0, Math.floor(center.y - radiusY - 1)); y <= Math.min(height - 1, Math.ceil(center.y + radiusY + 1)); y += 1) {
            for (let x = Math.max(0, Math.floor(center.x - radiusX - 1)); x <= Math.min(width - 1, Math.ceil(center.x + radiusX + 1)); x += 1) {
                const pixel = y * width + x;

                if (!alphaMask[pixel]) continue;

                const normalizedOuter = ((x - center.x) ** 2) / (radiusX ** 2) + ((y - center.y) ** 2) / (radiusY ** 2);

                if (normalizedOuter > 1) continue;

                const index = pixel * 4;

                if (isProtectedLightPixel(data[index], data[index + 1], data[index + 2])) continue;

                const normalizedY = (y - center.y) / radiusY;

                if (normalizedY < -0.32) continue;

                if (Math.abs(x - center.x) <= 1 && Math.abs(y - center.y) <= 1) {
                    data[index] = 158;
                    data[index + 1] = 164;
                    data[index + 2] = 164;
                    rimRestorePixels += 1;
                    continue;
                }

                data[index] = 10;
                data[index + 1] = 13;
                data[index + 2] = 16;
                tireRestorePixels += 1;
            }
        }
    }

    return {
        rimRestorePixels,
        tireRestorePixels,
        wheelCenters: centers.map((center) => ({
            radiusX: Number(center.radiusX.toFixed(2)),
            radiusY: Number(center.radiusY.toFixed(2)),
            x: Number(center.x.toFixed(2)),
            y: Number(center.y.toFixed(2)),
        })),
    };
}

function estimateWheelCenters(bbox, pose) {
    const width = bbox.width;
    const height = bbox.height;
    const isRearLike = width <= 52 || pose.id === 'center' || pose.id === 'downhill-center' || pose.id === 'uphill-center';
    const y = bbox.y + height * 0.82;
    const radiusY = Math.max(2.5, Math.min(4.25, height * 0.1));
    const radiusX = Math.max(3.25, Math.min(5.6, width * (isRearLike ? 0.075 : 0.055)));

    if (isRearLike) {
        return [
            {
                radiusX,
                radiusY,
                x: bbox.x + width * 0.28,
                y,
            },
            {
                radiusX,
                radiusY,
                x: bbox.x + width * 0.72,
                y,
            },
        ];
    }

    return [
        {
            radiusX,
            radiusY,
            x: bbox.x + width * 0.22,
            y,
        },
        {
            radiusX,
            radiusY,
            x: bbox.x + width * 0.78,
            y,
        },
    ];
}

function isWheelRestoreEligiblePose(poseId) {
    return [
        'center',
        'steer-right-1',
        'steer-right-2',
        'downhill-center',
        'downhill-right-1',
        'downhill-right-2',
        'uphill-center',
        'uphill-right-1',
        'uphill-right-2',
    ].includes(poseId);
}

function isProtectedLightPixel(red, green, blue) {
    const isRedLight = red > green * 1.35 && red > blue * 1.25 && red > 70;
    const isAmberLight = red > 120 && green > 70 && blue < 85;

    return isRedLight || isAmberLight;
}

function isSimilarColor(data, index, red, green, blue) {
    return data[index] === red && data[index + 1] === green && data[index + 2] === blue;
}

function countPaletteColors(data) {
    const palette = new Set();

    for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] === 0) continue;
        palette.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
    }

    return palette.size;
}

function analyzeCell(data, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let opaquePixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;

            if (data[index + 3] === 0) continue;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            opaquePixels += 1;
        }
    }

    if (opaquePixels === 0) {
        return {
            anchor: null,
            baselineY: null,
            bbox: null,
        };
    }

    return {
        anchor: {
            x: (minX + maxX + 1) / 2,
            y: maxY,
        },
        baselineY: maxY,
        bbox: {
            height: maxY - minY + 1,
            width: maxX - minX + 1,
            x: minX,
            y: minY,
        },
    };
}

function blitCell({ cell, destinationLeft, destinationTop, output, outputWidth, sourceWidth }) {
    for (let y = 0; y < sourceWidth; y += 1) {
        for (let x = 0; x < sourceWidth; x += 1) {
            const sourceIndex = (y * sourceWidth + x) * 4;
            const destinationIndex = ((destinationTop + y) * outputWidth + destinationLeft + x) * 4;

            output[destinationIndex] = cell[sourceIndex];
            output[destinationIndex + 1] = cell[sourceIndex + 1];
            output[destinationIndex + 2] = cell[sourceIndex + 2];
            output[destinationIndex + 3] = cell[sourceIndex + 3];
        }
    }
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

function parsePositiveInteger(option, rawValue) {
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}

function parseIntegerInRange(option, rawValue, min, max) {
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}
