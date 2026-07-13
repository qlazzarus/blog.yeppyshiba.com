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
    brakeReleaseResponse: 13,
    brakeResponse: 8,
    centeringResponse: 6,
    cornerAccelSpeedDrop: 140,
    cornerLineSpeedBonus: 70,
    cornerLineTargetOffset: 260,
    cornerSpeedPull: 160,
    curveDriftAcceleration: 160,
    curveSteeringHighSpeedDrop: 0.42,
    curveSteeringCue: 0.06,
    driftBuildRate: 2.8,
    driftDecayRate: 2.6,
    driftEntrySpeedLoss: 16,
    driftEntryLateralKick: 190,
    driftBreakawayDuration: 0.22,
    driftBrakeEntryPressure: 0.64,
    driftLiftEntrySpeedLoss: 22,
    driftCounterNeutralDuration: 0.08,
    driftLateralDamping: 1.9,
    driftLateralMaxSpeed: 230,
    driftCounterSteerLateralScale: 0.42,
    driftCounterSteerLateralSustainScale: 0.58,
    driftCounterSteerLateralVelocityCap: 52,
    driftCounterTrimDuration: 0.65,
    driftCounterTrimMaxRatio: 0.62,
    driftCounterTrimResponse: 7,
    driftCounterTrimReleaseResponse: 4,
    driftSustainAcceleration: 70,
    driftTransitionArmDuration: 0.12,
    driftTransitionInputWindow: 0.42,
    driftTransitionKick: 120,
    driftMaxSlipAngle: 10,
    driftMinCornerIntensity: 0.38,
    driftMinSpeedRatio: 0.55,
    driftMinSteerInput: 0.6,
    driftRecoveryRate: 2.3,
    engineAcceleration: 170,
    engineBrakeDeceleration: 26,
    engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
    highSpeedInputResponseDrop: 0.28,
    highSpeedLateralVelocityCap: 70,
    highSpeedSteeringSlewRate: 5.6,
    highSpeedSteerForceDrop: 0.54,
    highSpeedSteerVisualDrop: 0.43,
    gripSteerAngleHighSpeedCap: 0.72,
    gripSteerAngleHighSpeedStartRatio: 0.55,
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
    'counter-tap-release': {
        counterReleaseSec: 4.05,
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 4.05 && t >= 3.6 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-hold': {
        counterReleaseSec: 5.4,
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 5.4 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-long-hold': {
        counterReleaseSec: 6.6,
        counterStartSec: 3.6,
        // Measure only after the counter trim has had time to fully engage.
        counterSustainStartSec: 4.35,
        driftEntrySec: 2.5,
        durationSec: 8.2,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 6.6 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'explicit-recovery': {
        driftEntrySec: 2.5,
        recoveryStartSec: 3.7,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 3.7),
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.7 ? 1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-transition': {
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        transitionCommitSec: 4.2,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 3.6) || t >= 4.2,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t >= 3.72 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-lift-exit': {
        counterStartSec: 3.6,
        counterReleaseSec: 4.8,
        driftEntrySec: 2.5,
        recoveryStartSec: 4,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 4),
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 4.8 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'lift-drift-entry': {
        driftEntrySec: 3,
        durationSec: 8,
        getInput: (t) => ({
            accelPressed: t < 3 || t >= 5,
            brakePressed: false,
            steerAxis: t >= 2.5 && t < 5.6 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.5 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'brake-drift-entry-left': {
        driftEntrySec: 2.5,
        durationSec: 6,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 2.42 && t < 2.75,
            steerAxis: t >= 2.3 && t < 4.4 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.285,
            slopeAcceleration: 0,
        }),
    },
    'brake-drift-entry-right': {
        driftEntrySec: 2.5,
        durationSec: 6,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 2.42 && t < 2.75,
            steerAxis: t >= 2.3 && t < 4.4 ? 1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : -0.285,
            slopeAcceleration: 0,
        }),
    },
    'drift-counter-steer-recovery': {
        counterSteerStartSec: 4.5,
        driftEntrySec: 3,
        durationSec: 9,
        getInput: (t) => ({
            accelPressed: t < 3 || t >= 5.5,
            brakePressed: false,
            steerAxis: t < 4.5 ? (t >= 2.5 ? -1 : 0) : (t < 5.5 ? 1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.5 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-grip-angle-cap': {
        durationSec: 8,
        initialSpeed: 720,
        steerEndSec: 5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
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
        'lift-drift-entry',
        'brake-drift-entry-left',
        'brake-drift-entry-right',
        'drift-counter-steer-recovery',
        'high-speed-grip-angle-cap',
        'counter-tap-release',
        'counter-hold',
        'counter-long-hold',
        'counter-lift-exit',
        'explicit-recovery',
        'counter-transition',
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
            cornerLineQuality: player.cornerLineQuality,
            driftRatio: player.driftRatio,
            driftState: player.driftState,
            driftDirection: player.driftDirection,
            driftLateralVelocity: player.driftLateralVelocity,
            driftBaseLateralVelocity: player.driftBaseLateralVelocity,
            counterSteerTimer: player.counterSteerTimer,
            counterSteerLateralVelocity: player.counterSteerLateralVelocity,
            counterSteerEntryDriftVelocity: player.counterSteerEntryDriftVelocity,
            counterTrimRatio: player.counterTrimRatio,
            driftTransitionArmed: player.driftTransitionArmed,
            driftTransitionDirection: player.driftTransitionDirection,
            inputSteerAxis: input.steerAxis,
            lateralOffset: player.lateralOffset,
            rpm: player.rpm,
            speed: player.speed,
            slipAngle: player.slipAngle,
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
    ];

    // These scenarios deliberately use a lift to request recovery or a drift
    // transition; evaluate their state response rather than penalizing the
    // intended speed shed.
    if (!['explicit-recovery', 'counter-lift-exit', 'counter-transition'].includes(scenarioId)) {
        checks.push(checkAtMost('speedDropFromPeak', metrics.speedDropFromPeak, 140, 230, 12));
    }

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

    if (['lift-drift-entry', 'brake-drift-entry-left', 'brake-drift-entry-right'].includes(scenarioId)) {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 24));
        checks.push(checkAtMost('driftEntryMs', metrics.driftEntryMs, 450, 900, 16));
    }

    if (scenarioId === 'lift-drift-entry') {
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 30, 12, 16));
    }

    if (['brake-drift-entry-left', 'brake-drift-entry-right'].includes(scenarioId)) {
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 25, 10, 14));
    }

    if (scenarioId === 'drift-counter-steer-recovery') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 20));
        checks.push(checkAtMost('driftRecoveryMs', metrics.driftRecoveryMs, 700, 1300, 22));
    }

    if (scenarioId === 'high-speed-grip-angle-cap') {
        checks.push(checkAtLeast('gripSteeringMaxAbs', metrics.gripSteeringMaxAbs, 0.45, 0.35, 12));
        checks.push(checkAtMost('gripSteeringMaxAbs', metrics.gripSteeringMaxAbs, 0.62, 0.74, 18));
        checks.push(checkAtLeast('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 20, 8, 14));
        checks.push(checkAtMost('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 110, 180, 10));
    }

    if (scenarioId === 'counter-tap-release') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 16));
        checks.push(checkAtLeast('counterReleaseResumeRatio', metrics.counterReleaseResumeRatio, 0.65, 0.35, 24));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 20));
        checks.push(checkAtLeast('counterReleaseDriftHold', metrics.counterReleaseDriftHold, 1, 0, 16));
    }

    if (scenarioId === 'counter-hold') {
        checks.push(checkAtLeast('counterMomentumMinAbs', metrics.counterMomentumMinAbs, 35, 15, 18));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 22));
        checks.push(checkAtMost('counterHoldOffsetDelta.abs', Math.abs(metrics.counterHoldOffsetDelta), 120, 220, 14));
    }

    if (scenarioId === 'counter-long-hold') {
        checks.push(checkAtLeast('counterSustainedMomentumMinAbs', metrics.counterSustainedMomentumMinAbs, 25, 12, 22));
        checks.push(checkAtLeast('counterSustainedMomentumRatio', metrics.counterSustainedMomentumRatio, 0.2, 0.1, 16));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 18));
    }

    if (scenarioId === 'counter-lift-exit') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtMost('explicitRecoveryMs', metrics.explicitRecoveryMs, 800, 1400, 22));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 22));
    }

    if (scenarioId === 'explicit-recovery') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtMost('explicitRecoveryMs', metrics.explicitRecoveryMs, 800, 1500, 22));
    }

    if (scenarioId === 'counter-transition') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtLeast('transitionCommitted', metrics.transitionCommitted, 1, 0, 24));
        checks.push(checkAtMost('transitionCommitMs', metrics.transitionCommitMs, 700, 1300, 18));
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
    const driftRatios = samples.map((sample) => sample.driftRatio);
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
        gripCornerSpeedDrop: measureGripCornerSpeedDrop(samples, scenario),
        gripSteeringMaxAbs: measureGripSteeringMaxAbs(samples, scenario),
        steeringMaxAbs: round(Math.max(...steering.map((value) => Math.abs(value)))),
        curveCounterSteerRecoveryMs: measureCurveCounterSteerRecoveryMs(samples, scenario),
        counterDirectionChangeCount: measureCounterDirectionChangeCount(samples, scenario),
        counterHoldOffsetDelta: measureCounterHoldOffsetDelta(samples, scenario),
        counterMomentumMinAbs: measureCounterMomentumMinAbs(samples, scenario),
        counterSustainedMomentumMinAbs: measureCounterSustainedMomentumMinAbs(samples, scenario),
        counterSustainedMomentumRatio: measureCounterSustainedMomentumRatio(samples, scenario),
        counterReleaseDriftHold: measureCounterReleaseDriftHold(samples, scenario),
        counterReleaseResumeRatio: measureCounterReleaseResumeRatio(samples, scenario),
        driftEntryMs: measureDriftEntryMs(samples, scenario),
        driftEntrySpeedDrop: measureDriftEntrySpeedDrop(samples, scenario),
        driftRatioMax: round(Math.max(...driftRatios)),
        driftRecoveryMs: measureDriftRecoveryMs(samples, scenario),
        explicitRecoveryMs: measureExplicitRecoveryMs(samples, scenario),
        postReleaseOffsetHalfLifeMs: measurePostReleaseOffsetHalfLifeMs(samples, scenario),
        postReleaseOffsetOvershoot: measurePostReleaseOffsetOvershoot(samples, scenario),
        slalomOffsetRms: measureSlalomOffsetRms(samples),
        steeringPeakHoldRatio: measureSteeringPeakHoldRatio(samples),
        steeringRecoveryMs: measureSteeringRecoveryMs(samples),
        steeringResponseMs: measureSteeringResponseMs(samples),
        timeToLateralOffset100: measureTimeToLateralOffset(samples, scenario, 100),
        timeToLateralOffset200: measureTimeToLateralOffset(samples, scenario, 200),
        timeTo100Kmh: measureTimeToKmh(samples, controllerConfig, 100),
        transitionCommitMs: measureTransitionCommitMs(samples, scenario),
        transitionCommitted: measureTransitionCommitted(samples, scenario),
        transitionArmedMs: measureTransitionArmedMs(samples, scenario),
    };
}

function measureDriftEntryMs(samples, scenario) {
    if (typeof scenario.driftEntrySec !== 'number') return null;

    const sample = samples.find((entry) => entry.t >= scenario.driftEntrySec && entry.driftState === 'drift');

    return sample ? Math.round((sample.t - scenario.driftEntrySec) * 1000) : null;
}

function measureDriftEntrySpeedDrop(samples, scenario) {
    if (typeof scenario.driftEntrySec !== 'number') return null;

    const before = [...samples].reverse().find((entry) => entry.t < scenario.driftEntrySec);
    const entered = samples.find((entry) => (
        entry.t >= scenario.driftEntrySec && entry.driftState === 'drift'
    ));

    return before && entered ? round(before.speed - entered.speed) : null;
}

function measureGripSteeringMaxAbs(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return null;

    const active = samples.filter((entry) => (
        entry.t >= scenario.steerStartSec && entry.t <= scenario.steerEndSec && entry.driftState === 'grip'
    ));

    return active.length > 0 ? round(Math.max(...active.map((entry) => Math.abs(entry.steering)))) : null;
}

function measureGripCornerSpeedDrop(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return null;

    const start = findSampleAtOrAfter(samples, scenario.steerStartSec);
    const active = samples.filter((entry) => (
        entry.t >= scenario.steerStartSec && entry.t <= scenario.steerEndSec
    ));

    return start && active.length > 0 ? round(start.speed - Math.min(...active.map((entry) => entry.speed))) : null;
}

function measureDriftRecoveryMs(samples, scenario) {
    if (typeof scenario.counterSteerStartSec !== 'number') return null;

    const sample = samples.find((entry) => (
        entry.t >= scenario.counterSteerStartSec && entry.driftState === 'grip'
    ));

    return sample ? Math.round((sample.t - scenario.counterSteerStartSec) * 1000) : null;
}

function measureCounterDirectionChangeCount(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const endSec = scenario.counterReleaseSec ?? scenario.transitionCommitSec ?? scenario.durationSec;
    const active = samples.filter((entry) => (
        entry.t >= scenario.counterStartSec && entry.t <= endSec
    ));
    if (active.length === 0) return null;

    let changes = 0;
    let previous = active[0].driftDirection;

    for (const entry of active.slice(1)) {
        if (entry.driftDirection !== 0 && previous !== 0 && entry.driftDirection !== previous) {
            changes += 1;
        }
        previous = entry.driftDirection;
    }

    return changes;
}

function measureCounterHoldOffsetDelta(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const start = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const end = findSampleAtOrAfter(samples, scenario.counterReleaseSec ?? scenario.durationSec);

    return start && end ? round(end.lateralOffset - start.lateralOffset) : null;
}

function measureCounterMomentumMinAbs(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const endSec = scenario.counterReleaseSec ?? scenario.durationSec;
    const active = samples.filter((entry) => (
        entry.t >= scenario.counterStartSec && entry.t <= endSec
    ));
    if (active.length === 0) return null;

    return round(Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity))));
}

function getCounterSustainSamples(samples, scenario) {
    if (typeof scenario.counterSustainStartSec !== 'number') return [];

    const endSec = scenario.counterReleaseSec ?? scenario.durationSec;

    return samples.filter((entry) => (
        entry.t >= scenario.counterSustainStartSec && entry.t <= endSec
    ));
}

function measureCounterSustainedMomentumMinAbs(samples, scenario) {
    const active = getCounterSustainSamples(samples, scenario);

    return active.length > 0
        ? round(Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity))))
        : null;
}

function measureCounterSustainedMomentumRatio(samples, scenario) {
    const active = getCounterSustainSamples(samples, scenario);
    if (active.length === 0) return null;

    const baseVelocity = Math.max(1, Math.abs(active[0].driftBaseLateralVelocity));
    const minVelocity = Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity)));

    return round(minVelocity / baseVelocity);
}

function measureCounterReleaseDriftHold(samples, scenario) {
    if (typeof scenario.counterReleaseSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.counterReleaseSec + 0.3);

    return sample?.driftState === 'drift' ? 1 : 0;
}

function measureCounterReleaseResumeRatio(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number' || typeof scenario.counterReleaseSec !== 'number') {
        return null;
    }

    const start = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const resumed = findSampleAtOrAfter(samples, scenario.counterReleaseSec + 0.4);
    if (!start || !resumed) return null;

    const denominator = Math.max(1, Math.abs(start.driftBaseLateralVelocity));

    return round(Math.abs(resumed.driftLateralVelocity) / denominator);
}

function measureExplicitRecoveryMs(samples, scenario) {
    if (typeof scenario.recoveryStartSec !== 'number') return null;

    const sample = samples.find((entry) => (
        entry.t >= scenario.recoveryStartSec && entry.driftState === 'grip'
    ));

    return sample ? Math.round((sample.t - scenario.recoveryStartSec) * 1000) : null;
}

function measureTransitionCommitted(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number' || typeof scenario.transitionCommitSec !== 'number') {
        return null;
    }

    const initial = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const committed = samples.find((entry) => (
        entry.t >= scenario.transitionCommitSec &&
        entry.driftDirection !== 0 &&
        entry.driftDirection !== initial?.driftDirection
    ));

    return committed ? 1 : 0;
}

function measureTransitionCommitMs(samples, scenario) {
    if (typeof scenario.transitionCommitSec !== 'number') return null;

    const initial = findSampleAtOrAfter(samples, scenario.counterStartSec ?? 0);
    const committed = samples.find((entry) => (
        entry.t >= scenario.transitionCommitSec &&
        entry.driftDirection !== 0 &&
        entry.driftDirection !== initial?.driftDirection
    ));

    return committed ? Math.round((committed.t - scenario.transitionCommitSec) * 1000) : null;
}

function measureTransitionArmedMs(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const armed = samples.find((entry) => entry.driftTransitionArmed);

    return armed ? Math.round((armed.t - scenario.counterStartSec) * 1000) : null;
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
