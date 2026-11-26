import assert from 'node:assert/strict';
import { GameSettingsStore } from '../src/game/platform/gameSettings';
import { RuntimeAudio, type AudioBackend, type AudioBus } from '../src/game/platform/runtimeAudio';

class TrackedTarget extends EventTarget {
    readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    get listenerCount() {
        return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0);
    }
    override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null) {
        if (callback) {
            const listeners = this.listeners.get(type) ?? new Set();
            listeners.add(callback);
            this.listeners.set(type, listeners);
        }
        super.addEventListener(type, callback);
    }
    override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null) {
        if (callback) this.listeners.get(type)?.delete(callback);
        super.removeEventListener(type, callback);
    }
}
class FakeBackend implements AudioBackend {
    gains = { master: 0, sfx: 0, music: 0 };
    nodes = 3;
    closes = 0;
    resumes = 0;
    reject = false;
    resume: Promise<void> = Promise.resolve();
    setGain(bus: AudioBus, value: number) { this.gains[bus] = value; }
    unlock() {
        this.resumes++;
        return this.reject ? Promise.reject(new Error('denied')) : this.resume;
    }
    async close() { this.closes++; this.nodes = 0; }
}
const store = new GameSettingsStore(() => { throw new Error('storage denied'); });
const gestures = new TrackedTarget();
const visibility = new TrackedTarget();
let hidden = false;
const environment = { gestures, visibility, hidden: () => hidden };
const backends: FakeBackend[] = [];
const createBackend = () => {
    const backend = new FakeBackend();
    backends.push(backend);
    return backend;
};

for (let iteration = 0; iteration < 10; iteration++) {
    store.update({ masterVolume: 80, sfxVolume: 85, musicVolume: 65 });
    const count = backends.length;
    const audio = new RuntimeAudio(store, createBackend, environment);
    assert.equal(gestures.listenerCount, 4);
    assert.equal(visibility.listenerCount, 1);
    assert.equal(backends.length, count, 'construction is lazy');
    gestures.dispatchEvent(new Event('pointerdown'));
    assert.equal(await audio.unlock(), true);
    const backend = backends.at(-1)!;
    assert.equal(backend.resumes, 1, 'concurrent unlock is deduplicated');
    assert.deepEqual(backend.gains, { master: 0.8, sfx: 0.85, music: 0.65 });
    assert.equal(store.update({ masterVolume: 40, musicVolume: 25, sfxVolume: 50 }), 'memory-only');
    assert.deepEqual(backend.gains, { master: 0.4, sfx: 0.5, music: 0.25 });
    audio.setMuted(true);
    assert.equal(backend.gains.master, 0);
    audio.setMuted(false);
    audio.setPaused('scene', true);
    hidden = true;
    visibility.dispatchEvent(new Event('visibilitychange'));
    audio.setPaused('scene', false);
    assert.equal(backend.gains.master, 0, 'hidden independently blocks resume');
    hidden = false;
    visibility.dispatchEvent(new Event('visibilitychange'));
    assert.equal(backend.gains.master, 0.4);
    gestures.dispatchEvent(new Event('blur'));
    assert.equal(backend.gains.master, 0);
    gestures.dispatchEvent(new Event('focus'));
    assert.equal(backend.gains.master, 0.4);
    store.update({ masterVolume: 0 });
    assert.equal(backend.gains.master, 0);
    audio.finish();
    assert.equal(backend.nodes, 0);
    assert.equal(await audio.unlock(), false);
    audio.retry();
    gestures.dispatchEvent(new Event('keydown'));
    assert.equal(await audio.unlock(), true);
    audio.destroy();
    audio.destroy();
    assert.equal(gestures.listenerCount, 0);
    assert.equal(visibility.listenerCount, 0);
    const last = backends.at(-1)!;
    const previousGains = { ...last.gains };
    store.update({ sfxVolume: 90 });
    assert.deepEqual(last.gains, previousGains, 'settings subscription removed');
    assert.equal(last.closes, 1);
    assert.equal(await audio.unlock(), false);
}
assert(backends.every(backend => backend.nodes === 0 && backend.closes === 1));

const failure = new FakeBackend();
failure.reject = true;
const denied = new RuntimeAudio(store, () => failure, environment);
assert.equal(await denied.unlock(), false);
assert.equal(failure.gains.master, 0);
failure.reject = false;
assert.equal(await denied.unlock(), true, 'later gesture can retry permission');
denied.destroy();
const unsupported = new RuntimeAudio(store, () => { throw new Error('unsupported'); }, environment);
assert.equal(await unsupported.unlock(), false);
unsupported.destroy();

const stale = new FakeBackend();
let resolveUnlock!: () => void;
stale.resume = new Promise(resolve => { resolveUnlock = resolve; });
const racing = new RuntimeAudio(store, () => stale, environment);
const pending = racing.unlock();
racing.retry();
resolveUnlock();
assert.equal(await pending, false, 'old unlock cannot reactivate a retried run');
assert.equal(stale.nodes, 0);
racing.destroy();

const late = new FakeBackend();
late.resume = new Promise(resolve => { resolveUnlock = resolve; });
const destroyed = new RuntimeAudio(store, () => late, environment);
const latePending = destroyed.unlock();
destroyed.destroy();
resolveUnlock();
assert.equal(await latePending, false);
assert.equal(late.nodes, 0);
assert.equal(gestures.listenerCount + visibility.listenerCount, 0);
const broken = new RuntimeAudio(store, () => ({
    setGain() { throw new Error('device lost'); },
    unlock() { throw new Error('resume failed'); },
    close() { return Promise.reject(new Error('close failed')); },
}), environment);
assert.equal(await broken.unlock(), false);
assert.doesNotThrow(() => store.update({ masterVolume: 80 }));
assert.doesNotThrow(() => broken.destroy());
await Promise.resolve();
assert.equal(gestures.listenerCount + visibility.listenerCount, 0);
console.log('PASS: gains, mute, gestures, denied storage/unlock, independent pause/hidden, finish/retry, late completion, 10 lifecycle cycles');
