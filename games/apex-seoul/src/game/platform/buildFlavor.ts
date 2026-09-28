/**
 * Development-only controls must be decided by the bundle flavor, never by a
 * URL parameter. Vite replaces this value at build time, so a production
 * visitor cannot opt into internal controls by editing the address bar.
 */
export const IS_INTERNAL_BUILD = import.meta.env?.DEV === true;

export function getInternalUrlParams() {
    if (!IS_INTERNAL_BUILD || typeof window === 'undefined') {
        return new URLSearchParams();
    }

    return new URLSearchParams(window.location.search);
}
