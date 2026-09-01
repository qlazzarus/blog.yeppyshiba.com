import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const candidateManifestPath = path.resolve(projectRoot, 'assets/vehicles/source/manifests/real-vehicle-7way-candidates.json');
const roles = ['body', 'glass', 'lamp', 'wheel', 'chrome', 'accent', 'shadow'];
const debugColors = {
    accent: [244, 206, 52],
    body: [78, 154, 224],
    chrome: [210, 220, 224],
    glass: [74, 194, 214],
    lamp: [234, 62, 58],
    shadow: [48, 58, 72],
    wheel: [38, 44, 52],
};

const config = { candidateRoot: 'assets/vehicles/generated/7way-candidates', vehicle: null };

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicle = next;
        index += 1;
    } else if (arg === '--candidate-root' && next) {
        config.candidateRoot = next;
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const manifest = JSON.parse(await readFile(candidateManifestPath, 'utf8'));
const vehicles = config.vehicle
    ? manifest.vehicles.filter((vehicle) => vehicle.publicId === config.vehicle)
    : manifest.vehicles;

if (vehicles.length === 0) {
    throw new Error(`Unknown --vehicle value: ${config.vehicle}. Expected raven-coupe, seorin-gt, or mirae-gt.`);
}

for (const vehicle of vehicles) await extractRoleMasks(vehicle);

async function extractRoleMasks(vehicle) {
    const candidateDir = path.resolve(projectRoot, config.candidateRoot, vehicle.publicId);
    const sourcePath = path.join(candidateDir, 'source-17pose-512.png');
    const metadataPath = path.join(candidateDir, 'source-17pose-512.json');
    const outputDir = path.join(candidateDir, 'masks');
    const geometryWheelPath = path.join(outputDir, 'wheel-geometry.png');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const geometryWheel = await loadGeometryWheelMask(geometryWheelPath, info);

    validateSource({ info, metadata, sourcePath, vehicle });

    const masks = Object.fromEntries(roles.map((role) => [role, Buffer.alloc(data.length)]));
    const debug = Buffer.alloc(data.length);
    const qa = {
        candidate: path.relative(projectRoot, candidateDir),
        coverage: { opaquePixels: 0, unclassifiedPixels: 0 },
        maskFiles: Object.fromEntries(roles.map((role) => [role, `${role}.png`])),
        method: 'screen-space role candidates; source alpha and RGB classification with optional GLB geometry wheel protection',
        notes: [
            'Masks are mutually exclusive candidates. body is the fallback for every opaque source pixel.',
            'The beauty source has no ground shadow. shadow.png is intentionally empty; Phaser reuses its separate dynamic shadow atlas.',
            'accent protects Seorin GT roll cage and amber signal accents from body palette swaps.',
            geometryWheel
                ? 'wheel-geometry.png is a wheel-only GLB render. Its alpha may promote opaque beauty pixels to wheel, but never removes source alpha.'
                : 'wheel-geometry.png is absent; wheel remains the conservative screen-space candidate.',
        ],
        poses: [],
        source: path.relative(projectRoot, sourcePath),
        geometryWheelSource: geometryWheel ? path.relative(projectRoot, geometryWheelPath) : null,
        sourceCellSize: metadata.cellSize,
        sourceGrid: { columns: metadata.columns, rows: Math.ceil(metadata.poses.length / metadata.columns) },
        vehicleId: vehicle.publicId,
    };

    for (const pose of metadata.poses) {
        const cellLeft = pose.cell.column * metadata.cellSize;
        const cellTop = pose.cell.row * metadata.cellSize;
        const opaqueBounds = getOpaqueBounds({ cellLeft, cellTop, cellSize: metadata.cellSize, data, imageWidth: info.width });
        const isPhysicsPose = pose.id.startsWith('rollover') || pose.id === 'overturned';
        for (let y = 0; y < metadata.cellSize; y += 1) {
            for (let x = 0; x < metadata.cellSize; x += 1) {
                const offset = ((cellTop + y) * info.width + cellLeft + x) * 4;
                if (data[offset + 3] === 0) continue;

                const role = classifyPixel({
                    blue: data[offset + 2], green: data[offset + 1], isPhysicsPose,
                    red: data[offset], vehicleBottom: opaqueBounds.maxY, vehicleId: vehicle.publicId,
                    vehicleTop: opaqueBounds.minY, width: metadata.cellSize, x, y,
                });
                writeMaskPixel(masks[role], offset);
                writeDebugPixel(debug, offset, debugColors[role]);
                qa.coverage.opaquePixels += 1;
            }
        }
        assignWheelComponents({ cellLeft, cellTop, cellSize: metadata.cellSize, data, debug, imageWidth: info.width, masks, poseId: pose.id });
        const geometryResult = assignGeometryWheelPixels({
            cellLeft, cellTop, cellSize: metadata.cellSize, data, debug, geometryWheel,
            imageWidth: info.width, masks, poseId: pose.id,
        });
        const rolePixels = countRolePixels({ cellLeft, cellTop, cellSize: metadata.cellSize, imageWidth: info.width, masks });
        qa.poses.push({ cell: pose.cell, geometryTyreExpansionPixels: geometryResult.tyreExpansionPixels,
            geometryWheelPixels: geometryResult.directPixels, id: pose.id, rolePixels });
    }

    await mkdir(outputDir, { recursive: true });
    await Promise.all(roles.map((role) => writePng(masks[role], info, path.join(outputDir, `${role}.png`))));
    await writePng(debug, info, path.join(outputDir, 'roles-debug.png'));
    await writeFile(path.join(outputDir, 'roles.qa.json'), `${JSON.stringify(qa, null, 2)}\n`);
    console.log(`Wrote role masks: ${path.relative(projectRoot, outputDir)}`);
}

async function loadGeometryWheelMask(maskPath, sourceInfo) {
    try {
        const { data, info } = await sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (info.width !== sourceInfo.width || info.height !== sourceInfo.height) {
            throw new Error(`wheel geometry dimensions ${info.width}x${info.height} do not match beauty ${sourceInfo.width}x${sourceInfo.height}`);
        }
        return data;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

function classifyPixel({ red, green, blue, isPhysicsPose, vehicleTop, vehicleBottom, y }) {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = max - min;
    const vehicleHeight = Math.max(1, vehicleBottom - vehicleTop + 1);
    const isRedLamp = red > 82 && red > green * 1.3 && red > blue * 1.25;
    const isAmberAccent = red > 105 && green > 82 && blue < 115 && red > blue * 1.35;
    const isDark = luminance < 82;
    // Do not classify a cool body colour as glass. The frozen masters use
    // blue-grey paint (especially Mirae GT), while glass is consistently a
    // dark, low-saturation region in the upper vehicle silhouette.
    // The vehicle is intentionally framed in the upper half of a 512px cell.
    // Comparing against the full cell therefore classified tyres, grilles and
    // lower trim as glass. Use the actual opaque vehicle bounds instead.
    const isGlass = !isPhysicsPose && isDark && saturation < 72
        && y >= vehicleTop && y < vehicleTop + vehicleHeight * 0.42;
    // Automatic chrome detection is deliberately disabled. Even this former
    // lower-perimeter heuristic classified Seorin GT's painted side skirt
    // highlight as chrome, causing a white stripe to survive body palette
    // swaps. Explicit chrome styling belongs to the later detail recipe.

    if (isRedLamp) return 'lamp';
    if (isAmberAccent) return 'accent';
    if (isGlass) return 'glass';
    return 'body';
}

function getOpaqueBounds({ cellLeft, cellTop, cellSize, data, imageWidth }) {
    let minX = cellSize;
    let maxX = -1;
    let minY = cellSize;
    let maxY = -1;
    for (let y = 0; y < cellSize; y += 1) {
        for (let x = 0; x < cellSize; x += 1) {
            const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
            if (data[offset + 3] === 0) continue;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    return maxY >= minY ? { maxX, maxY, minX, minY } : {
        maxX: cellSize - 1, maxY: cellSize - 1, minX: 0, minY: 0,
    };
}

function assignWheelComponents({ cellLeft, cellTop, cellSize, data, debug, imageWidth, masks, poseId }) {
    // During rollover/overturned frames the exposed underbody merges with the
    // tyres into a single dark silhouette. A false-positive body mask is much
    // worse than omitting a wheel recolour in those rare physics frames, so
    // leave them to the dedicated physics-detail recipe.
    if (poseId.startsWith('rollover') || poseId === 'overturned') return;

    const candidates = new Uint8Array(cellSize * cellSize);
    const visited = new Uint8Array(cellSize * cellSize);
    const components = [];

    for (let y = 0; y < cellSize; y += 1) {
        for (let x = 0; x < cellSize; x += 1) {
            const localOffset = y * cellSize + x;
            const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
            if (data[offset + 3] === 0) continue;
            const red = data[offset];
            const green = data[offset + 1];
            const blue = data[offset + 2];
            const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
            const isLamp = red > 82 && red > green * 1.3 && red > blue * 1.25;
            const isAmber = red > 105 && green > 82 && blue < 115 && red > blue * 1.35;
            if (!isLamp && !isAmber && luminance < 82) candidates[localOffset] = 1;
        }
    }

    for (let start = 0; start < candidates.length; start += 1) {
        if (!candidates[start] || visited[start]) continue;
        const queue = [start];
        let minX = cellSize;
        let maxX = -1;
        let minY = cellSize;
        let maxY = -1;

        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const current = queue[cursor];
            const x = current % cellSize;
            const y = Math.floor(current / cellSize);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            for (const [offsetX, offsetY] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                const nextX = x + offsetX;
                const nextY = y + offsetY;
                if (nextX < 0 || nextY < 0 || nextX >= cellSize || nextY >= cellSize) continue;
                const next = nextY * cellSize + nextX;
                if (!candidates[next] || visited[next]) continue;
                visited[next] = 1;
                queue.push(next);
            }
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const ratio = width / height;
        const density = queue.length / (width * height);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        if (queue.length < 250 || width < 18 || height < 18 || width > cellSize * 0.32 || height > cellSize * 0.32) continue;
        if (ratio < 0.5 || ratio > 1.7 || density < 0.1 || density > 0.88) continue;
        // Tyres are perimeter features in every upright camera pose. This
        // rejects the lower central grille/undertray which can otherwise look
        // sufficiently round after rasterization.
        if (centerX > cellSize * 0.4 && centerX < cellSize * 0.6) continue;
        if (centerY < cellSize * 0.52) continue;
        components.push({ area: queue.length, height, maxX, maxY, minX, minY, width });
    }

    // A normal pose exposes at most two tyres. Long bumper/diffuser
    // components fail the shape gate above and are excluded.
    for (const component of components.sort((a, b) => b.area - a.area).slice(0, 2)) {
        paintWheelEllipse({ candidates, cellLeft, cellTop, cellSize, component, data, debug, imageWidth, masks });
    }

}

function paintWheelEllipse({ candidates, cellLeft, cellTop, cellSize, component, data, debug, imageWidth, masks }) {
    const centerX = (component.minX + component.maxX) / 2;
    const centerY = (component.minY + component.maxY) / 2;
    const radiusX = Math.max(1, component.width * 0.62);
    const radiusY = Math.max(1, component.height * 0.62);

    for (let y = Math.max(0, Math.floor(centerY - radiusY)); y <= Math.min(cellSize - 1, Math.ceil(centerY + radiusY)); y += 1) {
        for (let x = Math.max(0, Math.floor(centerX - radiusX)); x <= Math.min(cellSize - 1, Math.ceil(centerX + radiusX)); x += 1) {
            if (((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 > 1) continue;
            // The ellipse finds a wheel-shaped component, but must not turn
            // adjacent painted fender pixels into wheel pixels. Keep only the
            // original dark tyre/rim candidate inside that ellipse.
            if (!candidates[y * cellSize + x]) continue;
            const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
            if (data[offset + 3] === 0) continue;
            for (const role of roles) masks[role][offset + 3] = 0;
            writeMaskPixel(masks.wheel, offset);
            writeDebugPixel(debug, offset, debugColors.wheel);
        }
    }
}

function assignGeometryWheelPixels({ cellLeft, cellTop, cellSize, data, debug, geometryWheel, imageWidth, masks, poseId }) {
    // Physical rollover poses intentionally retain the conservative fallback:
    // the exposed underbody overlaps the tyre geometry in screen space.
    if (!geometryWheel || poseId.startsWith('rollover') || poseId === 'overturned') {
        return { directPixels: 0, tyreExpansionPixels: 0 };
    }

    let directPixels = 0;
    for (let y = 0; y < cellSize; y += 1) {
        for (let x = 0; x < cellSize; x += 1) {
            const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
            if (data[offset + 3] === 0 || geometryWheel[offset + 3] === 0) continue;
            for (const role of roles) masks[role][offset + 3] = 0;
            writeMaskPixel(masks.wheel, offset);
            writeDebugPixel(debug, offset, debugColors.wheel);
            directPixels += 1;
        }
    }
    const tyreExpansionPixels = promoteDarkTyrePixelsNearGeometry({
        cellLeft, cellTop, cellSize, data, debug, geometryWheel, imageWidth, masks,
    });
    return { directPixels, tyreExpansionPixels };
}

function promoteDarkTyrePixelsNearGeometry({ cellLeft, cellTop, cellSize, data, debug, geometryWheel, imageWidth, masks }) {
    // Geometry renders can expose only the rear rim while the dark tyre is
    // hidden behind an overfender in the depth pass. Reconstruct only the
    // nearby dark tyre pixels from that visible rim seed. Bright mudguard and
    // fender pixels deliberately remain body role.
    const seen = new Uint8Array(cellSize * cellSize);
    const seeds = [];
    for (let start = 0; start < seen.length; start += 1) {
        if (seen[start]) continue;
        const startX = start % cellSize;
        const startY = Math.floor(start / cellSize);
        const startOffset = ((cellTop + startY) * imageWidth + cellLeft + startX) * 4;
        if (geometryWheel[startOffset + 3] === 0) continue;
        const queue = [start];
        seen[start] = 1;
        let minX = startX;
        let maxX = startX;
        let minY = startY;
        let maxY = startY;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const current = queue[cursor];
            const x = current % cellSize;
            const y = Math.floor(current / cellSize);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
                const nextX = x + dx;
                const nextY = y + dy;
                if (nextX < 0 || nextY < 0 || nextX >= cellSize || nextY >= cellSize) continue;
                const next = nextY * cellSize + nextX;
                if (seen[next]) continue;
                const nextOffset = ((cellTop + nextY) * imageWidth + cellLeft + nextX) * 4;
                if (geometryWheel[nextOffset + 3] === 0) continue;
                seen[next] = 1;
                queue.push(next);
            }
        }
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        if (queue.length < 12 || width < 6 || height < 6 || width > 96 || height > 96) continue;
        if (width / height < 0.25 || width / height > 3.5) continue;
        seeds.push({ centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, height, width });
    }

    let count = 0;
    for (const seed of seeds) {
        const radiusX = Math.max(14, seed.width * 0.78);
        const radiusY = Math.max(14, seed.height * 0.78);
        for (let y = Math.max(0, Math.floor(seed.centerY - radiusY)); y <= Math.min(cellSize - 1, Math.ceil(seed.centerY + radiusY)); y += 1) {
            for (let x = Math.max(0, Math.floor(seed.centerX - radiusX)); x <= Math.min(cellSize - 1, Math.ceil(seed.centerX + radiusX)); x += 1) {
                if (((x - seed.centerX) / radiusX) ** 2 + ((y - seed.centerY) / radiusY) ** 2 > 1) continue;
                const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
                if (data[offset + 3] === 0) continue;
                const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
                if (luminance >= 112) continue;
                if (masks.wheel[offset + 3] !== 0) continue;
                for (const role of roles) masks[role][offset + 3] = 0;
                writeMaskPixel(masks.wheel, offset);
                writeDebugPixel(debug, offset, debugColors.wheel);
                count += 1;
            }
        }
    }
    return count;
}

function countRolePixels({ cellLeft, cellTop, cellSize, imageWidth, masks }) {
    const counts = Object.fromEntries(roles.map((role) => [role, 0]));
    for (let y = 0; y < cellSize; y += 1) {
        for (let x = 0; x < cellSize; x += 1) {
            const offset = ((cellTop + y) * imageWidth + cellLeft + x) * 4;
            for (const role of roles) {
                if (masks[role][offset + 3] === 0) continue;
                counts[role] += 1;
                break;
            }
        }
    }
    return counts;
}

function validateSource({ info, metadata, sourcePath, vehicle }) {
    if (!Number.isInteger(metadata.cellSize) || metadata.cellSize <= 0) throw new Error(`Invalid cellSize in ${sourcePath}`);
    if (!Number.isInteger(metadata.columns) || metadata.columns <= 0) throw new Error(`Invalid columns in ${sourcePath}`);
    if (!Array.isArray(metadata.poses) || metadata.poses.length !== 17) {
        throw new Error(`${vehicle.publicId} must provide exactly 17 source poses before role-mask extraction.`);
    }
    const rows = Math.ceil(metadata.poses.length / metadata.columns);
    if (info.width !== metadata.columns * metadata.cellSize || info.height !== rows * metadata.cellSize) {
        throw new Error(`${vehicle.publicId} source dimensions do not match its 3×6 source grid.`);
    }
}

async function writePng(data, info, outputPath) {
    await sharp(data, { raw: { channels: 4, height: info.height, width: info.width } }).png().toFile(outputPath);
}

function writeMaskPixel(mask, offset) {
    mask[offset] = 255;
    mask[offset + 1] = 255;
    mask[offset + 2] = 255;
    mask[offset + 3] = 255;
}

function writeDebugPixel(debug, offset, color) {
    debug[offset] = color[0];
    debug[offset + 1] = color[1];
    debug[offset + 2] = color[2];
    debug[offset + 3] = 255;
}
