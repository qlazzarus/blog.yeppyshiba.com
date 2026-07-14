// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { legacyTagRedirects } from './src/config/legacyTagRedirects.ts';

const site = 'https://blog.yeppyshiba.com';
const legacyTagRedirectUrls = new Set(
    legacyTagRedirects.map((redirect) => new URL(redirect.from, site).toString()),
);
const articleLastmodByPath = await getArticleLastmodByPath();

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

async function getArticleLastmodByPath() {
    const contentsDir = path.join(process.cwd(), 'contents');
    const files = await readdir(contentsDir, { recursive: true }).catch(() => []);
    const entries = await Promise.all(
        files
            .filter((file) => /\.mdx?$/u.test(file))
            .map(async (file) => {
                const content = await readFile(path.join(contentsDir, file), 'utf8');
                const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(content)?.[1] ?? '';
                const updated = readFrontmatterDate(frontmatter, 'updated');
                const published = readFrontmatterDate(frontmatter, 'date');
                const lastmod = updated ?? published;

                if (!lastmod || Number.isNaN(lastmod.getTime())) return null;

                const slug = file.replace(/\.mdx?$/u, '').split(path.sep).join('/');
                return [`/article/${slug}/`, lastmod];
            }),
    );

    return new Map(entries.filter(Boolean));
}

function readFrontmatterDate(frontmatter, field) {
    const match = new RegExp(`^${field}:\\s*[\"']?([^\"'\\r\\n]+)`, 'mu').exec(
        frontmatter,
    );

    return match ? new Date(match[1].trim()) : undefined;
}

// https://astro.build/config
export default defineConfig({
    site,
    trailingSlash: 'always',
    integrations: [
        mdx(),
        sitemap({
            // Submit canonical content and durable hubs only. Pagination, tag archives,
            // redirects, and game runtime shells are crawlable through internal links but
            // should not consume sitemap coverage in Search Console.
            filter: (page) => {
                const pathname = new URL(page).pathname;

                return (
                    !legacyTagRedirectUrls.has(page) &&
                    !pathname.startsWith('/tag/') &&
                    !pathname.startsWith('/page/') &&
                    !/^\/category\/[^/]+\/\d+\/$/u.test(pathname) &&
                    !pathname.startsWith('/rides/page/') &&
                    !/^\/rides\/[^/]+\/$/u.test(pathname) &&
                    !pathname.startsWith('/play/') &&
                    pathname !== '/trending/'
                );
            },
            // Only claim a change date when it comes from the content itself. Google
            // advises against fabricated freshness signals, so hub pages intentionally
            // omit lastmod and changefreq/priority are left unset.
            serialize: (item) => {
                const pathname = decodeURIComponent(new URL(item.url).pathname);
                const lastmod = articleLastmodByPath.get(pathname);

                return lastmod ? { ...item, lastmod } : item;
            },
        }),
    ],
    vite: {
        plugins: [playGameAssetsDevServer(), tailwindcss()],
    },
});
