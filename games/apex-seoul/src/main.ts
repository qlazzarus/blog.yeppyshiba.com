import Phaser from 'phaser';
import './styles.css';
import farCityParallaxUrl from '../assets/environment/approved/parallax-v1/city-far-blueblack.png';
import farCityLightsUrl from '../assets/environment/approved/parallax-v1/city-far-lights-bluewhite.png';
import cloudDarkBlueUrl from '../assets/environment/approved/parallax-v1/cloud-dark-blue.png';
import moonCoolBlueUrl from '../assets/environment/approved/parallax-v1/moon-cool-blue.png';
import nearRidgeParallaxUrl from '../assets/environment/approved/parallax-v1/ridge-near-blueblack.png';
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
    type VehicleEngineProfile,
} from './game/engineProfile';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
    type PlayerVehicleControllerConfig,
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
    createRuntimeQaOverrides,
    createRuntimePlayerVehicleConfig,
    createRuntimeTelemetryConfig,
    createRuntimeTuning,
    type RuntimeQaOverrides,
    type RuntimeTelemetryConfig,
    type RuntimeTuning,
} from './game/runtimeConfig';
import { RuntimeTelemetryRecorder } from './game/runtimeTelemetry';
import {
    getRoadRelativeVehicleTargetSize,
    getVehicleScaleRoadWidth,
    updateRoadRelativeVehicleSize,
    type VehicleRoadScaleConfig,
} from './game/vehicleRoadScale';
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
import {
    createVehicleUndersteerVisualState,
    updateVehicleUndersteerVisualState,
    type VehicleUndersteerVisualState,
} from './game/vehicleUndersteerVisual';

const CAMERA_INPUT_RESPONSE = 14;
const CAMERA_LATERAL_SPEED = 820;
const CAMERA_DOWNHILL_EXTRA_PITCH = 42;
const CAMERA_MAX_SLOPE_PITCH = 34;
const CAMERA_SLOPE_PITCH_RESPONSE = 3.2;
const DEBUG_PROJECTION_GUIDES = false;
const DEBUG_GUARDRAIL_IMPACT_HOLD_SECONDS = 0.9;
const ENABLE_DEBUG_CAMERA_CONTROLS = false;
const COURSE_CHECKPOINT_RATIOS = [0.25, 0.5, 0.75];
const COURSE_FINISH_RATIO = 1;
const PLAYER_BRAKE_SPEED = 0;
const PLAYER_BRAKING = 330;
const PLAYER_BRAKE_RELEASE_RESPONSE = 13;
const PLAYER_BRAKE_RESPONSE = 8;
const PLAYER_CENTERING_RESPONSE = 6;
const PLAYER_CENTERING_COUNTER_HOLD_DURATION = 0.18;
const PLAYER_CENTERING_COUNTER_START_SCALE = 0.58;
const PLAYER_CENTERING_INPUT_HOLD_SCALE = 0.35;
const PLAYER_CENTERING_NEUTRAL_INWARD_VELOCITY_CAP = 20;
const PLAYER_CENTERING_RELEASE_DELAY = 0.18;
const PLAYER_CENTERING_RELEASE_SCALE_RESPONSE = 0.8;
const PLAYER_CENTERING_RELEASE_SCALE = 0.45;
const PLAYER_CENTERING_SCALE_RESPONSE = 4.8;
const PLAYER_CRUISE_SPEED = 0;
const PLAYER_ACCEL_SPEED = 760;
const PLAYER_CORNER_EASY_INTENSITY_THRESHOLD = 0.34;
const PLAYER_CORNER_EASY_SPEED_LOSS_SCALE = 0.95;
const PLAYER_CORNER_LINE_SPEED_BONUS = 70;
const PLAYER_CORNER_LINE_TARGET_OFFSET = 260;
const PLAYER_CORNER_SEVERE_LINE_SCRUB_SCALE = 1.2;
const PLAYER_CORNER_SEVERE_OVERSPEED_FULL_RATIO = 1.45;
const PLAYER_CORNER_SEVERE_OVERSPEED_SCRUB = 140;
const PLAYER_CORNER_SEVERE_OVERSPEED_START_RATIO = 1.18;
const PLAYER_CORNER_SHARP_INTENSITY_THRESHOLD = 0.7;
const PLAYER_CORNER_SHARP_LINE_REWARD_SCALE = 1.35;
const PLAYER_CORNER_SHARP_SPEED_LOSS_SCALE = 1.18;
const PLAYER_CORNER_SPEED_PULL = 100;
const PLAYER_DOWNHILL_CORNER_BUDGET_MAX_REDUCTION = 0;
const PLAYER_DOWNHILL_CORNER_BUDGET_SLOPE_ACCELERATION = 65;
const PLAYER_DOWNHILL_CORNER_LATERAL_SCALE = 1.3;
const PLAYER_DOWNHILL_CORNER_OVERSPEED_SCRUB = 0;
const PLAYER_INPUT_RESPONSE = 18;
const PLAYER_LAUNCH_THROTTLE_FULL_SPEED_RATIO = 1;
const PLAYER_LAUNCH_THROTTLE_MIN_RATIO = 0.5;
const PLAYER_MAX_ROAD_OFFSET = 700;
const PLAYER_OVERSPEED_UNDERSTEER_MAX = 0.62;
const PLAYER_OVERSPEED_EASY_UNDERSTEER_FULL_RATIO = 0.2;
const PLAYER_OVERSPEED_EASY_UNDERSTEER_SCALE = 0.3;
const PLAYER_OVERSPEED_MEDIUM_UNDERSTEER_SCALE = 0.58;
const PLAYER_OVERSPEED_UNDERSTEER_MIN_STEER_INPUT = 0.08;
const PLAYER_OVERSPEED_UNDERSTEER_STEER_INPUT_FULL = 0.45;
const PLAYER_OVERSPEED_UNDERSTEER_LIFT_TARGET_SCALE = 0.55;
const PLAYER_OVERSPEED_UNDERSTEER_BRAKE_TARGET_SCALE = 0.28;
const PLAYER_OVERSPEED_EASY_LATERAL_SCALE = 4;
const PLAYER_OVERSPEED_EASY_ROAD_MAX_RATIO = 0.22;
const PLAYER_OVERSPEED_MEDIUM_LATERAL_SCALE = 1.15;
const PLAYER_OVERSPEED_MEDIUM_ROAD_MAX_RATIO = 0.42;
const PLAYER_OVERSPEED_SAFETY_MARGIN_START_RATIO = 0.16;
// A substantial exit cost should arrive well before the shoulder, so a fast
// grip line has to leave room for the corner rather than occupy all of it.
const PLAYER_OVERSPEED_SAFETY_MARGIN_FULL_RATIO = 0.32;
const PLAYER_OVERSPEED_SAFETY_MARGIN_SCRUB = 75;
const PLAYER_OVERSPEED_SHARP_LATERAL_SCALE = 1.55;
const PLAYER_OVERSPEED_SHARP_SPEED_SCRUB_SCALE = 1.35;
const PLAYER_OVERSPEED_SHARP_UNDERSTEER_SCALE = 1;
const PLAYER_OVERSPEED_UNDERSTEER_ROAD_BUILD_RATE = 2.2;
const PLAYER_OVERSPEED_UNDERSTEER_ROAD_MAX_RATIO = 0.54;
const PLAYER_OVERSPEED_UNDERSTEER_ROAD_RECOVERY_RATE = 7.5;
const PLAYER_OVERSPEED_UNDERSTEER_ROAD_SPEED_RATE = 0.72;
const PLAYER_OVERSPEED_UNDERSTEER_RATIO_BUILD_RATE = 2.8;
const PLAYER_OVERSPEED_UNDERSTEER_RATIO_RECOVERY_RATE = 4.5;
const PLAYER_OVERSPEED_UNDERSTEER_SPEED_SCRUB = 28;
const PLAYER_OVERSPEED_UNDERSTEER_SPEED_WINDOW = 150;
const PLAYER_ROAD_ANCHOR_DISTANCE = 640;
const PLAYER_ROAD_CONTACT_DISTANCE = 260;
const PLAYER_HEADLIGHT_AIM_FINE_STEER_PX = 14;
const PLAYER_HEADLIGHT_AIM_FINE_ATTACK_SECONDS = 0.05;
const PLAYER_HEADLIGHT_AIM_FINE_RETURN_SECONDS = 0.1;
const PLAYER_HEADLIGHT_CURVE_INTENT_DRIFT_ROAD_WEIGHT = 0.3;
const PLAYER_HEADLIGHT_CURVE_INTENT_GRIP_ROAD_WEIGHT = 0.55;
const PLAYER_HEADLIGHT_AIM_MAX_PX = 72;
const PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX = 54;
const PLAYER_HEADLIGHT_AIM_ROAD_ASSIST_RESPONSE_SECONDS = 0.2;
const PLAYER_HEADLIGHT_AIM_ROAD_STRONG_POSE_WEIGHT = 0.1;
const PLAYER_HEADLIGHT_AIM_ROAD_WEAK_POSE_WEIGHT = 0.35;
const PLAYER_HEADLIGHT_FOOTPRINT_FALLBACK = {
    farHalfWidthRatio: 0.125,
    nearPaddingPx: 4,
    reachRatio: 0.098,
};
const PLAYER_SCREEN_ANCHOR_RATIO = 0.88;
const PLAYER_SHADOW_BASELINE_Y_OFFSET = 0.028;
const PLAYER_SHADOW_MAX_ALPHA = 0.18;
const PLAYER_SHADOW_SOFT_ALPHA = 0.24;
const PLAYER_SILHOUETTE_SHADOW_ALPHA = 0.48;
const PLAYER_STEER_ACCELERATION = 1650;
const PLAYER_STEER_DAMPING = 9.2;
const PLAYER_VEHICLE_VIEWPORT_RATIO = 0.34;
const PLAYER_VEHICLE_MIN_SIZE = 220;
const PLAYER_VEHICLE_MAX_SIZE = 360;
const PLAYER_VEHICLE_ROTATION_DEG = 3.5;
const PLAYER_VEHICLE_ROAD_SCALE_DEAD_ZONE_RATIO = 0.02;
const PLAYER_VEHICLE_ROAD_SCALE_MAX = 1.08;
const PLAYER_VEHICLE_ROAD_SCALE_MIN = 0.92;
const PLAYER_VEHICLE_ROAD_SCALE_RESPONSE_SECONDS = 0.7;
const PLAYER_VEHICLE_ROAD_TARGET_RATIO = 0.54;
const PLAYER_STEER_WEAK_THRESHOLD = 0.14;
const PLAYER_TERRAIN_CUE_THRESHOLD = 24;
const PLAYER_CONTACT_TERRAIN_CUE_THRESHOLD = 8;
const PLAYER_MAX_TERRAIN_SCREEN_Y_SHIFT = 18;
const PLAYER_TERRAIN_SCALE_INTENSITY = 0.045;
const PLAYER_CURVE_SCREEN_BIAS = 8;
const PLAYER_CORNER_INERTIA_BUILD_RATE = 240;
const PLAYER_CORNER_INERTIA_MAX_LATERAL_SPEED = 265;
const PLAYER_CORNER_INERTIA_RECOVERY_RATE = 320;
const PLAYER_CURVE_STEERING_CUE = 0.06;
const PLAYER_DRIFT_BUILD_RATE = 2.8;
const PLAYER_DRIFT_DECAY_RATE = 2.6;
const PLAYER_DRIFT_ENTRY_SPEED_LOSS = 16;
const PLAYER_DRIFT_ENTRY_LATERAL_KICK = 190;
const PLAYER_DRIFT_BREAKAWAY_DURATION = 0.22;
const PLAYER_DRIFT_BRAKE_ENTRY_PRESSURE = 0.64;
const PLAYER_DRIFT_BRAKE_ENTRY_SPEED_LOSS = 14;
const PLAYER_DRIFT_LIFT_ENTRY_SPEED_LOSS = 22;
const PLAYER_DRIFT_EASY_ENTRY_SPEED_LOSS_SCALE = 0.55;
const PLAYER_DRIFT_SHARP_ENTRY_SPEED_LOSS_SCALE = 1.25;
const PLAYER_DRIFT_OUTSIDE_LINE_OVERSPEED_PULL = 0.65;
const PLAYER_DRIFT_OUTSIDE_LINE_SCRUB_SCALE = 0.55;
const PLAYER_DRIFT_EXIT_REACCEL_DELAY = 0.24;
const PLAYER_DRIFT_THROTTLE_GRACE_DURATION = 0.28;
const PLAYER_DRIFT_THROTTLE_LIFT_RATIO = 0.44;
const PLAYER_DRIFT_COUNTER_NEUTRAL_DURATION = 0.08;
const PLAYER_DRIFT_LATERAL_DAMPING = 1.9;
const PLAYER_DRIFT_LATERAL_MAX_SPEED = 230;
const PLAYER_DRIFT_COUNTER_STEER_LATERAL_SCALE = 0.42;
const PLAYER_DRIFT_COUNTER_STEER_LATERAL_SUSTAIN_SCALE = 0.58;
const PLAYER_DRIFT_COUNTER_STEER_LATERAL_VELOCITY_CAP = 52;
// Counter steer should trim the existing slide, not pull the car back to grip.
const PLAYER_DRIFT_COUNTER_TRIM_DURATION = 0.65;
const PLAYER_DRIFT_COUNTER_TRIM_MAX_RATIO = 0.62;
const PLAYER_DRIFT_COUNTER_TRIM_RESPONSE = 7;
const PLAYER_DRIFT_COUNTER_TRIM_RELEASE_RESPONSE = 4;
const PLAYER_DRIFT_SUSTAIN_ACCELERATION = 300;
const PLAYER_DRIFT_TRANSITION_ARM_DURATION = 0.12;
const PLAYER_DRIFT_TRANSITION_INPUT_WINDOW = 0.42;
const PLAYER_DRIFT_TRANSITION_KICK = 120;
const PLAYER_DRIFT_MAX_SLIP_ANGLE = 10;
const PLAYER_DRIFT_MIN_CORNER_INTENSITY = 0.38;
const PLAYER_DRIFT_MIN_SPEED_RATIO = 0.55;
const PLAYER_DRIFT_MIN_STEER_INPUT = 0.6;
const PLAYER_DRIFT_RECOVERY_RATE = 2.3;
const PLAYER_CURVE_STEERING_HIGH_SPEED_DROP = 0.42;
const PLAYER_HIGH_SPEED_INPUT_RESPONSE_DROP = 0.28;
const PLAYER_HIGH_SPEED_LATERAL_VELOCITY_CAP = 70;
const PLAYER_HIGH_SPEED_STEERING_SLEW_RATE = 5.6;
const PLAYER_HIGH_SPEED_STEER_FORCE_DROP = 0.54;
const PLAYER_HIGH_SPEED_STEER_VISUAL_DROP = 0.43;
const PLAYER_GRIP_STEER_ANGLE_HIGH_SPEED_CAP = 0.72;
const PLAYER_GRIP_STEER_ANGLE_HIGH_SPEED_START_RATIO = 0.55;
const PLAYER_GRIP_COUNTER_ROAD_CENTERING_SCALE = 0.1;
const PLAYER_GRIP_COUNTER_ROAD_LATERAL_BUILD_RATE = 180;
const PLAYER_GRIP_COUNTER_ROAD_LATERAL_MAX_SPEED = 96;
const PLAYER_GRIP_COUNTER_ROAD_LATERAL_RECOVERY_RATE = 150;
const PLAYER_GRIP_COUNTER_ROAD_SPEED_SCRUB = 72;
const PLAYER_HIGH_SPEED_STEER_WEAK_THRESHOLD = 0.22;
const PLAYER_HIGH_SPEED_VISUAL_STEERING_SCALE = 1;
const PLAYER_STEERING_VELOCITY_CUE = 0.2;
const PLAYER_STEERING_SPEED_SCRUB = 64;
const PLAYER_STEERING_SPEED_SCRUB_THRESHOLD = 0.22;
const PLAYER_ENGINE_ACCELERATION = 82;
const PLAYER_ENGINE_BRAKE_DECELERATION = 26;
const PLAYER_ROLLING_RESISTANCE = 14;
const PLAYER_AERO_DRAG = 0.000007661283025835461;
const PLAYER_GRAVITY_ACCELERATION = 360;
const PLAYER_MAX_SLOPE_ACCELERATION = 115;
const PLAYER_SLOPE_SAMPLE_DISTANCE = 720;
const PLAYER_RPM_IDLE = 1100;
const PLAYER_RPM_REDLINE = 7200;
const PLAYER_RPM_RESPONSE = 7;
const RUN_FINISH_COAST_SPEED = 0;
const TELEMETRY_DEFAULT_DURATION_SEC = 60;
const TELEMETRY_DEFAULT_SAMPLE_HZ = 10;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 760;
const CITY_SKYLINE_BASE_Y_RATIO = 0.38;
const CITY_FAR_PARALLAX_KEY = 'city-far-parallax';
const CITY_FAR_LIGHTS_KEY = 'city-far-lights';
const CITY_RIDGE_PARALLAX_KEY = 'city-ridge-parallax';
const CLOUD_DARK_BLUE_KEY = 'cloud-dark-blue';
const MOON_COOL_BLUE_KEY = 'moon-cool-blue';
const WALL_FOREST_TREE_KEYS = [
    'wall-forest-tree-01',
    'wall-forest-tree-02',
    'wall-forest-tree-03',
    'wall-forest-tree-04',
    'wall-forest-tree-05',
] as const;
const CITY_PARALLAX_WIDTH = 1600;
const CITY_FAR_PARALLAX_HEIGHT = 112;
const CITY_RIDGE_PARALLAX_HEIGHT = 150;
const CITY_RIDGE_BASELINE_OFFSET_Y = 42;
const MOON_X_RATIO = 0.87;
const MOON_Y_RATIO = 0.12;
const MOON_DISPLAY_SIZE = 112;
const FT86_RETRO_SPRITE_URLS: Record<string, string> = {
    black: ft86RetroBlackVehicleSpriteUrl,
    blue: ft86RetroBlueVehicleSpriteUrl,
    red: ft86RetroRedVehicleSpriteUrl,
    silver: ft86RetroSilverVehicleSpriteUrl,
    yellow: ft86RetroYellowVehicleSpriteUrl,
};

const URL_PARAMS = new URLSearchParams(window.location.search);
const LONGITUDINAL_PROGRESSION = createLongitudinalProgressionConfig(URL_PARAMS);
const ACTIVE_RUNTIME_VEHICLE = selectRuntimeVehicleAsset(URL_PARAMS);
const PLAYER_VEHICLE_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.textureKey;
const PLAYER_VEHICLE_SHADOW_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.shadowTextureKey;
const ACTIVE_ROAD_TRACK_ID = parseRoadTrackId(URL_PARAMS.get('track'));
const RUNTIME_TUNING: RuntimeTuning = createRuntimeTuning(URL_PARAMS, {
    cameraBaseFov: DEFAULT_CAMERA_EFFECTS_CONFIG.baseFov,
    cameraShakeDriftExitX: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeDriftExitX,
    cameraShakeDriftExitY: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeDriftExitY,
    cameraShakeFrequency: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeFrequency,
    cameraShakeScale: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeScale,
    cameraShakeThrottleX: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeThrottleX,
    cameraShakeThrottleY: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeThrottleY,
    cameraSpeedFovBonus: DEFAULT_CAMERA_EFFECTS_CONFIG.speedFovBonus,
    curveScreenBias: PLAYER_CURVE_SCREEN_BIAS,
    debugProjectionGuides: DEBUG_PROJECTION_GUIDES,
    highSpeedSteerWeakThreshold: PLAYER_HIGH_SPEED_STEER_WEAK_THRESHOLD,
    highSpeedVisualSteeringScale: PLAYER_HIGH_SPEED_VISUAL_STEERING_SCALE,
    playerContactTerrainCueThreshold: PLAYER_CONTACT_TERRAIN_CUE_THRESHOLD,
    playerRoadAnchorDistance: PLAYER_ROAD_ANCHOR_DISTANCE,
    playerRoadContactDistance: PLAYER_ROAD_CONTACT_DISTANCE,
    playerScreenAnchorRatio: PLAYER_SCREEN_ANCHOR_RATIO,
    steerWeakThreshold: PLAYER_STEER_WEAK_THRESHOLD,
    terrainCueThreshold: PLAYER_TERRAIN_CUE_THRESHOLD,
    terrainScaleIntensity: PLAYER_TERRAIN_SCALE_INTENSITY,
    vehicleMaxSize: PLAYER_VEHICLE_MAX_SIZE,
    vehicleMinSize: PLAYER_VEHICLE_MIN_SIZE,
    vehicleRoadScaleDeadZoneRatio: PLAYER_VEHICLE_ROAD_SCALE_DEAD_ZONE_RATIO,
    vehicleRoadScaleMax: PLAYER_VEHICLE_ROAD_SCALE_MAX,
    vehicleRoadScaleMin: PLAYER_VEHICLE_ROAD_SCALE_MIN,
    vehicleRoadScaleResponseSeconds: PLAYER_VEHICLE_ROAD_SCALE_RESPONSE_SECONDS,
    vehicleRoadTargetRatio: PLAYER_VEHICLE_ROAD_TARGET_RATIO,
    vehicleRotationDeg: PLAYER_VEHICLE_ROTATION_DEG,
    vehicleViewportRatio: PLAYER_VEHICLE_VIEWPORT_RATIO,
});
const CAMERA_EFFECTS_CONFIG = createCameraEffectsConfig(RUNTIME_TUNING);
const RUNTIME_QA: RuntimeQaOverrides = createRuntimeQaOverrides(URL_PARAMS, {
    maxRoadOffset: DEFAULT_ROAD_HALF_WIDTH + GUARDRAIL_COLLISION_CONFIG.contactClearance -
        GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    playerAccelSpeed: PLAYER_ACCEL_SPEED,
});
const RUNTIME_TELEMETRY: RuntimeTelemetryConfig = createRuntimeTelemetryConfig(URL_PARAMS, {
    durationSec: TELEMETRY_DEFAULT_DURATION_SEC,
    sampleHz: TELEMETRY_DEFAULT_SAMPLE_HZ,
});

function createRuntimeQaCamera() {
    const camera = createDefaultCamera();

    camera.z = RUNTIME_QA.initialZ ?? camera.z;

    return camera;
}
const PLAYER_CONTROLLER_CONFIG: PlayerVehicleControllerConfig = createRuntimePlayerVehicleConfig(URL_PARAMS, {
    accelSpeed: PLAYER_ACCEL_SPEED,
    aeroDrag: PLAYER_AERO_DRAG,
    brakeSpeed: PLAYER_BRAKE_SPEED,
    braking: PLAYER_BRAKING,
    brakeReleaseResponse: PLAYER_BRAKE_RELEASE_RESPONSE,
    brakeResponse: PLAYER_BRAKE_RESPONSE,
    centeringResponse: PLAYER_CENTERING_RESPONSE,
    centeringCounterHoldDuration: PLAYER_CENTERING_COUNTER_HOLD_DURATION,
    centeringCounterStartScale: PLAYER_CENTERING_COUNTER_START_SCALE,
    centeringInputHoldScale: PLAYER_CENTERING_INPUT_HOLD_SCALE,
    centeringNeutralInwardVelocityCap: PLAYER_CENTERING_NEUTRAL_INWARD_VELOCITY_CAP,
    centeringReleaseDelay: PLAYER_CENTERING_RELEASE_DELAY,
    centeringReleaseScaleResponse: PLAYER_CENTERING_RELEASE_SCALE_RESPONSE,
    centeringReleaseScale: PLAYER_CENTERING_RELEASE_SCALE,
    centeringScaleResponse: PLAYER_CENTERING_SCALE_RESPONSE,
    cornerEasyIntensityThreshold: PLAYER_CORNER_EASY_INTENSITY_THRESHOLD,
    cornerEasySpeedLossScale: PLAYER_CORNER_EASY_SPEED_LOSS_SCALE,
    cornerLineSpeedBonus: PLAYER_CORNER_LINE_SPEED_BONUS,
    cornerLineTargetOffset: PLAYER_CORNER_LINE_TARGET_OFFSET,
    cornerSevereLineScrubScale: PLAYER_CORNER_SEVERE_LINE_SCRUB_SCALE,
    cornerSevereOverspeedFullRatio: PLAYER_CORNER_SEVERE_OVERSPEED_FULL_RATIO,
    cornerSevereOverspeedScrub: PLAYER_CORNER_SEVERE_OVERSPEED_SCRUB,
    cornerSevereOverspeedStartRatio: PLAYER_CORNER_SEVERE_OVERSPEED_START_RATIO,
    cornerSharpIntensityThreshold: PLAYER_CORNER_SHARP_INTENSITY_THRESHOLD,
    cornerSharpLineRewardScale: PLAYER_CORNER_SHARP_LINE_REWARD_SCALE,
    cornerSharpSpeedLossScale: PLAYER_CORNER_SHARP_SPEED_LOSS_SCALE,
    cornerSpeedPull: PLAYER_CORNER_SPEED_PULL,
    cornerInertiaBuildRate: PLAYER_CORNER_INERTIA_BUILD_RATE,
    cornerInertiaMaxLateralSpeed: PLAYER_CORNER_INERTIA_MAX_LATERAL_SPEED,
    cornerInertiaRecoveryRate: PLAYER_CORNER_INERTIA_RECOVERY_RATE,
    downhillCornerBudgetMaxReduction: PLAYER_DOWNHILL_CORNER_BUDGET_MAX_REDUCTION,
    downhillCornerBudgetSlopeAcceleration: PLAYER_DOWNHILL_CORNER_BUDGET_SLOPE_ACCELERATION,
    downhillCornerLateralScale: PLAYER_DOWNHILL_CORNER_LATERAL_SCALE,
    downhillCornerOverspeedScrub: PLAYER_DOWNHILL_CORNER_OVERSPEED_SCRUB,
    curveSteeringHighSpeedDrop: PLAYER_CURVE_STEERING_HIGH_SPEED_DROP,
    curveSteeringCue: PLAYER_CURVE_STEERING_CUE,
    driftBuildRate: PLAYER_DRIFT_BUILD_RATE,
    driftDecayRate: PLAYER_DRIFT_DECAY_RATE,
    driftEntrySpeedLoss: PLAYER_DRIFT_ENTRY_SPEED_LOSS,
    driftEntryLateralKick: PLAYER_DRIFT_ENTRY_LATERAL_KICK,
    driftBreakawayDuration: PLAYER_DRIFT_BREAKAWAY_DURATION,
    driftBrakeEntryPressure: PLAYER_DRIFT_BRAKE_ENTRY_PRESSURE,
    driftBrakeEntrySpeedLoss: PLAYER_DRIFT_BRAKE_ENTRY_SPEED_LOSS,
    driftLiftEntrySpeedLoss: PLAYER_DRIFT_LIFT_ENTRY_SPEED_LOSS,
    driftEasyEntrySpeedLossScale: PLAYER_DRIFT_EASY_ENTRY_SPEED_LOSS_SCALE,
    driftSharpEntrySpeedLossScale: PLAYER_DRIFT_SHARP_ENTRY_SPEED_LOSS_SCALE,
    driftOutsideLineOverspeedPull: PLAYER_DRIFT_OUTSIDE_LINE_OVERSPEED_PULL,
    driftOutsideLineScrubScale: PLAYER_DRIFT_OUTSIDE_LINE_SCRUB_SCALE,
    driftExitReaccelDelay: PLAYER_DRIFT_EXIT_REACCEL_DELAY,
    driftThrottleGraceDuration: PLAYER_DRIFT_THROTTLE_GRACE_DURATION,
    driftThrottleLiftRatio: PLAYER_DRIFT_THROTTLE_LIFT_RATIO,
    driftCounterNeutralDuration: PLAYER_DRIFT_COUNTER_NEUTRAL_DURATION,
    driftLateralDamping: PLAYER_DRIFT_LATERAL_DAMPING,
    driftLateralMaxSpeed: PLAYER_DRIFT_LATERAL_MAX_SPEED,
    driftCounterSteerLateralScale: PLAYER_DRIFT_COUNTER_STEER_LATERAL_SCALE,
    driftCounterSteerLateralSustainScale: PLAYER_DRIFT_COUNTER_STEER_LATERAL_SUSTAIN_SCALE,
    driftCounterSteerLateralVelocityCap: PLAYER_DRIFT_COUNTER_STEER_LATERAL_VELOCITY_CAP,
    driftCounterTrimDuration: PLAYER_DRIFT_COUNTER_TRIM_DURATION,
    driftCounterTrimMaxRatio: PLAYER_DRIFT_COUNTER_TRIM_MAX_RATIO,
    driftCounterTrimResponse: PLAYER_DRIFT_COUNTER_TRIM_RESPONSE,
    driftCounterTrimReleaseResponse: PLAYER_DRIFT_COUNTER_TRIM_RELEASE_RESPONSE,
    driftSustainAcceleration: PLAYER_DRIFT_SUSTAIN_ACCELERATION,
    driftTransitionArmDuration: PLAYER_DRIFT_TRANSITION_ARM_DURATION,
    driftTransitionInputWindow: PLAYER_DRIFT_TRANSITION_INPUT_WINDOW,
    driftTransitionKick: PLAYER_DRIFT_TRANSITION_KICK,
    driftMaxSlipAngle: PLAYER_DRIFT_MAX_SLIP_ANGLE,
    driftMinCornerIntensity: PLAYER_DRIFT_MIN_CORNER_INTENSITY,
    driftMinSpeedRatio: PLAYER_DRIFT_MIN_SPEED_RATIO,
    driftMinSteerInput: PLAYER_DRIFT_MIN_STEER_INPUT,
    driftRecoveryRate: PLAYER_DRIFT_RECOVERY_RATE,
    engineAcceleration: PLAYER_ENGINE_ACCELERATION,
    engineBrakeDeceleration: PLAYER_ENGINE_BRAKE_DECELERATION,
    engineProfile: ACTIVE_RUNTIME_VEHICLE.engineProfile,
    gripCounterRoadCenteringScale: PLAYER_GRIP_COUNTER_ROAD_CENTERING_SCALE,
    gripCounterRoadLateralBuildRate: PLAYER_GRIP_COUNTER_ROAD_LATERAL_BUILD_RATE,
    gripCounterRoadLateralMaxSpeed: PLAYER_GRIP_COUNTER_ROAD_LATERAL_MAX_SPEED,
    gripCounterRoadLateralRecoveryRate: PLAYER_GRIP_COUNTER_ROAD_LATERAL_RECOVERY_RATE,
    gripCounterRoadSpeedScrub: PLAYER_GRIP_COUNTER_ROAD_SPEED_SCRUB,
    highSpeedInputResponseDrop: PLAYER_HIGH_SPEED_INPUT_RESPONSE_DROP,
    highSpeedLateralVelocityCap: PLAYER_HIGH_SPEED_LATERAL_VELOCITY_CAP,
    highSpeedSteeringSlewRate: PLAYER_HIGH_SPEED_STEERING_SLEW_RATE,
    highSpeedSteerForceDrop: PLAYER_HIGH_SPEED_STEER_FORCE_DROP,
    highSpeedSteerVisualDrop: PLAYER_HIGH_SPEED_STEER_VISUAL_DROP,
    gripSteerAngleHighSpeedCap: PLAYER_GRIP_STEER_ANGLE_HIGH_SPEED_CAP,
    gripSteerAngleHighSpeedStartRatio: PLAYER_GRIP_STEER_ANGLE_HIGH_SPEED_START_RATIO,
    inputResponse: PLAYER_INPUT_RESPONSE,
    launchThrottleFullSpeedRatio: PLAYER_LAUNCH_THROTTLE_FULL_SPEED_RATIO,
    launchThrottleMinRatio: PLAYER_LAUNCH_THROTTLE_MIN_RATIO,
    maxRoadOffset: PLAYER_MAX_ROAD_OFFSET,
    overspeedUndersteerMax: PLAYER_OVERSPEED_UNDERSTEER_MAX,
    overspeedEasyUndersteerFullRatio: PLAYER_OVERSPEED_EASY_UNDERSTEER_FULL_RATIO,
    overspeedEasyUndersteerScale: PLAYER_OVERSPEED_EASY_UNDERSTEER_SCALE,
    overspeedMediumUndersteerScale: PLAYER_OVERSPEED_MEDIUM_UNDERSTEER_SCALE,
    overspeedUndersteerMinSteerInput: PLAYER_OVERSPEED_UNDERSTEER_MIN_STEER_INPUT,
    overspeedUndersteerSteerInputFull: PLAYER_OVERSPEED_UNDERSTEER_STEER_INPUT_FULL,
    overspeedUndersteerLiftTargetScale: PLAYER_OVERSPEED_UNDERSTEER_LIFT_TARGET_SCALE,
    overspeedUndersteerBrakeTargetScale: PLAYER_OVERSPEED_UNDERSTEER_BRAKE_TARGET_SCALE,
    overspeedEasyLateralScale: PLAYER_OVERSPEED_EASY_LATERAL_SCALE,
    overspeedEasyRoadMaxRatio: PLAYER_OVERSPEED_EASY_ROAD_MAX_RATIO,
    overspeedMediumLateralScale: PLAYER_OVERSPEED_MEDIUM_LATERAL_SCALE,
    overspeedMediumRoadMaxRatio: PLAYER_OVERSPEED_MEDIUM_ROAD_MAX_RATIO,
    overspeedSafetyMarginStartRatio: PLAYER_OVERSPEED_SAFETY_MARGIN_START_RATIO,
    overspeedSafetyMarginFullRatio: PLAYER_OVERSPEED_SAFETY_MARGIN_FULL_RATIO,
    overspeedSafetyMarginScrub: PLAYER_OVERSPEED_SAFETY_MARGIN_SCRUB,
    overspeedSharpLateralScale: PLAYER_OVERSPEED_SHARP_LATERAL_SCALE,
    overspeedSharpSpeedScrubScale: PLAYER_OVERSPEED_SHARP_SPEED_SCRUB_SCALE,
    overspeedSharpUndersteerScale: PLAYER_OVERSPEED_SHARP_UNDERSTEER_SCALE,
    overspeedUndersteerRoadBuildRate: PLAYER_OVERSPEED_UNDERSTEER_ROAD_BUILD_RATE,
    overspeedUndersteerRoadMaxRatio: PLAYER_OVERSPEED_UNDERSTEER_ROAD_MAX_RATIO,
    overspeedUndersteerRoadRecoveryRate: PLAYER_OVERSPEED_UNDERSTEER_ROAD_RECOVERY_RATE,
    overspeedUndersteerRoadSpeedRate: PLAYER_OVERSPEED_UNDERSTEER_ROAD_SPEED_RATE,
    overspeedUndersteerRatioBuildRate: PLAYER_OVERSPEED_UNDERSTEER_RATIO_BUILD_RATE,
    overspeedUndersteerRatioRecoveryRate: PLAYER_OVERSPEED_UNDERSTEER_RATIO_RECOVERY_RATE,
    overspeedUndersteerSpeedScrub: PLAYER_OVERSPEED_UNDERSTEER_SPEED_SCRUB,
    overspeedUndersteerSpeedWindow: PLAYER_OVERSPEED_UNDERSTEER_SPEED_WINDOW,
    rollingResistance: PLAYER_ROLLING_RESISTANCE,
    rpmIdle: PLAYER_RPM_IDLE,
    rpmRedline: PLAYER_RPM_REDLINE,
    rpmResponse: PLAYER_RPM_RESPONSE,
    steerAcceleration: PLAYER_STEER_ACCELERATION,
    steerDamping: PLAYER_STEER_DAMPING,
    steeringSpeedScrub: PLAYER_STEERING_SPEED_SCRUB,
    steeringSpeedScrubThreshold: PLAYER_STEERING_SPEED_SCRUB_THRESHOLD,
    steeringVelocityCue: PLAYER_STEERING_VELOCITY_CUE,
});

const PLAYER_VEHICLE_ATLAS = ACTIVE_RUNTIME_VEHICLE.atlas;

type CourseRunState = {
    elapsedSec: number;
    finishTimeSec: number | null;
    finished: boolean;
    passedCheckpoints: number;
    progressRatio: number;
};

type PlayerVehicleRenderState = {
    anchor: VehicleAnchor;
    displaySize: number;
    guardrailScreenProjection: GuardrailScreenProjection | null;
    roadRelativeScale: number;
    roadRelativeTargetSize: number;
    roadWidthAtVehicleY: number | null;
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

type PlayerVehiclePoseRenderState = {
    flipX: boolean;
    frameId: string;
    rotationRadians: number;
    visualSteering: PlayerVehicleVisualSteeringState;
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
    private tireScrubGraphics!: Phaser.GameObjects.Graphics;
    private headlightShader!: Phaser.GameObjects.Shader;
    private headlightLampPose: VehicleHeadlightScreenPose | null = null;
    private terrainHorizonOcclusionGraphics!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private collisionDebugText!: Phaser.GameObjects.Text;
    private graphics!: Phaser.GameObjects.Graphics;
    private uiGraphics!: Phaser.GameObjects.Graphics;
    private hudText!: Phaser.GameObjects.Text;
    private keys!: Record<'a' | 'b' | 'd' | 'e' | 'l' | 'q' | 'r' | 's' | 'space' | 'w', Phaser.Input.Keyboard.Key>;
    private elapsedSec = 0;
    private lastVehicleQaState: RuntimeVehicleQaState | null = null;
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
        RUNTIME_QA.initialSpeed ?? PLAYER_CRUISE_SPEED,
        ACTIVE_RUNTIME_VEHICLE.engineProfile,
        PLAYER_ACCEL_SPEED,
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
        contactZ: PLAYER_ROAD_CONTACT_DISTANCE,
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
        throttleBurst: 0,
    };
    private speedCueState = createSpeedCueState();
    private speedEffectShader!: Phaser.GameObjects.Shader;
    private speedEffectTime = 0;
    private telemetry: RuntimeTelemetryRecorder | null = null;
    private runState: CourseRunState = createInitialRunState();

    constructor() {
        super('apex-seoul');
    }

    preload() {
        this.load.image(CITY_FAR_PARALLAX_KEY, farCityParallaxUrl);
        this.load.image(CITY_FAR_LIGHTS_KEY, farCityLightsUrl);
        this.load.image(CLOUD_DARK_BLUE_KEY, cloudDarkBlueUrl);
        this.load.image(MOON_COOL_BLUE_KEY, moonCoolBlueUrl);
        this.load.image(CITY_RIDGE_PARALLAX_KEY, nearRidgeParallaxUrl);
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
        this.roadObjects = createRoadObjects(this.roadTrack);
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
        this.uiGraphics = this.add.graphics().setDepth(RenderDepth.Ui);
        this.playerSoftShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_SHADOW_SOFT_ALPHA)
            .setBlendMode(Phaser.BlendModes.MULTIPLY)
            .setDepth(RenderDepth.PlayerSoftShadow)
            .setOrigin(
                PLAYER_VEHICLE_ATLAS.frames.center.origin.x,
                PLAYER_VEHICLE_ATLAS.frames.center.origin.y,
            );
        this.playerSoftShadowCar.enableFilters().filters.internal.addBlur(1, 2.5, 1.4, 1, 0x000000, 2);
        this.playerShadowCar = this.add
            .image(0, 0, PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, 'center'))
            .setAlpha(PLAYER_SILHOUETTE_SHADOW_ALPHA)
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

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = {
            a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            b: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B),
            d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            e: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            l: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            r: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
            s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            space: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        };
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
        this.applyRuntimeQaOverrides();
        this.updateTelemetryHotkey();
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

        if (this.runState.finished) {
            this.playerVehicle.speed = RUN_FINISH_COAST_SPEED;
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
        this.renderUndersteerTireCue(vehicleRenderState, vehiclePoseState);
        this.renderPlayerVehicle(vehicleRenderState, vehiclePoseState);
        this.renderCourseProgress(viewport);
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
        const sideWidth = Math.min(176, viewport.width * 0.16);
        const bottomHeight = Math.min(104, viewport.height * 0.14);
        const steps = 7;

        // The pseudo-3D roadside ribbons must eventually leave the canvas.
        // A layered night matte makes that exit read as foreground darkness,
        // rather than as a hard geometry cut at the viewport edge.
        for (let step = 0; step < steps; step += 1) {
            const ratio = 1 - step / steps;
            const sideBandWidth = sideWidth * ratio;
            const bottomBandHeight = bottomHeight * ratio;

            this.foregroundOcclusionGraphics.fillStyle(0x02060d, 0.14);
            this.foregroundOcclusionGraphics.fillRect(0, 0, sideBandWidth, viewport.height);
            this.foregroundOcclusionGraphics.fillRect(
                viewport.width - sideBandWidth,
                0,
                sideBandWidth,
                viewport.height,
            );
            this.foregroundOcclusionGraphics.fillStyle(0x010407, 0.11);
            this.foregroundOcclusionGraphics.fillRect(
                0,
                viewport.height - bottomBandHeight,
                viewport.width,
                bottomBandHeight,
            );
        }
    }

    private drawBackground(viewport: Viewport, horizonY: number) {
        const skylineHorizonY = viewport.height * CITY_SKYLINE_BASE_Y_RATIO;

        this.backgroundGraphics.fillStyle(0x07101f, 1);
        this.backgroundGraphics.fillRect(0, 0, viewport.width, Math.max(0, horizonY));
        this.backgroundGraphics.fillStyle(0x14395f, 0.24);
        this.backgroundGraphics.fillRect(0, Math.max(0, skylineHorizonY - 42), viewport.width, 18);
        this.backgroundGraphics.fillStyle(0x3f7dd7, 0.18);
        this.backgroundGraphics.fillRect(0, skylineHorizonY - 16, viewport.width, 2);
        this.drawMoonAndClouds(viewport);
        this.drawCityView(viewport, skylineHorizonY);
        this.backgroundGraphics.fillStyle(0x081520, 1);
        this.backgroundGraphics.fillRect(0, horizonY, viewport.width, viewport.height - horizonY);
    }

    private drawCityView(viewport: Viewport, horizonY: number) {
        const farOffset = getParallaxOffset(this.roadTrack, this.cameraResource.z, 2800, 0.004, 18);
        const ridgeOffset = getParallaxOffset(this.roadTrack, this.cameraResource.z, 1200, 0.014, 64);

        this.farCityParallax
            .setAlpha(0.74)
            .setDisplaySize(CITY_PARALLAX_WIDTH, CITY_FAR_PARALLAX_HEIGHT)
            .setPosition(viewport.width / 2 + farOffset, horizonY - 6);
        this.farCityLights
            .setAlpha(getCityLightFlicker(this.elapsedSec, 0.8))
            .setDisplaySize(CITY_PARALLAX_WIDTH, CITY_FAR_PARALLAX_HEIGHT)
            .setPosition(viewport.width / 2 + farOffset, horizonY - 6);
        this.nearRidgeParallax
            .setAlpha(0.96)
            .setDisplaySize(CITY_PARALLAX_WIDTH, CITY_RIDGE_PARALLAX_HEIGHT)
            .setPosition(viewport.width / 2 + ridgeOffset, horizonY + CITY_RIDGE_BASELINE_OFFSET_Y);
    }

    private drawMoonAndClouds(viewport: Viewport) {
        const moonX = viewport.width * MOON_X_RATIO;
        const moonY = viewport.height * MOON_Y_RATIO;
        const nearCloudDrift = (this.elapsedSec * 7) % 420 - 210;
        const farCloudDrift = (this.elapsedSec * 3.5) % 360 - 180;

        this.moon
            .setAlpha(0.96)
            .setDisplaySize(MOON_DISPLAY_SIZE, MOON_DISPLAY_SIZE)
            .setPosition(moonX, moonY);
        this.farCloud
            .setAlpha(0.78)
            .setDisplaySize(1600, 300)
            .setPosition(viewport.width / 2 + farCloudDrift, moonY - 18);
        this.nearCloud
            .setAlpha(1)
            .setDisplaySize(1600, 360)
            .setPosition(viewport.width / 2 + nearCloudDrift, moonY + 26);
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
                ? 'Up: accel | Space: brake | Left/Right: steer | B: flow A/B | R: restart | WASD: camera | Q/E: pitch'
                : 'Up: accel | Space: brake | Left/Right: steer | B: flow A/B | R: restart | debug camera locked',
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
        const controllerConfig = {
            ...PLAYER_CONTROLLER_CONFIG,
            maxRoadOffset: physicsRoad.railCenterLimit,
        };

        updatePlayerVehicle(
            this.playerVehicle,
            {
                accelPressed: this.cursors.up.isDown,
                brakePressed: this.keys.space.isDown,
                steerAxis: getAxis(this.cursors.right.isDown, this.cursors.left.isDown),
            },
            {
                currentCurve: physicsRoad.currentCurve,
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
        // R3 intentionally keeps the car's scale independent of local road
        // narrowing. Reconstruct the equivalent full-width screen span for
        // the existing road-relative size response, while telemetry continues
        // to report the actual narrowed span.
        const roadWidthForVehicleScale = getVehicleScaleRoadWidth(
            roadWidthAtVehicleY,
            roadHalfWidthAtVehicle,
            DEFAULT_ROAD_HALF_WIDTH,
        );
        const roadScaleConfig: VehicleRoadScaleConfig = {
            deadZoneRatio: RUNTIME_TUNING.vehicleRoadScaleDeadZoneRatio,
            maxScale: RUNTIME_TUNING.vehicleRoadScaleMax,
            minScale: RUNTIME_TUNING.vehicleRoadScaleMin,
            responseSeconds: RUNTIME_TUNING.vehicleRoadScaleResponseSeconds,
            targetRoadRatio: RUNTIME_TUNING.vehicleRoadTargetRatio,
        };
        const roadRelativeTargetSize = getRoadRelativeVehicleTargetSize(
            baseSize,
            roadWidthForVehicleScale,
            roadScaleConfig,
        );
        const secondsSinceLastRender = this.lastVehicleSizeSample
            ? this.elapsedSec - this.lastVehicleSizeSample.elapsedSec
            : 0;
        const currentRoadRelativeSize = this.roadRelativeVehicleSize ?? baseSize;
        const roadRelativeSize = updateRoadRelativeVehicleSize(
            currentRoadRelativeSize,
            roadRelativeTargetSize,
            baseSize,
            secondsSinceLastRender,
            roadScaleConfig,
        );

        const displaySize = getTerrainScaledSpriteSize(roadRelativeSize, anchor, RUNTIME_TUNING);
        const centerContactProfile = getVehicleShadowProfile(PLAYER_VEHICLE_ATLAS, 'center');
        const guardrailScreenProjection = roadSpanAtVehicleY
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
        const vehicleFrame = selectPlayerVehicleFrame(
            PLAYER_VEHICLE_ATLAS,
            RUNTIME_TUNING,
            visualSteering.value,
            anchor.terrainCue,
            visualSteering.threshold,
            // A large grip input is still a planted turn. Reserve the fully
            // yawed atlas pose for setup/drift/recovery, where it represents
            // actual body slip rather than steering lock.
            this.playerVehicle.driftState !== 'grip',
        );

        return {
            flipX: vehicleFrame.flipX,
            frameId: vehicleFrame.frame,
            rotationRadians: Phaser.Math.DegToRad(
                visualSteering.rotationValue * RUNTIME_TUNING.vehicleRotationDeg,
            ),
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
        const visualSteering = poseState.visualSteering;
        const frame = PLAYER_VEHICLE_ATLAS.frames[poseState.frameId];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(anchor.x + this.cameraEffects.shake.x, anchor.y + this.cameraEffects.shake.y)
            .setDisplaySize(displaySize, displaySize)
            .setRotation(poseState.rotationRadians);

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
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const terrainIntensity = getContactTerrainCueIntensity(anchor.contactTerrainRatio);
        const visualSteering = poseState.visualSteering;
        const frame = PLAYER_VEHICLE_ATLAS.frames[poseState.frameId];
        const shadowProfile = getVehicleShadowProfile(PLAYER_VEHICLE_ATLAS, poseState.frameId);
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
            poseState.flipX,
            terrainIntensity,
        );
        const steeringOffset = visualSteering.bodyYawValue * displaySize * 0.018;
        const driftShadowScale = 1 + this.playerVehicle.driftRatio * 0.18;
        const alpha = PLAYER_SHADOW_MAX_ALPHA * Phaser.Math.Clamp(anchor.scale * 13, 0.7, 1);

        this.playerSoftShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setAlpha(softShadowAlpha)
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                chassisCenter.x + steeringOffset * 0.65 + this.cameraEffects.shake.x,
                chassisCenter.y - displaySize * 0.022 + this.cameraEffects.shake.y,
            )
            .setDisplaySize(
                displaySize * silhouetteScale.x * 1.16 * driftShadowScale,
                displaySize * silhouetteScale.y * 1.26,
            )
            .setRotation(Phaser.Math.DegToRad(
                visualSteering.rotationValue * RUNTIME_TUNING.vehicleRotationDeg * 0.22 +
                    this.playerVehicle.slipAngle * 0.32,
            ));

        this.playerShadowCar
            .setTexture(PLAYER_VEHICLE_SHADOW_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, poseState.frameId))
            .setAlpha(silhouetteAlpha)
            .setFlipX(poseState.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(
                chassisCenter.x + steeringOffset + this.cameraEffects.shake.x,
                chassisCenter.y - displaySize * 0.032 + this.cameraEffects.shake.y,
            )
            .setDisplaySize(
                displaySize * silhouetteScale.x * driftShadowScale,
                displaySize * silhouetteScale.y,
            )
            .setRotation(Phaser.Math.DegToRad(
                visualSteering.rotationValue * RUNTIME_TUNING.vehicleRotationDeg * 0.35 +
                    this.playerVehicle.slipAngle * 0.45,
            ));

        this.graphics.fillStyle(0x010303, alpha * 0.16);
        drawShadowContactPatch(
            this.graphics,
            chassisCenter.x + steeringOffset,
            chassisCenter.y - displaySize * 0.018,
            displaySize * shadowProfile.chassis.w * 0.72,
            displaySize * shadowProfile.chassis.h * 0.34,
        );
    }

    private renderUndersteerTireCue(
        renderState: PlayerVehicleRenderState,
        poseState: PlayerVehiclePoseRenderState,
    ) {
        const cue = poseState.visualSteering.understeerCueIntensity;
        const curveDirection = Math.sign(this.playerPhysicsRoadSample.currentCurve);

        if (this.playerVehicle.driftState !== 'grip' || cue < 0.02 || curveDirection === 0) {
            return;
        }

        const { anchor, displaySize } = renderState;
        const outwardDirection = -curveDirection;
        const centerX = anchor.x + this.cameraEffects.shake.x;
        const contactY = anchor.y + this.cameraEffects.shake.y + displaySize * 0.015;
        const trailLength = displaySize * Phaser.Math.Linear(0.035, 0.075, cue);
        const trailSkew = outwardDirection * displaySize * Phaser.Math.Linear(0.012, 0.03, cue);
        const pulse = 0.82 + Math.sin(this.elapsedSec * 42) * 0.08;

        for (const side of [-1, 1] as const) {
            const outerTire = side === outwardDirection;
            const alpha = cue * pulse * (outerTire ? 0.64 : 0.38);
            const startX = centerX + side * displaySize * 0.18;

            this.tireScrubGraphics.lineStyle(
                Math.max(1, displaySize * 0.006),
                outerTire ? 0xa9c7d8 : 0x7893a3,
                alpha,
            );
            this.tireScrubGraphics.lineBetween(
                startX,
                contactY,
                startX + trailSkew,
                contactY + trailLength,
            );
            this.tireScrubGraphics.lineStyle(
                Math.max(1, displaySize * 0.004),
                0xd1e3ea,
                alpha * 0.52,
            );
            this.tireScrubGraphics.lineBetween(
                startX - outwardDirection * displaySize * 0.012,
                contactY + displaySize * 0.012,
                startX + trailSkew * 0.72,
                contactY + trailLength * 0.72,
            );
        }
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
        const curveScreenBias =
            -this.playerPhysicsRoadSample.currentCurve * RUNTIME_TUNING.curveScreenBias;
        const anchorX = contactRoadAnchor.visible
            ? contactRoadAnchor.x + curveScreenBias
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

    private getPlayerSpeedKmh() {
        return getDisplaySpeedKmh(
            this.playerVehicle.speed,
            PLAYER_ACCEL_SPEED,
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
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
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
            rotationValue: 0,
            threshold,
            understeerCueIntensity: 0,
            value: driftPoseValue,
        };
    }

    private updateSpeedEffect(seconds: number) {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const cue = updateSpeedCue(this.speedCueState, {
            accelPressed: this.cursors.up.isDown,
            downhillRatio: Math.max(0, this.getSlopeRatio()),
            driftState: this.playerVehicle.driftState,
            seconds,
            speedKmh: this.getPlayerSpeedKmh(),
        });

        this.speedEffectIntensity = Phaser.Math.Linear(
            this.speedEffectIntensity,
            getSpeedEffectIntensity(cue.intensity),
            1 - Math.exp(-8 * seconds),
        );
        this.speedEffectTime += seconds * Phaser.Math.Linear(
            SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMin,
            SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMax,
            speedRatio,
        );
        this.speedEffectCue = cue;
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
            eventIntensity: this.speedEffectCue.throttleBurst + this.speedEffectCue.driftExitBurst,
            horizonY: getHorizonY(this.cameraResource, viewport),
            intensity: this.speedEffectIntensity,
            time: this.speedEffectTime,
            viewport,
        };
    }

    private getHeadlightShaderUniforms(): HeadlightShaderUniforms {
        const viewport = this.getViewport();
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const fallbackY = this.playerCar.y - this.playerCar.displayHeight * 0.22;
        const fallbackSpacing = this.playerCar.displayWidth * 0.045;
        const lampPose = this.headlightLampPose;
        const footprint = getVehicleHeadlightFootprintDimensions(
            lampPose?.footprint ?? PLAYER_HEADLIGHT_FOOTPRINT_FALLBACK,
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
            intensity: Phaser.Math.Linear(0.72, 0.9, speedRatio),
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
            -PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX,
            PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX,
        );
        const roadIntent = rawRoadAimX / PLAYER_HEADLIGHT_AIM_MAX_ROAD_PX;
        const curveRoadWeight = this.playerVehicle.driftState === 'grip'
            ? PLAYER_HEADLIGHT_CURVE_INTENT_GRIP_ROAD_WEIGHT
            : PLAYER_HEADLIGHT_CURVE_INTENT_DRIFT_ROAD_WEIGHT;
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
            -PLAYER_HEADLIGHT_AIM_MAX_PX,
            PLAYER_HEADLIGHT_AIM_MAX_PX,
        );
        const poseStrength = Phaser.Math.Clamp(
            Math.abs(framePoseAimX) / PLAYER_HEADLIGHT_AIM_MAX_PX,
            0,
            1,
        );
        const roadWeight = Phaser.Math.Linear(
            PLAYER_HEADLIGHT_AIM_ROAD_WEAK_POSE_WEIGHT,
            PLAYER_HEADLIGHT_AIM_ROAD_STRONG_POSE_WEIGHT,
            poseStrength,
        );
        const roadAssistTargetX = rawRoadAimX * roadWeight;
        const roadBlend = 1 - Math.exp(
            -seconds / PLAYER_HEADLIGHT_AIM_ROAD_ASSIST_RESPONSE_SECONDS,
        );
        const fineAimTargetX = visualSteering.value * PLAYER_HEADLIGHT_AIM_FINE_STEER_PX;
        const fineMovesAway = Math.abs(fineAimTargetX) > Math.abs(this.headlightFineAimX);
        const fineResponseSeconds = fineMovesAway
            ? PLAYER_HEADLIGHT_AIM_FINE_ATTACK_SECONDS
            : PLAYER_HEADLIGHT_AIM_FINE_RETURN_SECONDS;
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
            PLAYER_HEADLIGHT_AIM_MAX_PX,
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

    private updateLongitudinalAbHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.b)) return;

        const nextScale = getNextLongitudinalUnitScale(LONGITUDINAL_PROGRESSION.scale);
        const url = new URL(window.location.href);

        url.searchParams.set('longitudinalScale', String(nextScale));
        window.location.assign(url);
    }

    private updateRestartHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.r)) return;

        this.restartRun();
    }

    private updateRunState(seconds: number) {
        this.runState.elapsedSec += seconds;
        this.runState.progressRatio = Phaser.Math.Clamp(
            this.cameraResource.z / this.roadTrack.length,
            0,
            COURSE_FINISH_RATIO,
        );
        this.runState.passedCheckpoints = COURSE_CHECKPOINT_RATIOS.filter(
            (checkpointRatio) => this.runState.progressRatio >= checkpointRatio,
        ).length;

        if (this.runState.progressRatio >= COURSE_FINISH_RATIO) {
            this.runState.finished = true;
            this.runState.finishTimeSec = this.runState.elapsedSec;
            this.playerVehicle.speed = RUN_FINISH_COAST_SPEED;
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
            RUNTIME_QA.initialSpeed ?? PLAYER_CRUISE_SPEED,
            ACTIVE_RUNTIME_VEHICLE.engineProfile,
            PLAYER_ACCEL_SPEED,
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
        this.runState = createInitialRunState();
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
            camera: {
                fovDegrees: this.cameraResource.fovDegrees,
                fovCueDegrees: Number(this.cameraEffects.fovCueDegrees.toFixed(4)),
                height: this.cameraResource.height,
                horizonRatio: this.cameraResource.horizonRatio,
                lateralOffset: this.cameraResource.lateralOffset,
                manualPitch: this.cameraManualPitch,
                pitch: this.cameraResource.pitch,
                terrainPitch: this.cameraTerrainPitch,
                shake: {
                    x: Number(this.cameraEffects.shake.x.toFixed(3)),
                    y: Number(this.cameraEffects.shake.y.toFixed(3)),
                },
                z: this.cameraResource.z,
            },
            elapsedSec: Number(this.elapsedSec.toFixed(3)),
            headlight: {
                aimTargetX: Number(this.headlightAimTargetX.toFixed(3)),
                aimX: Number(this.headlightAimX.toFixed(3)),
                cornerFillIntensity: Number(
                    this.headlightOpticalState.cornerFillIntensity.toFixed(4),
                ),
                cornerFillReachScale: Number(
                    this.headlightOpticalState.cornerFillReachScale.toFixed(4),
                ),
                cornerFillWeight: Number(
                    this.headlightOpticalState.cornerFillWeight.toFixed(4),
                ),
                cornerFillYawDeg: Number(
                    this.headlightOpticalState.cornerFillYawDeg.toFixed(3),
                ),
                curveIntent: Number(this.headlightCurveIntent.toFixed(4)),
                curveIntentTarget: Number(this.headlightCurveIntentTarget.toFixed(4)),
                fineAimX: Number(this.headlightFineAimX.toFixed(3)),
                framePoseAimX: Number(this.headlightFramePoseAimX.toFixed(3)),
                emitterState: this.headlightLampPose
                    ? getVehicleHeadlightEmitterState(this.headlightLampPose)
                    : null,
                lampPose: this.headlightLampPose,
                mainSwivelDeg: Number(
                    this.headlightOpticalState.mainSwivelDeg.toFixed(3),
                ),
                rawRoadAimX: Number(this.headlightRawRoadAimX.toFixed(3)),
                roadAssistAimX: Number(this.headlightRoadAimX.toFixed(3)),
                roadTangent: this.roadStats?.headlightRoadTangent ?? null,
            },
            horizonY,
            guardrailScreen: guardrailScreenProjection
                ? Object.fromEntries(Object.entries(guardrailScreenProjection).map(([key, value]) => [
                    key,
                    Number(value.toFixed(4)),
                ]))
                : null,
            input: {
                accelPressed: this.cursors.up.isDown,
                brakePressed: this.keys.space.isDown,
                steerAxis: getAxis(this.cursors.right.isDown, this.cursors.left.isDown),
            },
            longitudinalProgression: {
                ...LONGITUDINAL_PROGRESSION,
                defaultRoadWidthsPerSec: Number((
                    this.getWorldTravelSpeed() / (DEFAULT_ROAD_HALF_WIDTH * 2)
                ).toFixed(4)),
                physicalSpeed: Number(this.playerVehicle.speed.toFixed(4)),
                segmentsPerSec: Number((
                    this.getWorldTravelSpeed() / this.roadTrack.segmentLength
                ).toFixed(4)),
                worldTravelSpeed: Number(this.getWorldTravelSpeed().toFixed(4)),
            },
            physicsRoad: {
                baseRenderCurve: Number((this.roadStats?.currentCurve ?? 0).toFixed(4)),
                cameraZ: Number(physicsRoad.cameraZ.toFixed(3)),
                contactZ: Number(physicsRoad.contactZ.toFixed(3)),
                currentCurve: Number(physicsRoad.currentCurve.toFixed(4)),
                pavedHalfWidth: Number(physicsRoad.pavedHalfWidth.toFixed(3)),
                railCenterLimit: Number(physicsRoad.railCenterLimit.toFixed(3)),
            },
            player: {
                boostRatio: Number(this.playerVehicle.boostRatio.toFixed(4)),
                brakePressure: Number(this.playerVehicle.brakePressure.toFixed(4)),
                cornerDemand: {
                    baseTargetSpeed: Number(this.playerVehicle.cornerDemand.baseTargetSpeed.toFixed(3)),
                    cornerIntensity: Number(this.playerVehicle.cornerDemand.cornerIntensity.toFixed(4)),
                    downhillCarryRatio: Number(this.playerVehicle.cornerDemand.downhillCarryRatio.toFixed(4)),
                    grade: this.playerVehicle.cornerDemand.grade,
                    lateralDemand: Number(this.playerVehicle.cornerDemand.lateralDemand.toFixed(4)),
                    lineQuality: Number(this.playerVehicle.cornerDemand.lineQuality.toFixed(4)),
                    lineSpeedAdjustment: Number(this.playerVehicle.cornerDemand.lineSpeedAdjustment.toFixed(3)),
                    overspeedRatio: Number(this.playerVehicle.cornerDemand.overspeedRatio.toFixed(4)),
                    safetyMarginRatio: Number(this.playerVehicle.cornerDemand.safetyMarginRatio.toFixed(4)),
                    severeOverspeedRatio: Number(this.playerVehicle.cornerDemand.severeOverspeedRatio.toFixed(4)),
                    speedOverBudget: Number(this.playerVehicle.cornerDemand.speedOverBudget.toFixed(3)),
                    speedLossZone: this.playerVehicle.cornerDemand.speedLossZone,
                    speedRatioToBudget: Number(this.playerVehicle.cornerDemand.speedRatioToBudget.toFixed(4)),
                    targetSpeed: Number(this.playerVehicle.cornerDemand.targetSpeed.toFixed(3)),
                    targetSpeedKmh: Number(getDisplaySpeedKmh(
                        this.playerVehicle.cornerDemand.targetSpeed,
                        PLAYER_ACCEL_SPEED,
                        ACTIVE_RUNTIME_VEHICLE.engineProfile,
                    ).toFixed(1)),
                },
                cornerSpeedLoss: {
                    counterRoadScrubForce: Number(this.playerVehicle.cornerSpeedLoss.counterRoadScrubForce.toFixed(3)),
                    downhillScrubForce: Number(this.playerVehicle.cornerSpeedLoss.downhillScrubForce.toFixed(3)),
                    lineSafetyScrubForce: Number(this.playerVehicle.cornerSpeedLoss.lineSafetyScrubForce.toFixed(3)),
                    overspeedTireScrubForce: Number(this.playerVehicle.cornerSpeedLoss.overspeedTireScrubForce.toFixed(3)),
                    severeOverspeedScrubForce: Number(this.playerVehicle.cornerSpeedLoss.severeOverspeedScrubForce.toFixed(3)),
                    steeringScrubForce: Number(this.playerVehicle.cornerSpeedLoss.steeringScrubForce.toFixed(3)),
                    totalForce: Number(this.playerVehicle.cornerSpeedLoss.totalForce.toFixed(3)),
                    trajectoryScrubRatio: Number(
                        this.playerVehicle.cornerSpeedLoss.trajectoryScrubRatio.toFixed(4),
                    ),
                    zone: this.playerVehicle.cornerSpeedLoss.zone,
                },
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
                speedHandling: {
                    centeringScale: Number(this.playerVehicle.speedHandling.centeringScale.toFixed(4)),
                    gripAngleCap: Number(this.playerVehicle.speedHandling.gripAngleCap.toFixed(4)),
                    inputResponseScale: Number(this.playerVehicle.speedHandling.inputResponseScale.toFixed(4)),
                    lateralAuthority: Number(this.playerVehicle.speedHandling.lateralAuthority.toFixed(4)),
                    lateralVelocityCap: Number(this.playerVehicle.speedHandling.lateralVelocityCap.toFixed(3)),
                    neutralReturnVelocityCap: Number(
                        this.playerVehicle.speedHandling.neutralReturnVelocityCap.toFixed(3),
                    ),
                    steeringForceScale: Number(this.playerVehicle.speedHandling.steeringForceScale.toFixed(4)),
                    steeringSlewRate: Number(this.playerVehicle.speedHandling.steeringSlewRate.toFixed(3)),
                    visualAuthority: Number(this.playerVehicle.speedHandling.visualAuthority.toFixed(4)),
                    visualYawScale: Number(this.playerVehicle.speedHandling.visualYawScale.toFixed(4)),
                },
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
            },
            qa: RUNTIME_QA,
            controller: PLAYER_CONTROLLER_CONFIG,
            road: this.roadStats,
            roadObjects: this.roadObjectStats,
            run: {
                ...this.runState,
                finishTimeSec: this.runState.finishTimeSec === null
                    ? null
                    : Number(this.runState.finishTimeSec.toFixed(3)),
                elapsedSec: Number(this.runState.elapsedSec.toFixed(3)),
                progressRatio: Number(this.runState.progressRatio.toFixed(4)),
            },
            speedEffect: {
                base: Number(this.speedEffectCue.base.toFixed(4)),
                downhill: Number(this.speedEffectCue.downhill.toFixed(4)),
                driftExitBurst: Number(this.speedEffectCue.driftExitBurst.toFixed(4)),
                expectedPeakAlpha: Number(getSpeedEffectExpectedPeakAlpha({
                    downhillIntensity: this.speedEffectCue.downhill,
                    eventIntensity: this.speedEffectCue.throttleBurst + this.speedEffectCue.driftExitBurst,
                    intensity: this.speedEffectIntensity,
                }).toFixed(4)),
                intensity: Number(this.speedEffectIntensity.toFixed(4)),
                throttleBurst: Number(this.speedEffectCue.throttleBurst.toFixed(4)),
                time: Number(this.speedEffectTime.toFixed(3)),
            },
            track: {
                id: this.roadTrack.id,
                length: this.roadTrack.length,
                name: this.roadTrack.name,
                segments: this.roadTrack.segments.length,
            },
            tuning: RUNTIME_TUNING,
            vehicle: {
                ...this.lastVehicleQaState,
                asset: ACTIVE_RUNTIME_VEHICLE.id,
                color: ACTIVE_RUNTIME_VEHICLE.color,
                engine: {
                    accelerationScale: ACTIVE_RUNTIME_VEHICLE.engineProfile.accelerationScale,
                    displayName: ACTIVE_RUNTIME_VEHICLE.engineProfile.displayName,
                    displayTopSpeedKmh: ACTIVE_RUNTIME_VEHICLE.engineProfile.displayTopSpeedKmh,
                    fuelCutStartRpm: ACTIVE_RUNTIME_VEHICLE.engineProfile.fuelCutStartRpm,
                    id: ACTIVE_RUNTIME_VEHICLE.engineProfile.id,
                    induction: ACTIVE_RUNTIME_VEHICLE.engineProfile.induction,
                    maxRpm: ACTIVE_RUNTIME_VEHICLE.engineProfile.maxRpm,
                    redlineStartRpm: ACTIVE_RUNTIME_VEHICLE.engineProfile.redlineStartRpm,
                },
            },
            viewport,
        };
    }
}

function createInitialRunState(): CourseRunState {
    return {
        elapsedSec: 0,
        finishTimeSec: null,
        finished: false,
        passedCheckpoints: 0,
        progressRatio: 0,
    };
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

type RuntimeVehicleAsset = {
    atlas: VehicleAtlas;
    color: string;
    engineProfile: VehicleEngineProfile;
    id: string;
    shadowSpriteUrl: string;
    shadowTextureKey: string;
    spriteUrl: string;
    textureKey: string;
};

function selectRuntimeVehicleAsset(params: URLSearchParams): RuntimeVehicleAsset {
    const requestedVehicle = params.get('vehicle') ?? 'ft86-retro';

    if (requestedVehicle === 'ft86-retro') {
        const requestedColor = params.get('vehicleColor') ?? 'blue';
        const color = FT86_RETRO_SPRITE_URLS[requestedColor] ? requestedColor : 'blue';

        return {
            atlas: ft86RetroVehicleAtlas as VehicleAtlas,
            color,
            engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
            id: 'ft86-retro',
            shadowSpriteUrl: ft86RetroShadowSpriteUrl,
            shadowTextureKey: 'player-vehicle-ft86-retro-shadow',
            spriteUrl: FT86_RETRO_SPRITE_URLS[color],
            textureKey: `player-vehicle-ft86-retro-${color}`,
        };
    }

    return {
        atlas: genesisG70VehicleAtlas as VehicleAtlas,
        color: 'silver',
        engineProfile: APEX_S_ENGINE_PROFILE,
        id: 'genesis-g70-poc',
        shadowSpriteUrl: genesisG70VehicleShadowSpriteUrl,
        shadowTextureKey: 'player-vehicle-genesis-g70-poc-shadow',
        spriteUrl: genesisG70VehicleSpriteUrl,
        textureKey: 'player-vehicle-genesis-g70-poc',
    };
}
