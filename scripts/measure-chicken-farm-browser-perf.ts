import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { chromium } from 'playwright';

type BrowserPerfSnapshot = {
    readonly frameAvgMs: number;
    readonly frameCount: number;
    readonly frameMaxMs: number;
    readonly hotLabels: readonly {
        readonly avgMs: number;
        readonly count: number;
        readonly label: string;
        readonly maxMs: number;
        readonly totalMs: number;
    }[];
    readonly summary: string;
};

type BrowserDebugState = {
    readonly buildingCount: number;
    readonly economyPoc: {
        readonly chickens: number;
        readonly coops: number;
        readonly fieldEggs: number;
        readonly hatchJobs: number;
        readonly wells: number;
    } | null;
    readonly elapsedSec: number;
    readonly farmerEggs: number;
    readonly farmerInventory: readonly {
        readonly itemRawcode: string;
        readonly quantity: number;
    }[];
    readonly initialPlacementViewCount: number;
    readonly initialPlacements: readonly {
        readonly id: string;
        readonly owner: string;
        readonly rawcode: string;
        readonly role: string;
        readonly x: number;
        readonly y: number;
    }[];
    readonly primaryUnit: {
        readonly id: string;
        readonly x: number;
        readonly y: number;
    } | null;
    readonly runId: number;
    readonly selectedUnitCount: number;
    readonly units: readonly {
        readonly id: string;
        readonly ownerPlayerId: number;
        readonly templateId: string;
    }[];
    readonly wallet: {
        readonly gold: number;
        readonly lumber: number;
    } | null;
    readonly worldSize: { readonly x: number; readonly y: number };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
);
const outputPath = path.join(outputDir, 'browser_performance_debug_metrics.json');
const host = '127.0.0.1';
const port = 4174;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const report = await runBrowserScenario();

        await mkdir(outputDir, { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
        console.table(
            report.snapshots.map((snapshot) => ({
                frameAvgMs: round2(snapshot.perf.frameAvgMs),
                frameMaxMs: round2(snapshot.perf.frameMaxMs),
                hot: snapshot.perf.hotLabels
                    .slice(0, 3)
                    .map((sample) => `${sample.label}:${round2(sample.maxMs)}`)
                    .join(', '),
                scenario: snapshot.scenario,
            })),
        );
        console.log(`Wrote ${outputPath}`);
        if (!report.checks.pass) {
            throw new Error(
                `Browser perf checks failed: ${report.checks.items
                    .filter((check) => !check.pass)
                    .map((check) => check.id)
                    .join(', ')}`,
            );
        }
    } finally {
        await stopDevServer(server);
    }
}

function startDevServer() {
    const viteBin = path.join(rootDir, 'node_modules/.bin/vite');
    const server = spawn(
        viteBin,
        [
            '--host',
            host,
            '--port',
            String(port),
            '--strictPort',
        ],
        {
            cwd: path.join(rootDir, 'games/chicken-farm'),
            env: {
                ...process.env,
                VITE_CHICKEN_FARM_COMBAT_POC: 'false',
                VITE_CHICKEN_FARM_COMBAT_SMOKE: 'false',
                VITE_CHICKEN_FARM_DEBUG_ECONOMY: 'true',
                VITE_CHICKEN_FARM_DEBUG_FIXTURES: 'true',
                VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG: 'false',
            },
        },
    );

    server.stdout.on('data', (data) => process.stdout.write(String(data)));
    server.stderr.on('data', (data) => process.stderr.write(String(data)));
    return server;
}

async function runBrowserScenario() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { height: 720, width: 960 },
    });
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];
    const responseErrors: string[] = [];

    page.on('console', (message) => {
        if (message.type() === 'error') consoleMessages.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) =>
        requestFailures.push(
            `${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`,
        ),
    );
    page.on('response', (response) => {
        if (response.status() >= 400) {
            responseErrors.push(`${response.status()} ${response.url()}`);
        }
    });

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, {
            timeout: 15_000,
        });

        const snapshots: {
            readonly perf: BrowserPerfSnapshot;
            readonly scenario: string;
            readonly state: BrowserDebugState;
        }[] = [];
        const collect = async (scenario: string) => {
            await page.waitForTimeout(1_700);
            await page.waitForFunction(
                () => window.__chickenFarmDebug!.getState().elapsedSec > 0,
                null,
                { timeout: 10_000 },
            );
            snapshots.push({
                perf: await page.evaluate(
                    () => window.__chickenFarmDebug!.getPerfSnapshot(),
                ),
                scenario,
                state: await page.evaluate(() => window.__chickenFarmDebug!.getState()),
            });
        };

        await collect('baseline_idle');
        const initialPlacementsBefore = await page.evaluate(() =>
            window.__chickenFarmDebug!.getState(),
        );
        const centralMarket = initialPlacementsBefore.initialPlacements.find(
            (placement) => placement.id === 'central_market_n006',
        );
        const initialPlacementManifestMatches =
            initialPlacementsBefore.initialPlacements.length === 25 &&
            initialPlacementsBefore.initialPlacementViewCount === 25 &&
            initialPlacementsBefore.initialPlacements.some(
                (placement) => placement.id === 'spider_01' && placement.role === 'neutral_spider',
            ) &&
            initialPlacementsBefore.initialPlacements.some(
                (placement) => placement.id === 'wolf_stone_01' && placement.role === 'wolf_stone',
            ) &&
            centralMarket?.owner === 'Player(PLAYER_NEUTRAL_PASSIVE)' &&
            centralMarket.x === 4992 &&
            centralMarket.y === 4768;
        if (!initialPlacementManifestMatches) {
            throw new Error('Initial placement snapshot does not match the 25-entry manifest');
        }
        const removedSpider = await page.evaluate(() =>
            window.__chickenFarmDebug!.removeInitialPlacementFixture('spider_01'),
        );
        const initialPlacementsAfterRemoval = await page.evaluate(() =>
            window.__chickenFarmDebug!.getState(),
        );
        const removedViewWasDestroyed =
            removedSpider &&
            initialPlacementsAfterRemoval.initialPlacements.length === 24 &&
            initialPlacementsAfterRemoval.initialPlacementViewCount === 24 &&
            !initialPlacementsAfterRemoval.initialPlacements.some(
                (placement) => placement.id === 'spider_01',
            );
        if (!removedViewWasDestroyed) {
            throw new Error('Initial placement removal left a registry entry or ghost view');
        }
        await page.evaluate(() => window.__chickenFarmDebug!.restoreInitialPlacementFixtures());
        const initialPlacementsAfterRestore = await page.evaluate(() =>
            window.__chickenFarmDebug!.getState(),
        );
        const initialPlacementRestoreMatches =
            initialPlacementsAfterRestore.initialPlacements.length === 25 &&
            initialPlacementsAfterRestore.initialPlacementViewCount === 25 &&
            initialPlacementsAfterRestore.initialPlacements.some(
                (placement) => placement.id === 'spider_01',
            );
        if (!initialPlacementRestoreMatches) {
            throw new Error('Initial placement fixture restore did not restore registry and views');
        }
        const selectedUnitCount = await page.evaluate(() =>
            window.__chickenFarmDebug!.selectAllUnits(),
        );
        await collect(`select_all_units_${selectedUnitCount}`);

        const state = await page.evaluate(() => window.__chickenFarmDebug!.getState());
        const primary = state.primaryUnit;
        if (!primary) throw new Error('Missing primary unit for browser perf scenario');

        const targets = [
            { id: 'short_defense_move', x: primary.x + 640, y: primary.y - 180 },
            { id: 'blocker_edge_move', x: primary.x - 560, y: primary.y + 280 },
            { id: 'wide_move', x: primary.x + 720, y: primary.y + 240 },
        ].map((target) => ({
            ...target,
            x: clamp(target.x, 0, state.worldSize.x),
            y: clamp(target.y, 0, state.worldSize.y),
        }));

        for (const target of targets) {
            await page.evaluate(
                ({ x, y }) => window.__chickenFarmDebug!.issueSmartCommand(x, y),
                target,
            );
            await collect(`smart_command_${target.id}`);
        }

        const economyBefore = await page.evaluate(() => window.__chickenFarmDebug!.getState());
        if (!economyBefore.economyPoc || !economyBefore.wallet) {
            throw new Error('Missing economy state or shared wallet for lifecycle scenario');
        }
        const coopFixtureId = await page.evaluate(({ x, y }) =>
            window.__chickenFarmDebug!.createEconomyBuildingFixture('coop_basic', x, y),
        {
            x: clamp(primary.x + 384, 128, state.worldSize.x - 128),
            y: clamp(primary.y + 128, 128, state.worldSize.y - 128),
        });
        if (!coopFixtureId) throw new Error('Could not create completed coop lifecycle fixture');

        await page.waitForFunction(
            (expectedCoopCount) =>
                window.__chickenFarmDebug!.getState().economyPoc?.coops === expectedCoopCount,
            economyBefore.economyPoc.coops + 1,
            { timeout: 35_000 },
        );
        await collect('completed_coop_economy_lifecycle');
        const wellFixtureId = await page.evaluate(({ x, y }) =>
            window.__chickenFarmDebug!.createEconomyBuildingFixture('well_basic', x, y),
        {
            x: clamp(primary.x + 576, 128, state.worldSize.x - 128),
            y: clamp(primary.y + 128, 128, state.worldSize.y - 128),
        });
        if (!wellFixtureId) throw new Error('Could not create completed well lifecycle fixture');
        await page.waitForFunction(
            (expectedWellCount) =>
                window.__chickenFarmDebug!.getState().economyPoc?.wells === expectedWellCount,
            economyBefore.economyPoc.wells + 1,
            { timeout: 20_000 },
        );
        await collect('completed_well_economy_lifecycle');
        const marketPlacementState = await page.evaluate(() =>
            window.__chickenFarmDebug!.getState(),
        );
        const marketPlacementFarmer = marketPlacementState.primaryUnit;
        if (!marketPlacementFarmer) {
            throw new Error('Missing primary unit for market fixture placement');
        }
        const marketFixtureId = await page.evaluate(({ x, y }) =>
            window.__chickenFarmDebug!.createEconomyBuildingFixture('market', x, y),
        {
            x: clamp(marketPlacementFarmer.x + 16, 128, state.worldSize.x - 128),
            y: clamp(marketPlacementFarmer.y - 64, 128, state.worldSize.y - 128),
        });
        if (!marketFixtureId) throw new Error('Could not create completed market fixture');
        await page.waitForFunction(
            (expectedBuildingCount) =>
                window.__chickenFarmDebug!.getState().buildingCount === expectedBuildingCount,
            economyBefore.buildingCount + 3,
            { timeout: 12_000 },
        );
        await collect('completed_market_sale_fixture');
        const economyAfter = await page.evaluate(() => window.__chickenFarmDebug!.getState());
        const expectedGold = economyBefore.wallet.gold - 120 - 30 - 18;
        const expectedLumber = economyBefore.wallet.lumber - 52;
        if (
            economyAfter.wallet?.gold !== expectedGold ||
            economyAfter.wallet.lumber !== expectedLumber
        ) {
            throw new Error(
                `Shared wallet did not pay coop cost once: expected ${expectedGold}/${expectedLumber}, got ${economyAfter.wallet?.gold}/${economyAfter.wallet?.lumber}`,
            );
        }
        const saleBefore = await page.evaluate(() => window.__chickenFarmDebug!.getState());
        const eggSlot = await page.evaluate(() =>
            window.__chickenFarmDebug!.grantFarmerEggStack(3),
        );
        if (eggSlot === null) throw new Error('Could not grant farmer egg stack');
        const saleOrdered = await page.evaluate((marketId) =>
            window.__chickenFarmDebug!.orderFarmerMarketSale(marketId),
            marketFixtureId,
        );
        if (!saleOrdered) throw new Error('Could not order farmer market sale');
        await page.waitForFunction(
            (expectedGold) => {
                const state = window.__chickenFarmDebug!.getState();
                return state.wallet?.gold === expectedGold && state.farmerEggs === 0;
            },
            saleBefore.wallet!.gold + 36,
            { timeout: 20_000 },
        );
        const saleAfter = await page.evaluate(() => window.__chickenFarmDebug!.getState());
        await collect('farmer_egg_stack_market_sale');
        const restartStates: BrowserDebugState[] = [];
        const expectedStart = initialPlacementsBefore.primaryUnit;
        for (let restart = 1; restart <= 2; restart += 1) {
            const previousRunId = await page.evaluate(
                () => window.__chickenFarmDebug!.getState().runId,
            );
            const restarted = await page.evaluate(() =>
                window.__chickenFarmDebug!.restartRunForTest(),
            );
            if (!restarted) throw new Error(`Could not start same-page run ${restart}`);
            await page.waitForFunction(
                (runId) => window.__chickenFarmDebug?.getState().runId > runId,
                previousRunId,
                { timeout: 10_000 },
            );
            const stateAfterRestart = await page.evaluate(() =>
                window.__chickenFarmDebug!.getState(),
            );
            const inventory = new Map(
                stateAfterRestart.farmerInventory.map((slot) => [
                    slot.itemRawcode,
                    slot.quantity,
                ]),
            );
            const freshRunMatches =
                stateAfterRestart.buildingCount === 0 &&
                stateAfterRestart.economyPoc?.chickens === 0 &&
                stateAfterRestart.economyPoc?.coops === 0 &&
                stateAfterRestart.economyPoc?.fieldEggs === 0 &&
                stateAfterRestart.economyPoc?.wells === 0 &&
                stateAfterRestart.initialPlacements.length === 25 &&
                stateAfterRestart.initialPlacementViewCount === 25 &&
                stateAfterRestart.selectedUnitCount === 0 &&
                stateAfterRestart.units.length === 2 &&
                stateAfterRestart.wallet?.gold === 10_000 &&
                stateAfterRestart.wallet?.lumber === 10_000 &&
                inventory.get('I003') === 5 &&
                inventory.get('I009') === 1 &&
                inventory.get('I00F') === 1 &&
                stateAfterRestart.elapsedSec < 3 &&
                stateAfterRestart.primaryUnit?.x === expectedStart?.x &&
                stateAfterRestart.primaryUnit?.y === expectedStart?.y;
            if (!freshRunMatches) {
                throw new Error(`Same-page run ${restart} did not restore initial state`);
            }
            restartStates.push(stateAfterRestart);

            if (restart === 1) {
                const fixtureId = await page.evaluate(({ x, y }) =>
                    window.__chickenFarmDebug!.createEconomyBuildingFixture('coop_basic', x, y),
                {
                    x: clamp(stateAfterRestart.primaryUnit!.x + 384, 128, state.worldSize.x - 128),
                    y: clamp(stateAfterRestart.primaryUnit!.y + 128, 128, state.worldSize.y - 128),
                });
                if (!fixtureId) throw new Error('Could not mutate first restarted run');
            }
        }
        const runCleanup = await page.evaluate(() => {
            const debug = window.__chickenFarmDebug!;
            const first = debug.disposeRunForTest();
            const second = debug.disposeRunForTest();
            return {
                debugCleared: !window.__chickenFarmDebug,
                first,
                second,
            };
        });
        await page.waitForTimeout(200);
        const cleanupPass =
            runCleanup.debugCleared &&
            runCleanup.first?.before.initialPlacementCount === 25 &&
            runCleanup.first.before.initialPlacementViewCount === 25 &&
            runCleanup.first.after.initialPlacementCount === 0 &&
            runCleanup.first.after.initialPlacementViewCount === 0 &&
            runCleanup.first.after.unitCount === 0 &&
            runCleanup.first.after.selectedUnitCount === 0 &&
            runCleanup.first.after.buildingCount === 0 &&
            runCleanup.first.after.economyEntityCount === 0 &&
            runCleanup.first.after.worldObjectCount === 0 &&
            runCleanup.first.after.uiObjectCount === 0 &&
            runCleanup.second?.alreadyDisposed === true;
        const samePageRestartPass = restartStates.length === 2;
        await page.mouse.click(480, 270, { button: 'right' });
        await page.keyboard.press('s');
        await page.waitForTimeout(200);

        const checks = [
            {
                id: 'shared_wallet_cost',
                pass: true,
            },
            {
                id: 'market_sale',
                pass:
                    saleAfter.wallet?.gold === saleBefore.wallet!.gold + 36 &&
                    saleAfter.wallet?.lumber === saleBefore.wallet!.lumber &&
                    saleAfter.farmerEggs === 0,
            },
            {
                id: 'initial_placement_view_lifecycle',
                pass:
                    initialPlacementManifestMatches &&
                    removedViewWasDestroyed &&
                    initialPlacementRestoreMatches,
            },
            { id: 'run_cleanup_lifecycle', pass: cleanupPass },
            { id: 'same_page_restart_lifecycle', pass: samePageRestartPass },
            { id: 'console_errors', pass: consoleMessages.length === 0 },
            { id: 'page_errors', pass: pageErrors.length === 0 },
            { id: 'failed_requests', pass: requestFailures.length === 0 },
            { id: 'http_error_responses', pass: responseErrors.length === 0 },
        ] as const;

        return {
            generatedAt: new Date().toISOString(),
            parameters: {
                baseUrl,
                browser: 'playwright.chromium',
                viewport: { height: 720, width: 960 },
            },
            economyLifecycle: {
                coopFixtureId,
                wellFixtureId,
                marketFixtureId,
                before: economyBefore,
                after: economyAfter,
                sharedWalletCostCheck: {
                    expectedGold,
                    expectedLumber,
                    pass: true,
                },
                marketSaleCheck: {
                    farmerEggsAfter: saleAfter.farmerEggs,
                    farmerEggsBefore: saleBefore.farmerEggs,
                    goldAfter: saleAfter.wallet?.gold ?? null,
                    goldBefore: saleBefore.wallet?.gold ?? null,
                    lumberAfter: saleAfter.wallet?.lumber ?? null,
                    lumberBefore: saleBefore.wallet?.lumber ?? null,
                    pass:
                        saleAfter.wallet?.gold === saleBefore.wallet!.gold + 36 &&
                        saleAfter.wallet?.lumber === saleBefore.wallet!.lumber &&
                        saleAfter.farmerEggs === 0,
                },
            },
            initialPlacementLifecycle: {
                afterRemoval: initialPlacementsAfterRemoval,
                afterRestore: initialPlacementsAfterRestore,
                before: initialPlacementsBefore,
                manifestMatches: initialPlacementManifestMatches,
                removedViewWasDestroyed,
                restoreMatches: initialPlacementRestoreMatches,
            },
            runCleanup,
            samePageRestarts: restartStates,
            consoleMessages,
            pageErrors,
            requestFailures,
            responseErrors,
            checks: {
                items: checks,
                pass: checks.every((check) => check.pass),
            },
            snapshots,
            summary: summarizeSnapshots(snapshots),
        };
    } finally {
        await browser.close();
    }
}

function summarizeSnapshots(
    snapshots: readonly {
        readonly perf: BrowserPerfSnapshot;
        readonly scenario: string;
    }[],
) {
    const labels = new Map<
        string,
        { count: number; maxMs: number; totalAvgMs: number; totalMs: number }
    >();
    let frameMaxMs = 0;
    let frameAvgMsTotal = 0;

    snapshots.forEach((snapshot) => {
        frameMaxMs = Math.max(frameMaxMs, snapshot.perf.frameMaxMs);
        frameAvgMsTotal += snapshot.perf.frameAvgMs;
        snapshot.perf.hotLabels.forEach((sample) => {
            const current = labels.get(sample.label) ?? {
                count: 0,
                maxMs: 0,
                totalAvgMs: 0,
                totalMs: 0,
            };
            current.count += 1;
            current.maxMs = Math.max(current.maxMs, sample.maxMs);
            current.totalAvgMs += sample.avgMs;
            current.totalMs += sample.totalMs;
            labels.set(sample.label, current);
        });
    });

    return {
        frameAvgMs: round2(frameAvgMsTotal / Math.max(1, snapshots.length)),
        frameMaxMs: round2(frameMaxMs),
        hotLabels: [...labels.entries()]
            .map(([label, sample]) => ({
                avgMs: round2(sample.totalAvgMs / sample.count),
                label,
                maxMs: round2(sample.maxMs),
                totalMs: round2(sample.totalMs),
            }))
            .sort((a, b) => b.totalMs - a.totalMs),
    };
}

function waitForHttp(url: string, timeoutMs: number) {
    const startedAt = Date.now();

    return new Promise<void>((resolve, reject) => {
        const poll = () => {
            const req = request(url, (res) => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) {
                    resolve();
                    return;
                }
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

async function stopDevServer(server: ChildProcessWithoutNullStreams) {
    if (server.exitCode !== null) return;
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

await main();
