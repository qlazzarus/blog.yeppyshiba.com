import type { LaunchControlState } from './launchControl';

export function getLaunchRuntimeQaState(state: LaunchControlState) {
    return {
        burnoutRemainingSec: round(state.burnoutRemainingSec, 3),
        clutchEngagement: round(state.clutchEngagement, 3),
        forceRatio: round(state.forceRatio, 3),
        preLaunchFuelCutActive: state.preLaunchFuelCutActive,
        phase: state.phase,
        quality: state.quality,
        startRpm: state.startRpm === null ? null : Math.round(state.startRpm),
    };
}

function round(value: number, digits: number) {
    return Number(value.toFixed(digits));
}
