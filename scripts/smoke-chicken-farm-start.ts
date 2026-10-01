import { once } from 'node:events';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { chromium } from 'playwright';

type SmokeState = {
    readonly farmerInventory: readonly {
        readonly itemRawcode: string;
        readonly quantity: number;
    }[];
    readonly hud: {
        readonly inventorySlotCount: number;
        readonly resourceText: string;
    };
    readonly primaryUnit: { readonly id: string; readonly x: number; readonly y: number } | null;
    readonly initialPlacementViewCount: number;
    readonly initialPlacements: readonly unknown[];
    readonly selectedUnitCount: number;
    readonly debugPoc: {
        readonly combatActive: boolean;
        readonly fixturesEnabled: boolean;
        readonly terrainProbeCount: number;
    };
    readonly units: readonly {
        readonly id: string;
        readonly ownerPlayerId: number;
        readonly templateId: string;
    }[];
    readonly wallet: { readonly gold: number; readonly lumber: number } | null;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4175;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const WORLD_VIEW_CENTER = { x: 480, y: 270 };
const smokeProfile = process.env.CHICKEN_FARM_SMOKE_PROFILE;
const profileConfig = {
    debug_p3: { debugEconomy: true, difficulty: 'normal', startId: 3 },
    easy_p4: { debugEconomy: false, difficulty: 'easy', startId: 4 },
    normal_p3: { debugEconomy: false, difficulty: 'normal', startId: 3 },
} as const;
const profile = smokeProfile
    ? profileConfig[smokeProfile as keyof typeof profileConfig]
    : undefined;

if (smokeProfile && !profile) {
    throw new Error(`Unknown CHICKEN_FARM_SMOKE_PROFILE: ${smokeProfile}`);
}

const expectedStartId = profile?.startId ?? Number(process.env.VITE_CHICKEN_FARM_START_ID ?? 3);
const expectedGold = profile?.debugEconomy
    ? 10_000
    : (profile?.difficulty ?? process.env.VITE_CHICKEN_FARM_DIFFICULTY) === 'easy'
      ? 1700
      : 1500;
const expectedLumber = profile?.debugEconomy ? 10_000 : 0;
const expectedStartPositionById: Record<number, { readonly x: number; readonly y: number }> = {
    3: { x: 3392, y: 8928 },
    4: { x: 9024, y: 3232 },
};

async function main() {
    const server = startDevServer();
    try {
        await waitForHttp(baseUrl, 30_000);
        const result = await runSmokeTwice();
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await stopServer(server);
    }
}

function startDevServer() {
    const viteBin = path.join(rootDir, 'node_modules/.bin/vite');
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        VITE_CHICKEN_FARM_COMBAT_POC: 'false',
        VITE_CHICKEN_FARM_COMBAT_SMOKE: 'false',
        VITE_CHICKEN_FARM_DEBUG_ECONOMY: String(profile?.debugEconomy ?? false),
        VITE_CHICKEN_FARM_DEBUG_FIXTURES: 'false',
        VITE_CHICKEN_FARM_START_ID: String(expectedStartId),
        VITE_CHICKEN_FARM_TERRAIN_PATHING_DEBUG: 'false',
    };
    const difficulty = profile?.difficulty ?? process.env.VITE_CHICKEN_FARM_DIFFICULTY;
    if (difficulty) {
        env.VITE_CHICKEN_FARM_DIFFICULTY = difficulty;
    } else {
        delete env.VITE_CHICKEN_FARM_DIFFICULTY;
    }
    const server = spawn(
        viteBin,
        ['--host', host, '--port', String(port), '--strictPort'],
        {
            cwd: path.join(rootDir, 'games/chicken-farm'),
            env,
        },
    );
    server.stderr.on('data', (data) => process.stderr.write(String(data)));
    return server;
}

async function runSmokeTwice() {
    const browser = await chromium.launch({ headless: true });
    try {
        const results = [];
        for (let load = 1; load <= 2; load += 1) {
            results.push(await runSmokeLoad(browser, load));
        }
        return { baseUrl, loads: results, pass: true };
    } finally {
        await browser.close();
    }
}

async function runSmokeLoad(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    load: number,
) {
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
        requestFailures.push(`${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`),
    );
    page.on('response', (response) => {
        if (response.status() >= 400) {
            failedResponses.push(`${response.status()} ${response.url()}`);
        }
    });

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.__chickenFarmDebug), null, {
            timeout: 15_000,
        });
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getPerfSnapshot().frameCount > 0,
            null,
            { timeout: 10_000 },
        );

        const initial = await getState(page);
        assertStartState(initial);

        for (const key of ['1', '2', '3', '4', '5', '6', '7', '8']) {
            await page.keyboard.press(key);
            await page.evaluate(
                () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
            );
            const afterNumberKey = await getState(page);
            assertStartState(afterNumberKey);
            if (
                afterNumberKey.primaryUnit!.x !== initial.primaryUnit!.x ||
                afterNumberKey.primaryUnit!.y !== initial.primaryUnit!.y
            ) {
                throw new Error(`Numeric key ${key} changed the active run start location`);
            }
        }

        await page.mouse.click(WORLD_VIEW_CENTER.x, WORLD_VIEW_CENTER.y);
        await page.waitForFunction(
            () => window.__chickenFarmDebug!.getState().selectedUnitCount === 1,
            null,
            { timeout: 5_000 },
        );

        const selected = await getState(page);
        const primary = selected.primaryUnit;
        if (!primary) throw new Error('Missing primary unit after selection');

        await page.mouse.click(WORLD_VIEW_CENTER.x + 140, WORLD_VIEW_CENTER.y, {
            button: 'right',
        });
        await page.waitForFunction(
            ({ x, y }) => {
                const unit = window.__chickenFarmDebug!.getState().primaryUnit;
                return Boolean(unit && Math.hypot(unit.x - x, unit.y - y) >= 12);
            },
            { x: primary.x, y: primary.y },
            { timeout: 5_000 },
        );
        await page.keyboard.press('s');

        const moved = await getState(page);
        const canvasCount = await page.locator('canvas').count();
        if (canvasCount !== 1) throw new Error(`Expected one canvas, got ${canvasCount}`);
        if (consoleErrors.length || pageErrors.length || requestFailures.length || failedResponses.length) {
            throw new Error(
                JSON.stringify({ consoleErrors, failedResponses, pageErrors, requestFailures }),
            );
        }

        return {
            canvasCount,
            initial,
            load,
            movedPrimaryUnit: moved.primaryUnit,
            selectedUnitCount: moved.selectedUnitCount,
        };
    } finally {
        await page.close();
    }
}

async function getState(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>,
): Promise<SmokeState> {
    return page.evaluate(() => window.__chickenFarmDebug!.getState());
}

function assertStartState(state: SmokeState) {
    if (!state.primaryUnit) throw new Error('Missing starting farmer');
    if (
        state.debugPoc.combatActive ||
        state.debugPoc.fixturesEnabled ||
        state.debugPoc.terrainProbeCount !== 0
    ) {
        throw new Error(`Normal start contains debug state: ${JSON.stringify(state.debugPoc)}`);
    }
    if (state.wallet?.gold !== expectedGold || state.wallet.lumber !== expectedLumber) {
        throw new Error(
            `Expected starting wallet ${expectedGold}/${expectedLumber}, got ${JSON.stringify(state.wallet)}`,
        );
    }
    if (
        state.hud.inventorySlotCount <= 0 ||
        !state.hud.resourceText.includes(`Gold ${expectedGold}`)
    ) {
        throw new Error(`Missing initial HUD state: ${JSON.stringify(state.hud)}`);
    }
    const expectedStartPosition = expectedStartPositionById[expectedStartId];
    if (
        expectedStartPosition &&
        (state.primaryUnit.x !== expectedStartPosition.x ||
            state.primaryUnit.y !== expectedStartPosition.y)
    ) {
        throw new Error(
            `Expected P${expectedStartId} at ${JSON.stringify(expectedStartPosition)}, got ${JSON.stringify(state.primaryUnit)}`,
        );
    }
    const inventory = new Map(
        state.farmerInventory.map((slot) => [slot.itemRawcode, slot.quantity]),
    );
    for (const [itemRawcode, quantity] of [
        ['I003', 5],
        ['I009', 1],
        ['I00F', 1],
    ] as const) {
        if (inventory.get(itemRawcode) !== quantity) {
            throw new Error(
                `Expected ${itemRawcode} x${quantity}, got ${JSON.stringify(state.farmerInventory)}`,
            );
        }
    }
    const unitOwners = new Map(
        state.units.map((unit) => [unit.templateId, unit.ownerPlayerId]),
    );
    if (
        state.units.length !== 2 ||
        unitOwners.get('farmer') !== 3 ||
        unitOwners.get('dog') !== 3
    ) {
        throw new Error(`Expected one P3 farmer and dog, got ${JSON.stringify(state.units)}`);
    }
    if (state.initialPlacements.length !== 25 || state.initialPlacementViewCount !== 25) {
        throw new Error(
            `Expected 25 initial placements and views, got ${JSON.stringify({
                placements: state.initialPlacements.length,
                views: state.initialPlacementViewCount,
            })}`,
        );
    }
}

function waitForHttp(url: string, timeoutMs: number) {
    const startedAt = Date.now();
    return new Promise<void>((resolve, reject) => {
        const poll = () => {
            const req = request(url, (response) => {
                response.resume();
                if (response.statusCode && response.statusCode < 500) {
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

async function stopServer(server: ChildProcessWithoutNullStreams) {
    if (server.exitCode !== null || server.killed) return;
    server.kill('SIGTERM');
    await once(server, 'exit');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
