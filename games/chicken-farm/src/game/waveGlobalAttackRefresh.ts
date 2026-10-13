export type WaveGlobalAttackRefreshEvent = {
    readonly atSec: number;
    readonly type: 'global_attack_refresh';
};

export type WaveGlobalAttackRefresh = {
    getSnapshot(): { readonly lastTickSec: number; readonly nextRefreshAtSec: number };
    tick(elapsedSec: number): readonly WaveGlobalAttackRefreshEvent[];
};

/**
 * Simulation-time representation of the W3X Player(10) group order timer.
 * It is deliberately independent from individual wolf spawn/order timestamps.
 */
export function createWaveGlobalAttackRefresh(
    intervalSec = 60,
): WaveGlobalAttackRefresh {
    if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
        throw new Error(`Global attack refresh interval must be a positive finite number: ${intervalSec}`);
    }

    let lastTickSec = 0;
    let nextRefreshAtSec = intervalSec;

    return {
        getSnapshot() {
            return { lastTickSec, nextRefreshAtSec };
        },
        tick(elapsedSec) {
            if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
                throw new Error(`Global attack refresh elapsedSec must be a non-negative finite number: ${elapsedSec}`);
            }
            if (elapsedSec < lastTickSec) {
                throw new Error(`Global attack refresh time cannot move backward: ${elapsedSec} < ${lastTickSec}`);
            }

            const events: WaveGlobalAttackRefreshEvent[] = [];
            while (nextRefreshAtSec <= elapsedSec) {
                events.push({ atSec: nextRefreshAtSec, type: 'global_attack_refresh' });
                nextRefreshAtSec = Number((nextRefreshAtSec + intervalSec).toFixed(6));
            }
            lastTickSec = elapsedSec;
            return events;
        },
    };
}
