import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = process.env.APEX_BROWSER_CDP_URL
    ? await chromium.connectOverCDP(process.env.APEX_BROWSER_CDP_URL)
    : await chromium.launch({
        headless: true,
        executablePath: process.env.APEX_BROWSER_EXECUTABLE || undefined,
        args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    });
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/src/main.ts', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.__testGame = new Phaser.Game(') });
    });
    await page.goto(process.env.APEX_SAVE_QA_URL ?? 'http://127.0.0.1:5173/game-assets/apex-seoul/');
    await page.waitForFunction(() => window.__testGame?.scene.isActive('main'));
    const labels = () => page.evaluate(() => window.__testGame.scene.getScenes(true)[0].children.list.filter(c => typeof c.text === 'string').map(c => c.text));
    await page.evaluate(async () => {
        const { runRecordStore } = await import('/game-assets/apex-seoul/src/game/runRecord.ts');
        const { RECORD_RULESET } = await import('/game-assets/apex-seoul/src/game/saveDefaults.ts');
        for (const [vehicleId, finishTimeSec] of [['raven-coupe', 100], ['mirae-gt', 90], ['seorin-gt', 110]]) {
            for (let i = 0; i < 8; i++) runRecordStore.record({ vehicleId, trackId: 'bugak-ridge-downhill', rulesetVersion: RECORD_RULESET, runId: `${vehicleId}-${i}`, finishedAt: new Date(1700000000000 + i * 1000).toISOString(), vehicleColor: ['blue', 'red', 'silver', 'black'][i % 4], finishTimeSec: finishTimeSec + i, checkpointTimesSec: [20, 40, 60] });
        }
        window.__testGame.scene.getScene('main').scene.start('records');
    });
    await page.waitForFunction(() => window.__testGame.scene.isActive('records'));
    const records = await labels();
    assert(!records.includes('MIRAE GT') && !records.includes('RAVEN COUPE'));
    const portraits = await page.evaluate(() => window.__testGame.scene.getScene('records').children.list
        .filter(c => c.name?.startsWith('record-vehicle-') && c.visible)
        .map(c => ({ texture: c.texture.key, frame: c.frame.name, flip: c.flipX })));
    assert.equal(portraits.length, 10);
    assert(portraits.every(p => p.frame === 6 && p.flip));
    const displayedTimes = await page.evaluate(() => window.__testGame.scene.getScene('records').children.list
        .filter(c => typeof c.text === 'string' && /^\d{2}:\d{2}\.\d{2}$/.test(c.text))
        .sort((a, b) => a.y - b.y).map(c => c.text));
    assert.deepEqual(displayedTimes, ['01:30.00', '01:31.00', '01:32.00', '01:33.00', '01:34.00', '01:35.00', '01:36.00', '01:37.00', '01:40.00', '01:41.00']);
    assert(records.includes('01:30.00') && records.includes('01:37.00'));
    assert(records.includes('PLAYER'));
    assert(records.includes('FASTEST TIMES FIRST'));
    assert(!records.includes('BEST') && !records.includes('BY VEHICLE'));
    assert(!records.some(label => /^\d+ \/ \d+$/.test(label)));
    await page.screenshot({ path: '/tmp/apex-records-simple.png' });
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => window.__testGame.scene.isActive('main'));
    await page.evaluate(() => {
        const game = window.__testGame;
        game.scale.resize(640, 600);
        game.scene.getScene('records').scene.restart();
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: '/tmp/apex-records-compact.png' });
    await page.evaluate(() => window.__testGame.scale.resize(1200, 760));
    await page.evaluate(() => { window.__testGame.scene.getScene('records').scene.start('time-attack', { vehicleId: 'raven-coupe', vehicleColor: 'blue', trackId: 'bugak-ridge-downhill' }); });
    await page.waitForFunction(() => window.__testGame.scene.isActive('time-attack'));
    const result = await page.evaluate(() => {
        const s = window.__testGame.scene.getScene('time-attack');
        s.runState.started = true;
        s.cameraResource.z = s.roadTrack.finishZ * 0.2;
        s.runState.progressRatio = 0.2;
        s.runState.elapsedSec = 10;
        const drive = s.getDriveCommand;
        s.getDriveCommand = () => ({ accelPressed: false, brakePressed: true, steerAxis: 0 });
        s.playerVehicle.guardrailContactActive = true;
        for (let i = 0; i < 300; i++) s.updateRecovery(1 / 60);
        if (s.recovery.count !== 0) throw new Error('Braking must not trigger recovery');
        s.getDriveCommand = () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 });
        const z = s.cameraResource.z;
        s.playerVehicle.lateralOffset = 500;
        s.playerVehicle.guardrailContactActive = true;
        for (let i = 0; i < 210; i++) { s.updateRunState(1 / 60); s.updateRecovery(1 / 60); }
        const recovery = { count: s.recovery.count, x: s.playerVehicle.lateralOffset, speed: s.playerVehicle.speed, contact: s.playerVehicle.guardrailContactActive, z: s.cameraResource.z, originalZ: z, time: s.runState.elapsedSec, checkpoints: s.runState.passedCheckpoints };
        // Run the actual controller after reset, then preserve the split fixture position.
        for (let i = 0; i < 60; i++) s.updatePlayerVehicle(1 / 60);
        recovery.acceleratedSpeed = s.playerVehicle.speed;
        s.getDriveCommand = drive;
        s.render();
        s.__originalUpdate = s.update;
        s.update = () => s.render(0);
        return recovery;
    });
    assert.equal(result.count, 1); assert.equal(result.x, 0); assert.equal(result.speed, 0); assert.equal(result.contact, false);
    assert(result.acceleratedSpeed > 0);
    assert.equal(result.z, result.originalZ); assert(result.time > 13.49); assert.equal(result.checkpoints, 0);
    await page.waitForTimeout(100);
    await page.screenshot({ path: '/tmp/apex-recovery.png' });
    const split = await page.evaluate(() => {
        const s = window.__testGame.scene.getScene('time-attack');
        s.recovery.blinkRemaining = 0;
        s.cameraResource.z = s.roadTrack.finishZ * 0.35;
        s.updateRunState(10); s.render();
        return s.lastSplitText;
    });
    assert(split.includes('ALL PB (MIRAE)')); assert(split.includes('CAR PB (RAVEN)'));
    await page.waitForTimeout(100);
    await page.screenshot({ path: '/tmp/apex-last-split.png' });
    await page.evaluate(() => {
        const s = window.__testGame.scene.getScene('time-attack');
        s.cameraResource.z = s.roadTrack.finishZ;
        s.updateRunState(70);
        s.update = s.__originalUpdate;
        s.startResultScene();
    });
    await page.waitForFunction(() => window.__testGame.scene.isActive('result'));
    assert((await labels()).some(t => t.includes('ALL PB (MIRAE)') && t.includes('CAR PB (RAVEN)')));
    assert((await labels()).some(t => t.includes('RECOVERIES 1')));
    await page.screenshot({ path: '/tmp/apex-result-comparison.png' });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__testGame.scene.isActive('time-attack'));
    const retry = await page.evaluate(() => {
        const s = window.__testGame.scene.getScene('time-attack');
        return { count: s.recovery.count, split: s.lastSplitText, finished: s.runState.finished };
    });
    assert.deepEqual(retry, { count: 0, split: '', finished: false });
    const pause = await page.evaluate(() => {
        const s = window.__testGame.scene.getScene('time-attack');
        const time = s.runState.elapsedSec;
        window.dispatchEvent(new Event('blur'));
        s.update(0, 10000);
        window.dispatchEvent(new Event('focus'));
        s.update(0, 10000);
        return s.runState.elapsedSec === time && !s.recovery.tracking;
    });
    assert(pause);
    assert.deepEqual(errors, []);
    console.log('PASS: Records time ranking/keyboard return, scene recovery without progress gain, dual split/result, retry cleanup, no browser errors');
} finally { await browser.close(); }
