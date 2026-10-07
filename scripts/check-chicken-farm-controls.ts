import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

type ControlSnapshot = {
    readonly camera: {
        readonly scrollX: number;
        readonly scrollY: number;
        readonly viewportHeight: number;
        readonly viewportWidth: number;
        readonly zoom: number;
    };
    readonly lastPrimaryClickWorldPoint: { readonly x: number; readonly y: number } | null;
    readonly targeting: { readonly attack: boolean; readonly herd: boolean };
    readonly units: readonly {
        readonly commandQueueCount: number;
        readonly currentCommandTargetPoint: { readonly x: number; readonly y: number } | null;
        readonly currentCommandType: string | null;
        readonly economyTaskType: string | null;
        readonly id: string;
        readonly pathIndex: number;
        readonly pathWaypointCount: number;
        readonly queuedCommandTargetPoints: readonly (
            | { readonly x: number; readonly y: number }
            | null
        )[];
        readonly screenX: number;
        readonly screenY: number;
        readonly selected: boolean;
        readonly templateId: string;
        readonly x: number;
        readonly y: number;
    }[];
};

type GameState = {
    readonly buildingCount: number;
    readonly debugPoc: {
        readonly combatActive: boolean;
        readonly fixturesEnabled: boolean;
        readonly terrainProbeCount: number;
    };
    readonly primaryUnit: { readonly id: string; readonly x: number; readonly y: number } | null;
    readonly runId: number;
    readonly selectedUnitCount: number;
};

type CanvasBounds = {
    readonly height: number;
    readonly left: number;
    readonly top: number;
    readonly width: number;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4176;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const controlCase = process.env.CHICKEN_FARM_CONTROL_CASE ?? 'selection';
const browserCdpUrl = process.env.CHICKEN_FARM_BROWSER_CDP_URL;
const WORLD_POINT_TOLERANCE_PX = 3;
const PATH_ARRIVAL_TOLERANCE_PX = 24;

if (
    controlCase !== 'farmer_select' &&
    controlCase !== 'selection' &&
    controlCase !== 'right_click' &&
    controlCase !== 'right_click_fixture' &&
    controlCase !== 'stop' &&
    controlCase !== 'stop_fixture' &&
    controlCase !== 'queue' &&
    controlCase !== 'terrain' &&
    controlCase !== 'dynamic_blocker' &&
    controlCase !== 'restart'
) {
    throw new Error(`Unsupported CHICKEN_FARM_CONTROL_CASE: ${controlCase}`);
}

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = await runControlCase();
        console.log(JSON.stringify(report, null, 2));
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
                controlCase === 'right_click_fixture' ||
                controlCase === 'stop_fixture' ||
                controlCase === 'dynamic_blocker' ||
                controlCase === 'restart'
                    ? 'true'
                    : 'false',
            VITE_CHICKEN_FARM_START_ID: '3',
            VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG: 'false',
        },
    });
    server.stderr.on('data', (data) => process.stderr.write(String(data)));
    return server;
}

async function runControlCase() {
    const browser = browserCdpUrl
        ? await chromium.connectOverCDP(browserCdpUrl)
        : await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { height: 720, width: 960 } });
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    const failedResponses: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) =>
        requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`),
    );
    page.on('response', (response) => {
        if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, {
            timeout: 15_000,
        });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getState().elapsedSec > 0,
            null,
            { timeout: 10_000 },
        );

        const initial = await getSnapshot(page);
        assertControlBaseline(
            initial.state,
            initial.controls,
                controlCase === 'right_click_fixture' ||
                controlCase === 'stop_fixture' ||
                controlCase === 'dynamic_blocker' ||
                controlCase === 'restart',
        );
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(180);
        await page.keyboard.up('ArrowRight');
        const before = await getSnapshot(page);
        assertCameraPan(initial.controls, before.controls);
        assertControlBaseline(
            before.state,
            before.controls,
                controlCase === 'right_click_fixture' ||
                controlCase === 'stop_fixture' ||
                controlCase === 'dynamic_blocker' ||
                controlCase === 'restart',
        );
        const farmer = before.controls.units.find((unit) => unit.templateId === 'farmer');
        if (!farmer) throw new Error('Missing normal-session farmer');
        if (!isInWorldViewport(farmer, before.controls.camera)) {
            throw new Error(`Farmer screen point is outside world viewport: ${JSON.stringify(farmer)}`);
        }

        const canvas = await getCanvasBounds(page);
        const calibrationPoint = { x: canvas.left, y: canvas.top };
        await page.mouse.click(calibrationPoint.x, calibrationPoint.y);
        const calibration = await getSnapshot(page);
        assertCalibrationClick(calibration.state, calibration.controls);
        const referencePoint = {
            x: canvas.left + canvas.width / 4,
            y: canvas.top + canvas.height / 4,
        };
        await page.mouse.click(referencePoint.x, referencePoint.y);
        const reference = await getSnapshot(page);
        assertCalibrationClick(reference.state, reference.controls);
        const clickPoint = getBrowserPointForWorld({
            canvas,
            calibrationPoint,
            calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
            referencePoint,
            referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
            worldPoint: { x: farmer.x, y: farmer.y },
        });
        await page.mouse.click(clickPoint.x, clickPoint.y);
        try {
            await page.waitForFunction(
                (farmerId) =>
                    window.__chickenFarmDebug!.getControlSnapshot().units.some(
                        (unit) => unit.id === farmerId && unit.selected,
                    ),
                farmer.id,
                { timeout: 5_000 },
            );
        } catch (error) {
            throw new Error(
                `Farmer did not select after real click: ${JSON.stringify({
                    before,
                    afterClick: await getSnapshot(page),
                    calibration,
                    reference,
                    canvas,
                    clickPoint,
                    farmer,
                })}`,
                { cause: error },
            );
        }
        const after = await getSnapshot(page);
        assertFarmerSelection(after.state, after.controls, farmer.id);
        const selection =
            controlCase === 'selection'
                ? await runSelectionCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const rightClick =
            controlCase === 'right_click'
                ? await runRightClickCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const rightClickFixture =
            controlCase === 'right_click_fixture'
                ? await runRightClickFixtureCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const stop =
            controlCase === 'stop'
                ? await runStopCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const stopFixture =
            controlCase === 'stop_fixture'
                ? await runStopFixtureCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const queue =
            controlCase === 'queue'
                ? await runQueueCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  }, before.controls.camera)
                : null;
        const terrain =
            controlCase === 'terrain'
                ? await runTerrainCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const dynamicBlocker =
            controlCase === 'dynamic_blocker'
                ? await runDynamicBlockerCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;
        const restart =
            controlCase === 'restart'
                ? await runRestartCase(page, {
                      calibrationPoint,
                      calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
                      canvas,
                      referencePoint,
                      referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
                  })
                : null;

        if (consoleErrors.length || pageErrors.length || requestFailures.length || failedResponses.length) {
            throw new Error(
                `Browser errors: ${JSON.stringify({ consoleErrors, failedResponses, pageErrors, requestFailures })}`,
            );
        }

        return {
            baseUrl,
            case: controlCase,
            checks: {
                farmerSelected: true,
                normalFixtureIsolation:
                    controlCase !== 'right_click_fixture' &&
                    controlCase !== 'stop_fixture' &&
                    controlCase !== 'dynamic_blocker' &&
                    controlCase !== 'restart',
                rightClick: rightClick?.pass ?? null,
                rightClickFixture: rightClickFixture?.pass ?? null,
                selection: selection?.pass ?? null,
                stop: stop?.pass ?? null,
                stopFixture: stopFixture?.pass ?? null,
                queue: queue?.pass ?? null,
                terrain: terrain?.pass ?? null,
                dynamicBlocker: dynamicBlocker?.pass ?? null,
                restart: restart?.pass ?? null,
                pass: true,
            },
            after: after.controls,
            before: before.controls,
            browser: 'playwright.chromium',
            cameraPan: {
                afterScrollX: before.controls.camera.scrollX,
                beforeScrollX: initial.controls.camera.scrollX,
                zoom: before.controls.camera.zoom,
            },
            calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint,
            referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint,
            rightClick,
            rightClickFixture,
            selection,
            stop,
            stopFixture,
            queue,
            terrain,
            dynamicBlocker,
            restart,
            canvas,
            clickPoint,
            viewport: { height: 720, width: 960 },
        };
    } finally {
        await page.close();
        await browser.close();
    }
}

async function getCanvasBounds(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
) {
    return page.locator('canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    }) as Promise<CanvasBounds>;
}

async function getSnapshot(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
) {
    return page.evaluate(() => ({
        controls: window.__chickenFarmDebug!.getControlSnapshot(),
        state: window.__chickenFarmDebug!.getState(),
    })) as Promise<{ readonly controls: ControlSnapshot; readonly state: GameState }>;
}

function assertControlBaseline(
    state: GameState,
    controls: ControlSnapshot,
    expectsDebugFixtures: boolean,
) {
    if (
        state.debugPoc.combatActive ||
        state.debugPoc.fixturesEnabled !== expectsDebugFixtures ||
        state.debugPoc.terrainProbeCount !== 0
    ) {
        throw new Error(`Unexpected control debug state: ${JSON.stringify(state.debugPoc)}`);
    }
    if (state.selectedUnitCount !== 0 || controls.units.some((unit) => unit.selected)) {
        throw new Error('Normal control case must begin with no selected unit');
    }
    if (controls.units.length !== 2 || controls.camera.zoom <= 0) {
        throw new Error(`Unexpected normal controls snapshot: ${JSON.stringify(controls)}`);
    }
}

function assertCameraPan(before: ControlSnapshot, after: ControlSnapshot) {
    if (after.camera.scrollX <= before.camera.scrollX || after.camera.zoom !== before.camera.zoom) {
        throw new Error(`Camera pan/zoom mismatch: ${JSON.stringify({ after, before })}`);
    }
}

function assertFarmerSelection(state: GameState, controls: ControlSnapshot, farmerId: string) {
    const selected = controls.units.filter((unit) => unit.selected);
    if (state.selectedUnitCount !== 1 || selected.length !== 1 || selected[0]?.id !== farmerId) {
        throw new Error(`Farmer selection mismatch: ${JSON.stringify({ controls, state })}`);
    }
    if (selected[0].currentCommandType !== null || selected[0].commandQueueCount !== 0) {
        throw new Error(`Selection emitted a command: ${JSON.stringify(selected[0])}`);
    }
}

function assertCalibrationClick(state: GameState, controls: ControlSnapshot) {
    if (!controls.lastPrimaryClickWorldPoint || state.selectedUnitCount !== 0) {
        throw new Error(`Calibration click changed selection: ${JSON.stringify({ controls, state })}`);
    }
}

async function runSelectionCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const before = await getSnapshot(page);
    const farmer = findUnit(before.controls, 'farmer');
    const dog = findUnit(before.controls, 'dog');

    await clickWorld(page, calibration, { x: dog.x, y: dog.y });
    const dogSelected = await getSnapshot(page);
    assertOnlySelected(dogSelected, dog.id, 'dog click');

    const dragBounds = {
        end: { x: dog.x + 36, y: dog.y + 36 },
        start: { x: farmer.x - 36, y: farmer.y - 36 },
    };
    await dragWorld(page, calibration, dragBounds.start, dragBounds.end);
    const forwardDrag = await getSnapshot(page);
    assertSelectedIds(forwardDrag, [farmer.id, dog.id], 'forward drag');

    await dragWorld(page, calibration, dragBounds.end, dragBounds.start);
    const reverseDrag = await getSnapshot(page);
    assertSelectedIds(reverseDrag, [farmer.id, dog.id], 'reverse drag');

    await clickWorld(page, calibration, { x: farmer.x + 192, y: farmer.y + 160 });
    const emptyWorldClick = await getSnapshot(page);
    assertSelectedIds(emptyWorldClick, [], 'empty world click');

    await page.mouse.click(calibration.canvas.left + calibration.canvas.width / 2, 630);
    const hudClick = await getSnapshot(page);
    assertSelectedIds(hudClick, [], 'HUD click');
    await page.mouse.move(calibration.canvas.left + 420, 620);
    await page.mouse.down();
    await page.mouse.move(calibration.canvas.left + 540, 690, { steps: 4 });
    await page.mouse.up();
    const hudDrag = await getSnapshot(page);
    assertSelectedIds(hudDrag, [], 'HUD drag');

    return {
        after: hudDrag.controls,
        cases: {
            dogClick: true,
            emptyWorldClick: true,
            forwardDrag: true,
            hudClick: true,
            hudDrag: true,
            reverseDrag: true,
        },
        pass: true,
    };
}

async function runRightClickCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const dog = findUnit(initial.controls, 'dog');
    const target = { x: farmer.x + 192, y: farmer.y + 160 };

    await rightClickWorld(page, calibration, target);
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) => unit.id === farmerId && unit.currentCommandType === 'move',
            ),
        farmer.id,
        { timeout: 15_000 },
    );
    const moved = await getSnapshot(page);
    assertRightClickMove(moved, farmer.id, dog.id);

    await page.waitForFunction(
        () =>
            window.__chickenFarmDebug!.getControlSnapshot().units.every(
                (unit) =>
                    unit.currentCommandType === null &&
                    unit.commandQueueCount === 0 &&
                    unit.pathWaypointCount === 0,
            ),
        undefined,
        { timeout: 5_000 },
    );

    await clickWorld(page, calibration, { x: farmer.x + 320, y: farmer.y + 224 });
    const deselected = await getSnapshot(page);
    assertSelectedIds(deselected, [], 'right-click no-selection setup');
    await rightClickWorld(page, calibration, { x: farmer.x + 416, y: farmer.y + 160 });
    const noSelection = await getSnapshot(page);
    assertNoCommands(noSelection.controls, 'right-click without selection');

    const settledFarmer = noSelection.controls.units.find((unit) => unit.id === farmer.id);
    if (!settledFarmer) throw new Error('Farmer disappeared during right-click check.');
    await clickWorld(page, calibration, { x: settledFarmer.x, y: settledFarmer.y });
    const reselected = await getSnapshot(page);
    assertOnlySelected(reselected, farmer.id, 'right-click HUD setup');
    await page.mouse.click(calibration.canvas.left + calibration.canvas.width / 2, 630, {
        button: 'right',
    });
    const hudRightClick = await getSnapshot(page);
    assertNoCommands(hudRightClick.controls, 'HUD right-click');
    assertOnlySelected(hudRightClick, farmer.id, 'HUD right-click selection');

    await page.keyboard.press('a');
    await page.waitForFunction(() => window.__chickenFarmDebug!.getControlSnapshot().targeting.attack, null, {
        timeout: 5_000,
    });
    await rightClickWorld(page, calibration, { x: settledFarmer.x + 96, y: settledFarmer.y + 96 });
    const targetingCancelled = await getSnapshot(page);
    if (targetingCancelled.controls.targeting.attack || targetingCancelled.controls.targeting.herd) {
        throw new Error(`Right click did not cancel targeting: ${JSON.stringify(targetingCancelled)}`);
    }
    assertNoCommands(targetingCancelled.controls, 'targeting cancel right-click');

    return {
        after: targetingCancelled.controls,
        cases: {
            hudRightClick: true,
            noSelection: true,
            selectedMove: true,
            targetingCancel: true,
        },
        pass: true,
    };
}

async function runTerrainCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const target = { x: farmer.x + 192, y: farmer.y + 160 };

    await rightClickWorld(page, calibration, target);
    await waitForCommandTarget(page, farmer.id, target, 5_000);
    await waitForIdle(page, farmer.id, 30_000);
    const after = await getSnapshot(page);
    assertPositionNear(findUnit(after.controls, 'farmer'), target, 'terrain player arrival');

    return {
        after: after.controls,
        cases: { normalPlayerTerrainMove: true },
        pass: true,
        target,
    };
}

async function runDynamicBlockerCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const detourTarget = { x: farmer.x + 384, y: farmer.y };
    await rightClickWorld(page, calibration, detourTarget);
    await waitForCommandTarget(page, farmer.id, detourTarget, 5_000);
    const detourBlockerId = await createCompletedCoop(page, {
        x: farmer.x + 96,
        y: farmer.y - 64,
    });
    // The detour may traverse three WPM waypoints while the headless frame rate is throttled.
    // Keep the arrival assertion; allow the measured route enough wall-clock time to finish.
    await waitForIdle(page, farmer.id, 45_000);
    const afterDetour = await getSnapshot(page);
    assertPositionNear(findUnit(afterDetour.controls, 'farmer'), detourTarget, 'dynamic detour arrival');

    const detourBlockerRemoved = await removeCompletedFixture(page, detourBlockerId);
    if (!detourBlockerRemoved) throw new Error('Could not remove detour blocker fixture.');

    const afterDetourFarmer = findUnit(afterDetour.controls, 'farmer');
    const blockedTarget = { x: afterDetourFarmer.x + 288, y: afterDetourFarmer.y };
    await rightClickWorld(page, calibration, blockedTarget);
    await waitForCommandTarget(page, farmer.id, blockedTarget, 5_000);
    const fullBlockerId = await createCompletedCoop(page, {
        x: blockedTarget.x - 64,
        y: blockedTarget.y - 64,
    });
    await waitForIdle(page, farmer.id, 45_000);
    const afterBlocked = await getSnapshot(page);
    assertNoActiveMove(afterBlocked.controls, farmer.id, 'fully blocked target must finish');

    const fullBlockerRemoved = await removeCompletedFixture(page, fullBlockerId);
    if (!fullBlockerRemoved) throw new Error('Could not remove full blocker fixture.');
    await rightClickWorld(page, calibration, blockedTarget);
    await waitForCommandTarget(page, farmer.id, blockedTarget, 5_000);
    await waitForIdle(page, farmer.id, 45_000);
    const afterRemoval = await getSnapshot(page);
    assertPositionNear(findUnit(afterRemoval.controls, 'farmer'), blockedTarget, 'blocker removal next command');

    return {
        cases: {
            blockerRemovalAcceptsNewMove: true,
            fullBlockerFiniteFailure: true,
            reroutesAroundNewBlocker: true,
        },
        pass: true,
    };
}

async function runRestartCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    await page.keyboard.down('Shift');
    await rightClickWorld(page, calibration, { x: farmer.x + 160, y: farmer.y + 64 });
    await rightClickWorld(page, calibration, { x: farmer.x + 288, y: farmer.y + 64 });
    await page.keyboard.up('Shift');
    await waitForCommandTarget(page, farmer.id, { x: farmer.x + 160, y: farmer.y + 64 }, 5_000);
    const fixtureId = await createCompletedCoop(page, { x: farmer.x + 384, y: farmer.y - 64 });

    const first = await restartAndAssertIsolated(page, initial.state.runId, 'first restart');
    const firstCalibration = await recalibrateAfterRestart(page, calibration.canvas);
    await selectFarmerAfterRestart(page, firstCalibration, first.controls);
    const firstFarmer = findUnit((await getSnapshot(page)).controls, 'farmer');
    const firstTarget = { x: firstFarmer.x + 96, y: firstFarmer.y + 64 };
    await rightClickWorld(page, firstCalibration, firstTarget);
    await waitForCommandTarget(page, firstFarmer.id, firstTarget, 5_000);

    const second = await restartAndAssertIsolated(page, first.state.runId, 'second restart');
    const secondCalibration = await recalibrateAfterRestart(page, calibration.canvas);
    await selectFarmerAfterRestart(page, secondCalibration, second.controls);
    const secondFarmer = findUnit((await getSnapshot(page)).controls, 'farmer');
    const secondTarget = { x: secondFarmer.x + 96, y: secondFarmer.y + 64 };
    await rightClickWorld(page, secondCalibration, secondTarget);
    await waitForCommandTarget(page, secondFarmer.id, secondTarget, 5_000);
    await page.keyboard.press('s');
    await waitForCommand(page, secondFarmer.id, 'stop');
    assertStop((await getSnapshot(page)).controls, secondFarmer.id, 'restart fresh Stop');

    return {
        cases: {
            firstFixtureDisposed: first.state.buildingCount === 0 && Boolean(fixtureId),
            noStaleSelectionOrCommand: true,
            secondRestartFreshInput: true,
        },
        pass: true,
    };
}

async function restartAndAssertIsolated(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    previousRunId: number,
    label: string,
) {
    const restarted = await page.evaluate(() => window.__chickenFarmDebug!.restartRunForTest());
    if (!restarted) throw new Error(`${label}: restart was rejected`);
    await page.waitForFunction(
        (runId) => window.__chickenFarmDebug!.getState().runId > runId,
        previousRunId,
        { timeout: 10_000 },
    );
    const snapshot = await getSnapshot(page);
    if (snapshot.state.selectedUnitCount !== 0 || snapshot.state.buildingCount !== 0) {
        throw new Error(`${label}: stale state survived: ${JSON.stringify(snapshot)}`);
    }
    assertNoCommands(snapshot.controls, label);
    return snapshot;
}

async function selectFarmerAfterRestart(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
    controls: ControlSnapshot,
) {
    const farmer = findUnit(controls, 'farmer');
    await clickWorld(page, calibration, { x: farmer.x, y: farmer.y });
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) => unit.id === farmerId && unit.selected,
            ),
        farmer.id,
        { timeout: 5_000 },
    );
}

async function recalibrateAfterRestart(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: CanvasBounds,
) {
    const calibrationPoint = { x: canvas.left, y: canvas.top };
    await page.mouse.click(calibrationPoint.x, calibrationPoint.y);
    const calibration = await getSnapshot(page);
    assertCalibrationClick(calibration.state, calibration.controls);
    const referencePoint = {
        x: canvas.left + canvas.width / 4,
        y: canvas.top + canvas.height / 4,
    };
    await page.mouse.click(referencePoint.x, referencePoint.y);
    const reference = await getSnapshot(page);
    assertCalibrationClick(reference.state, reference.controls);
    return {
        calibrationPoint,
        calibrationWorldPoint: calibration.controls.lastPrimaryClickWorldPoint!,
        canvas,
        referencePoint,
        referenceWorldPoint: reference.controls.lastPrimaryClickWorldPoint!,
    };
}

async function createCompletedCoop(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    point: { readonly x: number; readonly y: number },
) {
    return page.evaluate(({ x, y }) => {
        const id = window.__chickenFarmDebug!.createPathBlockerFixture(x, y);
        if (!id) throw new Error('Unable to create dynamic blocker fixture.');
        return id;
    }, point);
}

async function removeCompletedFixture(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    buildingId: string,
) {
    return page.evaluate(
        (id) => window.__chickenFarmDebug!.removeCompletedBuildingFixture(id),
        buildingId,
    );
}

async function runStopCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const dog = findUnit(initial.controls, 'dog');

    await rightClickWorld(page, calibration, { x: farmer.x + 760, y: farmer.y - 96 });
    await waitForCommand(page, farmer.id, 'move');
    const farmerMoving = await getSnapshot(page);

    await clickWorld(page, calibration, { x: dog.x, y: dog.y });
    await rightClickWorld(page, calibration, { x: dog.x + 720, y: dog.y + 96 });
    await waitForCommand(page, dog.id, 'move');
    const dogMoving = await getSnapshot(page);
    const movingFarmer = findUnit(dogMoving.controls, 'farmer');
    await clickWorld(page, calibration, { x: movingFarmer.x, y: movingFarmer.y });

    await page.keyboard.press('s');
    await waitForCommand(page, farmer.id, 'stop');
    const hotkeyStopped = await getSnapshot(page);
    assertStop(hotkeyStopped.controls, farmer.id, 'S');
    assertCommand(hotkeyStopped.controls, dog.id, 'move', 'S must retain unselected dog command');
    const stoppedFarmer = findUnit(hotkeyStopped.controls, 'farmer');
    await page.waitForTimeout(350);
    const afterObservation = await getSnapshot(page);
    assertStop(afterObservation.controls, farmer.id, 'S observation');
    assertPositionStable(stoppedFarmer, findUnit(afterObservation.controls, 'farmer'), 'S');

    await page.keyboard.press('s');
    const repeatedHotkey = await getSnapshot(page);
    assertStop(repeatedHotkey.controls, farmer.id, 'repeated S');

    const resumedFarmer = findUnit(repeatedHotkey.controls, 'farmer');
    await rightClickWorld(page, calibration, {
        x: resumedFarmer.x + 448,
        y: resumedFarmer.y + 160,
    });
    await waitForCommand(page, farmer.id, 'move');

    await clickStopCommandCard(page, calibration.canvas);
    await waitForCommand(page, farmer.id, 'stop');
    const cardStopped = await getSnapshot(page);
    assertStop(cardStopped.controls, farmer.id, 'command-card Stop');
    assertCommand(cardStopped.controls, dog.id, 'move', 'card Stop must retain unselected dog command');

    await clickStopCommandCard(page, calibration.canvas);
    const repeatedCard = await getSnapshot(page);
    assertStop(repeatedCard.controls, farmer.id, 'repeated command-card Stop');
    const cardStoppedFarmer = findUnit(repeatedCard.controls, 'farmer');
    await rightClickWorld(page, calibration, {
        x: cardStoppedFarmer.x + 384,
        y: cardStoppedFarmer.y - 192,
    });
    await waitForCommand(page, farmer.id, 'move');

    return {
        after: await getSnapshot(page),
        cases: {
            cardStop: true,
            hotkeyStop: true,
            repeatSafe: true,
            unselectedDogRetained: true,
        },
        pass: true,
    };
}

async function runQueueCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
    baseCamera: ControlSnapshot['camera'],
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const a = { x: farmer.x + 320, y: farmer.y - 32 };
    const b = { x: farmer.x + 640, y: farmer.y - 32 };
    const c = { x: farmer.x + 960, y: farmer.y - 32 };

    await rightClickWorld(page, calibration, a);
    await waitForCommandTarget(page, farmer.id, a);
    await page.keyboard.down('Shift');
    await rightClickWorld(page, calibration, b);
    await rightClickWorld(page, calibration, c);
    await page.keyboard.up('Shift');
    const queued = await getSnapshot(page);
    assertCommandTarget(queued.controls, farmer.id, a, 'A→B→C current');
    assertQueuedTargets(queued.controls, farmer.id, [b, c], 'A→B→C queue');

    await waitForCommandTarget(page, farmer.id, b, 70_000);
    await waitForCommandTarget(page, farmer.id, c, 70_000);
    await waitForIdle(page, farmer.id, 70_000);
    const afterSequence = await getSnapshot(page);
    assertPositionNear(findUnit(afterSequence.controls, 'farmer'), c, 'A→B→C arrival');

    const sequenceFarmer = findUnit(afterSequence.controls, 'farmer');
    const replaceA = { x: sequenceFarmer.x - 704, y: sequenceFarmer.y + 32 };
    const replaceB = { x: sequenceFarmer.x - 448, y: sequenceFarmer.y + 64 };
    const replaceD = { x: sequenceFarmer.x - 288, y: sequenceFarmer.y - 224 };
    await rightClickWorld(page, calibration, replaceA);
    await waitForCommandTarget(page, farmer.id, replaceA);
    await page.keyboard.down('Shift');
    await rightClickWorld(page, calibration, replaceB);
    await page.keyboard.up('Shift');
    const replaceQueued = await getSnapshot(page);
    assertQueuedTargets(replaceQueued.controls, farmer.id, [replaceB], 'replace setup');
    await rightClickWorld(page, calibration, replaceD);
    await waitForCommandTarget(page, farmer.id, replaceD);
    const replaced = await getSnapshot(page);
    assertQueuedTargets(replaced.controls, farmer.id, [], 'replace D');
    await page.waitForTimeout(350);
    assertCommandTarget((await getSnapshot(page)).controls, farmer.id, replaceD, 'replace observation');

    await page.keyboard.down('Shift');
    await rightClickWorld(page, calibration, {
        x: replaceD.x + 256,
        y: replaceD.y + 96,
    });
    await page.keyboard.up('Shift');
    await page.keyboard.press('s');
    await waitForCommand(page, farmer.id, 'stop');
    assertStop((await getSnapshot(page)).controls, farmer.id, 'queue Stop');

    await rightClickWorld(page, calibration, { x: 3400, y: 8928 });
    await waitForCommandTarget(page, farmer.id, { x: 3400, y: 8928 });

    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(760);
    await page.keyboard.up('ArrowDown');
    const lowerCamera = (await getSnapshot(page)).controls.camera;
    const blockedB = { x: 4816, y: 10384 };
    const validC = { x: 3056, y: 9552 };
    if (!isWorldPointInViewport(blockedB, lowerCamera) || !isWorldPointInViewport(validC, lowerCamera)) {
        throw new Error(`Camera did not reach failed-command viewport: ${JSON.stringify(lowerCamera)}`);
    }
    const lowerCalibration = rebaseCalibrationForCamera(calibration, baseCamera, lowerCamera);
    await page.keyboard.down('Shift');
    await rightClickWorld(page, lowerCalibration, blockedB);
    await rightClickWorld(page, lowerCalibration, validC);
    await page.keyboard.up('Shift');
    const failedQueued = await getSnapshot(page);
    assertFailedCommandTransition(
        failedQueued.controls,
        farmer.id,
        blockedB,
        validC,
        'failed B then C queue',
    );
    await waitForCommandTarget(page, farmer.id, validC, 120_000);
    await waitForIdle(page, farmer.id, 120_000);
    const afterFailure = await getSnapshot(page);
    assertPositionNear(findUnit(afterFailure.controls, 'farmer'), validC, 'failed B then valid C arrival');

    return {
        cases: {
            failedQueuedCommandContinues: true,
            replaceClearsPreviousQueue: true,
            shiftSequence: true,
            stopClearsQueue: true,
        },
        pass: true,
    };
}

async function runStopFixtureCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const marketPoint = { x: farmer.x + 448, y: farmer.y - 128 };
    await page.evaluate(({ x, y }) => {
        const debug = window.__chickenFarmDebug!;
        if (
            !debug.createEconomyBuildingFixture('market', x, y) ||
            debug.grantFarmerEggStack(1) === null
        ) {
            throw new Error('Unable to set up Stop economy fixture.');
        }
    }, marketPoint);
    await rightClickWorld(page, calibration, { x: marketPoint.x + 32, y: marketPoint.y + 32 });
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) => unit.id === farmerId && unit.economyTaskType === 'sell_at_market',
            ),
        farmer.id,
        { timeout: 5_000 },
    );
    await page.keyboard.press('s');
    await waitForCommand(page, farmer.id, 'stop');
    const economyStopped = await getSnapshot(page);
    const economyFarmer = findUnit(economyStopped.controls, 'farmer');
    if (economyFarmer.economyTaskType !== null) {
        throw new Error(`S did not clear economy worker task: ${JSON.stringify(economyStopped)}`);
    }

    const constructionPoint = { x: economyFarmer.x + 160, y: economyFarmer.y - 128 };
    const constructionId = await page.evaluate(({ x, y }) => {
        const id = window.__chickenFarmDebug!.createPausedConstructionFixture('coop_basic', x, y);
        if (!id) throw new Error('Unable to set up Stop construction fixture.');
        return id;
    }, constructionPoint);
    await rightClickWorld(page, calibration, {
        x: constructionPoint.x + 32,
        y: constructionPoint.y + 32,
    });
    await waitForCommand(page, farmer.id, 'build');
    await page.waitForFunction(
        ({ buildingId, farmerId }) =>
            window.__chickenFarmDebug!.getBuildingConstructionSnapshot(buildingId)
                ?.activeWorkerUnitId === farmerId,
        { buildingId: constructionId, farmerId: farmer.id },
        { timeout: 5_000 },
    );

    await clickStopCommandCard(page, calibration.canvas);
    await waitForCommand(page, farmer.id, 'stop');
    const constructionAfterStop = await page.evaluate((buildingId) =>
        window.__chickenFarmDebug!.getBuildingConstructionSnapshot(buildingId),
    constructionId);
    if (!constructionAfterStop || constructionAfterStop.activeWorkerUnitId !== null) {
        throw new Error(
            `Command-card Stop did not pause construction: ${JSON.stringify(constructionAfterStop)}`,
        );
    }

    return {
        cases: {
            constructionPauseCallback: true,
            economyTaskClear: true,
        },
        constructionId,
        pass: true,
    };
}

async function runRightClickFixtureCase(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
) {
    const initial = await getSnapshot(page);
    const farmer = findUnit(initial.controls, 'farmer');
    const marketPoint = { x: farmer.x + 448, y: farmer.y - 128 };
    const marketId = await page.evaluate(({ x, y }) => {
        const debug = window.__chickenFarmDebug!;
        const id = debug.createEconomyBuildingFixture('market', x, y);
        if (!id || debug.grantFarmerEggStack(1) === null) {
            throw new Error('Unable to create market fixture or grant farmer egg.');
        }
        return id;
    }, marketPoint);

    await rightClickWorld(page, calibration, { x: marketPoint.x + 32, y: marketPoint.y + 32 });
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) =>
                    unit.id === farmerId &&
                    unit.economyTaskType === 'sell_at_market' &&
                    unit.currentCommandType === 'move',
            ),
        farmer.id,
        { timeout: 5_000 },
    );
    const marketOrdered = await getSnapshot(page);
    const marketFarmer = marketOrdered.controls.units.find((unit) => unit.id === farmer.id);
    if (marketFarmer?.economyTaskType !== 'sell_at_market') {
        throw new Error(`Market right-click was not consumed by economy: ${JSON.stringify(marketOrdered)}`);
    }

    const constructionPoint = { x: farmer.x - 448, y: farmer.y - 128 };
    const constructionId = await page.evaluate(({ x, y }) => {
        const id = window.__chickenFarmDebug!.createPausedConstructionFixture('coop_basic', x, y);
        if (!id) throw new Error('Unable to create paused construction fixture.');
        return id;
    }, constructionPoint);
    await rightClickWorld(page, calibration, {
        x: constructionPoint.x + 32,
        y: constructionPoint.y + 32,
    });
    await page.waitForFunction(
        (farmerId) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) =>
                    unit.id === farmerId &&
                    unit.economyTaskType === null &&
                    (unit.currentCommandType === 'move' || unit.currentCommandType === 'build'),
            ),
        farmer.id,
        { timeout: 5_000 },
    );
    const constructionOrdered = await getSnapshot(page);
    const constructionFarmer = constructionOrdered.controls.units.find(
        (unit) => unit.id === farmer.id,
    );
    if (
        constructionFarmer?.economyTaskType !== null ||
        (constructionFarmer.currentCommandType !== 'move' &&
            constructionFarmer.currentCommandType !== 'build')
    ) {
        throw new Error(
            `Constructing-building right-click did not replace economy task: ${JSON.stringify(
                constructionOrdered,
            )}`,
        );
    }

    return {
        cases: { constructionResume: true, marketSale: true },
        fixtureIds: { constructionId, marketId },
        pass: true,
    };
}

async function rightClickWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
    worldPoint: { readonly x: number; readonly y: number },
) {
    const point = getBrowserPointForWorld({ ...calibration, worldPoint });
    await page.mouse.click(point.x, point.y, { button: 'right' });
}

async function clickStopCommandCard(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    canvas: CanvasBounds,
) {
    await page.mouse.click(canvas.left + 843, canvas.top + 586);
}

async function waitForCommand(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    unitId: string,
    commandType: string,
) {
    await page.waitForFunction(
        ({ expectedCommandType, expectedUnitId }) =>
            window.__chickenFarmDebug!.getControlSnapshot().units.some(
                (unit) =>
                    unit.id === expectedUnitId && unit.currentCommandType === expectedCommandType,
            ),
        { expectedCommandType: commandType, expectedUnitId: unitId },
        { timeout: 5_000 },
    );
}

async function waitForCommandTarget(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    unitId: string,
    target: { readonly x: number; readonly y: number },
    timeout = 5_000,
) {
    try {
        await page.waitForFunction(
            ({ expectedTarget, expectedUnitId, tolerancePx }) =>
                window.__chickenFarmDebug!.getControlSnapshot().units.some((unit) => {
                    const point = unit.currentCommandTargetPoint;
                    return (
                        unit.id === expectedUnitId &&
                        point !== null &&
                        Math.hypot(point.x - expectedTarget.x, point.y - expectedTarget.y) <
                            tolerancePx
                    );
                }),
            {
                expectedTarget: target,
                expectedUnitId: unitId,
                tolerancePx: WORLD_POINT_TOLERANCE_PX,
            },
            { timeout },
        );
    } catch (error) {
        throw new Error(
            `Timed out waiting for ${unitId} target ${JSON.stringify(target)}: ${JSON.stringify(
                await getSnapshot(page),
            )}`,
            { cause: error },
        );
    }
}

async function waitForIdle(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    unitId: string,
    timeout = 5_000,
) {
    try {
        await page.waitForFunction(
            (expectedUnitId) =>
                window.__chickenFarmDebug!.getControlSnapshot().units.some(
                    (unit) =>
                        unit.id === expectedUnitId &&
                        unit.currentCommandType === null &&
                        unit.commandQueueCount === 0 &&
                        unit.pathWaypointCount === 0,
                ),
            unitId,
            { timeout },
        );
    } catch (error) {
        throw new Error(`Timed out waiting for ${unitId} idle: ${JSON.stringify(await getSnapshot(page))}`, {
            cause: error,
        });
    }
}

function assertCommandTarget(
    controls: ControlSnapshot,
    unitId: string,
    target: { readonly x: number; readonly y: number },
    label: string,
) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    const point = unit?.currentCommandTargetPoint;
    if (
        !point ||
        Math.hypot(point.x - target.x, point.y - target.y) >= WORLD_POINT_TOLERANCE_PX
    ) {
        throw new Error(`${label}: current target mismatch: ${JSON.stringify({ controls, target })}`);
    }
}

function assertQueuedTargets(
    controls: ControlSnapshot,
    unitId: string,
    expectedTargets: readonly { readonly x: number; readonly y: number }[],
    label: string,
) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    const actualTargets = unit?.queuedCommandTargetPoints ?? [];
    if (
        actualTargets.length !== expectedTargets.length ||
        actualTargets.some(
            (point, index) =>
                !point ||
                Math.hypot(
                    point.x - expectedTargets[index].x,
                    point.y - expectedTargets[index].y,
                ) >= WORLD_POINT_TOLERANCE_PX,
        )
    ) {
        throw new Error(
            `${label}: queued targets mismatch: ${JSON.stringify({ actualTargets, expectedTargets })}`,
        );
    }
}

function assertFailedCommandTransition(
    controls: ControlSnapshot,
    unitId: string,
    blockedTarget: { readonly x: number; readonly y: number },
    validTarget: { readonly x: number; readonly y: number },
    label: string,
) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    if (!unit) throw new Error(`${label}: missing unit ${unitId}`);

    const matchesTarget = (
        point: { readonly x: number; readonly y: number } | null,
        target: { readonly x: number; readonly y: number },
    ) =>
        Boolean(
            point &&
                Math.hypot(point.x - target.x, point.y - target.y) < WORLD_POINT_TOLERANCE_PX,
        );
    const blockedStillQueued = unit.queuedCommandTargetPoints.some((point) =>
        matchesTarget(point, blockedTarget),
    );
    const validCommandPresent =
        matchesTarget(unit.currentCommandTargetPoint, validTarget) ||
        unit.queuedCommandTargetPoints.some((point) => matchesTarget(point, validTarget));
    if (blockedStillQueued || !validCommandPresent) {
        throw new Error(
            `${label}: failure transition mismatch: ${JSON.stringify({
                blockedStillQueued,
                controls,
                validCommandPresent,
            })}`,
        );
    }
}

function assertPositionNear(
    actual: { readonly x: number; readonly y: number },
    expected: { readonly x: number; readonly y: number },
    label: string,
) {
    if (Math.hypot(actual.x - expected.x, actual.y - expected.y) > PATH_ARRIVAL_TOLERANCE_PX) {
        throw new Error(`${label}: arrival mismatch: ${JSON.stringify({ actual, expected })}`);
    }
}

function rebaseCalibrationForCamera(
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
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

function assertCommand(
    controls: ControlSnapshot,
    unitId: string,
    commandType: string,
    label: string,
) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    if (unit?.currentCommandType !== commandType) {
        throw new Error(`${label}: expected ${unitId} to keep ${commandType}: ${JSON.stringify(controls)}`);
    }
}

function assertStop(controls: ControlSnapshot, unitId: string, label: string) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    if (
        unit?.currentCommandType !== 'stop' ||
        unit.commandQueueCount !== 0 ||
        unit.pathWaypointCount !== 0 ||
        unit.pathIndex !== 0 ||
        unit.economyTaskType !== null
    ) {
        throw new Error(`${label}: Stop state mismatch: ${JSON.stringify(controls)}`);
    }
}

function assertPositionStable(
    before: { readonly x: number; readonly y: number },
    after: { readonly x: number; readonly y: number },
    label: string,
) {
    if (Math.hypot(after.x - before.x, after.y - before.y) > 0.01) {
        throw new Error(`${label}: stopped unit moved during observation: ${JSON.stringify({ after, before })}`);
    }
}

function assertRightClickMove(
    snapshot: { readonly controls: ControlSnapshot; readonly state: GameState },
    farmerId: string,
    dogId: string,
) {
    const farmer = snapshot.controls.units.find((unit) => unit.id === farmerId);
    const dog = snapshot.controls.units.find((unit) => unit.id === dogId);
    if (
        snapshot.state.selectedUnitCount !== 1 ||
        farmer?.currentCommandType !== 'move' ||
        farmer.commandQueueCount !== 0 ||
        (farmer.pathWaypointCount === 0 && farmer.pathIndex === 0) ||
        dog?.currentCommandType !== null ||
        dog?.commandQueueCount !== 0
    ) {
        throw new Error(`Selected right-click move mismatch: ${JSON.stringify(snapshot)}`);
    }
}

function assertNoCommands(controls: ControlSnapshot, label: string) {
    if (
        controls.units.some(
            (unit) =>
                unit.currentCommandType !== null ||
                unit.commandQueueCount !== 0 ||
                unit.pathWaypointCount !== 0,
        )
    ) {
        throw new Error(`${label} issued a command: ${JSON.stringify(controls)}`);
    }
}

function assertNoActiveMove(controls: ControlSnapshot, unitId: string, label: string) {
    const unit = controls.units.find((candidate) => candidate.id === unitId);
    if (
        !unit ||
        unit.currentCommandType !== null ||
        unit.commandQueueCount !== 0 ||
        unit.pathWaypointCount !== 0 ||
        unit.pathIndex !== 0
    ) {
        throw new Error(`${label}: ${JSON.stringify(controls)}`);
    }
}

async function clickWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
    worldPoint: { readonly x: number; readonly y: number },
) {
    const point = getBrowserPointForWorld({ ...calibration, worldPoint });
    await page.mouse.click(point.x, point.y);
}

async function dragWorld(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
    calibration: Omit<Parameters<typeof getBrowserPointForWorld>[0], 'worldPoint'>,
    start: { readonly x: number; readonly y: number },
    end: { readonly x: number; readonly y: number },
) {
    const startPoint = getBrowserPointForWorld({ ...calibration, worldPoint: start });
    const endPoint = getBrowserPointForWorld({ ...calibration, worldPoint: end });
    await page.mouse.move(startPoint.x, startPoint.y);
    await page.mouse.down();
    await page.mouse.move(endPoint.x, endPoint.y, { steps: 4 });
    await page.mouse.up();
}

function findUnit(controls: ControlSnapshot, templateId: string) {
    const unit = controls.units.find((candidate) => candidate.templateId === templateId);
    if (!unit) throw new Error(`Missing ${templateId} unit`);
    return unit;
}

function assertOnlySelected(
    snapshot: { readonly controls: ControlSnapshot; readonly state: GameState },
    unitId: string,
    label: string,
) {
    assertSelectedIds(snapshot, [unitId], label);
}

function assertSelectedIds(
    snapshot: { readonly controls: ControlSnapshot; readonly state: GameState },
    expectedIds: readonly string[],
    label: string,
) {
    const selected = snapshot.controls.units.filter((unit) => unit.selected);
    const selectedIds = selected.map((unit) => unit.id).sort();
    const expected = [...expectedIds].sort();
    if (
        snapshot.state.selectedUnitCount !== expected.length ||
        selectedIds.join(',') !== expected.join(',') ||
        selected.some(
            (unit) =>
                unit.currentCommandType !== null ||
                unit.commandQueueCount !== 0 ||
                unit.pathWaypointCount !== 0,
        )
    ) {
        throw new Error(
            `${label} selection mismatch: ${JSON.stringify({ expected, selected, state: snapshot.state })}`,
        );
    }
}

function getBrowserPointForWorld(config: {
    readonly calibrationPoint: { readonly x: number; readonly y: number };
    readonly calibrationWorldPoint: { readonly x: number; readonly y: number };
    readonly canvas: CanvasBounds;
    readonly referencePoint: { readonly x: number; readonly y: number };
    readonly referenceWorldPoint: { readonly x: number; readonly y: number };
    readonly worldPoint: { readonly x: number; readonly y: number };
}) {
    const scaleX =
        (config.referenceWorldPoint.x - config.calibrationWorldPoint.x) /
        (config.referencePoint.x - config.calibrationPoint.x);
    const scaleY =
        (config.referenceWorldPoint.y - config.calibrationWorldPoint.y) /
        (config.referencePoint.y - config.calibrationPoint.y);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX === 0 || scaleY === 0) {
        throw new Error(`Invalid browser input calibration: ${JSON.stringify(config)}`);
    }
    return {
        x:
            config.calibrationPoint.x +
            (config.worldPoint.x - config.calibrationWorldPoint.x) / scaleX,
        y:
            config.calibrationPoint.y +
            (config.worldPoint.y - config.calibrationWorldPoint.y) / scaleY,
    };
}


function isInWorldViewport(
    unit: ControlSnapshot['units'][number],
    camera: ControlSnapshot['camera'],
) {
    return (
        unit.screenX >= 0 &&
        unit.screenX <= camera.viewportWidth &&
        unit.screenY >= 0 &&
        unit.screenY <= camera.viewportHeight
    );
}

function isWorldPointInViewport(
    point: { readonly x: number; readonly y: number },
    camera: ControlSnapshot['camera'],
) {
    const screenX = (point.x - camera.scrollX) * camera.zoom;
    const screenY = (point.y - camera.scrollY) * camera.zoom;
    return (
        screenX >= 0 &&
        screenX <= camera.viewportWidth &&
        screenY >= 0 &&
        screenY <= camera.viewportHeight
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
            if (Date.now() - startedAt >= timeoutMs) {
                reject(new Error(`Timed out waiting for ${url}`));
                return;
            }
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
