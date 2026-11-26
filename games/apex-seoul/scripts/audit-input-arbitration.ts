import assert from 'node:assert/strict';
import { arbitrateDriveCommand } from '../src/game/phaser/arbitrateDriveCommand';

const keyboard = { steerAxis: 1, accelPressed: true, brakePressed: false };
const virtual = { steerAxis: -1, accelPressed: false, brakePressed: true };
const motion = { steerAxis: -1, accelPressed: false, brakePressed: false };

for (const mode of ['full', 'pedals', 'hidden'] as const) {
    assert.deepEqual(arbitrateDriveCommand(mode, keyboard, virtual, motion), {
        steerAxis: 1, accelPressed: true, brakePressed: true,
    });
}
keyboard.steerAxis = -1;
virtual.steerAxis = 1;
motion.steerAxis = 0.375;
assert.equal(arbitrateDriveCommand('full', keyboard, virtual, motion).steerAxis, -1);
assert.equal(arbitrateDriveCommand('pedals', keyboard, virtual, motion).steerAxis, -1);

keyboard.steerAxis = 0;
keyboard.accelPressed = false;
for (const [mode, expectedAxis] of [['pedals', 0.375], ['full', 1], ['hidden', 0]] as const) {
    assert.deepEqual(arbitrateDriveCommand(mode, keyboard, virtual, motion), {
        steerAxis: expectedAxis, accelPressed: false, brakePressed: true,
    });
}
motion.steerAxis = 0;
assert.equal(arbitrateDriveCommand('pedals', keyboard, virtual, motion).steerAxis, 0);
motion.accelPressed = true;
virtual.brakePressed = false;
assert.deepEqual(arbitrateDriveCommand('full', keyboard, virtual, motion), {
    steerAxis: 1, accelPressed: true, brakePressed: false,
});
console.log('PASS: keyboard priority, release to current mode, neutral motion, independent pedals');
