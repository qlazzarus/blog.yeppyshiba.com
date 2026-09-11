import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const press = async key => { await page.keyboard.press(key, { delay: 60 }); await page.waitForTimeout(100); };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Test-only handle; no production window hook is added.
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.__saveTestGame = new Phaser.Game(') });
    });
    const base = process.env.APEX_SAVE_QA_URL ?? 'http://127.0.0.1:5173/game-assets/apex-seoul/';
    await page.goto(base);
    await page.waitForFunction(() => window.__saveTestGame?.scene.isActive('main'));
    await page.evaluate(async () => {
        const { runRecordStore } = await import('/game-assets/apex-seoul/src/game/runRecord.ts');
        runRecordStore.record({ trackId: 'bugak-ridge-downhill', vehicleId: 'mirae-gt', rulesetVersion: 'time-attack-v1', runId: 'browser-fixture', finishedAt: new Date().toISOString(), vehicleColor: 'red', finishTimeSec: 90, checkpointTimesSec: [20, 40, 60] });
        runRecordStore.saveSetup({ trackId: 'bugak-ridge-downhill', vehicleId: 'mirae-gt', vehicleColor: 'red' });
        localStorage.setItem('unrelated-save-test', 'keep');
    });
    await press('ArrowDown'); await press('Enter');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('records'));
    const labels = () => page.evaluate(() => window.__saveTestGame.scene.getScenes(true)[0].children.list.filter(c => typeof c.text === 'string').map(c => c.text));
    assert((await labels()).some(t => t.includes('MIRAE-GT') && t.includes('1:30.00')));
    await page.screenshot({ path: '/tmp/apex-local-records.png' });
    await press('Escape');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('main'));
    await press('ArrowDown'); await press('ArrowDown'); await press('Enter');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('options'));
    for (let i = 0; i < 7; i++) await press('ArrowDown');
    await press('Enter');
    assert((await labels()).some(t => t.includes('Press again')));
    await press('Enter');
    assert((await labels()).some(t => t.includes('Records reset to defaults')));
    await page.screenshot({ path: '/tmp/apex-local-reset.png' });
    await page.reload();
    await page.waitForFunction(() => window.__saveTestGame?.scene.isActive('main'));
    const state = await page.evaluate(async () => {
        const { runRecordStore } = await import('/game-assets/apex-seoul/src/game/runRecord.ts');
        return { records: runRecordStore.getRecords(), setup: runRecordStore.getSetup(), unrelated: localStorage.getItem('unrelated-save-test') };
    });
    assert(state.records.buckets.every(b => b.bestRun === null && b.completedRunCount === 0));
    assert.equal(state.setup.vehicleId, 'mirae-gt');
    assert.equal(state.unrelated, 'keep');
    await press('Enter');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('vehicle-select'));
    for (let i = 0; i < 4; i++) await press('Enter');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('time-attack'));
    // Drive the existing finish path with a deterministic valid finish snapshot.
    await page.evaluate(() => {
        const scene = window.__saveTestGame.scene.getScene('time-attack');
        scene.runState.started = true;
        scene.runState.countdownRemainingSec = 0;
        scene.runState.elapsedSec = 90;
        scene.runState.checkpointTimesSec = [20, 40, 60];
        scene.cameraResource.z = scene.roadTrack.finishZ;
    });
    await page.waitForFunction(() => window.__saveTestGame.scene.getScene('time-attack').runState.finished);
    await page.evaluate(() => window.__saveTestGame.scene.getScene('time-attack').startResultScene());
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('result'));
    assert((await labels()).includes('FIRST RECORD'));
    await press('Enter');
    await page.waitForFunction(() => window.__saveTestGame.scene.isActive('time-attack'));
    const retry = await page.evaluate(() => {
        const s = window.__saveTestGame.scene.getScene('time-attack');
        return { finished: s.runState.finished, phase: s.finishPresentationPhase, resultStarted: s.resultSceneStarted, best: s.bestRunTimeSec };
    });
    assert.equal(retry.finished, false); assert.equal(retry.phase, 'racing'); assert.equal(retry.resultStarted, false); assert(retry.best >= 90);
    assert.deepEqual(errors, []);
    console.log('PASS: browser Records menu, reset confirmation, reload/defaults/profile, finish/result/retry, no runtime errors');
} finally { await browser.close(); }
