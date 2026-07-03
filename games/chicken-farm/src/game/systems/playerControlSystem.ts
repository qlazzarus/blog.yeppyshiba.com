import Phaser from 'phaser';

import { POC_FIXED_PLAYER_SLOT_ID } from '../config';
import type { PlayerStart } from '../ecs/components';

export type FarmInputKeys = Record<
    | 'a'
    | 'b'
    | 'c'
    | 'down'
    | 'escape'
    | 'f'
    | 'h'
    | 'left'
    | 'one'
    | 'right'
    | 's'
    | 't'
    | 'two'
    | 'three'
    | 'four'
    | 'five'
    | 'six'
    | 'seven'
    | 'shift'
    | 'eight'
    | 'grid'
    | 'microPathingFocus'
    | 'stop'
    | 'terrainOverlay'
    | 'telemetryExport'
    | 'up'
    | 'x',
    Phaser.Input.Keyboard.Key
>;

type PlayerControlSystemConfig = {
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly keys: FarmInputKeys;
    readonly onPlayerStartChanged: (start: PlayerStart) => void;
    readonly playerStarts: readonly PlayerStart[];
    readonly scene: Phaser.Scene;
    readonly showDebugMarker?: boolean;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
};

export class PlayerControlSystem {
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly keys: FarmInputKeys;
    private readonly onPlayerStartChanged: (start: PlayerStart) => void;
    private readonly playerStarts: readonly PlayerStart[];
    private readonly scene: Phaser.Scene;
    private readonly showDebugMarker: boolean;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private playerSlotText?: Phaser.GameObjects.Text;
    private playerObject?: Phaser.GameObjects.Container;
    private startLabel = 'P?';

    constructor(config: PlayerControlSystemConfig) {
        this.camera = config.camera;
        this.keys = config.keys;
        this.onPlayerStartChanged = config.onPlayerStartChanged;
        this.playerStarts = config.playerStarts;
        this.scene = config.scene;
        this.showDebugMarker = config.showDebugMarker ?? true;
        this.worldObjects = config.worldObjects;
    }

    get player() {
        return this.playerObject;
    }

    get playerStartLabel() {
        return this.startLabel;
    }

    moveToDebugPoint(label: string, x: number, y: number) {
        if (!this.playerObject) return;

        this.playerObject.setPosition(x, y);
        this.startLabel = label;
        this.playerSlotText?.setText(`${label} PLAYER`);
        this.camera.centerOn(x, y);
        this.onPlayerStartChanged({ id: 0, label, x, y });
    }

    createAtConfiguredStart() {
        if (!this.playerStarts.length) return;

        const start =
            (POC_FIXED_PLAYER_SLOT_ID
                ? this.getPlayerStartById(POC_FIXED_PLAYER_SLOT_ID)
                : null) ??
            this.playerStarts[
                Phaser.Math.Between(0, Math.max(0, this.playerStarts.length - 1))
            ];
        this.createPlayerMarker();
        this.moveToStart(start);
    }

    updateSlotHotkeys() {
        const slotKeys = [
            this.keys.one,
            this.keys.two,
            this.keys.three,
            this.keys.four,
            this.keys.five,
            this.keys.six,
            this.keys.seven,
            this.keys.eight,
        ];

        slotKeys.forEach((key, index) => {
            if (!Phaser.Input.Keyboard.JustDown(key)) return;

            const start = this.playerStarts.find(
                (candidate) => candidate.id === index + 1,
            );
            if (start) this.moveToStart(start);
        });
    }

    private getPlayerStartById(id: number) {
        return this.playerStarts.find((start) => start.id === id) ?? null;
    }

    private createPlayerMarker() {
        const shadow = this.scene.add
            .ellipse(0, 9, 34, 14, 0x050805, 0.48)
            .setDepth(10);
        const selection = this.scene.add
            .ellipse(0, 12, 42, 20)
            .setStrokeStyle(2, 0x36d95e, 0.92)
            .setDepth(11);
        const body = this.scene.add.circle(0, 0, 12, 0xe8d2a0, 1).setDepth(12);
        const cap = this.scene.add.rectangle(0, -9, 18, 8, 0x6b4328, 1).setDepth(13);
        const nose = this.scene.add
            .triangle(13, 0, 0, -4, 8, 0, 0, 4, 0xd88a3d, 1)
            .setDepth(13);
        const hpBack = this.scene.add
            .rectangle(0, -25, 38, 5, 0x101010, 0.9)
            .setDepth(14);
        const hpFill = this.scene.add
            .rectangle(0, -25, 34, 3, 0x44d35f, 1)
            .setDepth(15);
        const label = this.scene.add
            .text(0, 23, '', {
                backgroundColor: 'rgba(16, 16, 16, 0.74)',
                color: '#f7e89a',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setDepth(16)
            .setOrigin(0.5);

        this.playerSlotText = label;
        this.playerObject = this.scene.add.container(0, 0, [
            shadow,
            selection,
            body,
            cap,
            nose,
            hpBack,
            hpFill,
            label,
        ]);
        this.playerObject.setDepth(20);
        this.playerObject.setVisible(this.showDebugMarker);
        this.worldObjects.push(this.playerObject);
    }

    private moveToStart(start: PlayerStart) {
        if (!this.playerObject) return;

        this.playerObject.setPosition(start.x, start.y);
        this.startLabel = start.label;
        this.playerSlotText?.setText(`${start.label} PLAYER`);
        this.camera.centerOn(start.x, start.y);
        this.onPlayerStartChanged(start);
    }
}
