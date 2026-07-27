export type LaunchQuality = 'cold' | 'hooked' | 'none' | 'overrev';

export type LaunchControlConfig = {
    burnoutDurationSec: {
        hooked: number;
        overrev: number;
    };
    forceDurationSec: number;
    forceMaxSpeedKmh: number;
    hookedForceBonus: number;
    hookedRpm: readonly [number, number];
    idleRpm: number;
    limiterRpm: number;
    overrevForceBonus: number;
    overrevRpm: number;
    revReleaseResponse: number;
    revResponse: number;
};

export type LaunchControlState = {
    burnoutRemainingSec: number;
    clutchEngagement: number;
    elapsedSec: number;
    forceRatio: number;
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
    const targetRpm = accelPressed ? config.limiterRpm : config.idleRpm;
    const response = accelPressed ? config.revResponse : config.revReleaseResponse;
    const previousRpm = state.startRpm ?? config.idleRpm;
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
    if (state.phase !== 'active') return 1;

    state.elapsedSec += seconds;
    state.burnoutRemainingSec = Math.max(0, state.burnoutRemainingSec - seconds);
    state.clutchEngagement = Math.min(1, state.elapsedSec / 0.16);

    const durationRatio = 1 - clamp(state.elapsedSec / config.forceDurationSec, 0, 1);
    const speedRatio = 1 - clamp(speedKmh / config.forceMaxSpeedKmh, 0, 1);
    const forceRatio = accelPressed ? state.forceRatio * durationRatio * speedRatio : 0;

    if (durationRatio === 0 || speedRatio === 0 || !accelPressed) {
        state.forceRatio = 0;
        state.phase = 'complete';
    }

    return 1 + forceRatio;
}

function getLaunchQuality(rpm: number, config: LaunchControlConfig): LaunchQuality {
    if (rpm >= config.overrevRpm) return 'overrev';
    if (rpm >= config.hookedRpm[0] && rpm <= config.hookedRpm[1]) return 'hooked';

    return 'cold';
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
