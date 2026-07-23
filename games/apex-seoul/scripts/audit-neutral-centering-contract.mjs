import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const TEST_SPEED = 760 * 185 / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
const START_OFFSET = 360;
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: 100_000,
    overspeedEasyLateralScale: 0,
    overspeedMediumLateralScale: 0,
    overspeedSharpLateralScale: 0,
});

const parked = createVehicle();
parked.lateralOffset = START_OFFSET;
const parkedRun = runPhase(parked, { duration: 2 });

const released = createVehicle();
released.lateralOffset = START_OFFSET;
released.steering = -0.8;
released.steeringVelocity = -120;
const releasedRun = runPhase(released, { duration: 1.5 });

const corrected = createVehicle();
corrected.lateralOffset = START_OFFSET;
const correctedRun = runPhase(corrected, {
    duration: 0.75,
    steerAxis: -0.55,
});

const headingDebt = createVehicle();
headingDebt.lateralOffset = START_OFFSET;
headingDebt.vehicleHeadingError = 0.25;
const headingRun = runPhase(headingDebt, { duration: 0.5 });

const checks = [
    check(
        'neutral-offset-does-not-create-centering-force',
        parkedRun.maxAbsCenteringForce <= 0.0001,
        parkedRun,
    ),
    check(
        'neutral-offset-does-not-move-toward-road-center',
        Math.abs(parked.lateralOffset - START_OFFSET) <= 0.0001 &&
            Math.abs(parked.steeringVelocity) <= 0.0001,
        snapshot(parked),
    ),
    check(
        'released-lateral-velocity-damps-without-center-command',
        releasedRun.maxAbsCenteringForce <= 0.0001 &&
            Math.abs(released.steeringVelocity) <= 0.01 &&
            released.lateralOffset < START_OFFSET &&
            released.lateralOffset >= START_OFFSET - 30 &&
            releasedRun.minSteeringVelocity < 0 &&
            releasedRun.maxSteeringVelocity <= 0.0001,
        releasedRun,
    ),
    check(
        'released-wheel-visual-returns-to-neutral',
        Math.abs(released.steering) <= 0.01,
        snapshot(released),
    ),
    check(
        'active-countersteer-can-correct-line',
        corrected.lateralOffset <= START_OFFSET - 80 &&
            correctedRun.maxAbsCenteringForce > 0,
        correctedRun,
    ),
    check(
        'heading-debt-remains-independent-of-position-centering',
        Math.abs(headingDebt.vehicleHeadingError - 0.25) <= 0.0001 &&
            headingDebt.lateralOffset > START_OFFSET &&
            headingRun.maxAbsCenteringForce <= 0.0001,
        headingRun,
    ),
];

const passed = checks.filter((entry) => entry.pass).length;
console.log('Apex Seoul HR-2 neutral centering contract');
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exitCode = 1;

function createVehicle() {
    const player = createDefaultPlayerVehicleState(
        TEST_SPEED,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.speed = TEST_SPEED;
    return player;
}

function runPhase(player, { duration, steerAxis = 0 }) {
    const frames = Math.round(duration / FRAME_SECONDS);
    let maxAbsCenteringForce = 0;
    let maxSteeringVelocity = Number.NEGATIVE_INFINITY;
    let minSteeringVelocity = Number.POSITIVE_INFINITY;

    for (let frame = 0; frame < frames; frame += 1) {
        player.speed = TEST_SPEED;
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis,
            },
            {
                currentCurve: 0,
                longitudinalScale: 2,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
        maxAbsCenteringForce = Math.max(
            maxAbsCenteringForce,
            Math.abs(player.centeringForce),
        );
        maxSteeringVelocity = Math.max(maxSteeringVelocity, player.steeringVelocity);
        minSteeringVelocity = Math.min(minSteeringVelocity, player.steeringVelocity);
    }

    return {
        ...snapshot(player),
        maxAbsCenteringForce: round(maxAbsCenteringForce),
        maxSteeringVelocity: round(maxSteeringVelocity),
        minSteeringVelocity: round(minSteeringVelocity),
    };
}

function snapshot(player) {
    return {
        centeringForce: round(player.centeringForce),
        lateralOffset: round(player.lateralOffset),
        steering: round(player.steering),
        steeringVelocity: round(player.steeringVelocity),
        vehicleHeadingError: round(player.vehicleHeadingError),
    };
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value) {
    return Number(value.toFixed(4));
}
