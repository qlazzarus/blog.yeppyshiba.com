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
    const context = await browser.newContext({ viewport: { width: 1200, height: 760 }, serviceWorkers: 'block' });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.addInitScript(() => {
        window.open = (...args) => { window.openArguments = args; return null; };
        window.emitInstall = mode => {
            const event = new Event('beforeinstallprompt', { cancelable: true });
            event.prompt = () => {
                window.promptCalls = (window.promptCalls ?? 0) + 1;
                return mode === 'pending' ? new Promise(resolve => { window.finishPrompt = resolve; }) : Promise.reject(new Error('prompt rejected'));
            };
            event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
            window.dispatchEvent(event);
        };
    });
    await context.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.testGame = new Phaser.Game(') });
    });
    const page = await context.newPage();
    await page.goto(server.resolvedUrls.local[0]);
    const openOptions = async frame => {
        await frame.waitForFunction(() => window.testGame?.scene.isActive('main'));
        await frame.evaluate(() => window.testGame.scene.getScene('main').scene.start('options'));
        await frame.waitForFunction(() => window.testGame?.scene.isActive('options'));
    };
    const visibleLabel = (frame, label) => frame.evaluate(label => window.testGame.scene.getScene('options').children.list.some(item => item.text === label && item.visible), label);
    const clickLabel = async (frame, label) => {
        const point = await frame.evaluate(label => {
            const scene = window.testGame.scene.getScene('options');
            const text = scene.children.list.find(item => item.text === label && item.visible);
            const button = scene.children.list.find(item => item.input?.enabled && item.getBounds().contains(text.x, text.y));
            const canvas = scene.game.canvas.getBoundingClientRect();
            return { x: canvas.left + button.x * canvas.width / scene.scale.width, y: canvas.top + button.y * canvas.height / scene.scale.height };
        }, label);
        await page.mouse.click(point.x, point.y);
    };
    await openOptions(page);
    assert.equal(await visibleLabel(page, 'INSTALL APP'), false);
    await page.evaluate(() => window.emitInstall('reject'));
    assert.equal(await visibleLabel(page, 'INSTALL APP'), true);
    await clickLabel(page, 'INSTALL APP');
    await page.waitForFunction(() => window.testGame.scene.getScene('options').children.list.some(item => item.text?.includes('Installation could not be started')));
    assert.equal(await page.evaluate(() => window.promptCalls), 1);
    assert.equal(await visibleLabel(page, 'INSTALL APP'), false);
    await page.evaluate(() => window.emitInstall('pending'));
    await clickLabel(page, 'INSTALL APP');
    await page.waitForFunction(() => typeof window.finishPrompt === 'function');
    await page.evaluate(() => window.testGame.scene.getScene('options').scene.start('main'));
    await page.waitForFunction(() => window.testGame.scene.isActive('main'));
    await page.evaluate(() => { window.finishPrompt(); window.dispatchEvent(new Event('appinstalled')); });
    await page.waitForTimeout(100);
    await openOptions(page);
    assert.equal(await visibleLabel(page, 'INSTALL APP'), false);

    const embedded = await context.newPage();
    await embedded.goto(server.resolvedUrls.local[0]);
    await embedded.evaluate(() => {
        const iframe = document.createElement('iframe');
        iframe.id = 'fixture';
        iframe.src = location.href;
        iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100';
        document.body.append(iframe);
    });
    const frameHandle = await embedded.waitForSelector('#fixture');
    const frame = await frameHandle.contentFrame();
    await frame.waitForURL('**/game-assets/apex-seoul/**');
    try {
        await openOptions(frame);
    } catch (error) {
        console.error('Iframe diagnostics', frame.url(), JSON.stringify(errors));
        throw error;
    }
    assert.equal(await visibleLabel(frame, 'OPEN GAME'), true);
    const openButton = await frame.evaluate(() => {
        const scene = window.testGame.scene.getScene('options');
        const label = scene.children.list.find(item => item.text === 'OPEN GAME' && item.visible);
        const button = scene.children.list.find(item => item.input?.enabled && item.getBounds().contains(label.x, label.y));
        const canvas = scene.game.canvas.getBoundingClientRect();
        return { x: canvas.left + button.x * canvas.width / scene.scale.width, y: canvas.top + button.y * canvas.height / scene.scale.height };
    });
    await embedded.mouse.click(openButton.x, openButton.y);
    await frame.waitForFunction(() => Array.isArray(window.openArguments));
    assert.deepEqual(await frame.evaluate(() => window.openArguments), [new URL('/game-assets/apex-seoul/', server.resolvedUrls.local[0]).href, '_blank', 'noopener,noreferrer']);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: late Options action, rejected prompt recovery, scene shutdown, installed state and iframe open action');
} finally {
    await browser?.close();
    await server.close();
}
