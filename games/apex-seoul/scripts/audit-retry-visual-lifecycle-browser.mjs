import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root: project, server: { host: '127.0.0.1', port: 5187 } });
await server.listen();
let browser;

try {
    browser = await chromium.launch({ headless: true, timeout: 20000,
        args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.__retryVisualGame = new Phaser.Game(') });
    });
    const url = new URL(server.resolvedUrls.local[0]);
    url.searchParams.set('launch', 'time-attack');
    url.searchParams.set('vehicle', 'raven-coupe');
    url.searchParams.set('qaFreeze', '1');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__apexSeoulQaReady && window.__retryVisualGame?.scene.isActive('time-attack'));

    const forestSnapshot = () => page.evaluate(() => {
        const scene = window.__retryVisualGame.scene.getScene('time-attack');
        scene.render();
        const sprites = [...scene.wallForestSprites.values()];
        return {
            mapSize: sprites.length,
            live: sprites.filter(sprite => sprite.active && sprite.scene).length,
            visible: sprites.filter(sprite => sprite.visible).length,
        };
    });

    const baseline = await forestSnapshot();
    assert.ok(baseline.mapSize > 0, 'start segment must create forest sprites');
    assert.equal(baseline.live, baseline.mapSize, 'initial forest references must be live');
    assert.ok(baseline.visible > 0, 'start segment must render visible forest sprites');

    for (let retry = 1; retry <= 10; retry += 1) {
        await page.evaluate(() => {
            const scene = window.__retryVisualGame.scene.getScene('time-attack');
            scene.startResultScene();
        });
        await page.waitForFunction(() => window.__retryVisualGame.scene.isActive('result'));
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.__retryVisualGame.scene.isActive('time-attack'));
        const current = await forestSnapshot();
        assert.deepEqual(current, baseline, `result Retry ${retry} must recreate the initial forest`);
    }

    assert.deepEqual(errors, []);
    console.log(`PASS: ${baseline.mapSize} initial forest sprites remain live and visible across 10 ResultScene retries`);
} finally {
    await browser?.close();
    await server.close();
}
