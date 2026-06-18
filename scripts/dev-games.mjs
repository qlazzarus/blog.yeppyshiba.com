import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const gamesDir = path.join(rootDir, 'games');
const basePort = 5174;

async function main() {
    const games = await findGames();

    if (!games.length) {
        console.log('No games found.');
        return;
    }

    console.log('Starting game dev servers...');

    const children = games.map((game, index) => {
        const port = basePort + index;
        const url = `http://localhost:${port}/game-assets/${game.slug}/`;

        console.log(`- ${game.name}: ${url}`);

        return runGameDevServer(game, port);
    });

    const stopAll = () => {
        for (const child of children) {
            if (!child.killed) child.kill('SIGTERM');
        }
    };

    process.on('SIGINT', () => {
        stopAll();
        process.exit(130);
    });

    process.on('SIGTERM', () => {
        stopAll();
        process.exit(143);
    });
}

async function findGames() {
    const entries = await readdir(gamesDir, { withFileTypes: true }).catch(() => []);
    const games = [];

    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;

        const slug = entry.name;
        const packagePath = path.join(gamesDir, slug, 'package.json');
        const packageJson = await readPackage(packagePath);

        if (!packageJson?.scripts?.dev || !packageJson.name) continue;

        games.push({
            name: packageJson.name,
            packageName: packageJson.name,
            slug,
        });
    }

    return games;
}

async function readPackage(packagePath) {
    try {
        return JSON.parse(await readFile(packagePath, 'utf8'));
    } catch {
        return null;
    }
}

function runGameDevServer(game, port) {
    const child = spawn(
        'npm',
        [
            'run',
            'dev',
            '--workspace',
            game.packageName,
            '--',
            '--strictPort',
            '--port',
            String(port),
        ],
        {
            cwd: rootDir,
            shell: process.platform === 'win32',
            stdio: 'inherit',
        },
    );

    child.on('exit', (code, signal) => {
        if (signal || code === 0) return;

        console.error(`${game.name} dev server exited with ${code}`);
        process.exitCode = code ?? 1;
    });

    return child;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
