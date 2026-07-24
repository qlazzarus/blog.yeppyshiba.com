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
const LONGITUDINAL_SCALE = 2;
const PAVED_CENTER_LIMIT = 580;
const RAIL_CENTER_LIMIT = 700;
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/world-line-cornering',
);
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: RAIL_CENTER_LIMIT,
});

const previewOnly = runScenario({
    curveAt: () => 0,
    durationSec: 1,
    id: 'preview-only-neutral',
    inputAt: () => neutralInput(),
    maintainSpeed: true,
    previewAt: () => 0.66,
    speedKmh: 185,
});
const neutralRight = runScenario({
    curveAt: () => 0.62,
    durationSec: 3,
    id: 'sharp-right-neutral',
    inputAt: () => neutralInput(),
    maintainSpeed: true,
    previewAt: () => 0.62,
    speedKmh: 185,
});
const neutralLeft = runScenario({
    curveAt: () => -0.62,
    durationSec: 3,
    id: 'sharp-left-neutral',
    inputAt: () => neutralInput(),
    maintainSpeed: true,
    previewAt: () => -0.62,
    speedKmh: 185,
});
const preparedGrip = runScenario({
    curveAt: (t) => t < 0.65 ? 0 : 0.62,
    durationSec: 3.65,
    id: 'sharp-right-prepared-grip',
    inputAt: (t, player, curve) => {
        if (t < 0.5) {
            return { accelPressed: false, brakePressed: true, steerAxis: 0 };
        }
        if (t < 0.65) {
            return { accelPressed: false, brakePressed: false, steerAxis: 0 };
        }
        return {
            accelPressed: true,
            brakePressed: false,
            steerAxis: clamp(
                curve * 1.5 - player.vehicleHeadingError * 1.8,
                -1,
                1,
            ),
        };
    },
    maintainSpeed: false,
    previewAt: () => 0.62,
    speedKmh: 185,
});
const severeOverspeed = runScenario({
    curveAt: () => 0.62,
    durationSec: 1.5,
    id: 'sharp-right-severe-overspeed',
    initialOffset: -300,
    inputAt: () => neutralInput(),
    maintainSpeed: false,
    previewAt: () => 0.62,
    speedKmh: 200,
});

const checks = [
    check(
        'preview-does-not-move-player-physics',
        previewOnly.maxAbsHeading <= 0.0001 &&
            previewOnly.maxAbsInertia <= 0.001 &&
            previewOnly.maxAbsOffset <= 0.001,
        summarize(previewOnly),
    ),
    check(
        'neutral-wheel-has-zero-road-follow-authority',
        neutralRight.maxGripFollowAuthority === 0 &&
            neutralLeft.maxGripFollowAuthority === 0,
        {
            left: neutralLeft.maxGripFollowAuthority,
            right: neutralRight.maxGripFollowAuthority,
        },
    ),
    check(
        'neutral-world-line-exits-opposite-curve-direction',
        neutralRight.minOffset <= -PAVED_CENTER_LIMIT &&
            neutralLeft.maxOffset >= PAVED_CENTER_LIMIT,
        {
            leftCornerOffset: neutralLeft.finalOffset,
            rightCornerOffset: neutralRight.finalOffset,
        },
    ),
    check(
        'left-right-world-line-is-symmetric',
        Math.abs(neutralRight.finalOffset + neutralLeft.finalOffset) <= 0.5 &&
            Math.abs(neutralRight.finalHeading + neutralLeft.finalHeading) <= 0.001,
        {
            left: summarize(neutralLeft),
            right: summarize(neutralRight),
        },
    ),
    check(
        'lateral-motion-is-heading-projection',
        Math.max(
            neutralRight.maxProjectionError,
            neutralLeft.maxProjectionError,
            preparedGrip.maxProjectionError,
        ) <= 0.001,
        {
            leftError: neutralLeft.maxProjectionError,
            preparedError: preparedGrip.maxProjectionError,
            rightError: neutralRight.maxProjectionError,
        },
    ),
    check(
        'prepared-grip-beats-neutral-without-rail',
        preparedGrip.maxAbsOffset < PAVED_CENTER_LIMIT &&
            preparedGrip.maxGripFollowAuthority >= 0.85 &&
            preparedGrip.maxAbsOffset <= neutralRight.maxAbsOffset * 0.8,
        {
            neutral: summarize(neutralRight),
            prepared: summarize(preparedGrip),
        },
    ),
    check(
        'automatic-tire-loss-stays-below-brake-budget',
        severeOverspeed.maxCornerLossForce <= config.braking * 0.2 + 0.001 &&
            severeOverspeed.maxCornerLossForce < config.braking,
        {
            fullBrakeForce: config.braking,
            maxAutomaticCornerLossForce: severeOverspeed.maxCornerLossForce,
        },
    ),
];
const report = {
    checks,
    config: {
        frameSeconds: FRAME_SECONDS,
        fullBrakeForce: config.braking,
        gripTireLossBudget: config.braking * 0.2,
        longitudinalScale: LONGITUDINAL_SCALE,
        pavedCenterLimit: PAVED_CENTER_LIMIT,
        railCenterLimit: RAIL_CENTER_LIMIT,
    },
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    purpose: 'HR-3H neutral world-line, contact-point yaw, steering grip, and tire-loss contract',
    scenarios: [
        previewOnly,
        neutralRight,
        neutralLeft,
        preparedGrip,
        severeOverspeed,
    ],
    schemaVersion: 1,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
    path.join(OUTPUT_DIR, 'world-line-cornering-contract.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(OUTPUT_DIR, 'world-line-cornering-contract.md'),
    buildMarkdown(report),
);

console.log(`HR-3H world-line cornering: ${report.pass ? 'PASS' : 'FAIL'}`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${checks.filter((entry) => entry.pass).length}/${checks.length} PASS`);
if (!report.pass) process.exitCode = 1;

function runScenario({
    curveAt,
    durationSec,
    id,
    initialOffset = 0,
    inputAt,
    maintainSpeed,
    previewAt,
    speedKmh,
}) {
    const initialSpeed = rawSpeedForDisplayKmh(speedKmh);
    const player = createDefaultPlayerVehicleState(
        initialSpeed,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.lateralOffset = initialOffset;
    const frames = Math.round(durationSec / FRAME_SECONDS);
    let maxAbsHeading = 0;
    let maxAbsInertia = 0;
    let maxAbsOffset = Math.abs(initialOffset);
    let maxCornerLossForce = 0;
    let maxGripFollowAuthority = 0;
    let maxOffset = initialOffset;
    let maxProjectionError = 0;
    let minOffset = initialOffset;

    for (let frame = 0; frame < frames; frame += 1) {
        const t = frame * FRAME_SECONDS;
        const curve = curveAt(t);
        if (maintainSpeed) player.speed = initialSpeed;
        const input = inputAt(t, player, curve);

        updatePlayerVehicle(
            player,
            input,
            {
                currentCurve: curve,
                longitudinalScale: LONGITUDINAL_SCALE,
                previewRoadCurve: previewAt(t),
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );

        const expectedProjection = Math.sin(clamp(
            player.vehicleHeadingError,
            -1.2,
            1.2,
        )) * player.speed * LONGITUDINAL_SCALE;
        maxProjectionError = Math.max(
            maxProjectionError,
            Math.abs(player.cornerInertiaLateralVelocity - expectedProjection),
        );
        maxAbsHeading = Math.max(maxAbsHeading, Math.abs(player.vehicleHeadingError));
        maxAbsInertia = Math.max(maxAbsInertia, Math.abs(player.cornerInertiaLateralVelocity));
        maxAbsOffset = Math.max(maxAbsOffset, Math.abs(player.lateralOffset));
        maxCornerLossForce = Math.max(
            maxCornerLossForce,
            player.cornerSpeedLoss.totalForce,
        );
        maxGripFollowAuthority = Math.max(
            maxGripFollowAuthority,
            player.gripFollowAuthority,
        );
        maxOffset = Math.max(maxOffset, player.lateralOffset);
        minOffset = Math.min(minOffset, player.lateralOffset);
    }

    return {
        endSpeedKmh: round(getDisplaySpeedKmh(
            player.speed,
            config.accelSpeed,
            RAVEN_COUPE_ENGINE_PROFILE,
        )),
        finalHeading: round(player.vehicleHeadingError),
        finalOffset: round(player.lateralOffset),
        id,
        maxAbsHeading: round(maxAbsHeading),
        maxAbsInertia: round(maxAbsInertia),
        maxAbsOffset: round(maxAbsOffset),
        maxCornerLossForce: round(maxCornerLossForce),
        maxGripFollowAuthority: round(maxGripFollowAuthority),
        maxOffset: round(maxOffset),
        maxProjectionError: round(maxProjectionError),
        minOffset: round(minOffset),
        speedKmh,
    };
}

function neutralInput() {
    return { accelPressed: true, brakePressed: false, steerAxis: 0 };
}

function rawSpeedForDisplayKmh(speedKmh) {
    return config.accelSpeed * speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
}

function summarize(scenario) {
    return {
        endSpeedKmh: scenario.endSpeedKmh,
        finalHeading: scenario.finalHeading,
        finalOffset: scenario.finalOffset,
        maxAbsHeading: scenario.maxAbsHeading,
        maxAbsOffset: scenario.maxAbsOffset,
        maxGripFollowAuthority: scenario.maxGripFollowAuthority,
    };
}

function buildMarkdown(value) {
    const checkRows = value.checks.map((entry) => (
        `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | \`${JSON.stringify(entry.evidence)}\` |`
    ));
    return [
        '# Apex Seoul HR-3H World-line Cornering Contract',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...checkRows,
    ].join('\n') + '\n';
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
