import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const SPEED_KMH = 130;
const TEST_DURATION_SECONDS = 0.18;
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: 100_000,
    overspeedEasyLateralScale: 0,
    overspeedMediumLateralScale: 0,
    overspeedSharpLateralScale: 0,
});

const right = runTurnIn(0.62);
const left = runTurnIn(-0.62);
const neutral = runTurnIn(0);
const checks = [
    check(
        'grip-input-produces-immediate-lateral-response',
        right.lateralOffset >= 3 && right.steeringVelocity >= 18,
        right,
    ),
    check(
        'grip-turn-in-remains-left-right-symmetric',
        Math.abs(right.lateralOffset + left.lateralOffset) <= 0.05 &&
            Math.abs(right.steeringVelocity + left.steeringVelocity) <= 0.05,
        { left, right },
    ),
    check(
        'neutral-straight-does-not-create-direct-lateral-motion',
        Math.abs(neutral.lateralOffset) <= 0.001 &&
            Math.abs(neutral.steeringVelocity) <= 0.001,
        neutral,
    ),
];

const passed = checks.filter((entry) => entry.pass).length;
console.log('Apex Seoul GDS-1 grip direct steering response');
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exitCode = 1;

function runTurnIn(steerAxis) {
    const speed = config.accelSpeed * SPEED_KMH / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );

    for (let frame = 0; frame < Math.round(TEST_DURATION_SECONDS / FRAME_SECONDS); frame += 1) {
        player.speed = speed;
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis },
            { currentCurve: 0, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
    }

    return {
        lateralOffset: round(player.lateralOffset),
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
