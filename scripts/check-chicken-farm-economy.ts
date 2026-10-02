import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4178;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const economyCase = process.env.CHICKEN_FARM_ECONOMY_CASE ?? 'baseline';

if (economyCase !== 'baseline' && economyCase !== 'acquisition' && economyCase !== 'bootstrap' && economyCase !== 'laying' && economyCase !== 'all') {
    throw new Error(`Unsupported CHICKEN_FARM_ECONOMY_CASE: ${economyCase}`);
}

const artifactName =
    economyCase === 'baseline'
        ? 'economy_check_baseline.json'
        : economyCase === 'acquisition'
          ? 'economy_check_acquisition.json'
          : economyCase === 'bootstrap'
            ? 'economy_check_bootstrap.json'
            : economyCase === 'laying'
              ? 'economy_check_laying.json'
          : 'economy_check_all.json';
const artifactPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts', artifactName);

async function main() {
    const report =
        economyCase === 'baseline'
            ? await runWithServer(false, runBaseline)
            : economyCase === 'acquisition'
              ? await runAcquisitionCase()
              : economyCase === 'bootstrap'
                ? await runWithServer(false, runBootstrapCase)
                : economyCase === 'laying'
                  ? await runWithServer(false, runLayingCase)
              : {
                    case: economyCase,
                    checks: { pass: true },
                    baseline: await runWithServer(false, runBaseline),
                    acquisition: await runAcquisitionCase(),
                    bootstrap: await runWithServer(false, runBootstrapCase),
                    laying: await runWithServer(false, runLayingCase),
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
        const first = await getEconomySnapshot(page);
        const second = await getEconomySnapshot(page);
        assertReadOnlyBaseline(first, second);
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }
        return {
            case: economyCase,
            checks: { normalFixtureIsolation: true, pass: true, snapshotReadOnly: true },
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

async function runAcquisitionCase() {
    const normal = await runWithServer(false, runAcquisitionSuccessCase);
    const blocked = await runWithServer(true, runBlockedSpawnCase);
    return {
        case: economyCase,
        checks: {
            blockedSpawnPreservesCharge: true,
            normalActualInventoryInput: true,
            pass: true,
            repeatedUseStopsAtFiveCharges: true,
        },
        errors: { blocked: blocked.errors, normal: normal.errors },
        executionProfile: {
            blockedSpawnFixture: { debugFixtures: true, fixtureBuildingId: blocked.fixtureBuildingId },
            normalSuccess: { combatPoc: false, debugFixtures: false, startId: 3 },
        },
        snapshots: { blockedAfter: blocked.snapshot, exhausted: normal.exhausted, firstUse: normal.firstUse },
    };
}

async function runAcquisitionSuccessCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, false);
        const canvas = await getCanvasBounds(page);
        await selectFarmer(page, canvas);
        const before = await getEconomySnapshot(page);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 1,
            null,
            { timeout: 5_000 },
        );
        const firstUse = await getEconomySnapshot(page);
        assertAcquisitionDelta(before, firstUse, 1, 4, 'first use');
        const firstChicken = firstUse.chickens[0];
        if (!firstChicken || firstChicken.ownerPlayerId !== 3) {
            throw new Error(`First chicken owner mismatch: ${JSON.stringify(firstUse)}`);
        }

        for (let count = 2; count <= 5; count += 1) {
            await clickInventorySlot(page, canvas, 0);
            await page.waitForFunction(
                (expected) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === expected,
                count,
                { timeout: 5_000 },
            );
        }
        const exhausted = await getEconomySnapshot(page);
        assertAcquisitionDelta(before, exhausted, 5, 0, 'five charges');
        await clickInventorySlot(page, canvas, 0);
        const repeatedEmptySlot = await getEconomySnapshot(page);
        if (
            JSON.stringify(exhausted.chickens.map((chicken) => chicken.id)) !==
                JSON.stringify(repeatedEmptySlot.chickens.map((chicken) => chicken.id)) ||
            JSON.stringify(exhausted.inventories) !== JSON.stringify(repeatedEmptySlot.inventories) ||
            JSON.stringify(exhausted.wallet) !== JSON.stringify(repeatedEmptySlot.wallet)
        ) {
            throw new Error(`Empty acquisition slot changed state: ${JSON.stringify({ exhausted, repeatedEmptySlot })}`);
        }

        assertNoErrors(errors);
        return {
            case: 'acquisition_normal',
            errors,
            exhausted,
            firstUse,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runBlockedSpawnCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const farmer = await getFarmer(page);
        const fixtureBuildingId = await page.evaluate(
            ({ x, y }) => window.__chickenFarmDebug!.createPathBlockerFixture(x, y),
            { x: farmer.x, y: farmer.y },
        );
        if (!fixtureBuildingId) throw new Error('Failed to create blocked-spawn fixture');
        await selectFarmer(page, canvas);
        const before = await getEconomySnapshot(page);
        await clickInventorySlot(page, canvas, 0);
        const snapshot = await getEconomySnapshot(page);
        assertAcquisitionDelta(before, snapshot, 0, 5, 'blocked spawn');
        assertNoErrors(errors);
        return { errors, fixtureBuildingId, snapshot };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runBootstrapCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, false);
        const canvas = await getCanvasBounds(page);
        await selectFarmer(page, canvas);
        const before = await getEconomySnapshot(page);

        await clickInventorySlot(page, canvas, 1);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().activeStartItemPlacement?.itemRawcode === 'I009',
            null,
            { timeout: 5_000 },
        );
        await page.keyboard.press('Escape');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().activeStartItemPlacement === null,
            null,
            { timeout: 5_000 },
        );
        const afterCancel = await getEconomySnapshot(page);
        assertBootstrapUnchanged(before, afterCancel, 'I009 cancellation');

        const wellCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 1);
        await clickWorld(page, wellCalibration, { x: 3584, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'campfire'),
            null,
            { timeout: 5_000 },
        );
        const afterWell = await getEconomySnapshot(page);
        const well = requireCompleteBuilding(afterWell, 'campfire');
        assertStartItemSuccess(before, afterWell, 'I009', 1, well.id, 'campfire');

        const rejectedPlacementCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 2);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().activeStartItemPlacement?.itemRawcode === 'I00F',
            null,
            { timeout: 5_000 },
        );
        await clickWorld(page, rejectedPlacementCalibration, { x: 3584, y: 8896 });
        const afterRejectedPlacement = await getEconomySnapshot(page);
        if (
            afterRejectedPlacement.activeStartItemPlacement?.itemRawcode !== 'I00F' ||
            getFarmerItemCharges(afterRejectedPlacement, 'I00F') !== 1 ||
            afterRejectedPlacement.buildings.length !== afterWell.buildings.length
        ) {
            throw new Error(`I00F rejected placement changed state: ${JSON.stringify({ afterRejectedPlacement, afterWell })}`);
        }
        await page.keyboard.press('Escape');
        const marketCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 2);
        await clickWorld(page, marketCalibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'market'),
            null,
            { timeout: 5_000 },
        );
        const afterMarket = await getEconomySnapshot(page);
        const market = requireCompleteBuilding(afterMarket, 'market');
        assertStartItemSuccess(afterWell, afterMarket, 'I00F', 2, market.id, 'market');

        const selectMarketCalibration = await calibrateWorldInput(page, canvas);
        await clickWorld(page, selectMarketCalibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            (marketId) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.buildingId === marketId,
            market.id,
            { timeout: 5_000 },
        );
        await page.keyboard.press('e');
        await page.waitForFunction(
            () => {
                const wallet = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet;
                return wallet?.gold === 1400 && wallet.lumber === 70;
            },
            null,
            { timeout: 5_000 },
        );
        const afterExchange = await getEconomySnapshot(page);
        await page.waitForTimeout(200);
        const settled = await getEconomySnapshot(page);
        if (
            settled.wallet?.gold !== 1400 ||
            settled.wallet.lumber !== 70 ||
            settled.wallet.gold !== afterExchange.wallet?.gold ||
            settled.wallet.lumber !== afterExchange.wallet?.lumber ||
            settled.wallet.gold < 120 ||
            settled.wallet.lumber < 52
        ) {
            throw new Error(`Market exchange did not settle once or unlock coop: ${JSON.stringify({ afterExchange, settled })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'bootstrap',
            checks: {
                cancelledInstallPreservesCharge: true,
                coopResourcesReachable: true,
                failedInstallPreservesCharge: true,
                marketExchangeSingleInput: true,
                startItemsCreateCompleteBuildings: true,
            },
            errors,
            snapshots: { afterCancel, afterExchange, afterMarket, afterRejectedPlacement, afterWell, before, settled },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runLayingCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, false);
        const canvas = await getCanvasBounds(page);
        const wellCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 1);
        await clickWorld(page, wellCalibration, { x: 3584, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'campfire'),
            null,
            { timeout: 5_000 },
        );
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 1,
            null,
            { timeout: 5_000 },
        );
        const chicken = (await getEconomySnapshot(page)).chickens[0];
        if (!chicken || chicken.ownerPlayerId !== 3 || chicken.kind !== 'basic') {
            throw new Error(`Missing normal basic chicken: ${JSON.stringify(await getEconomySnapshot(page))}`);
        }
        await page.waitForFunction(
            (chickenId) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().fieldEggs.some((egg) => egg.sourceChickenId === chickenId),
            chicken.id,
            { timeout: 35_000 },
        );
        const afterDrop = await getEconomySnapshot(page);
        const egg = afterDrop.fieldEggs.find((candidate) => candidate.sourceChickenId === chicken.id);
        if (
            !egg ||
            egg.ownerPlayerId !== 3 ||
            egg.stackCount !== 1 ||
            egg.wellBuffed ||
            egg.droppedAtSec < 29.5 ||
            egg.droppedAtSec > 31.5
        ) {
            throw new Error(`Basic-well laying contract mismatch: ${JSON.stringify({ afterDrop, egg })}`);
        }
        await page.waitForTimeout(300);
        const settled = await getEconomySnapshot(page);
        if (settled.fieldEggs.filter((candidate) => candidate.sourceChickenId === chicken.id).length !== 1) {
            throw new Error(`Repeated update duplicated egg: ${JSON.stringify({ afterDrop, settled })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'laying',
            checks: {
                basicWellDoesNotAccelerateEggInterval: true,
                normalActualInventoryAndWorldInput: true,
                repeatedUpdateDoesNotDuplicateEgg: true,
                sourceOwnerAndStackAreExact: true,
            },
            errors,
            snapshots: { afterDrop, settled },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function requireCompleteBuilding(
    snapshot: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    templateId: 'campfire' | 'market',
) {
    const building = snapshot.buildings.find((candidate) => candidate.templateId === templateId);
    if (!building || building.state !== 'complete' || building.ownerPlayerId !== 3) {
        throw new Error(`Missing complete owner-3 ${templateId}: ${JSON.stringify(snapshot)}`);
    }
    return building;
}

function getFarmerItemCharges(
    snapshot: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    itemRawcode: 'I009' | 'I00F',
) {
    return snapshot.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.reduce(
        (total, slot) => total + (slot?.itemRawcode === itemRawcode ? slot.quantity : 0),
        0,
    ) ?? 0;
}

function assertBootstrapUnchanged(
    before: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    after: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    label: string,
) {
    if (
        getFarmerItemCharges(after, 'I009') !== 1 ||
        after.buildings.length !== before.buildings.length ||
        after.wallet?.gold !== before.wallet?.gold ||
        after.wallet?.lumber !== before.wallet?.lumber
    ) {
        throw new Error(`${label} changed economy state: ${JSON.stringify({ after, before })}`);
    }
}

function assertStartItemSuccess(
    before: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    after: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    itemRawcode: 'I009' | 'I00F',
    slotIndex: number,
    buildingId: string,
    templateId: 'campfire' | 'market',
) {
    if (
        after.activeStartItemPlacement !== null ||
        getFarmerItemCharges(after, itemRawcode) !== 0 ||
        after.buildings.length !== before.buildings.length + 1 ||
        !after.buildings.some((building) => building.id === buildingId && building.templateId === templateId) ||
        after.wallet?.gold !== before.wallet?.gold ||
        after.wallet?.lumber !== before.wallet?.lumber
    ) {
        throw new Error(`${itemRawcode} slot ${slotIndex} install mismatch: ${JSON.stringify({ after, before })}`);
    }
}

function assertReadOnlyBaseline(
    first: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    second: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
) {
    const sameState = (snapshot: typeof first) => ({ ...snapshot, elapsedSec: 0 });
    if (JSON.stringify(sameState(first)) !== JSON.stringify(sameState(second))) {
        throw new Error(`Economy snapshot changed state: ${JSON.stringify({ first, second })}`);
    }
    const farmer = first.inventories.find((inventory) => inventory.id === 'p3-farmer');
    const items = (farmer?.slots ?? []).filter((slot): slot is NonNullable<typeof slot> => slot !== null);
    if (
        first.runId !== 1 ||
        first.wallet?.gold !== 1500 ||
        first.wallet.lumber !== 0 ||
        first.wallet.supplyCap !== 3 ||
        first.wallet.supplyUsed !== 0 ||
        first.chickens.length !== 0 ||
        first.fieldEggs.length !== 0 ||
        first.hatchJobs.length !== 0 ||
        first.workerTasks.length !== 0 ||
        first.buildings.length !== 0 ||
        first.selected.buildingId !== null ||
        first.selected.economyEntityId !== null ||
        first.selected.unitIds.length !== 0 ||
        items.length !== 3 ||
        !items.some((item) => item.itemRawcode === 'I003' && item.quantity === 5) ||
        !items.some((item) => item.itemRawcode === 'I009' && item.quantity === 1) ||
        !items.some((item) => item.itemRawcode === 'I00F' && item.quantity === 1)
    ) {
        throw new Error(`Unexpected normal economy baseline: ${JSON.stringify(first)}`);
    }
}

async function getEconomySnapshot(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.evaluate(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot()) as Promise<ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>>;
}

function assertAcquisitionDelta(
    before: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    after: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    chickenDelta: number,
    expectedScrollCharges: number,
    label: string,
) {
    const beforeCharges = getFarmerScrollCharges(before);
    const afterCharges = getFarmerScrollCharges(after);
    if (
        after.chickens.length !== before.chickens.length + chickenDelta ||
        afterCharges !== expectedScrollCharges ||
        before.wallet?.gold !== after.wallet?.gold ||
        before.wallet?.lumber !== after.wallet?.lumber ||
        before.wallet?.supplyUsed !== after.wallet?.supplyUsed
    ) {
        throw new Error(`${label} acquisition mismatch: ${JSON.stringify({ after, before })}`);
    }
}

function getFarmerScrollCharges(snapshot: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>) {
    return snapshot.inventories
        .find((inventory) => inventory.id === 'p3-farmer')
        ?.slots.reduce((total, slot) => total + (slot?.itemRawcode === 'I003' ? slot.quantity : 0), 0) ?? 0;
}

function createErrorCollector(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    const errors = { console: [] as string[], page: [] as string[], request: [] as string[], response: [] as string[] };
    page.on('console', (message) => {
        if (message.type() === 'error') errors.console.push(message.text());
    });
    page.on('pageerror', (error) => errors.page.push(error.message));
    page.on('requestfailed', (failed) => errors.request.push(`${failed.method()} ${failed.url()} ${failed.failure()?.errorText}`));
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

async function prepareEconomySession(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    expectsDebugFixtures: boolean,
    navigate = true,
) {
    if (navigate) await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(
        () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
        null,
        { timeout: 15_000 },
    );
    const snapshot = await getEconomySnapshot(page);
    if (expectsDebugFixtures !== (await page.evaluate(() => window.__chickenFarmDebug!.getState().debugPoc.fixturesEnabled))) {
        throw new Error(`Unexpected fixture profile: ${JSON.stringify(snapshot)}`);
    }
}

async function getCanvasBounds(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.locator('canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    }) as Promise<{ readonly height: number; readonly left: number; readonly top: number; readonly width: number }>;
}

async function getFarmer(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    const farmer = await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot().units.find((unit) => unit.id === 'p3-farmer'));
    if (!farmer) throw new Error('Missing p3 farmer');
    return farmer;
}

async function selectFarmer(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    const farmer = await getFarmer(page);
    const calibration = await calibrateWorldInput(page, canvas);
    await clickWorld(page, calibration, { x: farmer.x, y: farmer.y });
    await page.waitForFunction(
        () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.unitIds.includes('p3-farmer'),
        null,
        { timeout: 5_000 },
    );
}

async function calibrateWorldInput(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
) {
    await page.mouse.click(canvas.left, canvas.top);
    const calibrationWorldPoint = await page.evaluate(
        () => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint,
    );
    const referencePoint = { x: canvas.left + canvas.width / 4, y: canvas.top + canvas.height / 4 };
    await page.mouse.click(referencePoint.x, referencePoint.y);
    const referenceWorldPoint = await page.evaluate(
        () => window.__chickenFarmDebug!.getControlSnapshot().lastPrimaryClickWorldPoint,
    );
    if (!calibrationWorldPoint || !referenceWorldPoint) {
        throw new Error('Missing world-coordinate calibration');
    }
    return {
        calibrationPoint: { x: canvas.left, y: canvas.top },
        calibrationWorldPoint,
        referencePoint,
        referenceWorldPoint,
    };
}

async function clickWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Awaited<ReturnType<typeof calibrateWorldInput>>,
    point: { readonly x: number; readonly y: number },
) {
    const scaleX =
        (calibration.referenceWorldPoint.x - calibration.calibrationWorldPoint.x) /
        (calibration.referencePoint.x - calibration.calibrationPoint.x);
    const scaleY =
        (calibration.referenceWorldPoint.y - calibration.calibrationWorldPoint.y) /
        (calibration.referencePoint.y - calibration.calibrationPoint.y);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX === 0 || scaleY === 0) {
        throw new Error(`Invalid world calibration: ${JSON.stringify(calibration)}`);
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
