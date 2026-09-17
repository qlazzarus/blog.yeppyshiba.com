import assert from 'node:assert/strict';
import {
    createPowertrainFeedbackState,
    derivePowertrainFeedback,
} from '../src/game/powertrainFeedback.ts';

const sample = (overrides = {}) => ({
    fuelCutActive: false,
    gearIndex: 2,
    induction: 'single-turbo',
    primaryBoostRatio: 0.2,
    rpm: 4200,
    secondaryBoostRatio: 0,
    shiftCutRatio: 0,
    throttle: 1,
    totalBoostRatio: 0.2,
    ...overrides,
});
const step = (state, overrides, seconds = 1 / 60) => derivePowertrainFeedback(state, sample(overrides), seconds);
const eventTypes = state => state.events.map(event => event.type);

let single = createPowertrainFeedbackState();
single = step(single, { totalBoostRatio: 0.3 });
single = step(single, { primaryBoostRatio: 0.68, totalBoostRatio: 0.68 });
assert.deepEqual(eventTypes(single), ['single-kick']);
const firstKickSequence = single.events[0].sequence;
single = step(single, { primaryBoostRatio: 0.8, totalBoostRatio: 0.8 });
assert.deepEqual(eventTypes(single), [], 'held boost must not repeat a kick');
single = step(single, { primaryBoostRatio: 0.4, totalBoostRatio: 0.4 }, 0.5);
single = step(single, { primaryBoostRatio: 0.7, totalBoostRatio: 0.7 }, 0.5);
assert.deepEqual(eventTypes(single), ['single-kick'], 'a kick re-arms only after boost falls below the reset threshold');
assert(single.events[0].sequence > firstKickSequence);
single = step(single, { primaryBoostRatio: 0.9, totalBoostRatio: 0.9, shiftCutRatio: 0.2 });
assert.deepEqual(eventTypes(single), [], 'shift torque cut cannot manufacture a turbo kick');

let twin = createPowertrainFeedbackState();
twin = step(twin, { induction: 'twin-turbo', primaryBoostRatio: 0.7, secondaryBoostRatio: 0.04, totalBoostRatio: 0.57 });
twin = step(twin, { induction: 'twin-turbo', primaryBoostRatio: 0.72, secondaryBoostRatio: 0.11, totalBoostRatio: 0.6 });
assert.deepEqual(eventTypes(twin), ['twin-stage']);
twin = step(twin, { induction: 'twin-turbo', primaryBoostRatio: 0.73, secondaryBoostRatio: 0.07, totalBoostRatio: 0.61 });
assert.deepEqual(eventTypes(twin), [], 'secondary hysteresis prevents threshold flicker');
twin = step(twin, { induction: 'twin-turbo', primaryBoostRatio: 0.7, secondaryBoostRatio: 0.04, totalBoostRatio: 0.57 });
twin = step(twin, { induction: 'twin-turbo', primaryBoostRatio: 0.75, secondaryBoostRatio: 0.12, totalBoostRatio: 0.62 });
assert.deepEqual(eventTypes(twin), ['twin-stage']);

let lift = createPowertrainFeedbackState();
lift = step(lift, { totalBoostRatio: 0.75, throttle: 1 });
lift = step(lift, { totalBoostRatio: 0.7, throttle: 0 });
assert.deepEqual(eventTypes(lift), ['lift']);
lift = step(lift, { totalBoostRatio: 0.5, throttle: 0 });
assert.deepEqual(eventTypes(lift), [], 'held lift must not repeat blow-off');
lift = step(lift, { totalBoostRatio: 0.5, throttle: 1 });
lift = step(lift, { totalBoostRatio: 0.45, throttle: 0 });
assert.deepEqual(eventTypes(lift), ['lift'], 'throttle application rearms lift feedback');

let drivetrain = createPowertrainFeedbackState();
drivetrain = step(drivetrain, { induction: 'na', gearIndex: 2, totalBoostRatio: 0 });
drivetrain = step(drivetrain, { induction: 'na', gearIndex: 3, totalBoostRatio: 0 });
assert.deepEqual(eventTypes(drivetrain), ['shift']);
drivetrain = step(drivetrain, { induction: 'na', gearIndex: 3, fuelCutActive: true, totalBoostRatio: 0 });
assert.deepEqual(eventTypes(drivetrain), ['fuel-cut']);
drivetrain = step(drivetrain, { induction: 'na', gearIndex: 3, fuelCutActive: true, totalBoostRatio: 0 });
assert.deepEqual(eventTypes(drivetrain), [], 'fuel-cut entry is a one-shot event');

console.log('PASS: single kick re-arm/cooldown, twin-stage hysteresis, lift re-arm, actual shift and fuel-cut events');
