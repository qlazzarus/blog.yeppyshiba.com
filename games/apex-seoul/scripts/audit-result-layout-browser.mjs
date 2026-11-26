import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
    const page = await browser.newPage({ hasTouch: true, viewport: { width: 1200, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.testGame = new Phaser.Game(') });
    });
    await page.goto(process.env.APEX_SAVE_QA_URL ?? 'http://127.0.0.1:5173/game-assets/apex-seoul/');
    const active = key => page.waitForFunction(key => window.testGame?.scene.isActive(key), key);
    await active('main');
    await page.evaluate(() => {
        const plugin = window.testGame.scene.getScene('result').scene;
        const start = plugin.start.bind(plugin);
        window.actions = [];
        plugin.start = (key, data) => {
            window.actions.push(key);
            return start(key, data);
        };
    });
    const setup = { trackId: 'bugak-ridge-downhill', vehicleId: 'raven-coupe', vehicleColor: 'blue' };
    const result = {
        runSetup: setup, color: 'Blue', courseName: 'Bugak Ridge Downhill', vehicleName: 'Raven Coupe',
        finishTimeSec: 109, bestTimeSec: 100, previousBestTimeSec: 100, isNewBest: false, deltaSec: 9,
        recoveryCount: 1, recordStatus: 'memory-only', checkpointTimesSec: [20, 40, 60],
        bestSnapshot: {
            overall: { vehicleId: 'mirae-gt', finishTimeSec: 100, checkpointTimesSec: [19, 40, 62] },
            vehicle: { vehicleId: 'raven-coupe', finishTimeSec: 103, checkpointTimesSec: [20, 41, 61] },
        },
    };
    const showResult = async () => {
        await page.evaluate(result => window.testGame.scene.getScenes(true)[0].scene.start('result', result), result);
        await active('result');
    };
    await showResult();
    const desktopLabels = await page.evaluate(() => window.testGame.scene.getScene('result').children.list.map(o => o.text));
    assert.ok(desktopLabels.some(t => t?.includes('ALL PB (MIRAE)') && t.includes('CAR PB (RAVEN)')));
    assert.ok(desktopLabels.some(t => t?.includes('RECOVERIES 1')));
    assert.ok(desktopLabels.includes('0:20.00\n+1.00s BEHIND / ±0.00s TIED'));
    console.log('PASS desktop: overall and vehicle PB, recoveries and checkpoint deltas');
    for (const [width, height] of [[844, 390], [667, 375], [640, 360]]) {
        for (const [index, target] of ['time-attack', 'main'].entries()) {
            await page.setViewportSize({ width, height });
            if (!(await page.evaluate(() => window.testGame.scene.isActive('result')))) await showResult();
            await page.waitForFunction(({ width, height }) => {
                const scene = window.testGame.scene.getScene('result');
                const buttons = scene.children.list.filter(o => o.input?.enabled);
                const parent = scene.scale.parentSize;
                return parent.width === width && parent.height === height &&
                    buttons.length === 2 && buttons[0].y === buttons[1].y &&
                    buttons.every(button => scene.input._list.includes(button));
            }, { width, height });
            const { buttons, canvas } = await page.evaluate(() => {
                const scene = window.testGame.scene.getScene('result');
                const canvas = scene.game.canvas.getBoundingClientRect();
                const sx = canvas.width / scene.scale.width;
                const sy = canvas.height / scene.scale.height;
                const buttons = scene.children.list.filter(o => o.input?.enabled).map(button => {
                    const hit = button.input.hitArea;
                    return {
                        x: canvas.x + (button.x - button.displayOriginX + hit.x) * sx,
                        y: canvas.y + (button.y - button.displayOriginY + hit.y) * sy,
                        w: hit.width * sx, h: hit.height * sy,
                    };
                });
                const texts = scene.children.list.filter(o => typeof o.text === 'string' && !['RETRY  ›', 'MAIN MENU'].includes(o.text));
                for (const text of texts) {
                    const box = text.getBounds();
                    if (box.left < 0 || box.right > scene.scale.width || box.top < 0 ||
                        canvas.y + box.bottom * sy > buttons[0].y) throw new Error('Clipped content: ' + text.text);
                }
                return { buttons, canvas: canvas.toJSON() };
            });
            for (const button of buttons) {
                assert.ok(button.w >= 44 && button.h >= 44);
                assert.ok(button.x >= canvas.left && button.x + button.w <= canvas.right);
                assert.ok(button.y >= canvas.top && button.y + button.h <= canvas.bottom);
            }
            assert.ok(buttons[0].x + buttons[0].w < buttons[1].x);
            const before = await page.evaluate(() => window.actions.length);
            const button = buttons[index];
            await page.touchscreen.tap(button.x + button.w - 4, button.y + button.h - 4);
            await active(target);
            assert.deepEqual(await page.evaluate(i => window.actions.slice(i), before), [target]);
            console.log(`PASS ${width}x${height} ${target}: ${button.w.toFixed(1)}x${button.h.toFixed(1)} CSS px`);
        }
    }
    assert.deepEqual(errors, []);
} finally {
    await browser.close();
}
