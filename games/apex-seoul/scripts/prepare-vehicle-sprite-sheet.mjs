import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    backgroundThreshold: 12,
    colorKey: '#ff00ff',
    columns: 3,
    input: 'assets/vehicles/generated/img2img-candidates/raven-coupe-generated.png',
    keepPadding: 5,
    minComponentArea: 32,
    outputColorKey: 'assets/vehicles/generated/img2img-candidates/raven-coupe-color-key-magenta.png',
    outputPreview: 'assets/vehicles/generated/img2img-candidates/raven-coupe-preview-magenta.png',
    outputTransparent: 'assets/vehicles/generated/img2img-candidates/raven-coupe-transparent.png',
    poseCount: 11,
    qa: 'assets/vehicles/generated/qa/raven-coupe-prepared.json',
    rows: 4,
    vehicleBandStart: 0.28,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--output-transparent' && next) {
        config.outputTransparent = next;
        index += 1;
    } else if (arg === '--output-preview' && next) {
        config.outputPreview = next;
        index += 1;
    } else if (arg === '--output-color-key' && next) {
        config.outputColorKey = next;
        index += 1;
    } else if (arg === '--qa' && next) {
        config.qa = next;
        index += 1;
    } else if (arg === '--columns' && next) {
        config.columns = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--rows' && next) {
        config.rows = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--pose-count' && next) {
        config.poseCount = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--background-threshold' && next) {
        config.backgroundThreshold = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--min-component-area' && next) {
        config.minComponentArea = parsePositiveInteger(arg, next);
        index += 1;
    } else if (arg === '--color-key' && next) {
        config.colorKey = next;
        index += 1;
    }
}

const inputPath = path.resolve(projectRoot, config.input);
const transparentPath = path.resolve(projectRoot, config.outputTransparent);
const previewPath = path.resolve(projectRoot, config.outputPreview);
const colorKeyPath = path.resolve(projectRoot, config.outputColorKey);
const qaPath = path.resolve(projectRoot, config.qa);
const keyColor = parseHexColor(config.colorKey);

const image = sharp(inputPath).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const columnEdges = buildEdges(info.width, config.columns);
const rowEdges = buildEdges(info.height, config.rows);

const transparent = Buffer.from(data);
const qa = {
    cellHeight: info.height / config.rows,
    cellWidth: info.width / config.columns,
    colorKey: config.colorKey,
    columnEdges,
    columns: config.columns,
    input: path.relative(projectRoot, inputPath),
    outputColorKey: path.relative(projectRoot, colorKeyPath),
    outputPreview: path.relative(projectRoot, previewPath),
    outputTransparent: path.relative(projectRoot, transparentPath),
    poseCount: config.poseCount,
    poses: [],
    rowEdges,
    rows: config.rows,
};

for (let index = 0; index < config.columns * config.rows; index += 1) {
    const row = Math.floor(index / config.columns);
    const column = index % config.columns;
    const isUnusedCell = index >= config.poseCount;
    const left = columnEdges[column];
    const right = columnEdges[column + 1];
    const top = rowEdges[row];
    const bottom = rowEdges[row + 1];

    qa.poses.push(cleanCell({
        column,
        data,
        height: bottom - top,
        imageWidth: info.width,
        isUnusedCell,
        left,
        output: transparent,
        row,
        top,
        width: right - left,
    }));
}

const preview = composeOnColorKey(transparent, keyColor);
const colorKey = composeOnColorKey(transparent, keyColor);

await mkdir(path.dirname(transparentPath), { recursive: true });
await mkdir(path.dirname(previewPath), { recursive: true });
await mkdir(path.dirname(colorKeyPath), { recursive: true });
await mkdir(path.dirname(qaPath), { recursive: true });

await sharp(transparent, {
    raw: {
        channels: 4,
        height: info.height,
        width: info.width,
    },
}).png().toFile(transparentPath);

await sharp(preview, {
    raw: {
        channels: 4,
        height: info.height,
        width: info.width,
    },
}).png().toFile(previewPath);

await sharp(colorKey, {
    raw: {
        channels: 4,
        height: info.height,
        width: info.width,
    },
}).png().toFile(colorKeyPath);

await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);

console.log(`Prepared transparent ${path.relative(projectRoot, transparentPath)}`);
console.log(`Prepared preview ${path.relative(projectRoot, previewPath)}`);
console.log(`Prepared color key ${path.relative(projectRoot, colorKeyPath)}`);
console.log(`Wrote ${path.relative(projectRoot, qaPath)}`);

function cleanCell({ column, data, height, imageWidth, isUnusedCell, left, output, row, top, width }) {
    const candidate = new Uint8Array(width * height);
    const vehicleBandY = Math.floor(height * config.vehicleBandStart);

    if (isUnusedCell) {
        const removedPixels = clearCell(output, imageWidth, left, top, width, height);

        return {
            bbox: null,
            cell: { column, row },
            isUnusedCell,
            keptComponentCount: 0,
            keptPixels: 0,
            removedPixels,
        };
    }

    const background = floodFillBackground({
        data,
        height,
        imageWidth,
        left,
        top,
        width,
    });

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const maskIndex = y * width + x;
            const sourceIndex = pixelIndex(imageWidth, left + x, top + y);

            if (!background[maskIndex] && data[sourceIndex + 3] !== 0) {
                candidate[maskIndex] = 1;
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
        if (component.maxY < vehicleBandY && component.area < 600) continue;

        const isMainVehicle = keptComponents.length === 0;
        const isNearMain = keptComponents.some((main) => boxesNear(component, main, width * 0.1));

        if (!isMainVehicle && !isNearMain && component.area < 2000) continue;

        keptComponents.push(component);

        for (const offset of component.offsets) {
            keep[offset] = 1;
        }
    }

    expandMask(keep, candidate, width, height, config.keepPadding);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let keptPixels = 0;
    let removedPixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const maskIndex = y * width + x;

            if (keep[maskIndex]) {
                keptPixels += 1;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    const hasPixels = maxX >= minX && maxY >= minY;
    const paddedBox = hasPixels
        ? {
            maxX: Math.min(width - 1, maxX + config.keepPadding),
            maxY: Math.min(height - 1, maxY + config.keepPadding),
            minX: Math.max(0, minX - config.keepPadding),
            minY: Math.max(0, minY - config.keepPadding),
        }
        : null;

    keptPixels = 0;
    removedPixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const sourceIndex = pixelIndex(imageWidth, left + x, top + y);
            const shouldKeep = paddedBox
                && x >= paddedBox.minX
                && x <= paddedBox.maxX
                && y >= paddedBox.minY
                && y <= paddedBox.maxY;

            if (shouldKeep) {
                if (output[sourceIndex + 3] !== 0) {
                    keptPixels += 1;
                }
            } else if (output[sourceIndex + 3] !== 0) {
                removedPixels += 1;
                output[sourceIndex] = 0;
                output[sourceIndex + 1] = 0;
                output[sourceIndex + 2] = 0;
                output[sourceIndex + 3] = 0;
            }
        }
    }

    return {
        bbox: hasPixels
            ? {
                height: paddedBox.maxY - paddedBox.minY + 1,
                width: paddedBox.maxX - paddedBox.minX + 1,
                x: paddedBox.minX,
                y: paddedBox.minY,
            }
            : null,
        cell: { column, row },
        componentCount: components.length,
        isUnusedCell,
        keptComponentCount: keptComponents.length,
        keptPixels,
        removedPixels,
    };
}

function clearCell(output, imageWidth, left, top, width, height) {
    let removedPixels = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = pixelIndex(imageWidth, left + x, top + y);

            if (output[index + 3] !== 0) {
                removedPixels += 1;
            }

            output[index] = 0;
            output[index + 1] = 0;
            output[index + 2] = 0;
            output[index + 3] = 0;
        }
    }

    return removedPixels;
}

function floodFillBackground({ data, height, imageWidth, left, top, width }) {
    const background = new Uint8Array(width * height);
    const queue = [];

    for (let x = 0; x < width; x += 1) {
        enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, x, 0);
        enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
        enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, 0, y);
        enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, width - 1, y);
    }

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const offset = queue[cursor];
        const x = offset % width;
        const y = Math.floor(offset / width);

        for (const neighbor of getCardinalNeighbors(x, y, width, height)) {
            const nx = neighbor % width;
            const ny = Math.floor(neighbor / width);

            enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, nx, ny);
        }
    }

    return background;
}

function enqueueBackgroundPixel(queue, background, data, imageWidth, left, top, width, x, y) {
    const maskIndex = y * width + x;

    if (background[maskIndex]) return;

    const sourceIndex = pixelIndex(imageWidth, left + x, top + y);

    if (!isBackgroundPixel(data, sourceIndex)) return;

    background[maskIndex] = 1;
    queue.push(maskIndex);
}

function isBackgroundPixel(data, index) {
    const alpha = data[index + 3];

    if (alpha === 0) return true;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

    return luminance <= config.backgroundThreshold && saturation <= 18;
}

function composeOnColorKey(data, keyColor) {
    const output = Buffer.from(data);

    for (let index = 0; index < output.length; index += 4) {
        if (output[index + 3] === 0) {
            output[index] = keyColor.r;
            output[index + 1] = keyColor.g;
            output[index + 2] = keyColor.b;
            output[index + 3] = 255;
        } else {
            output[index + 3] = 255;
        }
    }

    return output;
}

function getCardinalNeighbors(x, y, width, height) {
    const neighbors = [];

    if (x > 0) neighbors.push(y * width + x - 1);
    if (x < width - 1) neighbors.push(y * width + x + 1);
    if (y > 0) neighbors.push((y - 1) * width + x);
    if (y < height - 1) neighbors.push((y + 1) * width + x);

    return neighbors;
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

            for (const neighbor of getNeighbors(x, y, width, height)) {
                if (!mask[neighbor] || visited[neighbor]) continue;

                visited[neighbor] = 1;
                queue.push(neighbor);
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

function getNeighbors(x, y, width, height) {
    const neighbors = [];

    for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                neighbors.push(ny * width + nx);
            }
        }
    }

    return neighbors;
}

function scoreComponent(component, width, vehicleBandY) {
    const centerX = (component.minX + component.maxX + 1) / 2;
    const centerBias = 1 - Math.min(Math.abs(centerX - width / 2) / (width / 2), 1);
    const lowerBias = component.maxY >= vehicleBandY ? 1 : 0.25;

    return component.area * (1 + centerBias * 0.3) * lowerBias;
}

function boxesNear(a, b, distance) {
    return !(
        a.minX > b.maxX + distance
        || b.minX > a.maxX + distance
        || a.minY > b.maxY + distance
        || b.minY > a.maxY + distance
    );
}

function expandMask(keep, candidate, width, height, radius) {
    const original = Buffer.from(keep);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = y * width + x;

            if (!original[offset]) continue;

            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    const neighbor = ny * width + nx;

                    if (candidate[neighbor]) {
                        keep[neighbor] = 1;
                    }
                }
            }
        }
    }
}

function pixelIndex(width, x, y) {
    return (y * width + x) * 4;
}

function parseHexColor(rawColor) {
    const match = /^#?([0-9a-f]{6})$/i.exec(rawColor);

    if (!match) {
        throw new Error(`Invalid --color-key value: ${rawColor}`);
    }

    const value = Number.parseInt(match[1], 16);

    return {
        b: value & 0xff,
        g: (value >> 8) & 0xff,
        r: (value >> 16) & 0xff,
    };
}

function parsePositiveInteger(arg, rawValue) {
    const value = Number(rawValue);

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid ${arg} value: ${rawValue}`);
    }

    return value;
}

function buildEdges(size, count) {
    const edges = [];

    for (let index = 0; index <= count; index += 1) {
        edges.push(Math.round((size * index) / count));
    }

    return edges;
}
