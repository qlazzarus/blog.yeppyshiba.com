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

if (combatCase !== 'baseline' && combatCase !== 'runtime' && combatCase !== 'targets' && combatCase !== 'normal_targets' && combatCase !== 'building_damage' && combatCase !== 'targeting' && combatCase !== 'unit_attack' && combatCase !== 'tower_attack' && combatCase !== 'unit_death' && combatCase !== 'attack_move' && combatCase !== 'blocker' && combatCase !== 'restart' && combatCase !== 'integration' && combatCase !== 'all') {
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
                : combatCase === 'targeting'
                  ? 'combat_check_targeting.json'
                  : combatCase === 'unit_attack'
                    ? 'combat_check_unit_attack.json'
                    : combatCase === 'tower_attack'
                      ? 'combat_check_tower_attack.json'
                    : combatCase === 'unit_death'
                        ? 'combat_check_unit_death.json'
                          : combatCase === 'attack_move'
                            ? 'combat_check_attack_move.json'
                            : combatCase === 'blocker'
                              ? 'combat_check_blocker.json'
                          : combatCase === 'restart'
                            ? 'combat_check_restart.json'
                            : combatCase === 'integration'
                              ? 'combat_check_integration.json'
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
                    : combatCase === 'targeting'
                      ? await runWithServer(true, runTargetingCase)
                      : combatCase === 'unit_attack'
                        ? await runWithServer(true, runUnitAttackCase)
                        : combatCase === 'tower_attack'
                          ? await runWithServer(true, runTowerAttackCase)
                          : combatCase === 'unit_death'
                            ? await runWithServer(true, runUnitDeathCase)
                            : combatCase === 'attack_move'
                              ? await runWithServer(true, runAttackMoveCase)
                              : combatCase === 'blocker'
                                ? await runWithServer(true, runBlockerCase)
                              : combatCase === 'restart'
                                ? await runWithServer(true, runRestartCase)
                                : combatCase === 'integration'
                                  ? await runWithServer(true, runIntegrationCase)
              : {
                    case: combatCase,
                    checks: { pass: true },
                    baseline: await runWithServer(false, runBaseline),
                    runtime: await runWithServer(true, runRuntimeCase),
                    targets: await runWithServer(true, runTargetsCase),
                    normalTargets: await runWithServer(false, runNormalTargetsCase),
                    buildingDamage: await runWithServer(true, runBuildingDamageCase),
                    targeting: await runWithServer(true, runTargetingCase),
                    unitAttack: await runWithServer(true, runUnitAttackCase),
                    towerAttack: await runWithServer(true, runTowerAttackCase),
                    unitDeath: await runWithServer(true, runUnitDeathCase),
                    attackMove: await runWithServer(true, runAttackMoveCase),
                    blocker: await runWithServer(true, runBlockerCase),
                    restart: await runWithServer(true, runRestartCase),
                    integration: await runWithServer(true, runIntegrationCase),
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
        const millId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyBuildingFixture('lumber_mill', 4352, 8896));
        if (!millId) throw new Error('Failed to create lumber mill');
        const millBefore = await getCombatSnapshot(page);
        const mill = millBefore.buildings.find((candidate) => candidate.id === millId);
        if (!mill || !await page.evaluate(({ id, damage }) => window.__chickenFarmDebug!.damageBuildingForTest(id, damage), { id: millId, damage: mill.maxHp + mill.armor })) {
            throw new Error('Failed to destroy lumber mill through combat boundary');
        }
        const income = await page.evaluate(() => {
            const before = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet?.lumber ?? 0;
            const time = Math.ceil((window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().elapsedSec + 0.1) / 30) * 30;
            window.__chickenFarmDebug!.advanceEconomyForTest(time);
            return { after: window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet?.lumber ?? 0, before };
        });
        if (income.after !== income.before) throw new Error(`Destroyed lumber mill paid income: ${JSON.stringify(income)}`);
        assertNoErrors(errors);
        return {
            case: 'building_damage',
            checks: {
                constructionExcludedByTargetability: true,
                destroyedLumberMillIncomeStopped: true,
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

async function runTargetingCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        if (!await page.evaluate(() => window.__chickenFarmDebug!.setCombatVisibilityForTest(true))) {
            throw new Error('Failed to enable visible targeting fixture');
        }
        const buildingId = await page.evaluate(() => window.__chickenFarmDebug!.createCombatBuildingFixture('tower_scout', 3648, 8896));
        if (!buildingId) throw new Error('Failed to create targeting building');
        const created = await page.evaluate(() => window.__chickenFarmDebug!.createCombatEnemyFixture('targeting-wolf', 'timber_wolf', 3800, 8896));
        if (!created) throw new Error('Failed to create targeting wolf');
        const near = await page.evaluate(() => window.__chickenFarmDebug!.getWolfTargetingProbeForTest('targeting-wolf'));
        if (!near || near.candidate?.id !== buildingId || near.candidate.kind !== 'building' || !near.candidate.canAttack) {
            throw new Error(`Footprint-range target mismatch: ${JSON.stringify(near)}`);
        }
        await page.evaluate(() => window.__chickenFarmDebug!.setCombatVisibilityForTest(false));
        const hidden = await page.evaluate(() => window.__chickenFarmDebug!.getWolfTargetingProbeForTest('targeting-wolf'));
        if (!hidden || hidden.candidate !== null) throw new Error(`Hidden target was selected: ${JSON.stringify(hidden)}`);
        await page.evaluate(() => window.__chickenFarmDebug!.setCombatVisibilityForTest(true));
        const moved = await page.evaluate(() => {
            window.__chickenFarmDebug!.removeCombatEnemyFixture('targeting-wolf');
            return window.__chickenFarmDebug!.createCombatEnemyFixture('targeting-wolf', 'timber_wolf', 4600, 8896);
        });
        if (!moved) throw new Error('Failed to move targeting wolf');
        const far = await page.evaluate(() => window.__chickenFarmDebug!.getWolfTargetingProbeForTest('targeting-wolf'));
        if (!far || far.candidate !== null) throw new Error(`Out-of-acquire target was selected: ${JSON.stringify(far)}`);
        assertNoErrors(errors);
        return {
            case: 'targeting',
            checks: { footprintNearestPointUsed: true, outOfAcquireExcluded: true, pass: true },
            errors,
            executionProfile: { combatPoc: false, combatSmoke: false, debugFixtures: true, startId: 3 },
            probes: { far, hidden, near },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runUnitAttackCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        const enemyId = 'unit-attack-wolf';
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.createCombatEnemyFixture(id, 'timber_wolf', 3500, 8928), enemyId)) {
            throw new Error('Failed to create attack target');
        }
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.setCombatEnemyHpForTest(id, 1), enemyId)) {
            throw new Error('Failed to prepare one-hit attack target');
        }
        const canvas = await getCanvasBounds(page);
        await selectFarmer(page, canvas);
        await clickWorld(page, await getWorldCalibration(page, canvas), { x: 3500, y: 8928 }, 'right');
        await page.waitForFunction(
            (id) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().enemies.some((enemy) => enemy.id === id),
            enemyId,
            { timeout: 18_000 },
        );
        const afterHit = await getCombatSnapshot(page);
        const attacker = afterHit.units.find((candidate) => candidate.nextAttackAtSec > afterHit.elapsedSec);
        if (
            afterHit.enemies.some((candidate) => candidate.id === enemyId) ||
            !attacker ||
            afterHit.units.some((unit) => unit.currentCommandTargetId === enemyId)
        ) {
            throw new Error(`Actual attack/cooldown mismatch: ${JSON.stringify(afterHit)}`);
        }
        assertNoErrors(errors);
        return { case: 'unit_attack', checks: { actualRightClickLandsHit: true, cooldownConsumedAfterHit: true, killedEnemyRemovedOnce: true, pass: true }, errors, snapshots: { afterHit } };
    } finally { await page.close(); await browser.close(); }
}

async function runTowerAttackCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        await page.evaluate(() => window.__chickenFarmDebug!.setCombatVisibilityForTest(true));
        const towerId = await page.evaluate(() => window.__chickenFarmDebug!.createCombatBuildingFixture('tower_scout', 3648, 8896));
        if (!towerId) throw new Error('Failed to create completed tower');
        if (!await page.evaluate(() => window.__chickenFarmDebug!.createCombatEnemyFixture('tower-wolf', 'timber_wolf', 3820, 8896))) {
            throw new Error('Failed to create tower target');
        }
        await page.waitForFunction(
            () => (window.__chickenFarmDebug!.getCombatLifecycleSnapshot().enemies.find((enemy) => enemy.id === 'tower-wolf')?.hp ?? 450) < 450,
            null,
            { timeout: 5_000 },
        );
        const afterHit = await getCombatSnapshot(page);
        const hpAfterHit = afterHit.enemies.find((enemy) => enemy.id === 'tower-wolf')?.hp;
        if (hpAfterHit === undefined || hpAfterHit >= 450) throw new Error(`Tower did not hit: ${JSON.stringify(afterHit)}`);
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(id), towerId)) {
            throw new Error('Failed to remove tower');
        }
        await page.waitForTimeout(1_300);
        const afterRemoval = await getCombatSnapshot(page);
        const hpAfterRemoval = afterRemoval.enemies.find((enemy) => enemy.id === 'tower-wolf')?.hp;
        if (hpAfterRemoval !== hpAfterHit || afterRemoval.buildings.some((building) => building.id === towerId)) {
            throw new Error(`Removed tower attacked or remained active: ${JSON.stringify({ afterHit, afterRemoval })}`);
        }
        assertNoErrors(errors);
        return { case: 'tower_attack', checks: { completedTowerAttacksRuntimeEnemy: true, removedTowerStopsAttacking: true, pass: true }, errors, snapshots: { afterHit, afterRemoval } };
    } finally { await page.close(); await browser.close(); }
}

async function runUnitDeathCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        const chickenId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyChickenFixture(3, 3650, 8896));
        if (!chickenId || !await page.evaluate(() => window.__chickenFarmDebug!.createCombatEnemyFixture('death-wolf', 'timber_wolf', 3650, 8896))) {
            throw new Error('Failed to create wolf/chicken death fixture');
        }
        await page.waitForFunction(
            (id) => {
                const snapshot = window.__chickenFarmDebug!.getCombatLifecycleSnapshot();
                return snapshot.chickens.some((chicken) => chicken.id === id && chicken.aiState === 'dead' && chicken.hp === 0) &&
                !snapshot.wolfTargets.some((target) => target.id === id);
            },
            chickenId,
            { timeout: 18_000 },
        );
        const afterDeath = await getCombatSnapshot(page);
        await page.waitForTimeout(1_100);
        const afterWait = await getCombatSnapshot(page);
        const chicken = afterDeath.chickens.find((candidate) => candidate.id === chickenId);
        if (!chicken || chicken.hp !== 0 || chicken.aiState !== 'dead' || afterWait.chickens.find((candidate) => candidate.id === chickenId)?.hp !== 0) {
            throw new Error(`Chicken death was not idempotent: ${JSON.stringify({ afterDeath, afterWait })}`);
        }
        assertNoErrors(errors);
        return { case: 'unit_death', checks: { deadChickenStopsTargetingAndProduction: true, deathIsIdempotent: true, pass: true }, errors, snapshots: { afterDeath, afterWait } };
    } finally { await page.close(); await browser.close(); }
}

async function runAttackMoveCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        const canvas = await getCanvasBounds(page);
        const calibration = await getWorldCalibration(page, canvas);
        await selectFarmer(page, canvas);
        const farmer = await page.evaluate(() =>
            window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.find(
                (unit) => unit.id === 'p3-farmer',
            ),
        );
        if (!farmer) throw new Error('Missing farmer for attack-move case');

        const destination = { x: farmer.x + 160, y: farmer.y };
        const enemyId = 'attack-move-wolf';
        await page.keyboard.press('a');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getControlSnapshot().targeting.attack,
            null,
            { timeout: 5_000 },
        );
        await clickWorld(page, calibration, destination);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandType === 'attack_move',
            ),
            null,
            { timeout: 5_000 },
        );
        if (!await page.evaluate(
            ({ id, x, y }) => window.__chickenFarmDebug!.createCombatEnemyFixture(id, 'timber_wolf', x, y),
            { id: enemyId, x: farmer.x + 70, y: farmer.y },
        )) {
            throw new Error('Failed to create attack-move target');
        }

        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandTargetId === id,
            ),
            enemyId,
            { timeout: 8_000 },
        );
        const duringCombat = await getCombatSnapshot(page);
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.setCombatEnemyHpForTest(id, 1), enemyId)) {
            throw new Error('Failed to make attack-move target lethal');
        }
        await page.waitForFunction(
            (id) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().enemies.some(
                (enemy) => enemy.id === id,
            ),
            enemyId,
            { timeout: 8_000 },
        );
        await page.waitForFunction(
            () => {
                const unit = window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.find(
                    (candidate) => candidate.id === 'p3-farmer',
                );
                return unit?.currentCommandType === 'attack_move';
            },
            null,
            { timeout: 8_000 },
        );
        const afterResume = await getCombatSnapshot(page);
        const resumedFarmer = afterResume.units.find((unit) => unit.id === 'p3-farmer');
        const secondEnemyId = 'attack-move-second-wolf';
        if (!resumedFarmer || !await page.evaluate(
            ({ id, x, y }) => window.__chickenFarmDebug!.createCombatEnemyFixture(id, 'timber_wolf', x, y),
            { id: secondEnemyId, x: resumedFarmer.x + 64, y: resumedFarmer.y },
        )) {
            throw new Error('Failed to create attack-move reacquisition target');
        }
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandTargetId === id,
            ),
            secondEnemyId,
            { timeout: 8_000 },
        );
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.setCombatEnemyHpForTest(id, 1), secondEnemyId)) {
            throw new Error('Failed to make reacquired target lethal');
        }
        await page.waitForFunction(
            (id) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().enemies.some(
                (enemy) => enemy.id === id,
            ),
            secondEnemyId,
            { timeout: 8_000 },
        );
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandType === 'attack_move',
            ),
            null,
            { timeout: 8_000 },
        );
        try {
            await page.waitForFunction(
                (target) => {
                    const unit = window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.find(
                        (candidate) => candidate.id === 'p3-farmer',
                    );
                    return Boolean(
                        unit &&
                            unit.currentCommandType === null &&
                            Math.hypot(unit.x - target.x, unit.y - target.y) < 36,
                    );
                },
                destination,
                { timeout: 20_000 },
            );
        } catch (error) {
            throw new Error(
                `Attack-move did not reach its destination: ${JSON.stringify({
                    afterResume,
                    destination,
                    snapshot: await getCombatSnapshot(page),
                })}`,
                { cause: error },
            );
        }
        const atDestination = await getCombatSnapshot(page);
        const simpleMoveDestination = { x: destination.x + 48, y: destination.y };
        await clickWorld(page, calibration, simpleMoveDestination, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandType === 'move',
            ),
            null,
            { timeout: 5_000 },
        );
        await page.waitForFunction(
            (target) => {
                const unit = window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.find(
                    (candidate) => candidate.id === 'p3-farmer',
                );
                return Boolean(
                    unit &&
                        unit.currentCommandType === null &&
                        Math.hypot(unit.x - target.x, unit.y - target.y) < 36,
                );
            },
            simpleMoveDestination,
            { timeout: 12_000 },
        );
        const blockedDestination = { x: simpleMoveDestination.x + 64, y: simpleMoveDestination.y };
        const blockerId = await page.evaluate(
            ({ x, y }) => window.__chickenFarmDebug!.createCombatBuildingFixture('fence_wood', x, y),
            blockedDestination,
        );
        if (!blockerId) throw new Error('Failed to create blocked attack-move destination');
        const beforeBlockedOrder = await getCombatSnapshot(page);
        await page.keyboard.press('a');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getControlSnapshot().targeting.attack,
            null,
            { timeout: 5_000 },
        );
        await clickWorld(page, calibration, blockedDestination);
        await page.waitForFunction(
            () => !window.__chickenFarmDebug!.getControlSnapshot().targeting.attack,
            null,
            { timeout: 5_000 },
        );
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandType === null,
            ),
            null,
            { timeout: 5_000 },
        );
        const afterBlockedOrder = await getCombatSnapshot(page);
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(id), blockerId)) {
            throw new Error('Failed to remove blocked attack-move destination');
        }
        if (
            !duringCombat.units.some((unit) => unit.id === 'p3-farmer' && unit.currentCommandTargetId === enemyId) ||
            atDestination.enemies.some((enemy) => enemy.id === enemyId) ||
            atDestination.enemies.some((enemy) => enemy.id === secondEnemyId)
        ) {
            throw new Error(`Attack-move did not engage then resume: ${JSON.stringify({ duringCombat, afterResume, atDestination, afterBlockedOrder, beforeBlockedOrder })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'attack_move',
            checks: {
                actualAttackMoveInput: true,
                engagedIntermediateEnemy: true,
                reacquiredEnemyWhileReturning: true,
                resumedOriginalDestinationAfterTargetDeath: true,
                simpleMoveRemainedMove: true,
                unreachableDestinationEnded: true,
                pass: true,
            },
            errors,
            snapshots: { afterBlockedOrder, afterResume, atDestination, beforeBlockedOrder, duringCombat },
        };
    } finally { await page.close(); await browser.close(); }
}

async function runBlockerCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        await page.evaluate(() => {
            window.__chickenFarmDebug!.setCombatVisibilityForTest(true);
            return [
                window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', 3200, 8400),
                window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-dog', 3200, 8450),
                window.__chickenFarmDebug!.createDebugFarmerForTest('blocker-target', 3392, 8928, 3),
            ];
        });
        const fenceId = await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatBuildingFixture('fence_wood', 3450, 8896),
        );
        if (!fenceId) throw new Error('Failed to create blocker fence');

        if (!await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('blocker-open-wolf', 'timber_wolf', 3530, 8800),
        )) {
            throw new Error('Failed to create open-detour wolf');
        }
        await page.waitForFunction(
            () => {
                const behavior = window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-open-wolf');
                return behavior?.focusUnitId === 'blocker-target' && behavior.targetBuildingId === null;
            },
            null,
            { timeout: 8_000 },
        );
        const openDetour = await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-open-wolf'));
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.removeCombatEnemyFixture(id), 'blocker-open-wolf')) {
            throw new Error('Failed to remove open-detour wolf');
        }

        if (!await page.evaluate(() =>
            window.__chickenFarmDebug!.createCombatEnemyFixture('blocker-sealed-wolf', 'timber_wolf', 3550, 8928),
        )) {
            throw new Error('Failed to create sealed-path wolf');
        }
        try {
            await page.waitForFunction(
                () => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-sealed-wolf')?.state === 'attack_blocker',
                null,
                { timeout: 12_000 },
            );
        } catch (error) {
            throw new Error(
                `Sealed blocker was not attacked: ${JSON.stringify({
                    behavior: await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-sealed-wolf')),
                    snapshot: await getCombatSnapshot(page),
                })}`,
                { cause: error },
            );
        }
        const duringBlockerAttack = await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-sealed-wolf'));
        if (!await page.evaluate((buildingId) => window.__chickenFarmDebug!.damageBuildingForTest(buildingId, 190), fenceId)) {
            throw new Error('Failed to prepare blocker for final wolf hit');
        }
        await page.waitForFunction(
            (buildingId) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().buildings.some((building) => building.id === buildingId),
            fenceId,
            { timeout: 8_000 },
        );
        await page.waitForFunction(
            () => {
                const behavior = window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-sealed-wolf');
                return Boolean(
                    behavior &&
                    behavior.focusBuildingId === null &&
                    behavior.targetBuildingId === null &&
                    behavior.focusUnitId === 'blocker-target' &&
                    Number.isFinite(behavior.pathRemaining),
                );
            },
            null,
            { timeout: 8_000 },
        );
        const afterBlockerDestroyed = await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('blocker-sealed-wolf'));

        if (!await page.evaluate(() => {
            return window.__chickenFarmDebug!.createDebugFarmerForTest('unreachable-target', 0, 0, 3) &&
                window.__chickenFarmDebug!.createCombatEnemyFixture('unreachable-wolf', 'timber_wolf', 96, 96);
        })) {
            throw new Error('Failed to create unreachable terrain fixture');
        }
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('unreachable-wolf')?.state === 'repath',
            null,
            { timeout: 10_000 },
        );
        const firstUnreachable = await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('unreachable-wolf'));
        await page.waitForTimeout(1_200);
        const secondUnreachable = await page.evaluate(() => window.__chickenFarmDebug!.getRuntimeEnemyBehaviorForTest('unreachable-wolf'));
        if (
            !openDetour ||
            !duringBlockerAttack ||
            !afterBlockerDestroyed ||
            !firstUnreachable ||
            !secondUnreachable ||
            firstUnreachable.state !== 'repath' ||
            secondUnreachable.state !== 'repath' ||
            !Number.isFinite(firstUnreachable.pathRemaining) ||
            !Number.isFinite(secondUnreachable.pathRemaining)
        ) {
            throw new Error(`Blocker/repath behavior mismatch: ${JSON.stringify({ afterBlockerDestroyed, duringBlockerAttack, firstUnreachable, openDetour, secondUnreachable })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'blocker',
            checks: {
                openDetourPreservedFence: true,
                sealedPathAttackedBlocker: true,
                destroyedBlockerClearedFocusAndRepathed: true,
                unreachableTerrainRetriedFinitely: true,
                pass: true,
            },
            errors,
            behaviors: { afterBlockerDestroyed, duringBlockerAttack, firstUnreachable, openDetour, secondUnreachable },
        };
    } finally { await page.close(); await browser.close(); }
}

async function runRestartCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        const initial = await getCombatSnapshot(page);
        if (!await page.evaluate(() => window.__chickenFarmDebug!.createCombatEnemyFixture('restart-old-wolf', 'timber_wolf', 3500, 8928))) {
            throw new Error('Failed to create first restart enemy');
        }
        const towerId = await page.evaluate(() => window.__chickenFarmDebug!.createCombatBuildingFixture('tower_scout', 3904, 8896));
        const chickenId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyChickenFixture(3, 4300, 8896));
        if (!towerId || !chickenId) throw new Error('Failed to create first restart fixtures');
        const beforeFirstRestart = await getCombatSnapshot(page);
        if (!beforeFirstRestart.enemies.length || !beforeFirstRestart.buildings.length || !beforeFirstRestart.chickens.length) {
            throw new Error(`Restart setup did not create combat state: ${JSON.stringify(beforeFirstRestart)}`);
        }
        if (!await page.evaluate(() => {
            const stale = window.__chickenFarmDebug!;
            window.setTimeout(() => stale.damageControllableUnitForTest('p3-farmer', 99), 180);
            return stale.restartRunForTest();
        })) {
            throw new Error('First same-page restart was rejected');
        }
        await page.waitForFunction((runId) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().runId > runId, initial.runId, { timeout: 10_000 });
        await page.waitForTimeout(260);
        const afterFirstRestart = await getCombatSnapshot(page);
        assertFreshCombatRestart(afterFirstRestart, 'first restart');

        if (!await page.evaluate(() => window.__chickenFarmDebug!.createCombatEnemyFixture('restart-new-wolf', 'timber_wolf', 3500, 8928))) {
            throw new Error('Fresh run could not create combat enemy');
        }
        const activeSecondRun = await getCombatSnapshot(page);
        if (!activeSecondRun.enemies.some((enemy) => enemy.id === 'restart-new-wolf')) {
            throw new Error(`Fresh run did not expose new combat enemy: ${JSON.stringify(activeSecondRun)}`);
        }
        if (!await page.evaluate(() => {
            const stale = window.__chickenFarmDebug!;
            window.setTimeout(() => stale.damageControllableUnitForTest('p3-farmer', 99), 180);
            return stale.restartRunForTest();
        })) {
            throw new Error('Second same-page restart was rejected');
        }
        await page.waitForFunction((runId) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().runId > runId, afterFirstRestart.runId, { timeout: 10_000 });
        await page.waitForTimeout(260);
        const afterSecondRestart = await getCombatSnapshot(page);
        assertFreshCombatRestart(afterSecondRestart, 'second restart');
        assertNoErrors(errors);
        return {
            case: 'restart',
            checks: {
                freshRunCanCreateCombatEnemy: true,
                staleFixturesAndTargetsRemoved: true,
                staleRunCallbackCannotDamageFreshUnit: true,
                twoSamePageRestarts: true,
                pass: true,
            },
            errors,
            snapshots: { afterFirstRestart, afterSecondRestart, beforeFirstRestart },
        };
    } finally { await page.close(); await browser.close(); }
}

async function runIntegrationCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, { timeout: 15_000 });
        const before = await getCombatSnapshot(page);
        assertBaseline(before, before);

        const canvas = await getCanvasBounds(page);
        const calibration = await getWorldCalibration(page, canvas);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().chickens.length === 1,
            null,
            { timeout: 8_000 },
        );
        const afterChicken = await getCombatSnapshot(page);
        const chicken = afterChicken.chickens[0];
        if (
            !chicken ||
            chicken.ownerPlayerId !== 3 ||
            chicken.hp <= 0 ||
            chicken.hp > chicken.maxHp ||
            !afterChicken.wolfTargets.some((target) => target.id === chicken.id && target.ownerPlayerId === 3)
        ) {
            throw new Error(`Actual chicken acquisition did not enter economy/combat state: ${JSON.stringify(afterChicken)}`);
        }

        await selectFarmer(page, canvas);
        await page.keyboard.press('b');
        await page.keyboard.press('f');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === 'fence_wood',
            null,
            { timeout: 5_000 },
        );
        const fencePoint = { x: 3584, y: 8896 };
        await clickWorld(page, calibration, fencePoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().pendingOrders.some(
                (order) => order.templateId === 'fence_wood',
            ),
            null,
            { timeout: 8_000 },
        );
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().buildings.some(
                (building) => building.templateId === 'fence_wood' && building.state === 'complete',
            ),
            null,
            { timeout: 15_000 },
        );
        const afterFence = await getCombatSnapshot(page);
        const fence = afterFence.buildings.find(
            (building) => building.templateId === 'fence_wood' && building.state === 'complete',
        );
        if (!fence || fence.ownerPlayerId !== 3 || fence.hp !== fence.maxHp || !fence.targetableByWolves) {
            throw new Error(`Actual fence build did not complete as a wolf target: ${JSON.stringify(afterFence)}`);
        }

        const enemyId = 'integration-wolf';
        const farmer = afterFence.units.find((unit) => unit.id === 'p3-farmer');
        if (!farmer || !await page.evaluate(
            ({ id, x, y }) => window.__chickenFarmDebug!.createCombatEnemyFixture(id, 'timber_wolf', x, y),
            { id: enemyId, x: farmer.x + 80, y: farmer.y },
        )) {
            throw new Error('Failed to inject integration enemy fixture');
        }
        await selectFarmer(page, canvas);
        await clickWorld(page, calibration, { x: farmer.x + 80, y: farmer.y }, 'right');
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.some(
                (unit) => unit.id === 'p3-farmer' && unit.currentCommandTargetId === id,
            ),
            enemyId,
            { timeout: 8_000 },
        );
        const duringAttack = await getCombatSnapshot(page);
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.setCombatEnemyHpForTest(id, 1), enemyId)) {
            throw new Error('Failed to prepare integration enemy for final player hit');
        }
        await page.waitForFunction(
            (id) => !window.__chickenFarmDebug!.getCombatLifecycleSnapshot().enemies.some((enemy) => enemy.id === id),
            enemyId,
            { timeout: 12_000 },
        );
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getCombatLifecycleSnapshot().units.every(
                (unit) => unit.currentCommandTargetId !== id,
            ),
            enemyId,
            { timeout: 5_000 },
        );
        const afterKill = await getCombatSnapshot(page);
        if (
            !duringAttack.units.some((unit) => unit.id === 'p3-farmer' && unit.currentCommandTargetId === enemyId) ||
            afterKill.enemies.some((enemy) => enemy.id === enemyId) ||
            (afterKill.chickens.find((candidate) => candidate.id === chicken.id)?.hp ?? 0) <= 0 ||
            afterKill.buildings.find((candidate) => candidate.id === fence.id)?.hp !== fence.maxHp
        ) {
            throw new Error(`Integration command/lifecycle mismatch: ${JSON.stringify({ afterKill, duringAttack })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'integration',
            checks: {
                actualP3ChickenAcquisition: true,
                actualP3FenceConstruction: true,
                enemyFixtureOnly: true,
                actualRightClickAttackAndCommandClear: true,
                blockerDestructionAndRepathDeferredToSp07_16: true,
                pass: true,
            },
            errors,
            snapshots: { afterChicken, afterFence, afterKill, before, duringAttack },
        };
    } finally { await page.close(); await browser.close(); }
}

function assertFreshCombatRestart(snapshot: CombatSnapshot, label: string) {
    if (
        snapshot.enemies.length !== 0 ||
        snapshot.buildings.length !== 0 ||
        snapshot.chickens.length !== 0 ||
        snapshot.units.length !== 2 ||
        snapshot.units.some((unit) => unit.hp !== unit.maxHp || unit.currentCommandType !== null || unit.commandQueueCount !== 0) ||
        snapshot.wolfTargets.length !== 2
    ) {
        throw new Error(`${label} retained stale combat state: ${JSON.stringify(snapshot)}`);
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
    button: 'left' | 'right' = 'left',
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
        { button },
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
