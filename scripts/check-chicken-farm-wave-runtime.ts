import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { WAVE_SPAWN_MANIFEST } from '../games/chicken-farm/src/game/waveSpawnManifest';
import { WAVE_ORDINARY_ENEMY_TIERS } from '../games/chicken-farm/src/game/waveEnemyTiers';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 5900 + (process.pid % 300);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const waveCase = process.env.CHICKEN_FARM_WAVE_CASE ?? 'baseline';

if (waveCase !== 'baseline' && waveCase !== 'first_spawn' && waveCase !== 'replenish' && waveCase !== 'spawn_order' && waveCase !== 'refresh' && waveCase !== 'farm_blocker' && waveCase !== 'restart' && waveCase !== 'phases' && waveCase !== 'normal_integration') {
    throw new Error(`Unsupported CHICKEN_FARM_WAVE_CASE: ${waveCase}`);
}

const artifactPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    waveCase === 'replenish'
        ? 'wave_check_runtime_replenish.json'
        : waveCase === 'phases'
            ? 'wave_check_runtime_phases.json'
        : `wave_check_${waveCase}.json`,
);

type WaveSnapshot = ReturnType<NonNullable<Window['__chickenFarmDebug']>['getWaveSnapshot']>;

type PhaseRuntimeReport = {
    readonly final: {
        readonly combat: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;
        readonly wave: WaveSnapshot;
    };
    readonly rows: readonly {
        readonly atSec: number;
        readonly combatEnemyIds: readonly string[];
        readonly currentPhaseAtSec: number | null;
        readonly enemies: WaveSnapshot['waveManagedEnemies'];
        readonly removedIds: readonly string[];
        readonly tiers: readonly number[];
    }[];
} | null;

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = waveCase === 'baseline'
            ? await runBaseline()
            : waveCase === 'first_spawn'
                ? await runFirstSpawn()
                : waveCase === 'spawn_order' ? await runSpawnOrder()
                    : waveCase === 'refresh' ? await runRefresh()
                        : waveCase === 'farm_blocker' ? await runFarmBlocker()
                            : waveCase === 'restart' ? await runRestart()
                                : waveCase === 'phases' ? await runPhases()
                                    : waveCase === 'normal_integration' ? await runNormalIntegration() : await runReplenish();
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
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: waveCase === 'baseline' || waveCase === 'normal_integration' ? 'false' : 'true',
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

async function runNormalIntegration() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    const seed = 812;
    try {
        // This is the production random function with a recorded deterministic
        // source. It does not enable debug fixtures or alter the scheduler.
        await page.addInitScript((initialSeed) => {
            let state = initialSeed;
            Math.random = () => {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        }, seed);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(
            () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const progress: Array<{ readonly elapsedSec: number; readonly step: string }> = [];
        const log = async (step: string) => {
            progress.push({ elapsedSec: await page.evaluate(() => window.__chickenFarmDebug!.getState().elapsedSec), step });
        };
        const before = await page.evaluate(() => ({
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            economy: window.__chickenFarmDebug!.getEconomyLifecycleSnapshot(),
            state: window.__chickenFarmDebug!.getState(),
            wave: window.__chickenFarmDebug!.getWaveSnapshot(),
        }));
        if (
            before.state.runId !== 1 ||
            before.economy.wallet?.gold !== 1500 ||
            before.economy.wallet.lumber !== 0 ||
            before.wave.waveManagedEnemyIds.length !== 0 ||
            before.combat.enemies.length !== 0
        ) {
            throw new Error(`Normal P3 baseline differs before first wave: ${JSON.stringify(before)}`);
        }
        await log('normal P3 baseline: wallet and wave zero');

        const canvas = await getCanvasBounds(page);
        const farmer = await selectNormalFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 1,
            null,
            { timeout: 5_000 },
        );
        await log('actual chicken acquisition input completed');

        const farmPoint = await page.evaluate(() => {
            const candidates = [
                { x: 3584, y: 8896 }, { x: 3840, y: 8896 }, { x: 4096, y: 8896 },
                { x: 3584, y: 8640 }, { x: 3840, y: 8640 }, { x: 4096, y: 8640 },
            ];
            return candidates.find(({ x, y }) =>
                window.__chickenFarmDebug!.getConstructionPlacementPreview('farm_house', x, y)?.valid.valid,
            ) ?? null;
        });
        if (!farmPoint) throw new Error('No visible normal P3 farm-house placement point');
        await page.keyboard.press('b');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getState().commandPage === 'build', null, { timeout: 5_000 });
        await page.keyboard.press('h');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === 'farm_house',
            null,
            { timeout: 5_000 },
        );
        await clickWorld(page, farmer.calibration, farmPoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.some(
                (building) => building.templateId === 'farm_house' && building.ownerPlayerId === 3,
            ),
            null,
            { timeout: 30_000 },
        );
        const farm = await page.evaluate(() => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find(
            (building) => building.templateId === 'farm_house' && building.ownerPlayerId === 3,
        ) ?? null);
        if (!farm) throw new Error('Normal P3 farm construction did not create a building');
        await log('actual farm-house construction started');

        const preBoundary = await page.evaluate(() => ({
            elapsedSec: window.__chickenFarmDebug!.getState().elapsedSec,
            wave: window.__chickenFarmDebug!.getWaveSnapshot(),
        }));
        if (preBoundary.elapsedSec >= 120 || preBoundary.wave.waveManagedEnemyIds.length !== 0) {
            throw new Error(`Wave appeared before the natural 120 second boundary: ${JSON.stringify(preBoundary)}`);
        }
        await log('pre-120 natural wave remains zero');

        try {
            await page.waitForFunction(
                () => window.__chickenFarmDebug!.getState().elapsedSec >= 120 &&
                    window.__chickenFarmDebug!.getWaveSnapshot().waveManagedEnemyIds.length > 0,
                null,
                { timeout: 150_000 },
            );
        } catch (error) {
            throw new Error(`Timed out waiting for natural first wave: ${JSON.stringify(await page.evaluate(() => ({
                state: window.__chickenFarmDebug!.getState(),
                wave: window.__chickenFarmDebug!.getWaveSnapshot(),
            })))}`, { cause: error });
        }
        const spawned = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            const wave = debug.getWaveSnapshot();
            const id = wave.waveManagedEnemyIds[0];
            return id ? {
                behavior: debug.getRuntimeEnemyBehaviorForTest(id),
                combat: debug.getCombatLifecycleSnapshot(),
                enemy: wave.waveManagedEnemies.find((candidate) => candidate.id === id) ?? null,
                id,
                ids: [...wave.waveManagedEnemyIds],
                wave,
            } : null;
        });
        if (!spawned?.enemy || !spawned.behavior || spawned.enemy.spawnedAtSec < 120 || spawned.behavior.attackMoveReason !== 'spawn_rect_enter_attack') {
            throw new Error(`Natural first wave lacks its spawn order: ${JSON.stringify(spawned)}`);
        }
        await log('natural first wave spawned with spawn-entry attack order');

        const combatBeforeContact = spawned.combat;
        try {
            await page.waitForFunction(
                ({ farmId, wolfIds }) => {
                    const debug = window.__chickenFarmDebug!;
                    const combat = debug.getCombatLifecycleSnapshot();
                    const farm = combat.buildings.find((building) => building.id === farmId);
                    return Boolean(
                        wolfIds.some((wolfId) => {
                            const behavior = debug.getRuntimeEnemyBehaviorForTest(wolfId);
                            return behavior?.focusBuildingId === farmId || behavior?.focusUnitId !== null;
                        }) &&
                        ((farm && farm.hp < farm.maxHp) || combat.units.some((unit) => unit.hp < unit.maxHp)),
                    );
                },
                { farmId: farm.id, wolfIds: spawned.ids },
                { timeout: 90_000 },
            );
        } catch (error) {
            throw new Error(`Natural wave did not reach a farm combat target in time: ${JSON.stringify(await page.evaluate((wolfIds) => ({
                behaviors: wolfIds.map((wolfId) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(wolfId)),
                combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
                state: window.__chickenFarmDebug!.getState(),
            }), spawned.ids))}`, { cause: error });
        }
        const contact = await page.evaluate((wolfIds) => ({
            behaviors: wolfIds.map((wolfId) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(wolfId)),
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            elapsedSec: window.__chickenFarmDebug!.getState().elapsedSec,
        }), spawned.ids);
        await log('natural wave reached a farm target and damage was observed');
        assertNoErrors(errors);
        return {
            case: 'normal_integration',
            checks: {
                actualChickenAcquisitionInput: true,
                actualFarmConstructionInput: true,
                basicWalletStartedAt1500Gold: true,
                browserErrorsZero: true,
                naturalFirstWaveAt120Sec: true,
                pre120WaveCountZero: true,
                spawnOrderAndFarmContactObserved: true,
                targetDamageObserved: true,
            },
            errors,
            executionProfile: {
                debugFixtures: false,
                schedulerTimeJump: false,
                seed,
                startId: 3,
                wallClockWait: true,
            },
            progress,
            snapshots: { before, combatBeforeContact, contact, farm, preBoundary, spawned },
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

async function runSpawnOrder() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    const seed = 812;
    try {
        await page.addInitScript((seed) => {
            let state = seed;
            Math.random = () => {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        }, seed);
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0, null, { timeout: 15_000 });
        const before = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            debug.setWaveTargetQuantityForTest(1, 1);
            debug.advanceWaveForTest(120);
            const wave = debug.getWaveSnapshot();
            const id = wave.waveManagedEnemyIds[0]!;
            return { wave, behavior: debug.getRuntimeEnemyBehaviorForTest(id), targets: debug.getCombatLifecycleSnapshot() };
        });
        const id = before.wave.waveManagedEnemyIds[0]!;
        const spawned = before.wave.waveManagedEnemies[0]!;
        const rect = WAVE_SPAWN_MANIFEST.find((rect) => rect.id === spawned.sourceRectId)?.world;
        if (!rect || spawned.spawnX < rect.minX || spawned.spawnX > rect.maxX || spawned.spawnY < rect.minY || spawned.spawnY > rect.maxY) {
            throw new Error(`Spawn outside source rect: ${JSON.stringify(spawned)}`);
        }
        const initial = before.behavior;
        const destination = initial?.attackMoveDestination;
        if (!initial || !destination || initial.attackMoveReason !== 'spawn_rect_enter_attack' ||
            !Number.isFinite(destination.x) || !Number.isFinite(destination.y) ||
            destination.x < 16 || destination.x > 10016 || destination.y < 32 || destination.y > 10304) {
            throw new Error(`Invalid spawn order: ${JSON.stringify(before)}`);
        }
        await page.waitForFunction(({ id, initial }) => {
            const current = window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(id);
            return current && current.pathRemaining > 0 && Math.hypot(current.x - initial.x, current.y - initial.y) > 64;
        }, { id, initial }, { timeout: 20_000 });
        const after = await page.evaluate((id) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(id), id);
        if (!after || JSON.stringify(after.attackMoveDestination) !== JSON.stringify(destination) ||
            Math.hypot(after.x - destination.x, after.y - destination.y) >= Math.hypot(initial.x - destination.x, initial.y - destination.y)) {
            throw new Error(`Wolf did not advance toward retained destination: ${JSON.stringify({ before, after })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'spawn_order', seed,
            executionProfile: { debugFixtures: true, startId: 3, targetOverride: { tier: 1, quantity: 1 }, timeJump: 120, movement: 'real scene update; no teleport' },
            sourceBroadRect: { minX: -160, minY: 32, maxX: 10016, maxY: 10304 },
            policy: 'web local farm bounds intersect converted IlIlI; 32 occupiable candidates; current position fallback; registration only, no zone re-entry trigger',
            checks: { pass: true, finiteDestinationInsideSourceArea: true, retainedPrimaryDestination: true, actualPathAndMovement: true },
            sourceSpawnRect: rect, before, after, errors,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runRefresh() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0, null, { timeout: 15_000 });
        const snapshot = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120)) return null;
            const firstId = debug.getWaveSnapshot().waveManagedEnemyIds[0];
            if (!firstId || !debug.setWaveTargetQuantityForTest(1, 2) || !debug.advanceWaveForTest(121)) return null;
            const ids = debug.getWaveSnapshot().waveManagedEnemyIds;
            const secondId = ids.find((id) => id !== firstId);
            const foreignCreated = debug.createCombatEnemyFixture('foreign-refresh', 'timber_wolf', 3400, 8900, 9);
            const before = {
                first: debug.getRuntimeEnemyBehaviorForTest(firstId),
                second: secondId ? debug.getRuntimeEnemyBehaviorForTest(secondId) : null,
                foreign: debug.getRuntimeEnemyBehaviorForTest('foreign-refresh'),
            };
            const advancedTo180 = debug.advanceWaveForTest(180);
            const at180 = {
                first: debug.getRuntimeEnemyBehaviorForTest(firstId),
                second: secondId ? debug.getRuntimeEnemyBehaviorForTest(secondId) : null,
                foreign: debug.getRuntimeEnemyBehaviorForTest('foreign-refresh'),
            };
            debug.setWaveTargetQuantityForTest(1, 1);
            const removedFirst = debug.removeCombatEnemyFixture(firstId);
            const advanced = debug.advanceWaveForTest(240);
            return {
                advanced, advancedTo180, at180, before, firstId, foreignCreated, removedFirst, secondId,
                afterSecond: secondId ? debug.getRuntimeEnemyBehaviorForTest(secondId) : null,
                afterForeign: debug.getRuntimeEnemyBehaviorForTest('foreign-refresh'),
                wave: debug.getWaveSnapshot(),
            };
        });
        assertRefresh(snapshot);
        assertNoErrors(errors);
        return {
            case: 'refresh',
            checks: {
                pass: true,
                globalTickIndependentOfSpawnTime: true,
                deadAndForeignEnemiesExcluded: true,
                refreshReasonDistinctFromRepath: true,
            },
            errors,
            executionProfile: { debugFixtures: true, startId: 3, targetOverride: { tier: 1, quantity: 2 }, timeJumps: [120, 121, 180, 240] },
            snapshot,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runFarmBlocker() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.addInitScript(() => {
            let state = 812;
            Math.random = () => {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        });
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0, null, { timeout: 15_000 });
        const spawned = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120)) return null;
            const wave = debug.getWaveSnapshot();
            const enemy = wave.waveManagedEnemies[0];
            return enemy ? { enemy, wave } : null;
        });
        if (!spawned) throw new Error('Failed to create the scheduled wave enemy');
        const direction = spawned.enemy.spawnX < 5000 ? 1 : -1;
        const target = { x: spawned.enemy.spawnX + direction * 176, y: spawned.enemy.spawnY };
        // Unit path goals sit just outside the target footprint. Offset the
        // fence upward into that candidate lane so the real grid route must
        // encounter it instead of naturally skirting its lower edge.
        const fence = { x: spawned.enemy.spawnX + direction * 88, y: spawned.enemy.spawnY - 64 };
        const setup = await page.evaluate(({ enemyId, fence, target }) => {
            const debug = window.__chickenFarmDebug!;
            const farmerId = `wave-farm-target-${enemyId}`;
            return {
                farmerCreated: debug.createDebugFarmerForTest(farmerId, target.x, target.y, 3),
                farmerId,
                fenceId: debug.createCombatBuildingFixture('fence_wood', fence.x, fence.y),
            };
        }, { enemyId: spawned.enemy.id, fence, target });
        if (!setup.farmerCreated || !setup.fenceId) {
            throw new Error(`Failed to set up farm blocker fixture: ${JSON.stringify({ spawned, setup, target, fence })}`);
        }
        try {
            await page.waitForFunction(
                ({ enemyId }) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(enemyId)?.state === 'attack_blocker',
                { enemyId: spawned.enemy.id },
                { timeout: 15_000 },
            );
        } catch (error) {
            throw new Error(
                `Wave wolf did not attack its fence: ${JSON.stringify({
                    behavior: await page.evaluate((enemyId) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(enemyId), spawned.enemy.id),
                    combat: await page.evaluate(() => window.__chickenFarmDebug!.getCombatLifecycleSnapshot()),
                    fence, spawned, target,
                })}`,
                { cause: error },
            );
        }
        const duringFenceAttack = await page.evaluate((enemyId) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(enemyId), spawned.enemy.id);
        const prepared = await page.evaluate((fenceId) => window.__chickenFarmDebug!.damageBuildingForTest(fenceId, 190), setup.fenceId);
        if (!prepared) throw new Error('Failed to prepare fence for the wave wolf final hit');
        await page.waitForFunction(
            (fenceId) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().buildings.some((building) => building.id === fenceId),
            setup.fenceId,
            { timeout: 12_000 },
        );
        await page.waitForFunction(
            ({ enemyId, farmerId }) => {
                const behavior = window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(enemyId);
                return Boolean(behavior && behavior.focusBuildingId === null && behavior.focusUnitId === farmerId && Number.isFinite(behavior.pathRemaining));
            },
            { enemyId: spawned.enemy.id, farmerId: setup.farmerId },
            { timeout: 8_000 },
        );
        const afterFenceDestroyed = await page.evaluate((enemyId) => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest(enemyId), spawned.enemy.id);
        if (!duringFenceAttack || !afterFenceDestroyed) throw new Error('Missing wave blocker behavior snapshot');
        const distanceBefore = Math.hypot(duringFenceAttack.x - target.x, duringFenceAttack.y - target.y);
        const distanceAfter = Math.hypot(afterFenceDestroyed.x - target.x, afterFenceDestroyed.y - target.y);
        if (distanceAfter >= distanceBefore || Math.hypot(afterFenceDestroyed.x - duringFenceAttack.x, afterFenceDestroyed.y - duringFenceAttack.y) < 8) {
            throw new Error(`Wave wolf did not resume movement after fence removal: ${JSON.stringify({ afterFenceDestroyed, distanceAfter, distanceBefore, duringFenceAttack })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'farm_blocker',
            checks: {
                pass: true,
                scheduledWaveEnemyUsed: true,
                fenceAttackedThroughCanonicalCombat: true,
                fenceDestroyedAndRepathObserved: true,
                noDirectMoveOrTeleport: true,
            },
            errors,
            executionProfile: {
                debugFixtures: true,
                seed: 812,
                naturalPopulation: false,
                targetOverride: { tier: 1, quantity: 1 },
                timeJump: 120,
                fixtures: ['debug farmer target', 'fence_wood'],
            },
            spawned,
            fixtureLayout: { fence, target },
            movementAfterFenceRemoval: { distanceAfter, distanceBefore },
            duringFenceAttack,
            afterFenceDestroyed,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runRestart() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0, null, { timeout: 15_000 });
        const oldRun = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120)) return null;
            const wave = debug.getWaveSnapshot();
            const id = wave.waveManagedEnemyIds[0];
            return id ? { runId: debug.getState().runId, wave, id } : null;
        });
        if (!oldRun) throw new Error('Failed to create the old-run wave enemy');
        if (!await page.evaluate(() => {
            const stale = window.__chickenFarmDebug!;
            window.setTimeout(() => stale.advanceWaveForTest(600), 180);
            return stale.restartRunForTest();
        })) throw new Error('First wave restart was rejected');
        await page.waitForFunction((runId) => window.__chickenFarmDebug!.getState().runId > runId, oldRun.runId, { timeout: 10_000 });
        await page.waitForTimeout(260);
        const afterFirstRestart = await page.evaluate(() => ({
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            state: window.__chickenFarmDebug!.getState(),
            wave: window.__chickenFarmDebug!.getWaveSnapshot(),
        }));
        assertFreshWaveRestart(afterFirstRestart, 'first restart');

        const beforeSecondRestart = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120) || !debug.advanceWaveForTest(600)) return null;
            return { runId: debug.getState().runId, wave: debug.getWaveSnapshot() };
        });
        if (!beforeSecondRestart || beforeSecondRestart.wave.currentPhaseAtSec !== 600 || beforeSecondRestart.wave.waveManagedEnemyIds.length !== 1) {
            throw new Error(`Failed to prepare wave phase-transition restart: ${JSON.stringify(beforeSecondRestart)}`);
        }
        if (!await page.evaluate(() => window.__chickenFarmDebug!.restartRunForTest())) {
            throw new Error('Second wave restart was rejected');
        }
        await page.waitForFunction((runId) => window.__chickenFarmDebug!.getState().runId > runId, beforeSecondRestart.runId, { timeout: 10_000 });
        const afterSecondRestart = await page.evaluate(() => ({
            combat: window.__chickenFarmDebug!.getCombatLifecycleSnapshot(),
            state: window.__chickenFarmDebug!.getState(),
            wave: window.__chickenFarmDebug!.getWaveSnapshot(),
        }));
        assertFreshWaveRestart(afterSecondRestart, 'second restart');

        const freshSpawn = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            if (!debug.setWaveTargetQuantityForTest(1, 1) || !debug.advanceWaveForTest(120)) return null;
            return { combat: debug.getCombatLifecycleSnapshot(), wave: debug.getWaveSnapshot() };
        });
        if (
            !freshSpawn ||
            freshSpawn.wave.waveManagedEnemyIds.length !== 1 ||
            freshSpawn.combat.enemies.length !== 1 ||
            !freshSpawn.wave.waveManagedEnemyIds[0]?.startsWith(`wave-r${afterSecondRestart.state.runId}-t1-s0`)
        ) {
            throw new Error(`Fresh run did not create exactly one reset-sequence wave enemy: ${JSON.stringify(freshSpawn)}`);
        }
        assertNoErrors(errors);
        return {
            case: 'restart',
            checks: {
                pass: true,
                twoSamePageRestarts: true,
                oldWaveStateAndCallbackIsolated: true,
                phaseTransitionStateCleared: true,
                freshRunSpawnsOneResetSequenceEnemy: true,
            },
            errors,
            snapshots: { afterFirstRestart, beforeSecondRestart, afterSecondRestart, freshSpawn, oldRun },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runPhases() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    const phases = [
        { atSec: 120, tiers: [1, 2, 3, 4, 5, 6] },
        { atSec: 600, tiers: [3, 4, 5, 6, 7] },
        { atSec: 1100, tiers: [4, 5, 6, 7, 8, 9] },
        { atSec: 1500, tiers: [7, 8, 9] },
        { atSec: 2000, tiers: [8, 9, 10, 11, 12] },
        { atSec: 2200, tiers: [10, 11, 12] },
        { atSec: 2400, tiers: [11, 12, 13, 14, 15] },
        { atSec: 2600, tiers: [13, 14, 15] },
        { atSec: 2800, tiers: [14, 15, 16, 17, 18] },
        { atSec: 3000, tiers: [16, 17, 18] },
    ];
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0, null, { timeout: 15_000 });
        const report = await page.evaluate((phases) => {
            const debug = window.__chickenFarmDebug!;
            const rows: Array<{
                readonly atSec: number;
                readonly combatEnemyIds: readonly string[];
                readonly currentPhaseAtSec: number | null;
                readonly enemies: ReturnType<typeof debug.getWaveSnapshot>['waveManagedEnemies'];
                readonly removedIds: readonly string[];
                readonly tiers: readonly number[];
            }> = [];
            for (const phase of phases) {
                let elapsedSec = debug.getState().elapsedSec;
                while (elapsedSec + 0.2 < phase.atSec - 1e-9) {
                    elapsedSec = Number(Math.min(phase.atSec - 0.2, elapsedSec + 0.2).toFixed(6));
                    if (!debug.advanceWaveForTest(elapsedSec)) return null;
                }
                // Do not apply a next-phase override while the previous phase
                // is still active: overlapping tiers would otherwise spawn
                // early and obscure the phase-transition observation.
                if (!phase.tiers.every((tier) => debug.setWaveTargetQuantityForTest(tier, 1))) return null;
                while (elapsedSec + 1e-9 < phase.atSec + 1) {
                    elapsedSec = Number(Math.min(phase.atSec + 1, elapsedSec + 0.2).toFixed(6));
                    if (!debug.advanceWaveForTest(elapsedSec)) return null;
                }
                const wave = debug.getWaveSnapshot();
                const combat = debug.getCombatLifecycleSnapshot();
                const tierSet = new Set(phase.tiers);
                const enemies = wave.waveManagedEnemies.filter((enemy) => tierSet.has(enemy.tier));
                const removedIds = [...wave.waveManagedEnemyIds];
                rows.push({
                    atSec: phase.atSec,
                    combatEnemyIds: combat.enemies.map((enemy) => enemy.id),
                    currentPhaseAtSec: wave.currentPhaseAtSec,
                    enemies,
                    removedIds,
                    tiers: phase.tiers,
                });
                for (const tier of phase.tiers) debug.setWaveTargetQuantityForTest(tier, null);
                for (const id of removedIds) debug.removeCombatEnemyFixture(id);
            }
            // Reconcile direct fixture removals through the production wave
            // scheduler. Targets are already cleared, so this cannot create a
            // new enemy while it proves that stale phase metadata is removed.
            const cleanupAtSec = Number((debug.getState().elapsedSec + 0.2).toFixed(6));
            if (!debug.advanceWaveForTest(cleanupAtSec)) return null;
            return {
                rows,
                final: { combat: debug.getCombatLifecycleSnapshot(), wave: debug.getWaveSnapshot() },
            };
        }, phases);
        assertPhases(report, phases);
        assertNoErrors(errors);
        return {
            case: 'phases',
            checks: {
                pass: true,
                allTenPhasesReached: true,
                allEighteenOrdinaryTiersSpawned: true,
                noBossSpawned: true,
                post3000OrdinaryPhaseObserved: true,
                productionSchedulerSteppedAt0_2Sec: true,
                fixtureRemovalRecorded: true,
            },
            errors,
            executionProfile: {
                debugFixtures: true,
                targetOverride: 'one live enemy per active tier; cleared after each phase observation',
                simulationStepSec: 0.2,
                fixtureRemoval: 'Each observed wave enemy is directly removed before the next phase to bound population, then a production scheduler step reconciles the removal; this is not normal-play survival evidence.',
            },
            report,
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

function assertRefresh(snapshot: {
    readonly advanced: boolean;
    readonly advancedTo180: boolean;
    readonly at180: {
        readonly first: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
        readonly foreign: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
        readonly second: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
    };
    readonly afterForeign: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
    readonly afterSecond: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
    readonly before: {
        readonly first: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
        readonly foreign: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
        readonly second: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getRuntimeEnemyBehaviorForTest']>;
    };
    readonly foreignCreated: boolean;
    readonly removedFirst: boolean;
    readonly secondId: string | undefined;
    readonly wave: WaveSnapshot;
} | null) {
    if (!snapshot || !snapshot.advanced || !snapshot.advancedTo180 || !snapshot.foreignCreated || !snapshot.removedFirst || !snapshot.secondId) {
        throw new Error(`Wave global refresh setup failed: ${JSON.stringify(snapshot)}`);
    }
    if (
        snapshot.before.first?.attackMoveReason !== 'periodic_global_attack_refresh' ||
        snapshot.before.second?.attackMoveReason !== 'spawn_rect_enter_attack' ||
        snapshot.at180.first?.attackMoveReason !== 'periodic_global_attack_refresh' ||
        snapshot.at180.second?.attackMoveReason !== 'periodic_global_attack_refresh' ||
        snapshot.at180.foreign?.attackMoveReason !== 'spawn_rect_enter_attack' ||
        snapshot.afterSecond?.attackMoveReason !== 'periodic_global_attack_refresh' ||
        snapshot.afterForeign?.attackMoveReason !== 'spawn_rect_enter_attack'
    ) {
        throw new Error(`Global refresh selected the wrong runtime enemies: ${JSON.stringify(snapshot)}`);
    }
    if (
        snapshot.wave.waveManagedEnemyIds.length !== 1 ||
        snapshot.wave.waveManagedEnemyIds[0] !== snapshot.secondId ||
        snapshot.wave.nextGlobalAttackRefreshAtSec !== 300
    ) {
        throw new Error(`Global refresh did not retain exactly one live wave enemy: ${JSON.stringify(snapshot.wave)}`);
    }
}

function assertFreshWaveRestart(snapshot: {
    readonly combat: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;
    readonly state: ReturnType<NonNullable<Window['__chickenFarmDebug']>['getState']>;
    readonly wave: WaveSnapshot;
}, label: string) {
    if (
        snapshot.wave.schedulerStatus !== 'enabled' ||
        snapshot.wave.currentPhaseAtSec !== null ||
        snapshot.wave.nextPhaseAtSec !== 120 ||
        snapshot.wave.nextGlobalAttackRefreshAtSec !== 60 ||
        snapshot.wave.nextReplenishAtSec !== null ||
        snapshot.wave.activeTierTargets.length !== 0 ||
        snapshot.wave.waveManagedEnemyIds.length !== 0 ||
        snapshot.combat.enemies.length !== 0 ||
        snapshot.state.elapsedSec >= 120
    ) {
        throw new Error(`Wave state leaked into ${label}: ${JSON.stringify(snapshot)}`);
    }
}

function assertPhases(
    report: PhaseRuntimeReport,
    phases: readonly { readonly atSec: number; readonly tiers: readonly number[] }[],
) {
    if (!report || report.rows.length !== phases.length) {
        throw new Error(`Wave phase runtime report is incomplete: ${JSON.stringify(report)}`);
    }
    const expectedEnemyByTier = new Map(
        WAVE_ORDINARY_ENEMY_TIERS.map((entry) => [entry.tier, entry.enemyId]),
    );
    const observedEnemyByTier = new Map<number, string>();
    for (const [index, expected] of phases.entries()) {
        const row = report.rows[index];
        if (
            !row ||
            row.atSec !== expected.atSec ||
            row.currentPhaseAtSec !== expected.atSec ||
            row.enemies.length !== expected.tiers.length ||
            row.removedIds.length !== row.enemies.length ||
            row.combatEnemyIds.length !== row.enemies.length
        ) {
            throw new Error(`Wave phase ${expected.atSec} runtime shape is invalid: ${JSON.stringify(row)}`);
        }
        const observedTiers = row.enemies.map((enemy) => enemy.tier).sort((a, b) => a - b);
        const expectedTiers = [...expected.tiers].sort((a, b) => a - b);
        if (JSON.stringify(observedTiers) !== JSON.stringify(expectedTiers)) {
            throw new Error(`Wave phase ${expected.atSec} tiers differ: ${JSON.stringify({ observedTiers, expectedTiers })}`);
        }
        for (const enemy of row.enemies) {
            const expectedEnemyId = expectedEnemyByTier.get(enemy.tier);
            if (
                enemy.ownerPlayerId !== 10 ||
                enemy.enemyId !== expectedEnemyId ||
                !row.combatEnemyIds.includes(enemy.id) ||
                !enemy.id.startsWith('wave-r1-t')
            ) {
                throw new Error(`Wave phase ${expected.atSec} enemy is invalid: ${JSON.stringify(enemy)}`);
            }
            observedEnemyByTier.set(enemy.tier, enemy.enemyId);
        }
    }
    if (observedEnemyByTier.size !== 18) {
        throw new Error(`Expected all 18 ordinary tiers, received ${JSON.stringify([...observedEnemyByTier.keys()])}`);
    }
    for (const [tier, enemyId] of expectedEnemyByTier) {
        if (observedEnemyByTier.get(tier) !== enemyId) {
            throw new Error(`Wave tier ${tier} did not use its canonical enemy ID`);
        }
    }
    if (
        report.final.wave.currentPhaseAtSec !== 3000 ||
        report.final.wave.waveManagedEnemyIds.length !== 0 ||
        report.final.combat.enemies.length !== 0
    ) {
        throw new Error(`Final phase retained fixture enemies or failed to reach 3000: ${JSON.stringify(report.final)}`);
    }
}

async function getCanvasBounds(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.locator('canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    }) as Promise<{ readonly height: number; readonly left: number; readonly top: number; readonly width: number }>;
}

async function selectNormalFarmer(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    const farmer = await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot().units.find(
        (unit) => unit.id === 'p3-farmer',
    ));
    if (!farmer) throw new Error('Normal P3 farmer is missing');
    const calibration = await getWorldCalibration(page, canvas);
    await clickWorld(page, calibration, { x: farmer.x, y: farmer.y });
    await page.waitForFunction(
        () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.unitIds.includes('p3-farmer'),
        null,
        { timeout: 5_000 },
    );
    return { calibration, farmer };
}

async function getWorldCalibration(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    const calibrationPoint = { x: canvas.left, y: canvas.top };
    await page.mouse.click(calibrationPoint.x, calibrationPoint.y);
    const calibrationWorldPoint = await page.evaluate(
        () => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint,
    );
    const referencePoint = { x: canvas.left + canvas.width / 4, y: canvas.top + canvas.height / 4 };
    await page.mouse.click(referencePoint.x, referencePoint.y);
    const referenceWorldPoint = await page.evaluate(
        () => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint,
    );
    if (!calibrationWorldPoint || !referenceWorldPoint) {
        throw new Error('Normal integration world-input calibration is missing');
    }
    return { calibrationPoint, calibrationWorldPoint, referencePoint, referenceWorldPoint };
}

async function clickWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Awaited<ReturnType<typeof getWorldCalibration>>,
    point: { readonly x: number; readonly y: number },
) {
    const scaleX =
        (calibration.referenceWorldPoint.x - calibration.calibrationWorldPoint.x) /
        (calibration.referencePoint.x - calibration.calibrationPoint.x);
    const scaleY =
        (calibration.referenceWorldPoint.y - calibration.calibrationWorldPoint.y) /
        (calibration.referencePoint.y - calibration.calibrationPoint.y);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX === 0 || scaleY === 0) {
        throw new Error(`Normal integration world-input calibration is invalid: ${JSON.stringify(calibration)}`);
    }
    await page.mouse.click(
        calibration.calibrationPoint.x + (point.x - calibration.calibrationWorldPoint.x) / scaleX,
        calibration.calibrationPoint.y + (point.y - calibration.calibrationWorldPoint.y) / scaleY,
    );
}

async function clickInventorySlot(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    slotIndex: number,
) {
    const column = slotIndex % 2;
    const row = Math.floor(slotIndex / 2);
    await page.mouse.click(
        canvas.left + ((571 + column * 46 + 20) / 960) * canvas.width,
        canvas.top + ((566 + row * 46 + 20) / 720) * canvas.height,
    );
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
