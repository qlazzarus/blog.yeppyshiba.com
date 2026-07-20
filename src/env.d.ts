/// <reference types="astro/client" />

declare global {
    interface Window {
        adsbygoogle?: unknown[];
        dataLayer: unknown[];
    }
}

export {};
