import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root: project, server: { host: '127.0.0.1', port: 5188 } });
await server.listen();
let browser;
const scenarios = [
    { vehicle: 'raven-coupe', limiterRpm: 7750 },
    { vehicle: 'seorin-gt', limiterRpm: 7000 },
    { vehicle: 'mirae-gt', limiterRpm: 7200 },
];

try {
    browser = await chromium.launch({ headless: true, timeout: 20000,
        args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    for (const scenario of scenarios) {
        const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/src/main.ts', async route => {
            const response = await route.fetch();
            await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.__redlineGame = new Phaser.Game(') });
        });
        const url = new URL(server.resolvedUrls.local[0]);
        url.searchParams.set('launch', 'time-attack');
        url.searchParams.set('vehicle', scenario.vehicle);
        url.searchParams.set('qaStartSpeed', String(220 * 760 / 225));
        url.searchParams.set('qaFreeze', '1');
        await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__apexSeoulQaReady && window.__redlineGame?.scene.isActive('time-attack'));
        await page.evaluate(() => {
            window.__redlineGame.loop.stop();
            window.__apexSeoulQaState.qa.freeze = false;
            window.__redlineClock = performance.now();
        });
        await page.keyboard.down('ArrowUp');
        const result = await page.evaluate(async () => {
            let limiterFrames = 0;
            let maxRpm = 0;
            let sawHudLabel = false;
            for (let frame = 0; frame < 600; frame += 1) {
                window.__redlineClock += 1000 / 60;
                window.__redlineGame.headlessStep(window.__redlineClock, 1000 / 60);
                const scene = window.__redlineGame.scene.getScene('time-attack');
                maxRpm = Math.max(maxRpm, scene.playerVehicle.rpm);
                if (scene.playerVehicle.fuelCutActive) {
                    limiterFrames += 1;
                    sawHudLabel ||= scene.gameplayHud.status.text === 'REV LIMIT' &&
                        scene.gameplayHud.status.visible;
                }
            }
            return { limiterFrames, maxRpm, sawHudLabel };
        });
        await page.keyboard.up('ArrowUp');
        assert.ok(result.limiterFrames > 0, `${scenario.vehicle} must enter its limiter in the live scene`);
        assert.ok(result.maxRpm >= scenario.limiterRpm - 1, `${scenario.vehicle} must reach its limiter RPM within numerical tolerance`);
        assert.equal(result.sawHudLabel, true, `${scenario.vehicle} must expose the actual REV LIMIT HUD state`);
        assert.deepEqual(errors, []);
        console.log(`PASS: ${scenario.vehicle} limiter ${result.maxRpm.toFixed(0)}RPM across ${result.limiterFrames} live frames`);
        await page.close();
    }
} finally {
    await browser?.close();
    await server.close();
}
