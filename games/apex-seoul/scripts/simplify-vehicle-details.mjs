import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const ROLE_NAMES = ['body', 'glass', 'lamp', 'wheel', 'chrome', 'accent', 'shadow'];
let CELL_SIZE = 128;

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

if (!Number.isInteger(config.cellSize) || ![128, 192].includes(config.cellSize)) throw new Error('cell-size must be 128 or 192');
CELL_SIZE = config.cellSize;

const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : VEHICLE_IDS;
for (const vehicleId of vehicleIds) {
    if (!VEHICLE_IDS.includes(vehicleId)) throw new Error(`Unknown vehicle: ${vehicleId}`);
    await simplifyVehicle(vehicleId);
}

async function simplifyVehicle(vehicleId) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const inputDir = path.join(candidateDir, `processed/neutral-${CELL_SIZE}`);
    const inputPath = path.join(inputDir, `sheet-${CELL_SIZE}.png`);
    const inputMetadataPath = path.join(inputDir, `sheet-${CELL_SIZE}.json`);
    const outputPath = path.join(inputDir, `sheet-${CELL_SIZE}-details.png`);
    const metadataPath = path.join(inputDir, `sheet-${CELL_SIZE}-details.json`);
    const qaPath = path.join(inputDir, `sheet-${CELL_SIZE}-details.qa.json`);
    const metadata = JSON.parse(await readFile(inputMetadataPath, 'utf8'));
    const width = metadata.columns * CELL_SIZE;
    const rows = Math.max(...metadata.poses.map((pose) => pose.cell.row)) + 1;
    const height = rows * CELL_SIZE;
    const [input, roleMasks] = await Promise.all([
        sharp(inputPath).ensureAlpha().raw().toBuffer(),
        loadRoleMasks(candidateDir, width, height),
    ]);
    const output = Buffer.from(input);
    const qa = { vehicleId, input: relative(inputPath), output: relative(outputPath), alphaChangedPixels: 0, blankCellOpaquePixels: 0, poses: [] };

    for (const pose of metadata.poses) {
        const left = pose.cell.column * CELL_SIZE;
        const top = pose.cell.row * CELL_SIZE;
        const result = simplifyCell({ input, output, roleMasks, width, left, top });
        qa.poses.push({ id: pose.id, cell: pose.cell, ...result });
    }

    const occupied = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    for (let row = 0; row < rows; row += 1) for (let column = 0; column < metadata.columns; column += 1) {
        if (!occupied.has(`${column},${row}`)) qa.blankCellOpaquePixels += countOpaque(output, width, column * CELL_SIZE, row * CELL_SIZE);
    }
    if (qa.blankCellOpaquePixels !== 0) throw new Error(`${vehicleId}: detail pass changed a blank cell`);
    for (let index = 3; index < input.length; index += 4) if (input[index] !== output[index]) qa.alphaChangedPixels += 1;
    if (qa.alphaChangedPixels !== 0) throw new Error(`${vehicleId}: detail pass must not modify alpha`);

    await mkdir(inputDir, { recursive: true });
    await writePng(output, width, height, outputPath);
    await writeFile(metadataPath, `${JSON.stringify({
        ...metadata,
        output: relative(outputPath),
        source: { ...metadata.source, neutralMaster: relative(inputPath) },
        simplify: {
            alphaPolicy: 'preserve-byte-for-byte',
            detailRules: ['role-interior-mode-smoothing', 'lamp-gap-closure-at-most-2px', 'no-baked-shadow'],
        },
    }, null, 2)}\n`);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    console.log(`Simplified ${vehicleId}: ${relative(outputPath)}`);
}

async function loadRoleMasks(candidateDir, width, height) {
    const entries = await Promise.all(ROLE_NAMES.map(async (role) => {
        const data = await sharp(path.join(candidateDir, 'masks', `${role}.png`)).ensureAlpha()
            .resize(width, height, { fit: 'fill', kernel: sharp.kernel.nearest }).raw().toBuffer();
        return [role, data];
    }));
    return Object.fromEntries(entries);
}

function simplifyCell({ input, output, roleMasks, width, left, top }) {
    const roleGrid = new Array(CELL_SIZE * CELL_SIZE);
    for (let y = 0; y < CELL_SIZE; y += 1) for (let x = 0; x < CELL_SIZE; x += 1) {
        const absolute = ((top + y) * width + left + x) * 4;
        roleGrid[y * CELL_SIZE + x] = input[absolute + 3] === 0 ? null : pickRole(roleMasks, absolute);
    }

    let smoothedPixels = 0;
    for (let y = 1; y < CELL_SIZE - 1; y += 1) for (let x = 1; x < CELL_SIZE - 1; x += 1) {
        const role = roleGrid[y * CELL_SIZE + x];
        if (!['body', 'glass', 'wheel', 'accent', 'chrome'].includes(role)) continue;
        if (!hasCardinalRole(roleGrid, x, y, role)) continue;
        const colors = [];
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (roleGrid[ny * CELL_SIZE + nx] !== role) continue;
            colors.push(rgbAt(input, ((top + ny) * width + left + nx) * 4));
        }
        const mode = dominantColor(colors);
        const targetOffset = ((top + y) * width + left + x) * 4;
        if (mode && !sameRgb(input, targetOffset, mode)) {
            setRgb(output, targetOffset, mode);
            smoothedPixels += 1;
        }
    }

    // Lamp lens signatures are often single-pixel stripes or dots at 128px. Join only
    // very small same-row gaps, leaving the left/right lamp housings independent.
    let lampFillPixels = 0;
    for (let y = 0; y < CELL_SIZE; y += 1) {
        let previousLampX = null;
        for (let x = 0; x < CELL_SIZE; x += 1) {
            if (roleGrid[y * CELL_SIZE + x] !== 'lamp') continue;
            if (previousLampX !== null && x - previousLampX <= 3) {
                for (let fillX = previousLampX + 1; fillX < x; fillX += 1) {
                    const fillIndex = y * CELL_SIZE + fillX;
                    if (roleGrid[fillIndex] !== 'body') continue;
                    const offset = ((top + y) * width + left + fillX) * 4;
                    if (input[offset + 3] === 0) continue;
                    setRgb(output, offset, [191, 47, 57]);
                    lampFillPixels += 1;
                }
            }
            previousLampX = x;
        }
    }
    return { lampGapFillPixels: lampFillPixels, modeSmoothedPixels: smoothedPixels };
}

function pickRole(roleMasks, offset) {
    for (const role of ROLE_NAMES) if (roleMasks[role][offset + 3] >= 128) return role;
    return 'body';
}
function hasCardinalRole(grid, x, y, role) {
    return grid[y * CELL_SIZE + x - 1] === role && grid[y * CELL_SIZE + x + 1] === role &&
        grid[(y - 1) * CELL_SIZE + x] === role && grid[(y + 1) * CELL_SIZE + x] === role;
}
function dominantColor(colors) {
    const counts = new Map();
    for (const color of colors) {
        const key = color.join(',');
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best = null;
    for (const [key, count] of counts) if (!best || count > best.count) best = { count, color: key.split(',').map(Number) };
    return best?.color ?? null;
}
function rgbAt(data, offset) { return [data[offset], data[offset + 1], data[offset + 2]]; }
function sameRgb(data, offset, color) { return data[offset] === color[0] && data[offset + 1] === color[1] && data[offset + 2] === color[2]; }
function setRgb(data, offset, color) { data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]; }
function countOpaque(data, width, left, top) {
    let count = 0;
    for (let y = 0; y < CELL_SIZE; y += 1) for (let x = 0; x < CELL_SIZE; x += 1) if (data[((top + y) * width + left + x) * 4 + 3] !== 0) count += 1;
    return count;
}
async function writePng(data, width, height, outputPath) { await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outputPath); }
function relative(filePath) { return path.relative(projectRoot, filePath); }
