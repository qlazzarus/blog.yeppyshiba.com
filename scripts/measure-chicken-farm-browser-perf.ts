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
    readonly economyPoc: {
        readonly chickens: number;
        readonly coops: number;
        readonly fieldEggs: number;
        readonly hatchJobs: number;
        readonly wells: number;
    } | null;
    readonly elapsedSec: number;
    readonly primaryUnit: {
        readonly id: string;
        readonly x: number;
        readonly y: number;
    } | null;
    readonly selectedUnitCount: number;
    readonly wallet: {
        readonly coins: number;
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
    } finally {
        stopDevServer(server);
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
            env: process.env,
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

    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
            consoleMessages.push(`${message.type()}: ${message.text()}`);
        }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

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
                () => window.__chickenFarmDebug!.getPerfSnapshot().frameCount > 0,
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
        const marketFixtureId = await page.evaluate(({ x, y }) =>
            window.__chickenFarmDebug!.createEconomyBuildingFixture('market', x, y),
        {
            x: clamp(primary.x + 768, 128, state.worldSize.x - 128),
            y: clamp(primary.y + 128, 128, state.worldSize.y - 128),
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
        const expectedCoins = economyBefore.wallet.coins - 120 - 30 - 18;
        const expectedLumber = economyBefore.wallet.lumber - 52;
        if (
            economyAfter.wallet?.coins !== expectedCoins ||
            economyAfter.wallet.lumber !== expectedLumber
        ) {
            throw new Error(
                `Shared wallet did not pay coop cost once: expected ${expectedCoins}/${expectedLumber}, got ${economyAfter.wallet?.coins}/${economyAfter.wallet?.lumber}`,
            );
        }

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
                    expectedCoins,
                    expectedLumber,
                    pass: true,
                },
            },
            consoleMessages,
            pageErrors,
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

function stopDevServer(server: ChildProcessWithoutNullStreams) {
    if (server.killed) return;
    server.kill('SIGTERM');
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

await main();
