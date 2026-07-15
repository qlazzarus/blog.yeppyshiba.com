import {
    createSpeedCueState,
    updateSpeedCue,
} from '../src/game/speedCue.js';

const FRAME_SECONDS = 1 / 60;
const HIGH_SPEED_RATIO = 0.92;
const results = {
    'brake-drift-exit': runScenario(2, (time) => ({
        accelPressed: true,
        downhillRatio: 0,
        driftState: time < 0.7 ? 'recovery' : 'grip',
        speedRatio: HIGH_SPEED_RATIO,
    })),
    'level-vs-downhill': null,
    'lift-no-burst': runScenario(2, (time) => ({
        accelPressed: time < 0.7,
        downhillRatio: 0,
        driftState: 'grip',
        speedRatio: HIGH_SPEED_RATIO,
    })),
    'steady-cruise': runScenario(2, () => ({
        accelPressed: true,
        downhillRatio: 0,
        driftState: 'grip',
        speedRatio: HIGH_SPEED_RATIO,
    })),
    'throttle-reentry': runScenario(2, (time) => ({
        accelPressed: time >= 0.7,
        downhillRatio: 0,
        driftState: 'grip',
        speedRatio: HIGH_SPEED_RATIO,
    })),
};

const level = runScenario(2, () => ({
    accelPressed: true,
    downhillRatio: 0,
    driftState: 'grip',
    speedRatio: HIGH_SPEED_RATIO,
}));
const downhill = runScenario(2, () => ({
    accelPressed: true,
    downhillRatio: 1,
    driftState: 'grip',
    speedRatio: HIGH_SPEED_RATIO,
}));
results['level-vs-downhill'] = { downhill, level };

const metrics = {
    downhillDelta: averageCue(downhill, 'downhill', 0.8) - averageCue(level, 'downhill', 0.8),
    driftExitBurstDuration: activeDuration(results['brake-drift-exit'], 'driftExitBurst', 0.02),
    driftExitBurstPeak: peakCue(results['brake-drift-exit'], 'driftExitBurst'),
    liftBurstPeakAfterRelease: peakCueAfter(results['lift-no-burst'], 'throttleBurst', 0.7),
    steadyCruisePeakAfterWarmup: peakCueAfter(results['steady-cruise'], 'intensity', 0.5),
    throttleBurstDuration: activeDuration(results['throttle-reentry'], 'throttleBurst', 0.02),
    throttleBurstPeak: peakCue(results['throttle-reentry'], 'throttleBurst'),
};

const checks = [
    checkAtLeast('downhillDelta', metrics.downhillDelta, 0.1),
    checkBetween('driftExitBurstDuration', metrics.driftExitBurstDuration, 0.15, 0.34),
    checkAtLeast('driftExitBurstPeak', metrics.driftExitBurstPeak, 0.18),
    checkAtMost('liftBurstPeakAfterRelease', metrics.liftBurstPeakAfterRelease, 0.001),
    checkAtMost('steadyCruisePeakAfterWarmup', metrics.steadyCruisePeakAfterWarmup, 0.11),
    checkBetween('throttleBurstDuration', metrics.throttleBurstDuration, 0.12, 0.26),
    checkAtLeast('throttleBurstPeak', metrics.throttleBurstPeak, 0.14),
];
const report = {
    checks,
    metrics: roundObject(metrics),
    pass: checks.every((check) => check.pass),
    scenarios: Object.fromEntries(
        Object.entries(results).map(([id, result]) => [
            id,
            Array.isArray(result) ? summarize(result) : {
                downhill: summarize(result.downhill),
                level: summarize(result.level),
            },
        ]),
    ),
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function runScenario(durationSec, getInput) {
    const state = createSpeedCueState();
    const samples = [];

    for (let time = 0; time <= durationSec; time += FRAME_SECONDS) {
        const cue = updateSpeedCue(state, {
            ...getInput(time),
            seconds: FRAME_SECONDS,
        });
        samples.push({ ...cue, time });
    }

    return samples;
}

function activeDuration(samples, key, threshold) {
    return samples.filter((sample) => sample[key] > threshold).length * FRAME_SECONDS;
}

function averageCue(samples, key, startAt) {
    const selected = samples.filter((sample) => sample.time >= startAt);
    return selected.reduce((total, sample) => total + sample[key], 0) / selected.length;
}

function peakCue(samples, key) {
    return Math.max(...samples.map((sample) => sample[key]));
}

function peakCueAfter(samples, key, startAt) {
    return peakCue(samples.filter((sample) => sample.time >= startAt), key);
}

function summarize(samples) {
    return {
        intensityPeak: round(peakCue(samples, 'intensity')),
        intensitySteadyAverage: round(averageCue(samples, 'intensity', 0.8)),
    };
}

function checkAtLeast(id, value, target) {
    return { id, pass: value >= target, target, value: round(value) };
}

function checkAtMost(id, value, target) {
    return { id, pass: value <= target, target, value: round(value) };
}

function checkBetween(id, value, min, max) {
    return { id, max, min, pass: value >= min && value <= max, value: round(value) };
}

function roundObject(values) {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)]));
}

function round(value) {
    return Number(value.toFixed(4));
}
