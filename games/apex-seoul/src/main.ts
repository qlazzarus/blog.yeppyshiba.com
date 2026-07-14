import Phaser from 'phaser';
import './styles.css';
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
    createHudText,
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
    getRoadWidthAtScreenY,
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
    updateRoadRelativeVehicleSize,
    type VehicleRoadScaleConfig,
} from './game/vehicleRoadScale';
import {
    createSpeedEffectShader,
    type SpeedEffectShaderUniforms,
} from './game/speedEffectShader';
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
const CAMERA_SPEED_FOV_BONUS = 5.2;
const DEBUG_PROJECTION_GUIDES = false;
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
const PLAYER_CRUISE_SPEED = 440;
const PLAYER_ACCEL_SPEED = 760;
const PLAYER_CORNER_ACCEL_SPEED_DROP = 140;
const PLAYER_CORNER_EASY_INTENSITY_THRESHOLD = 0.34;
const PLAYER_CORNER_EASY_SPEED_LOSS_SCALE = 0.35;
const PLAYER_CORNER_LINE_SPEED_BONUS = 70;
const PLAYER_CORNER_LINE_TARGET_OFFSET = 260;
const PLAYER_CORNER_SHARP_INTENSITY_THRESHOLD = 0.7;
const PLAYER_CORNER_SHARP_LINE_REWARD_SCALE = 1.35;
const PLAYER_CORNER_SHARP_SPEED_LOSS_SCALE = 1.18;
const PLAYER_CORNER_SPEED_PULL = 160;
const PLAYER_DOWNHILL_CORNER_BUDGET_MAX_REDUCTION = 0.08;
const PLAYER_DOWNHILL_CORNER_BUDGET_SLOPE_ACCELERATION = 65;
const PLAYER_DOWNHILL_CORNER_LATERAL_SCALE = 0.55;
const PLAYER_DOWNHILL_CORNER_OVERSPEED_SCRUB = 145;
const PLAYER_INPUT_RESPONSE = 18;
const PLAYER_LAUNCH_THROTTLE_FULL_SPEED_RATIO = 0.38;
const PLAYER_LAUNCH_THROTTLE_MIN_RATIO = 0.3;
const PLAYER_MAX_ROAD_OFFSET = 700;
const PLAYER_OVERSPEED_UNDERSTEER_MAX = 0.54;
const PLAYER_OVERSPEED_MEDIUM_UNDERSTEER_SCALE = 0.58;
const PLAYER_OVERSPEED_UNDERSTEER_MIN_STEER_INPUT = 0.18;
const PLAYER_OVERSPEED_SAFETY_MARGIN_START_RATIO = 0.16;
// A substantial exit cost should arrive well before the shoulder, so a fast
// grip line has to leave room for the corner rather than occupy all of it.
const PLAYER_OVERSPEED_SAFETY_MARGIN_FULL_RATIO = 0.32;
const PLAYER_OVERSPEED_SAFETY_MARGIN_SCRUB = 75;
const PLAYER_OVERSPEED_SHARP_LATERAL_SCALE = 1.55;
const PLAYER_OVERSPEED_SHARP_SPEED_SCRUB_SCALE = 1.35;
const PLAYER_OVERSPEED_SHARP_UNDERSTEER_SCALE = 1;
const PLAYER_OVERSPEED_UNDERSTEER_LATERAL_BUILD_RATE = 150;
const PLAYER_OVERSPEED_UNDERSTEER_LATERAL_MAX_SPEED = 76;
const PLAYER_OVERSPEED_UNDERSTEER_LATERAL_RECOVERY_RATE = 70;
const PLAYER_OVERSPEED_UNDERSTEER_RATIO_BUILD_RATE = 2.8;
const PLAYER_OVERSPEED_UNDERSTEER_RATIO_RECOVERY_RATE = 4.5;
const PLAYER_OVERSPEED_UNDERSTEER_SPEED_SCRUB = 28;
const PLAYER_OVERSPEED_UNDERSTEER_SPEED_WINDOW = 150;
const PLAYER_ROAD_ANCHOR_DISTANCE = 640;
const PLAYER_ROAD_CONTACT_DISTANCE = 260;
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
const PLAYER_CURVE_DRIFT_ACCELERATION = 160;
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
const PLAYER_DRIFT_SUSTAIN_ACCELERATION = 70;
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
const PLAYER_HIGH_SPEED_STEER_WEAK_THRESHOLD = 0.34;
const PLAYER_HIGH_SPEED_VISUAL_STEERING_SCALE = 0.62;
const PLAYER_STEERING_VELOCITY_CUE = 0.2;
const PLAYER_STEERING_SPEED_SCRUB = 64;
const PLAYER_STEERING_SPEED_SCRUB_THRESHOLD = 0.22;
const PLAYER_ENGINE_ACCELERATION = 170;
const PLAYER_ENGINE_BRAKE_DECELERATION = 26;
const PLAYER_ROLLING_RESISTANCE = 14;
const PLAYER_AERO_DRAG = 0.00012;
const PLAYER_GRAVITY_ACCELERATION = 360;
const PLAYER_MAX_SLOPE_ACCELERATION = 115;
const PLAYER_SLOPE_SAMPLE_DISTANCE = 720;
const PLAYER_RPM_IDLE = 1100;
const PLAYER_RPM_REDLINE = 7200;
const PLAYER_RPM_RESPONSE = 7;
const RUN_FINISH_COAST_SPEED = 0;
const SPEED_EFFECT_MAX_ALPHA = 0.88;
const SPEED_EFFECT_MIN_RATIO = 0.36;
const SPEED_EFFECT_TIME_SCALE = 2.2;
const TELEMETRY_DEFAULT_DURATION_SEC = 60;
const TELEMETRY_DEFAULT_SAMPLE_HZ = 10;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 760;
const FT86_RETRO_SPRITE_URLS: Record<string, string> = {
    black: ft86RetroBlackVehicleSpriteUrl,
    blue: ft86RetroBlueVehicleSpriteUrl,
    red: ft86RetroRedVehicleSpriteUrl,
    silver: ft86RetroSilverVehicleSpriteUrl,
    yellow: ft86RetroYellowVehicleSpriteUrl,
};

const URL_PARAMS = new URLSearchParams(window.location.search);
const ACTIVE_RUNTIME_VEHICLE = selectRuntimeVehicleAsset(URL_PARAMS);
const PLAYER_VEHICLE_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.textureKey;
const PLAYER_VEHICLE_SHADOW_TEXTURE_KEY = ACTIVE_RUNTIME_VEHICLE.shadowTextureKey;
const ACTIVE_ROAD_TRACK_ID = parseRoadTrackId(URL_PARAMS.get('track'));
const RUNTIME_TUNING: RuntimeTuning = createRuntimeTuning(URL_PARAMS, {
    cameraBaseFov: CAMERA_BASE_FOV,
    cameraSpeedFovBonus: CAMERA_SPEED_FOV_BONUS,
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
const RUNTIME_QA: RuntimeQaOverrides = createRuntimeQaOverrides(URL_PARAMS, {
    maxRoadOffset: PLAYER_MAX_ROAD_OFFSET,
    playerAccelSpeed: PLAYER_ACCEL_SPEED,
});
const RUNTIME_TELEMETRY: RuntimeTelemetryConfig = createRuntimeTelemetryConfig(URL_PARAMS, {
    durationSec: TELEMETRY_DEFAULT_DURATION_SEC,
    sampleHz: TELEMETRY_DEFAULT_SAMPLE_HZ,
});
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
    cornerAccelSpeedDrop: PLAYER_CORNER_ACCEL_SPEED_DROP,
    cornerEasyIntensityThreshold: PLAYER_CORNER_EASY_INTENSITY_THRESHOLD,
    cornerEasySpeedLossScale: PLAYER_CORNER_EASY_SPEED_LOSS_SCALE,
    cornerLineSpeedBonus: PLAYER_CORNER_LINE_SPEED_BONUS,
    cornerLineTargetOffset: PLAYER_CORNER_LINE_TARGET_OFFSET,
    cornerSharpIntensityThreshold: PLAYER_CORNER_SHARP_INTENSITY_THRESHOLD,
    cornerSharpLineRewardScale: PLAYER_CORNER_SHARP_LINE_REWARD_SCALE,
    cornerSharpSpeedLossScale: PLAYER_CORNER_SHARP_SPEED_LOSS_SCALE,
    cornerSpeedPull: PLAYER_CORNER_SPEED_PULL,
    downhillCornerBudgetMaxReduction: PLAYER_DOWNHILL_CORNER_BUDGET_MAX_REDUCTION,
    downhillCornerBudgetSlopeAcceleration: PLAYER_DOWNHILL_CORNER_BUDGET_SLOPE_ACCELERATION,
    downhillCornerLateralScale: PLAYER_DOWNHILL_CORNER_LATERAL_SCALE,
    downhillCornerOverspeedScrub: PLAYER_DOWNHILL_CORNER_OVERSPEED_SCRUB,
    curveDriftAcceleration: PLAYER_CURVE_DRIFT_ACCELERATION,
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
    overspeedMediumUndersteerScale: PLAYER_OVERSPEED_MEDIUM_UNDERSTEER_SCALE,
    overspeedUndersteerMinSteerInput: PLAYER_OVERSPEED_UNDERSTEER_MIN_STEER_INPUT,
    overspeedSafetyMarginStartRatio: PLAYER_OVERSPEED_SAFETY_MARGIN_START_RATIO,
    overspeedSafetyMarginFullRatio: PLAYER_OVERSPEED_SAFETY_MARGIN_FULL_RATIO,
    overspeedSafetyMarginScrub: PLAYER_OVERSPEED_SAFETY_MARGIN_SCRUB,
    overspeedSharpLateralScale: PLAYER_OVERSPEED_SHARP_LATERAL_SCALE,
    overspeedSharpSpeedScrubScale: PLAYER_OVERSPEED_SHARP_SPEED_SCRUB_SCALE,
    overspeedSharpUndersteerScale: PLAYER_OVERSPEED_SHARP_UNDERSTEER_SCALE,
    overspeedUndersteerLateralBuildRate: PLAYER_OVERSPEED_UNDERSTEER_LATERAL_BUILD_RATE,
    overspeedUndersteerLateralMaxSpeed: PLAYER_OVERSPEED_UNDERSTEER_LATERAL_MAX_SPEED,
    overspeedUndersteerLateralRecoveryRate: PLAYER_OVERSPEED_UNDERSTEER_LATERAL_RECOVERY_RATE,
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
    roadRelativeScale: number;
    roadRelativeTargetSize: number;
    roadWidthAtVehicleY: number | null;
};

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
    private keys!: Record<'a' | 'd' | 'e' | 'l' | 'q' | 'r' | 's' | 'space' | 'w', Phaser.Input.Keyboard.Key>;
    private elapsedSec = 0;
    private lastVehicleQaState: RuntimeVehicleQaState | null = null;
    private roadRelativeVehicleSize: number | null = null;
    private vehicleRenderState: PlayerVehicleRenderState | null = null;
    private lastVehicleSizeSample: { elapsedSec: number; size: number } | null = null;
    private playerCar!: Phaser.GameObjects.Image;
    private playerSoftShadowCar!: Phaser.GameObjects.Image;
    private playerShadowCar!: Phaser.GameObjects.Image;
    private playerVehicle: PlayerVehicleState = createDefaultPlayerVehicleState(
        PLAYER_CRUISE_SPEED,
        ACTIVE_RUNTIME_VEHICLE.engineProfile,
        PLAYER_ACCEL_SPEED,
    );
    private roadObjects: RoadObject[] = [];
    private roadObjectStats: RoadObjectRenderStats | null = null;
    private roadStats: RoadRenderStats | null = null;
    private roadTrack: RoadTrack = createRoadTrack(ACTIVE_ROAD_TRACK_ID);
    private speedEffectIntensity = 0;
    private speedEffectShader!: Phaser.GameObjects.Shader;
    private speedEffectTime = 0;
    private telemetry: RuntimeTelemetryRecorder | null = null;
    private runState: CourseRunState = createInitialRunState();

    constructor() {
        super('apex-seoul');
    }

    preload() {
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
        this.cameraResource.fovDegrees = RUNTIME_TUNING.cameraBaseFov;
        this.roadObjects = createRoadObjects(this.roadTrack);
        this.applyRuntimeQaOverrides();
        this.cameras.main.setBackgroundColor('#050812');
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
        this.speedEffectShader = createSpeedEffectShader(
            this,
            this.getViewport(),
            () => this.getSpeedEffectShaderUniforms(),
        );
        this.hudText = createHudText(this);

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = {
            a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
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

        this.scale.on('resize', this.render, this);
        this.render();
    }

    update(_time: number, delta: number) {
        const seconds = delta / 1000;
        const camera = this.cameraResource;

        this.elapsedSec += seconds;
        this.applyRuntimeQaOverrides();
        this.updateTelemetryHotkey();
        this.updateRestartHotkey();

        if (RUNTIME_QA.freeze) {
            camera.pitch = this.updateCameraPitch(seconds);
            camera.fovDegrees = this.updateCameraFov(seconds);
            this.updateSpeedEffect(seconds);
            this.render();
            this.telemetry?.update(this.elapsedSec);
            return;
        }

        if (this.runState.finished) {
            this.playerVehicle.speed = RUN_FINISH_COAST_SPEED;
            camera.pitch = this.updateCameraPitch(seconds);
            camera.fovDegrees = this.updateCameraFov(seconds);
            this.updateSpeedEffect(seconds);
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
        camera.z = Math.min(
            camera.z + this.playerVehicle.speed * seconds,
            this.roadTrack.length,
        );
        this.updateRunState(seconds);
        camera.pitch = this.updateCameraPitch(seconds);
        camera.fovDegrees = this.updateCameraFov(seconds);
        this.updateSpeedEffect(seconds);
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
        this.vehicleRenderState = null;
        const vehicleRenderState = this.getPlayerVehicleRenderState(viewport);
        this.renderPlayerShadow(viewport, vehicleRenderState);
        this.renderPlayerVehicle(viewport, vehicleRenderState);
        this.renderCourseProgress(viewport);
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
        this.graphics.fillStyle(0x07101f, 1);
        this.graphics.fillRect(0, 0, viewport.width, Math.max(0, horizonY));
        this.graphics.fillStyle(0x14395f, 0.78);
        this.graphics.fillRect(0, Math.max(0, horizonY - 42), viewport.width, 18);
        this.graphics.fillStyle(0x3f7dd7, 0.32);
        this.graphics.fillRect(0, horizonY - 16, viewport.width, 2);
        this.graphics.fillStyle(0x081520, 1);
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
                ? 'Up: accel | Space: brake | Left/Right: steer | R: restart | WASD: camera | Q/E: pitch'
                : 'Up: accel | Space: brake | Left/Right: steer | R: restart | debug camera locked',
            cornerIntensity: getCornerIntensity(stats?.currentCurve ?? 0),
            player,
            qa: RUNTIME_QA,
            roadStats: stats,
            slopeAcceleration: this.getSlopeAcceleration(),
            speedKmh: this.getPlayerSpeedKmh(),
            steeringRatio: getHighSpeedSteeringRatio(
                Phaser.Math.Clamp(player.speed / PLAYER_ACCEL_SPEED, 0, 1),
                PLAYER_CONTROLLER_CONFIG.highSpeedSteerVisualDrop,
            ),
            telemetry: RUNTIME_TELEMETRY,
            telemetryEventCount: this.telemetry?.getEventCount() ?? 0,
            track: this.roadTrack,
            tuning: RUNTIME_TUNING,
            vehicleTerrainCue: this.getVehicleTerrainCue(),
            run: this.runState,
        });
    }

    private updatePlayerVehicle(seconds: number) {
        updatePlayerVehicle(
            this.playerVehicle,
            {
                accelPressed: this.cursors.up.isDown,
                brakePressed: this.keys.space.isDown,
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

    private getPlayerVehicleRenderState(viewport: Viewport): PlayerVehicleRenderState {
        if (this.vehicleRenderState) return this.vehicleRenderState;

        const baseSize = getPlayerVehicleSpriteSize(viewport, RUNTIME_TUNING);
        const anchor = this.getVehicleAnchor(viewport, baseSize);
        const roadWidthAtVehicleY = getRoadWidthAtScreenY(
            this.roadTrack,
            this.cameraResource,
            viewport,
            anchor.y,
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
            roadWidthAtVehicleY,
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

        this.roadRelativeVehicleSize = roadRelativeSize;
        this.vehicleRenderState = {
            anchor,
            displaySize: getTerrainScaledSpriteSize(roadRelativeSize, anchor, RUNTIME_TUNING),
            roadRelativeScale: roadRelativeSize / baseSize,
            roadRelativeTargetSize,
            roadWidthAtVehicleY,
        };

        return this.vehicleRenderState;
    }

    private renderPlayerVehicle(viewport: Viewport, renderState: PlayerVehicleRenderState) {
        const player = this.playerVehicle;
        const { anchor, displaySize, roadRelativeScale, roadRelativeTargetSize, roadWidthAtVehicleY } = renderState;
        const previousSizeSample = this.lastVehicleSizeSample;
        const elapsedSinceLastSizeSample = previousSizeSample
            ? this.elapsedSec - previousSizeSample.elapsedSec
            : 0;
        const sizeDeltaPerSec = elapsedSinceLastSizeSample > 0.0001
            ? (displaySize - previousSizeSample.size) / elapsedSinceLastSizeSample
            : 0;
        const vehicleBodyWidth = displaySize;
        const visualSteering = this.getVehicleVisualSteeringState();
        const vehicleFrame = selectPlayerVehicleFrame(
            PLAYER_VEHICLE_ATLAS,
            RUNTIME_TUNING,
            visualSteering.value,
            anchor.terrainCue,
            visualSteering.threshold,
        );
        const frame = PLAYER_VEHICLE_ATLAS.frames[vehicleFrame.frame];

        this.playerCar
            .setTexture(PLAYER_VEHICLE_TEXTURE_KEY, getVehicleFrameIndex(PLAYER_VEHICLE_ATLAS, vehicleFrame.frame))
            .setFlipX(vehicleFrame.flipX)
            .setOrigin(frame.origin.x, frame.origin.y)
            .setPosition(anchor.x, anchor.y)
            .setDisplaySize(displaySize, displaySize)
            .setRotation(Phaser.Math.DegToRad(
                visualSteering.rotationValue * RUNTIME_TUNING.vehicleRotationDeg,
            ));

        this.lastVehicleQaState = {
            anchor,
            displaySize,
            flipX: vehicleFrame.flipX,
            frame: vehicleFrame.frame,
            physicalSteering: visualSteering.physicalValue,
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
        };
        this.lastVehicleSizeSample = { elapsedSec: this.elapsedSec, size: displaySize };
    }

    private renderPlayerShadow(_viewport: Viewport, renderState: PlayerVehicleRenderState) {
        const { anchor, displaySize } = renderState;
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const terrainIntensity = getContactTerrainCueIntensity(anchor.contactTerrainRatio);
        const visualSteering = this.getVehicleVisualSteeringState();
        const vehicleFrame = selectPlayerVehicleFrame(
            PLAYER_VEHICLE_ATLAS,
            RUNTIME_TUNING,
            visualSteering.value,
            anchor.terrainCue,
            visualSteering.threshold,
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
        const steeringOffset = visualSteering.value * displaySize * 0.018;
        const driftShadowScale = 1 + this.playerVehicle.driftRatio * 0.18;
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
                displaySize * silhouetteScale.x * 1.16 * driftShadowScale,
                displaySize * silhouetteScale.y * 1.26,
            )
            .setRotation(Phaser.Math.DegToRad(
                visualSteering.value * RUNTIME_TUNING.vehicleRotationDeg * 0.22 + this.playerVehicle.slipAngle * 0.32,
            ));

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
                displaySize * silhouetteScale.x * driftShadowScale,
                displaySize * silhouetteScale.y,
            )
            .setRotation(Phaser.Math.DegToRad(
                visualSteering.value * RUNTIME_TUNING.vehicleRotationDeg * 0.35 + this.playerVehicle.slipAngle * 0.45,
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
        const rawSpeedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const speedRatio = rawSpeedRatio * rawSpeedRatio * (3 - 2 * rawSpeedRatio);
        const targetFov = RUNTIME_TUNING.cameraBaseFov + speedRatio * RUNTIME_TUNING.cameraSpeedFovBonus;
        const fovBlend = 1 - Math.exp(-CAMERA_FOV_RESPONSE * seconds);

        this.cameraFov = Phaser.Math.Linear(this.cameraFov, targetFov, fovBlend);

        return this.cameraFov;
    }

    private getPlayerSpeedKmh() {
        return getDisplaySpeedKmh(
            this.playerVehicle.speed,
            PLAYER_ACCEL_SPEED,
            ACTIVE_RUNTIME_VEHICLE.engineProfile,
        );
    }

    private getVehicleVisualSteeringState() {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const smoothSpeed = speedRatio * speedRatio * (3 - 2 * speedRatio);
        const visualScale = Phaser.Math.Linear(
            1,
            RUNTIME_TUNING.highSpeedVisualSteeringScale,
            smoothSpeed,
        );
        const threshold = Phaser.Math.Linear(
            RUNTIME_TUNING.steerWeakThreshold,
            RUNTIME_TUNING.highSpeedSteerWeakThreshold,
            smoothSpeed,
        );

        const physicalValue = this.playerVehicle.steering * visualScale;
        const player = this.playerVehicle;
        const isSliding = player.driftState !== 'grip' && player.driftDirection !== 0;

        if (!isSliding) {
            return {
                physicalValue,
                rotationValue: physicalValue,
                threshold,
                value: physicalValue,
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

        return {
            physicalValue,
            rotationValue: 0,
            threshold,
            value: player.driftDirection * trimmedYawStrength,
        };
    }

    private updateSpeedEffect(seconds: number) {
        const speedRatio = Phaser.Math.Clamp(this.playerVehicle.speed / PLAYER_ACCEL_SPEED, 0, 1);
        const targetIntensity = Phaser.Math.Clamp(
            (speedRatio - SPEED_EFFECT_MIN_RATIO) / (1 - SPEED_EFFECT_MIN_RATIO),
            0,
            1,
        );
        const smoothIntensity = targetIntensity * targetIntensity * (3 - 2 * targetIntensity);

        this.speedEffectIntensity = Phaser.Math.Linear(
            this.speedEffectIntensity,
            smoothIntensity * SPEED_EFFECT_MAX_ALPHA,
            1 - Math.exp(-5.5 * seconds),
        );
        this.speedEffectTime += seconds * Phaser.Math.Linear(0.4, SPEED_EFFECT_TIME_SCALE, speedRatio);
    }

    private getSpeedEffectShaderUniforms(): SpeedEffectShaderUniforms {
        const viewport = this.getViewport();

        return {
            horizonY: getHorizonY(this.cameraResource, viewport),
            intensity: this.speedEffectIntensity,
            time: this.speedEffectTime,
            viewport,
        };
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
        this.cameraResource.z = 0;
        this.cameraFov = RUNTIME_TUNING.cameraBaseFov;
        this.cameraTerrainPitch = 0;
        this.cameraManualPitch = 0;
        this.playerVehicle = createDefaultPlayerVehicleState(
            PLAYER_CRUISE_SPEED,
            ACTIVE_RUNTIME_VEHICLE.engineProfile,
            PLAYER_ACCEL_SPEED,
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

        this.graphics.fillStyle(0x050812, 0.74);
        this.graphics.fillRect(marginX - 12, lineY - 12, lineWidth + 24, 24);
        this.graphics.fillStyle(0x14395f, 0.9);
        this.graphics.fillRect(marginX, lineY - lineHeight / 2, lineWidth, lineHeight);
        this.graphics.fillStyle(0x67b7ff, 0.95);
        this.graphics.fillRect(marginX, lineY - lineHeight / 2, lineWidth * progress, lineHeight);

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

        this.graphics.fillStyle(0xe8f6ff, 1);
        this.graphics.fillCircle(progressX, lineY, 6);
        this.graphics.lineStyle(2, 0x050812, 0.9);
        this.graphics.strokeCircle(progressX, lineY, 7);
    }

    private drawProgressTick(x: number, y: number, color: number, alpha: number) {
        this.graphics.fillStyle(color, alpha);
        this.graphics.fillRect(x - 2, y - 10, 4, 20);
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
            input: {
                accelPressed: this.cursors.up.isDown,
                brakePressed: this.keys.space.isDown,
                steerAxis: getAxis(this.cursors.right.isDown, this.cursors.left.isDown),
            },
            player: {
                boostRatio: Number(this.playerVehicle.boostRatio.toFixed(4)),
                brakePressure: Number(this.playerVehicle.brakePressure.toFixed(4)),
                cornerGrade: this.playerVehicle.cornerGrade,
                cornerLineQuality: Number(this.playerVehicle.cornerLineQuality.toFixed(4)),
                cornerSafetyMarginRatio: Number(this.playerVehicle.cornerSafetyMarginRatio.toFixed(4)),
                cornerSpeedBudget: Number(this.playerVehicle.cornerSpeedBudget.toFixed(3)),
                cornerSpeedBudgetKmh: Number(getDisplaySpeedKmh(
                    this.playerVehicle.cornerSpeedBudget,
                    PLAYER_ACCEL_SPEED,
                    ACTIVE_RUNTIME_VEHICLE.engineProfile,
                ).toFixed(1)),
                cornerSpeedOverBudget: Number(this.playerVehicle.cornerSpeedOverBudget.toFixed(3)),
                counterSteerTimer: Number(this.playerVehicle.counterSteerTimer.toFixed(3)),
                counterSteerLateralVelocity: Number(this.playerVehicle.counterSteerLateralVelocity.toFixed(3)),
                counterSteerEntryDriftVelocity: Number(this.playerVehicle.counterSteerEntryDriftVelocity.toFixed(3)),
                counterTrimRatio: Number(this.playerVehicle.counterTrimRatio.toFixed(4)),
                downhillCornerCarryRatio: Number(this.playerVehicle.downhillCornerCarryRatio.toFixed(4)),
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
                gripCounterRoadLateralVelocity: Number(this.playerVehicle.gripCounterRoadLateralVelocity.toFixed(3)),
                gripCounterRoadRatio: Number(this.playerVehicle.gripCounterRoadRatio.toFixed(4)),
                gripSteerAngleLimit: Number(this.playerVehicle.gripSteerAngleLimit.toFixed(4)),
                lateralOffset: this.playerVehicle.lateralOffset,
                centeringCounterHoldTimer: Number(this.playerVehicle.centeringCounterHoldTimer.toFixed(3)),
                centeringForce: Number(this.playerVehicle.centeringForce.toFixed(3)),
                centeringReleaseStartScale: Number(this.playerVehicle.centeringReleaseStartScale.toFixed(3)),
                centeringReleaseTimer: Number(this.playerVehicle.centeringReleaseTimer.toFixed(3)),
                lateralCenteringScale: Number(this.playerVehicle.lateralCenteringScale.toFixed(3)),
                lateralCenteringTargetScale: Number(this.playerVehicle.lateralCenteringTargetScale.toFixed(3)),
                roadOffsetRatio: Number((this.playerVehicle.lateralOffset / PLAYER_MAX_ROAD_OFFSET).toFixed(4)),
                overspeedUndersteerLateralVelocity: Number(this.playerVehicle.overspeedUndersteerLateralVelocity.toFixed(3)),
                overspeedUndersteerRatio: Number(this.playerVehicle.overspeedUndersteerRatio.toFixed(4)),
                overspeedUndersteerTargetRatio: Number(this.playerVehicle.overspeedUndersteerTargetRatio.toFixed(4)),
                rpm: this.playerVehicle.rpm,
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
                intensity: Number(this.speedEffectIntensity.toFixed(4)),
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
