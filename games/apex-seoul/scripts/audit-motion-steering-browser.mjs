import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
    await server.listen();
    browser = await chromium.launch({ args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    const landscape = { width: 844, height: 390 };
    const page = await browser.newPage({ viewport: landscape, userAgent: 'Mobile sensor fixture', hasTouch: true });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.addInitScript(() => {
        window.DeviceOrientationEvent.requestPermission = () =>
            new Promise(resolve => { window.resolvePermission = resolve; });
        window.sample = tilt => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: tilt, gamma: tilt }));
        window.stream = tilt => {
            window.sample(tilt);
            window.sensorInterval = setInterval(() => window.sample(tilt), 25);
        };
        window.race = () => window.testGame.scene.getScene('time-attack');
        window.buttons = () => window.race().children.list.filter(item =>
            item.visible && ['◀', '▶', 'GAS', 'BRAKE'].includes(item.text)).length;
    });
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.testGame = new Phaser.Game(') });
    });
    const url = new URL(server.resolvedUrls.local[0]);
    url.searchParams.set('qaFreeze', '1');
    await page.goto(url.href);
    const active = key => page.waitForFunction(key => window.testGame?.scene.isActive(key), key);
    const changeScene = async (from, to) => {
        await page.evaluate(([from, to]) => window.testGame.scene.getScene(from).scene.start(to), [from, to]);
        await active(to);
    };
    const pressMotion = async () => {
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => typeof window.resolvePermission === 'function');
    };
    const respond = status => page.evaluate(status => {
        window.resolvePermission(status);
        delete window.resolvePermission;
    }, status);
    const scheme = () => page.evaluate(() => JSON.parse(localStorage.getItem('apex-seoul:settings:v1'))?.controlScheme ?? 'virtual');
    const notice = text => page.waitForFunction(text => window.testGame.scene.getScene('options').children.list.some(c => c.text?.includes(text)), text);

    await active('main');
    await changeScene('main', 'options');
    await pressMotion();
    await respond('denied');
    await notice('permission was not granted');
    assert.equal(await scheme(), 'virtual');
    await pressMotion();
    await changeScene('options', 'main');
    await respond('granted');
    assert.equal(await scheme(), 'virtual');
    await changeScene('main', 'options');
    await pressMotion();
    await respond('granted');
    await notice('No tilt reading');
    assert.equal(await scheme(), 'virtual');
    await pressMotion();
    await respond('granted');
    await notice('Waiting for a tilt reading');
    await page.evaluate(() => window.sample(20));
    await notice('Motion steering enabled');
    assert.equal(await scheme(), 'motion');

    await page.reload();
    await active('main');
    await changeScene('main', 'time-attack');
    const buttons = async count => {
        try {
            await page.waitForFunction(count => window.buttons() === count, count);
        } catch (error) {
            const state = await page.evaluate(() => ({
                visible: window.buttons(), sensor: window.race().motionSteering.getStatus(),
                paused: window.race().orientationPaused, focusPaused: window.race().focusPaused,
            }));
            throw new Error(`Expected ${count} buttons: ${JSON.stringify(state)}`, { cause: error });
        }
    };
    await buttons(4);
    const gas = await page.evaluate(() => {
        const label = window.race().children.list.find(c => c.text === 'GAS');
        const bounds = window.testGame.canvas.getBoundingClientRect();
        return { x: bounds.x + label.x * bounds.width / window.race().scale.width,
            y: bounds.y + label.y * bounds.height / window.race().scale.height };
    });
    await page.mouse.move(gas.x, gas.y);
    await page.mouse.down();
    await page.waitForFunction(() => window.race().virtualDriveControls.getCommand().accelPressed);
    await page.evaluate(() => { window.sample(20); window.stream(85); });
    await buttons(2);
    assert.ok(await page.evaluate(() => window.race().motionSteering.getCommand().steerAxis !== 0));
    await page.evaluate(() => clearInterval(window.sensorInterval));
    await buttons(4);
    assert.ok(await page.evaluate(() => window.race().virtualDriveControls.getCommand().accelPressed));
    await page.mouse.up();
    await page.evaluate(() => window.stream(-60));
    await buttons(2);
    assert.equal(await page.evaluate(() => window.race().motionSteering.getCommand().steerAxis), 0);
    await page.evaluate(() => clearInterval(window.sensorInterval));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => window.race().orientationPaused && !document.querySelector('#orientation-guard').hidden);
    await page.setViewportSize(landscape);
    await page.locator('#orientation-resume').click();
    await buttons(4);
    await page.evaluate(() => window.stream(70));
    await buttons(2);
    assert.equal(await page.evaluate(() => window.race().motionSteering.getCommand().steerAxis), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: permission denial, late response, no sample, saved motion reload, stale fallback, held pedal and rotation recovery');
} finally {
    await browser?.close();
    await server.close();
}
