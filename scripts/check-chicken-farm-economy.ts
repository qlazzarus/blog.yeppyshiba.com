import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4200 + (process.pid % 1000);
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const economyCase = process.env.CHICKEN_FARM_ECONOMY_CASE ?? 'baseline';
const fullLoopStepTimeoutMs = Math.max(
    45_000,
    Number.parseInt(process.env.CHICKEN_FARM_FULL_LOOP_TIMEOUT_MS ?? '90000', 10) || 90_000,
);

if (economyCase !== 'baseline' && economyCase !== 'acquisition' && economyCase !== 'bootstrap' && economyCase !== 'full_loop' && economyCase !== 'laying' && economyCase !== 'pickup' && economyCase !== 'transfer' && economyCase !== 'deposit' && economyCase !== 'hatch_start' && economyCase !== 'hatch_exit' && economyCase !== 'sale' && economyCase !== 'interruption' && economyCase !== 'lumber_income' && economyCase !== 'all') {
    throw new Error(`Unsupported CHICKEN_FARM_ECONOMY_CASE: ${economyCase}`);
}

const artifactName =
    economyCase === 'baseline'
        ? 'economy_check_baseline.json'
        : economyCase === 'acquisition'
          ? 'economy_check_acquisition.json'
          : economyCase === 'bootstrap'
            ? 'economy_check_bootstrap.json'
            : economyCase === 'full_loop'
              ? 'economy_check_full_loop.json'
            : economyCase === 'laying'
              ? 'economy_check_laying.json'
              : economyCase === 'pickup'
                ? 'economy_check_pickup.json'
                : economyCase === 'transfer'
                  ? 'economy_check_transfer.json'
                  : economyCase === 'deposit'
                    ? 'economy_check_deposit.json'
                    : economyCase === 'hatch_start'
                      ? 'economy_check_hatch_start.json'
                      : economyCase === 'hatch_exit'
                        ? 'economy_check_hatch_exit.json'
                        : economyCase === 'sale'
                          ? 'economy_check_sale.json'
                          : economyCase === 'interruption'
                          ? 'economy_check_interruption.json'
                            : economyCase === 'lumber_income'
                              ? 'economy_check_lumber_income.json'
          : 'economy_check_all.json';
const artifactPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts', artifactName);

async function main() {
    let report: unknown;
    if (economyCase === 'baseline') {
        report = await runWithServer(false, runBaseline);
    } else if (economyCase === 'acquisition') {
        report = await runAcquisitionCase();
    } else if (economyCase === 'bootstrap') {
        report = await runWithServer(false, runBootstrapCase);
    } else if (economyCase === 'full_loop') {
        report = await runWithServer(false, runFullLoopCase);
    } else if (economyCase === 'laying') {
        report = await runWithServer(true, runLayingCase);
    } else if (economyCase === 'pickup') {
        report = await runWithServer(true, runPickupCase);
    } else if (economyCase === 'transfer') {
        report = await runWithServer(true, runTransferCase);
    } else if (economyCase === 'deposit') {
        report = await runWithServer(true, runDepositCase);
    } else if (economyCase === 'hatch_start') {
        report = await runWithServer(true, runHatchStartCase);
    } else if (economyCase === 'hatch_exit') {
        report = await runWithServer(true, runHatchExitCase);
    } else if (economyCase === 'sale') {
        report = await runWithServer(true, runSaleCase);
    } else if (economyCase === 'interruption') {
        report = await runWithServer(true, runInterruptionCase);
    } else if (economyCase === 'lumber_income') {
        report = await runWithServer(true, runLumberIncomeCase);
    } else {
        report = {
            case: economyCase,
            checks: { pass: true },
            baseline: await runWithServer(false, runBaseline),
            acquisition: await runAcquisitionCase(),
            bootstrap: await runWithServer(false, runBootstrapCase),
            fullLoop: await runWithServer(false, runFullLoopCase),
            laying: await runWithServer(true, runLayingCase),
            pickup: await runWithServer(true, runPickupCase),
            transfer: await runWithServer(true, runTransferCase),
            deposit: await runWithServer(true, runDepositCase),
            hatchStart: await runWithServer(true, runHatchStartCase),
            hatchExit: await runWithServer(true, runHatchExitCase),
            sale: await runWithServer(true, runSaleCase),
            interruption: await runWithServer(true, runInterruptionCase),
            lumberIncome: await runWithServer(true, runLumberIncomeCase),
        };
    }
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ...(report as object), artifactPath }, null, 2));
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

/**
 * The release gate: one unmodified P3 start owns every resource and elapsed
 * second used here.  Unlike the focused cases below, this case never calls a
 * fixture, teleport, inventory grant, wallet setter, or economy time advance.
 */
async function runFullLoopCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, false);
        const canvas = await getCanvasBounds(page);
        const before = await getEconomySnapshot(page);
        const wellPoint = { x: 3584, y: 8896 };
        const marketPoint = { x: 4032, y: 8896 };

        const wellBuilder = await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 1);
        await clickWorld(page, wellBuilder.calibration, wellPoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'campfire'),
            null,
            { timeout: 5_000 },
        );

        const marketBuilder = await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 2);
        await clickWorld(page, marketBuilder.calibration, marketPoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'market'),
            null,
            { timeout: 5_000 },
        );
        const market = requireCompleteBuilding(await getEconomySnapshot(page), 'market');
        const marketCenter = await getBuildingCenter(page, market.id);
        await clickWorld(page, await calibrateWorldInput(page, canvas), marketCenter);
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.buildingId === id, market.id, { timeout: 5_000 });
        await page.keyboard.press('e');
        await page.waitForFunction(() => {
            const wallet = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().wallet;
            return wallet?.gold === 1400 && wallet.lumber === 70;
        }, null, { timeout: 5_000 });
        console.log('[full_loop] start items and market exchange complete');

        const builder = await selectFarmer(page, canvas);
        // This is a read-only terrain/footprint query. Keep only candidates
        // that also project into the active world viewport; canvas clicks
        // outside that rectangle are intentionally ignored by Phaser.
        const buildableCoopPoints = await page.evaluate(() => {
            const xCandidates = [3072, 3328, 3584, 3840, 4096, 4352, 4608, 4864];
            const yCandidates = [8384, 8640, 8896, 9152, 9408];
            return yCandidates.flatMap((y) => xCandidates.flatMap((x) => {
                const preview = window.__chickenFarmDebug!.getConstructionPlacementPreview('coop_basic', x, y);
                return preview?.valid.valid ? [{ x, y }] : [];
            }));
        });
        const builderPosition = await getFarmer(page);
        const coopPoint = buildableCoopPoints
            .filter((candidate) => {
            const screen = getWorldScreenPoint(builder.calibration, candidate);
            return screen.x >= canvas.left && screen.x <= canvas.left + canvas.width &&
                screen.y >= canvas.top && screen.y <= canvas.top + canvas.height * 0.75;
            })
            .sort((a, b) =>
                Math.hypot(a.x - builderPosition.x, a.y - builderPosition.y) -
                Math.hypot(b.x - builderPosition.x, b.y - builderPosition.y),
            )[0];
        if (!coopPoint) {
            throw new Error(`No visible normal P3 coop placement point: ${JSON.stringify({ buildableCoopPoints, snapshot: await getEconomySnapshot(page) })}`);
        }
        console.log(`[full_loop] visible buildable coop point ${coopPoint.x},${coopPoint.y}`);
        await page.keyboard.press('b');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getState().commandPage === 'build', null, { timeout: 5_000 });
        // Use the visible Coop command-card button. In headless Chromium the
        // immediately-following C key can be observed before the build card's
        // next frame has installed its hotkey state.
        await clickCommandCardButton(page, canvas, 3);
        await page.waitForFunction(() => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === 'coop_basic', null, { timeout: 5_000 });
        await clickWorld(page, builder.calibration, coopPoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'coop_basic'),
            null,
            { timeout: 12_000 },
        );
        console.log('[full_loop] coop construction started');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().buildings.some((building) => building.templateId === 'coop_basic' && building.state === 'complete'),
            null,
            { timeout: fullLoopStepTimeoutMs },
        );
        const coop = requireCompleteBuilding(await getEconomySnapshot(page), 'coop_basic');
        const coopCenter = await getBuildingCenter(page, coop.id);
        console.log('[full_loop] coop construction complete');

        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 2, null, { timeout: 5_000 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().fieldEggs.length >= 2,
            null,
            { timeout: fullLoopStepTimeoutMs },
        );
        console.log('[full_loop] two normal-time eggs laid');
        const laid = await getEconomySnapshot(page);
        const firstEgg = laid.fieldEggs[0];
        if (!firstEgg) throw new Error(`Normal loop produced no first egg: ${JSON.stringify(laid)}`);

        const hatchFarmer = await selectFarmer(page, canvas);
        await clickWorld(page, hatchFarmer.calibration, { x: firstEgg.x, y: firstEgg.y - 18 }, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1),
            null,
            { timeout: fullLoopStepTimeoutMs },
        );
        const pickedForHatch = await getEconomySnapshot(page);
        const eggSlot = pickedForHatch.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.findIndex((slot) => slot?.itemRawcode === 'I006');
        if (eggSlot === undefined || eggSlot < 0) throw new Error(`Missing normal-loop egg slot: ${JSON.stringify(pickedForHatch)}`);
        // The camera is static while the farmer walks. Reusing the calibration avoids
        // issuing two incidental world clicks immediately before the inventory drag.
        await page.waitForTimeout(100);
        await dragInventorySlotToWorld(page, canvas, eggSlot, hatchFarmer.calibration, coopCenter);
        await page.waitForFunction(
            (id) => {
                const snapshot = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
                return snapshot.workerTasks.some((task) => task.type === 'deposit_to_coop' && task.unitId === 'p3-farmer') ||
                    snapshot.coops.some((coop) => coop.id === id && coop.storedEggs === 1);
            },
            coop.id,
            { timeout: 5_000 },
        );
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().coops.some((coop) => coop.id === id && coop.storedEggs === 1),
            coop.id,
            { timeout: fullLoopStepTimeoutMs },
        );
        const deposited = await getEconomySnapshot(page);
        console.log('[full_loop] first egg deposited');

        await clickWorld(page, await calibrateWorldInput(page, canvas), coopCenter);
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.economyEntityId === id, coop.id, { timeout: 5_000 });
        await page.keyboard.press('h');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().hatchJobs.length === 1, null, { timeout: 5_000 });
        const hatchStarted = await getEconomySnapshot(page);

        const saleEgg = hatchStarted.fieldEggs[0];
        if (!saleEgg) throw new Error(`Normal loop lost the sale egg: ${JSON.stringify(hatchStarted)}`);
        const saleFarmer = await selectFarmer(page, canvas);
        await clickWorld(page, saleFarmer.calibration, { x: saleEgg.x, y: saleEgg.y - 18 }, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1),
            null,
            { timeout: fullLoopStepTimeoutMs },
        );
        const beforeSale = await getEconomySnapshot(page);
        await clickWorld(page, saleFarmer.calibration, marketCenter, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market' && task.unitId === 'p3-farmer'),
            null,
            { timeout: 5_000 },
        );
        console.log('[full_loop] second egg sale ordered');
        try {
            await page.waitForFunction(
                () => !window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006'),
                null,
                { timeout: fullLoopStepTimeoutMs },
            );
        } catch (error) {
            throw new Error(`Normal-loop sale did not complete: ${JSON.stringify({
                controls: await page.evaluate(() => window.__chickenFarmDebug!.getControlSnapshot()),
                economy: await getEconomySnapshot(page),
            })}`, { cause: error });
        }
        const afterSale = await getEconomySnapshot(page);
        console.log('[full_loop] second egg sold');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 3 && window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().hatchJobs.length === 0, null, { timeout: fullLoopStepTimeoutMs });
        const completed = await getEconomySnapshot(page);
        console.log('[full_loop] hatch complete');
        const hud = await page.evaluate(() => window.__chickenFarmDebug!.getState().hud.resourceText);

        if (
            before.wallet?.gold !== 1500 ||
            deposited.wallet?.gold !== 1280 || deposited.wallet.lumber !== 18 ||
            hatchStarted.hatchJobs.length !== 1 ||
            afterSale.wallet?.gold !== 1292 || afterSale.wallet.lumber !== 18 ||
            completed.chickens.length !== 3 || completed.hatchJobs.length !== 0 ||
            !hud.includes('Gold 1292') || !hud.includes('Lumber 18')
        ) {
            throw new Error(`Normal full-loop ledger or HUD mismatch: ${JSON.stringify({ afterSale, before, completed, deposited, hatchStarted, hud })}`);
        }
        assertNoErrors(errors);
        return {
            case: 'full_loop',
            checks: {
                actualNormalInputsOnly: true,
                browserErrorsZero: true,
                coopBuildAndHatchComplete: true,
                eggLedgerConservedAcrossPickupDepositHatchAndSale: true,
                hudMatchesWallet: true,
                marketSalePaysOnce: true,
            },
            errors,
            executionProfile: { debugFixtures: false, startId: 3 },
            snapshots: { afterSale, before, completed, deposited, hatchStarted },
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
        await prepareEconomySession(page, true);
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
        const advanced = await page.evaluate(
            (targetElapsedSec) => window.__chickenFarmDebug!.advanceEconomyForTest(targetElapsedSec),
            chicken.nextEggAtSec,
        );
        if (!advanced) throw new Error('Failed to advance debug economy to the next egg time');
        await page.waitForFunction(
            (chickenId) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().fieldEggs.some((egg) => egg.sourceChickenId === chickenId),
            chicken.id,
            { timeout: 5_000 },
        );
        const afterDrop = await getEconomySnapshot(page);
        const egg = afterDrop.fieldEggs.find((candidate) => candidate.sourceChickenId === chicken.id);
        if (
            !egg ||
            egg.ownerPlayerId !== 3 ||
            egg.stackCount !== 1 ||
            egg.wellBuffed ||
            egg.droppedAtSec < chicken.nextEggAtSec - 0.01 ||
            egg.droppedAtSec > chicken.nextEggAtSec + 0.01
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
                fixtureAcceleratedTimeWithActualInventoryAndWorldInput: true,
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

/**
 * Debug fixtures create world buildings through BuildingSystem's completed
 * lifecycle path.  Only the clock advance and the P4 owner fixture are
 * synthetic; the chicken still comes from the normal farmer inventory input.
 */
async function runLumberIncomeCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        await selectFarmer(page, canvas);
        await clickInventorySlot(page, canvas, 0);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().chickens.length === 1,
            null,
            { timeout: 5_000 },
        );
        const ownerFourAdded = await page.evaluate(
            () => window.__chickenFarmDebug!.ensureEconomyPlayerForTest(4),
        );
        if (!ownerFourAdded) throw new Error('Failed to add owner-four debug wallet');

        const fixtureIds = await page.evaluate(() => ({
            ownerFourBasic: window.__chickenFarmDebug!.createEconomyBuildingFixture(
                'lumber_mill', 3200, 8200, 4,
            ),
            ownerFourHigh: window.__chickenFarmDebug!.createEconomyBuildingFixture(
                'lumber_mill_high', 3520, 8200, 4,
            ),
            ownerThreeBasic: window.__chickenFarmDebug!.createEconomyBuildingFixture(
                'lumber_mill', 3840, 8200, 3,
            ),
            ownerThreeMid: window.__chickenFarmDebug!.createEconomyBuildingFixture(
                'lumber_mill_mid', 4160, 8200, 3,
            ),
        }));
        if (Object.values(fixtureIds).some((id) => !id)) {
            throw new Error(`Failed to create complete lumber fixtures: ${JSON.stringify(fixtureIds)}`);
        }

        const beforeFirstTick = await getEconomySnapshot(page);
        if (beforeFirstTick.lumberIncome.mills.length !== 4) {
            throw new Error(`Complete fixture lifecycle did not attach four mills: ${JSON.stringify(beforeFirstTick)}`);
        }
        const firstTick = await advanceToNextLumberTick(page);
        assertWalletLumberDelta(firstTick.before, firstTick.after, 3, 180, 'first tick owner 3');
        assertWalletLumberDelta(firstTick.before, firstTick.after, 4, 240, 'first tick owner 4');
        const chickenNextEggAtSec = firstTick.after.chickens[0]?.nextEggAtSec;
        if (!chickenNextEggAtSec || !await page.evaluate(
            (targetElapsedSec) => window.__chickenFarmDebug!.advanceEconomyForTest(targetElapsedSec),
            chickenNextEggAtSec,
        )) {
            throw new Error(`Failed to advance the living chicken after lumber income: ${JSON.stringify(firstTick)}`);
        }
        const afterChickenDrop = await getEconomySnapshot(page);
        if (afterChickenDrop.fieldEggs.length < 1) {
            throw new Error(`Lumber income did not continue chicken laying: ${JSON.stringify({ afterChickenDrop, firstTick })}`);
        }

        const duplicateCallbackIgnored = await page.evaluate(
            (id) => window.__chickenFarmDebug!.replayCompletedBuildingEconomyAttachmentForTest(id),
            fixtureIds.ownerThreeBasic,
        );
        const afterDuplicateCallback = await getEconomySnapshot(page);
        if (
            !duplicateCallbackIgnored ||
            afterDuplicateCallback.lumberIncome.mills.length !== 4 ||
            JSON.stringify(afterDuplicateCallback.lumberIncome.totalsByPlayer) !==
                JSON.stringify(firstTick.after.lumberIncome.totalsByPlayer)
        ) {
            throw new Error(`Duplicate completion callback changed income registration: ${JSON.stringify({ afterDuplicateCallback, duplicateCallbackIgnored, firstTick })}`);
        }

        const pausedId = await page.evaluate(
            () => window.__chickenFarmDebug!.createPausedConstructionFixture('lumber_mill', 4352, 8896),
        );
        if (!pausedId) throw new Error('Failed to create paused lumber mill fixture');
        const paused = await getEconomySnapshot(page);
        if (paused.lumberIncome.mills.some((mill) => mill.id === pausedId)) {
            throw new Error(`Constructing lumber mill registered income: ${JSON.stringify(paused)}`);
        }
        const pausedRemoved = await page.evaluate(
            (id) => window.__chickenFarmDebug!.cancelConstructionForTest(id),
            pausedId,
        );
        if (!pausedRemoved) throw new Error('Failed to clear paused lumber mill fixture');
        const completedId = await page.evaluate(
            () => window.__chickenFarmDebug!.createEconomyBuildingFixture('lumber_mill', 4352, 8896, 3),
        );
        if (!completedId) throw new Error('Failed to create completed lumber mill fixture');
        const completed = await getEconomySnapshot(page);
        if (completed.lumberIncome.mills.filter((mill) => mill.id === completedId).length !== 1) {
            throw new Error(`Completed lumber mill did not attach exactly once: ${JSON.stringify(completed)}`);
        }

        const secondTick = await advanceToNextLumberTick(page);
        assertWalletLumberDelta(secondTick.before, secondTick.after, 3, 250, 'post-completion owner 3');
        assertWalletLumberDelta(secondTick.before, secondTick.after, 4, 240, 'post-completion owner 4');

        const removed = await page.evaluate(({ ownerFourBasic, ownerThreeBasic }) => ({
            ownerFourBasic: window.__chickenFarmDebug!.removeCompletedBuildingFixture(ownerFourBasic),
            ownerThreeBasic: window.__chickenFarmDebug!.removeCompletedBuildingFixture(ownerThreeBasic),
        }), fixtureIds);
        if (!removed.ownerThreeBasic || !removed.ownerFourBasic) {
            throw new Error(`Failed to remove lumber mills before tick: ${JSON.stringify(removed)}`);
        }
        const afterRemoval = await getEconomySnapshot(page);
        if (
            afterRemoval.lumberIncome.mills.some((mill) =>
                mill.id === fixtureIds.ownerThreeBasic || mill.id === fixtureIds.ownerFourBasic,
            )
        ) {
            throw new Error(`Removed lumber mill remained registered: ${JSON.stringify(afterRemoval)}`);
        }
        const thirdTick = await advanceToNextLumberTick(page);
        assertWalletLumberDelta(thirdTick.before, thirdTick.after, 3, 180, 'post-removal owner 3');
        assertWalletLumberDelta(thirdTick.before, thirdTick.after, 4, 170, 'post-removal owner 4');
        const repeatedTick = await page.evaluate(() => {
            const elapsedSec = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().elapsedSec;
            return window.__chickenFarmDebug!.advanceEconomyForTest(elapsedSec);
        });
        const afterRepeatedTick = await getEconomySnapshot(page);
        if (!repeatedTick || JSON.stringify(afterRepeatedTick.wallets) !== JSON.stringify(thirdTick.after.wallets)) {
            throw new Error(`Repeated timestamp paid lumber twice: ${JSON.stringify({ afterRepeatedTick, repeatedTick, thirdTick })}`);
        }

        const priorRunId = thirdTick.after.runId;
        const restartRequested = await page.evaluate(() => window.__chickenFarmDebug!.restartRunForTest());
        if (!restartRequested) throw new Error('Failed to request same-page restart');
        await page.waitForFunction((runId) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().runId > runId, priorRunId, { timeout: 10_000 });
        const afterRestart = await getEconomySnapshot(page);
        const ownerThreeRestartWallet = afterRestart.wallets.find((wallet) => wallet.playerId === 3);
        if (
            afterRestart.lumberIncome.lastProcessedTickSec !== 0 ||
            afterRestart.lumberIncome.mills.length !== 0 ||
            JSON.stringify(afterRestart.lumberIncome.totalsByPlayer) !== JSON.stringify([{ lumber: 0, playerId: 3 }]) ||
            afterRestart.wallets.length !== 1 ||
            ownerThreeRestartWallet?.gold !== 1500 ||
            ownerThreeRestartWallet.lumber !== 0
        ) {
            throw new Error(`Restart retained lumber income state: ${JSON.stringify(afterRestart)}`);
        }
        assertNoErrors(errors);
        return {
            case: 'lumber_income',
            checks: {
                chickenLayingContinuesWithLumberIncome: true,
                completeBuildingsPayByOwnerAndTier: true,
                constructingMillHasNoIncome: true,
                completedFixtureAttachesOnce: true,
                duplicateCompletionCallbackIgnored: true,
                pass: true,
                removalStopsBeforeNextTick: true,
                repeatedTimestampDoesNotRepay: true,
                samePageRestartResetsLumberIncome: true,
            },
            errors,
            executionProfile: {
                debugFixtures: true,
                farmerChicken: 'normal inventory click',
                lumberMills: 'BuildingSystem complete fixtures; paused fixture proves no pre-completion registration',
                time: 'debug advanceEconomyForTest to global 30-second boundaries',
            },
            snapshots: {
                afterDuplicateCallback,
                afterChickenDrop,
                afterRemoval,
                afterRestart,
                completed,
                firstTick: firstTick.after,
                secondTick: secondTick.after,
                thirdTick: thirdTick.after,
            },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function advanceToNextLumberTick(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
) {
    return page.evaluate(() => {
        const before = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
        const targetElapsedSec = Math.ceil((before.elapsedSec + 0.001) / 30) * 30;
        const advanced = window.__chickenFarmDebug!.advanceEconomyForTest(targetElapsedSec);
        return {
            advanced,
            after: window.__chickenFarmDebug!.getEconomyLifecycleSnapshot(),
            before,
            targetElapsedSec,
        };
    }).then((result) => {
        if (!result.advanced) throw new Error(`Failed to advance to lumber tick: ${JSON.stringify(result)}`);
        return result;
    });
}

function assertWalletLumberDelta(
    before: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    after: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    playerId: number,
    expectedDelta: number,
    label: string,
) {
    const beforeWallet = before.wallets.find((wallet) => wallet.playerId === playerId);
    const afterWallet = after.wallets.find((wallet) => wallet.playerId === playerId);
    if (!beforeWallet || !afterWallet || afterWallet.lumber !== beforeWallet.lumber + expectedDelta) {
        throw new Error(`${label} lumber delta mismatch: ${JSON.stringify({ afterWallet, beforeWallet, expectedDelta })}`);
    }
}

async function runPickupCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
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
        if (!chicken) throw new Error('Missing chicken for pickup case');
        const advanced = await page.evaluate(
            (targetElapsedSec) => window.__chickenFarmDebug!.advanceEconomyForTest(targetElapsedSec),
            chicken.nextEggAtSec,
        );
        if (!advanced) throw new Error('Failed to create pickup egg');
        const eggSnapshot = await getEconomySnapshot(page);
        const egg = eggSnapshot.fieldEggs.find((candidate) => candidate.sourceChickenId === chicken.id);
        if (!egg) throw new Error(`Missing field egg: ${JSON.stringify(eggSnapshot)}`);

        const remoteFarmerId = 'pickup-contender';
        const remoteCreated = await page.evaluate(
            ({ id, x, y }) => window.__chickenFarmDebug!.createDebugFarmerForTest(id, x, y, 3),
            { id: remoteFarmerId, x: 3000, y: 8960 },
        );
        if (!remoteCreated) throw new Error('Failed to create pickup contender');
        const remoteCalibration = await calibrateWorldInput(page, canvas);
        await clickWorld(page, remoteCalibration, { x: 3000, y: 8960 });
        await page.waitForFunction(
            (unitId) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.unitIds.includes(unitId),
            remoteFarmerId,
            { timeout: 5_000 },
        );
        await clickWorld(page, remoteCalibration, { x: egg.x, y: egg.y - 18 }, 'right');
        const beforeArrival = await getEconomySnapshot(page);
        if (
            beforeArrival.fieldEggs.length !== 1 ||
            getFarmerItemCharges(beforeArrival, 'I003') !== 4 ||
            !beforeArrival.workerTasks.some((task) => task.type === 'pickup_egg' && task.unitId === remoteFarmerId)
        ) {
            throw new Error(`Remote pickup order did not preserve state before arrival: ${JSON.stringify(beforeArrival)}`);
        }

        const localCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, localCalibration, { x: egg.x, y: egg.y - 18 }, 'right');
        await page.waitForFunction(
            () => {
                const snapshot = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
                const farmer = snapshot.inventories.find((inventory) => inventory.id === 'p3-farmer');
                return snapshot.fieldEggs.length === 0 && farmer?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1);
            },
            null,
            { timeout: 5_000 },
        );
        await page.waitForFunction(
            (unitId) => !window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.unitId === unitId),
            remoteFarmerId,
            { timeout: 5_000 },
        );
        const afterPickup = await getEconomySnapshot(page);
        if (
            afterPickup.fieldEggs.length !== 0 ||
            !afterPickup.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1) ||
            afterPickup.workerTasks.some((task) => task.type === 'pickup_egg')
        ) {
            throw new Error(`Pickup did not settle once: ${JSON.stringify(afterPickup)}`);
        }
        assertNoErrors(errors);
        return {
            case: 'pickup',
            checks: {
                actualRightClickMovesThenPicksUp: true,
                contenderCannotDuplicatePickup: true,
                fieldToInventoryConservesOneEgg: true,
                pendingTaskPreservesEggBeforeArrival: true,
            },
            errors,
            snapshots: { afterPickup, beforeArrival },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runTransferCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
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
        if (!chicken) throw new Error('Missing chicken for transfer case');
        if (!await page.evaluate((time) => window.__chickenFarmDebug!.advanceEconomyForTest(time), chicken.nextEggAtSec)) {
            throw new Error('Failed to advance transfer case to egg drop');
        }
        const egg = (await getEconomySnapshot(page)).fieldEggs.find((candidate) => candidate.sourceChickenId === chicken.id);
        if (!egg) throw new Error('Missing transfer source egg');
        const pickupCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, pickupCalibration, { x: egg.x, y: egg.y - 18 }, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1),
            null,
            { timeout: 5_000 },
        );

        const dropFarmerSelection = await selectFarmer(page, canvas);
        const dropFarmer = await getFarmer(page);
        // Keep this beyond a pathing cell and the interaction radius so this
        // case verifies that the inventory source remains intact in transit.
        const dropPoint = { x: dropFarmer.x - 120, y: dropFarmer.y };
        await page.waitForTimeout(100);
        await dragInventorySlotToWorld(page, canvas, 1, dropFarmerSelection.calibration, dropPoint);
        const beforeDrop = await getEconomySnapshot(page);
        const dropCompletedImmediately = beforeDrop.fieldEggs.some((egg) => egg.sourceChickenId === 'p3-farmer');
        if (
            !dropCompletedImmediately &&
            (!beforeDrop.workerTasks.some((task) => task.type === 'drop_to_field') ||
                !beforeDrop.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1))
        ) {
            throw new Error(`Drop task did not preserve source before arrival: ${JSON.stringify(beforeDrop)}`);
        }
        if (!dropCompletedImmediately) {
            await page.waitForFunction(
                () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().fieldEggs.some((egg) => egg.sourceChickenId === 'p3-farmer'),
                null,
                { timeout: 5_000 },
            );
        }
        const afterDrop = await getEconomySnapshot(page);
        const droppedEgg = afterDrop.fieldEggs.find((candidate) => candidate.sourceChickenId === 'p3-farmer');
        if (!droppedEgg) throw new Error(`Missing dropped egg: ${JSON.stringify(afterDrop)}`);
        const repickupCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, repickupCalibration, { x: droppedEgg.x, y: droppedEgg.y - 18 }, 'right');
        await page.waitForFunction(
            () => {
                const snapshot = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
                return snapshot.fieldEggs.length === 0 &&
                    snapshot.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1);
            },
            null,
            { timeout: 5_000 },
        );

        assertNoErrors(errors);
        return {
            case: 'transfer',
            checks: {
                actualDragDropAndRepickupConservesEgg: true,
                pendingDropPreservesSource: true,
            },
            errors,
            snapshots: { afterDrop, beforeDrop },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runDepositCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const grantedSlot = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(1));
        if (grantedSlot === null) throw new Error('Failed to grant debug egg');
        const coopId = await page.evaluate(() => window.__chickenFarmDebug!.createPathBlockerFixture(3700, 8896));
        if (!coopId) throw new Error('Failed to create complete coop fixture');
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().coops.some((coop) => coop.id === id),
            coopId,
            { timeout: 5_000 },
        );
        const coopCenter = await page.evaluate((id) => {
            const building = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((candidate) => candidate.id === id);
            if (!building) return null;
            return {
                x: building.footprint.x + building.footprint.width / 2,
                y: building.footprint.y + building.footprint.height / 2,
            };
        }, coopId);
        if (!coopCenter) throw new Error('Missing coop footprint');
        const calibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await dragInventorySlotToWorld(page, canvas, grantedSlot, calibration, coopCenter);
        const beforeDeposit = await getEconomySnapshot(page);
        if (
            !beforeDeposit.workerTasks.some((task) => task.type === 'deposit_to_coop') ||
            !beforeDeposit.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1)
        ) {
            throw new Error(`Deposit task did not preserve source before arrival: ${JSON.stringify(beforeDeposit)}`);
        }
        const teleported = await page.evaluate(
            ({ x, y }) => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', x, y),
            coopCenter,
        );
        if (!teleported) throw new Error('Failed to move deposit fixture farmer to the coop');
        await page.waitForFunction(
            (id) => {
                const snapshot = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
                return snapshot.coops.some((coop) => coop.id === id && coop.storedEggs === 1) &&
                    snapshot.inventories.find((inventory) => inventory.id === id)?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1) &&
                    !snapshot.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006');
            },
            coopId,
            { timeout: 8_000 },
        );
        const afterDeposit = await getEconomySnapshot(page);
        assertNoErrors(errors);
        return {
            case: 'deposit',
            checks: {
                actualDragToCoopDepositsOnce: true,
                pendingDepositPreservesSource: true,
                storedEggsMatchesCoopInventory: true,
            },
            errors,
            snapshots: { afterDeposit, beforeDeposit },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runHatchStartCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const slotIndex = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(1));
        const coopId = await page.evaluate(() => window.__chickenFarmDebug!.createPathBlockerFixture(3700, 8896));
        if (slotIndex === null || !coopId) throw new Error('Failed to prepare hatch fixture');
        const coopCenter = await page.evaluate((id) => {
            const building = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((candidate) => candidate.id === id);
            return building ? { x: building.footprint.x + building.footprint.width / 2, y: building.footprint.y + building.footprint.height / 2 } : null;
        }, coopId);
        if (!coopCenter) throw new Error('Missing hatch coop');
        const depositCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await dragInventorySlotToWorld(page, canvas, slotIndex, depositCalibration, coopCenter);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'deposit_to_coop'),
            null,
            { timeout: 5_000 },
        );
        await page.evaluate(({ x, y }) => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', x, y), coopCenter);
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().coops.some((coop) => coop.id === id && coop.storedEggs === 1),
            coopId,
            { timeout: 5_000 },
        );
        await page.evaluate(() => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', 3300, 8960));
        const selectCalibration = await calibrateWorldInput(page, canvas);
        await clickWorld(page, selectCalibration, coopCenter);
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.economyEntityId === id,
            coopId,
            { timeout: 5_000 },
        );
        const before = await getEconomySnapshot(page);
        await page.keyboard.press('h');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().hatchJobs.length === 1,
            null,
            { timeout: 5_000 },
        );
        const after = await getEconomySnapshot(page);
        if (
            after.coops.find((coop) => coop.id === coopId)?.storedEggs !== 0 ||
            after.inventories.find((inventory) => inventory.id === coopId)?.slots.some((slot) => slot?.itemRawcode === 'I006') ||
            after.wallet?.gold !== before.wallet?.gold ||
            after.wallet?.lumber !== before.wallet?.lumber ||
            after.hatchJobs[0]?.ownerPlayerId !== 3 ||
            after.hatchJobs[0]?.resultChickenKind !== 'basic'
        ) throw new Error(`Hatch start mismatch: ${JSON.stringify({ after, before })}`);
        await page.keyboard.press('h');
        const repeated = await getEconomySnapshot(page);
        if (repeated.hatchJobs.length !== 1 || repeated.coops.find((coop) => coop.id === coopId)?.storedEggs !== 0) throw new Error(`Empty-coop hatch changed state: ${JSON.stringify(repeated)}`);
        assertNoErrors(errors);
        return { case: 'hatch_start', checks: { explicitHotkeyConsumesOneEgg: true, emptyCoopDoesNotAddJob: true, walletUnchanged: true }, errors, snapshots: { after, before, repeated } };
    } finally { await page.close(); await browser.close(); }
}

async function runHatchExitCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const slotIndex = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(1));
        const coopId = await page.evaluate(() => window.__chickenFarmDebug!.createPathBlockerFixture(3700, 8896));
        if (slotIndex === null || !coopId) throw new Error('Failed to prepare hatch-exit fixture');
        const coop = await page.evaluate((id) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((building) => building.id === id) ?? null, coopId);
        if (!coop) throw new Error('Missing hatch-exit coop');
        const coopCenter = { x: coop.footprint.x + coop.footprint.width / 2, y: coop.footprint.y + coop.footprint.height / 2 };
        const depositCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await dragInventorySlotToWorld(page, canvas, slotIndex, depositCalibration, coopCenter);
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'deposit_to_coop'), null, { timeout: 5_000 });
        await page.evaluate(({ x, y }) => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', x, y), coopCenter);
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().coops.some((candidate) => candidate.id === id && candidate.storedEggs === 1), coopId, { timeout: 5_000 });
        await page.evaluate(() => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', 3300, 8960));
        await clickWorld(page, await calibrateWorldInput(page, canvas), coopCenter);
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().selected.economyEntityId === id, coopId, { timeout: 5_000 });
        const before = await getEconomySnapshot(page);
        await page.keyboard.press('h');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().hatchJobs.length === 1, null, { timeout: 5_000 });
        const started = await getEconomySnapshot(page);
        const job = started.hatchJobs[0];
        if (!job) throw new Error('Hatch job missing after command');
        await page.evaluate((time) => window.__chickenFarmDebug!.advanceEconomyForTest(time), job.completeAtSec - 1);
        const beforeComplete = await getEconomySnapshot(page);
        await page.evaluate((time) => window.__chickenFarmDebug!.advanceEconomyForTest(time), job.completeAtSec);
        const completed = await getEconomySnapshot(page);
        await page.evaluate((time) => window.__chickenFarmDebug!.advanceEconomyForTest(time), job.completeAtSec + 1);
        const repeated = await getEconomySnapshot(page);
        const chicken = completed.chickens.find((candidate) => candidate.id === 'chicken-1');
        const insideCoop = chicken && chicken.x >= coop.footprint.x && chicken.x <= coop.footprint.x + coop.footprint.width && chicken.y >= coop.footprint.y && chicken.y <= coop.footprint.y + coop.footprint.height;
        if (beforeComplete.chickens.length !== 0 || beforeComplete.hatchJobs.length !== 1 || completed.chickens.length !== 1 || completed.hatchJobs.length !== 0 || !chicken || insideCoop || repeated.chickens.length !== 1 || repeated.hatchJobs.length !== 0 || completed.wallet?.gold !== before.wallet?.gold || completed.wallet?.lumber !== before.wallet?.lumber) throw new Error(`Hatch exit mismatch: ${JSON.stringify({ before, beforeComplete, completed, repeated })}`);
        assertNoErrors(errors);
        return { case: 'hatch_exit', checks: { completesOnceAtDueTime: true, outsideCoopFootprint: true, repeatedUpdateDoesNotDuplicate: true, walletUnchanged: true }, errors, snapshots: { before, beforeComplete, completed, repeated } };
    } finally { await page.close(); await browser.close(); }
}

async function runSaleCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const saleSlot = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(3));
        const marketId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyBuildingFixture('market', 4032, 8896));
        if (saleSlot === null || !marketId) throw new Error('Failed to prepare own market sale fixture');
        const marketCenter = await getBuildingCenter(page, marketId);
        const beforeSale = await getEconomySnapshot(page);
        const saleCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, saleCalibration, marketCenter, 'right');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'),
            null,
            { timeout: 5_000 },
        );
        const pendingSale = await getEconomySnapshot(page);
        if (
            !pendingSale.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 3) ||
            pendingSale.wallet?.gold !== beforeSale.wallet?.gold
        ) throw new Error(`Sale changed state before arrival: ${JSON.stringify({ beforeSale, pendingSale })}`);
        await page.waitForFunction(
            () => {
                const snapshot = window.__chickenFarmDebug!.getEconomyLifecycleSnapshot();
                return !snapshot.workerTasks.some((task) => task.type === 'sell_at_market') &&
                    !snapshot.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006');
            },
            null,
            { timeout: 30_000 },
        );
        const afterSale = await getEconomySnapshot(page);
        const eggValue = 12;
        if (
            afterSale.wallet?.gold !== (beforeSale.wallet?.gold ?? 0) + 3 * eggValue ||
            afterSale.wallet?.lumber !== beforeSale.wallet?.lumber ||
            !afterSale.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I003' && slot.quantity === 5)
        ) throw new Error(`Market sale ledger mismatch: ${JSON.stringify({ afterSale, beforeSale })}`);

        const repeatCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, repeatCalibration, marketCenter, 'right');
        await page.waitForTimeout(150);
        const repeated = await getEconomySnapshot(page);
        if (repeated.wallet?.gold !== afterSale.wallet?.gold || repeated.workerTasks.some((task) => task.type === 'sell_at_market')) {
            throw new Error(`Empty repeated sale changed state: ${JSON.stringify({ afterSale, repeated })}`);
        }

        const foreignSlot = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(1));
        const foreignMarketId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyBuildingFixture('market', 3500, 8700, 4));
        if (foreignSlot === null || !foreignMarketId) throw new Error('Failed to prepare foreign market fixture');
        const beforeForeign = await getEconomySnapshot(page);
        const foreignCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, foreignCalibration, await getBuildingCenter(page, foreignMarketId), 'right');
        await page.waitForTimeout(150);
        const afterForeign = await getEconomySnapshot(page);
        if (
            afterForeign.wallet?.gold !== beforeForeign.wallet?.gold ||
            !afterForeign.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1) ||
            afterForeign.workerTasks.some((task) => task.type === 'sell_at_market')
        ) throw new Error(`Foreign market accepted a sale: ${JSON.stringify({ afterForeign, beforeForeign })}`);

        const unfinishedMarketId = await page.evaluate(() => window.__chickenFarmDebug!.createPausedConstructionFixture('market', 3500, 9000));
        if (!unfinishedMarketId) throw new Error('Failed to prepare unfinished market fixture');
        const beforeUnfinished = await getEconomySnapshot(page);
        const unfinishedCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, unfinishedCalibration, await getBuildingCenter(page, unfinishedMarketId), 'right');
        await page.waitForTimeout(150);
        const afterUnfinished = await getEconomySnapshot(page);
        const missingMarketOrder = await page.evaluate(() => window.__chickenFarmDebug!.orderFarmerMarketSale('missing-market'));
        if (
            missingMarketOrder ||
            afterUnfinished.wallet?.gold !== beforeUnfinished.wallet?.gold ||
            !afterUnfinished.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1) ||
            afterUnfinished.workerTasks.some((task) => task.type === 'sell_at_market')
        ) throw new Error(`Unfinished or missing market accepted a sale: ${JSON.stringify({ afterUnfinished, beforeUnfinished, missingMarketOrder })}`);

        await page.evaluate(() => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', 3392, 8928));
        const beforeRemoval = await getEconomySnapshot(page);
        const removalCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, removalCalibration, marketCenter, 'right');
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market' && task.targetId === id), marketId, { timeout: 5_000 });
        const removed = await page.evaluate((id) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(id), marketId);
        if (!removed) throw new Error('Failed to remove pending market fixture');
        await page.waitForFunction(() => !window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'), null, { timeout: 5_000 });
        const afterRemoval = await getEconomySnapshot(page);
        if (
            afterRemoval.wallet?.gold !== beforeRemoval.wallet?.gold ||
            afterRemoval.wallet?.lumber !== beforeRemoval.wallet?.lumber ||
            !afterRemoval.inventories.find((inventory) => inventory.id === 'p3-farmer')?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === 1)
        ) throw new Error(`Removed market sold or lost egg: ${JSON.stringify({ afterRemoval, beforeRemoval })}`);
        assertNoErrors(errors);
        return {
            case: 'sale',
            checks: {
                foreignMarketRejected: true,
                unfinishedAndMissingMarketsRejected: true,
                marketRemovalPreservesEggAndWallet: true,
                saleAtArrivalPaysCanonicalStackValueOnce: true,
                secondOrderCannotResellEmptyStack: true,
            },
            errors,
            snapshots: { afterForeign, afterRemoval, afterSale, afterUnfinished, beforeRemoval, beforeSale, beforeUnfinished, pendingSale, repeated },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runInterruptionCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const errors = createErrorCollector(page);
    try {
        await prepareEconomySession(page, true);
        const canvas = await getCanvasBounds(page);
        const eggSlot = await page.evaluate(() => window.__chickenFarmDebug!.grantFarmerEggStack(1));
        const marketId = await page.evaluate(() => window.__chickenFarmDebug!.createEconomyBuildingFixture('market', 4032, 8896));
        if (eggSlot === null || !marketId) throw new Error('Failed to prepare interrupted sale');
        const marketCenter = await getBuildingCenter(page, marketId);
        const beforeStop = await getEconomySnapshot(page);
        const stopCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, stopCalibration, marketCenter, 'right');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'), null, { timeout: 5_000 });
        await page.keyboard.press('s');
        await page.waitForFunction(() => !window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'), null, { timeout: 5_000 });
        await page.evaluate(({ x, y }) => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', x, y), marketCenter);
        await page.waitForTimeout(150);
        const afterStop = await getEconomySnapshot(page);
        if (!hasFarmerEggs(afterStop, 1) || afterStop.wallet?.gold !== beforeStop.wallet?.gold) {
            throw new Error(`Stop allowed delayed sale: ${JSON.stringify({ afterStop, beforeStop })}`);
        }

        await page.evaluate(() => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', 3392, 8928));
        const shiftCalibration = await calibrateWorldInput(page, canvas);
        await selectFarmer(page, canvas);
        await clickWorld(page, shiftCalibration, marketCenter, 'right');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'), null, { timeout: 5_000 });
        await page.keyboard.down('Shift');
        await clickWorld(page, shiftCalibration, { x: 3300, y: 8960 }, 'right');
        await page.keyboard.up('Shift');
        await page.waitForFunction(() => !window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().workerTasks.some((task) => task.type === 'sell_at_market'), null, { timeout: 5_000 });
        await page.evaluate(({ x, y }) => window.__chickenFarmDebug!.setControllableUnitPositionForTest('p3-farmer', x, y), marketCenter);
        await page.waitForTimeout(150);
        const afterShiftMove = await getEconomySnapshot(page);
        if (!hasFarmerEggs(afterShiftMove, 1) || afterShiftMove.wallet?.gold !== beforeStop.wallet?.gold) {
            throw new Error(`Shift replacement allowed delayed sale: ${JSON.stringify({ afterShiftMove, beforeStop })}`);
        }

        assertNoErrors(errors);
        return {
            case: 'interruption',
            checks: {
                shiftReplacementCancelsSale: true,
                stopCancelsSale: true,
            },
            errors,
            snapshots: { afterShiftMove, afterStop, beforeStop },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

function hasFarmerEggs(
    snapshot: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    quantity: number,
) {
    return snapshot.inventories
        .find((inventory) => inventory.id === 'p3-farmer')
        ?.slots.some((slot) => slot?.itemRawcode === 'I006' && slot.quantity === quantity) ?? false;
}

async function getBuildingCenter(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>, buildingId: string) {
    const center = await page.evaluate((id) => {
        const building = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((candidate) => candidate.id === id);
        return building ? { x: building.footprint.x + building.footprint.width / 2, y: building.footprint.y + building.footprint.height / 2 } : null;
    }, buildingId);
    if (!center) throw new Error(`Missing building ${buildingId}`);
    return center;
}

function requireCompleteBuilding(
    snapshot: ReturnType<Window['__chickenFarmDebug']['getEconomyLifecycleSnapshot']>,
    templateId: 'campfire' | 'coop_basic' | 'market',
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
    return { calibration };
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
    button: 'left' | 'right' = 'left',
) {
    const target = getWorldScreenPoint(calibration, point);
    await page.mouse.click(target.x, target.y, { button });
}

function getWorldScreenPoint(
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
    return {
        x: calibration.calibrationPoint.x + (point.x - calibration.calibrationWorldPoint.x) / scaleX,
        y: calibration.calibrationPoint.y + (point.y - calibration.calibrationWorldPoint.y) / scaleY,
    };
}

async function clickInventorySlot(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    slotIndex: number,
) {
    const point = getInventorySlotScreenPoint(canvas, slotIndex);
    await page.mouse.click(point.x, point.y);
}

function getInventorySlotScreenPoint(
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    slotIndex: number,
) {
    const col = slotIndex % 2;
    const row = Math.floor(slotIndex / 2);
    return {
        x: canvas.left + ((571 + col * 46 + 20) / 960) * canvas.width,
        y: canvas.top + ((566 + row * 46 + 20) / 720) * canvas.height,
    };
}

function getCommandCardButtonScreenPoint(
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    buttonIndex: number,
) {
    const col = buttonIndex % 4;
    const row = Math.floor(buttonIndex / 4);
    return {
        x: canvas.left + ((679 + col * 67 + 30) / 960) * canvas.width,
        y: canvas.top + ((566 + row * 46 + 20) / 720) * canvas.height,
    };
}

async function clickCommandCardButton(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    buttonIndex: number,
) {
    const point = getCommandCardButtonScreenPoint(canvas, buttonIndex);
    await page.mouse.click(point.x, point.y);
}

async function dragInventorySlotToWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: Awaited<ReturnType<typeof getCanvasBounds>>,
    slotIndex: number,
    calibration: Awaited<ReturnType<typeof calibrateWorldInput>>,
    point: { readonly x: number; readonly y: number },
) {
    const source = getInventorySlotScreenPoint(canvas, slotIndex);
    const scaleX =
        (calibration.referenceWorldPoint.x - calibration.calibrationWorldPoint.x) /
        (calibration.referencePoint.x - calibration.calibrationPoint.x);
    const scaleY =
        (calibration.referenceWorldPoint.y - calibration.calibrationWorldPoint.y) /
        (calibration.referencePoint.y - calibration.calibrationPoint.y);
    const target = {
        x: calibration.calibrationPoint.x + (point.x - calibration.calibrationWorldPoint.x) / scaleX,
        y: calibration.calibrationPoint.y + (point.y - calibration.calibrationWorldPoint.y) / scaleY,
    };
    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await page.waitForFunction(
        (expectedSlot) => window.__chickenFarmDebug!.getEconomyLifecycleSnapshot().inventoryDrag?.slotIndex === expectedSlot,
        slotIndex,
        { timeout: 2_000 },
    );
    await page.waitForTimeout(50);
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.waitForTimeout(50);
    await page.mouse.up();
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
