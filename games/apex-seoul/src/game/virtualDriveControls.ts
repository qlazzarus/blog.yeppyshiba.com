import Phaser from 'phaser';
import { RenderDepth } from './renderDepth';
import type { DriveCommand } from './sceneInput';

type ControlName = 'accel' | 'brake' | 'steerLeft' | 'steerRight';
export type VirtualDriveControlsMode = 'full' | 'pedals' | 'hidden';

type VirtualDriveControls = {
    destroy: () => void;
    getCommand: () => DriveCommand;
    reset: () => void;
    setMode: (mode: VirtualDriveControlsMode, viewport: { height: number; width: number }) => void;
    layout: (viewport: { height: number; width: number }) => void;
};

const BUTTON_FILL = 0x071421;
const BUTTON_ACTIVE_FILL = 0x235980;
const BUTTON_STROKE = 0x8bc9f0;
const BUTTON_ACTIVE_STROKE = 0xffc469;

/**
 * Touch controls deliberately emit the same binary command as the keyboard.
 * This keeps two-finger steering + throttle reliable without coupling Phaser
 * pointer events to the vehicle controller.
 */
export function createVirtualDriveControls(scene: Phaser.Scene): VirtualDriveControls {
    const pressed = new Map<ControlName, Set<number>>();
    const buttons = new Map<ControlName, Phaser.GameObjects.Rectangle>();
    let mode: VirtualDriveControlsMode = 'hidden';

    const makeButton = (name: ControlName, label: string) => {
        pressed.set(name, new Set());
        const background = scene.add.rectangle(0, 0, 1, 1, BUTTON_FILL, 0.72)
            .setStrokeStyle(2, BUTTON_STROKE, 0.82);
        const text = scene.add.text(0, 0, label, {
            color: '#e9f7ff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '27px',
            fontStyle: 'bold',
        }).setDepth(RenderDepth.Hud + 1.01).setOrigin(0.5).setVisible(false);
        background.setDepth(RenderDepth.Hud + 1).setVisible(false);

        const updateStyle = () => {
            const active = (pressed.get(name)?.size ?? 0) > 0;
            background.setFillStyle(active ? BUTTON_ACTIVE_FILL : BUTTON_FILL, active ? 0.9 : 0.72);
            background.setStrokeStyle(2, active ? BUTTON_ACTIVE_STROKE : BUTTON_STROKE, active ? 1 : 0.82);
            text.setColor(active ? '#fff5d7' : '#e9f7ff');
        };
        const release = (pointerId?: number) => {
            const state = pressed.get(name);
            if (!state) return;
            if (pointerId === undefined) state.clear();
            else state.delete(pointerId);
            updateStyle();
        };

        background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (mode === 'hidden') return;
            pressed.get(name)?.add(pointer.id);
            updateStyle();
        });
        background.on('pointerup', (pointer: Phaser.Input.Pointer) => release(pointer.id));
        background.on('pointerout', (pointer: Phaser.Input.Pointer) => release(pointer.id));
        buttons.set(name, background);
        return { background, release, text };
    };

    const controlViews = {
        accel: makeButton('accel', 'GAS'),
        brake: makeButton('brake', 'BRAKE'),
        steerLeft: makeButton('steerLeft', '◀'),
        steerRight: makeButton('steerRight', '▶'),
    };

    const releaseAll = () => {
        for (const name of pressed.keys()) {
            pressed.get(name)?.clear();
            const view = controlViews[name];
            view.background.setFillStyle(BUTTON_FILL, 0.72).setStrokeStyle(2, BUTTON_STROKE, 0.82);
            view.text.setColor('#e9f7ff');
        }
    };
    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
        for (const view of Object.values(controlViews)) view.release(pointer.id);
    };
    scene.input.on('pointerup', onPointerUp);

    const layout = (viewport: { height: number; width: number }) => {
        const size = Phaser.Math.Clamp(viewport.height * 0.15, 74, 112);
        const edge = Phaser.Math.Clamp(viewport.width * 0.036, 28, 54);
        const bottom = Phaser.Math.Clamp(viewport.height * 0.07, 34, 58);
        const place = (
            view: typeof controlViews.accel,
            x: number,
            y: number,
            width: number,
            height: number,
        ) => {
            view.background.setSize(width, height);
            // Recreate Phaser's default rectangle hit area after every size
            // change. It tracks the entire visible button, not its label.
            view.background.removeInteractive().setInteractive({ useHandCursor: false });
            view.background.setPosition(x, y);
            view.text.setPosition(x, y);
        };

        place(controlViews.steerLeft, edge + size / 2, viewport.height - bottom - size / 2, size, size);
        place(controlViews.steerRight, edge + size * 1.62, viewport.height - bottom - size / 2, size, size);
        place(controlViews.brake, viewport.width - edge - size * 1.62, viewport.height - bottom - size / 2, size, size);
        place(controlViews.accel, viewport.width - edge - size / 2, viewport.height - bottom - size / 2, size, size);
    };

    return {
        destroy: () => {
            scene.input.off('pointerup', onPointerUp);
            for (const name of pressed.keys()) {
                buttons.get(name)?.destroy();
                controlViews[name].text.destroy();
            }
        },
        getCommand: () => ({
            accelPressed: (pressed.get('accel')?.size ?? 0) > 0,
            brakePressed: (pressed.get('brake')?.size ?? 0) > 0,
            steerAxis: ((pressed.get('steerRight')?.size ?? 0) > 0 ? 1 : 0) -
                ((pressed.get('steerLeft')?.size ?? 0) > 0 ? 1 : 0),
        }),
        layout,
        reset: releaseAll,
        setMode: (nextMode, viewport) => {
            mode = nextMode;
            releaseAll();
            layout(viewport);
            for (const [name, button] of buttons) {
                const visible = mode === 'full' ||
                    (mode === 'pedals' && (name === 'accel' || name === 'brake'));
                button.setVisible(visible).setActive(visible);
                controlViews[name].background.input!.enabled = visible;
                controlViews[name].text.setVisible(visible).setActive(visible);
            }
        },
    };
}
