import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const DURATION_SECONDS = 3;
const PAVED_CENTER_LIMIT = 580;
const RAIL_CENTER_LIMIT = 700;
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/hr3-handling-matrix',
);
const CURVES = [
    { curve: 0.22, grade: 'easy' },
    { curve: 0.42, grade: 'medium' },
    { curve: 0.62, grade: 'sharp' },
];
const SPEEDS_KMH = [120, 160, 200];
const MODES = ['neutral', 'late-steer', 'prepared-grip', 'intentional-drift'];
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: RAIL_CENTER_LIMIT,
});

const scenarios = CURVES.flatMap(({ curve, grade }) =>
    SPEEDS_KMH.flatMap((speedKmh) =>
        MODES.map((mode) => runScenario({ curve, grade, mode, speedKmh })),
    ),
);

const easyLowNeutral = findScenario('easy', 120, 'neutral');
const sharpHighNeutral = findScenario('sharp', 200, 'neutral');
const sharpHighPrepared = findScenario('sharp', 200, 'prepared-grip');
const sharpHighDrift = findScenario('sharp', 200, 'intentional-drift');
const checks = [
    check(
        'easy-target-speed-neutral-avoids-shoulder',
        !easyLowNeutral.reachedShoulder && !easyLowNeutral.reachedRail,
        summarize(easyLowNeutral),
    ),
    check(
        'sharp-overspeed-neutral-threatens-edge',
        sharpHighNeutral.reachedShoulder || sharpHighNeutral.reachedRail,
        summarize(sharpHighNeutral),
    ),
    check(
        'prepared-grip-beats-sharp-neutral-line',
        sharpHighPrepared.maxAbsOffset <= sharpHighNeutral.maxAbsOffset * 0.8 &&
            !sharpHighPrepared.reachedRail,
        {
            neutral: summarize(sharpHighNeutral),
            prepared: summarize(sharpHighPrepared),
        },
    ),
    check(
        'intentional-drift-requires-entry-and-counter',
        sharpHighDrift.enteredDrift &&
            sharpHighDrift.counterInputFrames > 0 &&
            !sharpHighDrift.reachedRail,
        summarize(sharpHighDrift),
    ),
    check(
        'soft-slip-does-not-live-on-safety-clamp',
        scenarios.every((scenario) => scenario.headingSafetyResidencyRatio <= 0.02),
        {
            maxResidencyRatio: round(Math.max(
                ...scenarios.map((scenario) => scenario.headingSafetyResidencyRatio),
            )),
        },
    ),
    check(
        'neutral-position-centering-remains-disabled',
        scenarios
            .filter((scenario) => scenario.mode === 'neutral')
            .every((scenario) => scenario.maxAbsCenteringForce === 0),
        {
            maxNeutralCenteringForce: round(Math.max(
                ...scenarios
                    .filter((scenario) => scenario.mode === 'neutral')
                    .map((scenario) => scenario.maxAbsCenteringForce),
            )),
        },
    ),
];

const report = {
    checks,
    config: {
        curves: CURVES,
        durationSeconds: DURATION_SECONDS,
        frameSeconds: FRAME_SECONDS,
        pavedCenterLimit: PAVED_CENTER_LIMIT,
        railCenterLimit: RAIL_CENTER_LIMIT,
        speedsKmh: SPEEDS_KMH,
    },
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    purpose: 'HR-3E speed × curvature × driving-mode handling matrix',
    scenarios,
    schemaVersion: 1,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
    path.join(OUTPUT_DIR, 'hr3-handling-matrix.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(OUTPUT_DIR, 'hr3-handling-matrix.md'),
    buildMarkdown(report),
);

console.log(`HR-3E handling matrix: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`${checks.filter((entry) => entry.pass).length}/${checks.length} PASS`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}

if (!report.pass) process.exitCode = 1;

function runScenario({ curve, grade, mode, speedKmh }) {
    const initialSpeed = rawSpeedForDisplayKmh(speedKmh);
    const player = createDefaultPlayerVehicleState(
        initialSpeed,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    const frames = Math.round(DURATION_SECONDS / FRAME_SECONDS);
    let counterInputFrames = 0;
    let enteredDrift = false;
    let headingSafetyFrames = 0;
    let maxAbsCenteringForce = 0;
    let maxAbsHeading = 0;
    let maxAbsOffset = 0;
    let maxAbsResidualYawRate = 0;
    let maxGripFollowAuthority = 0;
    let minGripFollowAuthority = 1;

    for (let frame = 0; frame < frames; frame += 1) {
        const t = frame * FRAME_SECONDS;
        const input = getInput(mode, t, curve, player);

        updatePlayerVehicle(
            player,
            input,
            {
                currentCurve: curve,
                longitudinalScale: 2,
                previewRoadCurve: curve,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );

        counterInputFrames += Math.sign(input.steerAxis) === -Math.sign(curve) ? 1 : 0;
        enteredDrift ||= player.driftState === 'drift';
        headingSafetyFrames += Math.abs(player.vehicleHeadingError) >= 1.15 ? 1 : 0;
        maxAbsCenteringForce = Math.max(maxAbsCenteringForce, Math.abs(player.centeringForce));
        maxAbsHeading = Math.max(maxAbsHeading, Math.abs(player.vehicleHeadingError));
        maxAbsOffset = Math.max(maxAbsOffset, Math.abs(player.lateralOffset));
        maxAbsResidualYawRate = Math.max(
            maxAbsResidualYawRate,
            Math.abs(player.residualRoadYawRate),
        );
        maxGripFollowAuthority = Math.max(maxGripFollowAuthority, player.gripFollowAuthority);
        minGripFollowAuthority = Math.min(minGripFollowAuthority, player.gripFollowAuthority);
    }

    return {
        counterInputFrames,
        endSpeedKmh: round(getDisplaySpeedKmh(
            player.speed,
            config.accelSpeed,
            RAVEN_COUPE_ENGINE_PROFILE,
        )),
        enteredDrift,
        finalHeadingError: round(player.vehicleHeadingError),
        finalOffset: round(player.lateralOffset),
        grade,
        headingSafetyResidencyRatio: round(headingSafetyFrames / frames),
        maxAbsCenteringForce: round(maxAbsCenteringForce),
        maxAbsHeading: round(maxAbsHeading),
        maxAbsOffset: round(maxAbsOffset),
        maxAbsResidualYawRate: round(maxAbsResidualYawRate),
        maxGripFollowAuthority: round(maxGripFollowAuthority),
        minGripFollowAuthority: round(minGripFollowAuthority),
        mode,
        reachedRail: maxAbsOffset >= RAIL_CENTER_LIMIT - 0.5,
        reachedShoulder: maxAbsOffset >= PAVED_CENTER_LIMIT,
        speedKmh,
    };
}

function getInput(mode, t, curve, player) {
    const direction = Math.sign(curve);
    if (mode === 'neutral') {
        return { accelPressed: true, brakePressed: false, steerAxis: 0 };
    }
    if (mode === 'late-steer') {
        return {
            accelPressed: true,
            brakePressed: false,
            steerAxis: t < 0.9 ? 0 : direction * 0.45,
        };
    }
    if (mode === 'prepared-grip') {
        const targetHeading = direction * 0.12;
        return {
            accelPressed: t >= 0.35,
            brakePressed: false,
            steerAxis: clamp(
                (targetHeading - player.vehicleHeadingError) * 1.35,
                -0.58,
                0.58,
            ),
        };
    }
    if (t < 0.25) {
        return { accelPressed: true, brakePressed: false, steerAxis: direction * 0.45 };
    }
    if (t < 0.5) {
        return { accelPressed: false, brakePressed: false, steerAxis: direction * 0.78 };
    }
    if (t < 1.25) {
        return { accelPressed: true, brakePressed: false, steerAxis: direction * 0.4 };
    }
    if (t < 2.6) {
        return { accelPressed: true, brakePressed: false, steerAxis: -direction * 0.35 };
    }
    return { accelPressed: true, brakePressed: false, steerAxis: direction * 0.1 };
}

function findScenario(grade, speedKmh, mode) {
    const scenario = scenarios.find((entry) => (
        entry.grade === grade &&
        entry.speedKmh === speedKmh &&
        entry.mode === mode
    ));
    if (!scenario) throw new Error(`Missing ${grade}/${speedKmh}/${mode}`);
    return scenario;
}

function summarize(scenario) {
    return {
        endSpeedKmh: scenario.endSpeedKmh,
        enteredDrift: scenario.enteredDrift,
        maxAbsHeading: scenario.maxAbsHeading,
        maxAbsOffset: scenario.maxAbsOffset,
        reachedRail: scenario.reachedRail,
        reachedShoulder: scenario.reachedShoulder,
    };
}

function buildMarkdown(value) {
    const rows = value.scenarios.map((scenario) => (
        `| ${scenario.grade} | ${scenario.speedKmh} | ${scenario.mode} | ` +
        `${scenario.maxAbsOffset} | ${scenario.maxAbsHeading} | ` +
        `${scenario.minGripFollowAuthority}~${scenario.maxGripFollowAuthority} | ` +
        `${scenario.endSpeedKmh} | ${scenario.reachedShoulder ? 'yes' : 'no'} | ` +
        `${scenario.reachedRail ? 'yes' : 'no'} | ${scenario.enteredDrift ? 'yes' : 'no'} |`
    ));
    const checkRows = value.checks.map((entry) => (
        `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | \`${JSON.stringify(entry.evidence)}\` |`
    ));

    return [
        '# Apex Seoul HR-3E Handling Matrix',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '## Approval checks',
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...checkRows,
        '',
        '## Matrix',
        '',
        '| Grade | km/h | Mode | Max offset | Max heading | Grip follow | End km/h | Shoulder | Rail | Drift |',
        '| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
        ...rows,
        '',
    ].join('\n') + '\n';
}

function rawSpeedForDisplayKmh(speedKmh) {
    return config.accelSpeed * speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function round(value) {
    return Number(value.toFixed(4));
}
