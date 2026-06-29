import Phaser from 'phaser';
import './styles.css';
import genesisG70VehicleAtlas from '../assets/vehicles/approved/atlases/genesis-g70-poc-128.json';
import genesisG70VehicleSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128.png';
import {
    createDefaultCamera,
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';
import {
    createBugakRidgeDownhillTrack,
    getRoadElevationAt,
    wrapDistance,
    type RoadTrack,
} from './game/road';
import { ELEVATION_VISUAL_SCALE, renderRoad, type RoadRenderStats } from './game/roadRenderer';

const CAMERA_INPUT_RESPONSE = 14;
const CAMERA_LATERAL_SPEED = 820;
const CAMERA_BASE_FOV = 69;
const CAMERA_FOV_RESPONSE = 1.25;
const CAMERA_SPEED_FOV_BONUS = 2.4;
const ENABLE_DEBUG_CAMERA_CONTROLS = false;
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
const PLAYER_SCREEN_ANCHOR_RATIO = 0.88;
const PLAYER_SCREEN_ANCHOR_RESPONSE = 0.18;
const PLAYER_SHADOW_MAX_ALPHA = 0.32;
const PLAYER_STEER_ACCELERATION = 1500;
const PLAYER_STEER_DAMPING = 7.8;
const PLAYER_VEHICLE_TEXTURE_KEY = 'player-vehicle-genesis-g70-poc';
const PLAYER_VEHICLE_VIEWPORT_RATIO = 0.34;
const PLAYER_VEHICLE_MIN_SIZE = 220;
const PLAYER_VEHICLE_MAX_SIZE = 360;
const PLAYER_VEHICLE_ROTATION_DEG = 3.5;
const PLAYER_STEER_WEAK_THRESHOLD = 0.18;
const PLAYER_STEER_STRONG_THRESHOLD = 0.55;
const PLAYER_TERRAIN_CUE_THRESHOLD = 24;
const PLAYER_TERRAIN_ANCHOR_Y_BIAS = 0.06;

type RuntimeTuning = {
    cameraBaseFov: number;
    cameraSpeedFovBonus: number;
    playerRoadAnchorDistance: number;
    playerScreenAnchorRatio: number;
    playerScreenAnchorResponse: number;
    steerStrongThreshold: number;
    steerWeakThreshold: number;
    terrainCueThreshold: number;
    terrainYOffsetRatio: number;
    vehicleMaxSize: number;
    vehicleMinSize: number;
    vehicleRotationDeg: number;
    vehicleViewportRatio: number;
};

const RUNTIME_TUNING = createRuntimeTuning();

type PlayerSteeringStateId =
    | 'center'
    | 'steer-left-1'
    | 'steer-left-2'
    | 'steer-right-1'
    | 'steer-right-2';

type VehicleAtlasFrame = {
    frame: {
        h: number;
        w: number;
        x: number;
        y: number;
    };
    origin: {
        x: number;
        y: number;
    };
};

type VehicleAtlas = {
    apex: {
        steeringStates: Record<PlayerSteeringStateId, {
            flipX: boolean;
            frame: string;
        }>;
        targetCellSize: number;
    };
    frames: Record<string, VehicleAtlasFrame>;
};

const PLAYER_VEHICLE_ATLAS = genesisG70VehicleAtlas as VehicleAtlas;

type VehicleTerrainCue = 'downhill' | 'level' | 'uphill';

type PlayerVehicleState = {
    lateralOffset: number;
    speed: number;
    steering: number;
    steeringVelocity: number;
};

type VehicleAnchor = {
    elevationDelta: number;
    scale: number;
    terrainCue: VehicleTerrainCue;
    x: number;
    y: number;
};

class ApexSeoulScene extends Phaser.Scene {
    private cameraResource: Pseudo3dCamera = createDefaultCamera();
    private cameraFov = RUNTIME_TUNING.cameraBaseFov;
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
    private roadTrack: RoadTrack = createBugakRidgeDownhillTrack();

    constructor() {
        super('apex-seoul');
    }

    preload() {
        this.load.spritesheet(PLAYER_VEHICLE_TEXTURE_KEY, genesisG70VehicleSpriteUrl, {
            frameHeight: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
            frameWidth: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
        });
    }

    create() {
        this.cameraResource.fovDegrees = RUNTIME_TUNING.cameraBaseFov;
        this.cameras.main.setBackgroundColor('#11161b');
        this.graphics = this.add.graphics();
        this.playerCar = this.add
            .image(0, 0, PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex('center'))
            .setDepth(6)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
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

        const targetLateralVelocity = ENABLE_DEBUG_CAMERA_CONTROLS
            ? getAxis(this.keys.d.isDown, this.keys.a.isDown) * CAMERA_LATERAL_SPEED
            : 0;
        const targetHeightVelocity = ENABLE_DEBUG_CAMERA_CONTROLS
            ? getAxis(this.keys.w.isDown, this.keys.s.isDown) * 520
            : 0;
        const targetPitchVelocity = ENABLE_DEBUG_CAMERA_CONTROLS
            ? getAxis(this.keys.e.isDown, this.keys.q.isDown) * 260
            : 0;
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
        this.renderPlayerShadow(viewport);
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
                'Apex Seoul - Bugak Ridge Downhill',
                `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
                `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(1)} | z ${camera.z.toFixed(0)}`,
                stats
                    ? `segment ${stats.baseSegmentIndex} | curve ${stats.currentCurve.toFixed(2)} | elevation ${stats.currentElevation.toFixed(0)} | visible ${stats.visibleSegments}`
                    : 'segment -- | curve -- | visible --',
                `speed ${player.speed.toFixed(0)} | car offset ${player.lateralOffset.toFixed(0)} | steer ${player.steering.toFixed(2)} | terrain ${this.getVehicleTerrainCue()}`,
                `sprite ${(RUNTIME_TUNING.vehicleViewportRatio * 100).toFixed(0)}vw | anchor ${RUNTIME_TUNING.playerRoadAnchorDistance.toFixed(0)}z | thresholds ${RUNTIME_TUNING.steerWeakThreshold.toFixed(2)}/${RUNTIME_TUNING.steerStrongThreshold.toFixed(2)}`,
                ENABLE_DEBUG_CAMERA_CONTROLS
                    ? 'Up: accel | Down: brake | Left/Right: steer | WASD: camera | Q/E: pitch'
                    : 'Up: accel | Down: brake | Left/Right: steer | debug camera locked',
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
        const spriteSize = getPlayerVehicleSpriteSize(viewport);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const vehicleFrame = selectPlayerVehicleFrame(player.steering, anchor.terrainCue);
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(vehicleFrame.frame))
            .setFlipX(vehicleFrame.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(anchor.x, anchor.y)
            .setDisplaySize(spriteSize, spriteSize)
            .setRotation(Phaser.Math.DegToRad(player.steering * RUNTIME_TUNING.vehicleRotationDeg));
    }

    private renderPlayerShadow(viewport: Viewport) {
        const spriteSize = getPlayerVehicleSpriteSize(viewport);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const width = spriteSize * Phaser.Math.Linear(0.38, 0.46, speedRatio);
        const height = spriteSize * 0.11;
        const centerY = anchor.y - spriteSize * 0.065;
        const steeringOffset = this.playerVehicle.steering * spriteSize * 0.025;
        const alpha = PLAYER_SHADOW_MAX_ALPHA * Phaser.Math.Clamp(anchor.scale * 13, 0.7, 1);

        this.graphics.fillStyle(0x071013, alpha * 0.92);
        this.graphics.fillEllipse(anchor.x + steeringOffset, centerY, width, height);

        this.graphics.lineStyle(2, 0x11191c, alpha);

        for (let stripe = -3; stripe <= 3; stripe += 1) {
            const stripeY = centerY + stripe * (height / 8);
            const stripeRatio = 1 - Math.abs(stripe) / 4;
            const stripeHalfWidth = (width / 2) * Math.sqrt(Math.max(0, stripeRatio));

            this.graphics.lineBetween(
                anchor.x + steeringOffset - stripeHalfWidth,
                stripeY,
                anchor.x + steeringOffset + stripeHalfWidth,
                stripeY,
            );
        }
    }

    private getVehicleAnchor(viewport: Viewport, spriteSize: number): VehicleAnchor {
        const player = this.playerVehicle;
        const anchorZ = this.cameraResource.z + RUNTIME_TUNING.playerRoadAnchorDistance;
        const currentRoadElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const anchorElevation = getRoadElevationAt(this.roadTrack, anchorZ);
        const elevationDelta = anchorElevation - currentRoadElevation;
        const terrainCue = selectVehicleTerrainCue(elevationDelta);
        const roadAnchor = projectGroundPoint(
            {
                x: player.lateralOffset,
                y: elevationDelta * ELEVATION_VISUAL_SCALE,
                z: anchorZ,
            },
            this.cameraResource,
            viewport,
        );
        const fixedAnchorY = viewport.height * RUNTIME_TUNING.playerScreenAnchorRatio;
        const fallbackY = fixedAnchorY;
        const fallbackX = viewport.width / 2;
        const anchorX = roadAnchor.visible
            ? Phaser.Math.Clamp(roadAnchor.x, spriteSize * 0.35, viewport.width - spriteSize * 0.35)
            : fallbackX;
        const anchorY = roadAnchor.visible
            ? Phaser.Math.Clamp(
                Phaser.Math.Linear(
                    fixedAnchorY,
                    roadAnchor.y + spriteSize * getTerrainAnchorBias(terrainCue),
                    RUNTIME_TUNING.playerScreenAnchorResponse,
                ),
                viewport.height * 0.8,
                viewport.height * 0.95,
            )
            : fallbackY;

        return {
            elevationDelta,
            scale: roadAnchor.scale,
            terrainCue,
            x: anchorX,
            y: anchorY,
        };
    }

    private updateCameraFov(seconds: number) {
        const speedRatio = Phaser.Math.Clamp(
            (this.playerVehicle.speed - PLAYER_CRUISE_SPEED) / (PLAYER_ACCEL_SPEED - PLAYER_CRUISE_SPEED),
            0,
            1,
        );
        const targetFov = RUNTIME_TUNING.cameraBaseFov + speedRatio * RUNTIME_TUNING.cameraSpeedFovBonus;
        const fovBlend = 1 - Math.exp(-CAMERA_FOV_RESPONSE * seconds);

        this.cameraFov = Phaser.Math.Linear(this.cameraFov, targetFov, fovBlend);

        return this.cameraFov;
    }

    private getVehicleTerrainCue() {
        const currentRoadElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const anchorElevation = getRoadElevationAt(
            this.roadTrack,
            this.cameraResource.z + RUNTIME_TUNING.playerRoadAnchorDistance,
        );

        return selectVehicleTerrainCue(anchorElevation - currentRoadElevation);
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

function selectPlayerSteeringState(steering: number): PlayerSteeringStateId {
    if (steering <= -RUNTIME_TUNING.steerStrongThreshold) return 'steer-left-2';
    if (steering <= -RUNTIME_TUNING.steerWeakThreshold) return 'steer-left-1';
    if (steering >= RUNTIME_TUNING.steerStrongThreshold) return 'steer-right-2';
    if (steering >= RUNTIME_TUNING.steerWeakThreshold) return 'steer-right-1';

    return 'center';
}

function selectPlayerVehicleFrame(steering: number, terrainCue: VehicleTerrainCue) {
    const steeringState = selectPlayerSteeringState(steering);
    const fallback = PLAYER_VEHICLE_ATLAS.apex.steeringStates[steeringState];

    if (terrainCue === 'level') return fallback;

    const frameId = getTerrainFrameId(steeringState, terrainCue);

    if (!frameId || !PLAYER_VEHICLE_ATLAS.frames[frameId]) return fallback;

    return {
        flipX: steeringState.startsWith('steer-left'),
        frame: frameId,
    };
}

function getTerrainFrameId(steeringState: PlayerSteeringStateId, terrainCue: Exclude<VehicleTerrainCue, 'level'>) {
    if (steeringState === 'center') return `${terrainCue}-center`;
    if (steeringState.endsWith('-1')) return `${terrainCue}-right-1`;
    if (steeringState.endsWith('-2')) return `${terrainCue}-right-2`;

    return null;
}

function selectVehicleTerrainCue(elevationDelta: number): VehicleTerrainCue {
    if (elevationDelta <= -RUNTIME_TUNING.terrainCueThreshold) return 'downhill';
    if (elevationDelta >= RUNTIME_TUNING.terrainCueThreshold) return 'uphill';

    return 'level';
}

function getTerrainAnchorBias(terrainCue: VehicleTerrainCue) {
    if (terrainCue === 'downhill') return RUNTIME_TUNING.terrainYOffsetRatio + 0.025;
    if (terrainCue === 'uphill') return RUNTIME_TUNING.terrainYOffsetRatio - 0.02;

    return RUNTIME_TUNING.terrainYOffsetRatio;
}

function getPlayerVehicleSpriteSize(viewport: Viewport) {
    return Phaser.Math.Clamp(
        viewport.width * RUNTIME_TUNING.vehicleViewportRatio,
        RUNTIME_TUNING.vehicleMinSize,
        RUNTIME_TUNING.vehicleMaxSize,
    );
}

function getVehicleFrameIndex(frameId: string) {
    const frame = PLAYER_VEHICLE_ATLAS.frames[frameId]?.frame;
    const cellSize = PLAYER_VEHICLE_ATLAS.apex.targetCellSize;

    if (!frame) {
        throw new Error(`Unknown player vehicle frame: ${frameId}`);
    }

    return (frame.y / cellSize) * 3 + frame.x / cellSize;
}

function createRuntimeTuning(): RuntimeTuning {
    const params = new URLSearchParams(window.location.search);
    const weakThreshold = readTuningNumber(
        params,
        'steerWeak',
        PLAYER_STEER_WEAK_THRESHOLD,
        0.05,
        0.45,
    );
    const strongThreshold = readTuningNumber(
        params,
        'steerStrong',
        PLAYER_STEER_STRONG_THRESHOLD,
        weakThreshold + 0.05,
        0.95,
    );

    return {
        cameraBaseFov: readTuningNumber(params, 'fov', CAMERA_BASE_FOV, 58, 82),
        cameraSpeedFovBonus: readTuningNumber(params, 'fovBonus', CAMERA_SPEED_FOV_BONUS, 0, 8),
        playerRoadAnchorDistance: readTuningNumber(
            params,
            'anchorZ',
            PLAYER_ROAD_ANCHOR_DISTANCE,
            420,
            900,
        ),
        playerScreenAnchorRatio: readTuningNumber(
            params,
            'anchorY',
            PLAYER_SCREEN_ANCHOR_RATIO,
            0.82,
            0.94,
        ),
        playerScreenAnchorResponse: readTuningNumber(
            params,
            'anchorResponse',
            PLAYER_SCREEN_ANCHOR_RESPONSE,
            0,
            0.3,
        ),
        steerStrongThreshold: strongThreshold,
        steerWeakThreshold: weakThreshold,
        terrainCueThreshold: readTuningNumber(
            params,
            'terrainThreshold',
            PLAYER_TERRAIN_CUE_THRESHOLD,
            4,
            80,
        ),
        terrainYOffsetRatio: readTuningNumber(
            params,
            'terrainBias',
            PLAYER_TERRAIN_ANCHOR_Y_BIAS,
            0,
            0.14,
        ),
        vehicleMaxSize: readTuningNumber(params, 'carMax', PLAYER_VEHICLE_MAX_SIZE, 160, 520),
        vehicleMinSize: readTuningNumber(params, 'carMin', PLAYER_VEHICLE_MIN_SIZE, 120, 420),
        vehicleRotationDeg: readTuningNumber(params, 'carRoll', PLAYER_VEHICLE_ROTATION_DEG, 0, 8),
        vehicleViewportRatio: readTuningNumber(
            params,
            'carScale',
            PLAYER_VEHICLE_VIEWPORT_RATIO,
            0.2,
            0.48,
        ),
    };
}

function readTuningNumber(
    params: URLSearchParams,
    key: string,
    fallback: number,
    min: number,
    max: number,
) {
    const rawValue = params.get(key);

    if (rawValue === null) return fallback;

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) return fallback;

    return Phaser.Math.Clamp(parsed, min, max);
}
