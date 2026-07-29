const STORAGE_PREFIX = 'apex-seoul:best-run:';

export function loadBestRunTime(trackId: string) {
    try {
        const rawValue = window.localStorage.getItem(`${STORAGE_PREFIX}${trackId}`);
        const value = rawValue === null ? null : Number(rawValue);

        return value !== null && Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function saveBestRunTime(trackId: string, previousBestTimeSec: number | null, timeSec: number) {
    if (!Number.isFinite(timeSec) || timeSec <= 0) return previousBestTimeSec;
    if (previousBestTimeSec !== null && previousBestTimeSec <= timeSec) return previousBestTimeSec;

    try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${trackId}`, String(timeSec));
    } catch {
        // Private browsing or storage restrictions must not prevent a run from finishing.
    }

    return timeSec;
}
