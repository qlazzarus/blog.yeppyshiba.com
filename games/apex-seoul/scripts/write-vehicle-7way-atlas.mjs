import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const VARIANTS = ['blue', 'red', 'silver', 'black'];

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
for (const vehicleId of vehicleIds) await writeCandidateAtlases(vehicleId, variants);

async function writeCandidateAtlases(vehicleId, requestedVariants) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const sourceAtlasPath = path.join(candidateDir, 'phaser-128.atlas.json');
    const qaPath = path.join(candidateDir, 'processed/qa/7way-atlas.qa.json');
    const [sourceAtlas, qa] = await Promise.all([
        readJson(sourceAtlasPath),
        readJson(qaPath),
    ]);
    validateQa(qa, vehicleId);
    validateSourceAtlas(sourceAtlas, vehicleId);

    for (const variant of requestedVariants) {
        const outputDir = path.join(candidateDir, 'processed', `${variant}-128`);
        const metadataPath = path.join(outputDir, 'sheet-128.json');
        const outputPath = path.join(outputDir, 'phaser-128.atlas.json');
        const metadata = await readJson(metadataPath);
        validateSheetMetadata(metadata, vehicleId, variant);
        const atlas = structuredClone(sourceAtlas);
        atlas.apex = {
            ...atlas.apex,
            candidateOnly: true,
            generatedBy: 'write-vehicle-7way-atlas.mjs',
            paletteVariant: variant,
            promotionState: 'candidate-only; do not replace current Phaser runtime atlas without runtime integration QA',
            shadowPolicy: 'Use the existing separate Phaser dynamic shadow atlas; this vehicle sheet contains no baked-in shadow.',
            sourceSheet: relative(path.join(outputDir, 'sheet-128.png')),
            sourceQa: relative(qaPath),
            vehicleId,
        };
        atlas.meta = {
            ...atlas.meta,
            app: 'apex-seoul processed 7way candidate atlas exporter',
            image: 'sheet-128.png',
            size: { h: metadata.rows * metadata.cellSize, w: metadata.columns * metadata.cellSize },
        };
        await writeFile(outputPath, `${JSON.stringify(atlas, null, 2)}\n`);
        console.log(`Candidate atlas ${vehicleId}/${variant}: ${relative(outputPath)}`);
    }
}

function validateQa(qa, vehicleId) {
    if (qa.vehicleId !== vehicleId || qa.pass !== true) throw new Error(`${vehicleId}: 5way QA must pass before writing candidate atlas`);
    for (const variant of VARIANTS) if (qa.checks?.paletteAlpha?.[variant]?.pass !== true) throw new Error(`${vehicleId}: QA missing passing palette check for ${variant}`);
}

function validateSourceAtlas(atlas, vehicleId) {
    if (atlas.apex?.vehicleId !== vehicleId || atlas.apex?.targetCellSize !== 128 || !atlas.frames || !atlas.apex?.steeringStates) {
        throw new Error(`${vehicleId}: invalid source candidate atlas`);
    }
}

function validateSheetMetadata(metadata, vehicleId, variant) {
    if (metadata.vehicleId !== vehicleId || metadata.cellSize !== 128 || metadata.columns !== 3 || metadata.rows !== 6 || metadata.palette?.name !== `${variant}-v1`) {
        throw new Error(`${vehicleId}/${variant}: invalid processed sheet metadata`);
    }
}

async function readJson(filePath) { return JSON.parse(await readFile(filePath, 'utf8')); }
function relative(filePath) { return path.relative(projectRoot, filePath); }
