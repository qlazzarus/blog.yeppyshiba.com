import {
    createCameraEffectsConfig,
    DEFAULT_CAMERA_EFFECTS_CONFIG,
} from './cameraEffects.js';
import {
    createLongitudinalProgressionConfig,
} from './longitudinalProgression';
import {
    DEFAULT_ROAD_HALF_WIDTH,
    parseRoadTrackId,
} from './road';
import {
    createRuntimeQaOverrides,
    createRuntimeTelemetryConfig,
    createRuntimeTuning,
} from './runtimeConfig';
import { GUARDRAIL_COLLISION_CONFIG } from './guardrailCollision';

export const APEX_SEOUL_DEFAULTS = {
    camera: {
        downhillExtraPitch: 42,
        inputResponse: 14,
        lateralSpeed: 820,
        maxSlopePitch: 34,
        slopePitchResponse: 3.2,
    },
    course: {
        checkpointRatios: [0.25, 0.5, 0.75],
        countdownSeconds: 3,
        finishRatio: 1,
    },
    debug: {
        guardrailImpactHoldSeconds: 0.9,
        projectionGuides: false,
    },
    game: {
        height: 760,
        width: 1200,
    },
    launch: {
        burnoutDurationSec: {
            hooked: 0.28,
            overrev: 0.35,
        },
        forceDurationSec: 0.55,
        forceMaxSpeedKmh: 45,
        hookedForceBonus: 0.1,
        hookedRpm: [5800, 6600] as const,
        limiterRpm: 6400,
        overrevForceBonus: 0.02,
        overrevRpm: 6800,
        revReleaseResponse: 8,
        revResponse: 9,
    },
    playerPresentation: {
        contactTerrainCueThreshold: 8,
        curveScreenBias: 8,
        headlight: {
            aimFineAttackSeconds: 0.05,
            aimFineReturnSeconds: 0.1,
            aimFineSteerPx: 14,
            aimMaxPx: 72,
            aimMaxRoadPx: 54,
            aimRoadAssistResponseSeconds: 0.2,
            curveIntentDriftRoadWeight: 0.3,
            curveIntentGripRoadWeight: 0.55,
            roadStrongPoseWeight: 0.1,
            roadWeakPoseWeight: 0.35,
        },
        maxTerrainScreenYShift: 18,
        roadAnchorDistance: 640,
        roadContactDistance: 260,
        screenAnchorRatio: 0.88,
        shadowBaselineYOffset: 0.028,
        shadowMaxAlpha: 0.18,
        shadowSoftAlpha: 0.24,
        silhouetteShadowAlpha: 0.48,
        terrainCueThreshold: 24,
        terrainScaleIntensity: 0.045,
        vehicle: {
            maxSize: 360,
            minSize: 220,
            roadScaleDeadZoneRatio: 0.02,
            roadScaleMax: 1.08,
            roadScaleMin: 0.92,
            roadScaleResponseSeconds: 0.7,
            roadTargetRatio: 0.54,
            rotationDeg: 3.5,
            viewportRatio: 0.34,
        },
    },
    run: {
        finishCoastSpeed: 0,
    },
    telemetry: {
        durationSec: 60,
        sampleHz: 10,
    },
    world: {
        cityFarParallaxHeight: 112,
        cityParallaxWidth: 1600,
        cityRidgeBaselineOffsetY: 42,
        cityRidgeParallaxHeight: 150,
        citySkylineBaseYRatio: 0.38,
        moonDisplaySize: 112,
        moonXRatio: 0.87,
        moonYRatio: 0.12,
    },
} as const;

export function createApexSeoulRuntimeConfig(params: URLSearchParams) {
    const defaults = APEX_SEOUL_DEFAULTS;
    const presentation = defaults.playerPresentation;
    const vehicle = presentation.vehicle;
    const tuning = createRuntimeTuning(params, {
        cameraBaseFov: DEFAULT_CAMERA_EFFECTS_CONFIG.baseFov,
        cameraShakeDriftExitX: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeDriftExitX,
        cameraShakeDriftExitY: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeDriftExitY,
        cameraShakeFrequency: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeFrequency,
        cameraShakeScale: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeScale,
        cameraShakeThrottleX: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeThrottleX,
        cameraShakeThrottleY: DEFAULT_CAMERA_EFFECTS_CONFIG.shakeThrottleY,
        cameraSpeedFovBonus: DEFAULT_CAMERA_EFFECTS_CONFIG.speedFovBonus,
        curveScreenBias: presentation.curveScreenBias,
        debugProjectionGuides: defaults.debug.projectionGuides,
        highSpeedSteerWeakThreshold: 0.22,
        highSpeedVisualSteeringScale: 1,
        playerContactTerrainCueThreshold: presentation.contactTerrainCueThreshold,
        playerRoadAnchorDistance: presentation.roadAnchorDistance,
        playerRoadContactDistance: presentation.roadContactDistance,
        playerScreenAnchorRatio: presentation.screenAnchorRatio,
        steerWeakThreshold: 0.14,
        terrainCueThreshold: presentation.terrainCueThreshold,
        terrainScaleIntensity: presentation.terrainScaleIntensity,
        vehicleMaxSize: vehicle.maxSize,
        vehicleMinSize: vehicle.minSize,
        vehicleRoadScaleDeadZoneRatio: vehicle.roadScaleDeadZoneRatio,
        vehicleRoadScaleMax: vehicle.roadScaleMax,
        vehicleRoadScaleMin: vehicle.roadScaleMin,
        vehicleRoadScaleResponseSeconds: vehicle.roadScaleResponseSeconds,
        vehicleRoadTargetRatio: vehicle.roadTargetRatio,
        vehicleRotationDeg: vehicle.rotationDeg,
        vehicleViewportRatio: vehicle.viewportRatio,
    });

    return {
        cameraEffects: createCameraEffectsConfig(tuning),
        longitudinalProgression: createLongitudinalProgressionConfig(params),
        qa: createRuntimeQaOverrides(params, {
            maxRoadOffset: DEFAULT_ROAD_HALF_WIDTH + GUARDRAIL_COLLISION_CONFIG.contactClearance -
                GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
            playerAccelSpeed: 760,
        }),
        roadTrackId: parseRoadTrackId(params.get('track')),
        telemetry: createRuntimeTelemetryConfig(params, defaults.telemetry),
        tuning,
    };
}
