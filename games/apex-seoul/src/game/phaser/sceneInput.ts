import Phaser from 'phaser';
import { mergeDriveCommands, type DriveCommand } from '../core/driveCommand';

export type { DriveCommand } from '../core/driveCommand';

export type SceneHotkeys = {
    exportTelemetry: boolean;
    restart: boolean;
    toggleDebugHud: boolean;
    toggleLongitudinalAb: boolean;
};

type KeyState = { isDown: boolean };

export type SceneKeyboardBindings = {
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    keys: Record<'a' | 'b' | 'd' | 'e' | 'l' | 'q' | 'r' | 's' | 'space' | 'w', Phaser.Input.Keyboard.Key>;
};

export function createSceneKeyboardBindings(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
): SceneKeyboardBindings {
    return {
        cursors: keyboard.createCursorKeys(),
        keys: {
            a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            b: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
            d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            l: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            q: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            r: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
            s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        },
    };
}

export function readDriveCommand(input: {
    accel: KeyState;
    brake: KeyState;
    steerLeft: KeyState;
    steerRight: KeyState;
}): DriveCommand {
    return mergeDriveCommands([{
        accelPressed: input.accel.isDown,
        brakePressed: input.brake.isDown,
        steerAxis: axis(input.steerRight.isDown, input.steerLeft.isDown),
    }]);
}

export function readSceneHotkeys(input: {
    exportTelemetry: boolean;
    restart: boolean;
    toggleDebugHud: boolean;
    toggleLongitudinalAb: boolean;
}): SceneHotkeys {
    return input;
}

function axis(positive: boolean, negative: boolean): -1 | 0 | 1 {
    return (Number(positive) - Number(negative)) as -1 | 0 | 1;
}
