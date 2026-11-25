import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
    for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 640, height: 360 }]) {
        const page = await browser.newPage({ viewport, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/src/main.ts', async route => {
            const response = await route.fetch();
            await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.testGame = new Phaser.Game(') });
        });
        await page.goto(process.env.APEX_SAVE_QA_URL ?? 'http://127.0.0.1:5173/game-assets/apex-seoul/');
        await page.waitForFunction(() => window.testGame?.scene.isActive('main'));
        await page.evaluate(async () => {
            const { runRecordStore } = await import('/game-assets/apex-seoul/src/game/runRecord.ts');
            const { RECORD_RULESET } = await import('/game-assets/apex-seoul/src/game/saveDefaults.ts');
            for (let i = 0; i < 16; i++) {
                runRecordStore.record({ vehicleId: i % 2 ? 'raven-coupe' : 'mirae-gt', trackId: 'bugak-ridge-downhill', rulesetVersion: RECORD_RULESET, runId: `mobile-${i}`, finishedAt: new Date(1700000000000 + i * 1000).toISOString(), vehicleColor: 'blue', finishTimeSec: 90 + i, checkpointTimesSec: [20, 40, 60] });
            }
        });
        for (const key of ['main', 'vehicle-select', 'records', 'asset-notices', 'options']) {
            if (key !== 'main') {
                await page.evaluate(key => window.testGame.scene.getScenes(true)[0].scene.start(key), key);
                await page.waitForFunction(key => window.testGame?.scene.isActive(key), key);
            }
            const snapshot = await page.evaluate(() => {
                const scene = window.testGame.scene.getScenes(true)[0];
                const bounds = scene.game.canvas.getBoundingClientRect();
                const sx = bounds.width / scene.scale.width;
                const sy = bounds.height / scene.scale.height;
                const controls = scene.children.list.filter(object => object.input?.enabled).map(object => {
                    const area = object.input.hitArea;
                    return {
                        x: Math.round((bounds.left + (object.x - object.displayOriginX + (area.x ?? 0)) * sx) * 10) / 10,
                        y: Math.round((bounds.top + (object.y - object.displayOriginY + (area.y ?? 0)) * sy) * 10) / 10,
                        width: Math.round((area.width ?? 0) * sx * 10) / 10,
                        height: Math.round((area.height ?? 0) * sy * 10) / 10,
                    };
                });
                return { scene: scene.scene.key, canvas: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, controls };
            });
            console.log(JSON.stringify({ viewport, ...snapshot }));
            {
                for (const control of snapshot.controls) {
                    assert.ok(control.width >= 44 && control.height >= 44, `${key} hit area below 44 CSS px`);
                    assert.ok(control.x >= 0 && control.y >= 0 && control.x + control.width <= viewport.width && control.y + control.height <= viewport.height);
                }
                for (let i = 0; i < snapshot.controls.length; i++) {
                    for (let j = i + 1; j < snapshot.controls.length; j++) {
                        const a = snapshot.controls[i], b = snapshot.controls[j];
                        assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${key} controls overlap`);
                    }
                }
            }
        }
        await page.evaluate(() => window.testGame.scene.getScenes(true)[0].scene.start('main'));
        await page.waitForFunction(() => window.testGame?.scene.isActive('main'));
        const tapControl = async (index, fraction = 0.5) => {
            const point = await page.evaluate(({ index, fraction }) => {
                const scene = window.testGame.scene.getScenes(true)[0];
                const bounds = scene.game.canvas.getBoundingClientRect();
                const controls = scene.children.list.filter(object => object.input?.enabled);
                const control = controls.at(index);
                return {
                    x: bounds.left + (control.x + (fraction - 0.5) * control.width) * bounds.width / scene.scale.width,
                    y: bounds.top + control.y * bounds.height / scene.scale.height,
                    width: control.input.hitArea.width * bounds.width / scene.scale.width,
                    height: control.input.hitArea.height * bounds.height / scene.scale.height,
                };
            }, { index, fraction });
            await page.touchscreen.tap(point.x, point.y);
            return point;
        };
        const startPoint = await page.evaluate(() => {
            const scene = window.testGame.scene.getScene('main');
            const button = scene.children.list.find(object => object.input?.enabled);
            const bounds = scene.game.canvas.getBoundingClientRect();
            return { x: bounds.left + button.x * bounds.width / scene.scale.width, y: bounds.top + button.y * bounds.height / scene.scale.height };
        });
        await page.mouse.move(startPoint.x, startPoint.y);
        await page.mouse.down();
        await page.mouse.move(startPoint.x + 20, startPoint.y);
        await page.mouse.up();
        assert.ok(await page.evaluate(() => window.testGame.scene.isActive('main')), 'Main menu drag activated a button');
        await tapControl(0);
        await page.waitForFunction(() => window.testGame?.scene.isActive('vehicle-select'));
        for (let step = 0; step < 4; step++) {
            await page.waitForFunction(step => window.testGame.scene.getScene('vehicle-select').step === step, step);
            if (step > 0) {
                await tapControl(1);
                await page.waitForFunction(step => window.testGame.scene.getScene('vehicle-select').step === step - 1, step);
                await tapControl(-1);
                await page.waitForFunction(step => window.testGame.scene.getScene('vehicle-select').step === step, step);
            }
            const dimensions = await page.evaluate(() => {
                const scene = window.testGame.scene.getScene('vehicle-select');
                const rect = scene.game.canvas.getBoundingClientRect();
                return scene.children.list.filter(item => item.input?.enabled).map(item => ({ x: item.x - item.displayOriginX, y: item.y - item.displayOriginY, logicalWidth: item.width, logicalHeight: item.height, width: item.input.hitArea.width * rect.width / scene.scale.width, height: item.input.hitArea.height * rect.height / scene.scale.height }));
            });
            assert.ok(dimensions.every(item => item.width >= 44 && item.height >= 44), 'Garage step has a small action');
            for (let i = 0; i < dimensions.length; i++) {
                for (let j = i + 1; j < dimensions.length; j++) {
                    const a = dimensions[i], b = dimensions[j];
                    assert.ok(a.x + a.logicalWidth <= b.x || b.x + b.logicalWidth <= a.x || a.y + a.logicalHeight <= b.y || b.y + b.logicalHeight <= a.y, `Garage step ${step} actions overlap`);
                }
            }
            if (step === 0) {
                const target = await page.evaluate(() => {
                    const scene = window.testGame.scene.getScene('vehicle-select');
                    const button = scene.children.list.filter(item => item.input?.enabled).at(-1);
                    const bounds = scene.game.canvas.getBoundingClientRect();
                    return { x: bounds.left + button.x * bounds.width / scene.scale.width, y: bounds.top + button.y * bounds.height / scene.scale.height };
                });
                await page.mouse.move(target.x, target.y);
                await page.mouse.down();
                await page.mouse.move(target.x + 20, target.y);
                await page.mouse.up();
                assert.equal(await page.evaluate(() => window.testGame.scene.getScene('vehicle-select').step), 0, 'Garage drag advanced the step');
                await tapControl(2);
                assert.equal(await page.evaluate(() => window.testGame.scene.getScene('vehicle-select').vehicleIndex), 1);
            }
            if (step === 1) {
                await tapControl(3);
                assert.equal(await page.evaluate(() => window.testGame.scene.getScene('vehicle-select').colorIndex), 1);
            }
            const action = await tapControl(-1);
            console.log(JSON.stringify({ viewport, scene: 'vehicle-select', step, confirm: action }));
        }
        await page.waitForFunction(() => window.testGame?.scene.isActive('time-attack'));
        console.log(JSON.stringify({ viewport, pointerFlow: 'main → garage 4 steps → time-attack', pass: true }));
        for (const [index, key] of [[1, 'records'], [2, 'options'], [3, 'asset-notices']]) {
            await page.evaluate(() => window.testGame.scene.getScenes(true)[0].scene.start('main'));
            await page.waitForFunction(() => window.testGame?.scene.isActive('main'));
            await tapControl(index);
            await page.waitForFunction(key => window.testGame?.scene.isActive(key), key);
            const dragList = async () => {
                const bounds = await page.locator('canvas').boundingBox();
                const x = bounds.x + bounds.width * 0.55;
                await page.mouse.move(x, bounds.y + bounds.height * 0.68);
                await page.mouse.down();
                await page.mouse.move(x, bounds.y + bounds.height * 0.32, { steps: 8 });
                await page.mouse.up();
            };
            if (key === 'records' || key === 'asset-notices') {
                const before = await page.evaluate(() => window.testGame.scene.getScenes(true)[0].children.list.filter(item => typeof item.text === 'string').map(item => item.text).join('|'));
                await dragList();
                const after = await page.evaluate(() => window.testGame.scene.getScenes(true)[0].children.list.filter(item => typeof item.text === 'string').map(item => item.text).join('|'));
                assert.notEqual(after, before, `${key} list did not scroll`);
                const backPoint = await page.evaluate(() => {
                    const scene = window.testGame.scene.getScenes(true)[0];
                    const button = scene.children.list.filter(item => item.input?.enabled).at(-1);
                    const bounds = scene.game.canvas.getBoundingClientRect();
                    return { x: bounds.left + button.x * bounds.width / scene.scale.width, y: bounds.top + button.y * bounds.height / scene.scale.height };
                });
                await page.mouse.move(backPoint.x, backPoint.y);
                await page.mouse.down();
                await page.mouse.move(backPoint.x + 20, backPoint.y);
                await page.mouse.up();
                assert.ok(await page.evaluate(key => window.testGame.scene.isActive(key), key), `${key} back action accepted a drag`);
            }
            if (key === 'options') {
                const volume = () => page.evaluate(async () => (await import('/game-assets/apex-seoul/src/game/gameSettings.ts')).gameSettingsStore.getSettings().masterVolume);
                const originalVolume = await volume();
                await tapControl(2, 0.2);
                assert.equal(await volume(), originalVolume - 5, 'Volume decrement');
                await tapControl(2, 0.8);
                assert.equal(await volume(), originalVolume, 'Volume increment');
                await tapControl(1);
                assert.equal(await page.evaluate(async () => (await import('/game-assets/apex-seoul/src/game/gameSettings.ts')).gameSettingsStore.getSettings().controlScheme), 'virtual', 'Disabled sensitivity changed control mode');
                const initialSettings = await page.evaluate(() => localStorage.getItem('apex-seoul:settings:v1'));
                for (let attempt = 0; attempt < 8; attempt++) {
                    const visible = await page.evaluate(() => window.testGame.scene.getScene('options').children.list.some(item => item.text === 'RESET RECORDS' && item.visible));
                    if (visible) break;
                    await dragList();
                }
                assert.equal(await page.evaluate(() => localStorage.getItem('apex-seoul:settings:v1')), initialSettings, 'Options drag changed a setting');
                assert.ok(await page.evaluate(() => window.testGame.scene.getScene('options').children.list.some(item => item.text === 'RESET RECORDS' && item.visible)), 'Options reset not reachable by drag');
                await tapControl(-2);
                await page.waitForFunction(() => window.testGame.scene.getScene('options').children.list.some(item => item.text?.includes('Delete personal records?')));
                await tapControl(0);
                assert.ok(!(await page.evaluate(() => window.testGame.scene.getScene('options').children.list.some(item => item.text?.includes('Delete personal records?')))));
                await tapControl(-2);
                await tapControl(-2);
                await page.waitForFunction(() => window.testGame.scene.getScene('options').children.list.some(item => item.text?.includes('Records reset to defaults.')));
                console.log(JSON.stringify({ viewport, reset: 'cancel and confirm', pass: true }));
            }
            await tapControl(-1);
            await page.waitForFunction(() => window.testGame?.scene.isActive('main'));
            const remaining = await page.evaluate(key => {
                const scene = window.testGame.scene.getScene(key);
                return ['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside', 'wheel'].flatMap(event => scene.input.listeners(event).map(listener => listener.name));
            }, key);
            assert.ok(!remaining.some(name => ['onPointerDown', 'onPointerMove', 'onPointerEnd', 'onWheel'].includes(name)), `${key} left scene input listeners behind`);
            console.log(JSON.stringify({ viewport, pointerFlow: `main → ${key} → main`, pass: true }));
        }
        if (errors.length) throw new Error(errors.join('\n'));
        await page.close();
    }
} finally {
    await browser.close();
}
