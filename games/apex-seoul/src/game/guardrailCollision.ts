import type { PlayerVehicleState } from './vehicle';

export const GUARDRAIL_COLLISION_CONFIG = {
    bounceMaxVelocity: 128,
    bounceMinVelocity: 42,
    contactBounceHoldSeconds: 0.08,
    contactCooldownSeconds: 0.12,
    contactClearance: 220,
    impactSpeedLossScale: 0.09,
    impactVelocityThreshold: 12,
    lateralVelocityDamping: 0.22,
    physicalVehicleHalfWidth: 240,
    shoulderScrubPerSecond: 28,
    sustainedContactScrubPerSecond: 46,
};

export type GuardrailCollisionContext = {
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

export function applyGuardrailCollision(
    player: PlayerVehicleState,
    context: GuardrailCollisionContext,
    seconds: number,
) {
    const offsetMagnitude = Math.abs(player.lateralOffset);
    const side = getDirection(player.lateralOffset);
    const geometry = getGuardrailCollisionGeometry(context);
    const shoulderRatio = clamp(
        (offsetMagnitude - geometry.pavedCenterLimit) / geometry.shoulderWidth,
        0,
        1,
    );
    const isContacting = side !== 0 && offsetMagnitude >= geometry.railCenterLimit - 0.001;

    player.guardrailShoulderRatio = shoulderRatio;
    player.guardrailImpactCue = approach(player.guardrailImpactCue, 0, 6, seconds);
    player.guardrailBounceVelocity = approach(player.guardrailBounceVelocity, 0, 220, seconds);
    player.guardrailContactInset = geometry.vehicleHalfWidth;

    if (shoulderRatio > 0) {
        player.speed = Math.max(
            0,
            player.speed - GUARDRAIL_COLLISION_CONFIG.shoulderScrubPerSecond * shoulderRatio * seconds,
        );
    }

    if (!isContacting) {
        player.guardrailContactTimer = Math.max(0, player.guardrailContactTimer - seconds);
        player.guardrailContactDirection = 0;
        return;
    }

    const outwardVelocity = side * (
        player.steeringVelocity +
        player.cornerInertiaLateralVelocity +
        player.driftLateralVelocity +
        player.gripCounterRoadLateralVelocity +
        player.overspeedUndersteerLateralVelocity
    );
    const speedRatio = clamp(player.speed / 760, 0, 1);
    const impactRatio = clamp(
        (outwardVelocity - GUARDRAIL_COLLISION_CONFIG.impactVelocityThreshold) / 160,
        0,
        1,
    ) * (0.35 + speedRatio * 0.65);
    const firstContact = player.guardrailContactTimer <= 0;

    player.lateralOffset = side * geometry.railCenterLimit;
    player.guardrailContactDirection = side;
    player.guardrailContactTimer = GUARDRAIL_COLLISION_CONFIG.contactCooldownSeconds;
    const bounceVelocity = firstContact
        ? getBounceVelocity(impactRatio)
        : Math.max(0, player.guardrailBounceVelocity - GUARDRAIL_COLLISION_CONFIG.bounceMaxVelocity * seconds);
    player.guardrailBounceVelocity = bounceVelocity;
    player.steeringVelocity = -side * bounceVelocity;
    player.driftLateralVelocity *= -GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
    player.cornerInertiaLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
    player.vehicleHeadingError *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
    player.gripCounterRoadLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
    player.overspeedUndersteerLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
    player.speed = Math.max(
        0,
        player.speed - GUARDRAIL_COLLISION_CONFIG.sustainedContactScrubPerSecond * seconds -
            (firstContact ? player.speed * impactRatio * GUARDRAIL_COLLISION_CONFIG.impactSpeedLossScale : 0),
    );

    if (firstContact) {
        player.guardrailImpactCount += 1;
        player.guardrailImpactCue = Math.max(player.guardrailImpactCue, impactRatio);
        player.driftRatio *= 1 - impactRatio * 0.48;
        player.traction = Math.min(player.traction, 1 - impactRatio * 0.22);
    }
}

function sanitizePositive(value: number) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
}

function sanitizeNonNegative(value: number) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function getBounceVelocity(impactRatio: number) {
    return GUARDRAIL_COLLISION_CONFIG.bounceMinVelocity +
        (GUARDRAIL_COLLISION_CONFIG.bounceMaxVelocity - GUARDRAIL_COLLISION_CONFIG.bounceMinVelocity) *
        Math.max(impactRatio, 0.28);
}

function approach(value: number, target: number, rate: number, seconds: number) {
    const delta = rate * seconds;

    return value < target
        ? Math.min(target, value + delta)
        : Math.max(target, value - delta);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function getDirection(value: number): -1 | 0 | 1 {
    return value < 0 ? -1 : value > 0 ? 1 : 0;
}
