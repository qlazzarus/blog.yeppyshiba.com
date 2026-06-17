import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

type GameAssetPath = {
    file: string;
    slug: string;
};

const contentTypes: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
};

export async function getStaticPaths() {
    const gameAssetPaths = await findGameAssetPaths();

    return gameAssetPaths.map((params) => ({
        params,
    }));
}

export async function GET({ params }: { params: Partial<GameAssetPath> }) {
    const slug = params.slug;
    const file = params.file;

    if (!isSafeSegment(slug) || !isSafeSegment(file)) {
        return new Response('Not found', { status: 404 });
    }

    const asset = await readGameAsset(slug, file);
    if (!asset) {
        return new Response('Not found', { status: 404 });
    }

    return new Response(asset, {
        headers: {
            'Content-Type': getContentType(file),
        },
    });
}

async function findGameAssetPaths() {
    const rootDir = process.cwd();
    const publicGameAssetsDir = path.join(rootDir, 'public', 'game-assets');
    const gamesDir = path.join(rootDir, 'games');
    const slugs = new Set<string>();
    const paths: GameAssetPath[] = [];

    for (const baseDir of [publicGameAssetsDir, gamesDir]) {
        const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);

        entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
            .forEach((entry) => slugs.add(entry.name));
    }

    for (const slug of slugs) {
        const files = await findAssetFiles(slug);

        files.forEach((file) => {
            paths.push({ file, slug });
        });
    }

    return paths;
}

async function findAssetFiles(slug: string) {
    const rootDir = process.cwd();
    const assetDirs = [
        path.join(rootDir, 'public', 'game-assets', slug, 'assets'),
        path.join(rootDir, 'games', slug, 'dist', 'assets'),
    ];
    const files = new Set<string>();

    for (const assetDir of assetDirs) {
        const entries = await readdir(assetDir, { withFileTypes: true }).catch(() => []);

        entries
            .filter((entry) => entry.isFile())
            .forEach((entry) => files.add(entry.name));
    }

    return [...files];
}

async function readGameAsset(slug: string, file: string) {
    const rootDir = process.cwd();
    const candidates = [
        path.join(rootDir, 'public', 'game-assets', slug, 'assets', file),
        path.join(rootDir, 'games', slug, 'dist', 'assets', file),
    ];

    for (const candidate of candidates) {
        const asset = await readFile(candidate).catch(() => null);
        if (asset) return asset;
    }

    return null;
}

function getContentType(file: string) {
    return contentTypes[path.extname(file)] ?? 'application/octet-stream';
}

function isSafeSegment(value: string | undefined): value is string {
    return Boolean(value && /^[a-zA-Z0-9._-]+$/.test(value));
}
