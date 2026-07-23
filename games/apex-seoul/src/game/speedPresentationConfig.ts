export const SPEED_PRESENTATION_WORLD_CONFIG = Object.freeze({
    // Curves need more near-field events than straights because perspective
    // stacks center-lane marks and continuous barriers into a single shape.
    // Two short marks preserve painted duty while doubling corner cadence.
    cornerLaneDashLengthRatio: 0.18,
    cornerLaneDashMinCurve: 0.18,
    cornerLaneDashStartRatio: 0.08,
    cornerLaneDashSubdivisions: 2,
    cornerReflectorStartRatio: 0.28,
    cornerReflectorSubdivisions: 2,
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
