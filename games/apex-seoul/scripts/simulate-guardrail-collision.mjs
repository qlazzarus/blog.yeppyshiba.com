import {
    GUARDRAIL_COLLISION_CONFIG,
    applyGuardrailCollision,
    getGuardrailCollisionGeometry,
} from '../src/game/guardrailCollision.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { createDefaultPlayerVehicleState } from '../src/game/playerVehicleController.ts';

const FRAME_SECONDS = 1 / 60;
const CONTEXT = createContext(960);
const NARROW_CONTEXT = createContext(820);
const GEOMETRY = getGuardrailCollisionGeometry(CONTEXT);
const NARROW_GEOMETRY = getGuardrailCollisionGeometry(NARROW_CONTEXT);

const mild = runContact(1, 34, 620);
const hard = runContact(1, 220, 720);
const left = runContact(-1, 220, 720);
const cornerInertiaOnly = runCornerInertiaContact(1, 220, 720);
const sustained = runSustainedContact();
const flicker = runContactFlicker();
const rearmed = runReleasedRecontact();
const timeoutRearmed = runClearTimeoutRecontact();
const recovery = runRecovery();
const falseVisualBoundary = runFalseVisualBoundary();
const shoulder = runShoulderSample();
const metrics = {
    hardImpactCue: hard.impactCue,
    hardSpeedLoss: hard.speedLoss,
    cornerInertiaBounceVelocity: cornerInertiaOnly.bounceVelocity,
    cornerInertiaDampedVelocity: cornerInertiaOnly.cornerInertiaVelocity,
    cornerInertiaDampedHeadingError: cornerInertiaOnly.vehicleHeadingError,
    cornerInertiaImpactCue: cornerInertiaOnly.impactCue,
    leftDirection: left.direction,
    mildSpeedLoss: mild.speedLoss,
    flickerImpactCount: flicker.impactCount,
    flickerPhase: flicker.phase,
    rearmedImpactCount: rearmed.impactCount,
    rearmedPhase: rearmed.phase,
    timeoutRearmedImpactCount: timeoutRearmed.impactCount,
    timeoutRearmedPhase: timeoutRearmed.phase,
    sustainedImpactCount: sustained.impactCount,
    sustainedHeading: sustained.heading,
    sustainedInertia: sustained.inertia,
    sustainedSpeedLoss: sustained.speedLoss,
    recoveryImpactCue: recovery.impactCue,
    recoveryTimer: recovery.timer,
    narrowRailCenterLimit: NARROW_GEOMETRY.railCenterLimit,
    physicalVehicleHalfWidth: GEOMETRY.vehicleHalfWidth,
    shoulderRatioAtMidpoint: shoulder.shoulderRatio,
    visualBoundaryContactDirection: falseVisualBoundary.direction,
    visualBoundaryImpactCount: falseVisualBoundary.impactCount,
    visualBoundaryOffset: falseVisualBoundary.lateralOffset,
    widePavedCenterLimit: GEOMETRY.pavedCenterLimit,
    wideRailCenterLimit: GEOMETRY.railCenterLimit,
    wideRailOffset: GEOMETRY.railOffset,
};
const checks = [
    atLeast('hardImpactCue', metrics.hardImpactCue, 0.7),
    atLeast('hardSpeedLoss', metrics.hardSpeedLoss, 50),
    atLeast('cornerInertiaImpactCue', metrics.cornerInertiaImpactCue, 0.7),
    atLeast('cornerInertiaBounceVelocity', metrics.cornerInertiaBounceVelocity, 100),
    between('cornerInertiaDampedVelocity', metrics.cornerInertiaDampedVelocity, 48.3, 48.5),
    between('cornerInertiaDampedHeadingError', metrics.cornerInertiaDampedHeadingError, 0.109, 0.111),
    equals('leftDirection', metrics.leftDirection, -1),
    between('mildSpeedLoss', metrics.mildSpeedLoss, 1, 30),
    equals('flickerImpactCount', metrics.flickerImpactCount, 1),
    equals('flickerPhase', metrics.flickerPhase, 'stay'),
    equals('rearmedImpactCount', metrics.rearmedImpactCount, 2),
    equals('rearmedPhase', metrics.rearmedPhase, 'enter'),
    equals('timeoutRearmedImpactCount', metrics.timeoutRearmedImpactCount, 2),
    equals('timeoutRearmedPhase', metrics.timeoutRearmedPhase, 'enter'),
    equals('sustainedImpactCount', metrics.sustainedImpactCount, 1),
    between('sustainedHeading', metrics.sustainedHeading, 0.109, 0.111),
    between('sustainedInertia', metrics.sustainedInertia, 48.3, 48.5),
    atLeast('sustainedSpeedLoss', metrics.sustainedSpeedLoss, 50),
    atMost('recoveryImpactCue', metrics.recoveryImpactCue, 0.001),
    equals('recoveryTimer', metrics.recoveryTimer, 0),
    equals('wideRailOffset', metrics.wideRailOffset, 1180),
    equals('widePavedCenterLimit', metrics.widePavedCenterLimit, 720),
    equals('wideRailCenterLimit', metrics.wideRailCenterLimit, 940),
    equals('narrowRailCenterLimit', metrics.narrowRailCenterLimit, 800),
    equals('physicalVehicleHalfWidth', metrics.physicalVehicleHalfWidth, 240),
    between('shoulderRatioAtMidpoint', metrics.shoulderRatioAtMidpoint, 0.499, 0.501),
    equals('visualBoundaryContactDirection', metrics.visualBoundaryContactDirection, 0),
    equals('visualBoundaryImpactCount', metrics.visualBoundaryImpactCount, 0),
    equals('visualBoundaryOffset', metrics.visualBoundaryOffset, 130),
];
const report = { checks, metrics: roundObject(metrics), pass: checks.every((check) => check.pass) };

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function runContact(side, outwardVelocity, speed) {
    const player = createPlayer(speed);

    player.lateralOffset = side * GEOMETRY.railCenterLimit;
    player.steeringVelocity = side * outwardVelocity;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        direction: player.guardrailContactDirection,
        impactCue: player.guardrailImpactCue,
        speedLoss: speed - player.speed,
    };
}

function runCornerInertiaContact(side, outwardVelocity, speed) {
    const player = createPlayer(speed);

    player.lateralOffset = side * GEOMETRY.railCenterLimit;
    player.cornerInertiaLateralVelocity = side * outwardVelocity;
    player.vehicleHeadingError = side * 0.5;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        bounceVelocity: player.guardrailBounceVelocity,
        cornerInertiaVelocity: player.cornerInertiaLateralVelocity,
        impactCue: player.guardrailImpactCue,
        vehicleHeadingError: player.vehicleHeadingError,
    };
}

function runSustainedContact() {
    const player = createPlayer(720);
    const initialSpeed = player.speed;

    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.cornerInertiaLateralVelocity = 220;
    player.vehicleHeadingError = 0.5;
    for (let frame = 0; frame < 20; frame += 1) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }

    return {
        heading: player.vehicleHeadingError,
        impactCount: player.guardrailImpactCount,
        inertia: player.cornerInertiaLateralVelocity,
        speedLoss: initialSpeed - player.speed,
    };
}

function runContactFlicker() {
    const player = createPlayer(720);

    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = GEOMETRY.railCenterLimit -
        GUARDRAIL_COLLISION_CONFIG.contactReleaseInset / 2;
    for (let frame = 0; frame < 20; frame += 1) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }
    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        impactCount: player.guardrailImpactCount,
        phase: player.guardrailContactPhase,
    };
}

function runReleasedRecontact() {
    const player = createPlayer(720);

    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = GEOMETRY.railCenterLimit -
        GUARDRAIL_COLLISION_CONFIG.contactReleaseInset - 1;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        impactCount: player.guardrailImpactCount,
        phase: player.guardrailContactPhase,
    };
}

function runClearTimeoutRecontact() {
    const player = createPlayer(720);

    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = GEOMETRY.railCenterLimit -
        GUARDRAIL_COLLISION_CONFIG.contactReleaseInset / 2;
    const clearFrames = Math.ceil(
        GUARDRAIL_COLLISION_CONFIG.contactReleaseSeconds / FRAME_SECONDS,
    ) + 1;
    for (let frame = 0; frame < clearFrames; frame += 1) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }
    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        impactCount: player.guardrailImpactCount,
        phase: player.guardrailContactPhase,
    };
}

function runRecovery() {
    const player = createPlayer(720);

    player.lateralOffset = GEOMETRY.railCenterLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = 0;
    for (let time = 0; time < 0.5; time += FRAME_SECONDS) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }

    return { impactCue: player.guardrailImpactCue, timer: player.guardrailContactTimer };
}

function runFalseVisualBoundary() {
    const player = createPlayer(720);

    player.lateralOffset = 130;
    player.steeringVelocity = 180;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        direction: player.guardrailContactDirection,
        impactCount: player.guardrailImpactCount,
        lateralOffset: player.lateralOffset,
    };
}

function runShoulderSample() {
    const player = createPlayer(720);
    player.lateralOffset = (GEOMETRY.pavedCenterLimit + GEOMETRY.railCenterLimit) / 2;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    return { shoulderRatio: player.guardrailShoulderRatio };
}

function createContext(pavedHalfWidth) {
    return {
        pavedHalfWidth,
        railContactLimit: pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
        vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    };
}

function createPlayer(speed) {
    const player = createDefaultPlayerVehicleState(440, RAVEN_COUPE_ENGINE_PROFILE, 760);
    player.speed = speed;
    return player;
}

function atLeast(id, value, target) {
    return { id, pass: value >= target, target, value: round(value) };
}

function atMost(id, value, target) {
    return { id, pass: value <= target, target, value: round(value) };
}

function between(id, value, min, max) {
    return { id, max, min, pass: value >= min && value <= max, value: round(value) };
}

function equals(id, value, target) {
    return { id, pass: value === target, target, value };
}

function roundObject(values) {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, round(value)]));
}

function round(value) {
    return typeof value === 'number' ? Number(value.toFixed(4)) : value;
}
