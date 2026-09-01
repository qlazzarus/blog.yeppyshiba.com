import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.resolve(projectRoot, 'assets/vehicles/source/manifests/real-vehicle-7way-candidates.json');
const poseManifestPath = 'assets/vehicles/generated/7way-candidates/_shared/phaser-rear-7way-pose-plan.json';
const config = { edgeVirtualTimeBudgetMs: 8_000, vehicle: null };

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicle = next;
        index += 1;
    } else if (arg === '--edge-virtual-time-budget-ms' && next) {
        config.edgeVirtualTimeBudgetMs = parsePositiveNumber(arg, next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const vehicles = config.vehicle
    ? manifest.vehicles.filter((vehicle) => vehicle.publicId === config.vehicle)
    : manifest.vehicles;

if (vehicles.length === 0) {
    throw new Error(`Unknown --vehicle value: ${config.vehicle}. Expected raven-coupe, seorin-gt, or mirae-gt.`);
}

for (const vehicle of vehicles) {
    const output = `assets/vehicles/generated/7way-candidates/${vehicle.publicId}/masks/wheel-geometry.png`;
    const args = [
        'scripts/render-vehicle-pose-sheet.mjs',
        '--model', `wheel-role-${vehicle.publicId}`,
        '--model-path', `assets/vehicles/derived/wheel-role-${vehicle.publicId}.glb`,
        '--camera-reference-model-path', vehicle.modelPath,
        '--depth-occluder-model-path', `assets/vehicles/derived/wheel-occluder-${vehicle.publicId}.glb`,
        '--vehicle-id', vehicle.publicId,
        '--scale-mode', manifest.scaleMode,
        '--vehicle-length-m', String(vehicle.lengthM),
        '--reference-length-m', String(manifest.referenceLengthM),
        '--reference-length-units', String(manifest.referenceLengthUnits),
        '--frame-size-units', String(manifest.frameSizeUnits),
        '--padding', String(manifest.padding),
        '--cell-size', String(manifest.cellSize),
        '--pose-manifest', poseManifestPath,
        '--edge-virtual-time-budget-ms', String(config.edgeVirtualTimeBudgetMs),
        '--silhouette',
        '--output', output,
    ];
    appendOptionalNumber(args, '--model-pitch-offset', vehicle.modelPitchOffsetDeg);
    appendOptionalNumber(args, '--model-yaw-offset', vehicle.modelYawOffsetDeg);
    appendOptionalNumber(args, '--model-roll-offset', vehicle.modelRollOffsetDeg);
    appendOptionalNumber(args, '--model-scale-x', vehicle.modelScaleX);
    appendOptionalNumber(args, '--model-scale-y', vehicle.modelScaleY);
    appendOptionalNumber(args, '--model-scale-z', vehicle.modelScaleZ);

    console.log(`Rendering geometry wheel role sheet: ${vehicle.publicId}`);
    await runNode(args);
}

function appendOptionalNumber(args, option, value) {
    if (value !== undefined && value !== null) args.push(option, String(value));
}

function parsePositiveNumber(option, value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid ${option} value: ${value}`);
    return parsed;
}

function runNode(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' });
        child.on('error', reject);
        child.on('exit', (code) => code === 0
            ? resolve()
            : reject(new Error(`Command failed with exit code ${code}: ${process.execPath} ${args.join(' ')}`)));
    });
}
