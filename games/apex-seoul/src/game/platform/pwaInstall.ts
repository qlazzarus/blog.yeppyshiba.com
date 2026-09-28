type BeforeInstallPromptEvent = Event & {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type PwaInstallAction = 'prompt' | 'ios-guide' | null;
export type PwaInstallResult = 'accepted' | 'dismissed' | 'ios-guide' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

/** Keeps the browser-owned install prompt available to menu scenes. */
export function initializePwaInstall() {
    if (initialized) return;
    initialized = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
    });
}

export function getPwaInstallAction(): PwaInstallAction {
    if (isStandalone()) return null;
    if (deferredPrompt) return 'prompt';
    return isIos() ? 'ios-guide' : null;
}

export async function requestPwaInstall(): Promise<PwaInstallResult> {
    const action = getPwaInstallAction();
    if (action === 'ios-guide') return 'ios-guide';
    if (action !== 'prompt' || !deferredPrompt) return 'unavailable';

    const prompt = deferredPrompt;
    // A BeforeInstallPromptEvent can be used only once, including after dismissal.
    deferredPrompt = null;
    await prompt.prompt();
    return (await prompt.userChoice).outcome;
}

export function registerPwaServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
        // Installation remains an optional enhancement if registration is blocked.
    });
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}
