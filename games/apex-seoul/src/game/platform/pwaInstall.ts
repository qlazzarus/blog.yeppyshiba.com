type BeforeInstallPromptEvent = Event & {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PWA_GAME_PATH = '/game-assets/apex-seoul/';
export type PwaInstallAction = 'prompt' | 'ios-guide' | 'open-game' | null;
export type PwaInstallResult = 'accepted' | 'dismissed' | 'rejected' | 'ios-guide' | 'opened' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let installed = false;
let displayMode: MediaQueryList | null = null;
const listeners = new Set<() => void>();

function notifyInstallChange() {
    for (const listener of listeners) listener();
}

function onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyInstallChange();
}

function onAppInstalled() {
    deferredPrompt = null;
    installed = true;
    notifyInstallChange();
}

/** Keeps the browser-owned install prompt available to menu scenes. */
export function initializePwaInstall() {
    if (initialized) return;
    initialized = true;
    installed = false;
    displayMode = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    displayMode.addEventListener?.('change', notifyInstallChange);
}

export function destroyPwaInstall() {
    if (!initialized) return;
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', onAppInstalled);
    displayMode?.removeEventListener?.('change', notifyInstallChange);
    displayMode = null;
    deferredPrompt = null;
    installed = false;
    initialized = false;
    notifyInstallChange();
}

export function subscribePwaInstall(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function getPwaInstallAction(): PwaInstallAction {
    if (installed || isStandalone()) return null;
    if (window.self !== window.top) return 'open-game';
    if (deferredPrompt) return 'prompt';
    return isIos() ? 'ios-guide' : null;
}

export async function requestPwaInstall(): Promise<PwaInstallResult> {
    const action = getPwaInstallAction();
    if (action === 'open-game') {
        try {
            window.open(new URL(PWA_GAME_PATH, window.location.origin).href, '_blank', 'noopener,noreferrer');
            return 'opened';
        } catch {
            return 'unavailable';
        }
    }
    if (action === 'ios-guide') return 'ios-guide';
    if (action !== 'prompt' || !deferredPrompt) return 'unavailable';

    const prompt = deferredPrompt;
    // Clear it before the first await so concurrent requests cannot reuse it.
    deferredPrompt = null;
    notifyInstallChange();
    try {
        await prompt.prompt();
        return (await prompt.userChoice).outcome;
    } catch {
        return 'rejected';
    }
}

export function registerPwaServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(`${PWA_GAME_PATH}sw.js`, { scope: PWA_GAME_PATH }).catch(() => {
        // Installation remains an optional enhancement if registration is blocked.
    });
}

function isStandalone() {
    return (displayMode ?? window.matchMedia('(display-mode: standalone)')).matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}
