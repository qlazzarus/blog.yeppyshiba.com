export const SPEED_CUE_CONFIG = {
    baseMaxIntensity: 0.1,
    downhillMaxIntensity: 0.16,
    driftExitBurstDuration: 0.34,
    driftExitBurstMaxIntensity: 0.26,
    minimumSpeedRatio: 0.36,
    throttleBurstDuration: 0.26,
    throttleBurstMaxIntensity: 0.2,
};

export function createSpeedCueState() {
    return {
        driftExitBurstTimer: 0,
        previousAccelPressed: false,
        previousDriftState: 'grip',
        throttleBurstTimer: 0,
    };
}

export function updateSpeedCue(state, input) {
    const speedRatio = clamp(input.speedRatio, 0, 1);
    const speedCueRatio = clamp(
        (speedRatio - SPEED_CUE_CONFIG.minimumSpeedRatio) / (1 - SPEED_CUE_CONFIG.minimumSpeedRatio),
        0,
        1,
    );
    const smoothSpeedCue = smoothStep(speedCueRatio);
    const accelPressed = input.accelPressed;

    if (accelPressed && !state.previousAccelPressed && smoothSpeedCue > 0.08) {
        state.throttleBurstTimer = SPEED_CUE_CONFIG.throttleBurstDuration;
    }
    if (
        state.previousDriftState === 'recovery' &&
        input.driftState === 'grip' &&
        accelPressed
    ) {
        state.driftExitBurstTimer = SPEED_CUE_CONFIG.driftExitBurstDuration;
    }

    state.throttleBurstTimer = Math.max(0, state.throttleBurstTimer - input.seconds);
    state.driftExitBurstTimer = Math.max(0, state.driftExitBurstTimer - input.seconds);

    const base = smoothSpeedCue * SPEED_CUE_CONFIG.baseMaxIntensity;
    const downhill = smoothSpeedCue * clamp(input.downhillRatio, 0, 1) * SPEED_CUE_CONFIG.downhillMaxIntensity;
    const throttleBurst = smoothSpeedCue
        * clamp(state.throttleBurstTimer / SPEED_CUE_CONFIG.throttleBurstDuration, 0, 1)
        * SPEED_CUE_CONFIG.throttleBurstMaxIntensity;
    const driftExitBurst = smoothSpeedCue
        * clamp(state.driftExitBurstTimer / SPEED_CUE_CONFIG.driftExitBurstDuration, 0, 1)
        * SPEED_CUE_CONFIG.driftExitBurstMaxIntensity;

    state.previousAccelPressed = accelPressed;
    state.previousDriftState = input.driftState;

    return {
        base,
        downhill,
        driftExitBurst,
        intensity: clamp(base + downhill + throttleBurst + driftExitBurst, 0, 1),
        throttleBurst,
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function smoothStep(value) {
    return value * value * (3 - 2 * value);
}
