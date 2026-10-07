import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 5200 + (process.pid % 700);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const combatCase = process.env.CHICKEN_FARM_COMBAT_CASE ?? 'baseline';

if (combatCase !== 'baseline' && combatCase !== 'runtime' && combatCase !== 'all') {
    throw new Error(`Unsupported CHICKEN_FARM_COMBAT_CASE: ${combatCase}`);
}

const artifactPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    combatCase === 'baseline'
        ? 'combat_check_baseline.json'
        : combatCase === 'runtime'
          ? 'combat_check_runtime.json'
          : 'combat_check_all.json',
);

type CombatSnapshot = ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;

async function main() {
    const report =
        combatCase === 'baseline'
            ? await runWithServer(false, runBaseline)
            : combatCase === 'runtime'
              ? await runWithServer(true, runRuntimeCase)
              : {
                    case: combatCase,
                    checks: { pass: true },
                    baseline: await runWithServer(false, runBaseline),
                    runtime: await runWithServer(true, runRuntimeCase),
                };
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ...report, artifactPath }, null, 2));
}

async function runWithServer<T>(debugFixtures: boolean, run: () => Promise<T>) {
    const server = startDevServer(debugFixtures);
    try {
        await waitForHttp(baseUrl, 30_000);
        return await run();
    } finally {
        await stopServer(server);
    }
}

function startDevServer(debugFixtures: boolean) {
    const viteBin = path.join(rootDir, 'node_modules/.bin/vite');
    const server = spawn(viteBin, ['--host', host, '--port', String(port), '--strictPort'], {
        cwd: path.join(rootDir, 'games/chicken-farm'),
        env: {
            ...process.env,
            VITE_CHICKEN_FARM_COMBAT_POC: 'false',
            VITE_CHICKEN_FARM_COMBAT_SMOKE: 'false',
            VITE_CHICKEN_FARM_DEBUG_ECONOMY: 'false',
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: debugFixtures ? 'true' : 'false',
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
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const first = await getCombatSnapshot(page);
        const second = await getCombatSnapshot(page);
        assertBaseline(first, second);
        assertNoErrors(errors);
        return {
            case: 'baseline',
            checks: {
                normalFixtureIsolation: true,
                pass: true,
                snapshotReadOnly: true,
            },
            errors,
            executionProfile: {
                combatPoc: false,
                combatSmoke: false,
                debugFixtures: false,
                startId: 3,
            },
            snapshot: first,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runRuntimeCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const before = await getCombatSnapshot(page);
        const created = await page.evaluate(
            () => window.__chickenFarmDebug!.createCombatEnemyFixture('runtime-wolf-1', 'timber_wolf', 4160, 8896),
        );
        if (!created) throw new Error('Failed to create runtime enemy fixture');
        const duplicateCreated = await page.evaluate(
            () => window.__chickenFarmDebug!.createCombatEnemyFixture('runtime-wolf-1', 'timber_wolf', 4160, 8896),
        );
        if (duplicateCreated) throw new Error('Duplicate runtime enemy ID was accepted');
        const createdSnapshot = await getCombatSnapshot(page);
        const enemy = createdSnapshot.enemies.find((candidate) => candidate.id === 'runtime-wolf-1');
        if (
            !enemy ||
            enemy.enemyId !== 'timber_wolf' ||
            enemy.ownerPlayerId !== 10 ||
            enemy.spawnX !== 4160 ||
            enemy.spawnY !== 8896
        ) {
            throw new Error(`Runtime enemy snapshot mismatch: ${JSON.stringify(createdSnapshot)}`);
        }
        if (createdSnapshot.poc !== null || createdSnapshot.buildings.length !== before.buildings.length) {
            throw new Error(`Runtime fixture created PoC buildings: ${JSON.stringify(createdSnapshot)}`);
        }
        const removed = await page.evaluate(
            () => window.__chickenFarmDebug!.removeCombatEnemyFixture('runtime-wolf-1'),
        );
        if (!removed) throw new Error('Failed to remove runtime enemy fixture');
        const removedSnapshot = await getCombatSnapshot(page);
        if (removedSnapshot.enemies.some((candidate) => candidate.id === 'runtime-wolf-1')) {
            throw new Error(`Removed runtime enemy remained queryable: ${JSON.stringify(removedSnapshot)}`);
        }
        assertNoErrors(errors);
        return {
            case: 'runtime',
            checks: { duplicateIdRejected: true, pass: true, removedNotQueryable: true },
            errors,
            executionProfile: { combatPoc: false, combatSmoke: false, debugFixtures: true, startId: 3 },
            snapshots: { before, created: createdSnapshot, removed: removedSnapshot },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function assertBaseline(first: CombatSnapshot, second: CombatSnapshot) {
    if (first.active || first.poc !== null) {
        throw new Error(`Normal baseline created combat PoC state: ${JSON.stringify(first)}`);
    }
    if (first.buildings.length !== 0 || first.chickens.length !== 0) {
        throw new Error(`Normal baseline contains combat fixture targets: ${JSON.stringify(first)}`);
    }
    if (first.units.length !== 2 || !first.units.some((unit) => unit.id === 'p3-farmer') || !first.units.some((unit) => unit.id === 'p3-dog')) {
        throw new Error(`Normal P3 combat targets are missing: ${JSON.stringify(first.units)}`);
    }
    if (first.units.some((unit) => unit.hp !== unit.maxHp || unit.currentCommandType !== null || unit.commandQueueCount !== 0)) {
        throw new Error(`Normal baseline unit state is not idle/full HP: ${JSON.stringify(first.units)}`);
    }
    const stableFirst = { ...first, elapsedSec: 0 };
    const stableSecond = { ...second, elapsedSec: 0 };
    if (JSON.stringify(stableFirst) !== JSON.stringify(stableSecond)) {
        throw new Error(`Combat snapshot changed state: ${JSON.stringify({ first, second })}`);
    }
}

function createErrorCollector(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
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
    return errors;
}

function assertNoErrors(errors: { readonly console: readonly string[]; readonly page: readonly string[]; readonly request: readonly string[]; readonly response: readonly string[] }) {
    if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
        throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
    }
}

async function getCombatSnapshot(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
): Promise<CombatSnapshot> {
    return page.evaluate(() => window.__chickenFarmDebug!.getCombatLifecycleSnapshot());
}

function waitForHttp(url: string, timeoutMs: number) {
    const startedAt = Date.now();
    return new Promise<void>((resolve, reject) => {
        const poll = () => {
            const req = request(url, (response) => {
                response.resume();
                if (response.statusCode && response.statusCode < 500) return resolve();
                retry();
            });
            req.on('error', retry);
            req.end();
        };
        const retry = () => {
            if (Date.now() - startedAt >= timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
            setTimeout(poll, 250);
        };
        poll();
    });
}

async function stopServer(server: ChildProcessWithoutNullStreams) {
    if (server.exitCode !== null || server.killed) return;
    server.kill('SIGTERM');
    await once(server, 'exit');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
