import assert from 'node:assert/strict';
import {
    MIRAE_GT_ENGINE_PROFILE,
    RAVEN_COUPE_ENGINE_PROFILE,
    SEORIN_GT_ENGINE_PROFILE,
} from '../src/game/engineProfile';
import { createPlayerVehicleRuntimeConfig } from '../src/game/playerVehicleDefaults';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController';
import {
    MIRAE_GT_HANDLING_PROFILE,
    RAVEN_COUPE_HANDLING_PROFILE,
    SEORIN_GT_HANDLING_PROFILE,
} from '../src/game/vehicleHandlingProfile';

const params = new URLSearchParams();
const raven = createPlayerVehicleRuntimeConfig(params, RAVEN_COUPE_ENGINE_PROFILE, RAVEN_COUPE_HANDLING_PROFILE);
const seorin = createPlayerVehicleRuntimeConfig(params, SEORIN_GT_ENGINE_PROFILE, SEORIN_GT_HANDLING_PROFILE);
const mirae = createPlayerVehicleRuntimeConfig(params, MIRAE_GT_ENGINE_PROFILE, MIRAE_GT_HANDLING_PROFILE);

assert.equal(raven.engineProfile, RAVEN_COUPE_ENGINE_PROFILE);
assert.equal(seorin.engineProfile, SEORIN_GT_ENGINE_PROFILE);
assert.equal(mirae.engineProfile, MIRAE_GT_ENGINE_PROFILE);
assert.ok(raven.inputResponse > seorin.inputResponse && raven.inputResponse > mirae.inputResponse,
    'Raven must retain the quickest turn-in response');
assert.ok(seorin.highSpeedSteerForceDrop > raven.highSpeedSteerForceDrop,
    'Seorin must trade turn-in for high-speed stability');
assert.ok(raven.driftBuildRate > seorin.driftBuildRate && raven.driftEntryLateralKick > seorin.driftEntryLateralKick,
    'Raven lift rotation must be easier than Seorin');
assert.ok(mirae.powerExitTractionScale > seorin.powerExitTractionScale &&
    mirae.powerExitBoostThreshold > seorin.powerExitBoostThreshold,
    'Mirae exit recovery must require later, stronger single-turbo boost');

const speed = 760 * 140 / 225;
function recoveryAfterOneFrame(boostRatio: number, powerExitTractionScale: number) {
    const player = createDefaultPlayerVehicleState(speed, MIRAE_GT_ENGINE_PROFILE, mirae.accelSpeed);
    player.boostRatio = boostRatio;
    player.primaryBoostRatio = boostRatio;
    player.driftRatio = 0.6;
    player.driftState = 'recovery';
    player.rpm = 5600;
    player.throttleWasPressed = true;
    updatePlayerVehicle(player, { accelPressed: true, brakePressed: false, steerAxis: 0 }, {
        currentCurve: 0.5, slopeAcceleration: 0, longitudinalScale: 2,
    }, { ...mirae, powerExitTractionScale }, 1 / 60);
    return { boostRatio: player.boostRatio, driftRatio: player.driftRatio };
}

const unboosted = recoveryAfterOneFrame(0.4, MIRAE_GT_HANDLING_PROFILE.powerExitTractionScale);
const boosted = recoveryAfterOneFrame(0.82, MIRAE_GT_HANDLING_PROFILE.powerExitTractionScale);
const boostedWithoutProfile = recoveryAfterOneFrame(0.82, 1);
assert.ok(boosted.driftRatio < unboosted.driftRatio, `Mirae recovery must wait for its boost threshold: ${JSON.stringify({ boosted, unboosted })}`);
assert.ok(boosted.driftRatio < boostedWithoutProfile.driftRatio, `Mirae boosted exit recovery must come from the handling profile: ${boosted.driftRatio} >= ${boostedWithoutProfile.driftRatio}`);

console.log(JSON.stringify({
    pass: true,
    profiles: {
        raven: { inputResponse: raven.inputResponse, driftBuildRate: raven.driftBuildRate },
        seorin: { highSpeedSteerForceDrop: seorin.highSpeedSteerForceDrop, driftBuildRate: seorin.driftBuildRate },
        mirae: { powerExitBoostThreshold: mirae.powerExitBoostThreshold, powerExitTractionScale: mirae.powerExitTractionScale },
    },
    miraeRecovery: { unboosted, boosted, boostedWithoutProfile },
}, null, 2));
