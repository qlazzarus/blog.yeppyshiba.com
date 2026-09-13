/** World units match camera Z and player lateralOffset. Motion is measured over a window, not per frame. */
export const RECOVERY = { stuckSec: 3, noticeSec: 0.5, blinkSec: 1.5, contactGraceSec: 0.2, movementUnits: 12 } as const;
export function createStuckRecoveryState() {
    return { elapsed: 0, contactGap: 0, anchorZ: 0, anchorX: 0, tracking: false, blinkRemaining: 0, count: 0 };
}
export type StuckRecoveryState = ReturnType<typeof createStuckRecoveryState>;
export function updateStuckRecovery(state: StuckRecoveryState, input: {
    active: boolean; attempting: boolean; contact: boolean; z: number; x: number;
}, seconds: number) {
    state.blinkRemaining = Math.max(0, state.blinkRemaining - seconds);
    if (!input.active || !input.attempting || state.blinkRemaining > 0) {
        state.tracking = false; state.elapsed = 0; state.contactGap = 0;
        return false;
    }
    state.contactGap = input.contact ? 0 : state.contactGap + seconds;
    if (state.contactGap > RECOVERY.contactGraceSec || (!state.tracking && !input.contact)) {
        state.tracking = false; state.elapsed = 0;
        return false;
    }
    if (!state.tracking || Math.hypot(input.z - state.anchorZ, input.x - state.anchorX) > RECOVERY.movementUnits) {
        state.anchorZ = input.z; state.anchorX = input.x; state.elapsed = 0; state.tracking = true;
    }
    state.elapsed += seconds;
    if (state.elapsed + 1e-8 < RECOVERY.stuckSec + RECOVERY.noticeSec) return false;
    state.count += 1; state.elapsed = 0; state.tracking = false; state.contactGap = 0; state.blinkRemaining = RECOVERY.blinkSec;
    return true;
}
