// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { legacyTagRedirects } from './src/config/legacyTagRedirects.ts';

const site = 'https://blog.yeppyshiba.com';
const legacyTagRedirectUrls = new Set(
    legacyTagRedirects.map((redirect) => new URL(redirect.from, site).toString()),
);

const gameAssetContentTypes = {
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

function playGameAssetsDevServer() {
    return {
        name: 'play-game-assets-dev-server',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (!req.url) {
                    next();
                    return;
                }

                const url = new URL(req.url, 'http://localhost');
                const match = /^\/play\/([a-z0-9-]+)\/assets\/(.+)$/u.exec(
                    decodeURIComponent(url.pathname).replace(/\/+$/, ''),
                );

                if (!match) {
                    next();
                    return;
                }

                const [, slug, assetPath] = match;

                if (!isSafeGameAssetPath(assetPath)) {
                    next();
                    return;
                }

                const rootDir = process.cwd();
                const candidates = [
                    path.join(rootDir, 'public', 'game-assets', slug, assetPath),
                    path.join(rootDir, 'games', slug, 'dist', assetPath),
                    path.join(rootDir, 'games', slug, 'assets', assetPath),
                ];

                for (const candidate of candidates) {
                    const asset = await readFile(candidate).catch(() => null);

                    if (!asset) continue;

                    res.statusCode = 200;
                    res.setHeader(
                        'Content-Type',
                        gameAssetContentTypes[path.extname(assetPath).toLowerCase()] ??
                            'application/octet-stream',
                    );
                    res.setHeader('Cache-Control', 'no-cache');
                    res.end(asset);
                    return;
                }

                next();
            });
        },
    };
}

function isSafeGameAssetPath(value) {
    if (!value) return false;
    if (value.includes('\\')) return false;
    if (value.includes('..')) return false;
    if (value.startsWith('/')) return false;

    return /^[a-zA-Z0-9._\-/]+$/u.test(value);
}

// https://astro.build/config
export default defineConfig({
    site,
    trailingSlash: 'always',
    integrations: [
        mdx(),
        sitemap({
            filter: (page) => !legacyTagRedirectUrls.has(page),
        }),
    ],
    vite: {
        plugins: [playGameAssetsDevServer(), tailwindcss()],
    },
});
