import {
    createSpeedCueState,
    getSpeedCueRatio,
    SPEED_CUE_CONFIG,
    updateSpeedCue,
} from '../src/game/speedCue.js';

const FRAME_SECONDS = 1 / 60;
const HIGH_SPEED_KMH = 207;
const sampledEnvelope = Array.from({ length: 226 }, (_, speedKmh) => getSpeedCueRatio(speedKmh));
const envelopeIsMonotonic = sampledEnvelope.every(
    (value, index) => index === 0 || value >= sampledEnvelope[index - 1],
);
const results = {
    'brake-drift-exit': runScenario(2, (time) => ({
        accelPressed: true,
        downhillRatio: 0,
        driftState: time < 0.7 ? 'recovery' : 'grip',
        speedKmh: HIGH_SPEED_KMH,
    })),
    'level-vs-downhill': null,
    'delayed-drift-exit-reapply': runScenario(2, (time) => ({
        accelPressed: time >= 0.82,
        downhillRatio: 0,
        driftState: time < 0.7 ? 'recovery' : 'grip',
        speedKmh: HIGH_SPEED_KMH,
    })),
    'lift-no-burst': runScenario(2, (time) => ({
        accelPressed: time < 0.7,
        downhillRatio: 0,
        driftState: 'grip',
        speedKmh: HIGH_SPEED_KMH,
    })),
    'steady-cruise': runScenario(2, () => ({
        accelPressed: true,
        downhillRatio: 0,
        driftState: 'grip',
        speedKmh: HIGH_SPEED_KMH,
    })),
    'throttle-reentry': runScenario(2, (time) => ({
        accelPressed: time >= 0.7,
        downhillRatio: 0,
        driftState: 'grip',
        speedKmh: HIGH_SPEED_KMH,
    })),
};

const level = runScenario(2, () => ({
    accelPressed: true,
    downhillRatio: 0,
    driftState: 'grip',
    speedKmh: HIGH_SPEED_KMH,
}));
const downhill = runScenario(2, () => ({
    accelPressed: true,
    downhillRatio: 1,
    driftState: 'grip',
    speedKmh: HIGH_SPEED_KMH,
}));
results['level-vs-downhill'] = { downhill, level };

const metrics = {
    baseAt69Kmh: getSpeedCueRatio(69) * SPEED_CUE_CONFIG.baseMaxIntensity,
    baseAt110Kmh: getSpeedCueRatio(110) * SPEED_CUE_CONFIG.baseMaxIntensity,
    baseAt150Kmh: getSpeedCueRatio(150) * SPEED_CUE_CONFIG.baseMaxIntensity,
    baseAt185Kmh: getSpeedCueRatio(185) * SPEED_CUE_CONFIG.baseMaxIntensity,
    baseAt210Kmh: getSpeedCueRatio(210) * SPEED_CUE_CONFIG.baseMaxIntensity,
    baseAt225Kmh: getSpeedCueRatio(225) * SPEED_CUE_CONFIG.baseMaxIntensity,
    downhillDelta: averageCue(downhill, 'downhill', 0.8) - averageCue(level, 'downhill', 0.8),
    driftExitBurstDuration: activeDuration(results['brake-drift-exit'], 'driftExitBurst', 0.02),
    driftExitBurstPeak: peakCue(results['brake-drift-exit'], 'driftExitBurst'),
    delayedDriftExitBurstPeak: peakCue(results['delayed-drift-exit-reapply'], 'driftExitBurst'),
    initialHoldBurstPeak: peakCue(results['steady-cruise'], 'throttleBurst'),
    liftBurstPeakAfterRelease: peakCueAfter(results['lift-no-burst'], 'throttleBurst', 0.7),
    steadyCruisePeakAfterWarmup: peakCueAfter(results['steady-cruise'], 'intensity', 0.5),
    throttleBurstDuration: activeDuration(results['throttle-reentry'], 'throttleBurst', 0.02),
    throttleBurstPeak: peakCue(results['throttle-reentry'], 'throttleBurst'),
};

const checks = [
    checkAtMost('belowStartBase', metrics.baseAt69Kmh, 0.000001),
    {
        id: 'kmhEnvelopeMonotonic',
        pass: envelopeIsMonotonic,
        target: 'non-decreasing from 0 to 225km/h',
        value: envelopeIsMonotonic,
    },
    checkBetween('cruiseBandBase', metrics.baseAt110Kmh, 0.0119, 0.0121),
    checkBetween('highSpeedBandBase', metrics.baseAt150Kmh, 0.0419, 0.0421),
    checkBetween('fastBandBase', metrics.baseAt185Kmh, 0.0719, 0.0721),
    checkAtMost('topSpeedHoldDelta', Math.abs(metrics.baseAt225Kmh - metrics.baseAt210Kmh), 0.000001),
    checkAtLeast('downhillDelta', metrics.downhillDelta, 0.1),
    checkBetween('driftExitBurstDuration', metrics.driftExitBurstDuration, 0.15, 0.34),
    checkAtLeast('driftExitBurstPeak', metrics.driftExitBurstPeak, 0.18),
    checkAtLeast('delayedDriftExitBurstPeak', metrics.delayedDriftExitBurstPeak, 0.18),
    checkAtMost('initialHoldBurstPeak', metrics.initialHoldBurstPeak, 0.001),
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
