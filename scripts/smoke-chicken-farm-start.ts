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
    readonly selectedUnitCount: number;
    readonly wallet: { readonly gold: number; readonly lumber: number } | null;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = 4175;
const baseUrl = `http://${host}:${port}/game-assets/chicken-farm/`;
const WORLD_VIEW_CENTER = { x: 480, y: 270 };

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
    const server = spawn(
        viteBin,
        ['--host', host, '--port', String(port), '--strictPort'],
        {
            cwd: path.join(rootDir, 'games/chicken-farm'),
            env: process.env,
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
    if (state.wallet?.gold !== 1500 || state.wallet.lumber !== 0) {
        throw new Error(`Expected normal wallet 1500/0, got ${JSON.stringify(state.wallet)}`);
    }
    if (state.hud.inventorySlotCount <= 0 || !state.hud.resourceText.includes('Gold 1500')) {
        throw new Error(`Missing initial HUD state: ${JSON.stringify(state.hud)}`);
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
