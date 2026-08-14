import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const site = 'https://blog.yeppyshiba.com';
const distDir = path.join(process.cwd(), 'dist');
const sitemapPath = path.join(distDir, 'sitemap-0.xml');

async function getFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const file = path.join(directory, entry.name);
            return entry.isDirectory() ? getFiles(file) : [file];
        }),
    );

    return files.flat();
}

function getCanonical(html) {
    return /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/iu.exec(html)?.[1];
}

function isIndexable(html) {
    const robots = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/iu.exec(html)?.[1];
    return robots?.split(',').map((value) => value.trim()).includes('index') ?? false;
}

function getArticlePath(file) {
    const relative = path.relative(distDir, file).split(path.sep).join('/');
    const match = /^article\/(.+)\/index\.html$/u.exec(relative);
    return match ? `/article/${match[1]}/` : null;
}

const failures = [];
const [sitemap, files] = await Promise.all([readFile(sitemapPath, 'utf8'), getFiles(distDir)]);
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]));

for (const url of sitemapUrls) {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/article/') && !parsed.pathname.endsWith('/')) {
        failures.push(`Sitemap article URL must end with '/': ${url}`);
    }
}

for (const file of files.filter((candidate) => candidate.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    const articlePath = getArticlePath(file);

    if (articlePath && isIndexable(html)) {
        const canonical = getCanonical(html);
        const expected = new URL(articlePath, site).toString();

        if (canonical !== expected) {
            failures.push(
                `${articlePath} must self-canonicalize to ${expected}; found ${canonical ?? 'none'}`,
            );
        }

        if (!sitemapUrls.has(expected)) {
            failures.push(`${articlePath} is indexable content but is missing from sitemap-0.xml`);
        }
    }

    for (const match of html.matchAll(/\bhref=["'](\/article\/[^"'#?]+)["']/gu)) {
        if (!match[1].endsWith('/')) {
            failures.push(`${path.relative(distDir, file)} links to non-canonical URL ${match[1]}`);
        }
    }
}

if (failures.length > 0) {
    console.error('Indexable URL verification failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log(`Verified ${sitemapUrls.size} sitemap URLs and canonical article URLs.`);
