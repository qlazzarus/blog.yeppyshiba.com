import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    MIRAE_GT_ENGINE_PROFILE,
    RAVEN_COUPE_ENGINE_PROFILE,
    SEORIN_GT_ENGINE_PROFILE,
    getDisplaySpeedKmh,
    type VehicleEngineProfile,
} from '../src/game/engineProfile';
import { applyGuardrailCollision, getGuardrailCollisionGeometry, GUARDRAIL_COLLISION_CONFIG as rail } from '../src/game/guardrailCollision';
import { createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController';
import { createRoadTrack, getRoadCurveAt, getRoadElevationAt, getRoadHalfWidthAt } from '../src/game/road';
import {
    MIRAE_GT_HANDLING_PROFILE,
    RAVEN_COUPE_HANDLING_PROFILE,
    SEORIN_GT_HANDLING_PROFILE,
    type VehicleHandlingProfile,
} from '../src/game/vehicleHandlingProfile';

const outputDir = path.resolve(process.argv[2] ?? '/tmp/apex-vehicle-handling-balance');
const track = createRoadTrack('bugak-ridge-downhill');
const rawSpeed = (kmh: number) => kmh * 760 / 225;
const round = (value: number) => Number(value.toFixed(4));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

type VehicleFixture = {
    engine: VehicleEngineProfile;
    id: string;
    profile: VehicleHandlingProfile;
};

const vehicles: VehicleFixture[] = [
    { id: 'raven', engine: RAVEN_COUPE_ENGINE_PROFILE, profile: RAVEN_COUPE_HANDLING_PROFILE },
    { id: 'seorin', engine: SEORIN_GT_ENGINE_PROFILE, profile: SEORIN_GT_HANDLING_PROFILE },
    { id: 'mirae', engine: MIRAE_GT_ENGINE_PROFILE, profile: MIRAE_GT_HANDLING_PROFILE },
];

function createFixtureVehicle(engine: VehicleEngineProfile, profile: VehicleHandlingProfile, speedKmh: number) {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), engine, profile);
    const player = createDefaultPlayerVehicleState(rawSpeed(speedKmh), engine, config.accelSpeed);
    return { config, player };
}

function runTurnIn(profile: VehicleHandlingProfile, fps: number) {
    // A shared NA engine and a frozen speed expose steering response only.
    const { config, player } = createFixtureVehicle(RAVEN_COUPE_ENGINE_PROFILE, profile, 125);
    let maxOffset = 0;
    let maxHeading = 0;
    for (let frame = 0; frame < Math.round(fps * 0.12); frame++) {
        updatePlayerVehicle(player, { accelPressed: true, brakePressed: false, steerAxis: 1 }, {
            currentCurve: 0.48, slopeAcceleration: 0, longitudinalScale: 2,
        }, config, 1 / fps);
        player.speed = rawSpeed(125);
        maxOffset = Math.max(maxOffset, Math.abs(player.lateralOffset));
        maxHeading = Math.max(maxHeading, Math.abs(player.vehicleHeadingError));
    }
    return { maxOffset: round(maxOffset), maxHeading: round(maxHeading), steeringCommand: round(player.physicalSteeringCommand) };
}

function runLiftRotation(profile: VehicleHandlingProfile, fps: number) {
    const { config, player } = createFixtureVehicle(RAVEN_COUPE_ENGINE_PROFILE, profile, 140);
    let maxDriftRatio = 0;
    let maxOffset = 0;
    let driftEntrySec: number | null = null;
    for (let frame = 0; frame < Math.round(fps * 0.7); frame++) {
        const lifting = frame >= 2 && frame < Math.round(fps * 0.42);
        updatePlayerVehicle(player, { accelPressed: !lifting, brakePressed: false, steerAxis: 1 }, {
            currentCurve: 0.58, slopeAcceleration: 0, longitudinalScale: 2,
        }, config, 1 / fps);
        player.speed = rawSpeed(140);
        maxDriftRatio = Math.max(maxDriftRatio, player.driftRatio);
        maxOffset = Math.max(maxOffset, Math.abs(player.lateralOffset));
        if (driftEntrySec === null && player.driftState === 'drift') driftEntrySec = (frame + 1) / fps;
    }
    return { driftEntrySec, maxDriftRatio: round(maxDriftRatio), maxOffset: round(maxOffset), finalState: player.driftState };
}

function runHighSpeedLine(profile: VehicleHandlingProfile, fps: number) {
    const { config, player } = createFixtureVehicle(RAVEN_COUPE_ENGINE_PROFILE, profile, 185);
    let maxOffset = 0;
    let maxHeading = 0;
    for (let frame = 0; frame < Math.round(fps * 2.5); frame++) {
        const command = 0.34 * 1.36 - player.vehicleHeadingError * 2.8 - player.lateralOffset * 0.0015;
        const steerAxis = Math.abs(command) < 0.1 ? 0 : Math.sign(command);
        updatePlayerVehicle(player, { accelPressed: true, brakePressed: false, steerAxis }, {
            currentCurve: 0.34, slopeAcceleration: 0, longitudinalScale: 2,
        }, config, 1 / fps);
        player.speed = rawSpeed(185);
        maxOffset = Math.max(maxOffset, Math.abs(player.lateralOffset));
        maxHeading = Math.max(maxHeading, Math.abs(player.vehicleHeadingError));
    }
    return { maxOffset: round(maxOffset), maxHeading: round(maxHeading), finalOffset: round(player.lateralOffset) };
}

function runMiraeRecovery(boostRatio: number, fps: number) {
    const { config, player } = createFixtureVehicle(MIRAE_GT_ENGINE_PROFILE, MIRAE_GT_HANDLING_PROFILE, 135);
    player.boostRatio = boostRatio;
    player.primaryBoostRatio = boostRatio;
    player.driftState = 'recovery';
    player.driftDirection = 1;
    player.driftRatio = 0.6;
    player.throttleWasPressed = true;
    let recoveredSec: number | null = null;
    for (let frame = 0; frame < fps; frame++) {
        updatePlayerVehicle(player, { accelPressed: true, brakePressed: false, steerAxis: 0 }, {
            currentCurve: 0.12, slopeAcceleration: 0, longitudinalScale: 2,
        }, config, 1 / fps);
        player.speed = rawSpeed(135);
        if (recoveredSec === null && player.driftState === 'grip') recoveredSec = (frame + 1) / fps;
    }
    return { boostRatio: round(boostRatio), recoveredSec, finalDriftRatio: round(player.driftRatio) };
}

function runBugakSector(vehicle: VehicleFixture, fps: number) {
    const { config, player } = createFixtureVehicle(vehicle.engine, vehicle.profile, 140);
    let z = 4500;
    const startZ = z;
    const finishZ = 10500;
    let maxOffset = 0;
    let maxHeading = 0;
    let maxBoost = 0;
    let driftEntrySec: number | null = null;
    let recoverySec: number | null = null;
    let liftStarted: number | null = null;
    for (let frame = 0; frame < fps * 30; frame++) {
        const timeSec = frame / fps;
        const curve = getRoadCurveAt(track, z + 260);
        const width = getRoadHalfWidthAt(track, z + 260);
        const frontWidth = getRoadHalfWidthAt(track, z + 260 + rail.physicalVehicleFrontLength);
        const collision = {
            pavedHalfWidth: width,
            railContactLimit: width + rail.contactClearance,
            vehicleHalfWidth: rail.physicalVehicleHalfWidth,
            frontRoad: { distance: rail.physicalVehicleFrontLength, pavedHalfWidth: frontWidth, railContactLimit: frontWidth + rail.contactClearance },
        };
        const slope = clamp((getRoadElevationAt(track, z) - getRoadElevationAt(track, z + 720)) / 720 * 360, -115, 115);
        const command = curve * 1.36 - player.vehicleHeadingError * 2.8 - player.lateralOffset * 0.0015;
        const steerAxis = Math.abs(command) < 0.1 ? 0 : Math.sign(command);
        if (liftStarted === null && Math.abs(curve) > 0.42 && steerAxis !== 0) liftStarted = timeSec;
        const lifting = liftStarted !== null && timeSec - liftStarted < 0.4;
        const beforeZ = z;
        updatePlayerVehicle(player, { accelPressed: !lifting, brakePressed: false, steerAxis }, {
            currentCurve: curve, slopeAcceleration: slope, longitudinalScale: 2,
        }, { ...config, maxRoadOffset: getGuardrailCollisionGeometry(collision).railCenterLimit }, 1 / fps);
        applyGuardrailCollision(player, collision, 1 / fps);
        z += player.speed * 2 / fps;
        maxOffset = Math.max(maxOffset, Math.abs(player.lateralOffset));
        maxHeading = Math.max(maxHeading, Math.abs(player.vehicleHeadingError));
        maxBoost = Math.max(maxBoost, player.boostRatio);
        if (driftEntrySec === null && player.driftState === 'drift') driftEntrySec = timeSec;
        if (driftEntrySec !== null && recoverySec === null && player.driftState === 'grip') recoverySec = timeSec;
        if (z >= finishZ) return {
            timeSec: round((frame + (finishZ - beforeZ) / (z - beforeZ)) / fps),
            exitSpeedKmh: round(getDisplaySpeedKmh(player.speed, config.accelSpeed, vehicle.engine)),
            maxOffset: round(maxOffset), maxHeading: round(maxHeading), maxBoost: round(maxBoost),
            driftEntrySec, recoverySec, impacts: player.guardrailImpactCount, distanceWorldUnits: round(z - startZ),
        };
    }
    throw new Error(`${vehicle.id} Bugak fixture did not finish`);
}

const results = [60, 120].map(fps => {
    const turnIn = Object.fromEntries(vehicles.slice(0, 2).map(vehicle => [vehicle.id, runTurnIn(vehicle.profile, fps)]));
    const liftRotation = Object.fromEntries(vehicles.slice(0, 2).map(vehicle => [vehicle.id, runLiftRotation(vehicle.profile, fps)]));
    const highSpeedLine = Object.fromEntries(vehicles.slice(0, 2).map(vehicle => [vehicle.id, runHighSpeedLine(vehicle.profile, fps)]));
    const miraeRecovery = { lowBoost: runMiraeRecovery(0.4, fps), highBoost: runMiraeRecovery(0.82, fps) };
    const bugakLiftSector = Object.fromEntries(vehicles.map(vehicle => [vehicle.id, runBugakSector(vehicle, fps)]));
    return { fps, turnIn, liftRotation, highSpeedLine, miraeRecovery, bugakLiftSector };
});

const sixty = results[0];
const oneTwenty = results[1];
assert.ok(sixty.turnIn.raven.maxOffset >= sixty.turnIn.seorin.maxOffset * 1.05, 'Raven turn-in travel must exceed Seorin by at least 5%');
assert.ok(sixty.liftRotation.raven.maxOffset >= sixty.liftRotation.seorin.maxOffset * 1.1, 'Raven lift rotation travel must exceed Seorin by at least 10%');
assert.ok(sixty.highSpeedLine.seorin.maxOffset < sixty.highSpeedLine.raven.maxOffset, 'Seorin must hold a tighter high-speed line than Raven');
assert.ok(sixty.miraeRecovery.highBoost.recoveredSec! <= sixty.miraeRecovery.lowBoost.recoveredSec! - 0.04, 'Mirae high-boost recovery must be at least 0.04s quicker');
for (const vehicle of vehicles) {
    const at60 = sixty.bugakLiftSector[vehicle.id];
    const at120 = oneTwenty.bugakLiftSector[vehicle.id];
    assert.equal(at60.impacts, 0, `${vehicle.id} must finish the Bugak lift sector without impacts`);
    assert.equal(at120.impacts, 0, `${vehicle.id} must finish the Bugak lift sector without impacts at 120 Hz`);
    assert.ok(Math.abs(at60.timeSec - at120.timeSec) < 0.05, `${vehicle.id} Bugak fixture must be frame-rate stable`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'vehicle-handling-balance.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    method: 'Production controller and profiles. Character fixtures freeze speed and share the Raven engine to isolate handling; Bugak fixture uses each production engine/profile, road elevation, guardrails, and the same digital lift policy.',
    results,
}, null, 2) + '\n');
console.log(JSON.stringify({ pass: true, results }, null, 2));
console.log(`Report: ${path.join(outputDir, 'vehicle-handling-balance.json')}`);
