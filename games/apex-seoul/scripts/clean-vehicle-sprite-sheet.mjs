import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    backgroundThreshold: 10,
    cellHeight: null,
    cellSize: null,
    cellWidth: null,
    columns: 3,
    input: 'assets/vehicles/generated/img2img-candidates/raven-coupe-candidate.png',
    keepExtraPadding: 4,
    minComponentArea: 24,
    output: 'assets/vehicles/generated/img2img-candidates/raven-coupe-cleaned.png',
    qa: 'assets/vehicles/generated/qa/raven-coupe-cleaned.json',
    rows: 1,
    vehicleBandStart: 0.35,
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
    } else if (arg === '--cell-size' && next) {
        config.cellSize = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--cell-width' && next) {
        config.cellWidth = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--cell-height' && next) {
        config.cellHeight = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--columns' && next) {
        config.columns = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--rows' && next) {
        config.rows = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--background-threshold' && next) {
        config.backgroundThreshold = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--min-component-area' && next) {
        config.minComponentArea = parsePositiveInteger(arg, next);
        index += 1;
    }
}

const inputPath = path.resolve(projectRoot, config.input);
const outputPath = path.resolve(projectRoot, config.output);
const qaPath = path.resolve(projectRoot, config.qa);

const image = sharp(inputPath).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

const cellWidth = config.cellWidth ?? config.cellSize ?? Math.floor(info.width / config.columns);
const cellHeight = config.cellHeight ?? config.cellSize ?? Math.floor(info.height / config.rows);

if (cellWidth * config.columns > info.width) {
    throw new Error(`Input width ${info.width} is not compatible with ${config.columns} columns.`);
}

if (cellHeight * config.rows > info.height) {
    throw new Error(`Input height ${info.height} is not compatible with ${config.rows} rows.`);
}

const output = Buffer.from(data);
const qa = {
    backgroundThreshold: config.backgroundThreshold,
    cellHeight,
    cellWidth,
    columns: config.columns,
    input: path.relative(projectRoot, inputPath),
    output: path.relative(projectRoot, outputPath),
    poses: [],
    rows: config.rows,
};

for (let row = 0; row < config.rows; row += 1) {
    for (let column = 0; column < config.columns; column += 1) {
        const cell = cleanCell({
            column,
            data,
            height: cellHeight,
            info,
            output,
            row,
            width: cellWidth,
        });

        qa.poses.push(cell);
    }
}

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

console.log(`Cleaned ${path.relative(projectRoot, outputPath)}`);
console.log(`Wrote ${path.relative(projectRoot, qaPath)}`);

function cleanCell({ column, data, height, info, output, row, width }) {
    const left = column * width;
    const top = row * height;
    const candidate = new Uint8Array(width * height);
    const vehicleBandY = Math.floor(height * config.vehicleBandStart);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const sourceIndex = pixelIndex(info.width, left + x, top + y);
            const alpha = data[sourceIndex + 3];

            if (alpha === 0) continue;

            const red = data[sourceIndex];
            const green = data[sourceIndex + 1];
            const blue = data[sourceIndex + 2];
            const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
            const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
            const isVisiblePixel = luminance > config.backgroundThreshold || saturation > 12;

            if (isVisiblePixel) {
                candidate[y * width + x] = 1;
            }
        }
    }

    const components = findComponents(candidate, width, height)
        .map((component) => ({
            ...component,
            score: scoreComponent(component, width, vehicleBandY),
        }))
        .sort((a, b) => b.score - a.score);

    const keep = new Uint8Array(width * height);
    const keptComponents = [];

    for (const component of components) {
        if (component.area < config.minComponentArea) continue;
        if (component.maxY < vehicleBandY && component.area < 500) continue;

        const isMainVehicle = keptComponents.length === 0;
        const isNearMain = keptComponents.some((main) => boxesNear(component, main, width * 0.08));

        if (!isMainVehicle && !isNearMain && component.area < 1500) continue;

        keptComponents.push(component);

        for (const offset of component.offsets) {
            keep[offset] = 1;
        }
    }

    expandMask(keep, candidate, width, height, config.keepExtraPadding);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let keptPixels = 0;
    let removedPixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const maskIndex = y * width + x;
            const sourceIndex = pixelIndex(info.width, left + x, top + y);

            if (keep[maskIndex]) {
                keptPixels += 1;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            } else if (output[sourceIndex + 3] !== 0) {
                removedPixels += 1;
                output[sourceIndex] = 0;
                output[sourceIndex + 1] = 0;
                output[sourceIndex + 2] = 0;
                output[sourceIndex + 3] = 0;
            }
        }
    }

    const hasPixels = maxX >= minX && maxY >= minY;

    return {
        bbox: hasPixels
            ? {
                height: maxY - minY + 1,
                width: maxX - minX + 1,
                x: minX,
                y: minY,
            }
            : null,
        cell: {
            column,
            row,
        },
        center: hasPixels
            ? {
                x: (minX + maxX + 1) / 2,
                y: (minY + maxY + 1) / 2,
            }
            : null,
        componentCount: components.length,
        keptComponentCount: keptComponents.length,
        keptPixels,
        removedPixels,
    };
}

function findComponents(mask, width, height) {
    const visited = new Uint8Array(mask.length);
    const components = [];
    const queue = [];

    for (let start = 0; start < mask.length; start += 1) {
        if (!mask[start] || visited[start]) continue;

        visited[start] = 1;
        queue.length = 0;
        queue.push(start);

        const offsets = [];
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const offset = queue[cursor];
            const x = offset % width;
            const y = Math.floor(offset / width);

            offsets.push(offset);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);

            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if (dx === 0 && dy === 0) continue;

                    const nextX = x + dx;
                    const nextY = y + dy;

                    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;

                    const nextOffset = nextY * width + nextX;

                    if (!mask[nextOffset] || visited[nextOffset]) continue;

                    visited[nextOffset] = 1;
                    queue.push(nextOffset);
                }
            }
        }

        components.push({
            area: offsets.length,
            maxX,
            maxY,
            minX,
            minY,
            offsets,
        });
    }

    return components;
}

function expandMask(keep, candidate, width, height, radius) {
    const source = Buffer.from(keep);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = y * width + x;

            if (!source[offset]) continue;

            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    const nextX = x + dx;
                    const nextY = y + dy;

                    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;

                    const nextOffset = nextY * width + nextX;

                    if (candidate[nextOffset]) {
                        keep[nextOffset] = 1;
                    }
                }
            }
        }
    }
}

function scoreComponent(component, width, vehicleBandY) {
    const centerX = (component.minX + component.maxX + 1) / 2;
    const centerBias = 1 - Math.min(1, Math.abs(centerX - width / 2) / (width / 2));
    const lowerBias = component.maxY >= vehicleBandY ? 1 : 0.25;
    const componentWidth = component.maxX - component.minX + 1;
    const widthBias = Math.min(1, componentWidth / (width * 0.25));

    return component.area * (0.5 + centerBias + lowerBias + widthBias);
}

function boxesNear(a, b, margin) {
    return !(
        a.minX > b.maxX + margin ||
        a.maxX < b.minX - margin ||
        a.minY > b.maxY + margin ||
        a.maxY < b.minY - margin
    );
}

function pixelIndex(width, x, y) {
    return (y * width + x) * 4;
}

function parsePositiveInteger(arg, rawValue) {
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid ${arg} value: ${rawValue}`);
    }

    return value;
}
