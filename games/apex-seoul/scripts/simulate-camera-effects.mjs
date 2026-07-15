import {
    createCameraEffectsState,
    DEFAULT_CAMERA_EFFECTS_CONFIG,
    updateCameraEffects,
} from '../src/game/cameraEffects.js';
import { SPEED_CUE_CONFIG } from '../src/game/speedCue.js';

const FRAME_SECONDS = 1 / 60;
const HIGH_SPEED_RATIO = 0.92;
const zeroCue = { downhill: 0, driftExitBurst: 0, throttleBurst: 0 };

const scenarios = {
    'camera-shake-disabled': runScenario({ ...DEFAULT_CAMERA_EFFECTS_CONFIG, shakeScale: 0 }, () => fullCue('driftExitBurst')),
    'drift-exit': runScenario(DEFAULT_CAMERA_EFFECTS_CONFIG, () => fullCue('driftExitBurst')),
    'rail-impact': runScenario(DEFAULT_CAMERA_EFFECTS_CONFIG, () => ({ cue: zeroCue, railImpact: 1 })),
    'steady-cruise': runScenario(DEFAULT_CAMERA_EFFECTS_CONFIG, () => zeroCue),
    'throttle-reentry': runScenario(DEFAULT_CAMERA_EFFECTS_CONFIG, () => fullCue('throttleBurst')),
};

const metrics = {
    disabledPeakShake: peakShake(scenarios['camera-shake-disabled']),
    driftExitPeakShake: peakShake(scenarios['drift-exit']),
    steadyPeakShake: peakShake(scenarios['steady-cruise']),
    railImpactPeakShake: peakShake(scenarios['rail-impact']),
    throttlePeakShake: peakShake(scenarios['throttle-reentry']),
    throttlePeakFovCue: peak(scenarios['throttle-reentry'], 'fovCueDegrees'),
};
const checks = [
    atMost('disabledPeakShake', metrics.disabledPeakShake, 0.0001),
    atLeast('driftExitPeakShake', metrics.driftExitPeakShake, 0.8),
    atLeast('railImpactPeakShake', metrics.railImpactPeakShake, 1.8),
    atMost('steadyPeakShake', metrics.steadyPeakShake, 0.0001),
    atLeast('throttlePeakFovCue', metrics.throttlePeakFovCue, 0.5),
    atLeast('throttlePeakShake', metrics.throttlePeakShake, 0.35),
];
const report = {
    checks,
    metrics: roundObject(metrics),
    pass: checks.every((check) => check.pass),
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function fullCue(key) {
    return {
        ...zeroCue,
        [key]: SPEED_CUE_CONFIG[`${key}MaxIntensity`],
    };
}

function runScenario(config, getCue) {
    let state = createCameraEffectsState(config);
    const samples = [];

    for (let time = 0; time < 0.5; time += FRAME_SECONDS) {
        const input = getCue(time);
        const cue = 'cue' in input ? input.cue : input;
        state = updateCameraEffects(state, {
            cue,
            cueLimits: SPEED_CUE_CONFIG,
            railImpact: 'railImpact' in input ? input.railImpact : 0,
            seconds: FRAME_SECONDS,
            speedRatio: HIGH_SPEED_RATIO,
        }, config);
        samples.push(state);
    }

    return samples;
}

function peak(samples, key) {
    return Math.max(...samples.map((sample) => sample[key]));
}

function peakShake(samples) {
    return Math.max(...samples.map((sample) => Math.hypot(sample.shake.x, sample.shake.y)));
}

function atLeast(id, value, target) {
    return { id, pass: value >= target, target, value: round(value) };
}

function atMost(id, value, target) {
    return { id, pass: value <= target, target, value: round(value) };
}

function roundObject(values) {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)]));
}

function round(value) {
    return Number(value.toFixed(4));
}
