import Phaser from 'phaser';

import type { FarmInputKeys } from './playerControlSystem';

type CameraControlSystemConfig = {
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    readonly keys: FarmInputKeys;
    readonly speedPxPerSec: number;
    readonly worldSize: Phaser.Math.Vector2;
};

export class CameraControlSystem {
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private readonly keys: FarmInputKeys;
    private readonly speedPxPerSec: number;
    private readonly worldSize: Phaser.Math.Vector2;

    constructor(config: CameraControlSystemConfig) {
        this.camera = config.camera;
        this.cursors = config.cursors;
        this.keys = config.keys;
        this.speedPxPerSec = config.speedPxPerSec;
        this.worldSize = config.worldSize;
    }

    update(deltaSec: number) {
        const pan = new Phaser.Math.Vector2(0, 0);

        if (this.cursors.left.isDown || this.keys.left.isDown) pan.x -= 1;
        if (this.cursors.right.isDown || this.keys.right.isDown) pan.x += 1;
        if (this.cursors.up.isDown || this.keys.up.isDown) pan.y -= 1;
        if (this.cursors.down.isDown) pan.y += 1;

        if (pan.lengthSq() <= 0) return;

        pan.normalize().scale(this.speedPxPerSec * deltaSec);

        const viewWidth = this.camera.width / this.camera.zoom;
        const viewHeight = this.camera.height / this.camera.zoom;
        const maxScrollX = Math.max(0, this.worldSize.x - viewWidth);
        const maxScrollY = Math.max(0, this.worldSize.y - viewHeight);

        this.camera.setScroll(
            Phaser.Math.Clamp(this.camera.scrollX + pan.x, 0, maxScrollX),
            Phaser.Math.Clamp(this.camera.scrollY + pan.y, 0, maxScrollY),
        );
    }
}
