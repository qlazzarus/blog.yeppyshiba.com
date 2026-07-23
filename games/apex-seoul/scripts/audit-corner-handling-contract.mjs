import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { HANDLING_TEST_CONFIG } from './handling-test-config.mjs';

const FRAME_SECONDS = 1 / 60;
const CORNER_CURVE = 0.58;
const ROAD_DIRECTION = Math.sign(CORNER_CURVE);
const HIGH_SPEED_KMH = 185;
const GRIP_SPEED_KMH = 130;
const LOW_SPEED_KMH = 110;
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/corner-handling',
);

const straightNoInput = runScenario({
    durationSec: 3,
    id: 'straight-no-input',
    inputAt: () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 }),
    maintainSpeed: true,
    speedKmh: HIGH_SPEED_KMH,
    curve: 0,
});
const lowSpeedNoInput = runScenario({
    durationSec: 3,
    id: 'corner-no-input-110',
    inputAt: () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 }),
    maintainSpeed: true,
    speedKmh: LOW_SPEED_KMH,
    curve: CORNER_CURVE,
});
const highSpeedNoInput = runScenario({
    durationSec: 3,
    id: 'corner-no-input-185',
    inputAt: () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 }),
    maintainSpeed: true,
    speedKmh: HIGH_SPEED_KMH,
    curve: CORNER_CURVE,
});
const highSpeedNoInputLeft = runScenario({
    durationSec: 3,
    id: 'corner-left-no-input-185',
    inputAt: () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 }),
    maintainSpeed: true,
    speedKmh: HIGH_SPEED_KMH,
    curve: -CORNER_CURVE,
});
const gripSpeedNoInput = runScenario({
    durationSec: 3,
    id: 'corner-no-input-130',
    inputAt: () => ({ accelPressed: true, brakePressed: false, steerAxis: 0 }),
    maintainSpeed: true,
    speedKmh: GRIP_SPEED_KMH,
    curve: CORNER_CURVE,
});
const grip = runScenario({
    durationSec: 3,
    id: 'corner-grip-130',
    inputAt: (elapsedSec) => ({
        accelPressed: true,
        brakePressed: false,
        steerAxis: elapsedSec < 0.18 ? 0.3 : elapsedSec < 2.45 ? 0.62 : 0.24,
    }),
    maintainSpeed: true,
    speedKmh: GRIP_SPEED_KMH,
    curve: CORNER_CURVE,
});
const drift = runScenario({
    durationSec: 3,
    id: 'corner-drift-185',
    inputAt: (elapsedSec) => {
        if (elapsedSec < 0.25) {
            return { accelPressed: true, brakePressed: false, steerAxis: 0.45 };
        }
        if (elapsedSec < 0.5) {
            return { accelPressed: false, brakePressed: false, steerAxis: 0.78 };
        }
        if (elapsedSec < 1.25) {
            return { accelPressed: true, brakePressed: false, steerAxis: 0.4 };
        }
        if (elapsedSec < 2.6) {
            return { accelPressed: true, brakePressed: false, steerAxis: -0.35 };
        }
        return { accelPressed: true, brakePressed: false, steerAxis: 0.1 };
    },
    maintainSpeed: true,
    speedKmh: HIGH_SPEED_KMH,
    curve: CORNER_CURVE,
});

const lowOutwardDistance = getOutwardDistance(lowSpeedNoInput.finalOffset);
const highOutwardDistance = getOutwardDistance(highSpeedNoInput.finalOffset);
const checks = [
    check(
        'straight-neutral-stays-stable',
        Math.abs(straightNoInput.finalOffset) <= 1,
        { finalOffset: straightNoInput.finalOffset },
    ),
    check(
        'corner-neutral-moves-outward',
        highOutwardDistance >= 120,
        { finalOffset: highSpeedNoInput.finalOffset, outwardDistance: highOutwardDistance },
    ),
    check(
        'corner-inertia-fixed-time-scales-superlinearly',
        highOutwardDistance >= lowOutwardDistance * 2.2,
        {
            highOutwardDistance,
            lowOutwardDistance,
            ratio: round(highOutwardDistance / Math.max(1, lowOutwardDistance)),
        },
    ),
    check(
        'corner-inertia-left-right-symmetric',
        Math.abs(highSpeedNoInput.finalOffset + highSpeedNoInputLeft.finalOffset) <= 0.5 &&
            Math.abs(
                highSpeedNoInput.finalInertiaSpeed +
                highSpeedNoInputLeft.finalInertiaSpeed,
            ) <= 0.5,
        {
            leftFinalInertiaSpeed: highSpeedNoInputLeft.finalInertiaSpeed,
            leftFinalOffset: highSpeedNoInputLeft.finalOffset,
            rightFinalInertiaSpeed: highSpeedNoInput.finalInertiaSpeed,
            rightFinalOffset: highSpeedNoInput.finalOffset,
        },
    ),
    check(
        'grip-steering-beats-neutral-line',
        grip.finalLineQuality >= 0.65 &&
            grip.finalLineQuality > gripSpeedNoInput.finalLineQuality,
        {
            gripLineQuality: grip.finalLineQuality,
            neutralLineQuality: gripSpeedNoInput.finalLineQuality,
        },
    ),
    check(
        'grip-remains-on-road',
        grip.maxAbsOffset < HANDLING_TEST_CONFIG.maxRoadOffset,
        { maxAbsOffset: grip.maxAbsOffset },
    ),
    check(
        'drift-is-a-real-cornering-state',
        drift.enteredDrift && drift.maxDriftRatio >= 0.38,
        { enteredDrift: drift.enteredDrift, maxDriftRatio: drift.maxDriftRatio },
    ),
    check(
        'drift-can-hold-a-useful-line',
        drift.finalLineQuality >= 0.52 &&
            drift.finalLineQuality > highSpeedNoInput.finalLineQuality &&
            drift.maxAbsOffset < HANDLING_TEST_CONFIG.maxRoadOffset,
        {
            finalLineQuality: drift.finalLineQuality,
            maxAbsOffset: drift.maxAbsOffset,
            neutralLineQuality: highSpeedNoInput.finalLineQuality,
        },
    ),
];

const report = {
    checks,
    config: {
        cornerCurve: CORNER_CURVE,
        cornerInertiaBuildRate: HANDLING_TEST_CONFIG.cornerInertiaBuildRate,
        cornerInertiaMaxLateralSpeed: HANDLING_TEST_CONFIG.cornerInertiaMaxLateralSpeed,
        cornerInertiaRecoveryRate: HANDLING_TEST_CONFIG.cornerInertiaRecoveryRate,
        frameSeconds: FRAME_SECONDS,
        gripSpeedKmh: GRIP_SPEED_KMH,
        highSpeedKmh: HIGH_SPEED_KMH,
        lowSpeedKmh: LOW_SPEED_KMH,
    },
    contract: {
        coordinateModel: 'road-relative lateral offset',
        cornerNeutralCentering: 'disabled',
        inertiaDirection: 'outside of curve',
        inertiaSpatialSpeedLaw: 'road-distance lateral debt scales with speed ratio squared',
        inertiaTimeSpeedLaw: 'controller lateral velocity scales with speed ratio cubed',
        longitudinalScaleLaw: 'target and build/recovery rates scale with world progression',
    },
    pass: checks.every((entry) => entry.pass),
    scenarios: {
        drift,
        grip,
        gripSpeedNoInput,
        highSpeedNoInput,
        highSpeedNoInputLeft,
        lowSpeedNoInput,
        straightNoInput,
    },
};

await mkdir(OUTPUT_DIR, { recursive: true });
const outputPath = path.join(OUTPUT_DIR, 'corner-handling-contract.json');
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
console.log(`Corner handling contract wrote ${path.relative(process.cwd(), outputPath)}`);

if (!report.pass) process.exitCode = 1;

function runScenario({
    curve,
    durationSec,
    id,
    inputAt,
    maintainSpeed,
    speedKmh,
}) {
    const speed = speedForDisplayKmh(speedKmh);
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        HANDLING_TEST_CONFIG.accelSpeed,
    );
    const frames = Math.round(durationSec / FRAME_SECONDS);
    let bestLineQuality = 0;
    let enteredDrift = false;
    let maxAbsOffset = 0;
    let maxDriftRatio = 0;
    let maxInertiaSpeed = 0;
    let maxOffset = Number.NEGATIVE_INFINITY;
    let minOffset = Number.POSITIVE_INFINITY;

    for (let frame = 0; frame < frames; frame += 1) {
        const elapsedSec = frame * FRAME_SECONDS;
        if (maintainSpeed) player.speed = speed;

        updatePlayerVehicle(
            player,
            inputAt(elapsedSec),
            { currentCurve: curve, slopeAcceleration: 0 },
            HANDLING_TEST_CONFIG,
            FRAME_SECONDS,
        );

        if (maintainSpeed) player.speed = speed;
        bestLineQuality = Math.max(bestLineQuality, player.cornerDemand.lineQuality);
        enteredDrift ||= player.driftState === 'drift';
        maxAbsOffset = Math.max(maxAbsOffset, Math.abs(player.lateralOffset));
        maxOffset = Math.max(maxOffset, player.lateralOffset);
        minOffset = Math.min(minOffset, player.lateralOffset);
        maxDriftRatio = Math.max(maxDriftRatio, player.driftRatio);
        maxInertiaSpeed = Math.max(
            maxInertiaSpeed,
            Math.abs(player.cornerInertiaLateralVelocity),
        );
    }

    return {
        bestLineQuality: round(bestLineQuality),
        enteredDrift,
        finalInertiaSpeed: round(player.cornerInertiaLateralVelocity),
        finalLineQuality: round(player.cornerDemand.lineQuality),
        finalOffset: round(player.lateralOffset),
        finalSteeringVelocity: round(player.steeringVelocity),
        finalUndersteerVelocity: round(player.overspeedUndersteerLateralVelocity),
        finalState: player.driftState,
        id,
        maxAbsOffset: round(maxAbsOffset),
        maxDriftRatio: round(maxDriftRatio),
        maxInertiaSpeed: round(maxInertiaSpeed),
        maxOffset: round(maxOffset),
        minOffset: round(minOffset),
        speedKmh,
    };
}

function getOutwardDistance(offset) {
    return Math.max(0, -ROAD_DIRECTION * offset);
}

function speedForDisplayKmh(speedKmh) {
    return HANDLING_TEST_CONFIG.accelSpeed * speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}
