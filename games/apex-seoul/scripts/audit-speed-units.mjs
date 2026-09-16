import assert from 'node:assert/strict';
import {
    getDisplaySpeedKmh, getGearRpm, RAVEN_COUPE_ENGINE_PROFILE,
    SEORIN_GT_ENGINE_PROFILE, MIRAE_GT_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import { createDefaultPlayerVehicleState, updatePlayerVehicle } from '../src/game/playerVehicleController.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';
import { getLongitudinalWorldTravelSpeed } from '../src/game/longitudinalProgression.ts';

const profiles = [RAVEN_COUPE_ENGINE_PROFILE, SEORIN_GT_ENGINE_PROFILE, MIRAE_GT_ENGINE_PROFILE];
for (const kmh of [0, 5, 30, 60, 100, 130, 185, 225]) {
    const speed = 760 * kmh / 225;
    for (const profile of profiles) {
        assert.ok(Math.abs(getDisplaySpeedKmh(speed, 760, profile) - kmh) < 1e-9);
        // Same indicated speed must describe the same course travel per second.
        assert.ok(Math.abs(getLongitudinalWorldTravelSpeed(speed, 2) - kmh * 1520 / 225) < 1e-9);
    }
}
assert.equal(getDisplaySpeedKmh(380, 760, { ...SEORIN_GT_ENGINE_PROFILE, displayTopSpeedKmh: 300 }), 112.5);
assert.equal(getDisplaySpeedKmh(-1, 760, profiles[0]), 0);
assert.equal(getDisplaySpeedKmh(800, 760, profiles[0]), 225);
// Raven's physical drivetrain calibration is preserved at 100 km/h in third.
assert.ok(Math.abs(getGearRpm(profiles[0], 2, 100 / 225) - (100 / 3.6 / 1.964 * 60 * 1.541 * 4.1)) < 1e-9);

// Neutral road debt defines outside independently of steering-assist internals.
// Corrective input must oppose it and must not receive outside-steer scrub.
for (const profile of profiles) {
    for (const curve of [-0.45, 0.45]) {
        const config = createPlayerControllerBaselineConfig({ engineProfile: profile });
        const makePlayer = () => createDefaultPlayerVehicleState(760 * 130 / 225, profile, 760);
        const neutral = makePlayer();
        const context = { currentCurve: curve, slopeAcceleration: 0, longitudinalScale: 2 };
        updatePlayerVehicle(neutral, { accelPressed: true, brakePressed: false, steerAxis: 0 }, context, config, 1 / 60);
        const outsideDirection = Math.sign(neutral.vehicleHeadingError);
        assert.equal(outsideDirection, -Math.sign(curve));
        const inside = makePlayer();
        const outside = makePlayer();
        for (let frame = 0; frame < 24; frame += 1) {
            for (const [player, steerAxis] of [[inside, -outsideDirection], [outside, outsideDirection]]) {
                updatePlayerVehicle(player, { accelPressed: true, brakePressed: false, steerAxis }, context, config, 1 / 60);
            }
        }
        assert.equal(inside.gripCounterRoadRatio, 0);
        assert.ok(outside.gripCounterRoadRatio > 0);
        assert.ok(outsideDirection * inside.vehicleHeadingError < outsideDirection * outside.vehicleHeadingError);
    }
}
console.log('PASS: shared speed units, target independence, Raven RPM, and three-vehicle mirrored correction/scrub');
