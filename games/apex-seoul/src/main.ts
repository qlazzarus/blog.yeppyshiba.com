import Phaser from 'phaser';
import './styles.css';
import farCityParallaxUrl from '../assets/environment/approved/parallax-v1/city-far-blueblack.png';
import farCityLightsUrl from '../assets/environment/approved/parallax-v1/city-far-lights-bluewhite.png';
import cloudDarkBlueUrl from '../assets/environment/approved/parallax-v1/cloud-dark-blue.png';
import moonCoolBlueUrl from '../assets/environment/approved/parallax-v1/moon-cool-blue.png';
import nearRidgeParallaxUrl from '../assets/environment/approved/parallax-v1/ridge-near-blueblack.png';
import burnoutPuffAUrl from '../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-a.png';
import burnoutPuffBUrl from '../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-b.png';
import burnoutPuffCUrl from '../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-c.png';
import wallForestTree01Url from '../assets/environment/approved/wall-forest-svg/tree-01-tall-pine.svg?no-inline';
import wallForestTree02Url from '../assets/environment/approved/wall-forest-svg/tree-02-wide-pine.svg?no-inline';
import wallForestTree03Url from '../assets/environment/approved/wall-forest-svg/tree-03-cypress.svg?no-inline';
import wallForestTree04Url from '../assets/environment/approved/wall-forest-svg/tree-04-leaning-pine.svg?no-inline';
import wallForestTree05Url from '../assets/environment/approved/wall-forest-svg/tree-05-broadleaf.svg?no-inline';
import genesisG70VehicleAtlas from '../assets/vehicles/approved/atlases/genesis-g70-poc-128.json';
import genesisG70VehicleShadowSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png';
import genesisG70VehicleSpriteUrl from '../assets/vehicles/approved/sprites/genesis-g70-poc-128.png';
import ft86RetroVehicleAtlas from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json';
import ft86RetroBlackVehicleSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png';
import ft86RetroBlueVehicleSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png';
import ft86RetroRedVehicleSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-red-alpha.png';
import ft86RetroShadowSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha-shadow.png';
import ft86RetroSilverVehicleSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png';
import ft86RetroYellowVehicleSpriteUrl from '../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-yellow-alpha.png';
import {
    createCollisionDebugText,
    createHudText,
    renderCollisionDebugText,
    renderHudText,
} from './game/hud';
import {
    APEX_S_ENGINE_PROFILE,
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from './game/engineProfile';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from './game/playerVehicleController';
import {
    applyGuardrailCollision,
    getGuardrailCollisionGeometry,
    GUARDRAIL_COLLISION_CONFIG,
} from './game/guardrailCollision';
import {
    projectGuardrailCollisionToScreen,
    type GuardrailScreenProjection,
} from './game/guardrailScreenProjection';
import {
    createDefaultCamera,
    getFocalLength,
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type Viewport,
} from './game/pseudo3dCamera';
import {
    createRoadTrack,
    DEFAULT_ROAD_HALF_WIDTH,
    getRoadCurveAt,
    getRoadElevationAt,
    getRoadHalfWidthAt,
    getRoadHeadingPreview,
    parseRoadTrackId,
    wrapDistance,
    type RoadTrack,
} from './game/road';
import {
    ELEVATION_VISUAL_SCALE,
    getRoadCenterOffsetAhead,
    getRoadSpanAtScreenY,
    getRoadWidthAtScreenY,
    renderHorizonOcclusion,
    renderRoad,
    type RoadRenderStats,
} from './game/roadRenderer';
import {
    createRoadObjectMotionTracker,
    createRoadObjects,
    renderRoadObjects,
    type RoadObject,
    type RoadObjectMotionTracker,
    type RoadObjectRenderStats,
    type WallForestSpriteState,
} from './game/roadObjectRenderer';
import { RenderDepth } from './game/renderDepth';
import {
    APEX_SEOUL_DEFAULTS,
    createApexSeoulRuntimeConfig,
} from './game/apexSeoulConfig';
import {
    createCourseRunState,
    updateCourseRunCountdown,
    updateCourseRunProgress,
    type CourseRunConfig,
    type CourseRunState,
} from './game/courseRun';
import { loadBestRunTime, saveBestRunTime } from './game/runRecord';
import {
    beginLaunch,
    createLaunchControlState,
    updateLaunchControl,
    updatePreLaunchRev,
    type LaunchControlConfig,
    type LaunchControlState,
} from './game/launchControl';
import {
    applyRuntimeQaOverridesToState,
    serializeRuntimeQaCamera,
    serializeRuntimeQaGuardrailScreen,
    serializeRuntimeQaHeadlight,
    serializeRuntimeQaLaunch,
    serializeRuntimeQaLongitudinal,
    serializeRuntimeQaPlayerCornerDemand,
    serializeRuntimeQaPlayerCornerSpeedLoss,
    serializeRuntimeQaPlayerSpeedHandling,
    serializeRuntimeQaPlayer,
    serializeRuntimeQaPhysicsRoad,
    serializeRuntimeQaRun,
    serializeRuntimeQaSpeedEffect,
    serializeRuntimeQaTrack,
    serializeRuntimeQaVehicle,
} from './game/runtimeQaState';
import * as PLAYER_DEFAULTS from './game/playerVehicleDefaults';
import { createPlayerVehicleRuntimeConfig } from './game/playerVehicleDefaults';
import { RuntimeTelemetryRecorder } from './game/runtimeTelemetry';
import {
    createSceneKeyboardBindings,
    mergeDriveCommands,
    readDriveCommand,
    readSceneHotkeys,
} from './game/sceneInput';
import {
    getLaunchBurnoutPresentation,
    getPlayerAnchorPresentation,
    getPlayerPosePresentation,
    getPlayerShadowPresentation,
    getRoadRelativeSizePresentation,
    getUndersteerTireCuePresentation,
} from './game/playerPresentation';
import { type VehicleRoadScaleConfig } from './game/vehicleRoadScale';
import { selectRuntimeVehicleAsset } from './game/vehicleCatalog';
import {
    getBackdropBandRects,
    getBackdropCityLayout,
    getBackdropSkyLayout,
    getForegroundMatteRects,
} from './game/sceneBackdrop';
import {
    createSpeedEffectShader,
    getSpeedEffectExpectedPeakAlpha,
    type SpeedEffectShaderUniforms,
} from './game/speedEffectShader';
import {
    createHeadlightShader,
    type HeadlightShaderUniforms,
} from './game/headlightShader';
import {
    composeVehicleHeadlightAim,
    composeVehicleHeadlightCurveIntent,
    getVehicleHeadlightCornerFillGuide,
    getVehicleHeadlightEmitterState,
    getVehicleHeadlightFootprintDimensions,
    getVehicleHeadlightFootprintGuide,
    getVehicleHeadlightOpticalState,
    getVehicleHeadlightScreenPose,
    updateVehicleHeadlightCurveIntent,
    type VehicleHeadlightOpticalState,
    type VehicleHeadlightScreenPose,
} from './game/vehicleHeadlight';
import {
    createCameraEffectsConfig,
    createCameraEffectsState,
    DEFAULT_CAMERA_EFFECTS_CONFIG,
    updateCameraEffects,
} from './game/cameraEffects.js';
import {
    createSpeedCueState,
    SPEED_CUE_CONFIG,
    updateSpeedCue,
} from './game/speedCue.js';
import {
    getSpeedEffectIntensity,
    SPEED_PRESENTATION_WORLD_CONFIG,
} from './game/speedPresentationConfig';
import {
    createLongitudinalProgressionConfig,
    getLongitudinalWorldTravelSpeed,
    getNextLongitudinalUnitScale,
} from './game/longitudinalProgression';
import {
    drawShadowContactPatch,
    getContactTerrainCueIntensity,
    getPlayerVehicleSpriteSize,
    getShadowElementCenter,
    getSilhouetteShadowScale,
    getTerrainScaledSpriteSize,
    getTerrainScaleMultiplier,
    getVehicleFrameIndex,
    getVehicleShadowProfile,
    selectVehicleTerrainCue,
    type PlayerVehicleState,
    type RuntimeVehicleQaState,
    type VehicleAnchor,
    type VehicleAtlas,
} from './game/vehicle';
import {
    createVehicleUndersteerVisualState,
    updateVehicleUndersteerVisualState,
    type VehicleUndersteerVisualState,
} from './game/vehicleUndersteerVisual';

const {
    camera: {
        downhillExtraPitch: CAMERA_DOWNHILL_EXTRA_PITCH,
        inputResponse: CAMERA_INPUT_RESPONSE,
        lateralSpeed: CAMERA_LATERAL_SPEED,
        maxSlopePitch: CAMERA_MAX_SLOPE_PITCH,
        slopePitchResponse: CAMERA_SLOPE_PITCH_RESPONSE,
    },
    course: {
        checkpointRatios: COURSE_CHECKPOINT_RATIOS,
        countdownSeconds: RUN_COUNTDOWN_SECONDS,
        finishRatio: COURSE_FINISH_RATIO,
    },
    debug: {
        guardrailImpactHoldSeconds: DEBUG_GUARDRAIL_IMPACT_HOLD_SECONDS,
        projectionGuides: DEBUG_PROJECTION_GUIDES,
    },
    game: { height: GAME_HEIGHT, width: GAME_WIDTH },
    launch: LAUNCH_DEFAULTS,
    run: { finishCoastSpeed: RUN_FINISH_COAST_SPEED },
    telemetry: {
        durationSec: TELEMETRY_DEFAULT_DURATION_SEC,
        sampleHz: TELEMETRY_DEFAULT_SAMPLE_HZ,
    },
    world: {
        cityFarParallaxHeight: CITY_FAR_PARALLAX_HEIGHT,
        cityParallaxWidth: CITY_PARALLAX_WIDTH,
        cityRidgeBaselineOffsetY: CITY_RIDGE_BASELINE_OFFSET_Y,
        cityRidgeParallaxHeight: CITY_RIDGE_PARALLAX_HEIGHT,
        citySkylineBaseYRatio: CITY_SKYLINE_BASE_Y_RATIO,
        moonDisplaySize: MOON_DISPLAY_SIZE,
        moonXRatio: MOON_X_RATIO,
        moonYRatio: MOON_Y_RATIO,
    },
} = APEX_SEOUL_DEFAULTS;
const ENABLE_DEBUG_CAMERA_CONTROLS = false;
const FINISH_COAST_DURATION_SEC = 5;
const FINISH_COAST_VEHICLE_TRAVEL_SEGMENTS = 18;
const COURSE_RUN_CONFIG: CourseRunConfig = {
    checkpointRatios: COURSE_CHECKPOINT_RATIOS,
    countdownSeconds: RUN_COUNTDOWN_SECONDS,
    finishRatio: COURSE_FINISH_RATIO,
};
const LAUNCH_CONTROL_CONFIG: LaunchControlConfig = {
    ...LAUNCH_DEFAULTS,
    idleRpm: PLAYER_DEFAULTS.PLAYER_RPM_IDLE,
};
const CITY_FAR_PARALLAX_KEY = 'city-far-parallax';
const CITY_FAR_LIGHTS_KEY = 'city-far-lights';
const CITY_RIDGE_PARALLAX_KEY = 'city-ridge-parallax';
const CLOUD_DARK_BLUE_KEY = 'cloud-dark-blue';
const MOON_COOL_BLUE_KEY = 'moon-cool-blue';
const BURNOUT_PUFF_KEYS = [
    'burnout-puff-a',
    'burnout-puff-b',
    'burnout-puff-c',
] as const;
const WALL_FOREST_TREE_KEYS = [
    'wall-forest-tree-01',
    'wall-forest-tree-02',
    'wall-forest-tree-03',
    'wall-forest-tree-04',
    'wall-forest-tree-05',
] as const;
const FT86_RETRO_SPRITE_URLS: Record<string, string> = {
    black: ft86RetroBlackVehicleSpriteUrl,
    blue: ft86RetroBlueVehicleSpriteUrl,
    red: ft86RetroRedVehicleSpriteUrl,
    silver: ft86RetroSilverVehicleSpriteUrl,
    yellow: ft86RetroYellowVehicleSpriteUrl,
};

const URL_PARAMS = new URLSearchParams(window.location.search);
const APEX_RUNTIME = createApexSeoulRuntimeConfig(URL_PARAMS);
const LONGITUDINAL_PROGRESSION = APEX_RUNTIME.longitudinalProgression;
const ACTIVE_RUNTIME_VEHICLE = selectRuntimeVehicleAsset(URL_PARAMS, {
    ft86: {
        atlas: ft86RetroVehicleAtlas as VehicleAtlas,
        colors: FT86_RETRO_SPRITE_URLS,
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: ft86RetroShadowSpriteUrl,
    },
    genesis: {
        atlas: genesisG70VehicleAtlas as VehicleAtlas,
        engineProfile: APEX_S_ENGINE_PROFILE,
        shadowSpriteUrl: genesisG70VehicleShadowSpriteUrl,
        spriteUrl: genesisG70VehicleSpriteUrl,
    },
});
const LAUNCH_CONTROL_ENABLED = ACTIVE_RUNTIME_VEHICLE.id === 'ft86-retro';
const PLAYER_VEHICLE_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.textureKey;
const PLAYER_VEHICLE_SHADOW_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.shadowTextureKey;
const ACTIVE_ROAD_TRACK_ID = APEX_RUNTIME.roadTrackId;
const RUNTIME_TUNING = APEX_RUNTIME.tuning;
const CAMERA_EFFECTS_CONFIG = APEX_RUNTIME.cameraEffects;
const RUNTIME_QA = APEX_RUNTIME.qa;
const RUNTIME_TELEMETRY = APEX_RUNTIME.telemetry;

function createRuntimeQaCamera() {
    const camera = createDefaultCamera();

    camera.z = RUNTIME_QA.initialZ ?? camera.z;

    return camera;
}

const PLAYER_CONTROLLER_CONFIG = createPlayerVehicleRuntimeConfig(
    URL_PARAMS,
    ACTIVE_RUNTIME_VEHICLE.engineProfile,
);

const PLAYER_VEHICLE_ATLAS = ACTIVE_RUNTIME_VEHICLE.atlas;

type PlayerVehicleRenderState = {
    anchor: VehicleAnchor;
    displaySize: number;
    guardrailScreenProjection: GuardrailScreenProjection | null;
    roadRelativeScale: number;
    roadRelativeTargetSize: number;
    roadWidthAtVehicleY: number | null;
};

type FinishCoastPresentation = {
    size: number;
    x: number;
    y: number;
};

type PlayerVehicleVisualSteeringState = {
    bodyYawAuthority: number;
    bodyYawValue: number;
    gripAuthorityRatio: number;
    inputPoseValue: number;
    lowSpeedVisualSteeringAuthority: number;
    physicalValue: number;
    poseAuthority: number;
    rotationValue: number;
    threshold: number;
    understeerCueIntensity: number;
    value: number;
};

// The strong drift sprite already supplies most of the pose yaw. Retaining a
// small dynamic body roll keeps road-flow readable across the frame switch
// without visually double-rotating the car.
const DRIFT_BODY_ROLL_SCALE = 0.34;

type PlayerVehiclePoseRenderState = {
    flipX: boolean;
    frameId: string;
    rotationRadians: number;
    visualSteering: PlayerVehicleVisualSteeringState;
};

type BurnoutSkidMark = {
    ageSec: number;
    alpha: number;
    lateralOffset: number;
    lengthPixels: number;
    widthPixels: number;
    z: number;
};

type PlayerPhysicsRoadSample = {
    cameraZ: number;
    contactZ: number;
    currentCurve: number;
    farTangentChange: number;
    nearTangentChange: number;
    pavedHalfWidth: number;
    previewRoadCurve: number;
    railCenterLimit: number;
};

class ApexSeoulScene extends Phaser.Scene {
    private backgroundGraphics!: Phaser.GameObjects.Graphics;
    private cameraResource: Pseudo3dCamera = createRuntimeQaCamera();
    private cameraEffects = createCameraEffectsState(CAMERA_EFFECTS_CONFIG);
    private cameraManualPitch = 0;
    private cameraTerrainPitch = 0;
    private cameraVelocity = {
        height: 0,
        lateral: 0,
        pitch: 0,
    };
    private debugGuardrailImpactBounceVelocity = 0;
    private debugGuardrailImpactSide: -1 | 0 | 1 = 0;
    private debugGuardrailImpactTimer = 0;
    private farCityParallax!: Phaser.GameObjects.Image;
    private farCityLights!: Phaser.GameObjects.Image;
    private farCloud!: Phaser.GameObjects.Image;
    private foregroundOcclusionGraphics!: Phaser.GameObjects.Graphics;
    private burnoutSmokePuffs: Phaser.GameObjects.Image[] = [];
    private burnoutSkidMarks: BurnoutSkidMark[] = [];
    private tireScrubGraphics!: Phaser.GameObjects.Graphics;
    private headlightShader!: Phaser.GameObjects.Shader;
    private headlightLampPose: VehicleHeadlightScreenPose | null = null;
    private terrainHorizonOcclusionGraphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private collisionDebugText!: Phaser.GameObjects.Text;
    private debugHudVisible = true;
    private graphics!: Phaser.GameObjects.Graphics;
    private uiGraphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private runStatusText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'b' | 'd' | 'e' | 'l' | 'q' | 'r' | 's' | 'space' | 'w', Phaser.Input.Keyboard.Key>;
    private elapsedSec = 0;
    private lastVehicleQaState: RuntimeVehicleQaState | null = null;
    private launchState: LaunchControlState = createLaunchControlState();
    private moon!: Phaser.GameObjects.Image;
    private nearCloud!: Phaser.GameObjects.Image;
    private nearRidgeParallax!: Phaser.GameObjects.Image;
    private roadRelativeVehicleSize: number | null = null;
    private vehicleRenderState: PlayerVehicleRenderState | null = null;
    private vehicleUndersteerVisualState: VehicleUndersteerVisualState =
        createVehicleUndersteerVisualState();
    private lastVehicleSizeSample: { elapsedSec: number; size: number } | null = null;
    private playerCar!: Phaser.GameObjects.Image;
    private playerSoftShadowCar!: Phaser.GameObjects.Image;
    private playerShadowCar!: Phaser.GameObjects.Image;
    private playerVehicle: PlayerVehicleState = createDefaultPlayerVehicleState(
        RUNTIME_QA.initialSpeed ?? PLAYER_DEFAULTS.PLAYER_CRUISE_SPEED,
        ACTIVE_RUNTIME_VEHICLE.engineProfile,
        PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED,
    );
    private roadObjects: RoadObject[] = [];
    private roadObjectMotionTracker: RoadObjectMotionTracker = createRoadObjectMotionTracker();
    private roadObjectStats: RoadObjectRenderStats | null = null;
    private roadStats: RoadRenderStats | null = null;
    private headlightAimTargetX = 0;
    private headlightAimX = 0;
    private headlightCurveIntent = 0;
    private headlightCurveIntentTarget = 0;
    private headlightFineAimX = 0;
    private headlightFramePoseAimX = 0;
    private headlightRawRoadAimX = 0;
    private headlightRoadAimX = 0;
    private headlightOpticalState: VehicleHeadlightOpticalState =
        getVehicleHeadlightOpticalState(PLAYER_VEHICLE_ATLAS, 0);
    private roadTrack: RoadTrack = createRoadTrack(ACTIVE_ROAD_TRACK_ID);
    private playerPhysicsRoadSample: PlayerPhysicsRoadSample = {
        cameraZ: 0,
        contactZ: PLAYER_DEFAULTS.PLAYER_ROAD_CONTACT_DISTANCE,
        currentCurve: 0,
        farTangentChange: 0,
        nearTangentChange: 0,
        pavedHalfWidth: DEFAULT_ROAD_HALF_WIDTH,
        previewRoadCurve: 0,
        railCenterLimit:
            DEFAULT_ROAD_HALF_WIDTH +
            GUARDRAIL_COLLISION_CONFIG.contactClearance -
            GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    };
    private wallForestSprites = new Map<string, Phaser.GameObjects.Image>();
    private speedEffectIntensity = 0;
    private speedEffectCue = {
        base: 0,
        downhill: 0,
        driftExitBurst: 0,
        driftFlow: 0,
        throttleBurst: 0,
    };
    private speedCueState = createSpeedCueState();
    private speedEffectShader!: Phaser.GameObjects.Shader;
    private speedEffectTime = 0;
    private telemetry: RuntimeTelemetryRecorder | null = null;
    private courseRunConfig: CourseRunConfig = COURSE_RUN_CONFIG;
    private runState: CourseRunState = createCourseRunState(COURSE_RUN_CONFIG, RUNTIME_QA.enabled);
    private bestRunTimeSec: number | null = null;
    private checkpointNoticeRemainingSec = 0;
    private checkpointNoticeText = '';
    private lastFinishDeltaSec: number | null = null;
    private runFinishedWithBest = false;
    private finishCoastRemainingSec = 0;
    private finishCoastProgress = 0;
    private finishCoastStartProjectionScale = 0;
    private finishCoastLateralOffset = 0;
    private finishCoastVehicleZ = 0;
    private finishPresentationPhase: 'racing' | 'capture' | 'coast' | 'results' = 'racing';
    private finishCoastPresentation: FinishCoastPresentation | null = null;

    constructor() {
        super('apex-seoul');
    }

    preload() {
        this.load.image(CITY_FAR_PARALLAX_KEY, farCityParallaxUrl);
        this.load.image(CITY_FAR_LIGHTS_KEY, farCityLightsUrl);
        this.load.image(CLOUD_DARK_BLUE_KEY, cloudDarkBlueUrl);
        this.load.image(MOON_COOL_BLUE_KEY, moonCoolBlueUrl);
        this.load.image(CITY_RIDGE_PARALLAX_KEY, nearRidgeParallaxUrl);
        this.load.image(BURNOUT_PUFF_KEYS[0], burnoutPuffAUrl);
        this.load.image(BURNOUT_PUFF_KEYS[1], burnoutPuffBUrl);
        this.load.image(BURNOUT_PUFF_KEYS[2], burnoutPuffCUrl);
        this.load.svg(WALL_FOREST_TREE_KEYS[0], wallForestTree01Url);
        this.load.svg(WALL_FOREST_TREE_KEYS[1], wallForestTree02Url);
        this.load.svg(WALL_FOREST_TREE_KEYS[2], wallForestTree03Url);
        this.load.svg(WALL_FOREST_TREE_KEYS[3], wallForestTree04Url);
        this.load.svg(WALL_FOREST_TREE_KEYS[4], wallForestTree05Url);
        this.load.spritesheet(PLAYER_VEHICLE_TEXTURE_KEY, ACTIVE_RUNTIME_VEHICLE.spriteUrl, {
            frameHeight: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
            frameWidth: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
        });
        this.load.spritesheet(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, ACTIVE_RUNTIME_VEHICLE.shadowSpriteUrl, {
            frameHeight: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
            frameWidth: PLAYER_VEHICLE_ATLAS.apex.targetCellSize,
        });
    }

    create() {
        this.cameraResource.fovDegrees = this.cameraEffects.fovDegrees;
        this.courseRunConfig = {
            ...COURSE_RUN_CONFIG,
            finishRatio: 1,
        };
        this.runState = createCourseRunState(this.courseRunConfig, RUNTIME_QA.enabled);
        this.roadObjects = createRoadObjects(this.roadTrack, COURSE_CHECKPOINT_RATIOS);
        this.bestRunTimeSec = loadBestRunTime(this.roadTrack.id);
        this.applyRuntimeQaOverrides();
        this.playerPhysicsRoadSample = this.samplePlayerPhysicsRoad();
        this.cameras.main.setBackgroundColor('#050812');
        this.backgroundGraphics = this.add.graphics().setDepth(RenderDepth.Background);
        this.moon = this.createSkyLayer(MOON_COOL_BLUE_KEY, RenderDepth.Moon);
        this.farCloud = this.createSkyLayer(CLOUD_DARK_BLUE_KEY, RenderDepth.FarCloud);
        this.nearCloud = this.createSkyLayer(CLOUD_DARK_BLUE_KEY, RenderDepth.NearCloud);
        this.farCityParallax = this.createParallaxLayer(CITY_FAR_PARALLAX_KEY, RenderDepth.FarCity);
        this.farCityLights = this.createParallaxLayer(CITY_FAR_LIGHTS_KEY, RenderDepth.FarCityLights);
        this.nearRidgeParallax = this.createParallaxLayer(CITY_RIDGE_PARALLAX_KEY, RenderDepth.NearRidge);
        this.terrainHorizonOcclusionGraphics = this.add.graphics().setDepth(RenderDepth.TerrainHorizonOcclusion);
        this.graphics = this.add.graphics().setDepth(RenderDepth.World);
        this.foregroundOcclusionGraphics = this.add.graphics().setDepth(RenderDepth.ForegroundMatte);
        this.tireScrubGraphics = this.add.graphics().setDepth(RenderDepth.PlayerTireCue);
        this.burnoutSmokePuffs = Array.from({ length: 4 }, (_, index) => this.add
            .image(0, 0, BURNOUT_PUFF_KEYS[index % BURNOUT_PUFF_KEYS.length])
            .setDepth(RenderDepth.PlayerTireCue)
            .setOrigin(0.5)
            .setTint(0x8da4ad)
            .setVisible(false));
        this.uiGraphics = this.add.graphics().setDepth(RenderDepth.Ui);
        this.playerSoftShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_DEFAULTS.PLAYER_SHADOW_SOFT_ALPHA)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
            .setDepth(RenderDepth.PlayerSoftShadow)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.playerSoftShadowCar.enableFilters().filters.internal.addBlur(1, 2.5, 1.4, 1, 0x000000, 2);
        this.playerShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_DEFAULTS.PLAYER_SILHOUETTE_SHADOW_ALPHA)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
            .setDepth(RenderDepth.PlayerShadow)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.playerCar = this.add
            .image(0, 0, PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setDepth(RenderDepth.Player)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.speedEffectShader = createSpeedEffectShader(
            this,
            this.getViewport(),
            () => this.getSpeedEffectShaderUniforms(),
        );
        this.headlightShader = createHeadlightShader(
            this,
            this.getViewport(),
            () => this.getHeadlightShaderUniforms(),
        );
        this.collisionDebugText = createCollisionDebugText(this);
        this.hudText = createHudText(this);
        this.runStatusText = this.add
            .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '', {
                align: 'center',
                color: '#f2f8ff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '48px',
                fontStyle: 'bold',
                stroke: '#07101f',
                strokeThickness: 8,
            })
            .setDepth(RenderDepth.Hud)
            .setOrigin(0.5);

        const keyboardBindings = createSceneKeyboardBindings(this.input.keyboard!);
        this.cursors = keyboardBindings.cursors;
        this.keys = keyboardBindings.keys;
        this.telemetry = new RuntimeTelemetryRecorder(
            RUNTIME_TELEMETRY,
            () => {
                const viewport = this.getViewport();

                return this.getRuntimeQaState(viewport, getHorizonY(this.cameraResource, viewport));
            },
        );

        this.scale.on('resize', () => this.render(0));
        this.render();
    }

    update(_time: number, delta: number) {
        const seconds = delta / 1000 * RUNTIME_QA.timeScale;
        const camera = this.cameraResource;

        this.elapsedSec += seconds;
        this.updateBurnoutSkidMarks(seconds);
        this.applyRuntimeQaOverrides();
        this.updateTelemetryHotkey();
        this.updateDebugHudHotkey();
        this.updateLongitudinalAbHotkey();
        this.updateRestartHotkey();
        this.playerPhysicsRoadSample = this.samplePlayerPhysicsRoad();

        if (RUNTIME_QA.freeze) {
            camera.pitch = this.updateCameraPitch(seconds);
            this.updateSpeedEffect(seconds);
            camera.fovDegrees = this.cameraEffects.fovDegrees;
            this.render(seconds);
            this.telemetry?.update(this.elapsedSec);
            return;
        }

        if (!this.runState.started) {
            this.updateRunCountdown(seconds);
            camera.pitch = this.updateCameraPitch(seconds);
            this.updateSpeedEffect(seconds);
            camera.fovDegrees = this.cameraEffects.fovDegrees;
            this.render(seconds);
            this.telemetry?.update(this.elapsedSec);
            return;
        }

        if (this.runState.finished) {
            this.playerVehicle.speed = RUN_FINISH_COAST_SPEED;
            if (this.finishPresentationPhase === 'capture') {
                this.beginFinishCoast();
            } else if (this.finishPresentationPhase === 'coast') {
                this.finishCoastRemainingSec = Math.max(0, this.finishCoastRemainingSec - seconds);
                this.finishCoastProgress = 1 - this.finishCoastRemainingSec / FINISH_COAST_DURATION_SEC;
                const coastEndZ = this.roadTrack.finishZ +
                    this.roadTrack.segmentLength * FINISH_COAST_VEHICLE_TRAVEL_SEGMENTS;
                this.finishCoastVehicleZ = Math.min(
                    coastEndZ,
                    this.finishCoastVehicleZ + (coastEndZ - this.finishCoastVehicleZ) /
                        Math.max(0.001, this.finishCoastRemainingSec + seconds) * seconds,
                );
                if (this.finishCoastRemainingSec === 0) this.finishPresentationPhase = 'results';
            }
            camera.pitch = this.updateCameraPitch(seconds);
            this.updateSpeedEffect(seconds);
            camera.fovDegrees = this.cameraEffects.fovDegrees;
            this.render(seconds);
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
        camera.z = Math.min(
            camera.z + this.getWorldTravelSpeed() * seconds,
            this.roadTrack.length,
        );
        this.updateRunState(seconds);
        camera.pitch = this.updateCameraPitch(seconds);
        this.updateSpeedEffect(seconds);
        camera.fovDegrees = this.cameraEffects.fovDegrees;
        this.render(seconds);
        this.telemetry?.update(this.elapsedSec);
    }

    private render(seconds = 0) {
        const viewport = this.getViewport();
        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.backgroundGraphics.clear();
        this.backgroundGraphics.setPosition(0, 0);
        this.vehicleRenderState = null;
        this.graphics.clear();
        this.graphics.setPosition(this.cameraEffects.shake.x, this.cameraEffects.shake.y);
        this.terrainHorizonOcclusionGraphics.clear();
        this.terrainHorizonOcclusionGraphics.setPosition(this.cameraEffects.shake.x, this.cameraEffects.shake.y);
        this.foregroundOcclusionGraphics.clear();
        this.foregroundOcclusionGraphics.setPosition(0, 0);
        this.tireScrubGraphics.clear();
        this.speedEffectShader.setPosition(
            viewport.width / 2 + this.cameraEffects.shake.x,
            viewport.height / 2 + this.cameraEffects.shake.y,
        );
        this.headlightShader.setPosition(
            viewport.width / 2 + this.cameraEffects.shake.x,
            viewport.height / 2 + this.cameraEffects.shake.y,
        );
        this.uiGraphics.clear();
        this.drawBackground(viewport, horizonY);
        this.roadStats = renderRoad(
            this.graphics,
            this.roadTrack,
            this.cameraResource,
            viewport,
            {
                downhillCueRatio: this.getDownhillVisualCueRatio(),
                drawHorizonOcclusion: false,
            },
        );
        renderHorizonOcclusion(
            this.terrainHorizonOcclusionGraphics,
            this.roadStats.horizonOcclusionY,
            this.cameraResource,
            viewport,
        );
        this.roadObjectStats = renderRoadObjects(
            this.graphics,
            this.roadObjects,
            this.roadTrack,
            this.cameraResource,
            viewport,
            this.elapsedSec,
            this.roadObjectMotionTracker,
            {
                crestVisibilityEnvelope: this.roadStats?.crestVisibilityEnvelope,
                horizonOcclusionY: this.roadStats?.horizonOcclusionY,
            },
        );
        this.syncWallForestSprites([
            ...this.roadObjectStats.leftCliffForestSprites,
            ...this.roadObjectStats.wallForestSprites,
        ]);
        this.drawForegroundEdgeOcclusion(viewport);
        if (RUNTIME_TUNING.debugProjectionGuides) {
            this.drawProjectionGuides(viewport);
        }
        const vehicleRenderState = this.getPlayerVehicleRenderState(viewport);
        const vehiclePoseState = this.getPlayerVehiclePoseRenderState(
            vehicleRenderState.anchor,
            seconds,
        );

        this.updateHeadlightState(seconds, vehicleRenderState, vehiclePoseState);
        this.renderPlayerShadow(viewport, vehicleRenderState, vehiclePoseState);
        this.renderBurnoutSkidMarks();
        this.renderUndersteerTireCue(vehicleRenderState, vehiclePoseState);
        this.renderLaunchBurnoutCue(vehicleRenderState);
        this.renderPlayerVehicle(vehicleRenderState, vehiclePoseState);
        this.renderCourseProgress(viewport);
        this.renderRunStatus(viewport);
        if (RUNTIME_TUNING.debugProjectionGuides) {
            this.drawHeadlightFootprintGuides();
        }
        this.renderHud();
        this.publishRuntimeQaState(viewport, horizonY);
    }

    private getViewport(): Viewport {
        return {
            height: GAME_HEIGHT,
            width: GAME_WIDTH,
        };
    }

    private drawForegroundEdgeOcclusion(viewport: Viewport) {
        // The pseudo-3D roadside ribbons must eventually leave the canvas.
        // A layered night matte makes that exit read as foreground darkness,
        // rather than as a hard geometry cut at the viewport edge.
        for (const rect of getForegroundMatteRects(viewport)) {
            this.foregroundOcclusionGraphics.fillStyle(rect.color, rect.alpha);
            this.foregroundOcclusionGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    private drawBackground(viewport: Viewport, horizonY: number) {
        const skylineHorizonY = viewport.height * CITY_SKYLINE_BASE_Y_RATIO;

        const bands = getBackdropBandRects(viewport, horizonY, skylineHorizonY);
        for (const band of bands.slice(0, 3)) {
            this.backgroundGraphics.fillStyle(band.color, band.alpha);
            this.backgroundGraphics.fillRect(band.x, band.y, band.width, band.height);
        }
        this.drawMoonAndClouds(viewport);
        this.drawCityView(viewport, skylineHorizonY);
        const groundBand = bands[3];
        this.backgroundGraphics.fillStyle(groundBand.color, groundBand.alpha);
        this.backgroundGraphics.fillRect(groundBand.x, groundBand.y, groundBand.width, groundBand.height);
    }

    private drawCityView(viewport: Viewport, horizonY: number) {
        const farOffset = getParallaxOffset(this.roadTrack, this.cameraResource.z, 2800, 0.004, 18);
        const ridgeOffset = getParallaxOffset(this.roadTrack, this.cameraResource.z, 1200, 0.014, 64);
        const layout = getBackdropCityLayout({
            farHeight: CITY_FAR_PARALLAX_HEIGHT,
            farOffset,
            parallaxWidth: CITY_PARALLAX_WIDTH,
            ridgeBaselineOffsetY: CITY_RIDGE_BASELINE_OFFSET_Y,
            ridgeHeight: CITY_RIDGE_PARALLAX_HEIGHT,
            ridgeOffset,
            skylineY: horizonY,
            viewport,
        });

        this.farCityParallax
            .setAlpha(0.74)
            .setDisplaySize(layout.far.width, layout.far.height)
            .setPosition(layout.far.x, layout.far.y);
        this.farCityLights
            .setAlpha(getCityLightFlicker(this.elapsedSec, 0.8))
            .setDisplaySize(layout.far.width, layout.far.height)
            .setPosition(layout.far.x, layout.far.y);
        this.nearRidgeParallax
            .setAlpha(0.96)
            .setDisplaySize(layout.ridge.width, layout.ridge.height)
            .setPosition(layout.ridge.x, layout.ridge.y);
    }

    private drawMoonAndClouds(viewport: Viewport) {
        const layout = getBackdropSkyLayout({
            elapsedSec: this.elapsedSec, moonDisplaySize: MOON_DISPLAY_SIZE,
            moonXRatio: MOON_X_RATIO, moonYRatio: MOON_Y_RATIO, viewport,
        });

        this.moon
            .setAlpha(0.96)
            .setDisplaySize(layout.moon.size, layout.moon.size)
            .setPosition(layout.moon.x, layout.moon.y);
        this.farCloud
            .setAlpha(0.78)
            .setDisplaySize(layout.farCloud.width, layout.farCloud.height)
            .setPosition(layout.farCloud.x, layout.farCloud.y);
        this.nearCloud
            .setAlpha(1)
            .setDisplaySize(layout.nearCloud.width, layout.nearCloud.height)
            .setPosition(layout.nearCloud.x, layout.nearCloud.y);
    }

    private createParallaxLayer(textureKey: string, depth: number) {
        return this.add
            .image(0, 0, textureKey)
            .setAlpha(0)
            .setDepth(depth)
            .setOrigin(0.5, 1);
    }

    private createSkyLayer(textureKey: string, depth: number) {
        return this.add
            .image(0, 0, textureKey)
            .setAlpha(0)
            .setDepth(depth)
            .setOrigin(0.5, 0.5);
    }

    private syncWallForestSprites(states: WallForestSpriteState[]) {
        const activeIds = new Set(states.map((state) => state.id));

        for (const state of states) {
            let sprite = this.wallForestSprites.get(state.id);

            if (!sprite) {
                sprite = this.add
                    .image(0, 0, WALL_FOREST_TREE_KEYS[state.variant])
                    .setDepth(
                        state.side === 'left-cliff'
                            ? RenderDepth.LeftCliffForest
                            : state.layer === 'back'
                            ? RenderDepth.WallForestBack
                            : RenderDepth.WallForestFront,
                    )
                    .setOrigin(0.5, 1);
                if (state.side === 'left-cliff') {
                    sprite.setCrop(0, 0, sprite.frame.width, sprite.frame.height * 0.62);
                }
                this.wallForestSprites.set(state.id, sprite);
            }

            sprite
                .setAlpha(state.alpha)
                .setDisplaySize(state.width, state.height)
                .setDepth(
                    state.side === 'left-cliff'
                        ? RenderDepth.LeftCliffForest
                        : state.layer === 'back'
                        ? RenderDepth.WallForestBack
                        : RenderDepth.WallForestFront,
                )
                .setPosition(
                    state.x + this.cameraEffects.shake.x,
                    state.y + this.cameraEffects.shake.y,
                )
                .setTint(state.tint)
                .setVisible(true);
        }

        for (const [id, sprite] of this.wallForestSprites) {
            if (!activeIds.has(id)) sprite.setVisible(false);
        }
    }

    private drawProjectionGuides(viewport: Viewport) {

        const horizonY = getHorizonY(this.cameraResource, viewport);

        this.graphics.lineStyle(2, 0xf2d266, 0.75);
        this.graphics.lineBetween(0, horizonY, viewport.width, horizonY);

        this.graphics.lineStyle(1, 0xeef2f3, 0.3);
        this.graphics.lineBetween(viewport.width / 2, horizonY, viewport.width / 2, viewport.height);
    }

    private drawHeadlightFootprintGuides() {
        const pose = this.headlightLampPose;

        if (!pose) return;

        const viewport = this.getViewport();
        const footprint = getVehicleHeadlightFootprintDimensions(
            pose.footprint,
            viewport.height,
        );
        const guide = getVehicleHeadlightFootprintGuide(pose, {
            farHalfWidth: footprint.farHalfWidth,
            nearPadding: footprint.nearPadding,
            reach: footprint.reach,
        });
        const emitter = getVehicleHeadlightEmitterState(pose);
        const cornerGuide = getVehicleHeadlightCornerFillGuide(
            pose,
            this.headlightOpticalState,
            {
                farHalfWidth: footprint.farHalfWidth,
                nearPadding: footprint.nearPadding,
                reach: footprint.reach,
            },
        );
        const axisTipX = pose.beamCenter.x + pose.mainForwardAxis.x * 92;
        const axisTipY = pose.beamCenter.y + pose.mainForwardAxis.y * 92;
        const frameAxisRadians = Phaser.Math.DegToRad(pose.frameForwardYawDeg);
        const frameAxis = {
            x: Math.sin(frameAxisRadians),
            y: -Math.cos(frameAxisRadians),
        };

        // Draw above the player only in debug mode, so the exact lamp segment
        // and the proposed local-axis footprint remain readable on dark road.
        this.uiGraphics.lineStyle(2, 0xffd166, 0.96);
        this.uiGraphics.lineBetween(
            pose.lampLeft.x,
            pose.lampLeft.y,
            pose.lampRight.x,
            pose.lampRight.y,
        );
        this.uiGraphics.fillStyle(0xffd166, 0.96);
        this.uiGraphics.fillCircle(pose.lampLeft.x, pose.lampLeft.y, 4);
        this.uiGraphics.fillCircle(pose.lampRight.x, pose.lampRight.y, 4);

        // Orange rays expose the two cores converging into the shared spill.
        // Opacity identifies the perspective-dimmed far-side lamp.
        this.uiGraphics.lineStyle(1, 0xff9f43, 0.8 * emitter.leftIntensity);
        this.uiGraphics.lineBetween(
            pose.lampLeft.x,
            pose.lampLeft.y,
            guide.midCenter.x,
            guide.midCenter.y,
        );
        this.uiGraphics.lineStyle(1, 0xff9f43, 0.8 * emitter.rightIntensity);
        this.uiGraphics.lineBetween(
            pose.lampRight.x,
            pose.lampRight.y,
            guide.midCenter.x,
            guide.midCenter.y,
        );

        // White is the forward direction painted into the selected atlas
        // frame. Cyan adds the runtime sprite transform; blue then adds the
        // small progressive optical swivel relative to that base in HL-REV-6.
        this.uiGraphics.lineStyle(2, 0xf3f7ff, 0.78);
        this.uiGraphics.lineBetween(
            pose.beamCenter.x,
            pose.beamCenter.y,
            pose.beamCenter.x + frameAxis.x * 78,
            pose.beamCenter.y + frameAxis.y * 78,
        );

        this.uiGraphics.lineStyle(2, 0x4ee3d1, 0.86);
        this.uiGraphics.lineBetween(
            pose.beamCenter.x,
            pose.beamCenter.y,
            pose.beamCenter.x + pose.beamForwardAxis.x * 85,
            pose.beamCenter.y + pose.beamForwardAxis.y * 85,
        );

        this.uiGraphics.lineStyle(2, 0x65d8ff, 0.92);
        this.uiGraphics.lineBetween(pose.beamCenter.x, pose.beamCenter.y, axisTipX, axisTipY);
        this.uiGraphics.fillStyle(0x65d8ff, 0.96);
        this.uiGraphics.fillCircle(pose.beamCenter.x, pose.beamCenter.y, 3);

        // Green is the rendered HL-REV-4 corner-fill wedge. Its near segment
        // stays inside the main footprint while its short asymmetric far edge
        // extends only toward the inside of the turn.
        this.uiGraphics.lineStyle(
            2,
            0x71f79f,
            Phaser.Math.Linear(0.08, 0.9, this.headlightOpticalState.cornerFillWeight),
        );
        this.uiGraphics.lineBetween(
            cornerGuide.nearCenter.x,
            cornerGuide.nearCenter.y,
            cornerGuide.farCenter.x,
            cornerGuide.farCenter.y,
        );
        if (this.headlightOpticalState.cornerFillWeight > 0) {
            this.uiGraphics.lineBetween(
                cornerGuide.nearLeft.x,
                cornerGuide.nearLeft.y,
                cornerGuide.nearRight.x,
                cornerGuide.nearRight.y,
            );
            this.uiGraphics.lineBetween(
                cornerGuide.nearLeft.x,
                cornerGuide.nearLeft.y,
                cornerGuide.farLeft.x,
                cornerGuide.farLeft.y,
            );
            this.uiGraphics.lineBetween(
                cornerGuide.nearRight.x,
                cornerGuide.nearRight.y,
                cornerGuide.farRight.x,
                cornerGuide.farRight.y,
            );
            this.uiGraphics.lineBetween(
                cornerGuide.farLeft.x,
                cornerGuide.farLeft.y,
                cornerGuide.farRight.x,
                cornerGuide.farRight.y,
            );
        }

        this.uiGraphics.lineStyle(2, 0xff6bc7, 0.82);
        this.uiGraphics.lineBetween(guide.nearLeft.x, guide.nearLeft.y, guide.nearRight.x, guide.nearRight.y);
        this.uiGraphics.lineBetween(guide.nearLeft.x, guide.nearLeft.y, guide.midLeft.x, guide.midLeft.y);
        this.uiGraphics.lineBetween(guide.midLeft.x, guide.midLeft.y, guide.farLeft.x, guide.farLeft.y);
        this.uiGraphics.lineBetween(guide.nearRight.x, guide.nearRight.y, guide.midRight.x, guide.midRight.y);
        this.uiGraphics.lineBetween(guide.midRight.x, guide.midRight.y, guide.farRight.x, guide.farRight.y);
        this.uiGraphics.lineBetween(guide.midLeft.x, guide.midLeft.y, guide.midRight.x, guide.midRight.y);
        this.uiGraphics.lineBetween(guide.farLeft.x, guide.farLeft.y, guide.farRight.x, guide.farRight.y);
    }

    private renderHud() {
        if (!this.debugHudVisible) {
            this.hudText.setVisible(false);
            this.collisionDebugText.setVisible(false);
            return;
        }

        this.hudText.setVisible(true);
        const player = this.playerVehicle;
        const stats = this.roadStats;
        const collisionDebug = {
            active: this.debugGuardrailImpactTimer > 0,
            bounceVelocity: this.debugGuardrailImpactBounceVelocity,
            impactCount: this.playerVehicle.guardrailImpactCount,
            side: this.debugGuardrailImpactSide,
        };

        renderCollisionDebugText(
            this.collisionDebugText,
            collisionDebug,
            this.getViewport().width,
        );

        renderHudText(this.hudText, {
            camera: this.cameraResource,
            collisionDebug,
            controlsLabel: ENABLE_DEBUG_CAMERA_CONTROLS
                ? 'Up: accel | Space: brake | Left/Right: steer | D: debug HUD | B: flow A/B | R: restart | WASD: camera | Q/E: pitch'
                : 'Up: accel | Space: brake | Left/Right: steer | D: debug HUD | B: flow A/B | R: restart | debug camera locked',
            cornerIntensity: player.cornerDemand.cornerIntensity,
            longitudinalProgression: LONGITUDINAL_PROGRESSION,
            physicsRoadContactZ: this.playerPhysicsRoadSample.contactZ,
            physicsRoadCurve: this.playerPhysicsRoadSample.currentCurve,
            player,
            qa: RUNTIME_QA,
            roadStats: stats,
            slopeAcceleration: this.getSlopeAcceleration(),
            speedKmh: this.getPlayerSpeedKmh(),
            steeringRatio: player.speedHandling.visualYawScale,
            telemetry: RUNTIME_TELEMETRY,
            telemetryEventCount: this.telemetry?.getEventCount() ?? 0,
            track: this.roadTrack,
            tuning: RUNTIME_TUNING,
            understeerVisual: {
                bodyYawAuthority: this.vehicleUndersteerVisualState.bodyYawAuthority,
                cueIntensity: this.vehicleUndersteerVisualState.cueIntensity,
                gripAuthorityRatio: this.vehicleUndersteerVisualState.gripAuthorityRatio,
                poseAuthority: this.vehicleUndersteerVisualState.poseAuthority,
            },
            vehicleTerrainCue: this.getVehicleTerrainCue(),
            worldTravelSpeed: this.getWorldTravelSpeed(),
            run: this.runState,
        });
    }

    private updatePlayerVehicle(seconds: number) {
        const physicsRoad = this.playerPhysicsRoadSample;
        const drive = this.getDriveCommand();
        const controllerConfig = {
            ...PLAYER_CONTROLLER_CONFIG,
            maxRoadOffset: physicsRoad.railCenterLimit,
        };

        const launchForceMultiplier = LAUNCH_CONTROL_ENABLED
            ? updateLaunchControl(
                this.launchState,
                drive.accelPressed,
                this.getPlayerSpeedKmh(),
                seconds,
                LAUNCH_CONTROL_CONFIG,
            )
            : 1;

        updatePlayerVehicle(
            this.playerVehicle,
            drive,
            {
                currentCurve: physicsRoad.currentCurve,
                launchForceMultiplier,
                longitudinalScale: LONGITUDINAL_PROGRESSION.scale,
                previewRoadCurve: physicsRoad.previewRoadCurve,
                slopeAcceleration: this.getSlopeAcceleration(),
            },
            controllerConfig,
            seconds,
        );
        const guardrailContext = this.getGuardrailCollisionContext(physicsRoad);
        const impactCountBeforeCollision = this.playerVehicle.guardrailImpactCount;

        applyGuardrailCollision(this.playerVehicle, guardrailContext, seconds);
        if (this.playerVehicle.guardrailImpactCount > impactCountBeforeCollision) {
            this.debugGuardrailImpactTimer = DEBUG_GUARDRAIL_IMPACT_HOLD_SECONDS;
            this.debugGuardrailImpactSide = this.playerVehicle.guardrailContactDirection;
            this.debugGuardrailImpactBounceVelocity =
                this.playerVehicle.guardrailBounceVelocity;
        } else {
            this.debugGuardrailImpactTimer = Math.max(
                0,
                this.debugGuardrailImpactTimer - seconds,
            );
        }
        this.vehicleRenderState = null;
    }

    private getPlayerVehicleRenderState(viewport: Viewport): PlayerVehicleRenderState {
        if (this.vehicleRenderState) return this.vehicleRenderState;

        const baseSize = getPlayerVehicleSpriteSize(viewport, RUNTIME_TUNING);
        const anchor = this.getVehicleAnchor(viewport);
        const roadSpanAtVehicleY = getRoadSpanAtScreenY(
            this.roadTrack,
            this.cameraResource,
            viewport,
            anchor.y,
        );
        const roadWidthAtVehicleY = roadSpanAtVehicleY
            ? roadSpanAtVehicleY.rightX - roadSpanAtVehicleY.leftX
            : getRoadWidthAtScreenY(
                this.roadTrack,
                this.cameraResource,
                viewport,
                anchor.y,
            );
        const roadHalfWidthAtVehicle = getRoadHalfWidthAt(
            this.roadTrack,
            this.getPlayerRoadContactZ(),
        );
        const roadScaleConfig: VehicleRoadScaleConfig = {
            deadZoneRatio: RUNTIME_TUNING.vehicleRoadScaleDeadZoneRatio,
            maxScale: RUNTIME_TUNING.vehicleRoadScaleMax,
            minScale: RUNTIME_TUNING.vehicleRoadScaleMin,
            responseSeconds: RUNTIME_TUNING.vehicleRoadScaleResponseSeconds,
            targetRoadRatio: RUNTIME_TUNING.vehicleRoadTargetRatio,
        };
        // R3 keeps vehicle scale independent from local narrowing while
        // telemetry continues to expose the actual screen-road span.
        const roadRelativePresentation = getRoadRelativeSizePresentation({
            baseSize,
            currentSize: this.roadRelativeVehicleSize,
            defaultRoadHalfWidth: DEFAULT_ROAD_HALF_WIDTH,
            elapsedSec: this.elapsedSec,
            lastSampleElapsedSec: this.lastVehicleSizeSample?.elapsedSec ?? null,
            roadHalfWidth: roadHalfWidthAtVehicle,
            roadWidthAtVehicleY,
            scaleConfig: roadScaleConfig,
        });
        const roadRelativeSize = roadRelativePresentation.size;
        const roadRelativeTargetSize = roadRelativePresentation.targetSize;

        let displaySize = getTerrainScaledSpriteSize(roadRelativeSize, anchor, RUNTIME_TUNING);
        const finishStart = this.finishCoastPresentation;
        if (this.finishPresentationPhase === 'coast' && finishStart) {
            // The car begins at the captured rear-sprite transform, then its
            // scale follows the same fixed-camera projection as the road.
            displaySize = finishStart.size * Phaser.Math.Clamp(
                anchor.scale / Math.max(0.0001, this.finishCoastStartProjectionScale),
                0.1,
                1,
            );
        }
        const centerContactProfile = getVehicleShadowProfile(PLAYER_VEHICLE_ATLAS, 'center');
        const guardrailScreenProjection = this.finishPresentationPhase === 'coast'
            ? null
            : roadSpanAtVehicleY
            ? projectGuardrailCollisionToScreen(
                roadSpanAtVehicleY,
                getGuardrailCollisionGeometry(this.getGuardrailCollisionContext()),
                this.playerVehicle.lateralOffset,
                displaySize * centerContactProfile.chassis.w,
                -this.playerPhysicsRoadSample.currentCurve * RUNTIME_TUNING.curveScreenBias,
            )
            : null;

        if (guardrailScreenProjection) anchor.x = guardrailScreenProjection.centerX;

        this.roadRelativeVehicleSize = roadRelativeSize;
        this.vehicleRenderState = {
            anchor,
            displaySize,
            guardrailScreenProjection,
            roadRelativeScale: roadRelativeSize / baseSize,
            roadRelativeTargetSize,
            roadWidthAtVehicleY,
        };

        return this.vehicleRenderState;
    }

    private getPlayerVehiclePoseRenderState(
        anchor: VehicleAnchor,
        seconds: number,
    ): PlayerVehiclePoseRenderState {
        const visualSteering = this.getVehicleVisualSteeringState(seconds);
        const presentation = getPlayerPosePresentation({
            atlas: PLAYER_VEHICLE_ATLAS,
            driftState: this.playerVehicle.driftState,
            terrainCue: anchor.terrainCue,
            tuning: RUNTIME_TUNING,
            visualSteering,
        });

        if (this.finishPresentationPhase !== 'racing') {
            return {
                flipX: false,
                frameId: 'center',
                rotationRadians: 0,
                visualSteering: {
                    ...visualSteering,
                    bodyYawValue: 0,
                    inputPoseValue: 0,
                    physicalValue: 0,
                    rotationValue: 0,
                    understeerCueIntensity: 0,
                    value: 0,
                },
            };
        }

        return {
            ...presentation,
            visualSteering,
        };
    }

    private renderPlayerVehicle(
        renderState: PlayerVehicleRenderState,
        poseState: PlayerVehiclePoseRenderState,
    ) {
        const { anchor, displaySize, roadRelativeScale, roadRelativeTargetSize, roadWidthAtVehicleY } = renderState;
        const previousSizeSample = this.lastVehicleSizeSample;
        const elapsedSinceLastSizeSample = previousSizeSample
            ? this.elapsedSec - previousSizeSample.elapsedSec
            : 0;
        const sizeDeltaPerSec = elapsedSinceLastSizeSample > 0.0001
            ? (displaySize - previousSizeSample.size) / elapsedSinceLastSizeSample
            : 0;
        const vehicleBodyWidth = displaySize;
        const finishCoastFade = this.getFinishCoastVehicleFade();
        const visualSteering = poseState.visualSteering;
        const frame = PLAYER_VEHICLE_ATLAS.frames[poseState.frameId];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(anchor.x + this.cameraEffects.shake.x, anchor.y + this.cameraEffects.shake.y)
            .setDisplaySize(displaySize, displaySize)
            .setRotation(poseState.rotationRadians)
            .setAlpha(finishCoastFade)
            .setTint(this.getFinishCoastVehicleTint());

        // `capture` has already forced the central rear frame. Recording this
        // rendered transform makes the first coast projection continuous even
        // when the player crossed the line while steering left or right.
        if (this.finishPresentationPhase === 'capture' && !this.finishCoastPresentation) {
            this.finishCoastPresentation = { size: displaySize, x: anchor.x, y: anchor.y };
        }

        this.lastVehicleQaState = {
            anchor,
            bodyYawAuthority: visualSteering.bodyYawAuthority,
            bodyYawSteering: visualSteering.bodyYawValue,
            displaySize,
            flipX: poseState.flipX,
            frame: poseState.frameId,
            gripAuthorityRatio: visualSteering.gripAuthorityRatio,
            inputPoseSteering: visualSteering.inputPoseValue,
            lowSpeedVisualSteeringAuthority: visualSteering.lowSpeedVisualSteeringAuthority,
            physicalSteering: visualSteering.physicalValue,
            poseAuthority: visualSteering.poseAuthority,
            roadRelativeScale,
            roadRelativeTargetSize,
            roadWidthAtVehicleY,
            rotationDeg: visualSteering.rotationValue * RUNTIME_TUNING.vehicleRotationDeg,
            sizeDeltaPerSec,
            terrainScale: getTerrainScaleMultiplier(anchor, RUNTIME_TUNING),
            vehicleBodyWidth,
            vehicleRoadRatio: roadWidthAtVehicleY && roadWidthAtVehicleY > 0
                ? vehicleBodyWidth / roadWidthAtVehicleY
                : null,
            visualSteering: visualSteering.value,
            visualSteeringThreshold: visualSteering.threshold,
            understeerCueIntensity: visualSteering.understeerCueIntensity,
        };
        this.lastVehicleSizeSample = { elapsedSec: this.elapsedSec, size: displaySize };
    }

    private renderPlayerShadow(
        _viewport: Viewport,
        renderState: PlayerVehicleRenderState,
        poseState: PlayerVehiclePoseRenderState,
    ) {
        const { anchor, displaySize } = renderState;
        const finishCoastFade = this.getFinishCoastVehicleFade();
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const terrainIntensity = getContactTerrainCueIntensity(anchor.contactTerrainRatio);
        const visualSteering = poseState.visualSteering;
        const frame = PLAYER_VEHICLE_ATLAS.frames[poseState.frameId];
        const shadowProfile = getVehicleShadowProfile(PLAYER_VEHICLE_ATLAS, poseState.frameId);
        const silhouetteScale = getSilhouetteShadowScale(anchor.contactTerrainRatio, speedRatio);
        const chassisCenter = getShadowElementCenter(
            shadowProfile.chassis,
            frame,
            anchor,
            displaySize,
            poseState.flipX,
            terrainIntensity,
        );
        const shadowPresentation = getPlayerShadowPresentation({
            anchorScale: anchor.scale,
            bodyYawValue: visualSteering.bodyYawValue,
            chassisCenter,
            displaySize,
            driftRatio: this.playerVehicle.driftRatio,
            shadowAlpha: {
                max: PLAYER_DEFAULTS.PLAYER_SHADOW_MAX_ALPHA,
                silhouette: PLAYER_DEFAULTS.PLAYER_SILHOUETTE_SHADOW_ALPHA,
                soft: PLAYER_DEFAULTS.PLAYER_SHADOW_SOFT_ALPHA,
            },
            shake: this.cameraEffects.shake,
            silhouetteScale,
            slipAngle: this.playerVehicle.slipAngle,
            vehicleRotationDeg: RUNTIME_TUNING.vehicleRotationDeg,
            visualRotationValue: visualSteering.rotationValue,
        });

        this.playerSoftShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setAlpha(shadowPresentation.soft.alpha * finishCoastFade)
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                shadowPresentation.soft.x, shadowPresentation.soft.y,
            )
            .setDisplaySize(
                shadowPresentation.soft.width, shadowPresentation.soft.height,
            )
            .setRotation(shadowPresentation.soft.rotationRadians);

        this.playerShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setAlpha(shadowPresentation.silhouette.alpha * finishCoastFade)
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                shadowPresentation.silhouette.x, shadowPresentation.silhouette.y,
            )
            .setDisplaySize(
                shadowPresentation.silhouette.width, shadowPresentation.silhouette.height,
            )
            .setRotation(shadowPresentation.silhouette.rotationRadians);

        this.graphics.fillStyle(0x010303, shadowPresentation.contactPatch.alpha * finishCoastFade);
        drawShadowContactPatch(
            this.graphics,
            shadowPresentation.contactPatch.x,
            shadowPresentation.contactPatch.y,
            shadowPresentation.contactPatch.width * shadowProfile.chassis.w,
            shadowPresentation.contactPatch.height * shadowProfile.chassis.h,
        );
    }

    private getFinishCoastVehicleFade() {
        if (this.finishPresentationPhase === 'results') return 0;
        if (this.finishPresentationPhase !== 'coast') return 1;

        return 1 - Phaser.Math.Clamp((this.finishCoastProgress - 0.66) / 0.34, 0, 1);
    }

    private getFinishCoastVehicleTint() {
        const darkness = this.finishPresentationPhase === 'coast'
            ? Phaser.Math.Clamp((this.finishCoastProgress - 0.55) / 0.45, 0, 1) * 0.76
            : this.finishPresentationPhase === 'results' ? 0.76 : 0;
        const channel = Math.round(255 * (1 - darkness));

        return (channel << 16) | (channel << 8) | channel;
    }

    private getFinishCoastHeadlightFade() {
        if (this.finishPresentationPhase === 'results') return 0;
        if (this.finishPresentationPhase !== 'coast') return 1;

        // Let the beam die slightly before the body disappears, so the final
        // shot reads as the car receding into darkness rather than leaving a
        // fixed light source behind.
        return 1 - Phaser.Math.Clamp((this.finishCoastProgress - 0.45) / 0.55, 0, 1);
    }

    private renderUndersteerTireCue(
        renderState: PlayerVehicleRenderState,
        poseState: PlayerVehiclePoseRenderState,
    ) {
        const { anchor, displaySize } = renderState;
        const lines = getUndersteerTireCuePresentation({
            anchor,
            cue: poseState.visualSteering.understeerCueIntensity,
            curveDirection: this.playerPhysicsRoadSample.currentCurve,
            displaySize,
            driftState: this.playerVehicle.driftState,
            elapsedSec: this.elapsedSec,
            shake: this.cameraEffects.shake,
        });
        for (const line of lines) {
            this.tireScrubGraphics.lineStyle(line.width, line.color, line.alpha);
            this.tireScrubGraphics.lineBetween(
                line.startX, line.startY, line.endX, line.endY,
            );
        }
    }

    private renderLaunchBurnoutCue(renderState: PlayerVehicleRenderState) {
        for (const puff of this.burnoutSmokePuffs) puff.setVisible(false);
        const { anchor, displaySize } = renderState;
        const presentation = getLaunchBurnoutPresentation({
            anchor,
            config: LAUNCH_CONTROL_CONFIG,
            displaySize,
            elapsedSec: this.elapsedSec,
            launch: this.launchState,
            shake: this.cameraEffects.shake,
        });
        if (!presentation) return;

        this.spawnInitialBurnoutSkidMarks(presentation, displaySize);
        for (const [index, dust] of presentation.dust.entries()) {
            const puff = this.burnoutSmokePuffs[index];
            puff
                .setPosition(dust.x, dust.y)
                .setDisplaySize(dust.radius * 6, dust.radius * 6)
                .setAlpha(dust.alpha)
                .setRotation(index * 0.82 + this.elapsedSec * (index % 2 === 0 ? 1.4 : -1.1))
                .setTint(index % 2 === 0 ? 0x91a8ae : 0x718a94)
                .setVisible(true);
        }
    }

    private spawnInitialBurnoutSkidMarks(
        presentation: NonNullable<ReturnType<typeof getLaunchBurnoutPresentation>>,
        displaySize: number,
    ) {
        // One initial wheelspin imprint is enough. After the clutch bites the
        // launch is grip-driven, so it must not keep drawing a moving trail.
        if (this.burnoutSkidMarks.length > 0) return;
        const z = this.getPlayerRoadContactZ();
        const cameraElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const roadCenterOffset = getRoadCenterOffsetAhead(
            this.roadTrack,
            this.cameraResource.z,
            z - this.cameraResource.z,
        );
        const contactProjection = projectGroundPoint({
            x: roadCenterOffset + this.playerVehicle.lateralOffset,
            y: (getRoadElevationAt(this.roadTrack, z) - cameraElevation) * ELEVATION_VISUAL_SCALE,
            z,
        }, this.cameraResource, this.getViewport());
        const tireOffsetWorld = contactProjection.visible
            ? displaySize * 0.18 / contactProjection.scale
            : displaySize * 0.06;
        const widthPixels = Math.max(1.5, displaySize * 0.007);
        const lengthPixels = Math.max(6, presentation.skidLength * 1.15);

        for (const side of [-1, 1] as const) {
            this.burnoutSkidMarks.push({
                ageSec: 0,
                alpha: presentation.skidAlpha * 0.78,
                lateralOffset: this.playerVehicle.lateralOffset + side * tireOffsetWorld,
                lengthPixels,
                widthPixels,
                z,
            });
        }
    }

    private updateBurnoutSkidMarks(seconds: number) {
        const markDurationSec = 1.1;

        this.burnoutSkidMarks = this.burnoutSkidMarks.filter((mark) => {
            mark.ageSec += seconds;
            return mark.ageSec < markDurationSec;
        });
    }

    private renderBurnoutSkidMarks() {
        const markDurationSec = 1.1;
        const viewport = this.getViewport();

        for (const mark of this.burnoutSkidMarks) {
            const elapsedRatio = mark.ageSec / markDurationSec;
            const fade = 1 - Phaser.Math.Clamp((elapsedRatio - 0.48) / 0.52, 0, 1);
            const start = this.projectBurnoutSkidMarkPoint(mark.z, mark.lateralOffset);

            if (!start.visible || start.y > viewport.height + mark.lengthPixels) continue;

            this.tireScrubGraphics.lineStyle(mark.widthPixels, 0x1d2d35, mark.alpha * fade);
            this.tireScrubGraphics.lineBetween(start.x, start.y, start.x, start.y + mark.lengthPixels);
        }
    }

    private projectBurnoutSkidMarkPoint(z: number, lateralOffset: number) {
        const distanceAhead = z - this.cameraResource.z;
        const cameraElevation = getRoadElevationAt(this.roadTrack, this.cameraResource.z);
        const roadCenterOffset = getRoadCenterOffsetAhead(
            this.roadTrack,
            this.cameraResource.z,
            distanceAhead,
        );

        return projectGroundPoint({
            x: roadCenterOffset + lateralOffset,
            y: (getRoadElevationAt(this.roadTrack, z) - cameraElevation) * ELEVATION_VISUAL_SCALE,
            z,
        }, this.cameraResource, this.getViewport());
    }

    private getVehicleAnchor(viewport: Viewport): VehicleAnchor {
        const player = this.playerVehicle;
        const anchorZ = this.cameraResource.z + RUNTIME_TUNING.playerRoadAnchorDistance;
        const contactZ = this.getPlayerRoadContactZ();
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
        const contactRoadAnchor = projectGroundPoint(
            {
                x: contactRoadCenterOffset + player.lateralOffset,
                y: contactElevationDelta * ELEVATION_VISUAL_SCALE,
                z: contactZ,
            },
            this.cameraResource,
            viewport,
        );
        const curveScreenBias =
            -this.playerPhysicsRoadSample.currentCurve * RUNTIME_TUNING.curveScreenBias;
        const anchor = getPlayerAnchorPresentation({
            contactElevationDelta,
            contactRoadCenterOffset,
            curveScreenBias,
            elevationDelta,
            maxTerrainScreenYShift: PLAYER_DEFAULTS.PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT,
            projection: contactRoadAnchor,
            tuning: RUNTIME_TUNING,
            viewport,
        });
        if (this.finishPresentationPhase === 'coast') {
            const coastZ = this.finishCoastVehicleZ;
            const coastDistanceAhead = coastZ - this.cameraResource.z;
            const coastCenterOffset = getRoadCenterOffsetAhead(
                this.roadTrack,
                this.cameraResource.z,
                coastDistanceAhead,
            );
            const coastProjection = projectGroundPoint({
                x: coastCenterOffset + this.finishCoastLateralOffset * (1 - this.finishCoastProgress),
                y: (getRoadElevationAt(this.roadTrack, coastZ) - currentRoadElevation) * ELEVATION_VISUAL_SCALE,
                z: coastZ,
            }, this.cameraResource, viewport);

            // The first coast frame is a perspective projection which exactly
            // matches the captured rear-sprite transform. From there the car
            // moves only by advancing along the post-finish road.
            if (coastProjection.visible) {
                anchor.x = coastProjection.x;
                anchor.y = coastProjection.y;
                anchor.scale = coastProjection.scale;
            }
        }

        return anchor;
    }

    private beginFinishCoast() {
        const finishStart = this.finishCoastPresentation;
        if (!finishStart) return;

        const viewport = this.getViewport();
        const camera = this.cameraResource;
        const focalLength = getFocalLength(camera, viewport);
        const horizonY = getHorizonY(camera, viewport);
        // Reverse the ground projection so the vehicle's first world-space
        // position lands exactly at the transform captured after forcing the
        // rear sprite. The post-finish road is level, so this is stable.
        const startDepth = Phaser.Math.Clamp(
            focalLength * camera.height / Math.max(24, finishStart.y - horizonY),
            this.roadTrack.segmentLength * 2,
            this.roadTrack.segmentLength * (FINISH_COAST_VEHICLE_TRAVEL_SEGMENTS - 1),
        );
        const coastEndZ = this.roadTrack.finishZ +
            this.roadTrack.segmentLength * FINISH_COAST_VEHICLE_TRAVEL_SEGMENTS;
        this.finishCoastVehicleZ = Math.min(coastEndZ - this.roadTrack.segmentLength, camera.z + startDepth);

        const coastDistanceAhead = this.finishCoastVehicleZ - camera.z;
        const coastCenterOffset = getRoadCenterOffsetAhead(
            this.roadTrack,
            camera.z,
            coastDistanceAhead,
        );
        const cameraElevation = getRoadElevationAt(this.roadTrack, camera.z);
        const baseProjection = projectGroundPoint({
            x: coastCenterOffset,
            y: (getRoadElevationAt(this.roadTrack, this.finishCoastVehicleZ) - cameraElevation) * ELEVATION_VISUAL_SCALE,
            z: this.finishCoastVehicleZ,
        }, camera, viewport);

        if (!baseProjection.visible) return;
        this.finishCoastStartProjectionScale = baseProjection.scale;
        this.finishCoastLateralOffset = (finishStart.x - viewport.width / 2) /
            Math.max(0.0001, baseProjection.scale) + camera.lateralOffset - coastCenterOffset;
        this.finishPresentationPhase = 'coast';
    }

    private getPlayerSpeedKmh() {
        return getDisplaySpeedKmh(
            this.playerVehicle.speed,
            PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED,
            ACTIVE_RUNTIME_VEHICLE.engineProfile,
        );
    }

    private getWorldTravelSpeed() {
        return getLongitudinalWorldTravelSpeed(
            this.playerVehicle.speed,
            LONGITUDINAL_PROGRESSION.scale,
        );
    }

    private getCurrentRoadOffsetLimit() {
        return this.playerPhysicsRoadSample.railCenterLimit;
    }

    private getPlayerRoadContactZ() {
        return this.cameraResource.z + RUNTIME_TUNING.playerRoadContactDistance;
    }

    private samplePlayerPhysicsRoad(): PlayerPhysicsRoadSample {
        const cameraZ = this.cameraResource.z;
        const contactZ = this.getPlayerRoadContactZ();
        const headingPreview = getRoadHeadingPreview(this.roadTrack, contactZ);
        const pavedHalfWidth = getRoadHalfWidthAt(this.roadTrack, contactZ);
        const guardrailContext = {
            pavedHalfWidth,
            railContactLimit: pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
        };

        return {
            cameraZ,
            contactZ,
            currentCurve: getRoadCurveAt(this.roadTrack, contactZ),
            farTangentChange: headingPreview.farTangentChange,
            nearTangentChange: headingPreview.nearTangentChange,
            pavedHalfWidth,
            previewRoadCurve: headingPreview.demandCurve,
            railCenterLimit: getGuardrailCollisionGeometry(guardrailContext).railCenterLimit,
        };
    }

    private getGuardrailCollisionContext(
        physicsRoad: PlayerPhysicsRoadSample = this.samplePlayerPhysicsRoad(),
    ) {
        const pavedHalfWidth = physicsRoad.pavedHalfWidth;
        const frontDistance = GUARDRAIL_COLLISION_CONFIG.physicalVehicleFrontLength;
        const frontPavedHalfWidth = getRoadHalfWidthAt(
            this.roadTrack,
            physicsRoad.contactZ + frontDistance,
        );
        return {
            frontRoad: {
                distance: frontDistance,
                pavedHalfWidth: frontPavedHalfWidth,
                railContactLimit:
                    frontPavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            },
            pavedHalfWidth,
            railContactLimit: pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
        };
    }

    private getVehicleVisualSteeringState(seconds: number): PlayerVehicleVisualSteeringState {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const smoothSpeed = speedRatio * speedRatio * (3 - 2 * speedRatio);
        const tuningVisualScale = Phaser.Math.Linear(
            1,
            RUNTIME_TUNING.highSpeedVisualSteeringScale,
            smoothSpeed,
        );
        const threshold = Phaser.Math.Linear(
            RUNTIME_TUNING.steerWeakThreshold,
            RUNTIME_TUNING.highSpeedSteerWeakThreshold,
            smoothSpeed,
        );

        // Speed-dependent yaw is already sampled once in the controller.
        // The runtime multiplier defaults to 1 and remains only as an
        // explicit QA override instead of a second default attenuation.
        const player = this.playerVehicle;
        const lowSpeedVisualSteeringAuthority = player.lowSpeedVisualSteeringAuthority;
        const physicalValue = player.physicalSteeringCommand *
            lowSpeedVisualSteeringAuthority *
            player.speedHandling.visualYawScale *
            tuningVisualScale;
        const isSliding = player.driftState !== 'grip' && player.driftDirection !== 0;
        this.vehicleUndersteerVisualState = updateVehicleUndersteerVisualState(
            this.vehicleUndersteerVisualState,
            {
                baseGripAngleCap: player.speedHandling.gripAngleCap,
                driftState: player.driftState,
                gripSteerAngleLimit: player.gripSteerAngleLimit,
                lateralVelocityRoadRate: player.overspeedUndersteerLateralVelocity /
                    Math.max(1, this.getCurrentRoadOffsetLimit()),
                physicalSteering: physicalValue,
                understeerRatio: player.overspeedUndersteerRatio,
            },
            seconds,
        );
        const understeerVisual = this.vehicleUndersteerVisualState;

        if (!isSliding) {
            return {
                bodyYawAuthority: understeerVisual.bodyYawAuthority,
                bodyYawValue: understeerVisual.bodyYawValue,
                gripAuthorityRatio: understeerVisual.gripAuthorityRatio,
                inputPoseValue: understeerVisual.inputPoseValue,
                lowSpeedVisualSteeringAuthority,
                physicalValue,
                poseAuthority: understeerVisual.poseAuthority,
                rotationValue: understeerVisual.bodyYawValue,
                threshold,
                understeerCueIntensity: understeerVisual.cueIntensity,
                value: understeerVisual.poseValue,
            };
        }

        // Drift 방향은 차체가 향하는 방향이고, steering은 실제 lateral 이동/카운터 조향이다.
        // 따라서 recovery가 끝날 때까지 sprite pose를 진입 방향에 고정한다.
        const yawStrength = player.driftState === 'setup'
            ? 0.58
            : player.driftState === 'drift'
                ? Phaser.Math.Linear(0.8, 1, player.driftRatio)
                : Phaser.Math.Linear(0.72, 0.9, player.driftRatio);
        const counterTrim = Phaser.Math.Clamp(player.counterSteerTimer / 0.16, 0, 1);
        const trimmedYawStrength = Phaser.Math.Linear(yawStrength, 0.58, counterTrim);

        const driftPoseValue = player.driftDirection *
            trimmedYawStrength *
            lowSpeedVisualSteeringAuthority;

        return {
            bodyYawAuthority: 1,
            bodyYawValue: driftPoseValue,
            gripAuthorityRatio: 1,
            inputPoseValue: physicalValue,
            lowSpeedVisualSteeringAuthority,
            physicalValue,
            poseAuthority: 1,
            rotationValue: driftPoseValue * DRIFT_BODY_ROLL_SCALE,
            threshold,
            understeerCueIntensity: 0,
            value: driftPoseValue,
        };
    }

    private updateSpeedEffect(seconds: number) {
        const isFinishCoasting = this.finishPresentationPhase === 'coast';
        const coastFade = isFinishCoasting ? 1 - this.finishCoastProgress : 1;
        const effectiveSpeedKmh = isFinishCoasting
            ? Phaser.Math.Linear(185, 0, this.finishCoastProgress)
            : this.getPlayerSpeedKmh();
        const speedRatio = isFinishCoasting
            ? Phaser.Math.Clamp(effectiveSpeedKmh / 225, 0, 1)
            : Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const cue = updateSpeedCue(this.speedCueState, {
            accelPressed: isFinishCoasting ? false : this.getDriveCommand().accelPressed,
            downhillRatio: Math.max(0, this.getSlopeRatio()),
            driftRatio: this.playerVehicle.driftRatio,
            driftState: this.playerVehicle.driftState,
            seconds,
            speedKmh: effectiveSpeedKmh,
        });

        this.speedEffectIntensity = Phaser.Math.Linear(
            this.speedEffectIntensity,
            getSpeedEffectIntensity(cue.intensity) * coastFade,
            1 - Math.exp(-8 * seconds),
        );
        this.speedEffectTime += seconds * Phaser.Math.Linear(
            SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMin,
            SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMax,
            speedRatio,
        );
        this.speedEffectCue = cue;
        if (isFinishCoasting) return;

        this.cameraEffects = updateCameraEffects(this.cameraEffects, {
            cue,
            cueLimits: SPEED_CUE_CONFIG,
            railImpact: this.playerVehicle.guardrailImpactCue,
            seconds,
            speedKmh: this.getPlayerSpeedKmh(),
        }, CAMERA_EFFECTS_CONFIG);
    }

    private getSpeedEffectShaderUniforms(): SpeedEffectShaderUniforms {
        const viewport = this.getViewport();

        return {
            downhillIntensity: this.speedEffectCue.downhill,
            eventIntensity: this.speedEffectCue.throttleBurst +
                this.speedEffectCue.driftExitBurst +
                this.speedEffectCue.driftFlow,
            horizonY: getHorizonY(this.cameraResource, viewport),
            intensity: this.speedEffectIntensity,
            time: this.speedEffectTime,
            viewport,
        };
    }

    private getHeadlightShaderUniforms(): HeadlightShaderUniforms {
        const viewport = this.getViewport();
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const finishHeadlightFade = this.getFinishCoastHeadlightFade();
        const fallbackY = this.playerCar.y - this.playerCar.displayHeight * 0.22;
        const fallbackSpacing = this.playerCar.displayWidth * 0.045;
        const lampPose = this.headlightLampPose;
        const footprint = getVehicleHeadlightFootprintDimensions(
            lampPose?.footprint ?? PLAYER_DEFAULTS.PLAYER_HEADLIGHT_FOOTPRINT_FALLBACK,
            viewport.height,
        );
        const emitter = lampPose
            ? getVehicleHeadlightEmitterState(lampPose)
            : {
                leftIntensity: 1,
                leftReachScale: 1,
                lobeWidthScale: 0.6,
                mergeStartRatio: 0.58,
                rightIntensity: 1,
                rightReachScale: 1,
            };

        return {
            beamCenter: lampPose?.beamCenter ?? {
                x: this.playerCar.x,
                y: fallbackY,
            },
            beamForwardAxis: lampPose?.beamForwardAxis ?? { x: 0, y: -1 },
            beamLateralAxis: lampPose?.beamLateralAxis ?? { x: 1, y: 0 },
            cornerFillIntensity: this.headlightOpticalState.cornerFillIntensity,
            cornerFillReachScale: this.headlightOpticalState.cornerFillReachScale,
            cornerFillWeight: this.headlightOpticalState.cornerFillWeight,
            cornerFillYawDeg: this.headlightOpticalState.cornerFillYawDeg,
            farHalfWidthRatio: footprint.farHalfWidthRatio,
            intensity: Phaser.Math.Linear(0.72, 0.9, speedRatio) * finishHeadlightFade,
            lampHalfSpan: lampPose?.lampHalfSpan ?? fallbackSpacing,
            lampLeftIntensity: emitter.leftIntensity,
            lampLeftOrigin: lampPose?.lampLeft ?? {
                x: this.playerCar.x - fallbackSpacing,
                y: fallbackY,
            },
            lampLeftReachScale: emitter.leftReachScale,
            lampRightIntensity: emitter.rightIntensity,
            lampRightOrigin: lampPose?.lampRight ?? {
                x: this.playerCar.x + fallbackSpacing,
                y: fallbackY,
            },
            lampRightReachScale: emitter.rightReachScale,
            lobeWidthScale: emitter.lobeWidthScale,
            mainSwivelDeg: lampPose?.mainSwivelDeg ?? 0,
            mergeStartRatio: emitter.mergeStartRatio,
            nearPaddingPx: footprint.nearPadding,
            reachRatio: footprint.reachRatio,
            viewport,
        };
    }

    private updateHeadlightState(
        seconds: number,
        renderState: PlayerVehicleRenderState,
        poseState: PlayerVehiclePoseRenderState,
    ) {
        const { anchor, displaySize } = renderState;
        const visualSteering = poseState.visualSteering;
        const rawRoadAimX = Phaser.Math.Clamp(
            this.roadStats?.headlightRoadTangent?.aimX ?? 0,
            -PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX,
            PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX,
        );
        const roadIntent = rawRoadAimX / PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX;
        const curveRoadWeight = this.playerVehicle.driftState === 'grip'
            ? PLAYER_DEFAULTS.PLAYER_HEADLIGHT_CURVE_INTENT_GRIP_ROAD_WEIGHT
            : PLAYER_DEFAULTS.PLAYER_HEADLIGHT_CURVE_INTENT_DRIFT_ROAD_WEIGHT;
        const curveIntentTarget = composeVehicleHeadlightCurveIntent(
            visualSteering.value,
            roadIntent,
            curveRoadWeight,
        );
        this.headlightCurveIntentTarget = curveIntentTarget;
        this.headlightCurveIntent = updateVehicleHeadlightCurveIntent(
            this.headlightCurveIntent,
            curveIntentTarget,
            seconds,
        );
        this.headlightOpticalState = getVehicleHeadlightOpticalState(
            PLAYER_VEHICLE_ATLAS,
            this.headlightCurveIntent,
        );

        const lampPose = getVehicleHeadlightScreenPose(
            PLAYER_VEHICLE_ATLAS,
            poseState.frameId,
            {
                displaySize,
                flipX: poseState.flipX,
                mainSwivelDeg: this.headlightOpticalState.mainSwivelDeg,
                rotationRadians: poseState.rotationRadians,
                x: anchor.x + this.cameraEffects.shake.x,
                y: anchor.y + this.cameraEffects.shake.y,
            },
        );
        const framePoseAimX = Phaser.Math.Clamp(
            lampPose.poseAimX,
            -PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_PX,
            PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_PX,
        );
        const poseStrength = Phaser.Math.Clamp(
            Math.abs(framePoseAimX) / PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_PX,
            0,
            1,
        );
        const roadWeight = Phaser.Math.Linear(
            PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_ROAD_WEAK_POSE_WEIGHT,
            PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_ROAD_STRONG_POSE_WEIGHT,
            poseStrength,
        );
        const roadAssistTargetX = rawRoadAimX * roadWeight;
        const roadBlend = 1 - Math.exp(
            -seconds / PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_ROAD_ASSIST_RESPONSE_SECONDS,
        );
        const fineAimTargetX = visualSteering.value * PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_FINE_STEER_PX;
        const fineMovesAway = Math.abs(fineAimTargetX) > Math.abs(this.headlightFineAimX);
        const fineResponseSeconds = fineMovesAway
            ? PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_FINE_ATTACK_SECONDS
            : PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_FINE_RETURN_SECONDS;
        const fineBlend = 1 - Math.exp(-seconds / fineResponseSeconds);

        this.headlightLampPose = lampPose;
        this.headlightFramePoseAimX = framePoseAimX;
        this.headlightRawRoadAimX = rawRoadAimX;
        this.headlightRoadAimX = Phaser.Math.Linear(
            this.headlightRoadAimX,
            roadAssistTargetX,
            roadBlend,
        );
        this.headlightFineAimX = Phaser.Math.Linear(
            this.headlightFineAimX,
            fineAimTargetX,
            fineBlend,
        );
        this.headlightAimTargetX = composeVehicleHeadlightAim(
            framePoseAimX,
            this.headlightFineAimX,
            this.headlightRoadAimX,
            PLAYER_DEFAULTS.PLAYER_HEADLIGHT_AIM_MAX_PX,
        );
        // The atlas frame and its headlight profile are selected together, so
        // the body-pose component must be visible in the same rendered frame.
        this.headlightAimX = this.headlightAimTargetX;
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
            this.cameraResource.z + PLAYER_DEFAULTS.PLAYER_SLOPE_SAMPLE_DISTANCE,
        );
        const downhillRatio = (currentElevation - aheadElevation) / PLAYER_DEFAULTS.PLAYER_SLOPE_SAMPLE_DISTANCE;

        return Phaser.Math.Clamp(
            downhillRatio * PLAYER_DEFAULTS.PLAYER_GRAVITY_ACCELERATION,
            -PLAYER_DEFAULTS.PLAYER_MAX_SLOPE_ACCELERATION,
            PLAYER_DEFAULTS.PLAYER_MAX_SLOPE_ACCELERATION,
        );
    }

    private getSlopeCameraPitch() {
        const slopeRatio = this.getSlopeRatio();
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const speedInfluence = Phaser.Math.Linear(0.45, 1, speedRatio);
        const downhillExtraPitch = Math.max(0, slopeRatio) * CAMERA_DOWNHILL_EXTRA_PITCH;

        return -slopeRatio * (CAMERA_MAX_SLOPE_PITCH + downhillExtraPitch) * speedInfluence;
    }

    private getSlopeRatio() {
        return Phaser.Math.Clamp(
            this.getSlopeAcceleration() / PLAYER_DEFAULTS.PLAYER_MAX_SLOPE_ACCELERATION,
            -1,
            1,
        );
    }

    private getDownhillVisualCueRatio() {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED, 0, 1);
        const speedInfluence = Phaser.Math.Linear(0.35, 1, speedRatio);

        return Phaser.Math.Clamp(Math.max(0, this.getSlopeRatio()) * speedInfluence, 0, 1);
    }

    private applyRuntimeQaOverrides() {
        applyRuntimeQaOverridesToState({
            camera: this.cameraResource,
            normalizeZ: (z) => wrapDistance(z, this.roadTrack.length),
            overrides: RUNTIME_QA,
            player: this.playerVehicle,
        });
    }

    private updateTelemetryHotkey() {
        if (!RUNTIME_TELEMETRY.enabled) return;
        if (!this.getSceneHotkeys().exportTelemetry) return;

        this.telemetry?.downloadJsonl('hotkey');
    }

    private updateDebugHudHotkey() {
        if (!this.getSceneHotkeys().toggleDebugHud) return;

        this.debugHudVisible = !this.debugHudVisible;
    }

    private getDriveCommand() {
        const keyboardCommand = readDriveCommand({
            accel: this.cursors.up,
            brake: this.keys.space,
            steerLeft: this.cursors.left,
            steerRight: this.cursors.right,
        });
        return mergeDriveCommands([keyboardCommand]);
    }

    private getSceneHotkeys() {
        return readSceneHotkeys({
            exportTelemetry: Phaser.Input.Keyboard.JustDown(this.keys.l),
            restart: Phaser.Input.Keyboard.JustDown(this.keys.r),
            toggleDebugHud: Phaser.Input.Keyboard.JustDown(this.keys.d),
            toggleLongitudinalAb: Phaser.Input.Keyboard.JustDown(this.keys.b),
        });
    }

    private updateLongitudinalAbHotkey() {
        if (!this.getSceneHotkeys().toggleLongitudinalAb) return;

        const nextScale = getNextLongitudinalUnitScale(LONGITUDINAL_PROGRESSION.scale);
        const url = new URL(window.location.href);

        url.searchParams.set('longitudinalScale', String(nextScale));
        window.location.assign(url);
    }

    private updateRestartHotkey() {
        if (!this.getSceneHotkeys().restart) return;

        this.restartRun();
    }

    private updateRunCountdown(seconds: number) {
        this.playerVehicle.speed = 0;
        const wasStarted = this.runState.started;
        if (LAUNCH_CONTROL_ENABLED) {
            this.playerVehicle.rpm = updatePreLaunchRev(
                this.launchState,
                this.getDriveCommand().accelPressed,
                seconds,
                LAUNCH_CONTROL_CONFIG,
            );
        }
        updateCourseRunCountdown(this.runState, seconds);

        if (LAUNCH_CONTROL_ENABLED && !wasStarted && this.runState.started) {
            beginLaunch(this.launchState, this.getDriveCommand().accelPressed, LAUNCH_CONTROL_CONFIG);
        }
    }

    private updateRunState(seconds: number) {
        const passedCheckpointsBefore = this.runState.passedCheckpoints;
        const finishedNow = updateCourseRunProgress(
            this.runState,
            this.cameraResource.z / this.roadTrack.finishZ,
            seconds,
            this.courseRunConfig,
        );

        if (this.runState.passedCheckpoints > passedCheckpointsBefore) {
            const checkpointIndex = this.runState.passedCheckpoints - 1;
            const checkpointTime = this.runState.checkpointTimesSec[checkpointIndex] ?? this.runState.elapsedSec;
            this.checkpointNoticeText = `CHECKPOINT ${checkpointIndex + 1}/${COURSE_CHECKPOINT_RATIOS.length}\n${formatRunTime(checkpointTime)}`;
            this.checkpointNoticeRemainingSec = 1.25;
        }

        this.checkpointNoticeRemainingSec = Math.max(0, this.checkpointNoticeRemainingSec - seconds);

        if (finishedNow) {
            this.playerVehicle.speed = RUN_FINISH_COAST_SPEED;
            this.finishCoastRemainingSec = FINISH_COAST_DURATION_SEC;
            this.finishCoastProgress = 0;
            this.finishCoastStartProjectionScale = 0;
            this.finishCoastLateralOffset = 0;
            this.finishCoastVehicleZ = 0;
            // The following render forces `center`, captures that exact
            // rear-sprite transform, then the next update begins the coast.
            this.finishPresentationPhase = 'capture';
            this.finishCoastPresentation = null;
            const finishTimeSec = this.runState.finishTimeSec ?? this.runState.elapsedSec;
            const previousBest = this.bestRunTimeSec;
            this.lastFinishDeltaSec = previousBest === null ? null : finishTimeSec - previousBest;
            this.bestRunTimeSec = saveBestRunTime(this.roadTrack.id, previousBest, finishTimeSec);
            this.runFinishedWithBest = this.bestRunTimeSec === finishTimeSec && previousBest !== finishTimeSec;
        }
    }

    private restartRun() {
        this.cameraResource.z = RUNTIME_QA.initialZ ?? 0;
        this.cameraEffects = createCameraEffectsState(CAMERA_EFFECTS_CONFIG);
        this.cameraResource.fovDegrees = this.cameraEffects.fovDegrees;
        this.cameraTerrainPitch = 0;
        this.cameraManualPitch = 0;
        this.debugGuardrailImpactBounceVelocity = 0;
        this.debugGuardrailImpactSide = 0;
        this.debugGuardrailImpactTimer = 0;
        this.playerVehicle = createDefaultPlayerVehicleState(
            RUNTIME_QA.initialSpeed ?? PLAYER_DEFAULTS.PLAYER_CRUISE_SPEED,
            ACTIVE_RUNTIME_VEHICLE.engineProfile,
            PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED,
        );
        this.roadObjectMotionTracker.reset();
        this.headlightAimTargetX = 0;
        this.headlightAimX = 0;
        this.headlightCurveIntent = 0;
        this.headlightCurveIntentTarget = 0;
        this.headlightFineAimX = 0;
        this.headlightFramePoseAimX = 0;
        this.headlightLampPose = null;
        this.headlightRawRoadAimX = 0;
        this.headlightRoadAimX = 0;
        this.headlightOpticalState = getVehicleHeadlightOpticalState(
            PLAYER_VEHICLE_ATLAS,
            0,
        );
        this.runState = createCourseRunState(this.courseRunConfig, RUNTIME_QA.enabled);
        this.runFinishedWithBest = false;
        this.lastFinishDeltaSec = null;
        this.finishCoastRemainingSec = 0;
        this.finishCoastProgress = 0;
        this.finishCoastStartProjectionScale = 0;
        this.finishCoastLateralOffset = 0;
        this.finishCoastVehicleZ = 0;
        this.finishPresentationPhase = 'racing';
        this.finishCoastPresentation = null;
        this.checkpointNoticeRemainingSec = 0;
        this.checkpointNoticeText = '';
        this.launchState = createLaunchControlState();
        this.burnoutSkidMarks = [];
        this.render();
    }

    private renderCourseProgress(viewport: Viewport) {
        const marginX = 150;
        const lineY = viewport.height - 30;
        const lineWidth = viewport.width - marginX * 2;
        const lineHeight = 4;
        const progress = Phaser.Math.Clamp(this.runState.progressRatio, 0, 1);
        const progressX = marginX + lineWidth * progress;

        this.uiGraphics.fillStyle(0x050812, 0.74);
        this.uiGraphics.fillRect(marginX - 12, lineY - 12, lineWidth + 24, 24);
        this.uiGraphics.fillStyle(0x14395f, 0.9);
        this.uiGraphics.fillRect(marginX, lineY - lineHeight / 2, lineWidth, lineHeight);
        this.uiGraphics.fillStyle(0x67b7ff, 0.95);
        this.uiGraphics.fillRect(marginX, lineY - lineHeight / 2, lineWidth * progress, lineHeight);

        this.drawProgressTick(marginX, lineY, 0x9fcfff, 0.8);

        for (const checkpointRatio of COURSE_CHECKPOINT_RATIOS) {
            this.drawProgressTick(
                marginX + lineWidth * checkpointRatio,
                lineY,
                checkpointRatio <= progress ? 0x67b7ff : 0x245f9d,
                checkpointRatio <= progress ? 0.95 : 0.7,
            );
        }

        this.drawProgressTick(marginX + lineWidth, lineY, 0xb8dcff, 0.95);

        this.uiGraphics.fillStyle(0xe8f6ff, 1);
        this.uiGraphics.fillCircle(progressX, lineY, 6);
        this.uiGraphics.lineStyle(2, 0x050812, 0.9);
        this.uiGraphics.strokeCircle(progressX, lineY, 7);
    }

    private drawProgressTick(x: number, y: number, color: number, alpha: number) {
        this.uiGraphics.fillStyle(color, alpha);
        this.uiGraphics.fillRect(x - 2, y - 10, 4, 20);
    }

    private renderRunStatus(viewport: Viewport) {
        this.runStatusText.setPosition(viewport.width / 2, viewport.height * 0.35);

        if (this.runState.finished) {
            if (this.finishPresentationPhase === 'capture' || this.finishPresentationPhase === 'coast') {
                this.runStatusText.setVisible(false);
                return;
            }
            const finishTime = this.runState.finishTimeSec ?? this.runState.elapsedSec;
            const bestText = this.bestRunTimeSec === null
                ? 'BEST --'
                : `BEST ${formatRunTime(this.bestRunTimeSec)}${this.runFinishedWithBest ? '  NEW BEST' : ''}`;
            const deltaText = this.lastFinishDeltaSec === null
                ? ''
                : `\nDELTA ${this.lastFinishDeltaSec >= 0 ? '+' : '-'}${formatRunTime(Math.abs(this.lastFinishDeltaSec))}`;
            this.runStatusText
                .setText(`FINISH\n${formatRunTime(finishTime)}\n${bestText}${deltaText}\nR TO RESTART`)
                .setFontSize(34)
                .setVisible(true);
            return;
        }

        if (!this.runState.started) {
            this.runStatusText
                .setText(String(Math.max(1, Math.ceil(this.runState.countdownRemainingSec))))
                .setFontSize(64)
                .setVisible(true);
            return;
        }

        if (this.checkpointNoticeRemainingSec > 0) {
            this.runStatusText
                .setText(this.checkpointNoticeText)
                .setFontSize(32)
                .setAlpha(Math.min(1, this.checkpointNoticeRemainingSec / 0.18))
                .setVisible(true);
            return;
        }

        this.runStatusText.setAlpha(1).setVisible(false);
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
        const physicsRoad = this.playerPhysicsRoadSample;
        const guardrailContext = this.getGuardrailCollisionContext(physicsRoad);
        const guardrailGeometry = getGuardrailCollisionGeometry(guardrailContext);
        const activeRailContactLimit = guardrailGeometry.railCenterLimit;
        const guardrailScreenProjection = this.getPlayerVehicleRenderState(viewport)
            .guardrailScreenProjection;

        return {
            camera: serializeRuntimeQaCamera({
                camera: this.cameraResource,
                fovCueDegrees: this.cameraEffects.fovCueDegrees,
                manualPitch: this.cameraManualPitch,
                shake: this.cameraEffects.shake,
                terrainPitch: this.cameraTerrainPitch,
            }),
            elapsedSec: Number(this.elapsedSec.toFixed(3)),
            headlight: serializeRuntimeQaHeadlight({
                aimTargetX: this.headlightAimTargetX,
                aimX: this.headlightAimX,
                curveIntent: this.headlightCurveIntent,
                curveIntentTarget: this.headlightCurveIntentTarget,
                emitterState: this.headlightLampPose
                    ? getVehicleHeadlightEmitterState(this.headlightLampPose)
                    : null,
                fineAimX: this.headlightFineAimX,
                framePoseAimX: this.headlightFramePoseAimX,
                lampPose: this.headlightLampPose,
                opticalState: this.headlightOpticalState,
                rawRoadAimX: this.headlightRawRoadAimX,
                roadAssistAimX: this.headlightRoadAimX,
                roadTangent: this.roadStats?.headlightRoadTangent ?? null,
            }),
            horizonY,
            guardrailScreen: serializeRuntimeQaGuardrailScreen(guardrailScreenProjection),
            input: this.getDriveCommand(),
            launch: serializeRuntimeQaLaunch(this.launchState),
            longitudinalProgression: serializeRuntimeQaLongitudinal({
                config: LONGITUDINAL_PROGRESSION,
                defaultRoadHalfWidth: DEFAULT_ROAD_HALF_WIDTH,
                physicalSpeed: this.playerVehicle.speed,
                roadSegmentLength: this.roadTrack.segmentLength,
                worldTravelSpeed: this.getWorldTravelSpeed(),
            }),
            physicsRoad: serializeRuntimeQaPhysicsRoad({
                baseRenderCurve: this.roadStats?.currentCurve ?? 0,
                ...physicsRoad,
            }),
            player: serializeRuntimeQaPlayer({
                boostRatio: Number(this.playerVehicle.boostRatio.toFixed(4)),
                brakePressure: Number(this.playerVehicle.brakePressure.toFixed(4)),
                cornerDemand: serializeRuntimeQaPlayerCornerDemand(
                    this.playerVehicle.cornerDemand,
                    getDisplaySpeedKmh(
                        this.playerVehicle.cornerDemand.targetSpeed,
                        PLAYER_DEFAULTS.PLAYER_ACCEL_SPEED,
                        ACTIVE_RUNTIME_VEHICLE.engineProfile,
                    ),
                ),
                cornerSpeedLoss: serializeRuntimeQaPlayerCornerSpeedLoss(
                    this.playerVehicle.cornerSpeedLoss,
                ),
                counterSteerTimer: Number(this.playerVehicle.counterSteerTimer.toFixed(3)),
                counterSteerLateralVelocity: Number(this.playerVehicle.counterSteerLateralVelocity.toFixed(3)),
                counterSteerEntryDriftVelocity: Number(this.playerVehicle.counterSteerEntryDriftVelocity.toFixed(3)),
                counterTrimRatio: Number(this.playerVehicle.counterTrimRatio.toFixed(4)),
                engineTorqueScale: Number(this.playerVehicle.engineTorqueScale.toFixed(4)),
                driftDirection: this.playerVehicle.driftDirection,
                driftBaseLateralVelocity: Number(this.playerVehicle.driftBaseLateralVelocity.toFixed(3)),
                driftEntryLateralTarget: Number(this.playerVehicle.driftEntryLateralTarget.toFixed(3)),
                driftEntryMode: this.playerVehicle.driftEntryMode,
                driftExitThrottleDelay: Number(this.playerVehicle.driftExitThrottleDelay.toFixed(3)),
                driftLateralVelocity: Number(this.playerVehicle.driftLateralVelocity.toFixed(3)),
                driftRatio: Number(this.playerVehicle.driftRatio.toFixed(4)),
                driftState: this.playerVehicle.driftState,
                driftStateTimer: Number(this.playerVehicle.driftStateTimer.toFixed(3)),
                driftThrottleLiftTimer: Number(this.playerVehicle.driftThrottleLiftTimer.toFixed(3)),
                driftTransitionArmed: this.playerVehicle.driftTransitionArmed,
                driftTransitionDirection: this.playerVehicle.driftTransitionDirection,
                driftTransitionAwaitingCounter: this.playerVehicle.driftTransitionAwaitingCounter,
                driftTransitionLiftTimer: Number(this.playerVehicle.driftTransitionLiftTimer.toFixed(3)),
                fuelCutActive: this.playerVehicle.fuelCutActive,
                gear: this.playerVehicle.gearIndex + 1,
                guardrailBounceVelocity: Number(this.playerVehicle.guardrailBounceVelocity.toFixed(3)),
                guardrailContactActive: this.playerVehicle.guardrailContactActive,
                guardrailContactAnchorOffset: Number(
                    this.playerVehicle.guardrailContactAnchorOffset.toFixed(3),
                ),
                guardrailContactClearTimer: Number(
                    this.playerVehicle.guardrailContactClearTimer.toFixed(3),
                ),
                guardrailContactInset: Number(this.playerVehicle.guardrailContactInset.toFixed(3)),
                guardrailContactDirection: this.playerVehicle.guardrailContactDirection,
                guardrailContactPhase: this.playerVehicle.guardrailContactPhase,
                guardrailContactTimer: Number(this.playerVehicle.guardrailContactTimer.toFixed(3)),
                guardrailImpactCount: this.playerVehicle.guardrailImpactCount,
                guardrailImpactCue: Number(this.playerVehicle.guardrailImpactCue.toFixed(4)),
                guardrailShoulderRatio: Number(this.playerVehicle.guardrailShoulderRatio.toFixed(4)),
                guardrailVisualPavedHalfWidth: null,
                guardrailVisualRailContactLimit: null,
                guardrailPhysicalPavedHalfWidth: Number(guardrailContext.pavedHalfWidth.toFixed(3)),
                guardrailPhysicalRailOffset: Number(guardrailGeometry.railOffset.toFixed(3)),
                guardrailPhysicalVehicleHalfWidth: Number(guardrailGeometry.vehicleHalfWidth.toFixed(3)),
                guardrailPhysicalPavedCenterLimit: Number(guardrailGeometry.pavedCenterLimit.toFixed(3)),
                guardrailActiveRailContactLimit: Number(activeRailContactLimit.toFixed(3)),
                guardrailActiveContactRatio: Number((
                    Math.abs(this.playerVehicle.lateralOffset) / activeRailContactLimit
                ).toFixed(4)),
                cornerInsideHeadingAllowance: Number(
                    this.playerVehicle.cornerInsideHeadingAllowance.toFixed(4),
                ),
                cornerInsideHeadingLimited: this.playerVehicle.cornerInsideHeadingLimited,
                cornerInertiaLateralVelocity: Number(
                    this.playerVehicle.cornerInertiaLateralVelocity.toFixed(3),
                ),
                vehicleHeadingError: Number(this.playerVehicle.vehicleHeadingError.toFixed(4)),
                requiredRoadYawRate: Number(this.playerVehicle.requiredRoadYawRate.toFixed(4)),
                passiveGripYawRate: Number(this.playerVehicle.passiveGripYawRate.toFixed(4)),
                residualRoadYawRate: Number(this.playerVehicle.residualRoadYawRate.toFixed(4)),
                gripFollowAuthority: Number(this.playerVehicle.gripFollowAuthority.toFixed(4)),
                gripHeadingCommitTimer: Number(
                    this.playerVehicle.gripHeadingCommitTimer.toFixed(3),
                ),
                previewRoadCurve: Number(this.playerPhysicsRoadSample.previewRoadCurve.toFixed(4)),
                nearRoadTangentChange: Number(
                    this.playerPhysicsRoadSample.nearTangentChange.toFixed(4),
                ),
                farRoadTangentChange: Number(
                    this.playerPhysicsRoadSample.farTangentChange.toFixed(4),
                ),
                gripCounterRoadLateralVelocity: Number(this.playerVehicle.gripCounterRoadLateralVelocity.toFixed(3)),
                gripCounterRoadRatio: Number(this.playerVehicle.gripCounterRoadRatio.toFixed(4)),
                gripSteerAngleLimit: Number(this.playerVehicle.gripSteerAngleLimit.toFixed(4)),
                lateralOffset: this.playerVehicle.lateralOffset,
                lowSpeedLateralAuthority: Number(this.playerVehicle.lowSpeedLateralAuthority.toFixed(4)),
                lowSpeedVisualSteeringAuthority: Number(this.playerVehicle.lowSpeedVisualSteeringAuthority.toFixed(4)),
                handlingSpeedRatio: Number(this.playerVehicle.speedHandling.speedRatio.toFixed(4)),
                speedHandling: serializeRuntimeQaPlayerSpeedHandling(this.playerVehicle.speedHandling),
                centeringCounterHoldTimer: Number(this.playerVehicle.centeringCounterHoldTimer.toFixed(3)),
                centeringForce: Number(this.playerVehicle.centeringForce.toFixed(3)),
                centeringReleaseStartScale: Number(this.playerVehicle.centeringReleaseStartScale.toFixed(3)),
                centeringReleaseTimer: Number(this.playerVehicle.centeringReleaseTimer.toFixed(3)),
                lateralCenteringScale: Number(this.playerVehicle.lateralCenteringScale.toFixed(3)),
                lateralCenteringTargetScale: Number(this.playerVehicle.lateralCenteringTargetScale.toFixed(3)),
                roadOffsetRatio: Number((
                    this.playerVehicle.lateralOffset / this.getCurrentRoadOffsetLimit()
                ).toFixed(4)),
                overspeedUndersteerLateralVelocity: Number(this.playerVehicle.overspeedUndersteerLateralVelocity.toFixed(3)),
                physicalSteeringCommand: Number(
                    this.playerVehicle.physicalSteeringCommand.toFixed(4),
                ),
                overspeedUndersteerLoadTransferScale: Number(
                    this.playerVehicle.overspeedUndersteerLoadTransferScale.toFixed(4),
                ),
                overspeedUndersteerRatio: Number(this.playerVehicle.overspeedUndersteerRatio.toFixed(4)),
                overspeedUndersteerSteerDemandRatio: Number(
                    this.playerVehicle.overspeedUndersteerSteerDemandRatio.toFixed(4),
                ),
                overspeedUndersteerTargetRatio: Number(this.playerVehicle.overspeedUndersteerTargetRatio.toFixed(4)),
                rpm: this.playerVehicle.rpm,
                shiftCutRatio: Number(this.playerVehicle.shiftCutRatio.toFixed(4)),
                shiftDirection: this.playerVehicle.shiftDirection,
                shiftTimer: Number(this.playerVehicle.shiftTimer.toFixed(3)),
                slopeAcceleration: this.getSlopeAcceleration(),
                speed: this.playerVehicle.speed,
                speedKmh: Number(this.getPlayerSpeedKmh().toFixed(1)),
                slipAngle: Number(this.playerVehicle.slipAngle.toFixed(3)),
                steering: this.playerVehicle.steering,
                steeringVelocity: this.playerVehicle.steeringVelocity,
                torqueScale: Number(this.playerVehicle.torqueScale.toFixed(4)),
                traction: Number(this.playerVehicle.traction.toFixed(4)),
            }),
            qa: RUNTIME_QA,
            controller: PLAYER_CONTROLLER_CONFIG,
            road: this.roadStats,
            roadObjects: this.roadObjectStats,
            run: serializeRuntimeQaRun(this.runState),
            speedEffect: serializeRuntimeQaSpeedEffect({
                base: this.speedEffectCue.base,
                downhill: this.speedEffectCue.downhill,
                driftExitBurst: this.speedEffectCue.driftExitBurst,
                driftFlow: this.speedEffectCue.driftFlow,
                expectedPeakAlpha: getSpeedEffectExpectedPeakAlpha({
                    downhillIntensity: this.speedEffectCue.downhill,
                    eventIntensity: this.speedEffectCue.throttleBurst +
                        this.speedEffectCue.driftExitBurst +
                        this.speedEffectCue.driftFlow,
                    intensity: this.speedEffectIntensity,
                }),
                intensity: this.speedEffectIntensity,
                throttleBurst: this.speedEffectCue.throttleBurst,
                time: this.speedEffectTime,
            }),
            track: serializeRuntimeQaTrack(this.roadTrack),
            tuning: RUNTIME_TUNING,
            vehicle: serializeRuntimeQaVehicle({
                state: this.lastVehicleQaState,
                asset: ACTIVE_RUNTIME_VEHICLE.id,
                color: ACTIVE_RUNTIME_VEHICLE.color,
                engineProfile: ACTIVE_RUNTIME_VEHICLE.engineProfile,
            }),
            viewport,
        };
    }
}

function formatRunTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;

    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
}

function getCityLightFlicker(elapsedSec: number, phase: number) {
    const slowPulse = (Math.sin(elapsedSec * 1.45 + phase) + 1) / 2;
    const quickFlicker = (Math.sin(elapsedSec * 5.7 + phase * 2.3) + 1) / 2;

    return Phaser.Math.Linear(0.54, 0.96, slowPulse * 0.72 + quickFlicker * 0.28);
}

function getParallaxOffset(
    track: RoadTrack,
    cameraZ: number,
    lookAheadDistance: number,
    scrollScale: number,
    offsetLimit: number,
) {
    return Phaser.Math.Clamp(
        getRoadCenterOffsetAhead(track, cameraZ, lookAheadDistance) * scrollScale,
        -offsetLimit,
        offsetLimit,
    );
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
