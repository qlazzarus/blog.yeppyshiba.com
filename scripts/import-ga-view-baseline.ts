import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type GaView = { path: string; totalCount: string };

const SOURCE = 'ga4';
const database = 'yeppyshiba-view-counter';
const config = 'workers/view-counter/wrangler.jsonc';
const aliases: Record<string, string> = {
    '/article/jeju-tour-review-byeoldobong': '/article/jeju-tour-review-별도봉',
    '/article/review-2023-november': '/article/a-look-back-in-november-2023',
};

function normalizeArticlePath(rawPath: string) {
    const pathWithoutQuery = rawPath.split(/[?#]/, 1)[0];
    const withLeadingSlash = pathWithoutQuery.startsWith('/')
        ? pathWithoutQuery
        : `/${pathWithoutQuery}`;
    const normalizedPath = withLeadingSlash.replace(/\/+$/, '') || '/';
    if (!/^\/article\/[^/]+$/u.test(normalizedPath)) return null;
    return aliases[normalizedPath] ?? normalizedPath;
}

function sqlString(value: string) {
    return `'${value.replaceAll("'", "''")}'`;
}

async function main() {
    const apply = process.argv.includes('--apply');
    const inputPath = path.resolve('src/data/ga-views.json');
    const input = JSON.parse(await fs.readFile(inputPath, 'utf8')) as GaView[];
    const totals = new Map<string, number>();

    for (const item of input) {
        const canonicalPath = normalizeArticlePath(item.path);
        const totalCount = Number.parseInt(item.totalCount, 10);
        if (!canonicalPath || !Number.isSafeInteger(totalCount) || totalCount < 0) continue;
        totals.set(canonicalPath, (totals.get(canonicalPath) ?? 0) + totalCount);
    }

    const now = new Date().toISOString();
    const statements = [...totals.entries()].map(
        ([canonicalPath, viewCount]) => `
INSERT INTO article_view_baselines (source, canonical_path, view_count, imported_at)
VALUES (${sqlString(SOURCE)}, ${sqlString(canonicalPath)}, ${viewCount}, ${sqlString(now)})
ON CONFLICT(source, canonical_path) DO UPDATE SET
  view_count = excluded.view_count,
  imported_at = excluded.imported_at;`,
    );
    // `wrangler d1 execute --file --remote` rejects SQL BEGIN/COMMIT blocks.
    // Every statement is idempotent, so a failed import can safely be retried.
    const sql = `${statements.join('\n')}\n`;

    console.log(`Prepared ${totals.size} GA4 baseline rows from ${inputPath}.`);
    if (!apply) {
        console.log('Dry run only. Re-run with --apply to write to the remote D1 database.');
        return;
    }

    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'yeppyshiba-ga4-baseline-'));
    const sqlPath = path.join(tempDirectory, 'baseline.sql');
    await fs.writeFile(sqlPath, sql);

    try {
        const result = spawnSync(
            'npx',
            [
                'wrangler',
                'd1',
                'execute',
                database,
                '--config',
                config,
                '--remote',
                '--file',
                sqlPath,
            ],
            { stdio: 'inherit' },
        );
        if (result.status !== 0) process.exitCode = result.status ?? 1;
    } finally {
        await fs.rm(tempDirectory, { force: true, recursive: true });
    }
}

void main();
