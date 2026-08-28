import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceManifestPath = path.resolve(projectRoot, 'assets/vehicles/source/manifests/real-vehicle-7way-candidates.json');
const basePosePlanPath = path.resolve(projectRoot, 'assets/vehicles/source/manifests/outrun-inspired-pose-plan.json');
const manifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
const basePosePlan = JSON.parse(await readFile(basePosePlanPath, 'utf8'));
const selectedVehicleId = readSelectedVehicleId();
const vehicles = selectedVehicleId
    ? manifest.vehicles.filter((vehicle) => vehicle.publicId === selectedVehicleId)
    : manifest.vehicles;

if (selectedVehicleId && vehicles.length === 0) {
    throw new Error(`Unknown --vehicle value: ${selectedVehicleId}`);
}

const posePlan = createPhaserSevenWayPlan(basePosePlan);
const sharedOutputDir = path.resolve(projectRoot, 'assets/vehicles/generated/7way-candidates/_shared');
const posePlanPath = path.join(sharedOutputDir, 'phaser-rear-7way-pose-plan.json');
await mkdir(sharedOutputDir, { recursive: true });
await writeFile(posePlanPath, `${JSON.stringify(posePlan, null, 2)}\n`);

for (const vehicle of vehicles) {
    const outputDir = `assets/vehicles/generated/7way-candidates/${vehicle.publicId}`;
    const sourceOutput = `${outputDir}/source-17pose-512.png`;
    const pixelOutputDir = `${outputDir}/phaser-128`;
    const args = [
        'scripts/render-vehicle-pose-sheet.mjs',
        '--model', vehicle.id,
        '--model-path', vehicle.modelPath,
        '--vehicle-id', vehicle.publicId,
        '--scale-mode', manifest.scaleMode,
        '--vehicle-length-m', String(vehicle.lengthM),
        '--reference-length-m', String(manifest.referenceLengthM),
        '--reference-length-units', String(manifest.referenceLengthUnits),
        '--frame-size-units', String(manifest.frameSizeUnits),
        '--padding', String(manifest.padding),
        '--cell-size', String(manifest.cellSize),
        '--pose-manifest', path.relative(projectRoot, posePlanPath),
        '--output', sourceOutput,
    ];

    appendOptionalNumber(args, '--model-pitch-offset', vehicle.modelPitchOffsetDeg);
    appendOptionalNumber(args, '--model-yaw-offset', vehicle.modelYawOffsetDeg);
    appendOptionalNumber(args, '--model-roll-offset', vehicle.modelRollOffsetDeg);
    appendOptionalNumber(args, '--model-scale-x', vehicle.modelScaleX);
    appendOptionalNumber(args, '--model-scale-y', vehicle.modelScaleY);
    appendOptionalNumber(args, '--model-scale-z', vehicle.modelScaleZ);
    if (vehicle.forceDoubleSided) args.push('--force-double-sided');

    console.log(`Rendering Phaser-compatible 7way candidate: ${vehicle.publicId}`);
    await runNode(args);
    await runNode([
        'scripts/pixel-pass-vehicle-sheet.mjs',
        '--input', sourceOutput,
        '--metadata', sourceOutput.replace(/\.png$/i, '.json'),
        '--output-dir', pixelOutputDir,
        '--target-cell-size', '128',
    ]);
    await writeCandidateAtlas({ outputDir, pixelOutputDir, vehicleId: vehicle.publicId });
}

function createPhaserSevenWayPlan(base) {
    const rightZero = {
        camera: [-1.0, 1.17, -5.0],
        flipXSource: null,
        id: 'steer-right-0',
        modelPitchDeg: 0,
        modelRollDeg: 0,
        modelYawDeg: 0,
        rearAngleDeg: 11,
        referenceRole: 'slight rear-quarter steer frame',
    };
    const centerIndex = base.sourcePoses.findIndex((pose) => pose.id === 'center');

    return {
        ...base,
        id: 'phaser-rear-7way-source-17pose',
        poseSelection: {
            ...base.poseSelection,
            primaryRuntimeGoal: 'seven-way steering',
        },
        sourcePoses: [
            ...base.sourcePoses.slice(0, centerIndex + 1),
            rightZero,
            ...base.sourcePoses.slice(centerIndex + 1),
        ],
        runtimeStates: [
            { id: 'steer-left-2', flipXSource: 'steer-right-2' },
            { id: 'steer-left-1', flipXSource: 'steer-right-1' },
            { id: 'steer-left-0', flipXSource: 'steer-right-0' },
            { id: 'center', flipXSource: null },
            { id: 'steer-right-0', flipXSource: null },
            { id: 'steer-right-1', flipXSource: null },
            { id: 'steer-right-2', flipXSource: null },
        ],
    };
}

async function writeCandidateAtlas({ outputDir, pixelOutputDir, vehicleId }) {
    const qaPath = path.resolve(projectRoot, pixelOutputDir, 'sheet-128.qa.json');
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    const frames = Object.fromEntries(qa.poses.map((pose) => [pose.id, {
        anchor: pose.anchor,
        baselineY: pose.baselineY,
        frame: {
            h: qa.targetCellSize,
            w: qa.targetCellSize,
            x: pose.cell.column * qa.targetCellSize,
            y: pose.cell.row * qa.targetCellSize,
        },
        origin: {
            x: pose.anchor.x / qa.targetCellSize,
            y: pose.anchor.y / qa.targetCellSize,
        },
        pose: {
            modelPitchDeg: pose.modelPitchDeg,
            modelRollDeg: pose.modelRollDeg,
            modelYawDeg: pose.modelYawDeg,
            referenceRole: pose.referenceRole,
        },
        rotated: false,
        sourceSize: { h: qa.targetCellSize, w: qa.targetCellSize },
        spriteSourceSize: { h: qa.targetCellSize, w: qa.targetCellSize, x: 0, y: 0 },
        trimmed: false,
    }]));
    const atlas = {
        apex: {
            anchorPolicy: 'Use per-frame origin for draw offset. Left steering frames reuse right steering art with flipX.',
            candidateOnly: true,
            steeringStates: {
                'steer-left-2': { flipX: true, frame: 'steer-right-2' },
                'steer-left-1': { flipX: true, frame: 'steer-right-1' },
                'steer-left-0': { flipX: true, frame: 'steer-right-0' },
                center: { flipX: false, frame: 'center' },
                'steer-right-0': { flipX: false, frame: 'steer-right-0' },
                'steer-right-1': { flipX: false, frame: 'steer-right-1' },
                'steer-right-2': { flipX: false, frame: 'steer-right-2' },
            },
            targetCellSize: qa.targetCellSize,
            vehicleId,
        },
        frames,
        meta: {
            app: 'apex-seoul Phaser-compatible 7way candidate exporter',
            format: 'RGBA8888',
            image: 'sheet-128.png',
            scale: '1',
            size: { h: qa.rows * qa.targetCellSize, w: qa.columns * qa.targetCellSize },
        },
    };
    const atlasPath = path.resolve(projectRoot, outputDir, 'phaser-128.atlas.json');
    await writeFile(atlasPath, `${JSON.stringify(atlas, null, 2)}\n`);
    console.log(`Wrote Phaser-compatible atlas: ${path.relative(projectRoot, atlasPath)}`);
}

function appendOptionalNumber(args, option, value) {
    if (value !== undefined && value !== null) args.push(option, String(value));
}

function readSelectedVehicleId() {
    const index = process.argv.indexOf('--vehicle');
    if (index === -1) return null;
    const value = process.argv[index + 1];
    if (!value) throw new Error('--vehicle requires raven-coupe, seorin-gt, or mirae-gt');
    return value;
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
