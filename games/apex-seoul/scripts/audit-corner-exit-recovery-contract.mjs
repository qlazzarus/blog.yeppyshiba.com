import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GUARDRAIL_COLLISION_CONFIG,
    applyGuardrailCollision,
} from '../src/game/guardrailCollision.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/corner-exit-recovery',
);
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: 800,
});
const fixtures = [
    {
        correctionDuration: 0.9,
        curveEnd: 0.04,
        curveStart: 0.43,
        heading: -0.34,
        id: 'runtime-progress-008',
        inertia: -239.7,
        offset: -273.8,
        previewEnd: 0.039,
        previewStart: 0.4,
        speedKmh: 144,
        steerDirection: 1,
    },
    {
        correctionDuration: 1.1,
        curveEnd: -0.134,
        curveStart: -0.603,
        heading: 0.375,
        id: 'runtime-progress-020',
        inertia: 306.6,
        offset: 215.4,
        previewEnd: -0.1,
        previewStart: -0.56,
        speedKmh: 170,
        steerDirection: -1,
    },
    {
        correctionDuration: 1,
        curveEnd: 0.1,
        curveStart: 0.604,
        heading: -0.312,
        id: 'runtime-progress-030',
        inertia: -282.7,
        offset: -49.7,
        previewEnd: 0.1,
        previewStart: 0.55,
        speedKmh: 180,
        steerDirection: 1,
    },
];

const replays = fixtures.map((fixture) => ({
    correction: runFork(fixture, fixture.correctionDuration),
    fixture: fixture.id,
    neutral: runFork(fixture, 0),
    shortCorrection: runFork(fixture, Math.min(0.45, fixture.correctionDuration)),
}));
const frontImpact = runFrontImpactFixture();
const checks = [
    check(
        'neutral-forks-keep-moving-outward',
        replays.every(({ neutral }) => (
            neutral.outwardOffsetDelta >= 40 &&
            neutral.finalOutwardHeading > 0
        )),
        replays.map(({ fixture, neutral }) => ({
            finalOutwardHeading: neutral.finalOutwardHeading,
            fixture,
            outwardOffsetDelta: neutral.outwardOffsetDelta,
        })),
    ),
    check(
        'recorded-corrections-do-not-build-large-opposite-heading',
        replays.every(({ correction }) => correction.maxOppositeHeading <= 0.065),
        replays.map(({ correction, fixture }) => ({
            fixture,
            maxOppositeHeading: correction.maxOppositeHeading,
        })),
    ),
    check(
        'recorded-corrections-do-not-launch-opposite-inertia',
        replays.every(({ correction }) => correction.maxOppositeInertia <= 65),
        replays.map(({ correction, fixture }) => ({
            fixture,
            maxOppositeInertia: correction.maxOppositeInertia,
        })),
    ),
    check(
        'short-correction-reduces-debt-without-opposite-launch',
        replays.every(({ neutral, shortCorrection }) => (
            shortCorrection.finalAbsHeading < Math.abs(neutral.finalHeading) &&
            shortCorrection.maxOppositeHeading <= 0.02 &&
            shortCorrection.maxOppositeInertia <= 20
        )),
        replays.map(({ fixture, neutral, shortCorrection }) => ({
            finalAbsHeading: shortCorrection.finalAbsHeading,
            fixture,
            initialAbsHeading: shortCorrection.initialAbsHeading,
            maxOppositeHeading: shortCorrection.maxOppositeHeading,
            maxOppositeInertia: shortCorrection.maxOppositeInertia,
            neutralFinalAbsHeading: round(Math.abs(neutral.finalHeading)),
        })),
    ),
    check(
        'overspeed-direct-lateral-launch-is-removed',
        replays.every(({ correction, shortCorrection }) => (
            correction.maxAbsOverspeedLateralVelocity <= 0.001 &&
            shortCorrection.maxAbsOverspeedLateralVelocity <= 0.001
        )),
        replays.map(({ correction, fixture, shortCorrection }) => ({
            correctionPeak: correction.maxAbsOverspeedLateralVelocity,
            fixture,
            shortPeak: shortCorrection.maxAbsOverspeedLateralVelocity,
        })),
    ),
    check(
        'front-corner-can-hit-before-center-reaches-side-rail',
        frontImpact.guardrailImpactCount === 1 &&
            frontImpact.guardrailContactDirection === 1 &&
            frontImpact.lateralOffset < frontImpact.railCenterLimit &&
            frontImpact.vehicleHeadingError < frontImpact.initialHeading,
        frontImpact,
    ),
];
const report = {
    checks,
    fixtures,
    frontImpact,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    purpose: 'HR-3G corner-exit debt cancellation and front swept rail contact contract',
    replays,
    schemaVersion: 1,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
    path.join(OUTPUT_DIR, 'corner-exit-recovery-contract.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(OUTPUT_DIR, 'corner-exit-recovery-contract.md'),
    buildMarkdown(report),
);

console.log(`HR-3G corner exit recovery: ${report.pass ? 'PASS' : 'FAIL'}`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${checks.filter((entry) => entry.pass).length}/${checks.length} PASS`);

if (!report.pass) process.exitCode = 1;

function runFork(fixture, steerDuration) {
    const speed = config.accelSpeed * fixture.speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.speed = speed;
    player.vehicleHeadingError = fixture.heading;
    player.cornerInertiaLateralVelocity = fixture.inertia;
    player.lateralOffset = fixture.offset;
    const totalDuration = fixture.correctionDuration + 0.5;
    const frames = Math.ceil(totalDuration / FRAME_SECONDS);
    let maxAbsOverspeedLateralVelocity = 0;
    let maxOppositeHeading = 0;
    let maxOppositeInertia = 0;

    for (let frame = 0; frame < frames; frame += 1) {
        const elapsedSec = frame * FRAME_SECONDS;
        const curveProgress = clamp(
            elapsedSec / fixture.correctionDuration,
            0,
            1,
        );
        const currentCurve = lerp(fixture.curveStart, fixture.curveEnd, curveProgress);
        const previewRoadCurve = lerp(
            fixture.previewStart,
            fixture.previewEnd,
            curveProgress,
        );
        const steerAxis = elapsedSec < steerDuration
            ? fixture.steerDirection
            : 0;

        player.speed = speed;
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis,
            },
            {
                currentCurve,
                longitudinalScale: 2,
                previewRoadCurve,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
        maxAbsOverspeedLateralVelocity = Math.max(
            maxAbsOverspeedLateralVelocity,
            Math.abs(player.overspeedUndersteerLateralVelocity),
        );
        maxOppositeHeading = Math.max(
            maxOppositeHeading,
            fixture.steerDirection * player.vehicleHeadingError,
        );
        maxOppositeInertia = Math.max(
            maxOppositeInertia,
            fixture.steerDirection * player.cornerInertiaLateralVelocity,
        );
    }

    return {
        finalAbsHeading: round(Math.abs(player.vehicleHeadingError)),
        finalHeading: round(player.vehicleHeadingError),
        finalInertia: round(player.cornerInertiaLateralVelocity),
        finalOffset: round(player.lateralOffset),
        finalOutwardHeading: round(
            -fixture.steerDirection * player.vehicleHeadingError,
        ),
        initialAbsHeading: round(Math.abs(fixture.heading)),
        maxAbsOverspeedLateralVelocity: round(maxAbsOverspeedLateralVelocity),
        maxOppositeHeading: round(Math.max(0, maxOppositeHeading)),
        maxOppositeInertia: round(Math.max(0, maxOppositeInertia)),
        outwardOffsetDelta: round(
            -fixture.steerDirection * (player.lateralOffset - fixture.offset),
        ),
        steerDuration,
    };
}

function runFrontImpactFixture() {
    const player = createDefaultPlayerVehicleState(
        560,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.speed = 560;
    player.lateralOffset = 600;
    player.vehicleHeadingError = 0.55;
    player.cornerInertiaLateralVelocity = 180;
    const context = {
        frontRoad: {
            distance: GUARDRAIL_COLLISION_CONFIG.physicalVehicleFrontLength,
            pavedHalfWidth: 820,
            railContactLimit: 1_040,
        },
        pavedHalfWidth: 820,
        railContactLimit: 1_040,
        vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    };

    applyGuardrailCollision(player, context, FRAME_SECONDS);

    return {
        guardrailContactDirection: player.guardrailContactDirection,
        guardrailImpactCount: player.guardrailImpactCount,
        initialHeading: 0.55,
        lateralOffset: round(player.lateralOffset),
        railCenterLimit: 800,
        vehicleHeadingError: round(player.vehicleHeadingError),
    };
}

function buildMarkdown(value) {
    return [
        '# Apex Seoul HR-3G Corner Exit Recovery Contract',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...value.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | ` +
            `\`${JSON.stringify(entry.evidence).replaceAll('|', '\\|')}\` |`
        )),
    ].join('\n') + '\n';
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function round(value) {
    return Number(value.toFixed(4));
}
