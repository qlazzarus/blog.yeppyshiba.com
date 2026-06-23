import Phaser from 'phaser';
import './styles.css';
import {
    createDefaultCamera,
    getHorizonY,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';
import { createTestTrack, wrapDistance, type RoadTrack } from './game/road';
import { renderRoad, type RoadRenderStats } from './game/roadRenderer';

const CAMERA_SCROLL_SPEED = 440;
const CAMERA_INPUT_RESPONSE = 14;

class ApexSeoulScene extends Phaser.Scene {
    private cameraResource: Pseudo3dCamera = createDefaultCamera();
    private cameraVelocity = {
        height: 0,
        lateral: 0,
        pitch: 0,
    };
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private graphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'd' | 'e' | 'q' | 's' | 'w', Phaser.Input.Keyboard.Key>;
    private roadStats: RoadRenderStats | null = null;
    private roadTrack: RoadTrack = createTestTrack();

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

        camera.z = wrapDistance(camera.z + CAMERA_SCROLL_SPEED * seconds, this.roadTrack.length);

        const targetLateralVelocity =
            getAxis(this.cursors.right.isDown || this.keys.d.isDown, this.cursors.left.isDown || this.keys.a.isDown) *
            820;
        const targetHeightVelocity =
            getAxis(this.cursors.up.isDown || this.keys.w.isDown, this.cursors.down.isDown || this.keys.s.isDown) *
            520;
        const targetPitchVelocity = getAxis(this.keys.e.isDown, this.keys.q.isDown) * 260;
        const inputBlend = 1 - Math.exp(-CAMERA_INPUT_RESPONSE * seconds);

        this.cameraVelocity.lateral = Phaser.Math.Linear(
            this.cameraVelocity.lateral,
            targetLateralVelocity,
            inputBlend,
        );
        this.cameraVelocity.height = Phaser.Math.Linear(
            this.cameraVelocity.height,
            targetHeightVelocity,
            inputBlend,
        );
        this.cameraVelocity.pitch = Phaser.Math.Linear(
            this.cameraVelocity.pitch,
            targetPitchVelocity,
            inputBlend,
        );

        camera.lateralOffset += this.cameraVelocity.lateral * seconds;
        camera.height += this.cameraVelocity.height * seconds;
        camera.pitch += this.cameraVelocity.pitch * seconds;

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
        this.roadStats = renderRoad(this.graphics, this.roadTrack, this.cameraResource, viewport);
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

    private drawProjectionGuides(viewport: Viewport) {
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.lineStyle(2, 0xf2d266, 0.75);
        this.graphics.lineBetween(0, horizonY, viewport.width, horizonY);

        this.graphics.lineStyle(1, 0xeef2f3, 0.3);
        this.graphics.lineBetween(viewport.width / 2, horizonY, viewport.width / 2, viewport.height);
    }

    private renderHud() {
        const camera = this.cameraResource;
        const stats = this.roadStats;

        this.hudText.setText(
            [
                'Apex Seoul - RoadSegment Curve Renderer',
                `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
                `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(0)} | z ${camera.z.toFixed(0)}`,
                stats
                    ? `segment ${stats.baseSegmentIndex} | curve ${stats.currentCurve.toFixed(2)} | visible ${stats.visibleSegments}`
                    : 'segment -- | curve -- | visible --',
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

function getAxis(positive: boolean, negative: boolean) {
    return Number(positive) - Number(negative);
}
