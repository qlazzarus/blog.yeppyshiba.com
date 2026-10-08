import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 5900 + (process.pid % 300);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const waveCase = process.env.CHICKEN_FARM_WAVE_CASE ?? 'baseline';

if (waveCase !== 'baseline' && waveCase !== 'first_spawn' && waveCase !== 'replenish') {
    throw new Error(`Unsupported CHICKEN_FARM_WAVE_CASE: ${waveCase}`);
}

const artifactPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    waveCase === 'replenish'
        ? 'wave_check_runtime_replenish.json'
        : `wave_check_${waveCase}.json`,
);

type WaveSnapshot = ReturnType<NonNullable<Window['__chickenFarmDebug']>['getWaveSnapshot']>;

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = waveCase === 'baseline'
            ? await runBaseline()
            : waveCase === 'first_spawn'
                ? await runFirstSpawn()
                : await runReplenish();
        await mkdir(path.dirname(artifactPath), { recursive: true });
        await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
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
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: waveCase === 'baseline' ? 'false' : 'true',
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
        const { first, second, state, combat } = await page.evaluate(() => ({
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            first: window.__chickenFarmDebug!.getWaveSnapshot(),
            second: window.__chickenFarmDebug!.getWaveSnapshot(),
            state: window.__chickenFarmDebug!.getState(),
        }));
        assertBaseline(first, second, state, combat.enemies.length);
        assertNoErrors(errors);
        return {
            case: 'baseline',
            checks: {
                normalP3FixtureCountZero: true,
                pass: true,
                snapshotReadOnly: true,
                waveEnemyCountZero: true,
                waveSchedulerEnabled: true,
            },
            errors,
            executionProfile: {
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

async function runFirstSpawn() {
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
        const setup = await page.evaluate(() => ({
            accepted: window.__chickenFarmDebug!.setWaveTargetQuantityForTest(1, 1),
            beforeBoundary: window.__chickenFarmDebug!.advanceWaveForTest(119.999),
            beforeSnapshot: window.__chickenFarmDebug!.getWaveSnapshot(),
            atBoundary: window.__chickenFarmDebug!.advanceWaveForTest(120),
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            wave: window.__chickenFarmDebug!.getWaveSnapshot(),
        }));
        assertFirstSpawn(setup);
        assertNoErrors(errors);
        return {
            case: 'first_spawn',
            checks: {
                actualRuntimeRegistryEntry: true,
                pass: true,
                productionWaveTickPath: true,
                spawnBeforeBoundaryZero: true,
                spawnMetadataMatchesOwnerTierAndRect: true,
            },
            errors,
            executionProfile: {
                debugFixtures: true,
                startId: 3,
                targetOverride: { quantity: 1, tier: 1 },
            },
            snapshot: setup.wave,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runReplenish() {
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
        const snapshot = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120)) {
                return null;
            }
            const initial = debug.getWaveSnapshot();
            const initialId = initial.waveManagedEnemyIds[0];
            if (!initialId) return null;
            const killed = debug.damageWaveEnemyForTest(initialId, 10_000);
            const afterDeath = debug.getCombatLifecycleSnapshot();
            const deathReplenished = debug.advanceWaveForTest(120.2);
            const afterDeathReplenish = debug.getWaveSnapshot();
            const deathReplacementId = afterDeathReplenish.waveManagedEnemyIds[0];
            if (!deathReplacementId) return null;
            const removed = debug.removeCombatEnemyFixture(deathReplacementId);
            const duplicateRemove = debug.removeCombatEnemyFixture(deathReplacementId);
            const directRemoveReplenished = debug.advanceWaveForTest(120.4);
            const afterDirectRemoveReplenish = debug.getWaveSnapshot();
            const directReplacementId = afterDirectRemoveReplenish.waveManagedEnemyIds[0];
            if (!directReplacementId) return null;
            const phaseTransitioned = debug.advanceWaveForTest(600);
            return {
                afterDeath,
                afterDeathReplenish,
                afterDirectRemoveReplenish,
                afterPhaseTransition: debug.getWaveSnapshot(),
                combatAfterPhaseTransition: debug.getCombatLifecycleSnapshot(),
                deathReplenished,
                directRemoveReplenished,
                duplicateRemove,
                initial,
                killed,
                phaseTransitioned,
                removed,
            };
        });
        assertReplenish(snapshot);
        assertNoErrors(errors);
        return {
            case: 'replenish',
            checks: {
                actualCombatDeathReplenishesOnNextDue: true,
                duplicateDirectRemoveDoesNotCreateNegativeCount: true,
                pass: true,
                phaseExitKeepsExistingLiveEnemy: true,
            },
            errors,
            executionProfile: {
                debugFixtures: true,
                startId: 3,
                targetOverride: { quantity: 1, tier: 1 },
            },
            snapshot,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function assertBaseline(
    first: WaveSnapshot,
    second: WaveSnapshot,
    state: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getState']>,
    runtimeEnemyCount: number,
) {
    if (first.schedulerStatus !== 'enabled' || first.currentPhaseAtSec !== null || first.nextPhaseAtSec !== 120) {
        throw new Error(`Wave baseline scheduler is invalid: ${JSON.stringify(first)}`);
    }
    if (first.waveManagedEnemyIds.length !== 0 || first.activeTierTargets.length !== 0 || runtimeEnemyCount !== 0) {
        throw new Error(`Wave baseline contains natural or fixture enemies: ${JSON.stringify({ first, runtimeEnemyCount })}`);
    }
    if (state.debugPoc.fixturesEnabled || state.debugPoc.combatActive) {
        throw new Error(`Wave baseline enabled a debug fixture profile: ${JSON.stringify(state.debugPoc)}`);
    }
    if (JSON.stringify(first) !== JSON.stringify(second)) {
        throw new Error(`Wave snapshot changed state: ${JSON.stringify({ first, second })}`);
    }
}

function assertFirstSpawn(snapshot: {
    readonly accepted: boolean;
    readonly atBoundary: boolean;
    readonly beforeBoundary: boolean;
    readonly beforeSnapshot: WaveSnapshot;
    readonly combat: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;
    readonly wave: WaveSnapshot;
}) {
    if (!snapshot.accepted || !snapshot.beforeBoundary || !snapshot.atBoundary) {
        throw new Error(`Wave test clock setup failed: ${JSON.stringify(snapshot)}`);
    }
    if (snapshot.beforeSnapshot.waveManagedEnemies.length !== 0) {
        throw new Error(`Wave spawned before the 120-second boundary: ${JSON.stringify(snapshot.beforeSnapshot)}`);
    }
    const enemy = snapshot.wave.waveManagedEnemies[0];
    if (
        snapshot.wave.schedulerStatus !== 'enabled' ||
        snapshot.wave.currentPhaseAtSec !== 120 ||
        snapshot.wave.waveManagedEnemies.length !== 1 ||
        !enemy ||
        enemy.tier !== 1 ||
        enemy.enemyId !== 'timber_wolf' ||
        enemy.ownerPlayerId !== 10 ||
        enemy.spawnedAtSec !== 120 ||
        !enemy.sourceRectId.startsWith('wolf_spawn_rect_') ||
        !Number.isFinite(enemy.spawnX) ||
        !Number.isFinite(enemy.spawnY)
    ) {
        throw new Error(`Wave first spawn metadata is invalid: ${JSON.stringify(snapshot.wave)}`);
    }
    if (
        snapshot.combat.enemies.length !== 1 ||
        snapshot.combat.enemies[0]?.id !== enemy.id ||
        snapshot.combat.enemies[0]?.ownerPlayerId !== 10 ||
        snapshot.combat.enemies[0]?.enemyId !== 'timber_wolf'
    ) {
        throw new Error(`Wave first spawn is missing from runtime combat registry: ${JSON.stringify(snapshot.combat.enemies)}`);
    }
}

function assertReplenish(snapshot: {
    readonly afterDeath: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;
    readonly afterDeathReplenish: WaveSnapshot;
    readonly afterDirectRemoveReplenish: WaveSnapshot;
    readonly afterPhaseTransition: WaveSnapshot;
    readonly combatAfterPhaseTransition: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;
    readonly deathReplenished: boolean;
    readonly directRemoveReplenished: boolean;
    readonly duplicateRemove: boolean;
    readonly initial: WaveSnapshot;
    readonly killed: boolean;
    readonly phaseTransitioned: boolean;
    readonly removed: boolean;
} | null) {
    if (!snapshot || !snapshot.killed || !snapshot.deathReplenished || !snapshot.removed || snapshot.duplicateRemove || !snapshot.directRemoveReplenished || !snapshot.phaseTransitioned) {
        throw new Error(`Wave replenish lifecycle setup failed: ${JSON.stringify(snapshot)}`);
    }
    const initialId = snapshot.initial.waveManagedEnemyIds[0];
    const deathReplacementId = snapshot.afterDeathReplenish.waveManagedEnemyIds[0];
    const directReplacementId = snapshot.afterDirectRemoveReplenish.waveManagedEnemyIds[0];
    if (
        snapshot.initial.waveManagedEnemies.length !== 1 ||
        snapshot.afterDeath.enemies.length !== 0 ||
        snapshot.afterDeathReplenish.waveManagedEnemies.length !== 1 ||
        snapshot.afterDirectRemoveReplenish.waveManagedEnemies.length !== 1 ||
        !initialId ||
        !deathReplacementId ||
        !directReplacementId ||
        initialId === deathReplacementId ||
        deathReplacementId === directReplacementId
    ) {
        throw new Error(`Wave death/remove did not produce one distinct live replacement: ${JSON.stringify(snapshot)}`);
    }
    const retained = snapshot.afterPhaseTransition.waveManagedEnemies[0];
    if (
        snapshot.afterPhaseTransition.activeTierTargets.some((target) => target.tier === 1) ||
        snapshot.afterPhaseTransition.waveManagedEnemies.length !== 1 ||
        retained?.id !== directReplacementId ||
        retained.tier !== 1 ||
        retained.ownerPlayerId !== 10 ||
        snapshot.combatAfterPhaseTransition.enemies.length !== 1 ||
        snapshot.combatAfterPhaseTransition.enemies[0]?.id !== directReplacementId
    ) {
        throw new Error(`Wave phase transition removed or confused an existing enemy: ${JSON.stringify(snapshot)}`);
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
