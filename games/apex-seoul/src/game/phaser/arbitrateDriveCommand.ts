import type { DriveCommand } from '../core/driveCommand';
import type { VirtualDriveControlsMode } from './virtualDriveControls';

export function arbitrateDriveCommand(
    mode: VirtualDriveControlsMode,
    keyboard: DriveCommand,
    virtual: DriveCommand,
    motion: DriveCommand,
): DriveCommand {
    let steerAxis = keyboard.steerAxis;
    if (steerAxis === 0) {
        if (mode === 'full') steerAxis = virtual.steerAxis;
        if (mode === 'pedals') steerAxis = motion.steerAxis;
    }
    return {
        accelPressed: keyboard.accelPressed || virtual.accelPressed || motion.accelPressed,
        brakePressed: keyboard.brakePressed || virtual.brakePressed || motion.brakePressed,
        steerAxis,
    };
}
