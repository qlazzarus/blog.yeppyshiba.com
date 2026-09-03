import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const ROLE_NAMES = ['body', 'glass', 'lamp', 'wheel', 'chrome', 'accent', 'shadow'];
let TARGET_CELL_SIZE = 128;
const ALPHA_THRESHOLD = 36;

const PALETTES = {
    body: [[20, 34, 51], [48, 76, 103], [94, 139, 169], [178, 211, 224]],
    glass: [[10, 22, 37], [28, 57, 82], [91, 138, 164]],
    lamp: [[91, 25, 37], [191, 47, 57], [255, 127, 103]],
    wheel: [[11, 15, 21], [46, 56, 67], [116, 132, 142]],
    chrome: [[61, 75, 86], [137, 157, 166], [218, 229, 228]],
    accent: [[90, 83, 24], [171, 156, 42], [233, 218, 86]],
    outline: [[7, 12, 20]],
};

const config = { cellSize: 128, vehicleIds: [] };
for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleIds.push(next);
        index += 1;
    } else if (arg === '--cell-size' && next) {
        config.cellSize = Number(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

if (!Number.isInteger(config.cellSize) || ![128, 192].includes(config.cellSize)) {
    throw new Error('cell-size must be 128 or 192');
}
TARGET_CELL_SIZE = config.cellSize;

const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : VEHICLE_IDS;
for (const vehicleId of vehicleIds) {
    if (!VEHICLE_IDS.includes(vehicleId)) throw new Error(`Unknown vehicle: ${vehicleId}`);
    await stylizeVehicle(vehicleId);
}

async function stylizeVehicle(vehicleId) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const sourcePath = path.join(candidateDir, 'source-17pose-512.png');
    const metadataPath = path.join(candidateDir, 'source-17pose-512.json');
    const outputDir = path.join(candidateDir, `processed/neutral-${TARGET_CELL_SIZE}`);
    const outputPath = path.join(outputDir, `sheet-${TARGET_CELL_SIZE}.png`);
    const outputMetadataPath = path.join(outputDir, `sheet-${TARGET_CELL_SIZE}.json`);
    const qaPath = path.join(outputDir, `sheet-${TARGET_CELL_SIZE}.qa.json`);
    const previewPath = path.join(outputDir, `sheet-${TARGET_CELL_SIZE}-checker-preview.png`);
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

    validateMetadata(metadata, vehicleId);
    const rows = Math.max(...metadata.poses.map((pose) => pose.cell.row)) + 1;
    const width = metadata.columns * TARGET_CELL_SIZE;
    const height = rows * TARGET_CELL_SIZE;
    const roleData = await loadRoleMasks(candidateDir, width, height);
    const source = await sharp(sourcePath).ensureAlpha()
        .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .raw().toBuffer();
    const output = Buffer.alloc(width * height * 4);
    const qa = { vehicleId, source: relative(sourcePath), output: relative(outputPath), cellSize: TARGET_CELL_SIZE, columns: metadata.columns, rows, alphaThreshold: ALPHA_THRESHOLD, poses: [] };

    for (const pose of metadata.poses) {
        const left = pose.cell.column * TARGET_CELL_SIZE;
        const top = pose.cell.row * TARGET_CELL_SIZE;
        const cell = stylizeCell({ source, roleData, sourceWidth: width, left, top });
        blit(cell.data, output, width, left, top);
        qa.poses.push({ id: pose.id, cell: pose.cell, ...cell.qa });
    }

    const occupiedCells = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    qa.blankCells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < metadata.columns; column += 1) {
            if (!occupiedCells.has(`${column},${row}`)) qa.blankCells.push({ column, row });
        }
    }
    qa.blankCellOpaquePixels = qa.blankCells.reduce((total, cell) => total + countOpaque(output, width, cell.column * TARGET_CELL_SIZE, cell.row * TARGET_CELL_SIZE), 0);
    if (qa.blankCellOpaquePixels !== 0) throw new Error(`${vehicleId}: blank cell must remain transparent`);

    await mkdir(outputDir, { recursive: true });
    await writePng(output, width, height, outputPath);
    await writePng(makeCheckerPreview(output, width, height), width, height, previewPath);
    const outputMetadata = {
        ...metadata,
        cellSize: TARGET_CELL_SIZE,
        output: relative(outputPath),
        source: { beauty: relative(sourcePath), masks: ROLE_NAMES.map((role) => relative(path.join(candidateDir, 'masks', `${role}.png`))) },
        stylize: {
            alphaThreshold: ALPHA_THRESHOLD,
            palette: 'neutral-retro-v1',
            process: [`512-to-${TARGET_CELL_SIZE}-lanczos`, 'role-palette-quantization', 'one-pixel-outline'],
            shadowPolicy: 'No baked-in shadow. Phaser renders the existing separate, dynamic shadow atlas.',
        },
    };
    await writeFile(outputMetadataPath, `${JSON.stringify(outputMetadata, null, 2)}\n`);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    console.log(`Stylized ${vehicleId}: ${relative(outputPath)}`);
}

function validateMetadata(metadata, vehicleId) {
    if (metadata.cellSize !== 512 || metadata.columns !== 3 || !Array.isArray(metadata.poses) || metadata.poses.length !== 17) {
        throw new Error(`${vehicleId}: expected 3x6 source metadata with 17 poses`);
    }
}

async function loadRoleMasks(candidateDir, width, height) {
    const entries = await Promise.all(ROLE_NAMES.map(async (role) => {
        const data = await sharp(path.join(candidateDir, 'masks', `${role}.png`)).ensureAlpha()
            .resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest })
            .raw().toBuffer();
        return [role, data];
    }));
    return Object.fromEntries(entries);
}

function stylizeCell({ source, roleData, sourceWidth, left, top }) {
    const size = TARGET_CELL_SIZE;
    const data = Buffer.alloc(size * size * 4);
    const silhouette = new Uint8Array(size * size);
    const roleCounts = Object.fromEntries(ROLE_NAMES.map((role) => [role, 0]));
    let opaquePixels = 0;

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const sourceOffset = ((top + y) * sourceWidth + left + x) * 4;
            const destinationOffset = (y * size + x) * 4;
            if (source[sourceOffset + 3] < ALPHA_THRESHOLD) continue;
            const role = pickRole(roleData, sourceOffset);
            const palette = PALETTES[role];
            const shade = palette[Math.min(palette.length - 1, Math.floor(luminance(source, sourceOffset) * palette.length / 256))];
            data[destinationOffset] = shade[0];
            data[destinationOffset + 1] = shade[1];
            data[destinationOffset + 2] = shade[2];
            data[destinationOffset + 3] = 255;
            silhouette[y * size + x] = 1;
            roleCounts[role] += 1;
            opaquePixels += 1;
        }
    }

    addOutline(data, silhouette);
    return { data, qa: { opaquePixels, rolePixels: roleCounts, contactShadowPixels: 0 } };
}

function pickRole(roleData, sourceOffset) {
    for (const role of ROLE_NAMES) {
        if (roleData[role][sourceOffset + 3] >= 128) return role;
    }
    return 'body';
}

function addOutline(data, silhouette) {
    const size = TARGET_CELL_SIZE;
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const index = y * size + x;
            if (silhouette[index]) continue;
            let neighbor = false;
            for (let dy = -1; dy <= 1 && !neighbor; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && silhouette[ny * size + nx]) { neighbor = true; break; }
                }
            }
            if (!neighbor) continue;
            const offset = index * 4;
            data[offset] = PALETTES.outline[0][0];
            data[offset + 1] = PALETTES.outline[0][1];
            data[offset + 2] = PALETTES.outline[0][2];
            data[offset + 3] = 255;
        }
    }
}

function luminance(data, offset) { return Math.round(data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722); }
function blit(source, destination, destinationWidth, left, top) {
    for (let y = 0; y < TARGET_CELL_SIZE; y += 1) source.copy(destination, ((top + y) * destinationWidth + left) * 4, y * TARGET_CELL_SIZE * 4, (y + 1) * TARGET_CELL_SIZE * 4);
}
function countOpaque(data, width, left, top) {
    let count = 0;
    for (let y = 0; y < TARGET_CELL_SIZE; y += 1) for (let x = 0; x < TARGET_CELL_SIZE; x += 1) if (data[((top + y) * width + left + x) * 4 + 3] !== 0) count += 1;
    return count;
}
function makeCheckerPreview(source, width, height) {
    const preview = Buffer.from(source);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        if (preview[offset + 3] !== 0) continue;
        const shade = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 29 : 37;
        preview[offset] = shade; preview[offset + 1] = shade + 2; preview[offset + 2] = shade + 5; preview[offset + 3] = 255;
    }
    return preview;
}
async function writePng(data, width, height, outputPath) { await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outputPath); }
function relative(filePath) { return path.relative(projectRoot, filePath); }
