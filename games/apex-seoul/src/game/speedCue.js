export const SPEED_CUE_CONFIG = {
    baseMaxIntensity: 0.1,
    baseSpeedBands: [
        { intensityRatio: 0, speedKmh: 70 },
        { intensityRatio: 0.12, speedKmh: 110 },
        { intensityRatio: 0.42, speedKmh: 150 },
        { intensityRatio: 0.72, speedKmh: 185 },
        { intensityRatio: 1, speedKmh: 210 },
        // Hold the steady cue at the same level through FT86 top speed. The
        // extra sense of speed in this band comes from roadside cadence.
        { intensityRatio: 1, speedKmh: 225 },
    ],
    downhillMaxIntensity: 0.16,
    driftExitBurstDuration: 0.34,
    driftExitBurstMaxIntensity: 0.26,
    driftExitReapplyWindow: 0.28,
    throttleBurstDuration: 0.26,
    throttleBurstMaxIntensity: 0.2,
};

export function createSpeedCueState() {
    return {
        driftExitBurstTimer: 0,
        driftExitReapplyTimer: 0,
        previousAccelPressed: null,
        previousDriftState: 'grip',
        throttleBurstTimer: 0,
    };
}

export function updateSpeedCue(state, input) {
    const smoothSpeedCue = getSpeedCueRatio(input.speedKmh);
    const accelPressed = input.accelPressed;
    const accelReapplied = accelPressed && state.previousAccelPressed === false;
    const exitedDrift = state.previousDriftState === 'recovery' && input.driftState === 'grip';

    if (accelReapplied && smoothSpeedCue > 0.08) {
        state.throttleBurstTimer = SPEED_CUE_CONFIG.throttleBurstDuration;
    }
    if (exitedDrift) {
        state.driftExitReapplyTimer = SPEED_CUE_CONFIG.driftExitReapplyWindow;
    }
    if ((exitedDrift && accelPressed) || (
        accelReapplied && state.driftExitReapplyTimer > 0
    )) {
        state.driftExitBurstTimer = SPEED_CUE_CONFIG.driftExitBurstDuration;
        state.driftExitReapplyTimer = 0;
    }

    state.throttleBurstTimer = Math.max(0, state.throttleBurstTimer - input.seconds);
    state.driftExitBurstTimer = Math.max(0, state.driftExitBurstTimer - input.seconds);
    state.driftExitReapplyTimer = Math.max(0, state.driftExitReapplyTimer - input.seconds);

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

export function getSpeedCueRatio(speedKmh) {
    const bands = SPEED_CUE_CONFIG.baseSpeedBands;
    const speed = Number.isFinite(speedKmh) ? Math.max(0, speedKmh) : 0;

    if (speed <= bands[0].speedKmh) return bands[0].intensityRatio;

    const upperIndex = bands.findIndex((band) => speed <= band.speedKmh);

    if (upperIndex < 0) return bands.at(-1).intensityRatio;

    const lower = bands[upperIndex - 1];
    const upper = bands[upperIndex];
    const bandRatio = clamp(
        (speed - lower.speedKmh) / Math.max(0.000001, upper.speedKmh - lower.speedKmh),
        0,
        1,
    );

    return linear(lower.intensityRatio, upper.intensityRatio, smoothStep(bandRatio));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function smoothStep(value) {
    return value * value * (3 - 2 * value);
}

function linear(from, to, amount) {
    return from + (to - from) * amount;
}
