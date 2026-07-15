import { applyGuardrailCollision } from '../src/game/guardrailCollision.ts';
import { RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile.ts';
import { createDefaultPlayerVehicleState } from '../src/game/playerVehicleController.ts';

const FRAME_SECONDS = 1 / 60;
const CONTEXT = { pavedHalfWidth: 820, railContactLimit: 950 };

const mild = runContact(1, 34, 620);
const hard = runContact(1, 220, 720);
const left = runContact(-1, 220, 720);
const sustained = runSustainedContact();
const recovery = runRecovery();
const visual = runVisualContact();
const metrics = {
    hardImpactCue: hard.impactCue,
    hardSpeedLoss: hard.speedLoss,
    leftDirection: left.direction,
    mildSpeedLoss: mild.speedLoss,
    sustainedImpactCount: sustained.impactCount,
    sustainedSpeedLoss: sustained.speedLoss,
    recoveryImpactCue: recovery.impactCue,
    recoveryTimer: recovery.timer,
    visualContactDirection: visual.direction,
    visualClampedOffset: visual.lateralOffset,
    visualBounceVelocity: visual.bounceVelocity,
    visualImpactCount: visual.impactCount,
};
const checks = [
    atLeast('hardImpactCue', metrics.hardImpactCue, 0.7),
    atLeast('hardSpeedLoss', metrics.hardSpeedLoss, 50),
    equals('leftDirection', metrics.leftDirection, -1),
    between('mildSpeedLoss', metrics.mildSpeedLoss, 1, 30),
    equals('sustainedImpactCount', metrics.sustainedImpactCount, 1),
    atLeast('sustainedSpeedLoss', metrics.sustainedSpeedLoss, 50),
    atMost('recoveryImpactCue', metrics.recoveryImpactCue, 0.001),
    equals('recoveryTimer', metrics.recoveryTimer, 0),
    equals('visualContactDirection', metrics.visualContactDirection, -1),
    between('visualClampedOffset', metrics.visualClampedOffset, -142, -138),
    between('visualBounceVelocity', metrics.visualBounceVelocity, 80, 130),
    equals('visualImpactCount', metrics.visualImpactCount, 1),
];
const report = { checks, metrics: roundObject(metrics), pass: checks.every((check) => check.pass) };

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function runContact(side, outwardVelocity, speed) {
    const player = createPlayer(speed);

    player.lateralOffset = side * CONTEXT.railContactLimit;
    player.steeringVelocity = side * outwardVelocity;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);

    return {
        direction: player.guardrailContactDirection,
        impactCue: player.guardrailImpactCue,
        speedLoss: speed - player.speed,
    };
}

function runSustainedContact() {
    const player = createPlayer(720);
    const initialSpeed = player.speed;

    player.lateralOffset = CONTEXT.railContactLimit;
    player.steeringVelocity = 220;
    for (let frame = 0; frame < 20; frame += 1) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }

    return { impactCount: player.guardrailImpactCount, speedLoss: initialSpeed - player.speed };
}

function runRecovery() {
    const player = createPlayer(720);

    player.lateralOffset = CONTEXT.railContactLimit;
    player.steeringVelocity = 220;
    applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    player.lateralOffset = 0;
    for (let time = 0; time < 0.5; time += FRAME_SECONDS) {
        applyGuardrailCollision(player, CONTEXT, FRAME_SECONDS);
    }

    return { impactCue: player.guardrailImpactCue, timer: player.guardrailContactTimer };
}

function runVisualContact() {
    const player = createPlayer(720);
    const context = {
        ...CONTEXT,
        visualPavedHalfWidth: 66,
        visualRailContactLimit: 196,
    };

    player.lateralOffset = -276;
    player.steeringVelocity = -180;
    applyGuardrailCollision(player, context, FRAME_SECONDS);

    return {
        direction: player.guardrailContactDirection,
        bounceVelocity: player.guardrailBounceVelocity,
        impactCount: player.guardrailImpactCount,
        lateralOffset: player.lateralOffset,
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
