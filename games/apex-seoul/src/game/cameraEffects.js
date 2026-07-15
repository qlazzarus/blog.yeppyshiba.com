// CameraEffects is intentionally renderer-agnostic. The scene owns where the
// resulting offset is applied; this system only owns deterministic effect state.
export const DEFAULT_CAMERA_EFFECTS_CONFIG = {
    baseFov: 69,
    downhillFovImpulse: 0.45,
    driftExitFovImpulse: 1.2,
    fovCueResponse: 11,
    fovResponse: 1.25,
    shakeDriftExitX: 1.2,
    shakeDriftExitY: 0.5,
    shakeFrequency: 32,
    shakeRailImpactX: 2.2,
    shakeRailImpactY: 0.9,
    shakeScale: 1,
    shakeThrottleX: 0.6,
    shakeThrottleY: 0.25,
    speedFovBonus: 5.2,
    throttleFovImpulse: 0.8,
};

export function createCameraEffectsConfig(tuning) {
    return {
        ...DEFAULT_CAMERA_EFFECTS_CONFIG,
        baseFov: tuning.cameraBaseFov,
        shakeDriftExitX: tuning.cameraShakeDriftExitX,
        shakeDriftExitY: tuning.cameraShakeDriftExitY,
        shakeFrequency: tuning.cameraShakeFrequency,
        shakeScale: tuning.cameraShakeScale,
        shakeThrottleX: tuning.cameraShakeThrottleX,
        shakeThrottleY: tuning.cameraShakeThrottleY,
        speedFovBonus: tuning.cameraSpeedFovBonus,
    };
}

export function createCameraEffectsState(config) {
    return {
        fovDegrees: config.baseFov,
        fovCueDegrees: 0,
        shake: { x: 0, y: 0 },
        shakePhase: 0,
    };
}

export function updateCameraEffects(state, input, config) {
    const rawSpeedRatio = clamp(input.speedRatio, 0, 1);
    const smoothSpeedRatio = smoothStep(rawSpeedRatio);
    const throttleRatio = clamp(input.cue.throttleBurst / input.cueLimits.throttleBurstMaxIntensity, 0, 1);
    const downhillRatio = clamp(input.cue.downhill / input.cueLimits.downhillMaxIntensity, 0, 1);
    const driftExitRatio = clamp(input.cue.driftExitBurst / input.cueLimits.driftExitBurstMaxIntensity, 0, 1);
    const railImpactRatio = clamp(input.railImpact ?? 0, 0, 1);
    const targetCueDegrees = throttleRatio * config.throttleFovImpulse
        + downhillRatio * config.downhillFovImpulse
        + driftExitRatio * config.driftExitFovImpulse
        + railImpactRatio * 0.45;
    const cueBlend = 1 - Math.exp(-config.fovCueResponse * input.seconds);
    const fovCueDegrees = linear(state.fovCueDegrees, targetCueDegrees, cueBlend);
    const targetFov = config.baseFov + smoothSpeedRatio * config.speedFovBonus + fovCueDegrees;
    const fovBlend = 1 - Math.exp(-config.fovResponse * input.seconds);
    const shakePhase = state.shakePhase + input.seconds * config.shakeFrequency;
    const xAmplitude = config.shakeScale * (
        throttleRatio * config.shakeThrottleX +
        driftExitRatio * config.shakeDriftExitX +
        railImpactRatio * config.shakeRailImpactX
    );
    const yAmplitude = config.shakeScale * (
        throttleRatio * config.shakeThrottleY +
        driftExitRatio * config.shakeDriftExitY +
        railImpactRatio * config.shakeRailImpactY
    );

    return {
        fovDegrees: linear(state.fovDegrees, targetFov, fovBlend),
        fovCueDegrees,
        shake: {
            x: Math.sin(shakePhase) * xAmplitude,
            y: Math.sin(shakePhase * 1.73 + 0.6) * yAmplitude,
        },
        shakePhase,
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function linear(from, to, amount) {
    return from + (to - from) * amount;
}

function smoothStep(value) {
    return value * value * (3 - 2 * value);
}
