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

if (combatCase !== 'baseline' && combatCase !== 'runtime' && combatCase !== 'targets' && combatCase !== 'normal_targets' && combatCase !== 'building_damage' && combatCase !== 'all') {
    throw new Error(`Unsupported CHICKEN_FARM_COMBAT_CASE: ${combatCase}`);
}

const artifactPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
    combatCase === 'baseline'
        ? 'combat_check_baseline.json'
        : combatCase === 'runtime'
          ? 'combat_check_runtime.json'
          : combatCase === 'targets'
            ? 'combat_check_targets.json'
            : combatCase === 'normal_targets'
              ? 'combat_check_normal_targets.json'
              : combatCase === 'building_damage'
                ? 'combat_check_building_damage.json'
          : 'combat_check_all.json',
);

type CombatSnapshot = ReturnType<NonNullable<Window['__chickenFarmDebug']>['getCombatLifecycleSnapshot']>;

async function main() {
    const report =
        combatCase === 'baseline'
            ? await runWithServer(false, runBaseline)
            : combatCase === 'runtime'
              ? await runWithServer(true, runRuntimeCase)
              : combatCase === 'targets'
                ? await runWithServer(true, runTargetsCase)
                : combatCase === 'normal_targets'
                  ? await runWithServer(false, runNormalTargetsCase)
                  : combatCase === 'building_damage'
                    ? await runWithServer(true, runBuildingDamageCase)
              : {
                    case: combatCase,
                    checks: { pass: true },
                    baseline: await runWithServer(false, runBaseline),
                    runtime: await runWithServer(true, runRuntimeCase),
                    targets: await runWithServer(true, runTargetsCase),
                    normalTargets: await runWithServer(false, runNormalTargetsCase),
                    buildingDamage: await runWithServer(true, runBuildingDamageCase),
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

async function runTargetsCase() {
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
        assertHasTarget(before, 'p3-farmer', 'controllable_unit', 3);
        assertHasTarget(before, 'p3-dog', 'controllable_unit', 3);

        const ownerThreeChickenId = await page.evaluate(
            () => window.__chickenFarmDebug!.createEconomyChickenFixture(3, 3650, 8896),
        );
        const ownerFourChickenId = await page.evaluate(
            () => window.__chickenFarmDebug!.createEconomyChickenFixture(4, 3778, 8896),
        );
        if (!ownerThreeChickenId || !ownerFourChickenId) {
            throw new Error('Failed to create economy chicken fixtures');
        }
        const created = await getCombatSnapshot(page);
        assertHasTarget(created, ownerThreeChickenId, 'economy_chicken', 3);
        assertHasTarget(created, ownerFourChickenId, 'economy_chicken', 4);
        const dead = await page.evaluate(
            (id) => window.__chickenFarmDebug!.markEconomyChickenDeadForTest(id),
            ownerThreeChickenId,
        );
        if (!dead) throw new Error('Failed to mark economy chicken dead');
        const afterDeath = await getCombatSnapshot(page);
        if (afterDeath.wolfTargets.some((target) => target.id === ownerThreeChickenId)) {
            throw new Error(`Dead chicken remained targetable: ${JSON.stringify(afterDeath.wolfTargets)}`);
        }
        assertHasTarget(afterDeath, ownerFourChickenId, 'economy_chicken', 4);
        assertNoErrors(errors);
        return {
            case: 'targets',
            checks: {
                deadChickenExcluded: true,
                pass: true,
                playerUnitTargetsPresent: true,
                spawnedChickenTargetsPreserveOwner: true,
            },
            errors,
            executionProfile: { combatPoc: false, combatSmoke: false, debugFixtures: true, startId: 3 },
            snapshots: { afterDeath, before, created },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runNormalTargetsCase() {
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
        const canvas = await getCanvasBounds(page);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().wolfTargets.some((target) => target.targetKind === 'economy_chicken' && target.ownerPlayerId === 3),
            null,
            { timeout: 5_000 },
        );
        const after = await getCombatSnapshot(page);
        const chicken = after.wolfTargets.find((target) => target.targetKind === 'economy_chicken');
        const economyChicken = after.chickens[0];
        if (
            !chicken ||
            !economyChicken ||
            after.chickens.length !== 1 ||
            chicken.id !== economyChicken.id ||
            chicken.ownerPlayerId !== economyChicken.ownerPlayerId ||
            chicken.hp !== economyChicken.hp ||
            chicken.maxHp !== economyChicken.maxHp ||
            chicken.x !== economyChicken.x ||
            chicken.y !== economyChicken.y
        ) {
            throw new Error(`Normal acquisition did not register the actual chicken target: ${JSON.stringify(after)}`);
        }
        assertNoErrors(errors);
        return {
            case: 'normal_targets',
            checks: {
                actualInventoryAcquisitionRegistersTarget: true,
                actualChickenStateIsUsedWithoutCopy: true,
                pass: true,
            },
            errors,
            executionProfile: { combatPoc: false, combatSmoke: false, debugFixtures: false, startId: 3 },
            snapshots: { after, before },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runBuildingDamageCase() {
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
        const buildingId = await page.evaluate(
            () => window.__chickenFarmDebug!.createEconomyBuildingFixture('market', 4032, 8896),
        );
        if (!buildingId) throw new Error('Failed to create completed building fixture');
        const before = await getCombatSnapshot(page);
        const walletBefore = await page.evaluate(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet,
        );
        const building = before.buildings.find((candidate) => candidate.id === buildingId);
        if (!building || building.state !== 'complete' || !building.targetableByWolves) {
            throw new Error(`Missing targetable completed building: ${JSON.stringify(before)}`);
        }
        if (building.footprint.width <= 0 || building.footprint.height <= 0) {
            throw new Error(`Building footprint was not exposed: ${JSON.stringify(building)}`);
        }
        const partial = await page.evaluate(
            ({ id, damage }) => window.__chickenFarmDebug!.damageBuildingForTest(id, damage),
            { id: buildingId, damage: building.armor + 9 },
        );
        const afterPartial = await getCombatSnapshot(page);
        const damaged = afterPartial.buildings.find((candidate) => candidate.id === buildingId);
        if (!partial || !damaged || damaged.hp !== building.hp - 9) {
            throw new Error(`Non-lethal building damage mismatch: ${JSON.stringify({ afterPartial, before })}`);
        }
        const destroyed = await page.evaluate(
            ({ id, damage }) => window.__chickenFarmDebug!.damageBuildingForTest(id, damage),
            { id: buildingId, damage: damaged.maxHp + damaged.armor },
        );
        const afterDestroy = await getCombatSnapshot(page);
        const walletAfterDestroy = await page.evaluate(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet,
        );
        const repeated = await page.evaluate(
            ({ id, damage }) => window.__chickenFarmDebug!.damageBuildingForTest(id, damage),
            { id: buildingId, damage: 1 },
        );
        if (
            !destroyed ||
            repeated ||
            afterDestroy.buildings.some((candidate) => candidate.id === buildingId) ||
            JSON.stringify(walletBefore) !== JSON.stringify(walletAfterDestroy) ||
            JSON.stringify(before.buildings.filter((candidate) => candidate.id !== buildingId)) !==
                JSON.stringify(afterDestroy.buildings) ||
            JSON.stringify(before.chickens) !== JSON.stringify(afterDestroy.chickens)
        ) {
            throw new Error(`Building destruction was not single/removal-only: ${JSON.stringify({ afterDestroy, before, repeated })}`);
        }

        const constructingId = await page.evaluate(
            () => window.__chickenFarmDebug!.createPausedConstructionFixture('coop_basic', 4352, 8896),
        );
        if (!constructingId) throw new Error('Failed to create constructing building fixture');
        const rejectedConstructionDamage = await page.evaluate(
            (id) => window.__chickenFarmDebug!.damageBuildingForTest(id, 9_999),
            constructingId,
        );
        const construction = await page.evaluate(
            (id) => window.__chickenFarmDebug!.getBuildingConstructionSnapshot(id),
            constructingId,
        );
        if (rejectedConstructionDamage || construction?.state !== 'constructing') {
            throw new Error(`Constructing building became wolf targetable: ${JSON.stringify({ construction, rejectedConstructionDamage })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'building_damage',
            checks: {
                constructionExcludedByTargetability: true,
                lethalRemovalIsIdempotent: true,
                nonLethalDamageUsesArmor: true,
                pass: true,
            },
            errors,
            executionProfile: { combatPoc: false, combatSmoke: false, debugFixtures: true, startId: 3 },
            snapshots: { afterDestroy, afterPartial, before, walletAfterDestroy, walletBefore },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function assertHasTarget(
    snapshot: CombatSnapshot,
    id: string,
    targetKind: 'controllable_unit' | 'economy_chicken',
    ownerPlayerId: number,
) {
    const target = snapshot.wolfTargets.find((candidate) => candidate.id === id);
    if (!target || target.targetKind !== targetKind || target.ownerPlayerId !== ownerPlayerId) {
        throw new Error(`Missing or invalid target ${id}: ${JSON.stringify(snapshot.wolfTargets)}`);
    }
}

async function getCanvasBounds(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
) {
    return page.locator('canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    }) as Promise<{ readonly height: number; readonly left: number; readonly top: number; readonly width: number }>;
}

async function selectFarmer(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    const farmer = await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot().units.find((unit) => unit.id === 'p3-farmer'));
    if (!farmer) throw new Error('Missing normal P3 farmer');
    const calibration = await getWorldCalibration(page, canvas);
    await clickWorld(page, calibration, { x: farmer.x, y: farmer.y });
    await page.waitForFunction(
        () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.unitIds.includes('p3-farmer'),
        null,
        { timeout: 5_000 },
    );
}

async function getWorldCalibration(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    await page.mouse.click(canvas.left, canvas.top);
    const calibrationWorldPoint = await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint);
    const referencePoint = {
        x: canvas.left + canvas.width / 4,
        y: canvas.top + canvas.height / 4,
    };
    await page.mouse.click(referencePoint.x, referencePoint.y);
    const referenceWorldPoint = await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint);
    if (!calibrationWorldPoint || !referenceWorldPoint) throw new Error('Missing world-input calibration points');
    return {
        calibrationPoint: { x: canvas.left, y: canvas.top },
        calibrationWorldPoint,
        referencePoint,
        referenceWorldPoint,
    };
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
        throw new Error(`Invalid world-input calibration: ${JSON.stringify(calibration)}`);
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
    const col = slotIndex % 2;
    const row = Math.floor(slotIndex / 2);
    await page.mouse.click(
        canvas.left + ((571 + col * 46 + 20) / 960) * canvas.width,
        canvas.top + ((566 + row * 46 + 20) / 720) * canvas.height,
    );
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
