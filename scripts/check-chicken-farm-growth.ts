import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

type GrowthSnapshot = {
    readonly jobs: { readonly hatch: readonly unknown[]; readonly production: readonly unknown[] };
    readonly lastRejectionReason: null;
    readonly ownerPlayerId: number;
    readonly research: {
        readonly levels: readonly unknown[];
        readonly queued: readonly unknown[];
        readonly supportedIds: readonly string[];
    };
    readonly runId: number;
    readonly supply: { readonly available: number; readonly cap: number; readonly reserved: number; readonly used: number };
    readonly tech: { readonly completeBuildingIds: readonly string[]; readonly completeBuildingTemplateIds: readonly string[] };
    readonly upgrades: readonly unknown[];
    readonly wallet: { readonly gold: number; readonly lumber: number };
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4240 + (process.pid % 500);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const growthCase = process.env.CHICKEN_FARM_GROWTH_CASE ?? 'baseline';
const artifactPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    growthCase === 'baseline' ? 'growth_check_baseline.json' : `growth_check_${growthCase}.json`,
);

if (growthCase !== 'baseline') {
    throw new Error(`Unsupported CHICKEN_FARM_GROWTH_CASE: ${growthCase}`);
}

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = await runBaseline();
        await mkdir(path.dirname(artifactPath), { recursive: true });
        await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(JSON.stringify({ ...report, artifactPath }, null, 2));
    } finally {
        await stopServer(server);
    }
}

function startDevServer() {
    const viteBin = path.join(rootDir, 'node_modules/.bin/vite');
    const server = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
        cwd: path.join(rootDir, 'games/chicken-farm'),
        env: {
            ...process.env,
            VITE_CHICKEN_FARM_COMBAT_POC: 'false',
            VITE_CHICKEN_FARM_COMBAT_SMOKE: 'false',
            VITE_CHICKEN_FARM_DEBUG_ECONOMY: 'false',
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: 'false',
            VITE_CHICKEN_FARM_START_ID: '3',
            VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG: 'false',
        },
    });
    server.stderr.on('data', (data) => process.stderr.write(String(data)));
    return server;
}

async function runBaseline() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => {
        if (message.type() === 'error') errors.console.push(message.text());
    });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) =>
        errors.request.push(`${failed.method()} ${failed.url()} ${failed.failure()?.errorText}`),
    );
    page.on('response', (response) => {
        if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`);
    });
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const first = await getGrowthSnapshot(page);
        const second = await getGrowthSnapshot(page);
        assert.deepEqual(second, first, 'growth snapshot is read-only at normal baseline');
        assert.equal(first.ownerPlayerId, 3, 'active single-player owner only');
        assert.deepEqual(first.wallet, { gold: 1500, lumber: 0 }, 'normal wallet');
        assert.deepEqual(first.supply, { available: 3, cap: 3, reserved: 0, used: 0 }, 'normal supply');
        assert.deepEqual(first.tech.completeBuildingIds, [], 'normal has no complete player building');
        assert.deepEqual(first.jobs, { hatch: [], production: [] }, 'normal has no growth job');
        assert.deepEqual(first.upgrades, [], 'normal has no upgrade');
        assert.deepEqual(first.research.levels, [], 'normal has no research level');
        assert.deepEqual(first.research.queued, [], 'normal has no queued research');
        assert.equal(first.lastRejectionReason, null, 'no stale rejection reason');
        const foreignOwner = await page.evaluate(() => window.__chickenFarmDebug?.getGrowthSnapshot(4) ?? null);
        assert.equal(foreignOwner, null, 'foreign owner growth state is not exposed');
        const state = await page.evaluate(() => window.__chickenFarmDebug?.getState() ?? null);
        assert.equal(state?.debugPoc.fixturesEnabled, false, 'normal browser has no debug fixtures');
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }
        return {
            case: 'baseline',
            checks: {
                foreignOwnerHidden: true,
                normalFixtureIsolation: true,
                pass: true,
                snapshotReadOnly: true,
            },
            errors,
            executionProfile: {
                combatPoc: false,
                debugEconomy: false,
                debugFixtures: false,
                startId: 3,
                terrainPathingDebug: false,
            },
            snapshot: first,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function getGrowthSnapshot(page: import('playwright').Page): Promise<GrowthSnapshot> {
    const snapshot = await page.evaluate(() => window.__chickenFarmDebug?.getGrowthSnapshot() ?? null);
    assert.ok(snapshot, 'growth debug snapshot is available');
    return snapshot as GrowthSnapshot;
}

async function waitForHttp(url: string, timeoutMs: number) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const available = await new Promise<boolean>((resolve) => {
            const probe = request(url, (response) => {
                response.resume();
                resolve(response.statusCode !== undefined && response.statusCode < 500);
            });
            probe.once('error', () => resolve(false));
            probe.end();
        });
        if (available) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer(server: ChildProcessWithoutNullStreams) {
    if (server.exitCode !== null || server.signalCode !== null) return;
    server.kill('SIGTERM');
    await Promise.race([
        once(server, 'exit'),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
}

void main();
