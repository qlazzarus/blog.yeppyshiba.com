import Phaser from 'phaser';
import type { PlayerVehicleControllerConfig } from './playerVehicleController';

export type RuntimeTuning = {
    cameraBaseFov: number;
    cameraShakeDriftExitX: number;
    cameraShakeDriftExitY: number;
    cameraShakeFrequency: number;
    cameraShakeScale: number;
    cameraShakeThrottleX: number;
    cameraShakeThrottleY: number;
    cameraSpeedFovBonus: number;
    curveScreenBias: number;
    debugProjectionGuides: boolean;
    highSpeedSteerWeakThreshold: number;
    highSpeedVisualSteeringScale: number;
    playerRoadAnchorDistance: number;
    playerRoadContactDistance: number;
    playerScreenAnchorRatio: number;
    playerContactTerrainCueThreshold: number;
    steerWeakThreshold: number;
    terrainCueThreshold: number;
    terrainScaleIntensity: number;
    vehicleMaxSize: number;
    vehicleMinSize: number;
    vehicleRoadScaleDeadZoneRatio: number;
    vehicleRoadScaleMax: number;
    vehicleRoadScaleMin: number;
    vehicleRoadScaleResponseSeconds: number;
    vehicleRoadTargetRatio: number;
    vehicleRotationDeg: number;
    vehicleViewportRatio: number;
};

export type RuntimeTuningDefaults = RuntimeTuning;

export type RuntimeQaOverrides = {
    enabled: boolean;
    freeze: boolean;
    lateralOffset: number | null;
    speed: number | null;
    steering: number | null;
    z: number | null;
};

export type RuntimeQaDefaults = {
    maxRoadOffset: number;
    playerAccelSpeed: number;
};

export type RuntimeTelemetryConfig = {
    autoExport: boolean;
    durationSec: number;
    enabled: boolean;
    sampleHz: number;
};

export type RuntimeTelemetryDefaults = {
    durationSec: number;
    sampleHz: number;
};

export type RuntimePlayerVehicleConfigDefaults = PlayerVehicleControllerConfig;

export function createRuntimeTuning(
    params: URLSearchParams,
    defaults: RuntimeTuningDefaults,
): RuntimeTuning {
    const weakThreshold = readTuningNumber(
        params,
        'steerWeak',
        defaults.steerWeakThreshold,
        0.05,
        0.45,
    );

    return {
        cameraBaseFov: readTuningNumber(params, 'fov', defaults.cameraBaseFov, 58, 82),
        cameraShakeDriftExitX: readTuningNumber(
            params,
            'cameraShakeDriftX',
            defaults.cameraShakeDriftExitX,
            0,
            3,
        ),
        cameraShakeDriftExitY: readTuningNumber(
            params,
            'cameraShakeDriftY',
            defaults.cameraShakeDriftExitY,
            0,
            1.5,
        ),
        cameraShakeFrequency: readTuningNumber(
            params,
            'cameraShakeHz',
            defaults.cameraShakeFrequency,
            8,
            60,
        ),
        cameraShakeScale: readTuningNumber(params, 'cameraShake', defaults.cameraShakeScale, 0, 1),
        cameraShakeThrottleX: readTuningNumber(
            params,
            'cameraShakeThrottleX',
            defaults.cameraShakeThrottleX,
            0,
            2,
        ),
        cameraShakeThrottleY: readTuningNumber(
            params,
            'cameraShakeThrottleY',
            defaults.cameraShakeThrottleY,
            0,
            1,
        ),
        cameraSpeedFovBonus: readTuningNumber(
            params,
            'fovBonus',
            defaults.cameraSpeedFovBonus,
            0,
            8,
        ),
        curveScreenBias: readTuningNumber(
            params,
            'curveCarBias',
            defaults.curveScreenBias,
            0,
            96,
        ),
        debugProjectionGuides: readBooleanParam(
            params,
            'debugGuides',
            defaults.debugProjectionGuides,
        ),
        highSpeedSteerWeakThreshold: readTuningNumber(
            params,
            'highSteerWeak',
            defaults.highSpeedSteerWeakThreshold,
            defaults.steerWeakThreshold,
            0.65,
        ),
        highSpeedVisualSteeringScale: readTuningNumber(
            params,
            'visualSteerScale',
            defaults.highSpeedVisualSteeringScale,
            0.25,
            1,
        ),
        playerRoadAnchorDistance: readTuningNumber(
            params,
            'anchorZ',
            defaults.playerRoadAnchorDistance,
            420,
            900,
        ),
        playerRoadContactDistance: readTuningNumber(
            params,
            'contactZ',
            defaults.playerRoadContactDistance,
            120,
            520,
        ),
        playerContactTerrainCueThreshold: readTuningNumber(
            params,
            'contactCueThreshold',
            defaults.playerContactTerrainCueThreshold,
            3,
            48,
        ),
        playerScreenAnchorRatio: readTuningNumber(
            params,
            'anchorY',
            defaults.playerScreenAnchorRatio,
            0.82,
            0.94,
        ),
        steerWeakThreshold: weakThreshold,
        terrainCueThreshold: readTuningNumber(
            params,
            'terrainThreshold',
            defaults.terrainCueThreshold,
            4,
            80,
        ),
        terrainScaleIntensity: readTuningNumber(
            params,
            'terrainScale',
            defaults.terrainScaleIntensity,
            0,
            0.09,
        ),
        vehicleMaxSize: readTuningNumber(params, 'carMax', defaults.vehicleMaxSize, 160, 520),
        vehicleMinSize: readTuningNumber(params, 'carMin', defaults.vehicleMinSize, 120, 420),
        vehicleRoadScaleDeadZoneRatio: readTuningNumber(
            params,
            'carRoadDeadZone',
            defaults.vehicleRoadScaleDeadZoneRatio,
            0,
            0.08,
        ),
        vehicleRoadScaleMax: readTuningNumber(
            params,
            'carRoadMaxScale',
            defaults.vehicleRoadScaleMax,
            1,
            1.25,
        ),
        vehicleRoadScaleMin: readTuningNumber(
            params,
            'carRoadMinScale',
            defaults.vehicleRoadScaleMin,
            0.75,
            1,
        ),
        vehicleRoadScaleResponseSeconds: readTuningNumber(
            params,
            'carRoadResponse',
            defaults.vehicleRoadScaleResponseSeconds,
            0.1,
            2,
        ),
        vehicleRoadTargetRatio: readTuningNumber(
            params,
            'carRoadRatio',
            defaults.vehicleRoadTargetRatio,
            0.35,
            0.75,
        ),
        vehicleRotationDeg: readTuningNumber(
            params,
            'carRoll',
            defaults.vehicleRotationDeg,
            0,
            8,
        ),
        vehicleViewportRatio: readTuningNumber(
            params,
            'carScale',
            defaults.vehicleViewportRatio,
            0.2,
            0.48,
        ),
    };
}

export function createRuntimeQaOverrides(
    params: URLSearchParams,
    defaults: RuntimeQaDefaults,
): RuntimeQaOverrides {
    const freeze = readBooleanParam(params, 'qaFreeze', false);
    const steering = readOptionalTuningNumber(params, 'qaSteer', -1, 1);
    const speed = readOptionalTuningNumber(params, 'qaSpeed', 0, defaults.playerAccelSpeed);
    const z = readOptionalTuningNumber(params, 'qaZ', 0, Number.MAX_SAFE_INTEGER);
    const lateralOffset = readOptionalTuningNumber(
        params,
        'qaOffset',
        -defaults.maxRoadOffset,
        defaults.maxRoadOffset,
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

export function createRuntimeTelemetryConfig(
    params: URLSearchParams,
    defaults: RuntimeTelemetryDefaults,
): RuntimeTelemetryConfig {
    const enabled = readBooleanParam(params, 'telemetry', false);

    return {
        autoExport: enabled && readBooleanParam(params, 'telemetryAutoExport', true),
        durationSec: readTuningNumber(
            params,
            'telemetryDuration',
            defaults.durationSec,
            1,
            1800,
        ),
        enabled,
        sampleHz: readTuningNumber(
            params,
            'telemetryHz',
            defaults.sampleHz,
            1,
            60,
        ),
    };
}

export function createRuntimePlayerVehicleConfig(
    params: URLSearchParams,
    defaults: RuntimePlayerVehicleConfigDefaults,
): PlayerVehicleControllerConfig {
    return {
        accelSpeed: readTuningNumber(params, 'accelSpeed', defaults.accelSpeed, 360, 1100),
        aeroDrag: readTuningNumber(params, 'aeroDrag', defaults.aeroDrag, 0, 0.001),
        brakeSpeed: defaults.brakeSpeed,
        braking: readTuningNumber(params, 'braking', defaults.braking, 80, 720),
        brakeReleaseResponse: readTuningNumber(
            params,
            'brakeReleaseResponse',
            defaults.brakeReleaseResponse,
            2,
            30,
        ),
        brakeResponse: readTuningNumber(
            params,
            'brakeResponse',
            defaults.brakeResponse,
            2,
            30,
        ),
        centeringResponse: readTuningNumber(
            params,
            'centeringResponse',
            defaults.centeringResponse,
            0.2,
            6,
        ),
        centeringCounterHoldDuration: readTuningNumber(
            params,
            'centeringCounterHoldDuration',
            defaults.centeringCounterHoldDuration,
            0.04,
            0.4,
        ),
        centeringCounterStartScale: readTuningNumber(
            params,
            'centeringCounterStartScale',
            defaults.centeringCounterStartScale,
            0,
            1,
        ),
        centeringInputHoldScale: readTuningNumber(
            params,
            'centeringHoldScale',
            defaults.centeringInputHoldScale,
            0,
            1,
        ),
        centeringNeutralInwardVelocityCap: readTuningNumber(
            params,
            'centeringNeutralInwardVelocityCap',
            defaults.centeringNeutralInwardVelocityCap,
            4,
            80,
        ),
        centeringReleaseDelay: readTuningNumber(
            params,
            'centeringReleaseDelay',
            defaults.centeringReleaseDelay,
            0,
            0.6,
        ),
        centeringReleaseScaleResponse: readTuningNumber(
            params,
            'centeringReleaseScaleResponse',
            defaults.centeringReleaseScaleResponse,
            0.05,
            4,
        ),
        centeringReleaseScale: readTuningNumber(
            params,
            'centeringReleaseScale',
            defaults.centeringReleaseScale,
            0,
            1,
        ),
        centeringScaleResponse: readTuningNumber(
            params,
            'centeringScaleResponse',
            defaults.centeringScaleResponse,
            0.5,
            16,
        ),
        cornerAccelSpeedDrop: readTuningNumber(
            params,
            'cornerAccelDrop',
            defaults.cornerAccelSpeedDrop,
            0,
            280,
        ),
        cornerEasyIntensityThreshold: readTuningNumber(
            params,
            'cornerEasyThreshold',
            defaults.cornerEasyIntensityThreshold,
            0.12,
            0.55,
        ),
        cornerEasySpeedLossScale: readTuningNumber(
            params,
            'cornerEasyLossScale',
            defaults.cornerEasySpeedLossScale,
            0.1,
            1,
        ),
        cornerLineSpeedBonus: readTuningNumber(
            params,
            'cornerLineBonus',
            defaults.cornerLineSpeedBonus,
            0,
            140,
        ),
        cornerSharpIntensityThreshold: readTuningNumber(
            params,
            'cornerSharpThreshold',
            defaults.cornerSharpIntensityThreshold,
            0.45,
            0.95,
        ),
        cornerSharpLineRewardScale: readTuningNumber(
            params,
            'cornerSharpLineScale',
            defaults.cornerSharpLineRewardScale,
            0.8,
            2,
        ),
        cornerSharpSpeedLossScale: readTuningNumber(
            params,
            'cornerSharpLossScale',
            defaults.cornerSharpSpeedLossScale,
            1,
            2,
        ),
        cornerLineTargetOffset: readTuningNumber(
            params,
            'cornerLineTarget',
            defaults.cornerLineTargetOffset,
            80,
            520,
        ),
        cornerSpeedPull: readTuningNumber(
            params,
            'cornerPull',
            defaults.cornerSpeedPull,
            0,
            360,
        ),
        downhillCornerBudgetMaxReduction: readTuningNumber(
            params,
            'downhillCornerBudgetReduction',
            defaults.downhillCornerBudgetMaxReduction,
            0,
            0.2,
        ),
        downhillCornerBudgetSlopeAcceleration: readTuningNumber(
            params,
            'downhillCornerBudgetSlope',
            defaults.downhillCornerBudgetSlopeAcceleration,
            10,
            140,
        ),
        downhillCornerLateralScale: readTuningNumber(
            params,
            'downhillCornerLateralScale',
            defaults.downhillCornerLateralScale,
            0,
            1.5,
        ),
        downhillCornerOverspeedScrub: readTuningNumber(
            params,
            'downhillCornerOverspeedScrub',
            defaults.downhillCornerOverspeedScrub,
            0,
            260,
        ),
        curveDriftAcceleration: readTuningNumber(
            params,
            'curveDrift',
            defaults.curveDriftAcceleration,
            0,
            520,
        ),
        curveSteeringHighSpeedDrop: readTuningNumber(
            params,
            'curveCueDrop',
            defaults.curveSteeringHighSpeedDrop,
            0,
            0.7,
        ),
        curveSteeringCue: readTuningNumber(
            params,
            'curveSteeringCue',
            defaults.curveSteeringCue,
            0,
            0.3,
        ),
        driftBuildRate: readTuningNumber(params, 'driftBuild', defaults.driftBuildRate, 0.4, 8),
        driftDecayRate: readTuningNumber(params, 'driftDecay', defaults.driftDecayRate, 0.4, 8),
        driftEntrySpeedLoss: readTuningNumber(
            params,
            'driftEntryLoss',
            defaults.driftEntrySpeedLoss,
            0,
            180,
        ),
        driftEntryLateralKick: readTuningNumber(
            params,
            'driftEntryKick',
            defaults.driftEntryLateralKick,
            80,
            520,
        ),
        driftBreakawayDuration: readTuningNumber(
            params,
            'driftBreakawayDuration',
            defaults.driftBreakawayDuration,
            0.08,
            0.6,
        ),
        driftBrakeEntryPressure: readTuningNumber(
            params,
            'driftBrakeEntryPressure',
            defaults.driftBrakeEntryPressure,
            0.3,
            0.95,
        ),
        driftBrakeEntrySpeedLoss: readTuningNumber(
            params,
            'driftBrakeEntryLoss',
            defaults.driftBrakeEntrySpeedLoss,
            0,
            80,
        ),
        driftLiftEntrySpeedLoss: readTuningNumber(
            params,
            'driftLiftEntryLoss',
            defaults.driftLiftEntrySpeedLoss,
            0,
            100,
        ),
        driftEasyEntrySpeedLossScale: readTuningNumber(
            params,
            'driftEasyEntryScale',
            defaults.driftEasyEntrySpeedLossScale,
            0.2,
            1,
        ),
        driftSharpEntrySpeedLossScale: readTuningNumber(
            params,
            'driftSharpEntryScale',
            defaults.driftSharpEntrySpeedLossScale,
            1,
            2,
        ),
        driftOutsideLineOverspeedPull: readTuningNumber(
            params,
            'driftOutsidePull',
            defaults.driftOutsideLineOverspeedPull,
            0,
            2,
        ),
        driftOutsideLineScrubScale: readTuningNumber(
            params,
            'driftOutsideScrub',
            defaults.driftOutsideLineScrubScale,
            0,
            2,
        ),
        driftExitReaccelDelay: readTuningNumber(
            params,
            'driftExitDelay',
            defaults.driftExitReaccelDelay,
            0,
            0.6,
        ),
        driftThrottleGraceDuration: readTuningNumber(
            params,
            'driftThrottleGrace',
            defaults.driftThrottleGraceDuration,
            0.05,
            0.5,
        ),
        driftThrottleLiftRatio: readTuningNumber(
            params,
            'driftThrottleLiftRatio',
            defaults.driftThrottleLiftRatio,
            0.2,
            0.7,
        ),
        driftCounterNeutralDuration: readTuningNumber(
            params,
            'driftCounterNeutralDuration',
            defaults.driftCounterNeutralDuration,
            0,
            0.3,
        ),
        driftLateralDamping: readTuningNumber(
            params,
            'driftLateralDamping',
            defaults.driftLateralDamping,
            0.2,
            8,
        ),
        driftLateralMaxSpeed: readTuningNumber(
            params,
            'driftLateralCap',
            defaults.driftLateralMaxSpeed,
            80,
            600,
        ),
        driftCounterSteerLateralScale: readTuningNumber(
            params,
            'driftCounterSteerScale',
            defaults.driftCounterSteerLateralScale,
            0.1,
            1,
        ),
        driftCounterSteerLateralSustainScale: readTuningNumber(
            params,
            'driftCounterSteerSustainScale',
            defaults.driftCounterSteerLateralSustainScale,
            0.1,
            1,
        ),
        driftCounterSteerLateralVelocityCap: readTuningNumber(
            params,
            'driftCounterSteerCap',
            defaults.driftCounterSteerLateralVelocityCap,
            12,
            120,
        ),
        driftCounterTrimDuration: readTuningNumber(
            params,
            'driftCounterTrimDuration',
            defaults.driftCounterTrimDuration,
            0.12,
            1.2,
        ),
        driftCounterTrimMaxRatio: readTuningNumber(
            params,
            'driftCounterTrimMax',
            defaults.driftCounterTrimMaxRatio,
            0.1,
            0.95,
        ),
        driftCounterTrimResponse: readTuningNumber(
            params,
            'driftCounterTrimResponse',
            defaults.driftCounterTrimResponse,
            1,
            20,
        ),
        driftCounterTrimReleaseResponse: readTuningNumber(
            params,
            'driftCounterTrimRelease',
            defaults.driftCounterTrimReleaseResponse,
            1,
            16,
        ),
        driftSustainAcceleration: readTuningNumber(
            params,
            'driftSustainAccel',
            defaults.driftSustainAcceleration,
            0,
            600,
        ),
        driftTransitionArmDuration: readTuningNumber(
            params,
            'driftTransitionArmDuration',
            defaults.driftTransitionArmDuration,
            0.04,
            0.5,
        ),
        driftTransitionInputWindow: readTuningNumber(
            params,
            'driftTransitionInputWindow',
            defaults.driftTransitionInputWindow,
            0.1,
            0.8,
        ),
        driftTransitionKick: readTuningNumber(
            params,
            'driftTransitionKick',
            defaults.driftTransitionKick,
            40,
            360,
        ),
        driftMaxSlipAngle: readTuningNumber(params, 'driftSlipAngle', defaults.driftMaxSlipAngle, 0, 35),
        driftMinCornerIntensity: readTuningNumber(
            params,
            'driftMinCorner',
            defaults.driftMinCornerIntensity,
            0.1,
            0.9,
        ),
        driftMinSpeedRatio: readTuningNumber(
            params,
            'driftMinSpeed',
            defaults.driftMinSpeedRatio,
            0.2,
            0.9,
        ),
        driftMinSteerInput: readTuningNumber(
            params,
            'driftMinSteer',
            defaults.driftMinSteerInput,
            0.2,
            1,
        ),
        driftRecoveryRate: readTuningNumber(
            params,
            'driftRecovery',
            defaults.driftRecoveryRate,
            0.4,
            10,
        ),
        engineAcceleration: readTuningNumber(
            params,
            'engineAccel',
            defaults.engineAcceleration,
            40,
            360,
        ),
        engineBrakeDeceleration: readTuningNumber(
            params,
            'engineBrake',
            defaults.engineBrakeDeceleration,
            0,
            120,
        ),
        engineProfile: defaults.engineProfile,
        gripCounterRoadCenteringScale: readTuningNumber(
            params,
            'gripCounterRoadCentering',
            defaults.gripCounterRoadCenteringScale,
            0,
            1,
        ),
        gripCounterRoadLateralBuildRate: readTuningNumber(
            params,
            'gripCounterRoadBuild',
            defaults.gripCounterRoadLateralBuildRate,
            20,
            360,
        ),
        gripCounterRoadLateralMaxSpeed: readTuningNumber(
            params,
            'gripCounterRoadLateralMax',
            defaults.gripCounterRoadLateralMaxSpeed,
            0,
            220,
        ),
        gripCounterRoadLateralRecoveryRate: readTuningNumber(
            params,
            'gripCounterRoadRecovery',
            defaults.gripCounterRoadLateralRecoveryRate,
            20,
            360,
        ),
        gripCounterRoadSpeedScrub: readTuningNumber(
            params,
            'gripCounterRoadScrub',
            defaults.gripCounterRoadSpeedScrub,
            0,
            180,
        ),
        highSpeedSteerForceDrop: readTuningNumber(
            params,
            'steerForceDrop',
            defaults.highSpeedSteerForceDrop,
            0,
            0.7,
        ),
        highSpeedInputResponseDrop: readTuningNumber(
            params,
            'inputDrop',
            defaults.highSpeedInputResponseDrop,
            0,
            0.75,
        ),
        highSpeedLateralVelocityCap: readTuningNumber(
            params,
            'lateralCap',
            defaults.highSpeedLateralVelocityCap,
            24,
            defaults.steerAcceleration,
        ),
        highSpeedSteeringSlewRate: readTuningNumber(
            params,
            'steeringSlew',
            defaults.highSpeedSteeringSlewRate,
            1,
            24,
        ),
        highSpeedSteerVisualDrop: readTuningNumber(
            params,
            'steerVisualDrop',
            defaults.highSpeedSteerVisualDrop,
            0,
            0.7,
        ),
        gripSteerAngleHighSpeedCap: readTuningNumber(
            params,
            'gripSteerHighCap',
            defaults.gripSteerAngleHighSpeedCap,
            0.35,
            1,
        ),
        gripSteerAngleHighSpeedStartRatio: readTuningNumber(
            params,
            'gripSteerHighStart',
            defaults.gripSteerAngleHighSpeedStartRatio,
            0.2,
            0.9,
        ),
        inputResponse: readTuningNumber(params, 'inputResponse', defaults.inputResponse, 3, 36),
        launchThrottleFullSpeedRatio: readTuningNumber(
            params,
            'launchFullRatio',
            defaults.launchThrottleFullSpeedRatio,
            0.05,
            0.45,
        ),
        launchThrottleMinRatio: readTuningNumber(
            params,
            'launchMinRatio',
            defaults.launchThrottleMinRatio,
            0.25,
            1,
        ),
        maxRoadOffset: readTuningNumber(params, 'maxRoadOffset', defaults.maxRoadOffset, 260, 1100),
        overspeedUndersteerMax: readTuningNumber(
            params,
            'overspeedUndersteer',
            defaults.overspeedUndersteerMax,
            0,
            0.8,
        ),
        overspeedMediumUndersteerScale: readTuningNumber(
            params,
            'overspeedMediumUndersteerScale',
            defaults.overspeedMediumUndersteerScale,
            0,
            1,
        ),
        overspeedUndersteerMinSteerInput: readTuningNumber(
            params,
            'overspeedUndersteerMinSteerInput',
            defaults.overspeedUndersteerMinSteerInput,
            0,
            1,
        ),
        overspeedSafetyMarginStartRatio: readTuningNumber(
            params,
            'overspeedSafetyMarginStartRatio',
            defaults.overspeedSafetyMarginStartRatio,
            0.05,
            0.75,
        ),
        overspeedSafetyMarginFullRatio: readTuningNumber(
            params,
            'overspeedSafetyMarginFullRatio',
            defaults.overspeedSafetyMarginFullRatio,
            0.1,
            1,
        ),
        overspeedSafetyMarginScrub: readTuningNumber(
            params,
            'overspeedSafetyMarginScrub',
            defaults.overspeedSafetyMarginScrub,
            0,
            180,
        ),
        overspeedSharpLateralScale: readTuningNumber(
            params,
            'overspeedSharpLateralScale',
            defaults.overspeedSharpLateralScale,
            0.5,
            3,
        ),
        overspeedSharpSpeedScrubScale: readTuningNumber(
            params,
            'overspeedSharpSpeedScrubScale',
            defaults.overspeedSharpSpeedScrubScale,
            0.5,
            3,
        ),
        overspeedSharpUndersteerScale: readTuningNumber(
            params,
            'overspeedSharpUndersteerScale',
            defaults.overspeedSharpUndersteerScale,
            0,
            1.4,
        ),
        overspeedUndersteerLateralBuildRate: readTuningNumber(
            params,
            'overspeedUndersteerLateralBuild',
            defaults.overspeedUndersteerLateralBuildRate,
            0,
            320,
        ),
        overspeedUndersteerLateralMaxSpeed: readTuningNumber(
            params,
            'overspeedUndersteerLateralMax',
            defaults.overspeedUndersteerLateralMaxSpeed,
            0,
            160,
        ),
        overspeedUndersteerLateralRecoveryRate: readTuningNumber(
            params,
            'overspeedUndersteerLateralRecovery',
            defaults.overspeedUndersteerLateralRecoveryRate,
            20,
            260,
        ),
        overspeedUndersteerRatioBuildRate: readTuningNumber(
            params,
            'overspeedUndersteerRatioBuild',
            defaults.overspeedUndersteerRatioBuildRate,
            0.4,
            12,
        ),
        overspeedUndersteerRatioRecoveryRate: readTuningNumber(
            params,
            'overspeedUndersteerRatioRecovery',
            defaults.overspeedUndersteerRatioRecoveryRate,
            0.4,
            16,
        ),
        overspeedUndersteerSpeedScrub: readTuningNumber(
            params,
            'overspeedUndersteerScrub',
            defaults.overspeedUndersteerSpeedScrub,
            0,
            100,
        ),
        overspeedUndersteerSpeedWindow: readTuningNumber(
            params,
            'overspeedUndersteerWindow',
            defaults.overspeedUndersteerSpeedWindow,
            30,
            220,
        ),
        rollingResistance: readTuningNumber(
            params,
            'rollingResistance',
            defaults.rollingResistance,
            0,
            80,
        ),
        rpmIdle: defaults.rpmIdle,
        rpmRedline: defaults.rpmRedline,
        rpmResponse: defaults.rpmResponse,
        steerAcceleration: readTuningNumber(
            params,
            'steerAccel',
            defaults.steerAcceleration,
            400,
            3600,
        ),
        steerDamping: readTuningNumber(params, 'steerDamping', defaults.steerDamping, 2, 24),
        steeringSpeedScrub: readTuningNumber(
            params,
            'steeringScrub',
            defaults.steeringSpeedScrub,
            0,
            220,
        ),
        steeringSpeedScrubThreshold: readTuningNumber(
            params,
            'steeringScrubThreshold',
            defaults.steeringSpeedScrubThreshold,
            0,
            0.85,
        ),
        steeringVelocityCue: readTuningNumber(
            params,
            'steeringCue',
            defaults.steeringVelocityCue,
            0,
            0.8,
        ),
    };
}

export function formatNullableNumber(value: number | null) {
    return value === null ? '--' : value.toFixed(2);
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
