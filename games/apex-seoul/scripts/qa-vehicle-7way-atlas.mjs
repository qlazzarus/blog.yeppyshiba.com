import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const VARIANTS = ['blue', 'red', 'silver', 'black'];
const CELL_SIZE = 128;
const REQUIRED_STEERING = {
    center: { flipX: false, frame: 'center' },
    'steer-left-0': { flipX: true, frame: 'steer-right-0' },
    'steer-left-1': { flipX: true, frame: 'steer-right-1' },
    'steer-left-2': { flipX: true, frame: 'steer-right-2' },
    'steer-right-0': { flipX: false, frame: 'steer-right-0' },
    'steer-right-1': { flipX: false, frame: 'steer-right-1' },
    'steer-right-2': { flipX: false, frame: 'steer-right-2' },
};

const config = { vehicleIds: [] };
for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleIds.push(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}
const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : VEHICLE_IDS;
for (const vehicleId of vehicleIds) {
    if (!VEHICLE_IDS.includes(vehicleId)) throw new Error(`Unknown vehicle: ${vehicleId}`);
    await qaVehicle(vehicleId);
}

async function qaVehicle(vehicleId) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const neutralDir = path.join(candidateDir, 'processed/neutral-128');
    const detailPath = path.join(neutralDir, 'sheet-128-details.png');
    const metadata = JSON.parse(await readFile(path.join(neutralDir, 'sheet-128-details.json'), 'utf8'));
    const atlas = JSON.parse(await readFile(path.join(candidateDir, 'phaser-128.atlas.json'), 'utf8'));
    const qaDir = path.join(candidateDir, 'processed/qa');
    const qaPath = path.join(qaDir, '7way-atlas.qa.json');
    const contactSheetPath = path.join(qaDir, 'palette-contact-sheet.png');
    const detail = await sharp(detailPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const dimensions = { height: detail.info.height, width: detail.info.width };
    const qa = {
        vehicleId,
        source: relative(detailPath),
        dimensions,
        checks: {},
        paletteOrder: VARIANTS,
        contactSheet: relative(contactSheetPath),
        pass: false,
    };

    qa.checks.poseGrid = checkPoseGrid(metadata, dimensions);
    qa.checks.blankCell = checkBlankCell(detail.data, dimensions, metadata);
    qa.checks.anchorBaseline = checkAnchorBaseline(atlas, metadata);
    qa.checks.flipStates = checkFlipStates(atlas, metadata);
    qa.checks.paletteAlpha = {};
    const composites = [];
    for (const variant of VARIANTS) {
        const variantPath = path.join(candidateDir, 'processed', `${variant}-128`, 'sheet-128.png');
        const image = await sharp(variantPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        qa.checks.paletteAlpha[variant] = checkPaletteAlpha(detail, image, dimensions, metadata);
        const checker = makeCheckerPreview(image.data, dimensions.width, dimensions.height);
        composites.push({ input: await sharp(checker, { raw: { width: dimensions.width, height: dimensions.height, channels: 4 } }).png().toBuffer(), left: (composites.length % 2) * dimensions.width, top: Math.floor(composites.length / 2) * dimensions.height });
    }
    qa.pass = qa.checks.poseGrid.pass && qa.checks.blankCell.pass && qa.checks.anchorBaseline.pass && qa.checks.flipStates.pass &&
        Object.values(qa.checks.paletteAlpha).every((check) => check.pass);
    await mkdir(qaDir, { recursive: true });
    await sharp({ create: { width: dimensions.width * 2, height: dimensions.height * 2, channels: 4, background: '#1d232c' } }).composite(composites).png().toFile(contactSheetPath);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    if (!qa.pass) throw new Error(`${vehicleId}: 7way atlas QA failed; see ${relative(qaPath)}`);
    console.log(`QA passed ${vehicleId}: ${relative(qaPath)}`);
}

function checkPoseGrid(metadata, dimensions) {
    const expectedWidth = metadata.columns * CELL_SIZE;
    const expectedRows = 6;
    const requiredPoses = 17;
    const uniqueCells = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    const pass = metadata.cellSize === CELL_SIZE && metadata.columns === 3 && metadata.poses.length === requiredPoses &&
        uniqueCells.size === requiredPoses && dimensions.width === expectedWidth && dimensions.height === expectedRows * CELL_SIZE;
    return { pass, poseCount: metadata.poses.length, uniqueCellCount: uniqueCells.size, expected: { cellSize: CELL_SIZE, columns: 3, poses: requiredPoses, rows: expectedRows }, actual: dimensions };
}

function checkBlankCell(data, dimensions, metadata) {
    const occupied = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    let opaquePixels = 0;
    const blankCells = [];
    for (let row = 0; row < 6; row += 1) for (let column = 0; column < 3; column += 1) {
        if (occupied.has(`${column},${row}`)) continue;
        blankCells.push({ column, row });
        for (let y = 0; y < CELL_SIZE; y += 1) for (let x = 0; x < CELL_SIZE; x += 1) if (data[((row * CELL_SIZE + y) * dimensions.width + column * CELL_SIZE + x) * 4 + 3] !== 0) opaquePixels += 1;
    }
    return { pass: opaquePixels === 0 && blankCells.length === 1, blankCells, opaquePixels };
}

function checkAnchorBaseline(atlas, metadata) {
    const missingFrames = [];
    const deviations = [];
    for (const pose of metadata.poses) {
        const frame = atlas.frames[pose.id];
        if (!frame) { missingFrames.push(pose.id); continue; }
        if (!Number.isFinite(frame.anchor?.x) || !Number.isFinite(frame.anchor?.y) || !Number.isFinite(frame.baselineY)) deviations.push({ id: pose.id, reason: 'missing-anchor-or-baseline' });
        if (frame.frame.x !== pose.cell.column * CELL_SIZE || frame.frame.y !== pose.cell.row * CELL_SIZE) deviations.push({ id: pose.id, reason: 'frame-cell-mismatch' });
    }
    const normalIds = ['center', 'steer-right-0', 'steer-right-1', 'steer-right-2'];
    const normalBaselines = normalIds.map((id) => atlas.frames[id]?.baselineY).filter(Number.isFinite);
    const baselineSpread = normalBaselines.length ? Math.max(...normalBaselines) - Math.min(...normalBaselines) : Number.POSITIVE_INFINITY;
    return { pass: missingFrames.length === 0 && deviations.length === 0 && baselineSpread <= 1, missingFrames, deviations, normalBaselineSpread: baselineSpread };
}

function checkFlipStates(atlas, metadata) {
    const sourceIds = new Set(metadata.poses.map((pose) => pose.id));
    const mismatches = [];
    for (const [id, expected] of Object.entries(REQUIRED_STEERING)) {
        const actual = atlas.apex?.steeringStates?.[id];
        if (!actual || actual.frame !== expected.frame || actual.flipX !== expected.flipX || !sourceIds.has(actual.frame)) mismatches.push({ id, expected, actual: actual ?? null });
    }
    return { pass: mismatches.length === 0, mismatches };
}

function checkPaletteAlpha(detail, variant, dimensions, metadata) {
    const sizeMatches = variant.info.width === dimensions.width && variant.info.height === dimensions.height;
    let alphaMismatches = 0;
    if (sizeMatches) for (let offset = 3; offset < detail.data.length; offset += 4) if (detail.data[offset] !== variant.data[offset]) alphaMismatches += 1;
    const blank = sizeMatches ? checkBlankCell(variant.data, dimensions, metadata) : { pass: false, opaquePixels: -1 };
    return { pass: sizeMatches && alphaMismatches === 0 && blank.pass, alphaMismatches, blankCellOpaquePixels: blank.opaquePixels, dimensions: { width: variant.info.width, height: variant.info.height } };
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
function relative(filePath) { return path.relative(projectRoot, filePath); }
