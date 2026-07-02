import Phaser from 'phaser';
import './styles.css';
import genesisG70VehicleAtlas from '../assets/vehicles/approved/atlases/genesis-g70-poc-128.json';
import genesisG70VehicleShadowSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png';
import genesisG70VehicleSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128.png';
import {
    createHudText,
    renderHudText,
} from './game/hud';
import {
    createDefaultPlayerVehicleState,
    getCornerIntensity,
    getHighSpeedSteeringRatio,
    updatePlayerVehicle,
    type PlayerVehicleControllerConfig,
} from './game/playerVehicleController';
import {
    createDefaultCamera,
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';
import {
    createRoadTrack,
    getRoadElevationAt,
    parseRoadTrackId,
    wrapDistance,
    type RoadTrack,
} from './game/road';
import {
    ELEVATION_VISUAL_SCALE,
    getRoadCenterOffsetAhead,
    renderRoad,
    type RoadRenderStats,
} from './game/roadRenderer';
import {
    createRoadObjects,
    renderRoadObjects,
    type RoadObject,
    type RoadObjectRenderStats,
} from './game/roadObjectRenderer';
import {
    createRuntimeQaOverrides,
    createRuntimeTelemetryConfig,
    createRuntimeTuning,
    type RuntimeQaOverrides,
    type RuntimeTelemetryConfig,
    type RuntimeTuning,
} from './game/runtimeConfig';
import { RuntimeTelemetryRecorder } from './game/runtimeTelemetry';
import {
    drawShadowContactPatch,
    getContactTerrainCueIntensity,
    getContactTerrainRatio,
    getPlayerVehicleSpriteSize,
    getScreenContactVehicleY,
    getShadowElementCenter,
    getSilhouetteShadowScale,
    getTerrainScaledSpriteSize,
    getTerrainScaleMultiplier,
    getVehicleFrameIndex,
    getVehicleShadowProfile,
    selectContactTerrainCue,
    selectPlayerVehicleFrame,
    selectVehicleTerrainCue,
    type PlayerVehicleState,
    type RuntimeVehicleQaState,
    type VehicleAnchor,
    type VehicleAtlas,
} from './game/vehicle';

const CAMERA_INPUT_RESPONSE = 14;
const CAMERA_LATERAL_SPEED = 820;
const CAMERA_BASE_FOV = 69;
const CAMERA_DOWNHILL_EXTRA_PITCH = 42;
const CAMERA_FOV_RESPONSE = 1.25;
const CAMERA_MAX_SLOPE_PITCH = 34;
const CAMERA_SLOPE_PITCH_RESPONSE = 3.2;
const CAMERA_SPEED_FOV_BONUS = 2.4;
const DEBUG_PROJECTION_GUIDES = false;
const ENABLE_DEBUG_CAMERA_CONTROLS = false;
const PLAYER_BRAKE_SPEED = 0;
const PLAYER_BRAKING = 330;
const PLAYER_CENTERING_RESPONSE = 1.9;
const PLAYER_CRUISE_SPEED = 440;
const PLAYER_ACCEL_SPEED = 760;
const PLAYER_CORNER_ACCEL_SPEED_DROP = 150;
const PLAYER_CORNER_SPEED_PULL = 190;
const PLAYER_INPUT_RESPONSE = 16;
const PLAYER_MAX_ROAD_OFFSET = 700;
const PLAYER_ROAD_ANCHOR_DISTANCE = 640;
const PLAYER_ROAD_CONTACT_DISTANCE = 260;
const PLAYER_SCREEN_ANCHOR_RATIO = 0.88;
const PLAYER_SHADOW_BASELINE_Y_OFFSET = 0.028;
const PLAYER_SHADOW_MAX_ALPHA = 0.18;
const PLAYER_SHADOW_SOFT_ALPHA = 0.24;
const PLAYER_SILHOUETTE_SHADOW_ALPHA = 0.48;
const PLAYER_STEER_ACCELERATION = 1750;
const PLAYER_STEER_DAMPING = 9.2;
const PLAYER_VEHICLE_TEXTURE_KEY = 'player-vehicle-genesis-g70-poc';
const PLAYER_VEHICLE_SHADOW_TEXTURE_KEY = 'player-vehicle-genesis-g70-poc-shadow';
const PLAYER_VEHICLE_VIEWPORT_RATIO = 0.34;
const PLAYER_VEHICLE_MIN_SIZE = 220;
const PLAYER_VEHICLE_MAX_SIZE = 360;
const PLAYER_VEHICLE_ROTATION_DEG = 3.5;
const PLAYER_STEER_WEAK_THRESHOLD = 0.18;
const PLAYER_TERRAIN_CUE_THRESHOLD = 24;
const PLAYER_CONTACT_TERRAIN_CUE_THRESHOLD = 8;
const PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT = 18;
const PLAYER_TERRAIN_SCALE_INTENSITY = 0.045;
const PLAYER_CURVE_SCREEN_BIAS = 8;
const PLAYER_CURVE_DRIFT_ACCELERATION = 260;
const PLAYER_CURVE_STEERING_CUE = 0.1;
const PLAYER_HIGH_SPEED_STEER_FORCE_DROP = 0.42;
const PLAYER_HIGH_SPEED_STEER_VISUAL_DROP = 0.34;
const PLAYER_STEERING_VELOCITY_CUE = 0.38;
const PLAYER_ENGINE_ACCELERATION = 128;
const PLAYER_ENGINE_BRAKE_DECELERATION = 26;
const PLAYER_ROLLING_RESISTANCE = 14;
const PLAYER_AERO_DRAG = 0.00012;
const PLAYER_GRAVITY_ACCELERATION = 360;
const PLAYER_MAX_SLOPE_ACCELERATION = 115;
const PLAYER_SLOPE_SAMPLE_DISTANCE = 720;
const PLAYER_RPM_IDLE = 1100;
const PLAYER_RPM_REDLINE = 7200;
const PLAYER_RPM_RESPONSE = 7;
const TELEMETRY_DEFAULT_DURATION_SEC = 60;
const TELEMETRY_DEFAULT_SAMPLE_HZ = 10;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 760;

const URL_PARAMS = new URLSearchParams(window.location.search);
const ACTIVE_ROAD_TRACK_ID = parseRoadTrackId(URL_PARAMS.get('track'));
const RUNTIME_TUNING: RuntimeTuning = createRuntimeTuning(URL_PARAMS, {
    cameraBaseFov: CAMERA_BASE_FOV,
    cameraSpeedFovBonus: CAMERA_SPEED_FOV_BONUS,
    curveScreenBias: PLAYER_CURVE_SCREEN_BIAS,
    debugProjectionGuides: DEBUG_PROJECTION_GUIDES,
    playerContactTerrainCueThreshold: PLAYER_CONTACT_TERRAIN_CUE_THRESHOLD,
    playerRoadAnchorDistance: PLAYER_ROAD_ANCHOR_DISTANCE,
    playerRoadContactDistance: PLAYER_ROAD_CONTACT_DISTANCE,
    playerScreenAnchorRatio: PLAYER_SCREEN_ANCHOR_RATIO,
    steerWeakThreshold: PLAYER_STEER_WEAK_THRESHOLD,
    terrainCueThreshold: PLAYER_TERRAIN_CUE_THRESHOLD,
    terrainScaleIntensity: PLAYER_TERRAIN_SCALE_INTENSITY,
    vehicleMaxSize: PLAYER_VEHICLE_MAX_SIZE,
    vehicleMinSize: PLAYER_VEHICLE_MIN_SIZE,
    vehicleRotationDeg: PLAYER_VEHICLE_ROTATION_DEG,
    vehicleViewportRatio: PLAYER_VEHICLE_VIEWPORT_RATIO,
});
const RUNTIME_QA: RuntimeQaOverrides = createRuntimeQaOverrides(URL_PARAMS, {
    maxRoadOffset: PLAYER_MAX_ROAD_OFFSET,
    playerAccelSpeed: PLAYER_ACCEL_SPEED,
});
const RUNTIME_TELEMETRY: RuntimeTelemetryConfig = createRuntimeTelemetryConfig(URL_PARAMS, {
    durationSec: TELEMETRY_DEFAULT_DURATION_SEC,
    sampleHz: TELEMETRY_DEFAULT_SAMPLE_HZ,
});
const PLAYER_CONTROLLER_CONFIG: PlayerVehicleControllerConfig = {
    accelSpeed: PLAYER_ACCEL_SPEED,
    aeroDrag: PLAYER_AERO_DRAG,
    brakeSpeed: PLAYER_BRAKE_SPEED,
    braking: PLAYER_BRAKING,
    centeringResponse: PLAYER_CENTERING_RESPONSE,
    cornerAccelSpeedDrop: PLAYER_CORNER_ACCEL_SPEED_DROP,
    cornerSpeedPull: PLAYER_CORNER_SPEED_PULL,
    curveDriftAcceleration: PLAYER_CURVE_DRIFT_ACCELERATION,
    curveSteeringCue: PLAYER_CURVE_STEERING_CUE,
    engineAcceleration: PLAYER_ENGINE_ACCELERATION,
    engineBrakeDeceleration: PLAYER_ENGINE_BRAKE_DECELERATION,
    highSpeedSteerForceDrop: PLAYER_HIGH_SPEED_STEER_FORCE_DROP,
    highSpeedSteerVisualDrop: PLAYER_HIGH_SPEED_STEER_VISUAL_DROP,
    inputResponse: PLAYER_INPUT_RESPONSE,
    maxRoadOffset: PLAYER_MAX_ROAD_OFFSET,
    rollingResistance: PLAYER_ROLLING_RESISTANCE,
    rpmIdle: PLAYER_RPM_IDLE,
    rpmRedline: PLAYER_RPM_REDLINE,
    rpmResponse: PLAYER_RPM_RESPONSE,
    steerAcceleration: PLAYER_STEER_ACCELERATION,
    steerDamping: PLAYER_STEER_DAMPING,
    steeringVelocityCue: PLAYER_STEERING_VELOCITY_CUE,
};

const PLAYER_VEHICLE_ATLAS = genesisG70VehicleAtlas as VehicleAtlas;

class ApexSeoulScene extends Phaser.Scene {
    private cameraResource: Pseudo3dCamera = createDefaultCamera();
    private cameraFov = RUNTIME_TUNING.cameraBaseFov;
    private cameraManualPitch = 0;
    private cameraTerrainPitch = 0;
    private cameraVelocity = {
        height: 0,
        lateral: 0,
        pitch: 0,
    };
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private graphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'd' | 'e' | 'l' | 'q' | 's' | 'w', Phaser.Input.Keyboard.Key>;
    private elapsedSec = 0;
    private lastVehicleQaState: RuntimeVehicleQaState | null = null;
    private playerCar!: Phaser.GameObjects.Image;
    private playerSoftShadowCar!: Phaser.GameObjects.Image;
    private playerShadowCar!: Phaser.GameObjects.Image;
    private playerVehicle: PlayerVehicleState = createDefaultPlayerVehicleState(
        PLAYER_CRUISE_SPEED,
        PLAYER_RPM_IDLE,
    );
    private roadObjects: RoadObject[] = [];
    private roadObjectStats: RoadObjectRenderStats | null = null;
    private roadStats: RoadRenderStats | null = null;
    private roadTrack: RoadTrack = createRoadTrack(ACTIVE_ROAD_TRACK_ID);
    private telemetry: RuntimeTelemetryRecorder | null = null;

    constructor() {
        super('apex-seoul');
    }

    preload() {
        this.load.spritesheet(PLAYER_VEHICLE_TEXTURE_KEY, genesisG70VehicleSpriteUrl, {
            frameHeight: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
            frameWidth: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
        });
        this.load.spritesheet(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, genesisG70VehicleShadowSpriteUrl, {
            frameHeight: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
            frameWidth: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
        });
    }

    create() {
        this.cameraResource.fovDegrees = RUNTIME_TUNING.cameraBaseFov;
        this.roadObjects = createRoadObjects(this.roadTrack);
        this.applyRuntimeQaOverrides();
        this.cameras.main.setBackgroundColor('#11161b');
        this.graphics = this.add.graphics();
        this.playerSoftShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_SHADOW_SOFT_ALPHA)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
            .setDepth(4.8)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.playerSoftShadowCar.enableFilters().filters.internal.addBlur(1, 2.5, 1.4, 1, 0x000000, 2);
        this.playerShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_SILHOUETTE_SHADOW_ALPHA)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
            .setDepth(5)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.playerCar = this.add
            .image(0, 0, PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setDepth(6)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.hudText = createHudText(this);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = {
            a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            e: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            l: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        };
        this.telemetry = new RuntimeTelemetryRecorder(
            RUNTIME_TELEMETRY,
            () => {
                const viewport = this.getViewport();

                return this.getRuntimeQaState(viewport, getHorizonY(this.cameraResource, viewport));
            },
        );

        this.scale.on('resize', this.render, this);
        this.render();
    }

    update(_time: number, delta: number) {
        const seconds = delta / 1000;
        const camera = this.cameraResource;

        this.elapsedSec += seconds;
        this.applyRuntimeQaOverrides();
        this.updateTelemetryHotkey();

        if (RUNTIME_QA.freeze) {
            camera.pitch = this.updateCameraPitch(seconds);
            camera.fovDegrees = this.updateCameraFov(seconds);
            this.render();
            this.telemetry?.update(this.elapsedSec);
            return;
        }

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
        this.cameraManualPitch += this.cameraVelocity.pitch * seconds;

        camera.height = Phaser.Math.Clamp(camera.height, 360, 1800);
        camera.lateralOffset = Phaser.Math.Clamp(camera.lateralOffset, -1400, 1400);

        this.updatePlayerVehicle(seconds);
        camera.z = wrapDistance(camera.z + this.playerVehicle.speed * seconds, this.roadTrack.length);
        camera.pitch = this.updateCameraPitch(seconds);
        camera.fovDegrees = this.updateCameraFov(seconds);
        this.render();
        this.telemetry?.update(this.elapsedSec);
    }

    private render() {
        const viewport = this.getViewport();
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.clear();
        this.drawBackground(viewport, horizonY);
        this.roadStats = renderRoad(
            this.graphics,
            this.roadTrack,
            this.cameraResource,
            viewport,
            { downhillCueRatio: this.getDownhillVisualCueRatio() },
        );
        this.roadObjectStats = renderRoadObjects(
            this.graphics,
            this.roadObjects,
            this.roadTrack,
            this.cameraResource,
            viewport,
        );
        if (RUNTIME_TUNING.debugProjectionGuides) {
            this.drawProjectionGuides(viewport);
        }
        this.renderPlayerShadow(viewport);
        this.renderPlayerVehicle(viewport);
        this.renderHud();
        this.publishRuntimeQaState(viewport, horizonY);
    }

    private getViewport(): Viewport {
        return {
            height: GAME_HEIGHT,
            width: GAME_WIDTH,
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
        const player = this.playerVehicle;
        const stats = this.roadStats;

        renderHudText(this.hudText, {
            camera: this.cameraResource,
            controlsLabel: ENABLE_DEBUG_CAMERA_CONTROLS
                ? 'Up: accel | Down: brake | Left/Right: steer | WASD: camera | Q/E: pitch'
                : 'Up: accel | Down: brake | Left/Right: steer | debug camera locked',
            cornerIntensity: getCornerIntensity(stats?.currentCurve ?? 0),
            player,
            qa: RUNTIME_QA,
            roadStats: stats,
            slopeAcceleration: this.getSlopeAcceleration(),
            steeringRatio: getHighSpeedSteeringRatio(
                Phaser.Math.Clamp(player.speed / PLAYER_ACCEL_SPEED, 0, 1),
                PLAYER_HIGH_SPEED_STEER_VISUAL_DROP,
            ),
            telemetry: RUNTIME_TELEMETRY,
            telemetryEventCount: this.telemetry?.getEventCount() ?? 0,
            track: this.roadTrack,
            tuning: RUNTIME_TUNING,
            vehicleTerrainCue: this.getVehicleTerrainCue(),
        });
    }

    private updatePlayerVehicle(seconds: number) {
        updatePlayerVehicle(
            this.playerVehicle,
            {
                accelPressed: this.cursors.up.isDown,
                brakePressed: this.cursors.down.isDown,
                steerAxis: getAxis(this.cursors.right.isDown, this.cursors.left.isDown),
            },
            {
                currentCurve: this.roadStats?.currentCurve ?? 0,
                slopeAcceleration: this.getSlopeAcceleration(),
            },
            PLAYER_CONTROLLER_CONFIG,
            seconds,
        );
    }

    private renderPlayerVehicle(viewport: Viewport) {
        const player = this.playerVehicle;
        const spriteSize = getPlayerVehicleSpriteSize(viewport, RUNTIME_TUNING);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const displaySize = getTerrainScaledSpriteSize(spriteSize, anchor, RUNTIME_TUNING);
        const vehicleFrame = selectPlayerVehicleFrame(
            PLAYER_VEHICLE_ATLAS,
            RUNTIME_TUNING,
            player.steering,
            anchor.terrainCue,
        );
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, vehicleFrame.frame))
            .setFlipX(vehicleFrame.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(anchor.x, anchor.y)
            .setDisplaySize(displaySize, displaySize)
            .setRotation(Phaser.Math.DegToRad(player.steering * RUNTIME_TUNING.vehicleRotationDeg));

        this.lastVehicleQaState = {
            anchor,
            displaySize,
            flipX: vehicleFrame.flipX,
            frame: vehicleFrame.frame,
            rotationDeg: player.steering * RUNTIME_TUNING.vehicleRotationDeg,
            terrainScale: getTerrainScaleMultiplier(anchor, RUNTIME_TUNING),
        };
    }

    private renderPlayerShadow(viewport: Viewport) {
        const spriteSize = getPlayerVehicleSpriteSize(viewport, RUNTIME_TUNING);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const displaySize = getTerrainScaledSpriteSize(spriteSize, anchor, RUNTIME_TUNING);
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const terrainIntensity = getContactTerrainCueIntensity(anchor.contactTerrainRatio);
        const vehicleFrame = selectPlayerVehicleFrame(
            PLAYER_VEHICLE_ATLAS,
            RUNTIME_TUNING,
            this.playerVehicle.steering,
            anchor.terrainCue,
        );
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];
        const shadowProfile = getVehicleShadowProfile(PLAYER_VEHICLE_ATLAS, vehicleFrame.frame);
        const silhouetteScale = getSilhouetteShadowScale(anchor.contactTerrainRatio, speedRatio);
        const silhouetteAlpha = PLAYER_SILHOUETTE_SHADOW_ALPHA *
            Phaser.Math.Clamp(anchor.scale * 13, 0.76, 1.08);
        const softShadowAlpha = PLAYER_SHADOW_SOFT_ALPHA *
            Phaser.Math.Clamp(anchor.scale * 13, 0.66, 1);
        const chassisCenter = getShadowElementCenter(
            shadowProfile.chassis,
            frame,
            anchor,
            displaySize,
            vehicleFrame.flipX,
            terrainIntensity,
        );
        const steeringOffset = this.playerVehicle.steering * displaySize * 0.018;
        const alpha = PLAYER_SHADOW_MAX_ALPHA * Phaser.Math.Clamp(anchor.scale * 13, 0.7, 1);

        this.playerSoftShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, vehicleFrame.frame))
            .setAlpha(softShadowAlpha)
            .setFlipX(vehicleFrame.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                chassisCenter.x + steeringOffset * 0.65,
                chassisCenter.y - displaySize * 0.022,
            )
            .setDisplaySize(
                displaySize * silhouetteScale.x * 1.16,
                displaySize * silhouetteScale.y * 1.26,
            )
            .setRotation(Phaser.Math.DegToRad(this.playerVehicle.steering * RUNTIME_TUNING.vehicleRotationDeg * 0.22));

        this.playerShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, vehicleFrame.frame))
            .setAlpha(silhouetteAlpha)
            .setFlipX(vehicleFrame.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                chassisCenter.x + steeringOffset,
                chassisCenter.y - displaySize * 0.032,
            )
            .setDisplaySize(
                displaySize * silhouetteScale.x,
                displaySize * silhouetteScale.y,
            )
            .setRotation(Phaser.Math.DegToRad(this.playerVehicle.steering * RUNTIME_TUNING.vehicleRotationDeg * 0.35));

        this.graphics.fillStyle(0x010303, alpha * 0.16);
        drawShadowContactPatch(
            this.graphics,
            chassisCenter.x + steeringOffset,
            chassisCenter.y - displaySize * 0.018,
            displaySize * shadowProfile.chassis.w * 0.72,
            displaySize * shadowProfile.chassis.h * 0.34,
        );
    }

    private getVehicleAnchor(viewport: Viewport, spriteSize: number): VehicleAnchor {
        const player = this.playerVehicle;
        const anchorZ = this.cameraResource.z + RUNTIME_TUNING.playerRoadAnchorDistance;
        const contactZ = this.cameraResource.z + RUNTIME_TUNING.playerRoadContactDistance;
        const currentRoadElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const anchorElevation = getRoadElevationAt(this.roadTrack, anchorZ);
        const contactElevation = getRoadElevationAt(this.roadTrack, contactZ);
        const elevationDelta = anchorElevation - currentRoadElevation;
        const contactElevationDelta = contactElevation - currentRoadElevation;
        const contactRoadCenterOffset = getRoadCenterOffsetAhead(
            this.roadTrack,
            this.cameraResource.z,
            RUNTIME_TUNING.playerRoadContactDistance,
        );
        const terrainCue = selectVehicleTerrainCue(RUNTIME_TUNING, elevationDelta);
        const contactTerrainRatio = getContactTerrainRatio(RUNTIME_TUNING, contactElevationDelta);
        const contactTerrainCue = selectContactTerrainCue(RUNTIME_TUNING, contactElevationDelta);
        const contactRoadAnchor = projectGroundPoint(
            {
                x: contactRoadCenterOffset + player.lateralOffset,
                y: contactElevationDelta * ELEVATION_VISUAL_SCALE,
                z: contactZ,
            },
            this.cameraResource,
            viewport,
        );
        const fixedAnchorY = viewport.height * RUNTIME_TUNING.playerScreenAnchorRatio;
        const fallbackY = fixedAnchorY;
        const fallbackX = viewport.width / 2;
        const curveScreenBias = -(this.roadStats?.currentCurve ?? 0) * RUNTIME_TUNING.curveScreenBias;
        const anchorX = contactRoadAnchor.visible
            ? Phaser.Math.Clamp(
                contactRoadAnchor.x + curveScreenBias,
                spriteSize * 0.35,
                viewport.width - spriteSize * 0.35,
            )
            : fallbackX;
        const anchorY = contactRoadAnchor.visible
            ? Phaser.Math.Clamp(
                getScreenContactVehicleY(
                    fixedAnchorY,
                    contactElevationDelta,
                    contactTerrainRatio,
                    PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT,
                ),
                viewport.height * 0.8,
                viewport.height * 0.95,
            )
            : fallbackY;

        return {
            contactElevationDelta,
            contactTerrainRatio,
            contactTerrainCue,
            elevationDelta,
            roadCenterOffset: contactRoadCenterOffset,
            scale: contactRoadAnchor.scale,
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

    private updateCameraPitch(seconds: number) {
        const targetTerrainPitch = this.getSlopeCameraPitch();
        const pitchBlend = 1 - Math.exp(-CAMERA_SLOPE_PITCH_RESPONSE * seconds);

        this.cameraTerrainPitch = Phaser.Math.Linear(
            this.cameraTerrainPitch,
            targetTerrainPitch,
            pitchBlend,
        );
        this.cameraManualPitch = Phaser.Math.Clamp(this.cameraManualPitch, -120, 120);

        return Phaser.Math.Clamp(this.cameraManualPitch + this.cameraTerrainPitch, -180, 180);
    }

    private getVehicleTerrainCue() {
        const currentRoadElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const anchorElevation = getRoadElevationAt(
            this.roadTrack,
            this.cameraResource.z + RUNTIME_TUNING.playerRoadAnchorDistance,
        );

        return selectVehicleTerrainCue(RUNTIME_TUNING, anchorElevation - currentRoadElevation);
    }

    private getSlopeAcceleration() {
        const currentElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const aheadElevation = getRoadElevationAt(
            this.roadTrack,
            this.cameraResource.z + PLAYER_SLOPE_SAMPLE_DISTANCE,
        );
        const downhillRatio = (currentElevation - aheadElevation) / PLAYER_SLOPE_SAMPLE_DISTANCE;

        return Phaser.Math.Clamp(
            downhillRatio * PLAYER_GRAVITY_ACCELERATION,
            -PLAYER_MAX_SLOPE_ACCELERATION,
            PLAYER_MAX_SLOPE_ACCELERATION,
        );
    }

    private getSlopeCameraPitch() {
        const slopeRatio = this.getSlopeRatio();
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const speedInfluence = Phaser.Math.Linear(0.45, 1, speedRatio);
        const downhillExtraPitch = Math.max(0, slopeRatio) * CAMERA_DOWNHILL_EXTRA_PITCH;

        return -slopeRatio * (CAMERA_MAX_SLOPE_PITCH + downhillExtraPitch) * speedInfluence;
    }

    private getSlopeRatio() {
        return Phaser.Math.Clamp(
            this.getSlopeAcceleration() / PLAYER_MAX_SLOPE_ACCELERATION,
            -1,
            1,
        );
    }

    private getDownhillVisualCueRatio() {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const speedInfluence = Phaser.Math.Linear(0.35, 1, speedRatio);

        return Phaser.Math.Clamp(Math.max(0, this.getSlopeRatio()) * speedInfluence, 0, 1);
    }

    private applyRuntimeQaOverrides() {
        if (!RUNTIME_QA.enabled) return;

        if (RUNTIME_QA.z !== null) {
            this.cameraResource.z = wrapDistance(RUNTIME_QA.z, this.roadTrack.length);
        }

        if (RUNTIME_QA.speed !== null) {
            this.playerVehicle.speed = RUNTIME_QA.speed;
        }

        if (RUNTIME_QA.steering !== null) {
            this.playerVehicle.steering = RUNTIME_QA.steering;
            this.playerVehicle.steeringVelocity = 0;
        }

        if (RUNTIME_QA.lateralOffset !== null) {
            this.playerVehicle.lateralOffset = RUNTIME_QA.lateralOffset;
        }
    }

    private updateTelemetryHotkey() {
        if (!RUNTIME_TELEMETRY.enabled) return;
        if (!Phaser.Input.Keyboard.JustDown(this.keys.l)) return;

        this.telemetry?.downloadJsonl('hotkey');
    }

    private publishRuntimeQaState(viewport: Viewport, horizonY: number) {
        const qaWindow = window as Window & {
            __apexSeoulQaReady?: boolean;
            __apexSeoulQaState?: unknown;
        };

        qaWindow.__apexSeoulQaReady = true;
        qaWindow.__apexSeoulQaState = this.getRuntimeQaState(viewport, horizonY);
    }

    private getRuntimeQaState(viewport: Viewport, horizonY: number) {
        return {
            camera: {
                fovDegrees: this.cameraResource.fovDegrees,
                height: this.cameraResource.height,
                horizonRatio: this.cameraResource.horizonRatio,
                lateralOffset: this.cameraResource.lateralOffset,
                manualPitch: this.cameraManualPitch,
                pitch: this.cameraResource.pitch,
                terrainPitch: this.cameraTerrainPitch,
                z: this.cameraResource.z,
            },
            elapsedSec: Number(this.elapsedSec.toFixed(3)),
            horizonY,
            player: {
                lateralOffset: this.playerVehicle.lateralOffset,
                rpm: this.playerVehicle.rpm,
                slopeAcceleration: this.getSlopeAcceleration(),
                speed: this.playerVehicle.speed,
                steering: this.playerVehicle.steering,
            },
            qa: RUNTIME_QA,
            road: this.roadStats,
            roadObjects: this.roadObjectStats,
            track: {
                id: this.roadTrack.id,
                length: this.roadTrack.length,
                name: this.roadTrack.name,
                segments: this.roadTrack.segments.length,
            },
            tuning: RUNTIME_TUNING,
            vehicle: this.lastVehicleQaState,
            viewport,
        };
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
        height: GAME_HEIGHT,
        mode: Phaser.Scale.FIT,
        width: GAME_WIDTH,
    },
    scene: [ApexSeoulScene],
    type: Phaser.WEBGL,
};

new Phaser.Game(config);

function getAxis(positive: boolean, negative: boolean) {
    return Number(positive) - Number(negative);
}
