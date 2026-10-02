import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';

type ControlSnapshot = {
    readonly camera: {
        readonly scrollX: number;
        readonly scrollY: number;
        readonly viewportHeight: number;
        readonly viewportWidth: number;
        readonly zoom: number;
    };
    readonly lastPrimaryClickWorldPoint: { readonly x: number; readonly y: number } | null;
    readonly units: readonly {
        readonly id: string;
        readonly selected: boolean;
        readonly templateId: string;
        readonly x: number;
        readonly y: number;
    }[];
};

type CanvasBounds = {
    readonly height: number;
    readonly left: number;
    readonly top: number;
    readonly width: number;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4177;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const constructionCase = process.env.CHICKEN_FARM_CONSTRUCTION_CASE ?? 'baseline';
const artifactName =
    constructionCase === 'baseline'
        ? 'construction_check.json'
        : `construction_check_${constructionCase}.json`;
const artifactPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts', artifactName);

if (
    constructionCase !== 'baseline' &&
    constructionCase !== 'placement' &&
    constructionCase !== 'arrival' &&
    constructionCase !== 'start_rejection' &&
    constructionCase !== 'pause_resume' &&
    constructionCase !== 'queue' &&
    constructionCase !== 'refund' &&
    constructionCase !== 'completion' &&
    constructionCase !== 'removal' &&
    constructionCase !== 'restart' &&
    constructionCase !== 'integration'
) {
    throw new Error(`Unsupported CHICKEN_FARM_CONSTRUCTION_CASE: ${constructionCase}`);
}

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report =
            constructionCase === 'baseline'
                ? await runBaseline()
                : constructionCase === 'placement'
                  ? await runPlacementCases()
                  : constructionCase === 'arrival'
                    ? await runArrivalCase()
                    : constructionCase === 'start_rejection'
                      ? await runStartRejectionCases()
                      : constructionCase === 'pause_resume'
                        ? await runPauseResumeCase()
                        : constructionCase === 'queue'
                          ? await runQueueCase()
                          : constructionCase === 'refund'
                            ? await runRefundCase()
                            : constructionCase === 'completion'
                              ? await runCompletionCase()
                              : constructionCase === 'removal'
                                ? await runRemovalCase()
                                : constructionCase === 'restart'
                                  ? await runRestartCase()
                                  : await runIntegrationCase();
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
            VITE_CHICKEN_FARM_DEBUG_FIXTURES:
                constructionCase === 'start_rejection' || constructionCase === 'pause_resume' || constructionCase === 'refund' || constructionCase === 'completion' || constructionCase === 'removal' || constructionCase === 'restart'
                    ? 'true'
                    : 'false',
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

        const before = await getSnapshot(page);
        assertNormalBaseline(before);
        const repeatedRead = await getLifecycle(page);
        const repeatedReadAgain = await getLifecycle(page);
        if (JSON.stringify(repeatedRead) !== JSON.stringify(repeatedReadAgain)) {
            throw new Error('Construction lifecycle getter changed state while no construction exists');
        }

        const canvas = await getCanvasBounds(page);
        const calibrationPoint = { x: canvas.left, y: canvas.top };
        await page.mouse.click(calibrationPoint.x, calibrationPoint.y);
        const calibration = await getSnapshot(page);
        assertNoSelection(calibration.controls, 'calibration click');
        const referencePoint = {
            x: canvas.left + canvas.width / 4,
            y: canvas.top + canvas.height / 4,
        };
        await page.mouse.click(referencePoint.x, referencePoint.y);
        const reference = await getSnapshot(page);
        assertNoSelection(reference.controls, 'reference click');

        const farmer = before.controls.units.find((unit) => unit.templateId === 'farmer');
        if (!farmer) throw new Error('Missing normal-session farmer');
        const calibrationData = {
            calibrationPoint,
            calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint,
            referencePoint,
            referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint,
        };
        if (!calibrationData.calibrationWorldPoint || !calibrationData.referenceWorldPoint) {
            throw new Error('Missing world-coordinate calibration');
        }

        await clickWorld(page, calibrationData, { x: farmer.x, y: farmer.y });
        await page.waitForFunction(
            (farmerId) =>
                window.__chickenFarmDebug!.getControlSnapshot().units.some(
                    (unit) => unit.id === farmerId && unit.selected,
                ),
            farmer.id,
            { timeout: 5_000 },
        );
        const selected = await getSnapshot(page);
        if (selected.state.selectedUnitCount !== 1 || !selected.controls.units.find((unit) => unit.id === farmer.id)?.selected) {
            throw new Error(`Farmer selection failed: ${JSON.stringify(selected)}`);
        }

        // B and F are actual CommandCardSystem inputs: build page then Fence.
        await page.keyboard.press('b');
        await page.waitForFunction(() => window.__chickenFarmDebug!.getState().commandPage === 'build', null, {
            timeout: 5_000,
        });
        await page.keyboard.press('f');
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === 'fence_wood',
            null,
            { timeout: 5_000 },
        );

        const placementPoint = { x: 4032, y: 8896 };
        await clickWorld(page, calibrationData, placementPoint);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().pendingOrders.length === 1,
            null,
            { timeout: 5_000 },
        );
        const afterPlacement = await getSnapshot(page);
        const lifecycle = afterPlacement.lifecycle;
        const order = lifecycle.pendingOrders[0];
        if (
            lifecycle.activePlacementTemplateId !== null ||
            lifecycle.buildings.length !== 0 ||
            !order ||
            order.templateId !== 'fence_wood' ||
            order.runtimeBuildingId !== null ||
            lifecycle.wallet?.gold !== 1500 ||
            lifecycle.wallet.lumber !== 0 ||
            lifecycle.dynamicBlockerBuildingIds.length !== 0 ||
            lifecycle.visionSourceBuildingIds.length !== 0 ||
            lifecycle.economyBuildingIds.length !== 0
        ) {
            throw new Error(`Placement baseline mismatch: ${JSON.stringify(afterPlacement)}`);
        }
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }

        return {
            case: constructionCase,
            checks: {
                lifecycleGetterReadOnly: true,
                normalFixtureIsolation: true,
                normalP3FencePlacement: true,
                pass: true,
            },
            errors,
            input: { buildCard: ['B', 'F'], placementPoint, selectedFarmerId: farmer.id },
            lifecycle: afterPlacement.lifecycle,
            state: afterPlacement.state,
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runPlacementCases() {
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
        const first = await prepareNormalSession(page);
        await page.keyboard.press('b');
        await page.keyboard.press('f');
        const noBuilder = await getSnapshot(page);
        if (
            noBuilder.lifecycle.activePlacementTemplateId !== null ||
            noBuilder.lifecycle.pendingOrders.length !== 0 ||
            noBuilder.state.selectedUnitCount !== 0
        ) {
            throw new Error(`Unselected builder began placement: ${JSON.stringify(noBuilder)}`);
        }

        const builder = await selectFarmer(page, first);
        await openPlacement(page, 'c');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        const insufficient = await getSnapshot(page);
        if (
            insufficient.lifecycle.activePlacementTemplateId !== 'coop_basic' ||
            insufficient.lifecycle.pendingOrders.length !== 0 ||
            insufficient.lifecycle.buildings.length !== 0 ||
            insufficient.lifecycle.wallet?.gold !== 1500 ||
            insufficient.lifecycle.wallet.lumber !== 0
        ) {
            throw new Error(`Insufficient-resource placement mismatch: ${JSON.stringify(insufficient)}`);
        }
        await page.keyboard.press('Escape');
        await assertPlacementCancelled(page, 'escape after insufficient resources');

        await openPlacement(page, 'f');
        const hudPoint = { x: first.canvas.left + first.canvas.width / 2, y: first.canvas.top + first.canvas.height - 18 };
        await page.mouse.click(hudPoint.x, hudPoint.y);
        const hud = await getSnapshot(page);
        if (hud.lifecycle.activePlacementTemplateId !== 'fence_wood' || hud.lifecycle.pendingOrders.length !== 0) {
            throw new Error(`HUD click leaked into placement: ${JSON.stringify({ hud, hudPoint })}`);
        }
        await page.keyboard.press('Escape');
        await assertPlacementCancelled(page, 'escape after HUD click');

        await openPlacement(page, 'f');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 }, 'right');
        await assertPlacementCancelled(page, 'right click');

        await openPlacement(page, 'f');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().pendingOrders.length === 1,
            null,
            { timeout: 5_000 },
        );
        const accepted = await getSnapshot(page);
        await openPlacement(page, 'f');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        const overlap = await getSnapshot(page);
        if (
            overlap.lifecycle.activePlacementTemplateId !== 'fence_wood' ||
            overlap.lifecycle.pendingOrders.length !== 1 ||
            overlap.lifecycle.wallet?.gold !== 1500 ||
            overlap.lifecycle.buildings.length !== 0
        ) {
            throw new Error(`Pending overlap placement mismatch: ${JSON.stringify(overlap)}`);
        }

        const terrain = await prepareNormalSession(page);
        const terrainBuilder = await selectFarmer(page, terrain);
        await moveWorldPointIntoViewport(page, { x: 4816, y: 10384 });
        const terrainCalibration = rebaseCalibrationForCamera(
            terrainBuilder.calibration,
            terrain.snapshot.controls.camera,
            (await getSnapshot(page)).controls.camera,
        );
        await openPlacement(page, 'f');
        await clickWorld(page, terrainCalibration, { x: 4816, y: 10384 });
        const terrainRejected = await getSnapshot(page);
        if (
            terrainRejected.lifecycle.activePlacementTemplateId !== 'fence_wood' ||
            terrainRejected.lifecycle.pendingOrders.length !== 0 ||
            terrainRejected.lifecycle.buildings.length !== 0 ||
            terrainRejected.lifecycle.wallet?.gold !== 1500 ||
            terrainRejected.lifecycle.wallet.lumber !== 0
        ) {
            throw new Error(`Terrain-rejected placement mismatch: ${JSON.stringify(terrainRejected)}`);
        }
        await page.keyboard.press('Escape');
        await assertPlacementCancelled(page, 'escape after terrain rejection');

        const bounds = await prepareNormalSession(page);
        const boundsBefore = await getSnapshot(page);
        const boundsPreview = await page.evaluate(() =>
            window.__chickenFarmDebug!.getConstructionPlacementPreview('fence_wood', 0, 0),
        );
        const boundsRejected = await getSnapshot(page);
        if (
            !boundsPreview ||
            boundsPreview.valid.valid ||
            boundsPreview.valid.reason !== 'outside_world_bounds' ||
            boundsRejected.lifecycle.activePlacementTemplateId !== null ||
            boundsRejected.lifecycle.pendingOrders.length !== 0 ||
            boundsRejected.lifecycle.buildings.length !== 0 ||
            boundsRejected.lifecycle.wallet?.gold !== 1500 ||
            boundsRejected.lifecycle.wallet.lumber !== 0 ||
            JSON.stringify(boundsBefore.lifecycle) !== JSON.stringify(boundsRejected.lifecycle)
        ) {
            throw new Error(`Bounds-rejected preview mismatch: ${JSON.stringify({ boundsPreview, boundsRejected })}`);
        }
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }

        return {
            case: constructionCase,
            checks: {
                boundsRejected: true,
                hudInputContained: true,
                insufficientResourcesRejected: true,
                noBuilderRejected: true,
                normalFixtureIsolation: true,
                pass: true,
                pendingOverlapRejected: true,
                terrainRejected: true,
            },
            errors,
            snapshots: {
                accepted: accepted.lifecycle,
                boundsRejected: boundsRejected.lifecycle,
                insufficient: insufficient.lifecycle,
                overlap: overlap.lifecycle,
                terrainRejected: terrainRejected.lifecycle,
            },
            previews: { bounds: boundsPreview },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runArrivalCase() {
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
        const session = await prepareNormalSession(page);
        const builder = await selectFarmer(page, session);
        const template = CHICKEN_FARM_BALANCE.buildingTemplates.farm_house;
        const before = await getSnapshot(page);
        await openPlacement(page, 'h');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().pendingOrders.length === 1,
            null,
            { timeout: 5_000 },
        );
        const pending = await getSnapshot(page);
        if (
            pending.lifecycle.wallet?.gold !== before.lifecycle.wallet?.gold ||
            pending.lifecycle.wallet?.lumber !== before.lifecycle.wallet?.lumber ||
            pending.lifecycle.buildings.length !== 0 ||
            pending.lifecycle.pendingOrders[0]?.templateId !== template.id
        ) {
            throw new Error(`Pending build charged or started too early: ${JSON.stringify(pending)}`);
        }

        try {
            await page.waitForFunction(
                ({ ownerPlayerId, templateId }) => {
                    const snapshot = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                    return snapshot.buildings.some(
                        (building) =>
                            building.templateId === templateId &&
                            building.ownerPlayerId === ownerPlayerId &&
                            building.state === 'constructing' &&
                            building.activeWorkerUnitId !== null,
                    );
                },
                { ownerPlayerId: 3, templateId: template.id },
                { timeout: 30_000 },
            );
        } catch (error) {
            throw new Error(`Timed out waiting for build start: ${JSON.stringify(await getSnapshot(page))}`, {
                cause: error,
            });
        }
        const started = await getSnapshot(page);
        const building = started.lifecycle.buildings.find(
            (candidate) => candidate.templateId === template.id,
        );
        const order = started.lifecycle.pendingOrders.find(
            (candidate) => candidate.runtimeBuildingId === building?.id,
        );
        const expectedGold = (before.lifecycle.wallet?.gold ?? 0) - template.costGold;
        const expectedLumber =
            (before.lifecycle.wallet?.lumber ?? 0) - (template.costLumber ?? 0);
        if (
            !building ||
            building.ownerPlayerId !== 3 ||
            building.activeWorkerUnitId !== builder.farmerId ||
            building.progress < 0 ||
            building.progress >= 1 ||
            !order ||
            started.lifecycle.wallet?.gold !== expectedGold ||
            started.lifecycle.wallet.lumber !== expectedLumber
        ) {
            throw new Error(`Arrival/build-start mismatch: ${JSON.stringify({ building, order, started })}`);
        }
        await page.waitForFunction(
            ({ buildingId, gold, lumber }) => {
                const snapshot = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                const building = snapshot.buildings.find((candidate) => candidate.id === buildingId);
                return Boolean(
                    building &&
                        building.progress > 0 &&
                        snapshot.wallet?.gold === gold &&
                        snapshot.wallet.lumber === lumber,
                );
            },
            { buildingId: building.id, gold: expectedGold, lumber: expectedLumber },
            { timeout: 5_000 },
        );
        const progressed = await getSnapshot(page);
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }
        return {
            case: constructionCase,
            checks: {
                costChargedExactlyOnceAtStart: true,
                normalFixtureIsolation: true,
                ownerAndWorkerMatch: true,
                pendingIsFreeBeforeArrival: true,
                progressStartedAfterArrival: true,
                pass: true,
            },
            errors,
            snapshots: { pending: pending.lifecycle, progressed: progressed.lifecycle, started: started.lifecycle },
            template: {
                costGold: template.costGold,
                costLumber: template.costLumber ?? 0,
                id: template.id,
            },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runIntegrationCase() {
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
        const session = await prepareNormalSession(page);
        const builder = await selectFarmer(page, session);
        await openPlacement(page, 'f');
        await clickWorld(page, builder.calibration, { x: 3584, y: 8896 });
        await page.waitForFunction(() => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.length === 1, null, { timeout: 30_000 });
        const active = await getSnapshot(page);
        const building = active.lifecycle.buildings[0];
        if (!building) throw new Error('Missing active normal construction');
        await page.keyboard.press('s');
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((candidate) => candidate.id === id)?.activeWorkerUnitId === null, building.id, { timeout: 5_000 });
        await clickWorld(page, builder.calibration, { x: building.footprint.x + 64, y: building.footprint.y + 64 }, 'right');
        await page.waitForFunction((id) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.find((candidate) => candidate.id === id)?.state === 'complete', building.id, { timeout: 30_000 });
        const complete = await getSnapshot(page);
        if (complete.lifecycle.wallet?.gold !== 1492 || complete.lifecycle.pendingOrders.length !== 0) throw new Error(`Normal lifecycle mismatch: ${JSON.stringify(complete)}`);
        if (Object.values(errors).some((messages) => messages.length > 0)) {
            throw new Error(`Normal integration browser errors: ${JSON.stringify(errors)}`);
        }
        return { case: constructionCase, checks: { browserErrorsZero: true, normalBuildStopResumeComplete: true, pass: true }, errors, snapshots: { active: active.lifecycle, complete: complete.lifecycle } };
    } finally { await page.close(); await browser.close(); }
}

async function runRestartCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        const session = await prepareNormalSession(page, true);
        const builder = await selectFarmer(page, session);
        await openPlacement(page, 'f');
        await clickWorld(page, builder.calibration, { x: 3584, y: 8896 });
        await waitForPendingCount(page, 1);
        const fixtures = await page.evaluate(() => ({
            complete: window.__chickenFarmDebug!.createPathBlockerFixture(4352, 8896),
            paused: window.__chickenFarmDebug!.createPausedConstructionFixture('coop_basic', 4608, 8896),
            restarted: window.__chickenFarmDebug!.restartRunForTest(),
        }));
        if (!fixtures.complete || !fixtures.paused || !fixtures.restarted) throw new Error(`Unable to create restart state: ${JSON.stringify(fixtures)}`);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getState().runId > 1 && window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 15_000 },
        );
        const restarted = await getSnapshot(page);
        assertNormalBaseline(restarted, true);
        const afterSession = { canvas: await getCanvasBounds(page), snapshot: restarted };
        const afterBuilder = await selectFarmer(page, afterSession);
        await openPlacement(page, 'f');
        await clickWorld(page, afterBuilder.calibration, { x: 3584, y: 8896 });
        await waitForPendingCount(page, 1);
        const freshPending = await getSnapshot(page);
        return { case: constructionCase, checks: { freshConstructionAfterRestart: true, pass: true, staleConstructionCleared: true }, snapshots: { freshPending: freshPending.lifecycle, restarted: restarted.lifecycle } };
    } finally { await page.close(); await browser.close(); }
}

async function runRemovalCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        await prepareNormalSession(page, true);
        const id = await page.evaluate(() => window.__chickenFarmDebug!
            .createPathBlockerFixture(4032, 8896));
        if (!id || !await page.evaluate((buildingId) => window.__chickenFarmDebug!
            .removeCompletedBuildingFixture(buildingId), id)) throw new Error('Unable to remove complete fixture');
        const removed = await getSnapshot(page);
        if (
            removed.lifecycle.buildings.length || removed.lifecycle.pendingOrders.length ||
            removed.lifecycle.dynamicBlockerBuildingIds.length || removed.lifecycle.visionSourceBuildingIds.length ||
            removed.lifecycle.economyBuildingIds.length ||
            await page.evaluate((buildingId) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(buildingId), id)
        ) throw new Error(`Removal cleanup/repeat mismatch: ${JSON.stringify(removed)}`);
        return { case: constructionCase, checks: { completeRemovalIdempotent: true, referencesCleared: true, pass: true }, lifecycle: removed.lifecycle };
    } finally { await page.close(); await browser.close(); }
}

async function runCompletionCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        const session = await prepareNormalSession(page, true);
        const builder = await selectFarmer(page, session);
        const point = { x: 4032, y: 8896 };
        const buildingId = await page.evaluate(({ x, y }) => window.__chickenFarmDebug!
            .createPausedConstructionFixture('coop_basic', x, y), point);
        if (!buildingId) throw new Error('Unable to create paused coop fixture');
        await clickWorld(page, builder.calibration, point, 'right');
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot()
                .buildings.find((building) => building.id === id)?.state === 'complete',
            buildingId,
            { timeout: 90_000 },
        );
        const completed = await getSnapshot(page);
        const building = completed.lifecycle.buildings.find((candidate) => candidate.id === buildingId);
        if (
            !building || building.activeWorkerUnitId !== null ||
            completed.lifecycle.pendingOrders.length !== 0 ||
            completed.lifecycle.economyBuildingIds.filter((id) => id === buildingId).length !== 1
        ) throw new Error(`Completion/economy mismatch: ${JSON.stringify(completed)}`);
        await page.waitForFunction(
            (id) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot()
                .economyBuildingIds.filter((candidate) => candidate === id).length === 1,
            buildingId,
            { timeout: 3_000 },
        );
        return { case: constructionCase, checks: { completionSingleTransition: true, economyAttachedOnce: true, pendingAndWorkerCleared: true, pass: true }, lifecycle: completed.lifecycle };
    } finally { await page.close(); await browser.close(); }
}

async function runRefundCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        const session = await prepareNormalSession(page, true);
        const builder = await selectFarmer(page, session);
        await openPlacement(page, 'h');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().buildings.length === 1,
            null,
            { timeout: 30_000 },
        );
        const paid = await getSnapshot(page);
        const paidId = paid.lifecycle.buildings[0]?.id;
        if (!paidId || !await page.evaluate((id) => window.__chickenFarmDebug!.cancelConstructionForTest(id), paidId)) {
            throw new Error('Unable to cancel paid construction');
        }
        const paidCancelled = await getSnapshot(page);
        if (
            paidCancelled.lifecycle.buildings.length !== 0 ||
            paidCancelled.lifecycle.pendingOrders.length !== 0 ||
            paidCancelled.lifecycle.wallet?.gold !== 1485 ||
            await page.evaluate((id) => window.__chickenFarmDebug!.cancelConstructionForTest(id), paidId)
        ) {
            throw new Error(`Paid cancellation/refund mismatch: ${JSON.stringify(paidCancelled)}`);
        }
        const freeId = await page.evaluate(() => window.__chickenFarmDebug!
            .createPausedConstructionFixture('market', 4352, 8768));
        if (!freeId || !await page.evaluate((id) => window.__chickenFarmDebug!.cancelConstructionForTest(id), freeId)) {
            throw new Error('Unable to cancel free fixture construction');
        }
        const freeCancelled = await getSnapshot(page);
        if (
            freeCancelled.lifecycle.buildings.length !== 0 ||
            freeCancelled.lifecycle.pendingOrders.length !== 0 ||
            freeCancelled.lifecycle.wallet?.gold !== 1485
        ) {
            throw new Error(`Free fixture produced a refund: ${JSON.stringify(freeCancelled)}`);
        }
        return { case: constructionCase, checks: { paidRefundOnce: true, freeFixtureRefundZero: true, pass: true }, snapshots: { freeCancelled: freeCancelled.lifecycle, paidCancelled: paidCancelled.lifecycle } };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runQueueCase() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        const session = await prepareNormalSession(page);
        const builder = await selectFarmer(page, session);
        await openPlacement(page, 'f');
        await page.keyboard.down('Shift');
        try {
            await clickWorld(page, builder.calibration, { x: 3584, y: 8896 });
            await clickWorld(page, builder.calibration, { x: 3840, y: 8896 });
        } finally {
            await page.keyboard.up('Shift');
        }
        await waitForPendingCount(page, 2);
        const queued = await getSnapshot(page);
        if (
            queued.lifecycle.pendingOrders.map((order) => order.templateId).join(',') !== 'fence_wood,fence_wood' ||
            queued.lifecycle.wallet?.gold !== 1500 ||
            queued.lifecycle.buildings.length !== 0
        ) {
            throw new Error(`Shift construction queue mismatch: ${JSON.stringify(queued)}`);
        }
        try {
            await page.waitForFunction(
                () => {
                    const snapshot = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                    return snapshot.buildings.length === 2 && snapshot.buildings.every((building) => building.state === 'complete') && snapshot.pendingOrders.length === 0;
                },
                null,
                { timeout: 45_000 },
            );
        } catch (error) {
            throw new Error(`Queued construction did not finish: ${JSON.stringify(await getSnapshot(page))}`, { cause: error });
        }
        const completed = await getSnapshot(page);
        if (completed.lifecycle.wallet?.gold !== 1484 || completed.lifecycle.wallet.lumber !== 0) {
            throw new Error(`Queued fence costs were not charged once each: ${JSON.stringify(completed)}`);
        }
        return {
            case: constructionCase,
            checks: { fifoCompleted: true, pass: true, pendingFreeBeforeStart: true, singleCostPerBuilding: true },
            snapshots: { completed: completed.lifecycle, queued: queued.lifecycle },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runPauseResumeCase() {
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
        const session = await prepareNormalSession(page, true);
        const builder = await selectFarmer(page, session);
        const template = CHICKEN_FARM_BALANCE.buildingTemplates.farm_house;
        const walletBefore = (await getSnapshot(page)).lifecycle.wallet;
        await openPlacement(page, 'h');
        await clickWorld(page, builder.calibration, { x: 4032, y: 8896 });
        await page.waitForFunction(
            ({ templateId, workerId }) => {
                const building = window.__chickenFarmDebug!
                    .getConstructionLifecycleSnapshot()
                    .buildings.find((candidate) => candidate.templateId === templateId);
                return building?.state === 'constructing' && building.activeWorkerUnitId === workerId;
            },
            { templateId: template.id, workerId: builder.farmerId },
            { timeout: 30_000 },
        );
        await page.waitForFunction(
            (templateId) => {
                const building = window.__chickenFarmDebug!
                    .getConstructionLifecycleSnapshot()
                    .buildings.find((candidate) => candidate.templateId === templateId);
                return Boolean(building && building.progress > 0);
            },
            template.id,
            { timeout: 10_000 },
        );
        const active = await getSnapshot(page);
        const building = active.lifecycle.buildings.find((candidate) => candidate.templateId === template.id);
        if (!building || !walletBefore) throw new Error(`Missing active construction: ${JSON.stringify(active)}`);

        await page.keyboard.press('s');
        await page.waitForFunction(
            (buildingId) => window.__chickenFarmDebug!
                .getConstructionLifecycleSnapshot()
                .buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === null,
            building.id,
            { timeout: 5_000 },
        );
        const paused = await getSnapshot(page);
        const pausedBuilding = paused.lifecycle.buildings.find((candidate) => candidate.id === building.id);
        if (
            !pausedBuilding ||
            pausedBuilding.progress <= 0 ||
            paused.lifecycle.wallet?.gold !== walletBefore.gold - template.costGold ||
            paused.lifecycle.wallet.lumber !== walletBefore.lumber - (template.costLumber ?? 0)
        ) {
            throw new Error(`Stop did not pause construction correctly: ${JSON.stringify(paused)}`);
        }
        await page.waitForFunction(
            ({ buildingId, elapsedSec, progress }) => {
                const state = window.__chickenFarmDebug!.getState();
                const building = window.__chickenFarmDebug!
                    .getConstructionLifecycleSnapshot()
                    .buildings.find((candidate) => candidate.id === buildingId);
                return Boolean(
                    building &&
                    state.elapsedSec >= elapsedSec + 2 &&
                    building.activeWorkerUnitId === null &&
                    building.progress === progress,
                );
            },
            { buildingId: building.id, elapsedSec: paused.state.elapsedSec, progress: pausedBuilding.progress },
            { timeout: 20_000 },
        );
        const stablePaused = await getSnapshot(page);
        const buildingCenter = {
            x: building.footprint.x + building.footprint.width / 2,
            y: building.footprint.y + building.footprint.height / 2,
        };
        await clickWorld(page, builder.calibration, buildingCenter, 'right');
        await page.waitForFunction(
            ({ buildingId, workerId }) => window.__chickenFarmDebug!
                .getConstructionLifecycleSnapshot()
                .buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === workerId,
            { buildingId: building.id, workerId: builder.farmerId },
            { timeout: 30_000 },
        );
        await page.waitForFunction(
            ({ buildingId, progress }) => {
                const building = window.__chickenFarmDebug!
                    .getConstructionLifecycleSnapshot()
                    .buildings.find((candidate) => candidate.id === buildingId);
                return Boolean(building && building.progress > progress);
            },
            { buildingId: building.id, progress: pausedBuilding.progress },
            { timeout: 10_000 },
        );
        const resumed = await getSnapshot(page);
        await clickWorld(page, builder.calibration, buildingCenter, 'right');
        await page.waitForFunction(
            ({ buildingId, workerId, gold, lumber }) => {
                const snapshot = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                const building = snapshot.buildings.find((candidate) => candidate.id === buildingId);
                return Boolean(
                    building &&
                    building.activeWorkerUnitId === workerId &&
                    snapshot.wallet?.gold === gold &&
                    snapshot.wallet.lumber === lumber,
                );
            },
            {
                buildingId: building.id,
                gold: walletBefore.gold - template.costGold,
                lumber: walletBefore.lumber - (template.costLumber ?? 0),
                workerId: builder.farmerId,
            },
            { timeout: 5_000 },
        );
        const repeatedResume = await getSnapshot(page);
        await clickWorld(page, builder.calibration, { x: buildingCenter.x + 320, y: buildingCenter.y }, 'right');
        await page.waitForFunction(
            (buildingId) => window.__chickenFarmDebug!
                .getConstructionLifecycleSnapshot()
                .buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === null,
            building.id,
            { timeout: 5_000 },
        );
        const movePaused = await getSnapshot(page);
        await clickWorld(page, builder.calibration, buildingCenter, 'right');
        await page.waitForFunction(
            ({ buildingId, workerId }) => window.__chickenFarmDebug!
                .getConstructionLifecycleSnapshot()
                .buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === workerId,
            { buildingId: building.id, workerId: builder.farmerId },
            { timeout: 30_000 },
        );
        if (!await page.evaluate((unitId) => window.__chickenFarmDebug!.damageControllableUnitForTest(unitId, 10_000), builder.farmerId)) {
            throw new Error('Unable to remove active builder through debug fixture');
        }
        await page.waitForFunction(
            (buildingId) => window.__chickenFarmDebug!
                .getConstructionLifecycleSnapshot()
                .buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === null,
            building.id,
            { timeout: 5_000 },
        );
        const builderRemoved = await getSnapshot(page);
        const removedBuilding = builderRemoved.lifecycle.buildings.find((candidate) => candidate.id === building.id);
        if (!removedBuilding) throw new Error(`Builder removal lost construction: ${JSON.stringify(builderRemoved)}`);
        await page.waitForFunction(
            ({ buildingId, elapsedSec, progress, gold, lumber }) => {
                const state = window.__chickenFarmDebug!.getState();
                const snapshot = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                const building = snapshot.buildings.find((candidate) => candidate.id === buildingId);
                return Boolean(
                    building &&
                    state.elapsedSec >= elapsedSec + 2 &&
                    building.activeWorkerUnitId === null &&
                    building.progress === progress &&
                    snapshot.wallet?.gold === gold &&
                    snapshot.wallet.lumber === lumber,
                );
            },
            {
                buildingId: building.id,
                elapsedSec: builderRemoved.state.elapsedSec,
                gold: walletBefore.gold - template.costGold,
                lumber: walletBefore.lumber - (template.costLumber ?? 0),
                progress: removedBuilding.progress,
            },
            { timeout: 20_000 },
        );
        const stableBuilderRemoved = await getSnapshot(page);
        const helperPositions = {
            foreign: { x: buildingCenter.x + 320, y: buildingCenter.y },
            friendly: { x: buildingCenter.x - 320, y: buildingCenter.y },
        };
        const farmersCreated = await page.evaluate(({ foreign, friendly }) => ({
            foreign: window.__chickenFarmDebug!.createDebugFarmerForTest('p4-helper', foreign.x, foreign.y, 4),
            friendly: window.__chickenFarmDebug!.createDebugFarmerForTest('p3-helper', friendly.x, friendly.y, 3),
        }), helperPositions);
        if (!farmersCreated.foreign || !farmersCreated.friendly) {
            throw new Error(`Unable to create debug handoff farmers: ${JSON.stringify(farmersCreated)}`);
        }
        await clickWorld(page, builder.calibration, helperPositions.foreign);
        await page.waitForFunction(
            (unitId) => window.__chickenFarmDebug!
                .getControlSnapshot()
                .units.some((unit) => unit.id === unitId && unit.selected),
            'p4-helper',
            { timeout: 5_000 },
        );
        await clickWorld(page, builder.calibration, buildingCenter, 'right');
        const foreignRejected = await getSnapshot(page);
        if (
            foreignRejected.lifecycle.buildings.find((candidate) => candidate.id === building.id)?.activeWorkerUnitId !== null ||
            foreignRejected.lifecycle.wallet?.gold !== walletBefore.gold - template.costGold
        ) {
            throw new Error(`Foreign builder resumed construction: ${JSON.stringify(foreignRejected)}`);
        }
        await clickWorld(page, builder.calibration, helperPositions.friendly);
        await page.waitForFunction(
            (unitId) => window.__chickenFarmDebug!
                .getControlSnapshot()
                .units.some((unit) => unit.id === unitId && unit.selected),
            'p3-helper',
            { timeout: 5_000 },
        );
        await clickWorld(page, builder.calibration, buildingCenter, 'right');
        await page.waitForFunction(
            ({ buildingId, workerId }) => {
                const lifecycle = window.__chickenFarmDebug!.getConstructionLifecycleSnapshot();
                return lifecycle.buildings.find((candidate) => candidate.id === buildingId)?.activeWorkerUnitId === workerId &&
                    lifecycle.pendingOrders.find((candidate) => candidate.runtimeBuildingId === buildingId)?.builderUnitId === workerId;
            },
            { buildingId: building.id, workerId: 'p3-helper' },
            { timeout: 30_000 },
        );
        const friendlyHandoff = await getSnapshot(page);
        if (errors.console.length || errors.page.length || errors.request.length || errors.response.length) {
            throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
        }

        return {
            case: constructionCase,
            checks: {
                debugFixtureIsolation: true,
                builderRemovalPausesWithoutAutoResume: true,
                foreignOwnerCannotResume: true,
                friendlyWorkerHandoffRebindsPendingOrder: true,
                moveCommandPausesActiveConstruction: true,
                pass: true,
                pausedProgressStaysFixed: true,
                repeatedResumeKeepsSingleWorkerAndCost: true,
                resumeContinuesWithoutAdditionalCost: true,
                stopPausesActiveConstruction: true,
            },
            errors,
            snapshots: {
                active: active.lifecycle,
                builderRemoved: builderRemoved.lifecycle,
                foreignRejected: foreignRejected.lifecycle,
                friendlyHandoff: friendlyHandoff.lifecycle,
                movePaused: movePaused.lifecycle,
                paused: paused.lifecycle,
                resumed: resumed.lifecycle,
                repeatedResume: repeatedResume.lifecycle,
                stablePaused: stablePaused.lifecycle,
                stableBuilderRemoved: stableBuilderRemoved.lifecycle,
            },
            template: { costGold: template.costGold, costLumber: template.costLumber ?? 0, id: template.id },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function runStartRejectionCases() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    try {
        const resource = await prepareNormalSession(page, true);
        const resourceBuilder = await selectFarmer(page, resource);
        await openPlacement(page, 'h');
        await clickWorld(page, resourceBuilder.calibration, { x: 4032, y: 8896 });
        await waitForPendingCount(page, 1);
        if (!await page.evaluate(() => window.__chickenFarmDebug!.setConstructionWalletForTest(0, 0))) {
            throw new Error('Unable to deplete debug fixture wallet');
        }
        await waitForPendingCount(page, 0, 30_000);
        const resourceRejected = await getSnapshot(page);
        assertRejectedStart(resourceRejected, 'resource depletion', 0, 0);

        const footprint = await prepareNormalSession(page, true);
        const footprintBuilder = await selectFarmer(page, footprint);
        await openPlacement(page, 'h');
        await clickWorld(page, footprintBuilder.calibration, { x: 4352, y: 8896 });
        await waitForPendingCount(page, 1);
        const pendingFootprint = (await getSnapshot(page)).lifecycle.pendingOrders[0];
        if (!pendingFootprint) throw new Error('Missing footprint rejection pending order');
        const blockerId = await page.evaluate(({ x, y }) =>
            window.__chickenFarmDebug!.createPathBlockerFixture(x, y),
        { x: pendingFootprint.footprint.x, y: pendingFootprint.footprint.y });
        if (!blockerId) throw new Error('Unable to create overlap blocker fixture');
        await waitForPendingCount(page, 0, 30_000);
        const footprintRejected = await getSnapshot(page);
        if (
            footprintRejected.lifecycle.buildings.length !== 1 ||
            footprintRejected.lifecycle.buildings[0]?.id !== blockerId ||
            footprintRejected.lifecycle.wallet?.gold !== 1500
        ) {
            throw new Error(`New-footprint rejection mismatch: ${JSON.stringify(footprintRejected)}`);
        }
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(id), blockerId)) {
            throw new Error('Unable to remove overlap blocker fixture after rejection');
        }
        await openPlacement(page, 'h');
        await clickWorld(page, footprintBuilder.calibration, { x: 4352, y: 8896 });
        await waitForPendingCount(page, 1);
        const followingInput = await getSnapshot(page);
        if (
            followingInput.lifecycle.pendingOrders[0]?.templateId !== 'farm_house' ||
            followingInput.lifecycle.wallet?.gold !== 1500 ||
            followingInput.lifecycle.buildings.length !== 0
        ) {
            throw new Error(`Following build input was blocked after rejection: ${JSON.stringify(followingInput)}`);
        }

        const death = await prepareNormalSession(page, true);
        const deathBuilder = await selectFarmer(page, death);
        await openPlacement(page, 'h');
        await clickWorld(page, deathBuilder.calibration, { x: 4352, y: 8896 });
        await waitForPendingCount(page, 1);
        if (!await page.evaluate((id) => window.__chickenFarmDebug!.damageControllableUnitForTest(id, 10_000), deathBuilder.farmerId)) {
            throw new Error('Unable to remove builder during pending order');
        }
        await waitForPendingCount(page, 0, 5_000);
        const builderRemoved = await getSnapshot(page);
        assertRejectedStart(builderRemoved, 'builder removal', 1500, 0);

        return {
            case: constructionCase,
            checks: {
                builderRemovalNoCharge: true,
                followingInputAcceptedAfterPathFailure: true,
                pass: true,
                resourceDepletionNoCharge: true,
                startOverlapNoCharge: true,
            },
            snapshots: {
                builderRemoved: builderRemoved.lifecycle,
                followingInput: followingInput.lifecycle,
                footprintRejected: footprintRejected.lifecycle,
                resourceRejected: resourceRejected.lifecycle,
            },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function waitForPendingCount(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    count: number,
    timeout = 5_000,
) {
    await page.waitForFunction(
        (expectedCount) =>
            window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().pendingOrders.length === expectedCount,
        count,
        { timeout },
    );
}

function assertRejectedStart(
    snapshot: Awaited<ReturnType<typeof getSnapshot>>,
    label: string,
    expectedGold: number,
    expectedLumber: number,
) {
    if (
        snapshot.lifecycle.pendingOrders.length !== 0 ||
        snapshot.lifecycle.buildings.length !== 0 ||
        snapshot.lifecycle.wallet?.gold !== expectedGold ||
        snapshot.lifecycle.wallet.lumber !== expectedLumber
    ) {
        throw new Error(`${label} failed to clear without a charge: ${JSON.stringify(snapshot)}`);
    }
}

async function prepareNormalSession(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    expectsDebugFixtures = false,
) {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(
        () => Boolean(window.__chickenFarmDebug) && window.__chickenFarmDebug!.getState().elapsedSec > 0,
        null,
        { timeout: 15_000 },
    );
    const snapshot = await getSnapshot(page);
    assertNormalBaseline(snapshot, expectsDebugFixtures);
    return { canvas: await getCanvasBounds(page), snapshot };
}

async function selectFarmer(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    session: Awaited<ReturnType<typeof prepareNormalSession>>,
) {
    const calibration = await calibrateWorldInput(page, session.canvas);
    const farmer = session.snapshot.controls.units.find((unit) => unit.templateId === 'farmer');
    if (!farmer) throw new Error('Missing normal-session farmer');
    await clickWorld(page, calibration, { x: farmer.x, y: farmer.y });
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) => unit.id === farmerId && unit.selected,
            ),
        farmer.id,
        { timeout: 5_000 },
    );
    return { calibration, farmerId: farmer.id };
}

async function calibrateWorldInput(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: CanvasBounds,
) {
    const calibrationPoint = { x: canvas.left, y: canvas.top };
    await page.mouse.click(calibrationPoint.x, calibrationPoint.y);
    const calibration = await getSnapshot(page);
    const referencePoint = {
        x: canvas.left + canvas.width / 4,
        y: canvas.top + canvas.height / 4,
    };
    await page.mouse.click(referencePoint.x, referencePoint.y);
    const reference = await getSnapshot(page);
    const calibrationWorldPoint = calibration.controls.lastPrimaryClickWorldPoint;
    const referenceWorldPoint = reference.controls.lastPrimaryClickWorldPoint;
    if (!calibrationWorldPoint || !referenceWorldPoint) {
        throw new Error('Missing world-coordinate calibration');
    }
    return { calibrationPoint, calibrationWorldPoint, referencePoint, referenceWorldPoint };
}

async function openPlacement(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    hotkey: 'c' | 'f' | 'h',
) {
    await page.keyboard.press('b');
    await page.waitForFunction(() => window.__chickenFarmDebug!.getState().commandPage === 'build', null, {
        timeout: 5_000,
    });
    await page.keyboard.press(hotkey);
    const expected = hotkey === 'c' ? 'coop_basic' : hotkey === 'h' ? 'farm_house' : 'fence_wood';
    await page.waitForFunction(
        (templateId) => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === templateId,
        expected,
        { timeout: 5_000 },
    );
}

async function assertPlacementCancelled(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    label: string,
) {
    await page.waitForFunction(
        () => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot().activePlacementTemplateId === null,
        null,
        { timeout: 5_000 },
    );
    const snapshot = await getSnapshot(page);
    if (snapshot.lifecycle.pendingOrders.length !== 0 || snapshot.lifecycle.buildings.length !== 0) {
        throw new Error(`${label} leaked construction state: ${JSON.stringify(snapshot)}`);
    }
}

async function moveWorldPointIntoViewport(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    point: { readonly x: number; readonly y: number },
) {
    const axis = async (key: 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp') => {
        await page.keyboard.down(key);
        try {
            await page.waitForFunction(
                ({ key, point }) => {
                    const camera = window.__chickenFarmDebug!.getControlSnapshot().camera;
                    const maxX = camera.scrollX + camera.viewportWidth / camera.zoom;
                    const maxY = camera.scrollY + camera.viewportHeight / camera.zoom;
                    if (key === 'ArrowLeft') return camera.scrollX <= point.x;
                    if (key === 'ArrowUp') return camera.scrollY <= point.y;
                    if (key === 'ArrowRight') return maxX >= point.x;
                    return maxY >= point.y;
                },
                { key, point },
                { timeout: 25_000 },
            );
        } finally {
            await page.keyboard.up(key);
        }
    };

    const camera = (await getSnapshot(page)).controls.camera;
    const maxX = camera.scrollX + camera.viewportWidth / camera.zoom;
    const maxY = camera.scrollY + camera.viewportHeight / camera.zoom;
    if (point.x < camera.scrollX) await axis('ArrowLeft');
    if (point.y < camera.scrollY) await axis('ArrowUp');
    if (point.x > maxX) await axis('ArrowRight');
    if (point.y > maxY) await axis('ArrowDown');
}

function rebaseCalibrationForCamera(
    calibration: {
        readonly calibrationPoint: { readonly x: number; readonly y: number };
        readonly calibrationWorldPoint: { readonly x: number; readonly y: number };
        readonly referencePoint: { readonly x: number; readonly y: number };
        readonly referenceWorldPoint: { readonly x: number; readonly y: number };
    },
    before: ControlSnapshot['camera'],
    after: ControlSnapshot['camera'],
) {
    const xDelta = after.scrollX - before.scrollX;
    const yDelta = after.scrollY - before.scrollY;
    return {
        ...calibration,
        calibrationWorldPoint: {
            x: calibration.calibrationWorldPoint.x + xDelta,
            y: calibration.calibrationWorldPoint.y + yDelta,
        },
        referenceWorldPoint: {
            x: calibration.referenceWorldPoint.x + xDelta,
            y: calibration.referenceWorldPoint.y + yDelta,
        },
    };
}

async function getSnapshot(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.evaluate(() => ({
        controls: window.__chickenFarmDebug!.getControlSnapshot(),
        lifecycle: window.__chickenFarmDebug!.getConstructionLifecycleSnapshot(),
        state: window.__chickenFarmDebug!.getState(),
    })) as Promise<{ readonly controls: ControlSnapshot; readonly lifecycle: ReturnType<Window['__chickenFarmDebug']['getConstructionLifecycleSnapshot']>; readonly state: ReturnType<Window['__chickenFarmDebug']['getState']> }>;
}

async function getLifecycle(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.evaluate(() => window.__chickenFarmDebug!.getConstructionLifecycleSnapshot()) as Promise<ReturnType<Window['__chickenFarmDebug']['getConstructionLifecycleSnapshot']>>;
}

function assertNormalBaseline(
    snapshot: Awaited<ReturnType<typeof getSnapshot>>,
    expectsDebugFixtures = false,
) {
    if (
        snapshot.state.debugPoc.combatActive ||
        snapshot.state.debugPoc.fixturesEnabled !== expectsDebugFixtures ||
        snapshot.state.debugPoc.terrainProbeCount !== 0 ||
        snapshot.state.selectedUnitCount !== 0 ||
        snapshot.lifecycle.buildings.length !== 0 ||
        snapshot.lifecycle.pendingOrders.length !== 0 ||
        snapshot.lifecycle.wallet?.gold !== 1500 ||
        snapshot.lifecycle.wallet.lumber !== 0
    ) {
        throw new Error(`Unexpected normal construction baseline: ${JSON.stringify(snapshot)}`);
    }
}

function assertNoSelection(controls: ControlSnapshot, label: string) {
    if (controls.units.some((unit) => unit.selected)) {
        throw new Error(`${label} changed selection: ${JSON.stringify(controls)}`);
    }
}

async function clickWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: {
        readonly calibrationPoint: { readonly x: number; readonly y: number };
        readonly calibrationWorldPoint: { readonly x: number; readonly y: number };
        readonly referencePoint: { readonly x: number; readonly y: number };
        readonly referenceWorldPoint: { readonly x: number; readonly y: number };
    },
    worldPoint: { readonly x: number; readonly y: number },
    button: 'left' | 'right' = 'left',
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
        calibration.calibrationPoint.x + (worldPoint.x - calibration.calibrationWorldPoint.x) / scaleX,
        calibration.calibrationPoint.y + (worldPoint.y - calibration.calibrationWorldPoint.y) / scaleY,
        { button },
    );
}

async function getCanvasBounds(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
    return page.locator('canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    }) as Promise<CanvasBounds>;
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
