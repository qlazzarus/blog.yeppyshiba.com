import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const vehicles = [
    {
        input: 'assets/vehicles/toyota_gt86.glb',
        output: 'assets/vehicles/optimized/toyota_gt86-optimized.glb',
    },
    {
        input: 'assets/vehicles/kia_stinger.glb',
        output: 'assets/vehicles/optimized/kia_stinger-optimized.glb',
    },
    {
        input: 'assets/vehicles/genesis_g70.glb',
        output: 'assets/vehicles/optimized/genesis_g70-optimized.glb',
    },
    {
        input: 'assets/vehicles/genesis_g70_nieve.glb',
        output: 'assets/vehicles/optimized/genesis_g70_nieve-optimized.glb',
    },
    {
        input: 'assets/vehicles/derived/genesis_g70_nieve-symmetric.glb',
        output: 'assets/vehicles/optimized/genesis_g70_nieve-symmetric-optimized.glb',
    },
    {
        input: 'assets/vehicles/derived/genesis_g70_nieve-sprite-master.glb',
        output: 'assets/vehicles/optimized/genesis_g70_nieve-sprite-master-optimized.glb',
    },
    {
        input: 'assets/vehicles/genesis_coupe.glb',
        output: 'assets/vehicles/optimized/genesis_coupe-optimized.glb',
    },
];

await mkdir(path.resolve(projectRoot, 'assets/vehicles/optimized'), { recursive: true });

for (const vehicle of vehicles) {
    try {
        await access(path.resolve(projectRoot, vehicle.input));
    } catch {
        console.warn(`Skipping unavailable source model: ${vehicle.input}`);
        continue;
    }
    console.log(`Optimizing ${vehicle.input}`);
    await runGltfTransform([
        'gltf-transform',
        'optimize',
        vehicle.input,
        vehicle.output,
        '--compress',
        'meshopt',
        '--texture-compress',
        'webp',
        '--texture-size',
        '1024',
    ]);
}

function runGltfTransform(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(getNpxCommand(), args, {
            cwd: projectRoot,
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Command failed with exit code ${code}: npx ${args.join(' ')}`));
        });
    });
}

function getNpxCommand() {
    return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}
