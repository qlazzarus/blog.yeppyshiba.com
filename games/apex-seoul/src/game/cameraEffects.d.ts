export type CameraEffectCue = {
    downhill: number;
    driftExitBurst: number;
    throttleBurst: number;
};

export type CameraEffectCueLimits = {
    downhillMaxIntensity: number;
    driftExitBurstMaxIntensity: number;
    throttleBurstMaxIntensity: number;
};

export type CameraEffectsConfig = {
    baseFov: number;
    downhillFovImpulse: number;
    driftExitFovImpulse: number;
    fovCueResponse: number;
    fovResponse: number;
    shakeDriftExitX: number;
    shakeDriftExitY: number;
    shakeFrequency: number;
    shakeRailImpactX: number;
    shakeRailImpactY: number;
    shakeScale: number;
    shakeThrottleX: number;
    shakeThrottleY: number;
    speedFovBonus: number;
    speedFovBands: Array<{ bonusRatio: number; speedKmh: number }>;
    throttleFovImpulse: number;
};

export type CameraEffectsState = {
    fovDegrees: number;
    fovCueDegrees: number;
    shake: { x: number; y: number };
    shakePhase: number;
};

export const DEFAULT_CAMERA_EFFECTS_CONFIG: CameraEffectsConfig;

export function createCameraEffectsConfig(tuning: {
    cameraBaseFov: number;
    cameraShakeDriftExitX: number;
    cameraShakeDriftExitY: number;
    cameraShakeFrequency: number;
    cameraShakeScale: number;
    cameraShakeThrottleX: number;
    cameraShakeThrottleY: number;
    cameraSpeedFovBonus: number;
}): CameraEffectsConfig;

export function createCameraEffectsState(config: CameraEffectsConfig): CameraEffectsState;

export function updateCameraEffects(
    state: CameraEffectsState,
    input: {
        cue: CameraEffectCue;
        cueLimits: CameraEffectCueLimits;
        railImpact?: number;
        seconds: number;
        speedKmh: number;
    },
    config: CameraEffectsConfig,
): CameraEffectsState;

export function getSpeedFovBonus(speedKmh: number, config?: CameraEffectsConfig): number;
