import Phaser from 'phaser';
import './styles.css';
import playerCarRearLeftUrl from '../assets/vehicles/rendered/player-car-rear-left.png';
import playerCarRearRightUrl from '../assets/vehicles/rendered/player-car-rear-right.png';
import playerCarRearUrl from '../assets/vehicles/rendered/player-car-rear.png';
import {
    createDefaultCamera,
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';
import { createTestTrack, wrapDistance, type RoadTrack } from './game/road';
import { renderRoad, type RoadRenderStats } from './game/roadRenderer';

const CAMERA_INPUT_RESPONSE = 14;
const CAMERA_LATERAL_SPEED = 820;
const CAMERA_BASE_FOV = 72;
const CAMERA_FOV_RESPONSE = 1.25;
const CAMERA_SPEED_FOV_BONUS = 2.4;
const PLAYER_ACCELERATION = 185;
const PLAYER_BRAKE_SPEED = 0;
const PLAYER_BRAKING = 260;
const PLAYER_CENTERING_RESPONSE = 1.9;
const PLAYER_CRUISE_SPEED = 440;
const PLAYER_ACCEL_SPEED = 760;
const PLAYER_CRUISE_PULL = 115;
const PLAYER_INPUT_RESPONSE = 12;
const PLAYER_MAX_ROAD_OFFSET = 700;
const PLAYER_ROAD_ANCHOR_DISTANCE = 640;
const PLAYER_STEER_ACCELERATION = 1500;
const PLAYER_STEER_DAMPING = 7.8;

type PlayerVehicleState = {
    lateralOffset: number;
    speed: number;
    steering: number;
    steeringVelocity: number;
};

class ApexSeoulScene extends Phaser.Scene {
    private cameraResource: Pseudo3dCamera = createDefaultCamera();
    private cameraFov = CAMERA_BASE_FOV;
    private cameraVelocity = {
        height: 0,
        lateral: 0,
        pitch: 0,
    };
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private graphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'd' | 'e' | 'q' | 's' | 'w', Phaser.Input.Keyboard.Key>;
    private playerCar!: Phaser.GameObjects.Image;
    private playerVehicle: PlayerVehicleState = {
        lateralOffset: 0,
        speed: PLAYER_CRUISE_SPEED,
        steering: 0,
        steeringVelocity: 0,
    };
    private roadStats: RoadRenderStats | null = null;
    private roadTrack: RoadTrack = createTestTrack();

    constructor() {
        super('apex-seoul');
    }

    preload() {
        this.load.image('player-car-rear', playerCarRearUrl);
        this.load.image('player-car-rear-left', playerCarRearLeftUrl);
        this.load.image('player-car-rear-right', playerCarRearRightUrl);
    }

    create() {
        this.cameras.main.setBackgroundColor('#11161b');
        this.graphics = this.add.graphics();
        this.playerCar = this.add
            .image(0, 0, 'player-car-rear')
            .setDepth(6)
            .setOrigin(0.5, 0.78);
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

        const targetLateralVelocity = getAxis(this.keys.d.isDown, this.keys.a.isDown) * CAMERA_LATERAL_SPEED;
        const targetHeightVelocity = getAxis(this.keys.w.isDown, this.keys.s.isDown) * 520;
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

        this.updatePlayerVehicle(seconds);
        camera.z = wrapDistance(camera.z + this.playerVehicle.speed * seconds, this.roadTrack.length);
        camera.fovDegrees = this.updateCameraFov(seconds);
        this.render();
    }

    private render() {
        const viewport = this.getViewport();
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.clear();
        this.drawBackground(viewport, horizonY);
        this.roadStats = renderRoad(this.graphics, this.roadTrack, this.cameraResource, viewport);
        this.drawProjectionGuides(viewport);
        this.renderPlayerVehicle(viewport);
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
        const player = this.playerVehicle;
        const stats = this.roadStats;

        this.hudText.setText(
            [
                'Apex Seoul - RoadSegment Curve Renderer',
                `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
                `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(1)} | z ${camera.z.toFixed(0)}`,
                stats
                    ? `segment ${stats.baseSegmentIndex} | curve ${stats.currentCurve.toFixed(2)} | visible ${stats.visibleSegments}`
                    : 'segment -- | curve -- | visible --',
                `speed ${player.speed.toFixed(0)} | car offset ${player.lateralOffset.toFixed(0)} | steer ${player.steering.toFixed(2)}`,
                'Up: accel | Down: brake | Left/Right: steer | WASD: camera | Q/E: pitch',
            ].join('\n'),
        );
    }

    private updatePlayerVehicle(seconds: number) {
        this.updatePlayerSpeed(seconds);

        const steerAxis = getAxis(this.cursors.right.isDown, this.cursors.left.isDown);
        const player = this.playerVehicle;
        const centeringForce = -player.lateralOffset * PLAYER_CENTERING_RESPONSE;
        const steeringForce = steerAxis * PLAYER_STEER_ACCELERATION;
        const dampingForce = -player.steeringVelocity * PLAYER_STEER_DAMPING;

        player.steeringVelocity += (steeringForce + centeringForce + dampingForce) * seconds;
        player.lateralOffset += player.steeringVelocity * seconds;
        player.lateralOffset = Phaser.Math.Clamp(
            player.lateralOffset,
            -PLAYER_MAX_ROAD_OFFSET,
            PLAYER_MAX_ROAD_OFFSET,
        );

        if (
            (player.lateralOffset <= -PLAYER_MAX_ROAD_OFFSET && player.steeringVelocity < 0) ||
            (player.lateralOffset >= PLAYER_MAX_ROAD_OFFSET && player.steeringVelocity > 0)
        ) {
            player.steeringVelocity = 0;
        }

        const targetSteering = Phaser.Math.Clamp(
            steerAxis + player.steeringVelocity / PLAYER_STEER_ACCELERATION,
            -1,
            1,
        );
        const steeringBlend = 1 - Math.exp(-PLAYER_INPUT_RESPONSE * seconds);

        player.steering = Phaser.Math.Linear(player.steering, targetSteering, steeringBlend);
    }

    private updatePlayerSpeed(seconds: number) {
        const player = this.playerVehicle;
        const accelPressed = this.cursors.up.isDown;
        const brakePressed = this.cursors.down.isDown;

        if (brakePressed) {
            player.speed = Math.max(PLAYER_BRAKE_SPEED, player.speed - PLAYER_BRAKING * seconds);
        } else if (accelPressed) {
            player.speed = Math.min(PLAYER_ACCEL_SPEED, player.speed + PLAYER_ACCELERATION * seconds);
        } else if (player.speed > PLAYER_CRUISE_SPEED) {
            player.speed = Math.max(PLAYER_CRUISE_SPEED, player.speed - PLAYER_CRUISE_PULL * seconds);
        } else if (player.speed < PLAYER_CRUISE_SPEED) {
            player.speed = Math.min(PLAYER_CRUISE_SPEED, player.speed + PLAYER_CRUISE_PULL * seconds);
        }

        if (brakePressed && player.speed < 2) {
            player.speed = 0;
        }
    }

    private renderPlayerVehicle(viewport: Viewport) {
        const player = this.playerVehicle;
        const steerTexture =
            player.steering < -0.18
                ? 'player-car-rear-left'
                : player.steering > 0.18
                    ? 'player-car-rear-right'
                    : 'player-car-rear';
        const spriteSize = Phaser.Math.Clamp(viewport.width * 0.34, 220, 360);
        const roadAnchor = projectGroundPoint(
            {
                x: player.lateralOffset,
                z: this.cameraResource.z + PLAYER_ROAD_ANCHOR_DISTANCE,
            },
            this.cameraResource,
            viewport,
        );
        const fallbackY = viewport.height * 0.86;
        const fallbackX = viewport.width / 2;
        const anchorX = roadAnchor.visible
            ? Phaser.Math.Clamp(roadAnchor.x, spriteSize * 0.35, viewport.width - spriteSize * 0.35)
            : fallbackX;
        const anchorY = roadAnchor.visible
            ? Phaser.Math.Clamp(roadAnchor.y + spriteSize * 0.1, viewport.height * 0.68, viewport.height * 0.96)
            : fallbackY;

        this.playerCar
            .setTexture(steerTexture)
            .setPosition(anchorX, anchorY)
            .setDisplaySize(spriteSize, spriteSize)
            .setRotation(Phaser.Math.DegToRad(player.steering * 3.5));
    }

    private updateCameraFov(seconds: number) {
        const speedRatio = Phaser.Math.Clamp(
            (this.playerVehicle.speed - PLAYER_CRUISE_SPEED) / (PLAYER_ACCEL_SPEED - PLAYER_CRUISE_SPEED),
            0,
            1,
        );
        const targetFov = CAMERA_BASE_FOV + speedRatio * CAMERA_SPEED_FOV_BONUS;
        const fovBlend = 1 - Math.exp(-CAMERA_FOV_RESPONSE * seconds);

        this.cameraFov = Phaser.Math.Linear(this.cameraFov, targetFov, fovBlend);

        return this.cameraFov;
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
