import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
    getDisplaySpeedKmh, RAVEN_COUPE_ENGINE_PROFILE, SEORIN_GT_ENGINE_PROFILE,
    MIRAE_GT_ENGINE_PROFILE, type VehicleEngineProfile,
} from '../src/game/engineProfile';
import { createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController';
import { createRoadTrack, getRoadCurveAt, getRoadElevationAt, getRoadHalfWidthAt } from '../src/game/road';
import { applyGuardrailCollision, getGuardrailCollisionGeometry, GUARDRAIL_COLLISION_CONFIG as rail } from '../src/game/guardrailCollision';

const outputDir = path.resolve(process.argv[2] ?? '/tmp/apex-vehicle-comparison');
const profiles = [RAVEN_COUPE_ENGINE_PROFILE, SEORIN_GT_ENGINE_PROFILE, MIRAE_GT_ENGINE_PROFILE];
const track = createRoadTrack('bugak-ridge-downhill');
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Number(n.toFixed(4));
const rawSpeed = (kmh: number) => kmh * 760 / 225;
const throttle = { accelPressed: true, brakePressed: false, steerAxis: 0 };
const flat = { currentCurve: 0, slopeAcceleration: 0, longitudinalScale: 2 };

function setup(profile: VehicleEngineProfile, kmh = 0) {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
    const player = createDefaultPlayerVehicleState(rawSpeed(kmh), profile, config.accelSpeed);
    return { config, player, kmh: () => getDisplaySpeedKmh(player.speed, config.accelSpeed, profile) };
}

function acceleration(profile: VehicleEngineProfile, fps: number, start: number, targets: number[], seconds: number) {
    const { config, player, kmh } = setup(profile, start);
    const hits: Record<string, number | null> = Object.fromEntries(targets.map(n => [n, null]));
    let distance = 0;
    const samples: unknown[] = [];
    const reachedGears = new Set([player.gearIndex + 1]);
    for (let frame = 0; frame < seconds * fps; frame++) {
        const before = kmh();
        updatePlayerVehicle(player, throttle, flat, config, 1 / fps);
        distance += player.speed * 2 / fps;
        reachedGears.add(player.gearIndex + 1);
        for (const target of targets) {
            if (hits[target] === null && kmh() >= target) {
                hits[target] = round((frame + (target - before) / (kmh() - before)) / fps);
            }
        }
        if (frame % fps === 0) samples.push({ timeSec: (frame + 1) / fps, speedKmh: round(kmh()), gear: player.gearIndex + 1, rpm: round(player.rpm), boost: round(player.boostRatio) });
    }
    return { reachedGears: [...reachedGears], hitsSec: hits, endSpeedKmh: round(kmh()), endGear: player.gearIndex + 1, distanceWorldUnits: round(distance), samples };
}

function braking(profile: VehicleEngineProfile, fps: number) {
    const { config, player, kmh } = setup(profile, 100);
    let distance = 0;
    for (let frame = 0; frame < 10 * fps; frame++) {
        updatePlayerVehicle(player, { ...throttle, accelPressed: false, brakePressed: true }, flat, config, 1 / fps);
        distance += player.speed * 2 / fps;
        if (kmh() < 0.1) return { stopTimeSec: round((frame + 1) / fps), distanceWorldUnits: round(distance) };
    }
    throw new Error('Brake fixture did not stop');
}

function liftResponse(profile: VehicleEngineProfile, fps: number) {
    const { config, player, kmh } = setup(profile, 130);
    // Settle gear/RPM/boost at a held road speed, then release that fixture.
    for (let frame = 0; frame < 3 * fps; frame++) {
        player.speed = rawSpeed(130);
        updatePlayerVehicle(player, throttle, flat, config, 1 / fps);
    }
    player.speed = rawSpeed(130);
    const boostBefore = player.boostRatio;
    for (let frame = 0; frame < 0.5 * fps; frame++) updatePlayerVehicle(player, { ...throttle, accelPressed: false }, flat, config, 1 / fps);
    const speedAfterLift = kmh();
    const boostAfterLift = player.boostRatio;
    for (let frame = 0; frame < fps; frame++) updatePlayerVehicle(player, throttle, flat, config, 1 / fps);
    return { boostBefore: round(boostBefore), boostAfterLift: round(boostAfterLift), boostAfterReapply: round(player.boostRatio), speedAfterLift: round(speedAfterLift), speedAfterReapply: round(kmh()), gainInOneSecondKmh: round(kmh() - speedAfterLift) };
}

function corner(profile: VehicleEngineProfile, fps: number, mode: 'grip' | 'lift', startZ: number, finishZ: number) {
    const { config, player, kmh } = setup(profile, 140);
    let z = startZ, maxOffset = 0, maxHeading = 0, minSpeed = 140;
    let liftStarted: number | null = null;
    const stateTimes: Record<string, number> = {};
    const samples: unknown[] = [];
    for (let frame = 0; frame < 30 * fps; frame++) {
        const t = frame / fps;
        const curve = getRoadCurveAt(track, z + 260);
        const width = getRoadHalfWidthAt(track, z + 260);
        const frontWidth = getRoadHalfWidthAt(track, z + 260 + rail.physicalVehicleFrontLength);
        const collision = { pavedHalfWidth: width, railContactLimit: width + rail.contactClearance, vehicleHalfWidth: rail.physicalVehicleHalfWidth,
            frontRoad: { distance: rail.physicalVehicleFrontLength, pavedHalfWidth: frontWidth, railContactLimit: frontWidth + rail.contactClearance } };
        const slope = clamp((getRoadElevationAt(track, z) - getRoadElevationAt(track, z + 720)) / 720 * 360, -115, 115);
        // Identical digital feedback policy, not optimal driving or a lap-time ranking.
        const command = curve * 1.36 - player.vehicleHeadingError * 2.8 - player.lateralOffset * 0.0015;
        const steerAxis = Math.abs(command) < 0.1 ? 0 : Math.sign(command);
        if (mode === 'lift' && liftStarted === null && Math.abs(curve) > 0.42 && steerAxis !== 0) liftStarted = t;
        const lifting = liftStarted !== null && t - liftStarted < 0.4;
        const beforeZ = z;
        updatePlayerVehicle(player, { accelPressed: !lifting, brakePressed: false, steerAxis }, { currentCurve: curve, slopeAcceleration: slope, longitudinalScale: 2 }, { ...config, maxRoadOffset: getGuardrailCollisionGeometry(collision).railCenterLimit }, 1 / fps);
        applyGuardrailCollision(player, collision, 1 / fps);
        z += player.speed * 2 / fps;
        maxOffset = Math.max(maxOffset, Math.abs(player.lateralOffset));
        maxHeading = Math.max(maxHeading, Math.abs(player.vehicleHeadingError));
        minSpeed = Math.min(minSpeed, kmh());
        stateTimes[player.driftState] = (stateTimes[player.driftState] ?? 0) + 1 / fps;
        if (frame % Math.max(1, Math.round(fps / 10)) === 0) samples.push({ timeSec: round(t), z: round(z), curve: round(curve), speedKmh: round(kmh()), offset: round(player.lateralOffset), heading: round(player.vehicleHeadingError), steerAxis, lifting, driftState: player.driftState });
        if (z >= finishZ) return { mode, startZ, finishZ, timeSec: round((frame + (finishZ - beforeZ) / (z - beforeZ)) / fps), exitSpeedKmh: round(kmh()), minSpeedKmh: round(minSpeed), maxAbsOffset: round(maxOffset), maxAbsHeading: round(maxHeading), impacts: player.guardrailImpactCount, stateTimes, samples };
    }
    throw new Error('Corner fixture did not finish');
}

const results = [60, 120].flatMap(fps => profiles.map(profile => ({
    vehicle: profile.displayName, profileId: profile.id, fps,
    drivetrain: profile.drivetrainModel ?? 'arcade', induction: profile.induction,
    targetTopSpeedKmh: profile.displayTopSpeedKmh,
    shiftSchedule: profile.drivetrainModel === 'physical' ? 'mechanical-rpm' : 'speed-envelope',
    acceleration: acceleration(profile, fps, 0, [60, 100, 160, 200], 90),
    rolling80to120: acceleration(profile, fps, 80, [120], 20),
    braking100to0: braking(profile, fps),
    liftReapply130: liftResponse(profile, fps),
    corners: [corner(profile, fps, 'grip', 4500, 10500), corner(profile, fps, 'lift', 4500, 10500), corner(profile, fps, 'grip', 14200, 19700), corner(profile, fps, 'lift', 14200, 19700)],
})));
for (const row of results.filter(r => r.fps === 60)) {
    const other = results.find(r => r.profileId === row.profileId && r.fps === 120)!;
    for (const speed of ['60', '100', '160', '200']) {
        assert.notEqual(row.acceleration.hitsSec[speed], null);
        assert.ok(Math.abs(row.acceleration.hitsSec[speed]! - other.acceleration.hitsSec[speed]!) < 0.05, `${row.vehicle} frame-rate acceleration drift`);
    }
    row.corners.forEach((corner, i) => {
        assert.equal(corner.impacts, 0, `${row.vehicle} corner fixture must remain collision-free`);
        assert.ok(Math.abs(corner.timeSec - other.corners[i].timeSec) < 0.05, `${row.vehicle} corner timing drift`);
    });
}
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'performance.json'), JSON.stringify({ generatedAt: new Date().toISOString(), method: 'Production controller/config, fixed steps 60/120 Hz, flat longitudinal tests; launch bonus off; real Bugak geometry for two corner sectors; same digital feedback, no best-lap claim. Distances are world units, not meters.', results }, null, 2) + '\n');
for (const row of results) console.log(JSON.stringify({ ...row, acceleration: { ...row.acceleration, samples: undefined }, rolling80to120: { ...row.rolling80to120, samples: undefined }, corners: row.corners.map(({samples, ...rest}) => rest) }));
console.log(`Report: ${path.join(outputDir, 'performance.json')}`);
