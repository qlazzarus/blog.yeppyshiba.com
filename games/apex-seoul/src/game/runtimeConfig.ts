import Phaser from 'phaser';

export type RuntimeTuning = {
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
