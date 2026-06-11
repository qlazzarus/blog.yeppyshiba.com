import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const gamesDir = path.join(rootDir, 'games');
const assetDir = path.join(rootDir, 'public', 'game-assets');
const legacyPlayDir = path.join(rootDir, 'public', 'play');

async function main() {
    const games = await findGames();

    await rm(assetDir, { force: true, recursive: true });
    await rm(legacyPlayDir, { force: true, recursive: true });
    await mkdir(assetDir, { recursive: true });

    if (!games.length) {
        console.log('No games found.');
        return;
    }

    for (const game of games) {
        console.log(`Building ${game.name}...`);
        await run('npm', ['run', 'build', '--workspace', game.packageName]);
        await copyGameDist(game.slug);
    }
}

async function findGames() {
    const entries = await readdir(gamesDir, { withFileTypes: true }).catch(() => []);
    const games = [];

    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;

        const slug = entry.name;
        const gameDir = path.join(gamesDir, slug);
        const packagePath = path.join(gameDir, 'package.json');
        const packageJson = await readPackage(packagePath);

        if (!packageJson?.scripts?.build || !packageJson.name) continue;

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

async function copyGameDist(slug) {
    const source = path.join(gamesDir, slug, 'dist');
    const target = path.join(assetDir, slug);

    const sourceStat = await stat(source).catch(() => null);
    if (!sourceStat?.isDirectory()) {
        throw new Error(`Missing game dist directory: ${source}`);
    }

    await rm(target, { force: true, recursive: true });
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });

    console.log(
        `Copied ${path.relative(rootDir, source)} -> ${path.relative(rootDir, target)}`,
    );
}

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: rootDir,
            shell: process.platform === 'win32',
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
        });
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
