import Phaser from 'phaser';
import type { PlayerVehicleControllerConfig } from './playerVehicleController';

export type RuntimeTuning = {
    cameraBaseFov: number;
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
        centeringResponse: readTuningNumber(
            params,
            'centeringResponse',
            defaults.centeringResponse,
            0.2,
            6,
        ),
        cornerAccelSpeedDrop: readTuningNumber(
            params,
            'cornerAccelDrop',
            defaults.cornerAccelSpeedDrop,
            0,
            280,
        ),
        cornerSpeedPull: readTuningNumber(
            params,
            'cornerPull',
            defaults.cornerSpeedPull,
            0,
            360,
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
