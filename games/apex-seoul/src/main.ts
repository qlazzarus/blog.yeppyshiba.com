import Phaser from 'phaser';
import './styles.css';
import genesisG70VehicleAtlas from '../assets/vehicles/approved/atlases/genesis-g70-poc-128.json';
import genesisG70VehicleShadowSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png';
import genesisG70VehicleSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128.png';
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
const PLAYER_SHADOW_MAX_ALPHA = 0.28;
const PLAYER_SILHOUETTE_SHADOW_ALPHA = 0.62;
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

const URL_PARAMS = new URLSearchParams(window.location.search);
const ACTIVE_ROAD_TRACK_ID = parseRoadTrackId(URL_PARAMS.get('track'));

type RuntimeTuning = {
    cameraBaseFov: number;
    cameraSpeedFovBonus: number;
    curveScreenBias: number;
    debugProjectionGuides: boolean;
    playerRoadAnchorDistance: number;
    playerRoadContactDistance: number;
    playerScreenAnchorRatio: number;
    playerContactTerrainCueThreshold: number;
    steerWeakThreshold: number;
    terrainCueThreshold: number;
    terrainScaleIntensity: number;
    vehicleMaxSize: number;
    vehicleMinSize: number;
    vehicleRotationDeg: number;
    vehicleViewportRatio: number;
};

const RUNTIME_TUNING = createRuntimeTuning();

type RuntimeQaOverrides = {
    enabled: boolean;
    freeze: boolean;
    lateralOffset: number | null;
    speed: number | null;
    steering: number | null;
    z: number | null;
};

const RUNTIME_QA = createRuntimeQaOverrides();
const RUNTIME_TELEMETRY = createRuntimeTelemetryConfig();

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

type VehicleShadowElement = {
    alpha: number;
    h: number;
    w: number;
    x: number;
    y: number;
};

type VehicleShadowProfile = {
    chassis: VehicleShadowElement;
    tireContacts: VehicleShadowElement[];
};

type VehicleAtlas = {
    apex: {
        shadowProfiles: Record<string, VehicleShadowProfile>;
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
    rpm: number;
    speed: number;
    steering: number;
    steeringVelocity: number;
};

type VehicleAnchor = {
    contactElevationDelta: number;
    contactTerrainRatio: number;
    contactTerrainCue: VehicleTerrainCue;
    elevationDelta: number;
    roadCenterOffset: number;
    scale: number;
    terrainCue: VehicleTerrainCue;
    x: number;
    y: number;
};

type RuntimeVehicleQaState = {
    anchor: VehicleAnchor;
    displaySize: number;
    flipX: boolean;
    frame: string;
    rotationDeg: number;
    terrainScale: number;
};

type RuntimeTelemetryConfig = {
    autoExport: boolean;
    durationSec: number;
    enabled: boolean;
    sampleHz: number;
};

type RuntimeTelemetryEvent = {
    payload: Record<string, unknown>;
    sessionId: string;
    t: number;
    type: string;
};

class RuntimeTelemetryRecorder {
    private readonly events: RuntimeTelemetryEvent[] = [];
    private nextSampleSec = 0;
    readonly sessionId = createTelemetrySessionId();

    constructor(
        private readonly config: RuntimeTelemetryConfig,
        private readonly getState: () => unknown,
    ) {
        if (!config.enabled) return;

        this.pushEvent('session_start', 0, {
            config,
            url: window.location.href,
            userAgent: navigator.userAgent,
        });
    }

    update(elapsedSec: number) {
        if (!this.config.enabled) return;

        if (elapsedSec >= this.nextSampleSec) {
            this.record('drive_sample', this.getStatePayload());
            this.nextSampleSec = elapsedSec + 1 / this.config.sampleHz;
        }

        if (this.config.autoExport && elapsedSec >= this.config.durationSec) {
            this.downloadJsonl('auto_duration_complete');
            this.config.autoExport = false;
        }
    }

    downloadJsonl(reason = 'manual') {
        if (!this.config.enabled) return;

        this.record('telemetry_export_requested', {
            eventCountBeforeExport: this.events.length,
            reason,
        });

        const jsonl = `${this.events.map((event) => JSON.stringify(event)).join('\n')}\n`;
        const blob = new Blob([jsonl], {
            type: 'application/x-ndjson',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.href = url;
        link.download = `apex-seoul-drive-${this.sessionId}.jsonl`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    getEventCount() {
        return this.events.length;
    }

    private record(type: string, payload: Record<string, unknown>) {
        const state = this.getState() as { elapsedSec?: number } | null;

        this.pushEvent(type, Number((state?.elapsedSec ?? 0).toFixed(3)), payload);
    }

    private getStatePayload() {
        const state = this.getState();

        return state && typeof state === 'object'
            ? state as Record<string, unknown>
            : { state };
    }

    private pushEvent(type: string, t: number, payload: Record<string, unknown>) {
        this.events.push({
            payload,
            sessionId: this.sessionId,
            t,
            type,
        });
    }
}

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
    private playerShadowCar!: Phaser.GameObjects.Image;
    private playerVehicle: PlayerVehicleState = {
        lateralOffset: 0,
        rpm: PLAYER_RPM_IDLE,
        speed: PLAYER_CRUISE_SPEED,
        steering: 0,
        steeringVelocity: 0,
    };
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
        this.applyRuntimeQaOverrides();
        this.cameras.main.setBackgroundColor('#11161b');
        this.graphics = this.add.graphics();
        this.playerShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex('center'))
            .setAlpha(PLAYER_SILHOUETTE_SHADOW_ALPHA)
            .setDepth(5)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
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
                `Apex Seoul - ${this.roadTrack.name}`,
                `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
                `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(1)} | z ${camera.z.toFixed(0)}`,
                stats
                    ? `segment ${stats.baseSegmentIndex} | curve ${stats.currentCurve.toFixed(2)} | elevation ${stats.currentElevation.toFixed(0)} | gap ${formatNullableNumber(stats.horizonGapY)} | visible ${stats.visibleSegments}`
                    : 'segment -- | curve -- | visible --',
                `speed ${player.speed.toFixed(0)} | rpm ${player.rpm.toFixed(0)} | slope ${this.getSlopeAcceleration().toFixed(0)} | corner ${getCornerIntensity(stats?.currentCurve ?? 0).toFixed(2)} | steer ratio ${getHighSpeedSteeringRatio(Phaser.Math.Clamp(player.speed / PLAYER_ACCEL_SPEED, 0, 1), PLAYER_HIGH_SPEED_STEER_VISUAL_DROP).toFixed(2)} | car offset ${player.lateralOffset.toFixed(0)} | steer ${player.steering.toFixed(2)} | terrain ${this.getVehicleTerrainCue()}`,
                `sprite ${(RUNTIME_TUNING.vehicleViewportRatio * 100).toFixed(0)}vw | anchor ${RUNTIME_TUNING.playerRoadAnchorDistance.toFixed(0)}z | contact cue ${RUNTIME_TUNING.playerContactTerrainCueThreshold.toFixed(0)} | curve bias ${RUNTIME_TUNING.curveScreenBias.toFixed(0)}px`,
                `telemetry ${RUNTIME_TELEMETRY.enabled ? 'on' : 'off'} | log ${this.telemetry?.getEventCount() ?? 0}`,
                RUNTIME_QA.enabled
                    ? `qa freeze ${RUNTIME_QA.freeze ? 'on' : 'off'} | forced ${formatNullableNumber(RUNTIME_QA.steering)} steer / ${formatNullableNumber(RUNTIME_QA.z)} z`
                    : null,
                ENABLE_DEBUG_CAMERA_CONTROLS
                    ? 'Up: accel | Down: brake | Left/Right: steer | WASD: camera | Q/E: pitch'
                    : 'Up: accel | Down: brake | Left/Right: steer | debug camera locked',
            ].filter(Boolean).join('\n'),
        );
    }

    private updatePlayerVehicle(seconds: number) {
        this.updatePlayerSpeed(seconds);

        const steerAxis = getAxis(this.cursors.right.isDown, this.cursors.left.isDown);
        const player = this.playerVehicle;
        const speedRatio = Phaser.Math.Clamp(player.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const steerForceRatio = getHighSpeedSteeringRatio(
            speedRatio,
            PLAYER_HIGH_SPEED_STEER_FORCE_DROP,
        );
        const steerVisualRatio = getHighSpeedSteeringRatio(
            speedRatio,
            PLAYER_HIGH_SPEED_STEER_VISUAL_DROP,
        );
        const curve = this.roadStats?.currentCurve ?? 0;
        const centeringForce = -player.lateralOffset * PLAYER_CENTERING_RESPONSE;
        const steeringForce = steerAxis * PLAYER_STEER_ACCELERATION * steerForceRatio;
        const curveForce = -curve * speedRatio * PLAYER_CURVE_DRIFT_ACCELERATION;
        const dampingForce = -player.steeringVelocity * PLAYER_STEER_DAMPING;

        player.steeringVelocity += (steeringForce + centeringForce + curveForce + dampingForce) * seconds;
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
            steerAxis * steerVisualRatio +
                (player.steeringVelocity / PLAYER_STEER_ACCELERATION) * PLAYER_STEERING_VELOCITY_CUE -
                curve * speedRatio * PLAYER_CURVE_STEERING_CUE,
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
        const cornerIntensity = getCornerIntensity(this.roadStats?.currentCurve ?? 0);
        const cornerAccelSpeed = PLAYER_ACCEL_SPEED - cornerIntensity * PLAYER_CORNER_ACCEL_SPEED_DROP;
        const speedRatio = Phaser.Math.Clamp(player.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const throttle = accelPressed ? 1 : 0;
        const brake = brakePressed ? 1 : 0;
        const engineForce = throttle * PLAYER_ENGINE_ACCELERATION * (1 - speedRatio * 0.45);
        const brakeForce = brake * PLAYER_BRAKING;
        const engineBrakeForce = throttle > 0 || brake > 0 ? 0 : PLAYER_ENGINE_BRAKE_DECELERATION;
        const rollingResistance = PLAYER_ROLLING_RESISTANCE;
        const aeroDrag = player.speed * player.speed * PLAYER_AERO_DRAG;
        const cornerSpeedLimit = cornerAccelSpeed;
        const cornerLimitForce = player.speed > cornerSpeedLimit
            ? Math.min(PLAYER_CORNER_SPEED_PULL * cornerIntensity, player.speed - cornerSpeedLimit)
            : 0;
        const slopeAcceleration = this.getSlopeAcceleration();
        const acceleration =
            engineForce +
            slopeAcceleration -
            brakeForce -
            engineBrakeForce -
            rollingResistance -
            aeroDrag -
            cornerLimitForce;

        player.speed = Phaser.Math.Clamp(
            player.speed + acceleration * seconds,
            PLAYER_BRAKE_SPEED,
            PLAYER_ACCEL_SPEED,
        );

        if (brakePressed && player.speed < 2) {
            player.speed = 0;
        }

        const targetRpm = getEngineRpm(player.speed, throttle, brake);
        const rpmBlend = 1 - Math.exp(-PLAYER_RPM_RESPONSE * seconds);

        player.rpm = Phaser.Math.Linear(player.rpm, targetRpm, rpmBlend);
    }

    private renderPlayerVehicle(viewport: Viewport) {
        const player = this.playerVehicle;
        const spriteSize = getPlayerVehicleSpriteSize(viewport);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const displaySize = getTerrainScaledSpriteSize(spriteSize, anchor);
        const vehicleFrame = selectPlayerVehicleFrame(player.steering, anchor.terrainCue);
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(vehicleFrame.frame))
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
            terrainScale: getTerrainScaleMultiplier(anchor),
        };
    }

    private renderPlayerShadow(viewport: Viewport) {
        const spriteSize = getPlayerVehicleSpriteSize(viewport);
        const anchor = this.getVehicleAnchor(viewport, spriteSize);
        const displaySize = getTerrainScaledSpriteSize(spriteSize, anchor);
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const terrainIntensity = getContactTerrainCueIntensity(anchor.contactTerrainRatio);
        const vehicleFrame = selectPlayerVehicleFrame(this.playerVehicle.steering, anchor.terrainCue);
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];
        const shadowProfile = getVehicleShadowProfile(vehicleFrame.frame);
        const silhouetteScale = getSilhouetteShadowScale(anchor.contactTerrainRatio, speedRatio);
        const silhouetteAlpha = PLAYER_SILHOUETTE_SHADOW_ALPHA *
            Phaser.Math.Clamp(anchor.scale * 13, 0.76, 1.08);
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

        this.playerShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(vehicleFrame.frame))
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
            displaySize * shadowProfile.chassis.w * 0.92,
            displaySize * shadowProfile.chassis.h * 0.52,
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
        const terrainCue = selectVehicleTerrainCue(elevationDelta);
        const contactTerrainRatio = getContactTerrainRatio(contactElevationDelta);
        const contactTerrainCue = selectContactTerrainCue(contactElevationDelta);
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

        return selectVehicleTerrainCue(anchorElevation - currentRoadElevation);
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
    if (steering <= -RUNTIME_TUNING.steerWeakThreshold) return 'steer-left-1';
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

function selectContactTerrainCue(elevationDelta: number): VehicleTerrainCue {
    const threshold = RUNTIME_TUNING.playerContactTerrainCueThreshold;

    if (elevationDelta <= -threshold) return 'downhill';
    if (elevationDelta >= threshold) return 'uphill';

    return 'level';
}

function getContactTerrainRatio(elevationDelta: number) {
    return Phaser.Math.Clamp(
        elevationDelta / RUNTIME_TUNING.playerContactTerrainCueThreshold,
        -1,
        1,
    );
}

function getScreenContactVehicleY(
    fixedAnchorY: number,
    elevationDelta: number,
    contactTerrainRatio: number,
) {
    const cueIntensity = getContactTerrainCueIntensity(contactTerrainRatio);
    const elevationIntensity = Phaser.Math.Clamp(Math.abs(elevationDelta) / 72, 0, 1);
    const intensity = Math.max(cueIntensity, elevationIntensity * 0.7);
    const smoothIntensity = intensity * intensity * (3 - 2 * intensity);
    const direction = contactTerrainRatio < 0
        ? 1
        : contactTerrainRatio > 0
            ? -0.65
            : 0;

    return fixedAnchorY + direction * PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT * smoothIntensity;
}

function getContactTerrainCueIntensity(contactTerrainRatio: number) {
    const deadZone = 0.25;
    const rawIntensity = Phaser.Math.Clamp(
        (Math.abs(contactTerrainRatio) - deadZone) / (1 - deadZone),
        0,
        1,
    );

    return rawIntensity * rawIntensity * (3 - 2 * rawIntensity);
}

function getVehicleShadowProfile(frameId: string) {
    return PLAYER_VEHICLE_ATLAS.apex.shadowProfiles[frameId] ??
        PLAYER_VEHICLE_ATLAS.apex.shadowProfiles.default;
}

function getShadowElementCenter(
    element: VehicleShadowElement,
    frame: VehicleAtlasFrame,
    anchor: VehicleAnchor,
    displaySize: number,
    flipX: boolean,
    terrainIntensity: number,
) {
    const xOffset = (element.x - frame.origin.x) * displaySize;
    const yOffset = (element.y - frame.origin.y) * displaySize;
    const terrainY = displaySize * Phaser.Math.Linear(0.002, 0.008, terrainIntensity);

    return {
        x: anchor.x + (flipX ? -xOffset : xOffset),
        y: anchor.y + yOffset + terrainY,
    };
}

function getShadowTerrainScale(contactTerrainRatio: number) {
    const intensity = getContactTerrainCueIntensity(contactTerrainRatio);

    if (contactTerrainRatio < 0) {
        return {
            x: 1,
            y: Phaser.Math.Linear(1, 0.76, intensity),
        };
    }

    if (contactTerrainRatio > 0) {
        return {
            x: 1,
            y: Phaser.Math.Linear(1, 1.12, intensity),
        };
    }

    return {
        x: 1,
        y: 1,
    };
}

function getSilhouetteShadowScale(contactTerrainRatio: number, speedRatio: number) {
    const terrainIntensity = getContactTerrainCueIntensity(contactTerrainRatio);
    const speedStretch = Phaser.Math.Linear(1.02, 1.1, speedRatio);
    const downhillStretch = contactTerrainRatio < 0
        ? Phaser.Math.Linear(1, 1.08, terrainIntensity)
        : 1;
    const uphillStretch = contactTerrainRatio > 0
        ? Phaser.Math.Linear(1, 0.96, terrainIntensity)
        : 1;
    const squash = contactTerrainRatio < 0
        ? Phaser.Math.Linear(0.42, 0.34, terrainIntensity)
        : Phaser.Math.Linear(0.42, 0.46, terrainIntensity);

    return {
        x: speedStretch * downhillStretch * uphillStretch,
        y: squash,
    };
}

function drawShadowContactPatch(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
) {
    const clampedHeight = Math.max(2, height);

    graphics.fillRoundedRect(
        centerX - width / 2,
        centerY - clampedHeight / 2,
        width,
        clampedHeight,
        Math.min(clampedHeight / 2, width * 0.18),
    );
}

function getCornerIntensity(curve: number) {
    return Phaser.Math.Clamp(Math.abs(curve) / 0.72, 0, 1);
}

function getHighSpeedSteeringRatio(speedRatio: number, maxDrop: number) {
    const smoothSpeed = speedRatio * speedRatio * (3 - 2 * speedRatio);

    return Phaser.Math.Clamp(1 - smoothSpeed * maxDrop, 1 - maxDrop, 1);
}

function getEngineRpm(speed: number, throttle: number, brake: number) {
    const gearRatios = [0.18, 0.32, 0.48, 0.66, 0.84, 1];
    const speedRatio = Phaser.Math.Clamp(speed / PLAYER_ACCEL_SPEED, 0, 1);
    const gearIndex = Math.min(
        gearRatios.length - 1,
        Math.floor(speedRatio * gearRatios.length),
    );
    const gearStart = gearIndex === 0 ? 0 : gearRatios[gearIndex - 1];
    const gearEnd = gearRatios[gearIndex];
    const gearProgress = Phaser.Math.Clamp((speedRatio - gearStart) / (gearEnd - gearStart), 0, 1);
    const throttleLift = throttle > 0 ? 850 : 0;
    const brakeDrop = brake > 0 ? 550 : 0;

    return Phaser.Math.Clamp(
        PLAYER_RPM_IDLE + gearProgress * (PLAYER_RPM_REDLINE - PLAYER_RPM_IDLE) + throttleLift - brakeDrop,
        PLAYER_RPM_IDLE,
        PLAYER_RPM_REDLINE,
    );
}

function getPlayerVehicleSpriteSize(viewport: Viewport) {
    return Phaser.Math.Clamp(
        viewport.width * RUNTIME_TUNING.vehicleViewportRatio,
        RUNTIME_TUNING.vehicleMinSize,
        RUNTIME_TUNING.vehicleMaxSize,
    );
}

function getTerrainScaledSpriteSize(baseSize: number, anchor: VehicleAnchor) {
    return baseSize * getTerrainScaleMultiplier(anchor);
}

function getTerrainScaleMultiplier(anchor: VehicleAnchor) {
    const intensity = RUNTIME_TUNING.terrainScaleIntensity;
    const elevationRatio = Phaser.Math.Clamp(Math.abs(anchor.elevationDelta) / 260, 0, 1);
    const smoothRatio = elevationRatio * elevationRatio * (3 - 2 * elevationRatio);

    if (anchor.terrainCue === 'downhill') return 1 - intensity * smoothRatio;
    if (anchor.terrainCue === 'uphill') return 1 + intensity * 0.8 * smoothRatio;

    return 1;
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

    return {
        cameraBaseFov: readTuningNumber(params, 'fov', CAMERA_BASE_FOV, 58, 82),
        cameraSpeedFovBonus: readTuningNumber(params, 'fovBonus', CAMERA_SPEED_FOV_BONUS, 0, 8),
        curveScreenBias: readTuningNumber(params, 'curveCarBias', PLAYER_CURVE_SCREEN_BIAS, 0, 96),
        debugProjectionGuides: readBooleanParam(params, 'debugGuides', DEBUG_PROJECTION_GUIDES),
        playerRoadAnchorDistance: readTuningNumber(
            params,
            'anchorZ',
            PLAYER_ROAD_ANCHOR_DISTANCE,
            420,
            900,
        ),
        playerRoadContactDistance: readTuningNumber(
            params,
            'contactZ',
            PLAYER_ROAD_CONTACT_DISTANCE,
            120,
            520,
        ),
        playerContactTerrainCueThreshold: readTuningNumber(
            params,
            'contactCueThreshold',
            PLAYER_CONTACT_TERRAIN_CUE_THRESHOLD,
            3,
            48,
        ),
        playerScreenAnchorRatio: readTuningNumber(
            params,
            'anchorY',
            PLAYER_SCREEN_ANCHOR_RATIO,
            0.82,
            0.94,
        ),
        steerWeakThreshold: weakThreshold,
        terrainCueThreshold: readTuningNumber(
            params,
            'terrainThreshold',
            PLAYER_TERRAIN_CUE_THRESHOLD,
            4,
            80,
        ),
        terrainScaleIntensity: readTuningNumber(
            params,
            'terrainScale',
            PLAYER_TERRAIN_SCALE_INTENSITY,
            0,
            0.09,
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

function createRuntimeQaOverrides(): RuntimeQaOverrides {
    const params = URL_PARAMS;
    const freeze = readBooleanParam(params, 'qaFreeze', false);
    const steering = readOptionalTuningNumber(params, 'qaSteer', -1, 1);
    const speed = readOptionalTuningNumber(params, 'qaSpeed', 0, PLAYER_ACCEL_SPEED);
    const z = readOptionalTuningNumber(params, 'qaZ', 0, Number.MAX_SAFE_INTEGER);
    const lateralOffset = readOptionalTuningNumber(
        params,
        'qaOffset',
        -PLAYER_MAX_ROAD_OFFSET,
        PLAYER_MAX_ROAD_OFFSET,
    );

    return {
        enabled: freeze || steering !== null || speed !== null || z !== null || lateralOffset !== null,
        freeze,
        lateralOffset,
        speed,
        steering,
        z,
    };
}

function createRuntimeTelemetryConfig(): RuntimeTelemetryConfig {
    const params = URL_PARAMS;
    const enabled = readBooleanParam(params, 'telemetry', false);

    return {
        autoExport: enabled && readBooleanParam(params, 'telemetryAutoExport', true),
        durationSec: readTuningNumber(
            params,
            'telemetryDuration',
            TELEMETRY_DEFAULT_DURATION_SEC,
            1,
            1800,
        ),
        enabled,
        sampleHz: readTuningNumber(
            params,
            'telemetryHz',
            TELEMETRY_DEFAULT_SAMPLE_HZ,
            1,
            60,
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

function readOptionalTuningNumber(
    params: URLSearchParams,
    key: string,
    min: number,
    max: number,
) {
    const rawValue = params.get(key);

    if (rawValue === null) return null;

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) return null;

    return Phaser.Math.Clamp(parsed, min, max);
}

function readBooleanParam(params: URLSearchParams, key: string, fallback: boolean) {
    const rawValue = params.get(key);

    if (rawValue === null) return fallback;

    return rawValue === '1' || rawValue === 'true';
}

function formatNullableNumber(value: number | null) {
    return value === null ? '--' : value.toFixed(2);
}

function createTelemetrySessionId() {
    const randomPart = Math.random().toString(36).slice(2, 8);
    const timePart = new Date().toISOString().replace(/[:.]/g, '-');

    return `${timePart}_${randomPart}`;
}
