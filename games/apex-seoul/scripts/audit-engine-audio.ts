import assert from 'node:assert/strict';
import { engineAudioTargets } from '../src/game/platform/engineAudio';
import { createPowertrainSnapshot } from '../src/game/powertrainFeedback';
import { RuntimeAudio, type AudioBackend } from '../src/game/platform/runtimeAudio';
import { GameSettingsStore } from '../src/game/platform/gameSettings';

for (const induction of ['na', 'single-turbo', 'twin-turbo'] as const) {
    const player = Object.freeze({ rpm: 900, boostRatio: 0, primaryBoostRatio: 0,
        secondaryBoostRatio: 0, fuelCutActive: false, gearIndex: 1, shiftCutRatio: 0 });
    const idle = Object.freeze(createPowertrainSnapshot(induction, player, 0));
    const accelerating = Object.freeze({ ...idle, rpm: 6000, throttle: 1,
        totalBoostRatio: 0.8, primaryBoostRatio: 0.8, secondaryBoostRatio: 0.6 });
    const base = engineAudioTargets(idle);
    const loaded = engineAudioTargets(accelerating);
    assert(loaded.fundamental > base.fundamental);
    assert(loaded.engineGain > base.engineGain);
    assert(loaded.exhaustGain > base.exhaustGain);
    assert(engineAudioTargets({ ...accelerating, throttle: 0 }).exhaustGain < loaded.exhaustGain);
    assert(engineAudioTargets({ ...accelerating, shiftCutRatio: 1 }).engineGain < loaded.engineGain);
    assert(engineAudioTargets({ ...accelerating, fuelCutActive: true }).engineGain < loaded.engineGain);
    assert.equal(loaded.spools.length, induction === 'na' ? 0 : induction === 'single-turbo' ? 1 : 2);
    if (induction === 'twin-turbo') {
        const primaryOnly = engineAudioTargets({ ...accelerating, secondaryBoostRatio: 0 });
        assert(primaryOnly.spools[0].gain > 0);
        assert.equal(primaryOnly.spools[1].gain, 0);
    }
    assert.equal(idle.rpm, 900);
    assert.equal(player.rpm, 900);
    assert(Number.isFinite(engineAudioTargets({ ...idle, rpm: NaN, throttle: Infinity }).fundamental));
}
const settings = new GameSettingsStore(() => ({ getItem: () => null, setItem() {} }));
let updates = 0;
const backend: AudioBackend = {
    setGain() {}, unlock: async () => {}, close: async () => {},
    updateEngine(snapshot) { assert.equal(snapshot.rpm, 900); updates++; },
};
const target = new EventTarget();
const audio = new RuntimeAudio(settings, () => backend, { gestures: target, visibility: target, hidden: () => false });
const snapshot = createPowertrainSnapshot('na', { rpm: 900, gearIndex: 1, fuelCutActive: false,
    boostRatio: 0, primaryBoostRatio: 0, secondaryBoostRatio: 0, shiftCutRatio: 0 }, 0);
audio.updateEngine(snapshot);
snapshot.rpm = 5000;
await audio.unlock();
assert.equal(updates, 1, 'latest detached state reaches lazy backend');
audio.finish();
audio.updateEngine(snapshot);
assert.equal(updates, 1);
audio.retry();
await audio.unlock();
assert.equal(updates, 1, 'retry cannot replay an old snapshot');
audio.destroy();
console.log('PASS: three induction types, idle/load/lift/shift/fuel-cut, independent twin spool, immutable snapshot, lazy unlock and retry');
