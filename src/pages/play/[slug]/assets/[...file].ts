import { readFile, readdir } from 'node:fs/promises';
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
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
};

const allowedAssetRoots = ['assets', 'tilemaps', 'tilesets'] as const;

export async function getStaticPaths() {
    const gameAssetPaths = await findGameAssetPaths();

    return gameAssetPaths.map((params) => ({
        params,
    }));
}

export async function GET({ params }: { params: Partial<GameAssetPath> }) {
    const slug = params.slug;
    const file = normalizeRouteFile(params.file);

    if (!isSafeSlug(slug) || !file || !isSafeAssetPath(file)) {
        return new Response('Not found', { status: 404 });
    }

    const asset = await readGameAsset(slug, file);
    if (!asset) {
        return new Response('Not found', { status: 404 });
    }

    return new Response(asset, {
        headers: {
            'Content-Type': getContentType(file),
            'Cache-Control': 'public, max-age=31536000, immutable',
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

    const baseDirs = [
        path.join(rootDir, 'public', 'game-assets', slug),
        path.join(rootDir, 'games', slug, 'dist'),
    ];

    const files = new Set<string>();

    for (const baseDir of baseDirs) {
        for (const assetRoot of allowedAssetRoots) {
            await collectFiles(path.join(baseDir, assetRoot), assetRoot, files);
        }
    }

    return [...files];
}

async function collectFiles(
    absoluteDir: string,
    relativeDir: string,
    files: Set<string>,
) {
    const entries = await readdir(absoluteDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
        const absolutePath = path.join(absoluteDir, entry.name);
        const relativePath = path.posix.join(relativeDir, entry.name);

        if (entry.isDirectory()) {
            await collectFiles(absolutePath, relativePath, files);
            continue;
        }

        if (entry.isFile()) {
            files.add(relativePath);
        }
    }
}

async function readGameAsset(slug: string, file: string) {
    const rootDir = process.cwd();

    const candidates = [
        path.join(rootDir, 'public', 'game-assets', slug, file),
        path.join(rootDir, 'games', slug, 'dist', file),
    ];

    for (const candidate of candidates) {
        const asset = await readFile(candidate).catch(() => null);
        if (asset) return asset;
    }

    return null;
}

function normalizeRouteFile(file: string | undefined) {
    if (!file) return null;

    // 혹시 trailing slash로 들어온 경우 방어
    return file.replace(/\/+$/, '');
}

function getContentType(file: string) {
    return contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function isSafeSlug(value: string | undefined): value is string {
    return Boolean(value && /^[a-z0-9-]+$/.test(value));
}

function isSafeAssetPath(value: string) {
    if (!value) return false;
    if (value.includes('\\')) return false;
    if (value.includes('..')) return false;
    if (value.startsWith('/')) return false;

    const firstSegment = value.split('/')[0];

    if (
        !allowedAssetRoots.includes(firstSegment as (typeof allowedAssetRoots)[number])
    ) {
        return false;
    }

    return /^[a-zA-Z0-9._\-/]+$/.test(value);
}
