export type LaunchQuality = 'cold' | 'hooked' | 'none' | 'overrev';

export type LaunchControlConfig = {
    burnoutDurationSec: {
        hooked: number;
        overrev: number;
    };
    forceDurationSec: number;
    forceMaxSpeedKmh: number;
    hookedForceBonus: number;
    hookedTractionReleaseSec: number;
    hookedRpm: readonly [number, number];
    idleRpm: number;
    limiterRpm: number;
    limiterRecoveryRpm: number;
    overrevForceBonus: number;
    overrevTractionReleaseSec: number;
    overrevRpm: number;
    revReleaseResponse: number;
    revResponse: number;
};

export type LaunchControlState = {
    burnoutRemainingSec: number;
    clutchEngagement: number;
    elapsedSec: number;
    forceRatio: number;
    preLaunchFuelCutActive: boolean;
    phase: 'active' | 'complete' | 'idle' | 'revving';
    quality: LaunchQuality;
    startRpm: number | null;
};

export function createLaunchControlState(): LaunchControlState {
    return {
        burnoutRemainingSec: 0,
        clutchEngagement: 1,
        elapsedSec: 0,
        forceRatio: 0,
        preLaunchFuelCutActive: false,
        phase: 'idle',
        quality: 'none',
        startRpm: null,
    };
}

export function updatePreLaunchRev(
    state: LaunchControlState,
    accelPressed: boolean,
    seconds: number,
    config: LaunchControlConfig,
) {
    if (state.phase === 'active' || state.phase === 'complete') return state.startRpm ?? config.idleRpm;

    state.phase = accelPressed ? 'revving' : 'idle';
    state.clutchEngagement = 0;
    const previousRpm = state.startRpm ?? config.idleRpm;
    if (!accelPressed) state.preLaunchFuelCutActive = false;
    if (accelPressed && previousRpm >= config.limiterRpm - 8) {
        state.preLaunchFuelCutActive = true;
    } else if (state.preLaunchFuelCutActive && previousRpm <= config.limiterRecoveryRpm + 8) {
        state.preLaunchFuelCutActive = false;
    }
    const targetRpm = accelPressed
        ? state.preLaunchFuelCutActive ? config.limiterRecoveryRpm : config.limiterRpm
        : config.idleRpm;
    const response = accelPressed ? config.revResponse : config.revReleaseResponse;
    const blend = 1 - Math.exp(-response * seconds);
    const rpm = previousRpm + (targetRpm - previousRpm) * blend;

    state.startRpm = rpm;

    return rpm;
}

export function beginLaunch(
    state: LaunchControlState,
    accelPressed: boolean,
    config: LaunchControlConfig,
) {
    const startRpm = state.startRpm ?? config.idleRpm;
    const quality = accelPressed ? getLaunchQuality(startRpm, config) : 'cold';

    state.burnoutRemainingSec = quality === 'hooked'
        ? config.burnoutDurationSec.hooked
        : quality === 'overrev'
            ? config.burnoutDurationSec.overrev
            : 0;
    state.clutchEngagement = 0;
    state.preLaunchFuelCutActive = false;
    state.elapsedSec = 0;
    state.forceRatio = quality === 'hooked'
        ? config.hookedForceBonus
        : quality === 'overrev'
            ? config.overrevForceBonus
            : 0;
    state.phase = quality === 'cold' ? 'complete' : 'active';
    state.quality = quality;
    state.startRpm = startRpm;
}

export function updateLaunchControl(
    state: LaunchControlState,
    accelPressed: boolean,
    speedKmh: number,
    seconds: number,
    config: LaunchControlConfig,
) {
    // Smoke presentation may intentionally outlive the force window. Keep its
    // timer advancing after the clutch/force phase has completed.
    state.burnoutRemainingSec = Math.max(0, state.burnoutRemainingSec - seconds);
    if (state.phase !== 'active') return 1;

    state.elapsedSec += seconds;
    const tractionReleaseSec = state.quality === 'hooked'
        ? config.hookedTractionReleaseSec
        : config.overrevTractionReleaseSec;
    state.clutchEngagement = Math.min(1, state.elapsedSec / tractionReleaseSec);

    const durationRatio = 1 - clamp(state.elapsedSec / config.forceDurationSec, 0, 1);
    const speedRatio = 1 - clamp(speedKmh / config.forceMaxSpeedKmh, 0, 1);
    const forceRatio = accelPressed ? state.forceRatio * durationRatio * speedRatio : 0;

    if (durationRatio === 0 || speedRatio === 0 || !accelPressed) {
        state.forceRatio = 0;
        state.phase = 'complete';
    }

    // The rear tires spin briefly before fully biting. This is a force gate,
    // not direct speed injection, so the controller still owns acceleration.
    return state.clutchEngagement * (1 + forceRatio);
}

function getLaunchQuality(rpm: number, config: LaunchControlConfig): LaunchQuality {
    if (rpm >= config.overrevRpm) return 'overrev';
    if (rpm >= config.hookedRpm[0] && rpm <= config.hookedRpm[1]) return 'hooked';

    return 'cold';
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
