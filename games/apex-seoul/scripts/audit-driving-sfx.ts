import assert from 'node:assert/strict';
import { DrivingSfxConsumer, type DrivingSfxSnapshot, type DrivingSfxFrame } from '../src/game/platform/drivingSfx';
import { RuntimeAudio } from '../src/game/platform/runtimeAudio';
import { GameSettingsStore } from '../src/game/platform/gameSettings';

const initial: DrivingSfxSnapshot = {
    runId: 'first', sequence: 0, events: [], speed: 100, slipAngle: 0.3, tireContact: true,
    guardrailContactActive: false, guardrailContactPhase: 'clear', guardrailImpactCount: 0, guardrailImpactCue: 0,
};
const consumer = new DrivingSfxConsumer();
consumer.consume(initial, true);
const events = ['shift', 'fuel-cut', 'single-kick', 'twin-stage', 'lift'].map((type, index) => ({
    type: type as 'shift' | 'fuel-cut' | 'single-kick' | 'twin-stage' | 'lift', sequence: index + 1,
}));
const snapshot = Object.freeze({ ...initial, sequence: 5, events: [...events, events[0]] });
assert.equal(consumer.consume(snapshot, true).oneShots.length, 5);
assert.equal(consumer.consume(snapshot, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...snapshot, sequence: 1, events: [events[0]] }, true).oneShots.length, 0);
const impact = { ...snapshot, guardrailContactActive: true, guardrailContactPhase: 'enter' as const,
    guardrailImpactCount: 1, guardrailImpactCue: 0.8 };
assert.deepEqual(consumer.consume(impact, true).oneShots, [{ type: 'guardrail-impact', gain: 0.8 }]);
assert.equal(consumer.consume(impact, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...impact, guardrailContactPhase: 'stay', guardrailImpactCount: 2 }, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...impact, guardrailContactPhase: 'exit' }, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...impact, guardrailImpactCount: 3, speed: 0 }, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...impact, guardrailImpactCount: 4, guardrailContactActive: false }, true).oneShots.length, 0);
for (const changes of [{ speed: 0 }, { tireContact: false }, { slipAngle: 0 }, { slipAngle: NaN }]) {
    assert.equal(consumer.consume({ ...initial, ...changes }, true).tireGain, 0);
}
assert(consumer.consume(initial, true).tireGain > 0);
consumer.consume({ ...snapshot, sequence: 6, events: [{ type: 'shift', sequence: 6 }] }, false);
assert.equal(consumer.consume({ ...snapshot, sequence: 6, events: [{ type: 'shift', sequence: 6 }] }, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...snapshot, runId: 'retry' }, true).oneShots.length, 0);
assert.equal(consumer.consume({ ...snapshot, runId: 'retry', sequence: 6, events: [{ type: 'lift', sequence: 6 }] }, true).oneShots.length, 1);
consumer.reset();
consumer.consume(initial, true);
assert.equal(consumer.consume({ ...initial, sequence: 1, events: [events[0]] }, true).oneShots.length, 1);

const frames: DrivingSfxFrame[] = [];
const gains = { master: 0, sfx: 0, music: 0 };
const store = new GameSettingsStore(() => ({ getItem: () => null, setItem() {} }));
const target = new EventTarget();
const audio = new RuntimeAudio(store, () => ({
    setGain(bus, value) { gains[bus] = value; },
    unlock: async () => {}, close: async () => {},
    updateEffects(frame) { frames.push(frame); },
}), { gestures: target, visibility: target, hidden: () => false });
audio.updateEffects(initial);
audio.updateEffects(snapshot);
await audio.unlock();
audio.updateEffects(snapshot);
assert.equal(frames.at(-1)!.oneShots.length, 0, 'locked events consumed without replay');
audio.updateEffects({ ...snapshot, sequence: 6, events: [{ type: 'shift', sequence: 6 }] });
assert.equal(frames.at(-1)!.oneShots.length, 1);
audio.setPaused('scene', true);
assert.equal(frames.at(-1)!.tireGain, 0);
assert.equal(gains.master, 0);
audio.updateEffects({ ...snapshot, sequence: 7, events: [{ type: 'shift', sequence: 7 }] });
audio.setPaused('scene', false);
audio.updateEffects({ ...snapshot, sequence: 7, events: [{ type: 'shift', sequence: 7 }] });
assert.equal(frames.at(-1)!.oneShots.length, 0);
store.update({ sfxVolume: 0 });
assert.equal(frames.at(-1)!.tireGain, 0);
audio.updateEffects(snapshot);
assert.equal(frames.at(-1)!.tireGain, 0);
audio.retry();
await audio.unlock();
audio.updateEffects(snapshot);
assert.equal(frames.at(-1)!.oneShots.length, 0);
audio.resetEffects();
assert.equal(frames.at(-1)!.tireGain, 0);
audio.finish();
const count = frames.length;
audio.updateEffects(snapshot);
assert.equal(frames.length, count);
audio.destroy();
console.log('PASS: sequence dedup, enter/stay/exit, stopped/no-contact silence, slip gain, locked/muted/paused consumption, retry/recovery, finish/destroy');
