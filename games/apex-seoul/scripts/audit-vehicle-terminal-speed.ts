import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    getDisplaySpeedKmh,
    getGearRpm,
    MIRAE_GT_ENGINE_PROFILE,
    RAVEN_COUPE_ENGINE_PROFILE,
    SEORIN_GT_ENGINE_PROFILE,
    type VehicleEngineProfile,
} from '../src/game/engineProfile';
import { createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController';

const outputDir = path.resolve(process.argv[2] ?? '/tmp/apex-vehicle-terminal-speed');
const profiles = [RAVEN_COUPE_ENGINE_PROFILE, SEORIN_GT_ENGINE_PROFILE, MIRAE_GT_ENGINE_PROFILE];
const input = { accelPressed: true, brakePressed: false, steerAxis: 0 };
const road = { currentCurve: 0, slopeAcceleration: 0, longitudinalScale: 2 };
const round = (value: number) => Number(value.toFixed(4));

function simulate(profile: VehicleEngineProfile, fps: number) {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
    const player = createDefaultPlayerVehicleState(0, profile, config.accelSpeed);
    const shifts: { from: number; to: number; timeSec: number; rpm: number; landingRpm: number }[] = [];
    let limiterFrames = 0;
    let maxRpm = 0;
    let maxSpeedKmh = 0;
    for (let frame = 0; frame < fps * 180; frame++) {
        const beforeGear = player.gearIndex;
        updatePlayerVehicle(player, input, road, config, 1 / fps);
        const speedKmh = getDisplaySpeedKmh(player.speed, config.accelSpeed, profile);
        maxSpeedKmh = Math.max(maxSpeedKmh, speedKmh);
        maxRpm = Math.max(maxRpm, player.rpm);
        if (player.fuelCutActive) limiterFrames += 1;
        if (player.gearIndex !== beforeGear) {
            shifts.push({
                from: beforeGear + 1,
                to: player.gearIndex + 1,
                timeSec: round((frame + 1) / fps),
                rpm: round(getGearRpm(profile, beforeGear, player.speed / config.accelSpeed)),
                landingRpm: round(getGearRpm(profile, player.gearIndex, player.speed / config.accelSpeed)),
            });
        }
    }
    return { vehicle: profile.displayName, fps, maxSpeedKmh: round(maxSpeedKmh), maxRpm: round(maxRpm), limiterFrames, shifts };
}

const results = [30, 60, 120].flatMap(fps => profiles.map(profile => simulate(profile, fps)));
for (const profile of profiles) {
    const rows = results.filter(row => row.vehicle === profile.displayName);
    for (const row of rows) {
        assert.deepEqual(row.shifts.map(shift => shift.to), profile.gears.slice(1).map((_, index) => index + 2), `${profile.displayName} must visit every gear once`);
        assert.ok(row.maxRpm >= profile.fuelCutStartRpm - 1, `${profile.displayName} must reach its terminal limiter`);
        assert.ok(row.limiterFrames > 0, `${profile.displayName} must cycle its limiter at terminal speed`);
        assert.ok(Math.abs(row.maxSpeedKmh - profile.terminalSpeedKmh) <= 2.1, `${profile.displayName} terminal speed must match its authored target`);
    }
    const at60 = rows.find(row => row.fps === 60)!;
    const at120 = rows.find(row => row.fps === 120)!;
    assert.ok(Math.abs(at60.maxSpeedKmh - at120.maxSpeedKmh) <= 0.2, `${profile.displayName} terminal speed must be frame-rate stable`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'vehicle-terminal-speed.json'), JSON.stringify({
    pass: true,
    method: 'Production controller, level road, continuous full throttle. Every upshift records the pre-shift and landing RPM; terminal speed is the maximum displayed speed over 180 seconds.',
    results,
}, null, 2) + '\n');
console.log(JSON.stringify({ pass: true, results }, null, 2));
