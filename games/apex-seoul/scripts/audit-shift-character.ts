import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    RAVEN_COUPE_ENGINE_PROFILE as na, SEORIN_GT_ENGINE_PROFILE as twin,
    MIRAE_GT_ENGINE_PROFILE as single, getGearRpm, getEngineBoostTargets, advanceEngineBoost,
} from '../src/game/engineProfile';
import { createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController';

const output = path.resolve(process.argv[2] ?? '/tmp/apex-shift-character');
const input = { accelPressed: true, brakePressed: false, steerAxis: 0 };
const road = { currentCurve: 0, slopeAcceleration: 0, longitudinalScale: 2 };
const profiles = [na, twin, single];
const results = [];
for (const fps of [30, 60, 120]) {
    for (const profile of [na, twin, single]) {
        const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
        const player = createDefaultPlayerVehicleState(0, profile, 760);
        const shifts = [];
        const gears = new Set([1]);
        for (let frame = 0; frame < fps * 90; frame++) {
            const beforeGear = player.gearIndex;
            let mechanicalRpm = getGearRpm(profile, beforeGear, player.speed / 760);
            updatePlayerVehicle(player, input, road, config, 1 / fps);
            if (player.gearIndex !== beforeGear) {
                mechanicalRpm = Math.max(mechanicalRpm, getGearRpm(profile, beforeGear, player.speed / 760));
                assert.equal(player.gearIndex, beforeGear + 1, 'uninterrupted acceleration must not hunt or skip gears');
                gears.add(player.gearIndex + 1);
                shifts.push({ timeSec: (frame + 1) / fps, from: beforeGear + 1, to: player.gearIndex + 1, mechanicalRpm, landingRpm: getGearRpm(profile, player.gearIndex, player.speed / 760), cut: player.shiftCutRatio });
                if (profile === na) assert.ok(mechanicalRpm >= 7400 && mechanicalRpm < 7500, `NA shifts at its mechanical high-rev boundary: fps=${fps} gear=${beforeGear + 1} rpm=${mechanicalRpm}`);
            }
            assert.equal(player.driftState, 'grip', 'transmission unloading must not masquerade as driver lift');
            if (profile === na) assert.equal(player.boostRatio, 0);
            assert.ok(player.boostRatio >= 0 && player.boostRatio <= 1);
        }
        assert.deepEqual([...gears], profile.gears.map((_, i) => i + 1));
        assert.equal(player.gearIndex, profile.gears.length - 1);

        // Braking must walk back to first without an upshift or stuck top gear.
        for (let frame = 0; frame < fps * 5; frame++) {
            const before = player.gearIndex;
            updatePlayerVehicle(player, { ...input, accelPressed: false, brakePressed: true }, road, config, 1 / fps);
            assert.ok(player.gearIndex <= before);
        }
        assert.equal(player.gearIndex, 0);
        assert.equal(player.speed, 0);
        results.push({ vehicle: profile.displayName, fps, reachedGears: [...gears], shifts });
    }
}

function shiftPulse(profile: typeof single, fps: number) {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
    const boundary = profile.gears[1].speedRatioMax - profile.shift!.upshiftSpeedMargin;
    const player = createDefaultPlayerVehicleState((boundary - 0.002) * 760, profile, 760);
    player.gearIndex = 1;
    for (let i = 0; i < fps * 3; i++) {
        player.speed = (boundary - 0.002) * 760;
        updatePlayerVehicle(player, input, road, config, 1 / fps);
        assert.equal(player.gearIndex, 1);
    }
    const beforeBoost = player.boostRatio;
    const samples = [];
    let minBoost = beforeBoost, maxCut = 0, transitions = 0;
    for (let i = 0; i < fps * 1.5; i++) {
        player.speed = (boundary + 0.001) * 760;
        const beforeGear = player.gearIndex;
        updatePlayerVehicle(player, input, road, config, 1 / fps);
        if (beforeGear !== player.gearIndex) transitions++;
        assert.equal(player.gearIndex, 2);
        minBoost = Math.min(minBoost, player.boostRatio);
        maxCut = Math.max(maxCut, player.shiftCutRatio);
        samples.push({ timeSec: (i + 1) / fps, boost: player.boostRatio, torque: player.engineTorqueScale, rpm: player.rpm, shiftTimer: player.shiftTimer });
    }
    assert.equal(transitions, 1, 'held boundary must not repeatedly shift');
    const activeDuration = samples.filter(s => s.shiftTimer > 0).length / fps;
    assert.ok(Math.abs(activeDuration - profile.shift!.upDurationSec) <= 1 / fps + 1e-9, 'shift duration must use elapsed seconds once per tick');
    assert.ok(samples.at(-1)!.boost > minBoost + 0.02, `boost must rebuild: ${profile.id} ${fps} before=${beforeBoost} min=${minBoost} end=${samples.at(-1)!.boost}`);
    const minimumIndex = samples.findIndex(s => s.boost === minBoost);
    const recovered = samples.slice(minimumIndex + 1).find(s => s.boost >= beforeBoost * 0.9);
    return { vehicle: profile.displayName, fps, activeDuration, beforeBoost, minBoost, retainedRatio: minBoost / beforeBoost, maxCut, recover90Sec: recovered?.timeSec ?? null, samples };
}
const pulses = [30, 60, 120].flatMap(fps => {
    const singlePulse = shiftPulse(single, fps), twinPulse = shiftPulse(twin, fps);
    assert.ok(singlePulse.retainedRatio + 0.05 < twinPulse.retainedRatio, 'single loses more pressure through its longer shift');
    assert.ok(singlePulse.maxCut > twinPulse.maxCut + 0.2, 'single interruption is more pronounced');
    assert.ok(singlePulse.recover90Sec !== null && twinPulse.recover90Sec !== null);
    assert.ok(singlePulse.recover90Sec > twinPulse.recover90Sec, 'twin responds sooner after a shift');
    return [singlePulse, twinPulse];
});

// At the terminal gear, every profile must reach its own limiter. Hold speed
// constant so this verifies engine/boost behavior rather than top-speed force
// balance, which is measured separately.
const limiterCycles = [30, 60, 120].flatMap(fps => profiles.map(profile => {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
    const player = createDefaultPlayerVehicleState(config.accelSpeed, profile, config.accelSpeed);
    player.gearIndex = profile.gears.length - 1;
    let fuelCutFrames = 0;
    let maxRpm = player.rpm;
    let minRpmDuringCut = Infinity;
    let maxBoost = player.boostRatio;
    let minBoostDuringCut = Infinity;
    for (let frame = 0; frame < fps * 4; frame++) {
        player.speed = config.accelSpeed;
        updatePlayerVehicle(player, input, road, config, 1 / fps);
        maxRpm = Math.max(maxRpm, player.rpm);
        maxBoost = Math.max(maxBoost, player.boostRatio);
        if (player.fuelCutActive) {
            fuelCutFrames += 1;
            minRpmDuringCut = Math.min(minRpmDuringCut, player.rpm);
            minBoostDuringCut = Math.min(minBoostDuringCut, player.boostRatio);
        }
    }
    assert.ok(fuelCutFrames > 0, `${profile.displayName} terminal gear must enter its limiter`);
    assert.ok(maxRpm >= profile.fuelCutStartRpm - 1, `${profile.displayName} must reach limiter entry RPM within numerical tolerance`);
    assert.ok(minRpmDuringCut < profile.fuelCutStartRpm - 100, `${profile.displayName} limiter must pull RPM below its entry threshold`);
    if (profile.induction !== 'na') {
        assert.ok(minBoostDuringCut < maxBoost - 0.02, `${profile.displayName} fuel cut must unload turbo pressure`);
    }
    return { vehicle: profile.displayName, fps, fuelCutFrames, maxRpm, minRpmDuringCut, maxBoost, minBoostDuringCut };
}));

// A stationary engine operating point exposes accidental double integration.
for (const profile of [single, twin]) {
    for (const fps of [30, 60, 120]) {
        const config = { ...createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile),
            engineAcceleration: 0, rollingResistance: 0, aeroDrag: 0, rpmResponse: 0 };
        const player = createDefaultPlayerVehicleState(760 * 0.55, profile, 760);
        Object.assign(player, { rpm: 5200, boostRatio: 0.25, primaryBoostRatio: 0.25, secondaryBoostRatio: 0.15 });
        const target = getEngineBoostTargets(profile, 5200, 1, 0, 0, 0.55);
        const expected = advanceEngineBoost(profile, player, target, 1 / fps);
        updatePlayerVehicle(player, input, road, config, 1 / fps);
        assert.ok(Math.abs(player.boostRatio - expected.boostRatio) < 1e-12, 'boost must advance exactly one dt per controller tick');
    }
}

// Coasting cannot trigger a powered upshift, even beyond the authored envelope.
for (const profile of [single, twin]) {
    const config = createPlayerVehicleRuntimeConfig(new URLSearchParams(), profile);
    const player = createDefaultPlayerVehicleState(760 * 0.99, profile, 760);
    player.gearIndex = profile.gears.length - 2;
    updatePlayerVehicle(player, { ...input, accelPressed: false }, road, config, 1 / 60);
    assert.equal(player.gearIndex, profile.gears.length - 2);
    updatePlayerVehicle(player, input, road, config, 1 / 60);
    assert.equal(player.gearIndex, profile.gears.length - 1);
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'shift-character.json'), JSON.stringify({ pass: true, results, pulses, limiterCycles }, null, 2) + '\n');
console.log('PASS: 30/60/120Hz all gears, limiter cycles, NA high-rev boundary, braking/downshifts, no hunting, lift gate, distinct turbo shift/pressure recovery');
console.log(JSON.stringify(pulses.map(({ samples, ...p }) => p), null, 2));
