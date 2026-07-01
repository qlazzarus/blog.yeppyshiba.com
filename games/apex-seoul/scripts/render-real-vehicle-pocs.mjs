import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.resolve(projectRoot, 'assets/vehicles/source/manifests/real-vehicle-poc.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

for (const vehicle of manifest.vehicles) {
    const args = [
        'scripts/render-vehicle-pose-sheet.mjs',
        '--model',
        vehicle.id,
        '--model-path',
        vehicle.modelPath,
        '--vehicle-id',
        vehicle.id,
        '--scale-mode',
        manifest.scaleMode,
        '--vehicle-length-m',
        String(vehicle.lengthM),
        '--reference-length-m',
        String(manifest.referenceLengthM),
        '--reference-length-units',
        String(manifest.referenceLengthUnits),
        '--frame-size-units',
        String(manifest.frameSizeUnits),
        '--padding',
        String(manifest.padding),
        '--output',
        vehicle.output,
    ];

    appendOptionalNumber(args, '--model-pitch-offset', vehicle.modelPitchOffsetDeg);
    appendOptionalNumber(args, '--model-yaw-offset', vehicle.modelYawOffsetDeg);
    appendOptionalNumber(args, '--model-roll-offset', vehicle.modelRollOffsetDeg);
    appendOptionalNumber(args, '--model-scale-x', vehicle.modelScaleX);
    appendOptionalNumber(args, '--model-scale-y', vehicle.modelScaleY);
    appendOptionalNumber(args, '--model-scale-z', vehicle.modelScaleZ);

    if (vehicle.materialOverrides) {
        args.push('--material-overrides', JSON.stringify(vehicle.materialOverrides));
    }

    console.log(`Rendering ${vehicle.id}`);
    await runNode(args);
}

function appendOptionalNumber(args, option, value) {
    if (value === undefined || value === null) {
        return;
    }

    args.push(option, String(value));
}

function runNode(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, {
            cwd: projectRoot,
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Command failed with exit code ${code}: ${process.execPath} ${args.join(' ')}`));
        });
    });
}
