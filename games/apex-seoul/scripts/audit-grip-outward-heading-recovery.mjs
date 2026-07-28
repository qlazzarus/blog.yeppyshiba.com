import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import {
    GUARDRAIL_COLLISION_CONFIG,
    applyGuardrailCollision,
} from '../src/game/guardrailCollision.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const SPEED_KMH = 130;
const TEST_DURATION_SECONDS = 0.4;
const config = createPlayerControllerBaselineConfig({
    maxRoadOffset: 100_000,
    overspeedEasyLateralScale: 0,
    overspeedMediumLateralScale: 0,
    overspeedSharpLateralScale: 0,
});

const right = runOutwardCorrection(1);
const left = runOutwardCorrection(-1);
const neutral = runNeutralDebt();
const reversal = runRapidReversal();
const oppositeSteerRailImpact = runOppositeSteerRailImpact();
const checks = [
    check(
        'corner-direction-input-retires-outward-heading-before-adding-inside-debt',
        right.signedHeading >= -0.14 &&
            right.signedCornerInertia >= -45 &&
            right.maxOutwardOffsetDelta <= 21,
        right,
    ),
    check(
        'outward-heading-recovery-remains-left-right-symmetric',
        Math.abs(right.signedHeading - left.signedHeading) <= 0.01 &&
            Math.abs(right.signedCornerInertia - left.signedCornerInertia) <= 0.5 &&
            Math.abs(right.maxOutwardOffsetDelta - left.maxOutwardOffsetDelta) <= 0.1,
        { left, right },
    ),
    check(
        'neutral-input-does-not-receive-outward-heading-recovery',
        Math.abs(neutral.steeringVelocity) <= 0.001 && neutral.signedHeading <= -0.24,
        neutral,
    ),
    check(
        'outward-recovery-waits-for-physical-steering-to-cross-the-road-direction',
        reversal.headingBeforePhysicalCross < -0.33 &&
            reversal.physicalBeforeCross < 0 &&
            reversal.physicalAfterCross > 0 &&
            reversal.finalHeading > reversal.headingBeforePhysicalCross,
        reversal,
    ),
    check(
        'left-curve-right-steer-can-reach-the-right-guardrail',
        oppositeSteerRailImpact.guardrailImpactCount === 1 &&
            oppositeSteerRailImpact.guardrailContactDirection === 1,
        oppositeSteerRailImpact,
    ),
];

const passed = checks.filter((entry) => entry.pass).length;
console.log('Apex Seoul GDS-2B outward heading recovery');
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exitCode = 1;

function runOutwardCorrection(direction) {
    const player = createFixture(direction);
    let minSignedOffset = direction * player.lateralOffset;

    for (let frame = 0; frame < Math.round(TEST_DURATION_SECONDS / FRAME_SECONDS); frame += 1) {
        player.speed = getSpeed();
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: direction },
            { currentCurve: -0.45 * direction, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
        minSignedOffset = Math.min(minSignedOffset, direction * player.lateralOffset);
    }

    return {
        maxOutwardOffsetDelta: round(Math.abs(minSignedOffset) - 180),
        signedCornerInertia: round(direction * player.cornerInertiaLateralVelocity),
        signedHeading: round(direction * player.vehicleHeadingError),
    };
}

function runNeutralDebt() {
    const player = createFixture(1);

    for (let frame = 0; frame < Math.round(TEST_DURATION_SECONDS / FRAME_SECONDS); frame += 1) {
        player.speed = getSpeed();
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: -0.45, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
    }

    return {
        signedHeading: round(player.vehicleHeadingError),
        steeringVelocity: round(player.steeringVelocity),
    };
}

function runRapidReversal() {
    const player = createFixture(1);
    player.physicalSteeringCommand = -0.6;
    let headingBeforePhysicalCross = null;
    let physicalBeforeCross = null;
    let physicalAfterCross = null;

    for (let frame = 0; frame < Math.round(TEST_DURATION_SECONDS / FRAME_SECONDS); frame += 1) {
        player.speed = getSpeed();
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 1 },
            { currentCurve: -0.45, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
        if (player.physicalSteeringCommand < 0) {
            headingBeforePhysicalCross = player.vehicleHeadingError;
            physicalBeforeCross = player.physicalSteeringCommand;
        } else if (physicalAfterCross === null) {
            physicalAfterCross = player.physicalSteeringCommand;
        }
    }

    return {
        finalHeading: round(player.vehicleHeadingError),
        headingBeforePhysicalCross: round(headingBeforePhysicalCross ?? player.vehicleHeadingError),
        physicalAfterCross: round(physicalAfterCross ?? 0),
        physicalBeforeCross: round(physicalBeforeCross ?? 0),
    };
}

function runOppositeSteerRailImpact() {
    const player = createDefaultPlayerVehicleState(
        500,
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    const railContext = {
        frontRoad: {
            distance: GUARDRAIL_COLLISION_CONFIG.physicalVehicleFrontLength,
            pavedHalfWidth: 720,
            railContactLimit: 940,
        },
        pavedHalfWidth: 720,
        railContactLimit: 940,
        vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    };
    player.speed = 500;

    for (let frame = 0; frame < Math.ceil(4 / FRAME_SECONDS); frame += 1) {
        player.speed = 500;
        updatePlayerVehicle(
            player,
            // Positive render curve has negative required road yaw. Positive
            // steer is therefore the visual left-curve's outside/right input.
            { accelPressed: true, brakePressed: false, steerAxis: 1 },
            { currentCurve: 0.55, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
        applyGuardrailCollision(player, railContext, FRAME_SECONDS);
        if (player.guardrailImpactCount > 0) break;
    }

    return {
        guardrailContactDirection: player.guardrailContactDirection,
        guardrailImpactCount: player.guardrailImpactCount,
        lateralOffset: round(player.lateralOffset),
        vehicleHeadingError: round(player.vehicleHeadingError),
    };
}

function createFixture(direction) {
    const player = createDefaultPlayerVehicleState(
        getSpeed(),
        RAVEN_COUPE_ENGINE_PROFILE,
        config.accelSpeed,
    );
    player.lateralOffset = -180 * direction;
    player.vehicleHeadingError = -0.34 * direction;
    return player;
}

function getSpeed() {
    return config.accelSpeed * SPEED_KMH / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value) {
    return Number(value.toFixed(4));
}
