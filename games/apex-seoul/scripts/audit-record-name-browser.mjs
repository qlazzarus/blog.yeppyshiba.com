import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.APEX_SAVE_QA_URL ?? 'http://127.0.0.1:5194/game-assets/apex-seoul/';
const browser = await chromium.launch({ args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
    const page = await browser.newPage({ hasTouch: true, viewport: { width: 844, height: 390 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.testGame = new Phaser.Game(') });
    });
    await page.goto(base);
    const active = key => page.waitForFunction(key => window.testGame?.scene.isActive(key), key);
    await active('main');
    await page.evaluate(async base => {
        const { runRecordStore } = await import(`${base}src/game/platform/runRecord.ts`);
        const { RECORD_RULESET } = await import(`${base}src/game/saveDefaults.ts`);
        window.nameStore = runRecordStore;
        window.nameRules = RECORD_RULESET;
        window.resultActions = [];
        const plugin = window.testGame.scene.getScene('result').scene;
        const start = plugin.start.bind(plugin);
        plugin.start = (key, data) => { window.resultActions.push(key); return start(key, data); };
    }, base);
    let sequence = 0;
    const show = async (excluded = false) => {
        const id = `name-${++sequence}`;
        await page.evaluate(({ id, excluded }) => {
            const setup = { trackId: 'bugak-ridge-downhill', vehicleId: 'raven-coupe', vehicleColor: 'blue' };
            const status = window.nameStore.record({ ...setup, runId: id, finishedAt: new Date().toISOString(),
                rulesetVersion: window.nameRules, finishTimeSec: 100, checkpointTimesSec: [25, 50, 75] }, !excluded);
            window.testGame.scene.getScenes(true)[0].scene.start('result', {
                recordRunId: excluded ? undefined : id, recordStatus: status, runSetup: setup,
                color: 'Blue', courseName: 'Bugak Ridge Downhill', vehicleName: 'Raven Coupe',
                finishTimeSec: 100, bestTimeSec: 100, previousBestTimeSec: null, isNewBest: true,
                deltaSec: null, checkpointTimesSec: [25, 50, 75],
            });
        }, { id, excluded });
        await active('result');
        if (!excluded) await page.getByRole('dialog').waitFor();
        return id;
    };
    const records = () => page.evaluate(() => window.nameStore.getRecords());
    const tap = async label => {
        const box = await page.getByRole('button', { name: label, exact: true }).boundingBox();
        assert(box && box.width >= 44 && box.height >= 44);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    };
    for (const [width, height] of [[844, 390], [667, 375], [640, 360]]) {
        await page.setViewportSize({ width, height });
        const id = await show();
        const count = await page.evaluate(() => window.resultActions.length);
        for (let i = 0; i < 3; i++) {
            const selector = page.getByLabel(`Letter ${i + 1}`, { exact: true });
            const box = await selector.boundingBox();
            assert(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.y >= 0);
            await selector.selectOption('ABC'[i]);
        }
        await tap('SAVE NAME');
        await page.waitForFunction(() => !document.querySelector('dialog'));
        assert.equal(await page.evaluate(() => window.resultActions.length), count);
        const bucket = (await records()).buckets[0];
        assert.equal(bucket.recentRuns.find(run => run.runId === id).playerName, 'ABC');
        assert.equal(bucket.completedRunCount, sequence);
        await page.keyboard.press('Enter');
        await active('time-attack');
        assert.equal(await page.evaluate(() => window.resultActions.length), count + 1);
        console.log(`PASS ${width}x${height}: native letter selection, touch save, keyboard retry once`);
    }
    const skipped = await show();
    assert.equal(await page.getByLabel('Letter 1', { exact: true }).inputValue(), 'A');
    assert.equal(await page.getByLabel('Letter 2', { exact: true }).inputValue(), 'B');
    await tap('SKIP');
    assert.equal((await records()).buckets[0].recentRuns.find(run => run.runId === skipped).playerName, 'PLAYER');
    const mainButton = await page.evaluate(() => {
        const scene = window.testGame.scene.getScene('result');
        const button = scene.children.list.filter(child => child.input?.enabled).at(-1);
        const canvas = scene.game.canvas.getBoundingClientRect();
        return { x: canvas.x + button.x * canvas.width / scene.scale.width,
            y: canvas.y + button.y * canvas.height / scene.scale.height };
    });
    await page.touchscreen.tap(mainButton.x, mainButton.y);
    await active('main');
    const keyboardId = await show();
    await page.keyboard.press('z');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('y');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('x');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('dialog'));
    assert.equal((await records()).buckets[0].recentRuns.find(run => run.runId === keyboardId).playerName, 'ZYX');
    await show();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog'));
    assert(await page.evaluate(() => window.testGame.scene.isActive('result')));
    await show(true);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await show();
    await page.evaluate(() => {
        window.originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (key.startsWith('apex-seoul:')) throw new Error('fixture storage denied');
            return window.originalSetItem.call(this, key, value);
        };
    });
    await tap('SAVE NAME');
    assert.match(await page.getByRole('status').textContent(), /Browser storage failed/);
    await tap('CONTINUE');
    assert(await page.evaluate(() => window.testGame.scene.isActive('result')));
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await show();
    await page.evaluate(() => window.testGame.scene.getScene('result').scene.start('main'));
    await active('main');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: restored name, keyboard letters/move/save, skip/Escape, Main, excluded run, storage failure/continue, shutdown cleanup');
} finally { await browser.close(); }
