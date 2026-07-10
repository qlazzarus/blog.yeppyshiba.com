import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const baseConfig = {
    accelSpeed: 760,
    aeroDrag: 0.00012,
    brakeSpeed: 0,
    braking: 330,
    centeringResponse: 1.75,
    cornerAccelSpeedDrop: 190,
    cornerSpeedPull: 210,
    curveDriftAcceleration: 160,
    curveSteeringHighSpeedDrop: 0.48,
    curveSteeringCue: 0.06,
    engineAcceleration: 170,
    engineBrakeDeceleration: 26,
    engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
    highSpeedInputResponseDrop: 0.35,
    highSpeedLateralVelocityCap: 56,
    highSpeedSteeringSlewRate: 4.2,
    highSpeedSteerForceDrop: 0.62,
    highSpeedSteerVisualDrop: 0.48,
    inputResponse: 18,
    launchThrottleFullSpeedRatio: 0.38,
    launchThrottleMinRatio: 0.3,
    maxRoadOffset: 700,
    rollingResistance: 14,
    rpmIdle: 1100,
    rpmRedline: 7200,
    rpmResponse: 7,
    steerAcceleration: 1650,
    steerDamping: 9.2,
    steeringSpeedScrub: 64,
    steeringSpeedScrubThreshold: 0.22,
    steeringVelocityCue: 0.2,
};
const candidates = [
    {
        id: 'previous-baseline',
        patch: {
            cornerAccelSpeedDrop: 150,
            cornerSpeedPull: 190,
            curveDriftAcceleration: 260,
            curveSteeringHighSpeedDrop: 0,
            curveSteeringCue: 0.1,
            engineAcceleration: 128,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.34,
            launchThrottleFullSpeedRatio: 0.05,
            launchThrottleMinRatio: 1,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.38,
        },
    },
    {
        id: 'baseline',
        patch: {},
    },
    {
        id: 'previous-2026-07-10-baseline',
        patch: {
            cornerAccelSpeedDrop: 100,
            cornerSpeedPull: 120,
            curveSteeringHighSpeedDrop: 0.38,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.38,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
        },
    },
    {
        id: 'previous-visual-cue',
        patch: {
            curveSteeringHighSpeedDrop: 0,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.25,
            inputResponse: 16,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.25,
        },
    },
    {
        id: 'previous-grip-angle',
        patch: {
            curveSteeringHighSpeedDrop: 0,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.25,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
        },
    },
    {
        id: 'visual-cue-snappier',
        patch: {
            inputResponse: 20,
            steeringVelocityCue: 0.18,
        },
    },
    {
        id: 'previous-lateral-weight',
        patch: {
            centeringResponse: 1.9,
            steerAcceleration: 1750,
        },
    },
    {
        id: 'even-less-curve-force',
        patch: {
            curveDriftAcceleration: 130,
            curveSteeringCue: 0.05,
        },
    },
    {
        id: 'even-less-corner-pull',
        patch: {
            cornerAccelSpeedDrop: 80,
            cornerSpeedPull: 100,
        },
    },
    {
        id: 'stronger-engine',
        patch: {
            engineAcceleration: 190,
        },
    },
    {
        id: 'extra-grip-angle-damping',
        patch: {
            curveSteeringHighSpeedDrop: 0.45,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerVisualDrop: 0.45,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.2,
        },
    },
    {
        id: 'stronger-high-speed-weight',
        patch: {
            curveSteeringHighSpeedDrop: 0.52,
            highSpeedInputResponseDrop: 0.42,
            highSpeedLateralVelocityCap: 48,
            highSpeedSteeringSlewRate: 3.6,
            highSpeedSteerForceDrop: 0.65,
            highSpeedSteerVisualDrop: 0.52,
        },
    },
    {
        id: 'combined-second-pass',
        patch: {
            cornerAccelSpeedDrop: 80,
            cornerSpeedPull: 100,
            curveDriftAcceleration: 130,
            curveSteeringHighSpeedDrop: 0.38,
            curveSteeringCue: 0.05,
            engineAcceleration: 190,
            highSpeedSteerVisualDrop: 0.38,
            launchThrottleFullSpeedRatio: 0.38,
            launchThrottleMinRatio: 0.3,
            steeringVelocityCue: 0.2,
        },
    },
];
const scenarios = {
    'curve-counter-steer': {
        counterSteerStartSec: 8,
        durationSec: 16,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 8 && t < 10.5 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'curve-no-input': {
        durationSec: 24,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 4 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'hold-left-1s-release': {
        durationSec: 8,
        releaseSec: 3,
        startSec: 2,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'left-hold-3s-release': {
        durationSec: 12,
        releaseSec: 5,
        startSec: 2,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'micro-tap-left': {
        durationSec: 4,
        releaseSec: 1.2,
        startSec: 1,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 1 && t < 1.2 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'slalom-20s': {
        durationSec: 20,
        getInput: (t) => {
            if (t < 2) {
                return {
                    accelPressed: true,
                    brakePressed: false,
                    steerAxis: 0,
                };
            }

            const phase = Math.floor((t - 2) / 1.4);

            return {
                accelPressed: true,
                brakePressed: false,
                steerAxis: phase % 2 === 0 ? -1 : 1,
            };
        },
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'standing-start-12s': {
        durationSec: 12,
        initialSpeed: 0,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'straight-accel-20s': {
        durationSec: 20,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
};

const config = {
    outputDir: 'assets/telemetry/generated/handling-sim',
    sampleHz: 20,
    scenarios: [
        'standing-start-12s',
        'straight-accel-20s',
        'micro-tap-left',
        'hold-left-1s-release',
        'left-hold-3s-release',
        'slalom-20s',
        'curve-no-input',
        'curve-counter-steer',
    ],
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--scenario' && next) {
        config.scenarios = next.split(',').map((scenario) => scenario.trim()).filter(Boolean);
        index += 1;
    }
}

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, '-');
const outputDir = resolveProjectPath(config.outputDir);
await mkdir(outputDir, { recursive: true });

const report = {
    candidates: [],
    generatedAt: startedAt.toISOString(),
    outputDir: path.relative(projectRoot, outputDir),
    sampleHz: config.sampleHz,
    scenarios: config.scenarios,
};

for (const candidate of candidates) {
    const controllerConfig = {
        ...baseConfig,
        ...candidate.patch,
    };
    const results = config.scenarios.map((scenarioId) => {
        const scenario = scenarios[scenarioId];

        if (!scenario) throw new Error(`Unknown scenario "${scenarioId}"`);

        const samples = simulateScenario(scenario, controllerConfig);
        const score = scoreScenario(scenarioId, scenario, samples, controllerConfig);

        return {
            metrics: score.metrics,
            pass: score.pass,
            scenario: scenarioId,
            totalScore: score.totalScore,
        };
    });
    const totalScore = average(results.map((result) => result.totalScore));

    report.candidates.push({
        config: controllerConfig,
        id: candidate.id,
        patch: candidate.patch,
        results,
        totalScore: Number(totalScore.toFixed(1)),
    });
}

report.candidates.sort((left, right) => right.totalScore - left.totalScore);

const reportPath = path.join(outputDir, `handling-sim-${runId}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Handling simulation candidates: ${report.candidates.length}`);
console.log(`Handling simulation report wrote ${path.relative(projectRoot, reportPath)}`);
console.log('Handling simulation ranking:');
for (const candidate of report.candidates) {
    console.log(`- ${candidate.id}: ${candidate.totalScore}`);
}

function simulateScenario(scenario, controllerConfig) {
    const samples = [];
    const player = createDefaultPlayerVehicleState(
        scenario.initialSpeed ?? 440,
        controllerConfig.engineProfile,
        controllerConfig.accelSpeed,
    );
    const dt = 1 / config.sampleHz;
    const steps = Math.round(scenario.durationSec * config.sampleHz);

    for (let step = 0; step <= steps; step += 1) {
        const t = step * dt;
        const input = scenario.getInput(t);
        const road = scenario.getRoad(t);

        updatePlayerVehicle(
            player,
            input,
            road,
            controllerConfig,
            dt,
        );

        samples.push({
            currentCurve: road.currentCurve,
            inputSteerAxis: input.steerAxis,
            lateralOffset: player.lateralOffset,
            rpm: player.rpm,
            speed: player.speed,
            steering: player.steering,
            steeringVelocity: player.steeringVelocity,
            t,
        });
    }

    return samples;
}

function scoreScenario(scenarioId, scenario, samples, controllerConfig) {
    const metrics = collectMetrics(samples, controllerConfig, scenario);
    const checks = [
        checkAtMost('offsetClampHitCount', metrics.offsetClampHitCount, 0, 2, 16),
        checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 620, 700, 14),
        checkAtMost('speedDropFromPeak', metrics.speedDropFromPeak, 140, 230, 12),
    ];

    if (scenarioId === 'straight-accel-20s') {
        checks.push(checkAtLeast('speedGain', metrics.speedGain, 300, 180, 24));
        checks.push(checkAtMost('straightDrift.maxAbs', metrics.lateralOffsetMaxAbs, 70, 160, 18));
    }

    if (scenarioId === 'standing-start-12s') {
        checks.push(checkAtLeast('timeTo100Kmh', metrics.timeTo100Kmh, 4.5, 3.2, 12));
        checks.push(checkAtMost('timeTo100Kmh', metrics.timeTo100Kmh, 7.5, 9, 14));
        checks.push(checkAtLeast('speedGain', metrics.speedGain, 250, 170, 14));
        checks.push(checkAtMost('standingStartDrift.maxAbs', metrics.lateralOffsetMaxAbs, 40, 100, 10));
    }

    if (scenarioId === 'left-hold-3s-release') {
        checks.push(checkAtMost('steerHoldOffset.maxAbs', metrics.lateralOffsetMaxAbs, 240, 340, 14));
        checks.push(checkAtLeast('steeringMaxAbs', metrics.steeringMaxAbs, 0.7, 0.5, 8));
        checks.push(checkAtMost('steeringResponseMs', metrics.steeringResponseMs, 250, 650, 18));
        checks.push(checkAtMost('steeringRecoveryMs', metrics.steeringRecoveryMs, 500, 1100, 18));
        checks.push(checkAtMost('timeToLateralOffset200', metrics.timeToLateralOffset200, 2200, 3400, 8));
    }

    if (scenarioId === 'curve-no-input') {
        checks.push(checkAtMost('curveNoInputDriftMax', metrics.lateralOffsetMaxAbs, 55, 110, 28));
        checks.push(checkAtLeast('curveSpeedGain', metrics.speedGain, 230, 160, 14));
    }

    if (scenarioId === 'micro-tap-left') {
        checks.push(checkAtMost('microTapOffset.maxAbs', metrics.lateralOffsetMaxAbs, 28, 70, 22));
        checks.push(checkAtMost('postReleaseOffsetHalfLife', metrics.postReleaseOffsetHalfLifeMs, 900, 1500, 10));
        checks.push(checkAtLeast('steeringMaxAbs', metrics.steeringMaxAbs, 0.16, 0.08, 10));
    }

    if (scenarioId === 'hold-left-1s-release') {
        checks.push(checkAtMost('hold1Offset.maxAbs', metrics.lateralOffsetMaxAbs, 115, 190, 18));
        checks.push(checkAtMost('postReleaseOffsetOvershoot', metrics.postReleaseOffsetOvershoot, 25, 70, 12));
        checks.push(checkAtMost('postReleaseOffsetHalfLife', metrics.postReleaseOffsetHalfLifeMs, 1100, 1800, 10));
    }

    if (scenarioId === 'slalom-20s') {
        checks.push(checkAtMost('slalomOffsetRms', metrics.slalomOffsetRms, 210, 300, 18));
        checks.push(checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 360, 520, 16));
        checks.push(checkAtLeast('steeringPeakHoldRatio', metrics.steeringPeakHoldRatio, 0.55, 0.35, 8));
    }

    if (scenarioId === 'curve-counter-steer') {
        checks.push(checkAtMost('curveCounterSteerRecoveryMs', metrics.curveCounterSteerRecoveryMs, 1500, 2600, 20));
        checks.push(checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 220, 360, 16));
    }

    const penalty = checks.reduce((total, check) => total + check.penalty, 0);

    return {
        checks,
        metrics,
        pass: checks.every((check) => check.status !== 'fail'),
        totalScore: Math.max(0, Math.round(100 - penalty)),
    };
}

function collectMetrics(samples, controllerConfig, scenario) {
    const speeds = samples.map((sample) => sample.speed);
    const offsets = samples.map((sample) => sample.lateralOffset);
    const steering = samples.map((sample) => sample.steering);
    const speedMax = Math.max(...speeds);
    const speedFirst = speeds[0];
    const speedLast = speeds[speeds.length - 1];

    return {
        lateralOffsetMaxAbs: round(Math.max(...offsets.map((value) => Math.abs(value)))),
        lateralOffsetRms: round(Math.sqrt(
            offsets.reduce((total, value) => total + value * value, 0) / offsets.length,
        )),
        offsetClampHitCount: offsets.filter((value) => Math.abs(value) >= controllerConfig.maxRoadOffset - 10).length,
        speedDropFromPeak: round(speedMax - speedLast),
        speedGain: round(speedLast - speedFirst),
        speedMax: round(speedMax),
        speedMin: round(Math.min(...speeds)),
        highSpeedSteeringMaxAbs: measureHighSpeedSteeringMaxAbs(samples, controllerConfig),
        highSpeedCurveSteeringMaxAbs: measureHighSpeedSteeringMaxAbs(
            samples,
            controllerConfig,
            (sample) => Math.abs(sample.currentCurve) > 0.1,
        ),
        steeringMaxAbs: round(Math.max(...steering.map((value) => Math.abs(value)))),
        curveCounterSteerRecoveryMs: measureCurveCounterSteerRecoveryMs(samples, scenario),
        postReleaseOffsetHalfLifeMs: measurePostReleaseOffsetHalfLifeMs(samples, scenario),
        postReleaseOffsetOvershoot: measurePostReleaseOffsetOvershoot(samples, scenario),
        slalomOffsetRms: measureSlalomOffsetRms(samples),
        steeringPeakHoldRatio: measureSteeringPeakHoldRatio(samples),
        steeringRecoveryMs: measureSteeringRecoveryMs(samples),
        steeringResponseMs: measureSteeringResponseMs(samples),
        timeToLateralOffset100: measureTimeToLateralOffset(samples, scenario, 100),
        timeToLateralOffset200: measureTimeToLateralOffset(samples, scenario, 200),
        timeTo100Kmh: measureTimeToKmh(samples, controllerConfig, 100),
    };
}

function measureSteeringResponseMs(samples) {
    const startSec = 2;
    const sample = samples.find((entry) => entry.t >= startSec && Math.abs(entry.steering) >= 0.25);

    return sample ? Math.round((sample.t - startSec) * 1000) : null;
}

function measureSteeringRecoveryMs(samples) {
    const releaseSec = 5;
    const sample = samples.find((entry) => entry.t >= releaseSec && Math.abs(entry.steering) <= 0.12);

    return sample ? Math.round((sample.t - releaseSec) * 1000) : null;
}

function measureTimeToKmh(samples, controllerConfig, targetKmh) {
    const targetRatio = targetKmh / controllerConfig.engineProfile.displayTopSpeedKmh;
    const smoothTargetRatio = targetRatio <= 0
        ? 0
        : targetRatio >= 1
            ? 1
            : 0.5 - Math.sin(Math.asin(1 - 2 * targetRatio) / 3);
    const targetSpeed = smoothTargetRatio * controllerConfig.accelSpeed;
    const sample = samples.find((entry) => entry.speed >= targetSpeed);

    return sample ? round(sample.t) : null;
}

function measureHighSpeedSteeringMaxAbs(samples, controllerConfig, predicate = () => true) {
    const highSpeedSamples = samples.filter((entry) => (
        entry.speed / controllerConfig.accelSpeed >= 0.78
        && predicate(entry)
    ));

    if (highSpeedSamples.length === 0) return null;

    return round(Math.max(...highSpeedSamples.map((entry) => Math.abs(entry.steering))));
}

function measureTimeToLateralOffset(samples, scenario, targetOffset) {
    const startSec = scenario.startSec ?? 0;
    const sample = samples.find((entry) => (
        entry.t >= startSec
        && Math.abs(entry.lateralOffset) >= targetOffset
    ));

    return sample ? Math.round((sample.t - startSec) * 1000) : null;
}

function measurePostReleaseOffsetHalfLifeMs(samples, scenario) {
    if (typeof scenario.releaseSec !== 'number') return null;

    const releaseSample = findSampleAtOrAfter(samples, scenario.releaseSec);
    if (!releaseSample) return null;

    const releaseOffset = Math.abs(releaseSample.lateralOffset);
    if (releaseOffset <= 1) return 0;

    const targetOffset = releaseOffset * 0.5;
    const sample = samples.find((entry) => (
        entry.t >= scenario.releaseSec
        && Math.abs(entry.lateralOffset) <= targetOffset
    ));

    return sample ? Math.round((sample.t - scenario.releaseSec) * 1000) : null;
}

function measurePostReleaseOffsetOvershoot(samples, scenario) {
    if (typeof scenario.releaseSec !== 'number') return null;

    const releaseSample = findSampleAtOrAfter(samples, scenario.releaseSec);
    if (!releaseSample) return null;

    const releaseSign = Math.sign(releaseSample.lateralOffset);
    if (releaseSign === 0) return 0;

    const overshoots = samples
        .filter((entry) => entry.t >= scenario.releaseSec)
        .map((entry) => entry.lateralOffset * -releaseSign)
        .filter((value) => value > 0);

    return overshoots.length > 0 ? round(Math.max(...overshoots)) : 0;
}

function measureSlalomOffsetRms(samples) {
    const activeSamples = samples.filter((entry) => entry.t >= 2);
    const offsets = activeSamples.length > 0 ? activeSamples : samples;

    return round(Math.sqrt(
        offsets.reduce((total, entry) => total + entry.lateralOffset * entry.lateralOffset, 0)
        / offsets.length,
    ));
}

function measureSteeringPeakHoldRatio(samples) {
    const activeSamples = samples.filter((entry) => Math.abs(entry.inputSteerAxis) > 0);
    if (activeSamples.length === 0) return null;

    const peakSamples = activeSamples.filter((entry) => Math.abs(entry.steering) >= 0.55);

    return round(peakSamples.length / activeSamples.length);
}

function measureCurveCounterSteerRecoveryMs(samples, scenario) {
    if (typeof scenario.counterSteerStartSec !== 'number') return null;

    const startSample = findSampleAtOrAfter(samples, scenario.counterSteerStartSec);
    if (!startSample) return null;

    const startOffset = Math.abs(startSample.lateralOffset);
    if (startOffset <= 1) return 0;

    const targetOffset = Math.max(40, startOffset * 0.82);
    const sample = samples.find((entry) => (
        entry.t >= scenario.counterSteerStartSec
        && Math.abs(entry.lateralOffset) <= targetOffset
    ));

    return sample ? Math.round((sample.t - scenario.counterSteerStartSec) * 1000) : null;
}

function findSampleAtOrAfter(samples, sec) {
    return samples.find((entry) => entry.t >= sec);
}

function checkAtMost(id, value, target, failAt, weight) {
    if (value === null) return { id, penalty: weight, status: 'missing', target, value };
    if (value <= target) return { id, penalty: 0, status: 'pass', target, value };

    const ratio = Math.min(1, (value - target) / (failAt - target));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
    };
}

function checkAtLeast(id, value, target, failAt, weight) {
    if (value === null) return { id, penalty: weight, status: 'missing', target, value };
    if (value >= target) return { id, penalty: 0, status: 'pass', target, value };

    const ratio = Math.min(1, (target - value) / (target - failAt));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
    };
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function parsePositiveNumber(option, value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${option} must be a positive number`);
    }

    return parsed;
}

function resolveProjectPath(rawPath) {
    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}

function round(value) {
    return Number(value.toFixed(3));
}
