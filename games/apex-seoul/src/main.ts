import Phaser from 'phaser';
import './styles.css';
import {
    createDefaultCamera,
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';

const ROAD_HALF_WIDTH = 960;
const RUMBLE_WIDTH = 130;
const LANE_MARK_WIDTH = 18;
const SEGMENT_LENGTH = 240;
const DRAW_SEGMENTS = 56;
const CAMERA_SCROLL_SPEED = 440;

class ApexSeoulScene extends Phaser.Scene {
    private cameraResource: Pseudo3dCamera = createDefaultCamera();
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private graphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'd' | 'e' | 'q' | 's' | 'w', Phaser.Input.Keyboard.Key>;

    constructor() {
        super('apex-seoul');
    }

    create() {
        this.cameras.main.setBackgroundColor('#11161b');
        this.graphics = this.add.graphics();
        this.hudText = this.add
            .text(20, 18, '', {
                color: '#eef2f3',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
                lineSpacing: 5,
            })
            .setDepth(10);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = {
            a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            e: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        };

        this.scale.on('resize', this.render, this);
        this.render();
    }

    update(_time: number, delta: number) {
        const seconds = delta / 1000;
        const camera = this.cameraResource;

        camera.z += CAMERA_SCROLL_SPEED * seconds;

        if (this.cursors.left.isDown || this.keys.a.isDown) {
            camera.lateralOffset -= 820 * seconds;
        }
        if (this.cursors.right.isDown || this.keys.d.isDown) {
            camera.lateralOffset += 820 * seconds;
        }
        if (this.cursors.up.isDown || this.keys.w.isDown) {
            camera.height += 520 * seconds;
        }
        if (this.cursors.down.isDown || this.keys.s.isDown) {
            camera.height -= 520 * seconds;
        }
        if (this.keys.q.isDown) {
            camera.pitch -= 260 * seconds;
        }
        if (this.keys.e.isDown) {
            camera.pitch += 260 * seconds;
        }

        camera.height = Phaser.Math.Clamp(camera.height, 360, 1800);
        camera.pitch = Phaser.Math.Clamp(camera.pitch, -180, 180);
        camera.lateralOffset = Phaser.Math.Clamp(camera.lateralOffset, -1400, 1400);

        this.render();
    }

    private render() {
        const viewport = this.getViewport();
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.clear();
        this.drawBackground(viewport, horizonY);
        this.drawProjectedGround(viewport);
        this.drawProjectionGuides(viewport);
        this.renderHud();
    }

    private getViewport(): Viewport {
        return {
            height: this.scale.height,
            width: this.scale.width,
        };
    }

    private drawBackground(viewport: Viewport, horizonY: number) {
        this.graphics.fillStyle(0x8eb7ca, 1);
        this.graphics.fillRect(0, 0, viewport.width, Math.max(0, horizonY));
        this.graphics.fillStyle(0xd7c9a3, 1);
        this.graphics.fillRect(0, horizonY - 18, viewport.width, 18);
        this.graphics.fillStyle(0x263c35, 1);
        this.graphics.fillRect(0, horizonY, viewport.width, viewport.height - horizonY);
    }

    private drawProjectedGround(viewport: Viewport) {
        const camera = this.cameraResource;
        const baseSegment = Math.floor(camera.z / SEGMENT_LENGTH);

        for (let i = DRAW_SEGMENTS; i >= 1; i -= 1) {
            const nearWorldZ = (baseSegment + i) * SEGMENT_LENGTH;
            const farWorldZ = nearWorldZ + SEGMENT_LENGTH;
            const stripeIndex = baseSegment + i;

            const nearLeft = projectGroundPoint(
                { x: -ROAD_HALF_WIDTH, z: nearWorldZ },
                camera,
                viewport,
            );
            const nearRight = projectGroundPoint(
                { x: ROAD_HALF_WIDTH, z: nearWorldZ },
                camera,
                viewport,
            );
            const farLeft = projectGroundPoint(
                { x: -ROAD_HALF_WIDTH, z: farWorldZ },
                camera,
                viewport,
            );
            const farRight = projectGroundPoint(
                { x: ROAD_HALF_WIDTH, z: farWorldZ },
                camera,
                viewport,
            );

            if (!nearLeft.visible || !nearRight.visible || !farLeft.visible || !farRight.visible) {
                continue;
            }

            this.fillQuad(
                farLeft,
                farRight,
                nearRight,
                nearLeft,
                stripeIndex % 2 === 0 ? 0x34383b : 0x303437,
            );

            this.drawRoadShoulder(-1, nearWorldZ, farWorldZ, stripeIndex, viewport);
            this.drawRoadShoulder(1, nearWorldZ, farWorldZ, stripeIndex, viewport);
            this.drawCenterLaneMark(nearWorldZ, farWorldZ, stripeIndex, viewport);
        }
    }

    private drawRoadShoulder(
        side: -1 | 1,
        nearWorldZ: number,
        farWorldZ: number,
        stripeIndex: number,
        viewport: Viewport,
    ) {
        const camera = this.cameraResource;
        const innerX = side * ROAD_HALF_WIDTH;
        const outerX = side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);
        const innerNear = projectGroundPoint({ x: innerX, z: nearWorldZ }, camera, viewport);
        const outerNear = projectGroundPoint({ x: outerX, z: nearWorldZ }, camera, viewport);
        const innerFar = projectGroundPoint({ x: innerX, z: farWorldZ }, camera, viewport);
        const outerFar = projectGroundPoint({ x: outerX, z: farWorldZ }, camera, viewport);

        if (!innerNear.visible || !outerNear.visible || !innerFar.visible || !outerFar.visible) {
            return;
        }

        this.fillQuad(
            innerFar,
            outerFar,
            outerNear,
            innerNear,
            stripeIndex % 2 === 0 ? 0xe7ecef : 0xc73938,
        );
    }

    private drawCenterLaneMark(
        nearWorldZ: number,
        farWorldZ: number,
        stripeIndex: number,
        viewport: Viewport,
    ) {
        if (stripeIndex % 3 !== 0) return;

        const camera = this.cameraResource;
        const nearLeft = projectGroundPoint(
            { x: -LANE_MARK_WIDTH, z: nearWorldZ },
            camera,
            viewport,
        );
        const nearRight = projectGroundPoint(
            { x: LANE_MARK_WIDTH, z: nearWorldZ },
            camera,
            viewport,
        );
        const farLeft = projectGroundPoint(
            { x: -LANE_MARK_WIDTH, z: farWorldZ },
            camera,
            viewport,
        );
        const farRight = projectGroundPoint(
            { x: LANE_MARK_WIDTH, z: farWorldZ },
            camera,
            viewport,
        );

        if (!nearLeft.visible || !nearRight.visible || !farLeft.visible || !farRight.visible) {
            return;
        }

        this.fillQuad(farLeft, farRight, nearRight, nearLeft, 0xf2d266);
    }

    private drawProjectionGuides(viewport: Viewport) {
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.lineStyle(2, 0xf2d266, 0.75);
        this.graphics.lineBetween(0, horizonY, viewport.width, horizonY);

        this.graphics.lineStyle(1, 0xeef2f3, 0.3);
        this.graphics.lineBetween(viewport.width / 2, horizonY, viewport.width / 2, viewport.height);
    }

    private fillQuad(
        a: { x: number; y: number },
        b: { x: number; y: number },
        c: { x: number; y: number },
        d: { x: number; y: number },
        color: number,
    ) {
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();
        this.graphics.moveTo(a.x, a.y);
        this.graphics.lineTo(b.x, b.y);
        this.graphics.lineTo(c.x, c.y);
        this.graphics.lineTo(d.x, d.y);
        this.graphics.closePath();
        this.graphics.fillPath();
    }

    private renderHud() {
        const camera = this.cameraResource;

        this.hudText.setText(
            [
                'Apex Seoul - Pseudo 3D Camera',
                `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
                `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(0)} | z ${camera.z.toFixed(0)}`,
                'Arrow/AWSD: offset + height | Q/E: pitch',
            ].join('\n'),
        );
    }
}

const config: Phaser.Types.Core.GameConfig = {
    backgroundColor: '#101316',
    parent: 'game',
    render: {
        antialias: true,
        pixelArt: false,
    },
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        height: '100%',
        mode: Phaser.Scale.RESIZE,
        width: '100%',
    },
    scene: [ApexSeoulScene],
    type: Phaser.CANVAS,
};

new Phaser.Game(config);
