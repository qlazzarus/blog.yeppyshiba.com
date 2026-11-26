import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.APEX_SEOUL_QA_BASE_URL ?? 'http://127.0.0.1:5194/game-assets/apex-seoul/';
const output = resolve(process.env.APEX_AUDIO_QA_OUTPUT ?? '/tmp/apex-engine-audio');
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const results = await page.evaluate(async (base) => {
        const { EngineAudio } = await import(`${base}src/game/platform/engineAudio.ts`);
        const { RuntimeAudio, WebAudioBackend } = await import(`${base}src/game/platform/runtimeAudio.ts`);
        const { GameSettingsStore } = await import(`${base}src/game/platform/gameSettings.ts`);
        const results = [];
        for (const [vehicle, induction] of [['raven', 'na'], ['mirae', 'single-turbo'], ['seorin', 'twin-turbo']]) {
            const sampleRate = 22050;
            const context = new OfflineAudioContext(1, sampleRate * 8, sampleRate);
            const bus = context.createGain();
            bus.gain.value = 0.8 * 0.85;
            bus.connect(context.destination);
            const engine = new EngineAudio(context, bus, induction);
            const snapshot = { induction, rpm: 900, throttle: 0, totalBoostRatio: 0,
                primaryBoostRatio: 0, secondaryBoostRatio: 0, shiftCutRatio: 0,
                fuelCutActive: false, gearIndex: 1 };
            // 0–1 idle, 1–4 acceleration, 4–5 shift, 5–6 lift, 6–7 mute, 7–8 resumed idle.
            engine.update(snapshot, 0);
            for (let step = 0; step <= 90; step++) {
                const fraction = step / 90;
                engine.update({ ...snapshot, rpm: 900 + fraction * 5600, throttle: 1,
                    totalBoostRatio: fraction, primaryBoostRatio: fraction,
                    secondaryBoostRatio: Math.max(0, fraction * 2 - 1) }, 1 + step / 30);
            }
            engine.update({ ...snapshot, rpm: 4500, throttle: 1, shiftCutRatio: 1 }, 4.01);
            engine.update({ ...snapshot, rpm: 3500 }, 5);
            bus.gain.setValueAtTime(0, 6);
            engine.update(snapshot, 7);
            bus.gain.setValueAtTime(0.8 * 0.85, 7);
            const rendered = await context.startRendering();
            const samples = Array.from(rendered.getChannelData(0));
            engine.destroy();
            engine.destroy();
            bus.disconnect();
            const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
            const mutedPeak = samples.slice(6 * sampleRate, 7 * sampleRate).reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
            results.push({ vehicle, sampleRate, samples, peak, mutedPeak });
        }
        // Exercise the production WebAudio backend through ten complete lifecycles.
        const store = new GameSettingsStore(() => ({ getItem: () => null, setItem() {} }));
        for (let i = 0; i < 10; i++) {
            let backend;
            const audio = new RuntimeAudio(store, () => (backend = new WebAudioBackend()));
            audio.updateEngine({ induction: 'twin-turbo', rpm: 2500, throttle: 1, totalBoostRatio: 0.5,
                primaryBoostRatio: 0.5, secondaryBoostRatio: 0.2, shiftCutRatio: 0, fuelCutActive: false, gearIndex: 2 });
            if (!await audio.unlock()) throw new Error('audio unlock failed');
            store.update({ masterVolume: 40, sfxVolume: 50 });
            if (Math.abs(backend.buses.master.gain.value - 0.4) > 0.0001) throw new Error('volume not applied');
            audio.setMuted(true);
            if (backend.buses.master.gain.value !== 0) throw new Error('mute not silent');
            audio.setMuted(false);
            audio.setPaused('scene', true);
            if (backend.buses.master.gain.value !== 0) throw new Error('pause not silent');
            audio.setPaused('scene', false);
            if (Math.abs(backend.buses.master.gain.value - 0.4) > 0.0001) throw new Error('resume volume wrong');
            audio.destroy();
            await new Promise(resolve => setTimeout(resolve, 0));
            if (backend.context.state !== 'closed') throw new Error('context leaked');
        }
        return results;
    }, baseUrl);
    for (const vehicle of ['raven-coupe', 'mirae-gt', 'seorin-gt']) {
        const url = new URL(baseUrl);
        url.searchParams.set('launch', 'time-attack');
        url.searchParams.set('vehicle', vehicle);
        url.searchParams.set('qaStartSpeed', '20');
        await page.goto(url.toString(), { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__apexSeoulQaReady);
        await page.evaluate(async base => {
            const { WebAudioBackend } = await import(`${base}src/game/platform/runtimeAudio.ts`);
            const update = WebAudioBackend.prototype.updateEngine;
            window.audioSnapshots = [];
            WebAudioBackend.prototype.updateEngine = function(snapshot) {
                window.audioSnapshots.push({ ...snapshot });
                return update.call(this, snapshot);
            };
        }, baseUrl);
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(1200);
        await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(250);
        const snapshots = await page.evaluate(() => window.audioSnapshots);
        assert(snapshots.some(snapshot => snapshot.throttle === 1 && snapshot.rpm > 0), `${vehicle}: acceleration missing`);
        assert.equal(snapshots.at(-1).throttle, 0, `${vehicle}: lift missing`);
        const expected = { 'raven-coupe': 'na', 'mirae-gt': 'single-turbo', 'seorin-gt': 'twin-turbo' };
        assert(snapshots.every(snapshot => snapshot.induction === expected[vehicle]));
        console.log(`PASS runtime ${vehicle}: ${snapshots.length} drivetrain snapshots, acceleration and lift`);
    }
    await mkdir(output, { recursive: true });
    for (const result of results) {
        assert(result.peak > 0.01 && result.peak < 1, `${result.vehicle}: silence or clipping`);
        assert.equal(result.mutedPeak, 0);
        const data = Buffer.alloc(44 + result.samples.length * 2);
        data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
        data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
        data.writeUInt32LE(result.sampleRate, 24); data.writeUInt32LE(result.sampleRate * 2, 28);
        data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36);
        data.writeUInt32LE(result.samples.length * 2, 40);
        result.samples.forEach((value, index) => data.writeInt16LE(Math.round(value * 32767), 44 + index * 2));
        await writeFile(resolve(output, `${result.vehicle}.wav`), data);
        console.log(JSON.stringify({ vehicle: result.vehicle, peak: result.peak, mutedPeak: result.mutedPeak, output }));
    }
    console.log('PASS: offline production synthesis, mute, clipping and 10 real AudioContext closures');
} finally {
    await browser.close();
}
