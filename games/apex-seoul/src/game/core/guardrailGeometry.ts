export const GUARDRAIL_COLLISION_CONFIG = {
    bounceMaxVelocity: 96,
    bounceMinVelocity: 28,
    contactBounceHoldSeconds: 0.08,
    contactCooldownSeconds: 0.12,
    contactClearance: 220,
    contactReleaseInset: 52,
    contactReleaseSeconds: 1,
    physicalVehicleFrontLength: 420,
    impactSpeedLossScale: 0.06,
    impactVelocityThreshold: 24,
    lateralVelocityDamping: 0.36,
    physicalVehicleHalfWidth: 240,
    shoulderScrubPerSecond: 28,
    sustainedContactScrubPerSecond: 46,
};

export type GuardrailCollisionContext = {
    frontRoad?: {
        distance: number;
        pavedHalfWidth: number;
        railContactLimit: number;
    };
    pavedHalfWidth: number;
    railContactLimit: number;
    vehicleHalfWidth: number;
};

export type GuardrailCollisionGeometry = {
    pavedCenterLimit: number;
    railCenterLimit: number;
    railOffset: number;
    shoulderWidth: number;
    vehicleHalfWidth: number;
};

export function getGuardrailCollisionGeometry(
    context: GuardrailCollisionContext,
): GuardrailCollisionGeometry {
    const vehicleHalfWidth = sanitizeNonNegative(context.vehicleHalfWidth);
    const pavedHalfWidth = sanitizePositive(context.pavedHalfWidth);
    const railOffset = Math.max(pavedHalfWidth + 1, sanitizePositive(context.railContactLimit));
    const pavedCenterLimit = Math.max(1, pavedHalfWidth - vehicleHalfWidth);
    const railCenterLimit = Math.max(
        pavedCenterLimit + 1,
        railOffset - vehicleHalfWidth,
    );

    return {
        pavedCenterLimit,
        railCenterLimit,
        railOffset,
        shoulderWidth: railCenterLimit - pavedCenterLimit,
        vehicleHalfWidth,
    };
}

function sanitizePositive(value: number) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
}

function sanitizeNonNegative(value: number) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}
