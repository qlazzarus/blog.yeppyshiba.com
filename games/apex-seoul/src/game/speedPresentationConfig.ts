export const SPEED_PRESENTATION_WORLD_CONFIG = Object.freeze({
    // Preserve roughly the old 1/3 painted duty cycle, but distribute it as
    // one short dash per segment so near-field flow remains readable at speed.
    laneDashLengthRatio: 0.34,
    laneDashSegmentInterval: 1,
    laneDashStartRatio: 0.16,
    leftGuardrailPostSegmentInterval: 4,
    reflectorSegmentInterval: 1,
    rightGuardrailPostSegmentInterval: 3,
    speedEffectMaxIntensity: 0.38,
    speedEffectTimeScaleMax: 2.2,
    speedEffectTimeScaleMin: 0.4,
});

export function getSpeedEffectIntensity(cueIntensity: number) {
    return Math.min(
        SPEED_PRESENTATION_WORLD_CONFIG.speedEffectMaxIntensity,
        Math.max(0, cueIntensity),
    );
}
