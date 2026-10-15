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
    readonly upgrades: readonly {
        readonly buildingId: string;
        readonly completeAtSec: number;
        readonly sourceTemplateId: string;
        readonly state: 'ready' | 'running';
        readonly targetTemplateId: string;
    }[];
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

if (!['baseline', 'supply', 'production', 'upgrade', 'research'].includes(growthCase)) {
    throw new Error(`Unsupported CHICKEN_FARM_GROWTH_CASE: ${growthCase}`);
}

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = growthCase === 'supply'
            ? await runSupplyLifecycle()
            : growthCase === 'production'
              ? await runProductionLifecycle()
              : growthCase === 'upgrade'
                ? await runUpgradeLifecycle()
                : growthCase === 'research'
                  ? await runResearchLifecycle()
              : await runBaseline();
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
            VITE_CHICKEN_FARM_DEBUG_FIXTURES: growthCase === 'supply' || growthCase === 'production' || growthCase === 'upgrade' || growthCase === 'research' ? 'true' : 'false',
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

async function runSupplyLifecycle() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => {
        if (message.type() === 'error') errors.console.push(message.text());
    });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) => errors.request.push(failed.url()));
    page.on('response', (response) => {
        if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`);
    });
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug));
        const before = await getGrowthSnapshot(page);
        const chickenId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyChickenFixture(3, 1050, 1050) ?? null,
        );
        assert.ok(chickenId, 'fixture chicken is created');
        const created = await getGrowthSnapshot(page);
        assert.equal(created.supply.used, before.supply.used + 1, 'creation increments used once');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.markEconomyChickenDeadForTest(id) ?? false, chickenId),
            true,
            'fixture chicken dies',
        );
        const removed = await getGrowthSnapshot(page);
        assert.equal(removed.supply.used, before.supply.used, 'death decrements used once');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.markEconomyChickenDeadForTest(id) ?? false, chickenId),
            false,
            'repeat removal is a no-op',
        );
        assert.deepEqual(await getGrowthSnapshot(page), removed, 'repeat removal does not change wallet');
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }
        return { case: 'supply', checks: { browserChickenLifecycle: true, pass: true }, errors, before, created, removed };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runProductionLifecycle() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) => errors.request.push(failed.url()));
    page.on('response', (response) => { if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`); });
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug));
        assert.equal(
            await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(1500, 100) ?? false),
            true,
            'fixture wallet receives recipe lumber',
        );
        const buildingId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('farm_house', 1050, 1050, 3) ?? null,
        );
        assert.ok(buildingId, 'completed farm house fixture exists');
        const before = await getGrowthSnapshot(page);
        const jobId = await page.evaluate((id) => window.__chickenFarmDebug?.requestDogProductionForTest(id) ?? null, buildingId);
        assert.ok(jobId, 'authorized farm house accepts dog production');
        const queued = await getGrowthSnapshot(page);
        assert.equal(queued.jobs.production.length, 1);
        assert.deepEqual(queued.supply, { available: before.supply.available - 1, cap: before.supply.cap, reserved: 1, used: 0 });
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setProductionExitBlockedForTest(true) ?? false), true);
        await page.evaluate(() => window.__chickenFarmDebug?.advanceProductionForTest(30));
        const exitWait = await getGrowthSnapshot(page);
        assert.equal(exitWait.jobs.production[0]?.state, 'exit_wait', 'blocked exit retains job');
        assert.equal(exitWait.supply.reserved, 1, 'blocked exit retains reservation');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.setBuildingRallyPointForTest(id, 1320, 1100) ?? false, buildingId),
            true,
            'rally point accepted',
        );
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setProductionExitBlockedForTest(false) ?? false), true);
        await page.evaluate(() => window.__chickenFarmDebug?.advanceProductionForTest(31));
        const completed = await getGrowthSnapshot(page);
        assert.deepEqual(completed.jobs.production, []);
        assert.deepEqual(completed.supply, { available: before.supply.available - 1, cap: before.supply.cap, reserved: 0, used: 1 });
        const state = await page.evaluate(() => window.__chickenFarmDebug?.getState() ?? null);
        assert.ok(
            state?.units.some((unit) => unit.id === `produced-${jobId}` && unit.templateId === 'dog'),
            'produced dog is a real controllable unit',
        );
        assert.equal(
            state?.units.find((unit) => unit.id === `produced-${jobId}`)?.currentCommandType,
            'move',
            'produced dog receives the rally movement command',
        );
        const destroyedJobId = await page.evaluate((id) => window.__chickenFarmDebug?.requestDogProductionForTest(id) ?? null, buildingId);
        assert.ok(destroyedJobId, 'second dog job is accepted before destruction');
        const beforeDestroy = await getGrowthSnapshot(page);
        assert.equal(beforeDestroy.supply.reserved, 1);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.damageBuildingForTest(id, 9_999) ?? false, buildingId),
            true,
            'enemy damage destroys the active producer',
        );
        const destroyed = await getGrowthSnapshot(page);
        assert.deepEqual(destroyed.jobs.production, [], 'destroyed producer clears active job');
        assert.equal(destroyed.supply.reserved, 0, 'destroyed producer releases reservation');
        assert.equal(destroyed.wallet.gold, beforeDestroy.wallet.gold, 'destroyed producer gives no cost refund');
        await page.evaluate(() => window.__chickenFarmDebug?.advanceProductionForTest(60));
        const late = await getGrowthSnapshot(page);
        assert.deepEqual(late.jobs.production, [], 'late completion cannot revive a destroyed producer job');
        const lateState = await page.evaluate(() => window.__chickenFarmDebug?.getState() ?? null);
        assert.equal(lateState?.units.some((unit) => unit.id === `produced-${destroyedJobId}`), false, 'destroyed job creates no ghost dog');
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        return {
            case: 'production',
            checks: { actualControllableDog: true, blockedExitRetainsReservation: true, destroyedProducerNoRefund: true, noLateGhostDog: true, pass: true, rallyMoveIssued: true, supplyCommittedOnce: true },
            errors,
            before,
            completed,
            destroyed,
            beforeDestroy,
            late,
            exitWait,
            queued,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runResearchLifecycle() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) => errors.request.push(failed.url()));
    page.on('response', (response) => { if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`); });
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug));
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(1_000, 1_000) ?? false), true);
        const providerId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('lumber_mill', 1050, 1050, 3) ?? null,
        );
        const provider2Id = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('lumber_mill', 1350, 1050, 3) ?? null,
        );
        assert.ok(providerId && provider2Id, 'two completed research providers exist');
        const before = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestResearchForTest(id, 'masonry') ?? null, providerId),
            providerId,
            'provider accepts declared research',
        );
        const queued = await getGrowthSnapshot(page);
        assert.equal(queued.research.queued.length, 1);
        assert.deepEqual(queued.wallet, { gold: before.wallet.gold - 55, lumber: before.wallet.lumber - 35 });
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestResearchForTest(id, 'masonry') ?? null, provider2Id),
            null,
            'owner cannot reserve the same next level twice',
        );
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.cancelResearchForTest(id) ?? false, providerId),
            true,
        );
        const cancelled = await getGrowthSnapshot(page);
        assert.deepEqual(cancelled.research.queued, []);
        assert.deepEqual(cancelled.wallet, before.wallet, 'player cancel restores full research cost');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestResearchForTest(id, 'masonry') ?? null, providerId),
            providerId,
        );
        const completing = await getGrowthSnapshot(page);
        const readyAt = (completing.research.queued[0] as { completeAtSec: number }).completeAtSec;
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceResearchForTest(deadline) ?? false, readyAt);
        const completed = await getGrowthSnapshot(page);
        assert.deepEqual(completed.research.queued, []);
        assert.deepEqual(completed.research.levels, [{ level: 1, researchId: 'masonry' }]);
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        return { case: 'research', checks: { duplicateBlocked: true, fullCancelRefund: true, levelOnce: true, pass: true }, before, cancelled, completed, errors, queued };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runUpgradeLifecycle() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) => errors.request.push(failed.url()));
    page.on('response', (response) => { if (response.status() >= 400) errors.response.push(`${response.status()} ${response.url()}`); });
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug));
        const marketId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('market', 1050, 1050, 3) ?? null,
        );
        assert.ok(marketId, 'market fixture exists');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        const beforePrerequisite = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, marketId),
            null,
            'target prerequisite rejects upgrade',
        );
        assert.deepEqual((await getGrowthSnapshot(page)).wallet, beforePrerequisite.wallet, 'prerequisite rejection does not charge');

        const wellId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('well_basic', 1250, 1050, 3) ?? null,
        );
        assert.ok(wellId, 'well fixture exists');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, wellId),
            null,
            'building without upgradeTo rejects as an illegal tier request',
        );

        const productionFarmId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('farm_house', 1050, 1300, 3) ?? null,
        );
        const upgradeFarmId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('farm_house', 1450, 1300, 3) ?? null,
        );
        assert.ok(productionFarmId && upgradeFarmId, 'two source farm fixtures exist');
        const lumberMillId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('lumber_mill', 1800, 1050, 3) ?? null,
        );
        const towerId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createCombatBuildingFixture('tower_scout', 1800, 1300) ?? null,
        );
        assert.ok(lumberMillId && towerId, 'tower upgrade prerequisite and source fixture exist');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.damageBuildingForTest(id, 100) ?? false, upgradeFarmId),
            true,
            'source building takes real combat damage before upgrade',
        );
        const damagedSource = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getCombatLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null,
        upgradeFarmId);
        assert.ok(damagedSource && damagedSource.hp < damagedSource.maxHp, 'source damage is observable');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        const productionJobId = await page.evaluate((id) => window.__chickenFarmDebug?.requestDogProductionForTest(id) ?? null, productionFarmId);
        assert.ok(productionJobId, 'source farm accepts production before upgrade');
        const duringProduction = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, productionFarmId),
            null,
            'production queue collision rejects upgrade',
        );
        assert.deepEqual((await getGrowthSnapshot(page)).wallet, duringProduction.wallet, 'queue collision does not charge');

        const startedId = await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, upgradeFarmId);
        assert.equal(startedId, upgradeFarmId, 'eligible source begins its canonical upgrade');
        const started = await getGrowthSnapshot(page);
        assert.equal(started.upgrades.length, 1);
        assert.deepEqual(started.upgrades[0], {
            buildingId: upgradeFarmId,
            completeAtSec: started.upgrades[0]!.completeAtSec,
            sourceTemplateId: 'farm_house',
            state: 'running',
            targetTemplateId: 'town_hall',
        });
        assert.deepEqual(started.wallet, { gold: duringProduction.wallet.gold - 80, lumber: duringProduction.wallet.lumber - 40 }, 'target cost is paid once at start');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, upgradeFarmId),
            null,
            'repeated upgrade request is rejected',
        );
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestDogProductionForTest(id) ?? null, upgradeFarmId),
            null,
            'upgrade collision rejects new production',
        );
        assert.deepEqual((await getGrowthSnapshot(page)).wallet, started.wallet, 'collision requests do not double charge');
        const towerBefore = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getCombatLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null,
        towerId);
        assert.deepEqual(towerBefore?.attack, { cooldownSec: 1.05, damage: 23, rangePx: 384 }, 'source tower attack profile is present');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, towerId),
            towerId,
            'tower begins its canonical combat upgrade',
        );

        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 0.1) ?? false, started.upgrades[0]!.completeAtSec);
        const completed = await getGrowthSnapshot(page);
        assert.deepEqual(completed.upgrades, [], 'ready job is consumed by the completion adapter exactly once');
        assert.ok(completed.tech.completeBuildingTemplateIds.includes('town_hall'), 'completion swaps to the target template');
        assert.equal(completed.supply.cap, started.supply.cap + 2, 'completed farm-to-town-hall swap refreshes supply cap');
        const upgradedBuilding = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getCombatLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null,
        upgradeFarmId);
        assert.ok(upgradedBuilding, 'upgraded building keeps its original entity ID');
        assert.equal(upgradedBuilding.ownerPlayerId, damagedSource.ownerPlayerId, 'upgrade preserves owner');
        assert.equal(upgradedBuilding.templateId, 'town_hall');
        assert.equal(upgradedBuilding.armor, 7, 'combat armor reflects target template');
        assert.equal(upgradedBuilding.maxHp, 600, 'target max HP is applied');
        assert.ok(upgradedBuilding.hp < upgradedBuilding.maxHp, 'upgrade does not fully heal prior damage');
        const upgradedTower = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getCombatLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null,
        towerId);
        assert.equal(upgradedTower?.templateId, 'tower_guard_small');
        assert.deepEqual(upgradedTower?.attack, { cooldownSec: 0.9, damage: 22, rangePx: 225 }, 'target attack profile replaces source tower stats atomically');
        const blockedTowerId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createCombatBuildingFixture('tower_scout', 2100, 1300) ?? null,
        );
        const blockerId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createCombatBuildingFixture('fence_wood', 2100, 1300) ?? null,
        );
        assert.ok(blockedTowerId && blockerId, 'overlap blocker fixture exists for completion validation');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, blockedTowerId),
            blockedTowerId,
            'blocked footprint upgrade is paid and starts normally',
        );
        const blockedRunning = await getGrowthSnapshot(page);
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 0.1) ?? false, blockedRunning.upgrades[0]!.completeAtSec);
        const blockedReady = await getGrowthSnapshot(page);
        assert.equal(blockedReady.upgrades[0]?.state, 'ready', 'overlapping target footprint remains adapter-ready without a partial swap');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.removeCompletedBuildingFixture(id) ?? false, blockerId),
            true,
            'blocker removal succeeds',
        );
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 1) ?? false, blockedReady.upgrades[0]!.completeAtSec);
        const resolvedAfterBlocker = await getGrowthSnapshot(page);
        assert.deepEqual(resolvedAfterBlocker.upgrades, [], 'cleared footprint completes the retained ready upgrade once');
        const resolvedTower = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getCombatLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null,
        blockedTowerId);
        assert.equal(resolvedTower?.templateId, 'tower_guard_small', 'retry applies target after space is valid');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(1000, 1000) ?? false), true);
        const workshopId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('workshop_lab', 2500, 1000, 3) ?? null,
        );
        const coopId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('coop_basic', 2500, 1400, 3) ?? null,
        );
        assert.ok(workshopId && coopId, 'coop upgrade prerequisite and source fixture exist');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, coopId),
            coopId,
            'coop begins its canonical tier upgrade',
        );
        const coopRunning = await getGrowthSnapshot(page);
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 0.1) ?? false, coopRunning.upgrades[0]!.completeAtSec);
        const coopCompleted = await getGrowthSnapshot(page);
        assert.deepEqual(coopCompleted.upgrades, [], 'coop completion adapter consumes its ready job');
        assert.ok(coopCompleted.tech.completeBuildingTemplateIds.includes('coop_mid'), 'world building reaches the target coop template');
        const upgradedCoop = await page.evaluate((id) =>
            window.__chickenFarmDebug?.getEconomyLifecycleSnapshot().coops.find((coop) => coop.id === id) ?? null,
        coopId);
        assert.equal(upgradedCoop?.kind, 'mid', 'world completion updates the stable coop economy entity tier');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, marketId),
            marketId,
            'market upgrade starts while its well prerequisite exists',
        );
        const prerequisiteRunning = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.removeCompletedBuildingFixture(id) ?? false, wellId),
            true,
            'prerequisite removal succeeds after the upgrade was accepted',
        );
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 0.1) ?? false, prerequisiteRunning.upgrades[0]!.completeAtSec);
        const prerequisiteRemovedCompletion = await getGrowthSnapshot(page);
        assert.ok(prerequisiteRemovedCompletion.tech.completeBuildingTemplateIds.includes('grand_market'), 'accepted upgrade is not retroactively invalidated by prerequisite removal');

        const cancelFarmId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('farm_house', 3000, 1400, 3) ?? null,
        );
        assert.ok(cancelFarmId, 'cancel source fixture exists');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, cancelFarmId),
            cancelFarmId,
            'cancel source upgrade starts',
        );
        const cancelPaid = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.cancelBuildingUpgradeForTest(id) ?? false, cancelFarmId),
            true,
            'player cancellation succeeds once',
        );
        const cancelled = await getGrowthSnapshot(page);
        assert.deepEqual(cancelled.upgrades, [], 'cancel removes the job');
        assert.deepEqual(cancelled.wallet, { gold: cancelPaid.wallet.gold + 60, lumber: cancelPaid.wallet.lumber + 30 }, 'cancel refunds 75% of town-hall target cost');
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.cancelBuildingUpgradeForTest(id) ?? false, cancelFarmId),
            false,
            'repeated cancellation is a no-op',
        );

        const destroyedFarmId = await page.evaluate(() =>
            window.__chickenFarmDebug?.createEconomyBuildingFixture('farm_house', 3350, 1400, 3) ?? null,
        );
        assert.ok(destroyedFarmId, 'destruction source fixture exists');
        assert.equal(await page.evaluate(() => window.__chickenFarmDebug?.setConstructionWalletForTest(500, 100) ?? false), true);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.requestBuildingUpgradeForTest(id) ?? null, destroyedFarmId),
            destroyedFarmId,
            'destruction source upgrade starts',
        );
        const destroyPaid = await getGrowthSnapshot(page);
        assert.equal(
            await page.evaluate((id) => window.__chickenFarmDebug?.damageBuildingForTest(id, 9_999) ?? false, destroyedFarmId),
            true,
            'enemy damage destroys upgrading source',
        );
        const destroyedUpgrade = await getGrowthSnapshot(page);
        assert.deepEqual(destroyedUpgrade.upgrades, [], 'destruction discards upgrade without a late callback');
        assert.deepEqual(destroyedUpgrade.wallet, destroyPaid.wallet, 'destruction gives no upgrade refund');
        await page.evaluate((deadline) => window.__chickenFarmDebug?.advanceProductionForTest(deadline + 60) ?? false, destroyPaid.upgrades[0]!.completeAtSec);
        const destroyedLate = await getGrowthSnapshot(page);
        assert.deepEqual(destroyedLate.upgrades, [], 'late deadline cannot restore destroyed building');
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        return {
            case: 'upgrade',
            checks: {
                illegalTierRejected: true,
                pass: true,
                prerequisiteNoCharge: true,
                productionUpgradeMutualExclusion: true,
                completionAdapterApplied: true,
                combatProfileRefreshed: true,
                damageFractionPreserved: true,
                economyCoopTierRefreshed: true,
                acceptedPrerequisiteLossCompletes: true,
                cancelRefundOnce: true,
                destroyedUpgradeNoRefundOrLateRestore: true,
                footprintCollisionDeferred: true,
                repeatedRequestSingleCharge: true,
                supplyTierRefreshed: true,
            },
            errors,
            duringProduction,
            completed,
            blockedReady,
            upgradedCoop,
            cancelled,
            destroyedLate,
            prerequisiteRemovedCompletion,
            resolvedAfterBlocker,
            started,
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
