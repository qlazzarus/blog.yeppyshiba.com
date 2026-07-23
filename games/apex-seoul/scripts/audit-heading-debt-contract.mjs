import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const TEST_SPEED = 760 * 185 / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
const config = createPlayerControllerBaselineConfig({
    centeringResponse: 0,
    maxRoadOffset: 100_000,
    overspeedEasyLateralScale: 0,
    overspeedMediumLateralScale: 0,
    overspeedSharpLateralScale: 0,
});

const persistent = createVehicle();
runPhase(persistent, { curve: 0.64, duration: 0.75 });
const curveExit = snapshot(persistent);
runPhase(persistent, { curve: 0, duration: 0.35 });
const straightExit = snapshot(persistent);
runPhase(persistent, { curve: -0.64, duration: FRAME_SECONDS });
const oppositeEntry = snapshot(persistent);
runPhase(persistent, { curve: -0.64, duration: 0.75 });
const oppositeExit = snapshot(persistent);

const unassisted = createVehicle();
runPhase(unassisted, { curve: 0.64, duration: 0.75 });
const assisted = createVehicle();
runPhase(assisted, { curve: 0.64, duration: 0.75, steerAxis: 0.65 });

const checks = [
    check(
        'curve-builds-outward-heading-debt',
        curveExit.vehicleHeadingError <= -0.2 &&
            curveExit.cornerInertiaLateralVelocity < -80,
        curveExit,
    ),
    check(
        'straight-preserves-heading-debt',
        sameDirection(curveExit.vehicleHeadingError, straightExit.vehicleHeadingError) &&
            Math.abs(straightExit.vehicleHeadingError) >=
                Math.abs(curveExit.vehicleHeadingError) * 0.98,
        { curveExit, straightExit },
    ),
    check(
        'opposite-corner-does-not-instantly-flip-debt',
        sameDirection(straightExit.vehicleHeadingError, oppositeEntry.vehicleHeadingError) &&
            sameDirection(
                straightExit.cornerInertiaLateralVelocity,
                oppositeEntry.cornerInertiaLateralVelocity,
            ),
        { oppositeEntry, straightExit },
    ),
    check(
        'opposite-corner-must-cancel-before-reversing',
        oppositeExit.vehicleHeadingError > 0 &&
            oppositeExit.cornerInertiaLateralVelocity > 0,
        oppositeExit,
    ),
    check(
        'corner-direction-steering-reduces-heading-debt',
        Math.abs(assisted.vehicleHeadingError) <=
                Math.abs(unassisted.vehicleHeadingError) * 0.6 &&
            Math.abs(assisted.cornerInertiaLateralVelocity) <
                Math.abs(unassisted.cornerInertiaLateralVelocity),
        {
            assisted: snapshot(assisted),
            unassisted: snapshot(unassisted),
        },
    ),
];

const passed = checks.filter((entry) => entry.pass).length;
console.log('Apex Seoul HR-1 heading debt contract');
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

function runPhase(player, { curve, duration, steerAxis = 0 }) {
    const frames = Math.round(duration / FRAME_SECONDS);
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
                currentCurve: curve,
                longitudinalScale: 2,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
    }
}

function snapshot(player) {
    return {
        cornerInertiaLateralVelocity: round(player.cornerInertiaLateralVelocity),
        lateralOffset: round(player.lateralOffset),
        vehicleHeadingError: round(player.vehicleHeadingError),
    };
}

function sameDirection(left, right) {
    return Math.sign(left) !== 0 && Math.sign(left) === Math.sign(right);
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value) {
    return Number(value.toFixed(4));
}
