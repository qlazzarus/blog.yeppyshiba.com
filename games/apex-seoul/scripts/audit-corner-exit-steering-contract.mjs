import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: 940,
});

const left = runDriftExit(-1);
const right = runDriftExit(1);
const preloaded = runPreloadedInsideHeading();
const straight = runStraightHeldSteer();
const checks = [
    check(
        'left-drift-exit-limits-inside-heading-growth',
        left.maxInsideHeading <= 0.2 && left.limitFrames > 0,
        left,
    ),
    check(
        'right-drift-exit-limits-inside-heading-growth',
        right.maxInsideHeading <= 0.2 && right.limitFrames > 0,
        right,
    ),
    check(
        'drift-exit-heading-limit-is-left-right-symmetric',
        Math.abs(left.maxInsideHeading - right.maxInsideHeading) <= 0.002 &&
            Math.abs(left.finalInsideHeading - right.finalInsideHeading) <= 0.002,
        {
            leftFinal: left.finalInsideHeading,
            leftMax: left.maxInsideHeading,
            rightFinal: right.finalInsideHeading,
            rightMax: right.maxInsideHeading,
        },
    ),
    check(
        'preloaded-inside-heading-is-not-snapped-to-allowance',
        preloaded.firstFrameInsideHeading >= 0.3 &&
            preloaded.maxInsideHeading <= preloaded.initialInsideHeading + 0.001,
        preloaded,
    ),
    check(
        'straight-held-steer-remains-driver-controlled',
        straight.finalHeading >= 0.25 &&
            straight.limitFrames === 0,
        straight,
    ),
];

const report = {
    checks,
    left,
    pass: checks.every((entry) => entry.pass),
    preloaded,
    right,
    straight,
};

console.log(`HR-3K corner exit steering: ${report.pass ? 'PASS' : 'FAIL'}`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${checks.filter((entry) => entry.pass).length}/${checks.length} PASS`);

if (!report.pass) process.exitCode = 1;

function runDriftExit(direction) {
    const player = createPlayer(138.7);
    player.vehicleHeadingError = -direction * 0.18;
    player.lateralOffset = -direction * 420;
    player.driftState = 'drift';
    player.driftStateTimer = 0.3;
    player.driftDirection = direction;
    player.driftRatio = 0.82;
    player.traction = 0.42;
    player.driftBaseLateralVelocity = direction * 150;
    player.driftLateralVelocity = direction * 150;
    player.throttleWasPressed = true;
    const frames = Math.ceil(2.4 / FRAME_SECONDS);
    let limitFrames = 0;
    let maxInsideHeading = 0;
    let maxInsideInertia = 0;

    for (let frame = 0; frame < frames; frame += 1) {
        const progress = frame / Math.max(1, frames - 1);
        const currentCurve = direction * lerp(0.66, 0.08, progress);
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis: direction,
            },
            {
                currentCurve,
                longitudinalScale: 2,
                previewRoadCurve: currentCurve,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
        maxInsideHeading = Math.max(
            maxInsideHeading,
            direction * player.vehicleHeadingError,
        );
        maxInsideInertia = Math.max(
            maxInsideInertia,
            direction * player.cornerInertiaLateralVelocity,
        );
        limitFrames += player.cornerInsideHeadingLimited ? 1 : 0;
    }

    return {
        direction,
        finalHeading: round(player.vehicleHeadingError),
        finalInsideHeading: round(direction * player.vehicleHeadingError),
        limitFrames,
        maxInsideHeading: round(maxInsideHeading),
        maxInsideInertia: round(maxInsideInertia),
    };
}

function runPreloadedInsideHeading() {
    const player = createPlayer(150);
    player.vehicleHeadingError = 0.32;
    const initialInsideHeading = player.vehicleHeadingError;
    let firstFrameInsideHeading = 0;
    let maxInsideHeading = initialInsideHeading;

    for (let frame = 0; frame < 30; frame += 1) {
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis: 1,
            },
            {
                currentCurve: 0.5,
                longitudinalScale: 2,
                previewRoadCurve: 0.5,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
        if (frame === 0) firstFrameInsideHeading = player.vehicleHeadingError;
        maxInsideHeading = Math.max(maxInsideHeading, player.vehicleHeadingError);
    }

    return {
        finalInsideHeading: round(player.vehicleHeadingError),
        firstFrameInsideHeading: round(firstFrameInsideHeading),
        initialInsideHeading: round(initialInsideHeading),
        maxInsideHeading: round(maxInsideHeading),
    };
}

function runStraightHeldSteer() {
    const player = createPlayer(150);
    let limitFrames = 0;

    for (let frame = 0; frame < 60; frame += 1) {
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis: 1,
            },
            {
                currentCurve: 0,
                longitudinalScale: 2,
                previewRoadCurve: 0.6,
                slopeAcceleration: 0,
            },
            config,
            FRAME_SECONDS,
        );
        limitFrames += player.cornerInsideHeadingLimited ? 1 : 0;
    }

    return {
        finalHeading: round(player.vehicleHeadingError),
        limitFrames,
    };
}

function createPlayer(speedKmh) {
    const speed = config.accelSpeed * speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.speed = speed;
    return player;
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function round(value) {
    return Number(value.toFixed(4));
}
