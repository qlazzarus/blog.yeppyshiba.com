import assert from 'node:assert/strict';
import {
    advanceEngineBoost, getEngineBoostTargets, getTorqueScale,
    RAVEN_COUPE_ENGINE_PROFILE as na, MIRAE_GT_ENGINE_PROFILE as single,
    SEORIN_GT_ENGINE_PROFILE as twin,
} from '../src/game/engineProfile.ts';
import { createGameplayHudState, formatGameplayTime } from '../src/game/gameplayHudState.ts';
import { createDefaultPlayerVehicleState } from '../src/game/playerVehicleController.ts';

const zero = () => ({ boostRatio: 0, primaryBoostRatio: 0, secondaryBoostRatio: 0 });
function spool(profile, rpm, duration, fps = 60, throttle = 1, initial = zero(), brake = 0) {
    let state = initial;
    const target = getEngineBoostTargets(profile, rpm, throttle, brake, 0, 0.5);
    for (let i = 0; i < Math.round(duration * fps); i++) state = advanceEngineBoost(profile, state, target, 1 / fps);
    return state;
}
const earlyTwin = spool(twin, 3300, 0.5);
const earlySingle = spool(single, 3300, 0.5);
assert(earlyTwin.primaryBoostRatio > earlySingle.primaryBoostRatio + 0.4, 'small primary responds before large single');
assert.equal(earlyTwin.secondaryBoostRatio, 0, 'secondary remains asleep below its RPM range');
const twinHigh = spool(twin, 5200, 0.5);
assert(twinHigh.primaryBoostRatio > twinHigh.secondaryBoostRatio + 0.08, 'independent stage inertia');
assert(twinHigh.secondaryBoostRatio > 0.5, 'secondary comes online at high RPM');
assert(spool(single, 5200, 2).boostRatio > spool(single, 5200, 0.2).boostRatio + 0.4, 'single has a perceptible spool delay');
assert.deepEqual(spool(na, 6500, 1, 60, 1, twinHigh), zero(), 'NA clears all boost state');
assert(getTorqueScale(na, 6400) > getTorqueScale(na, 3000) * 2, 'NA rewards high revs');
for (const profile of [single, twin]) {
    const full = spool(profile, 5200, 2);
    const lift = spool(profile, 5200, 0.4, 60, 0, full);
    assert(lift.boostRatio < full.boostRatio && lift.boostRatio > 0, 'pressure decays after lift');
    assert(spool(profile, 5200, 0.4, 60, 1, lift).boostRatio > lift.boostRatio, 'reapply recovers pressure');
    assert(spool(profile, 5200, 0.4, 60, 1, full, 1).boostRatio < full.boostRatio, 'brake vents boost');
    assert(spool(profile, 5200, 2, 60, 0.25).boostRatio < full.boostRatio * 0.3, 'partial throttle controls boost target');
    for (const fps of [30, 120]) {
        const other = spool(profile, 5200, 2, fps);
        assert(Math.abs(other.boostRatio - full.boostRatio) < 1e-10, 'held-target frame independence');
    }
    assert(full.boostRatio <= 1 && full.boostRatio >= 0, 'no double boost torque');
}
for (const [profile, count] of [[na, 0], [single, 1], [twin, 2]]) {
    const player = createDefaultPlayerVehicleState(0, profile, 760);
    Object.assign(player, { rpm: 5200, primaryBoostRatio: 0.81, secondaryBoostRatio: 0.37 });
    const hud = createGameplayHudState(profile, player, 760, {
        elapsedSec: 61.25, passedCheckpoints: 1, checkpointTimesSec: [30, null, null],
    });
    assert.equal(hud.boostRatios.length, count);
    if (count === 2) assert.deepEqual(hud.boostRatios, [0.81, 0.37]);
    assert.equal(hud.speedKmh, 0);
    assert.equal(hud.gearLabel, '1');
    assert.equal(hud.rpm, 5200);
}
assert.equal(formatGameplayTime(61.259), '01:01.25');
assert.equal(formatGameplayTime(59.999), '00:59.99');
assert.equal(formatGameplayTime(60), '01:00.00');
console.log('PASS: induction response, independent twin stages, lift/reapply/brake, frame invariance, HUD variants and time formatting');
console.table({ earlyTwin, earlySingle, twinHigh });
