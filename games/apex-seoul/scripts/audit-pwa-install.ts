import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';

const display = Object.assign(new EventTarget(), { matches: false });
const source = Object.assign(new EventTarget(), {
    self: {} as object,
    top: {} as object,
    location: { origin: 'https://example.test' },
    matchMedia: () => display,
    open: (...args: unknown[]) => { opened.push(args); return null; },
});
source.top = source.self;
const opened: unknown[][] = [];
const registrations: unknown[][] = [];
const navigatorStub = {
    userAgent: 'Android', maxTouchPoints: 1, standalone: false,
    serviceWorker: { register: (...args: unknown[]) => { registrations.push(args); return Promise.resolve(); } },
};
Object.defineProperty(globalThis, 'window', { value: source, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: navigatorStub, configurable: true });

const pwa = await import('../src/game/platform/pwaInstall');
let changes = 0;
const unsubscribe = pwa.subscribePwaInstall(() => { changes++; });
pwa.initializePwaInstall();
pwa.initializePwaInstall();
assert.equal(getEventListeners(source, 'beforeinstallprompt').length, 1);
assert.equal(getEventListeners(source, 'appinstalled').length, 1);
assert.equal(pwa.getPwaInstallAction(), null);

function emitPrompt(outcome: 'accepted' | 'dismissed' | 'rejected', rejectChoice = false) {
    let calls = 0;
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => { calls++; if (outcome === 'rejected' && !rejectChoice) throw new Error('prompt rejected'); },
        userChoice: rejectChoice ? Promise.reject(new Error('choice rejected')) : Promise.resolve({ outcome: outcome === 'rejected' ? 'dismissed' : outcome, platform: 'web' }),
    });
    source.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    return () => calls;
}

for (const outcome of ['accepted', 'dismissed', 'rejected'] as const) {
    const count = emitPrompt(outcome);
    assert.equal(pwa.getPwaInstallAction(), 'prompt');
    const first = pwa.requestPwaInstall();
    assert.equal(await pwa.requestPwaInstall(), 'unavailable');
    assert.equal(await first, outcome);
    assert.equal(count(), 1);
    assert.equal(await pwa.requestPwaInstall(), 'unavailable');
}
const choiceCount = emitPrompt('rejected', true);
assert.equal(await pwa.requestPwaInstall(), 'rejected');
assert.equal(choiceCount(), 1);

let releasePrompt!: () => void;
const delayed = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: () => new Promise<void>(resolve => { releasePrompt = resolve; }),
    userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }),
});
source.dispatchEvent(delayed);
const pending = pwa.requestPwaInstall();
const replacementCount = emitPrompt('accepted');
releasePrompt();
assert.equal(await pending, 'dismissed');
assert.equal(await pwa.requestPwaInstall(), 'accepted');
assert.equal(replacementCount(), 1);

navigatorStub.userAgent = 'iPhone';
assert.equal(pwa.getPwaInstallAction(), 'ios-guide');
assert.equal(await pwa.requestPwaInstall(), 'ios-guide');
source.top = {};
assert.equal(pwa.getPwaInstallAction(), 'open-game');
assert.equal(await pwa.requestPwaInstall(), 'opened');
assert.deepEqual(opened, [['https://example.test/game-assets/apex-seoul/', '_blank', 'noopener,noreferrer']]);
display.matches = true;
display.dispatchEvent(new Event('change'));
assert.equal(pwa.getPwaInstallAction(), null);
assert.equal(await pwa.requestPwaInstall(), 'unavailable');
display.matches = false;
source.top = source.self;
source.dispatchEvent(new Event('appinstalled'));
assert.equal(pwa.getPwaInstallAction(), null);
assert.ok(changes > 0);
pwa.registerPwaServiceWorker();
assert.deepEqual(registrations, [['/game-assets/apex-seoul/sw.js', { scope: '/game-assets/apex-seoul/' }]]);

unsubscribe();
const beforeDestroy = changes;
pwa.destroyPwaInstall();
assert.equal(changes, beforeDestroy);
assert.equal(getEventListeners(source, 'beforeinstallprompt').length, 0);
assert.equal(getEventListeners(source, 'appinstalled').length, 0);
assert.equal(getEventListeners(display, 'change').length, 0);
console.log('PASS: single-use, concurrent and replacement prompts, rejection, iframe, iOS, standalone, install events, cleanup and worker scope');
