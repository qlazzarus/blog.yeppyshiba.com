import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.argv[2] ?? '/tmp/apex-driving-browser');
await mkdir(output, { recursive: true });
const server = await createServer({ root: project, server: { host: '127.0.0.1', port: 5186 } });
await server.listen();
const base = server.resolvedUrls.local[0];
let browser;
const shiftScenarios = [
    { vehicle: 'raven-coupe', mode: 'shift', z: 0, endZ: 3000, startKmh: 173, expectedGear: 5 },
    { vehicle: 'seorin-gt', mode: 'shift', z: 0, endZ: 3000, startKmh: 215, expectedGear: 8 },
    { vehicle: 'mirae-gt', mode: 'shift', z: 0, endZ: 3000, startKmh: 196, expectedGear: 6 },
];
const scenarios = process.argv.includes('--shifts-only') ? shiftScenarios : [
    ...['raven-coupe', 'seorin-gt', 'mirae-gt'].flatMap(vehicle => ['grip', 'lift'].map(mode => ({ vehicle, mode, z: 4500, endZ: 10500 }))),
    { vehicle: 'raven-coupe', mode: 'lift-neutral', z: 4500, endZ: 10500 },
    { vehicle: 'raven-coupe', mode: 'grip', z: 14200, endZ: 19700 },
    { vehicle: 'raven-coupe', mode: 'lift', z: 14200, endZ: 19700 },
];
const reports = [];
try {
    for (const scenario of scenarios) {
        const id = `${scenario.vehicle}-${scenario.mode}-${scenario.z}`;
        if (process.argv.includes('--resume')) {
            const previous = await readFile(path.join(output, `${id}.json`), 'utf8').then(JSON.parse).catch(() => null);
            if (previous?.summary?.reachedEnd) {
                reports.push(previous.summary);
                console.log(`RESUMED ${id}`);
                continue;
            }
        }
        // Fresh GPU process per scenario avoids accumulated software-renderer
        // resources on machines without hardware acceleration.
        browser = await chromium.launch({ headless: true, timeout: 20000,
            args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
        const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/src/main.ts', async route => {
            const response = await route.fetch();
            await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(', 'window.__driveGame = new Phaser.Game(') });
        });
        const url = new URL(base);
        Object.entries({ launch: 'time-attack', vehicle: scenario.vehicle, qaStartZ: String(scenario.z), qaStartSpeed: String((scenario.startKmh ?? 140) * 760 / 225), qaFreeze: '1' }).forEach(([k,v]) => url.searchParams.set(k,v));
        await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__apexSeoulQaReady, null, { timeout: 30000 });
        // Keep the actual WebGL scene and keyboard path; only own the clock.
        // QA fixtures remain excluded from saved records.
        await page.evaluate(() => {
            window.__driveGame.loop.stop();
            window.__apexSeoulQaState.qa.freeze = false;
            window.__driveClock = performance.now();
        });
        let state = await page.evaluate(() => window.__apexSeoulQaState);
        const samples = [state];
        let liftAt = null;
        const held = new Set();
        const captures = [];
        for (let tick = 0; tick < 160; tick++) {
            const seconds = tick / 10;
            const curve = state.physicsRoad.currentCurve;
            const command = curve * 1.36 - state.player.vehicleHeadingError * 2.8 - state.player.lateralOffset * 0.0015;
            let steer = Math.abs(command) < 0.1 ? 0 : Math.sign(command);
            if (['lift', 'lift-neutral'].includes(scenario.mode) && liftAt === null && Math.abs(curve) > 0.42 && steer !== 0) liftAt = seconds;
            const lifting = liftAt !== null && seconds - liftAt < 0.4 - 1e-6;
            if (scenario.mode === 'lift-neutral' && lifting) steer = 0;
            const next = new Set([!lifting && 'ArrowUp', steer < 0 && 'ArrowLeft', steer > 0 && 'ArrowRight'].filter(Boolean));
            for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
            for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
            held.clear(); for (const key of next) held.add(key);
            state = await page.evaluate(() => {
                for (let i = 0; i < 6; i++) {
                    window.__driveClock += 1000 / 60;
                    // All scene/input updates run at 60 Hz. Submit the WebGL
                    // frame at 10 Hz, matching the telemetry capture interval.
                    const method = i === 5 ? 'step' : 'headlessStep';
                    window.__driveGame[method](window.__driveClock, 1000 / 60);
                }
                return window.__apexSeoulQaState;
            });
            samples.push(state);
            if (tick === 0 || (state.player.driftState === 'drift' && !captures.some(c => c.includes('drift'))) || tick === 40 || (scenario.mode === 'shift' && state.player.gear === scenario.expectedGear && !captures.some(c => c.includes('exit')))) {
                const name = `${id}-${tick === 0 ? 'entry' : state.player.driftState === 'drift' ? 'drift' : 'exit'}.png`;
                await page.screenshot({ path: path.join(output, name), timeout: 60000 }); captures.push(name);
            }
            if (state.camera.z >= scenario.endZ) break;
        }
        const states = [...new Set(samples.map(s => s.player.driftState))];
        const summary = { id, ...scenario, updateHz: 60, renderHz: 10, reachedEnd: state.camera.z >= scenario.endZ, timeSec: state.run.elapsedSec,
            exitSpeedKmh: state.player.speedKmh, minSpeedKmh: Math.min(...samples.map(s => s.player.speedKmh)),
            maxAbsOffset: Math.max(...samples.map(s => Math.abs(s.player.lateralOffset))),
            maxAbsHeading: Math.max(...samples.map(s => Math.abs(s.player.vehicleHeadingError))),
            impacts: state.player.guardrailImpactCount, driftStates: states, errors, captures,
            inputSeen: [...new Set(samples.map(s => `${s.input.accelPressed}/${s.input.steerAxis}`))],
            initialGear: samples[0].player.gear, finalGear: state.player.gear,
            reachedGears: [...new Set(samples.map(s => s.player.gear))],
            finalHeading: state.player.vehicleHeadingError, finalOffset: state.player.lateralOffset };
        reports.push(summary);
        await writeFile(path.join(output, `${id}.json`), JSON.stringify({ summary, samples }, null, 2));
        console.log(JSON.stringify(summary));
        await context.close();
        await browser.close();
        browser = null;
    }
    const checks = reports.map(r => ({ id: r.id, pass: r.reachedEnd && r.errors.length === 0 && r.impacts === 0 &&
        (r.mode === 'shift' ? r.initialGear < r.expectedGear && r.finalGear === r.expectedGear && !r.driftStates.includes('drift') : r.mode === 'lift' ? r.driftStates.includes('drift') && r.driftStates.includes('recovery') : !r.driftStates.includes('drift')) }));
    await writeFile(path.join(output, 'summary.json'), JSON.stringify({ method: 'Actual Chromium WebGL scene, Playwright keyboard input; fixed 60 Hz scene clock, feedback every 100 ms, WebGL submissions at 10 Hz (legacy resumed fixtures 60 Hz). QA start poses, no saved records; screenshots visually inspected separately. --resume is only valid when gameplay source/settings are unchanged.', checks, reports }, null, 2));
    assert.ok(checks.every(c => c.pass), 'Browser driving checks failed; inspect summary.json');
} finally { await browser?.close(); await server.close(); }
