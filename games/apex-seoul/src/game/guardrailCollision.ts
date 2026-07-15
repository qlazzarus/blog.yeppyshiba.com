import type { PlayerVehicleState } from './vehicle';

export const GUARDRAIL_COLLISION_CONFIG = {
    bounceMaxVelocity: 128,
    bounceMinVelocity: 42,
    contactBounceHoldSeconds: 0.08,
    contactCooldownSeconds: 0.12,
    contactClearance: 130,
    contactInsetLeft: 56,
    contactInsetRight: 48,
    impactSpeedLossScale: 0.09,
    impactVelocityThreshold: 12,
    lateralVelocityDamping: 0.22,
    shoulderScrubPerSecond: 28,
    sustainedContactScrubPerSecond: 46,
};

export type GuardrailCollisionContext = {
    pavedHalfWidth: number;
    railContactLimit: number;
    visualPavedHalfWidth?: number | null;
    visualRailContactLimit?: number | null;
};

export function applyGuardrailCollision(
    player: PlayerVehicleState,
    context: GuardrailCollisionContext,
    seconds: number,
) {
    const offsetMagnitude = Math.abs(player.lateralOffset);
    const side = getDirection(player.lateralOffset);
    const railContactLimit = getEffectiveRailContactLimit(context, side);
    const pavedHalfWidth = getEffectivePavedHalfWidth(context, railContactLimit);
    const shoulderWidth = Math.max(1, railContactLimit - pavedHalfWidth);
    const shoulderRatio = clamp((offsetMagnitude - pavedHalfWidth) / shoulderWidth, 0, 1);
    const isContacting = side !== 0 && offsetMagnitude >= railContactLimit - 0.001;

    player.guardrailShoulderRatio = shoulderRatio;
    player.guardrailImpactCue = approach(player.guardrailImpactCue, 0, 6, seconds);
    player.guardrailBounceVelocity = approach(player.guardrailBounceVelocity, 0, 220, seconds);
    player.guardrailContactInset = getAppliedContactInset(context, side);

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

    player.lateralOffset = side * railContactLimit;
    player.guardrailContactDirection = side;
    player.guardrailContactTimer = GUARDRAIL_COLLISION_CONFIG.contactCooldownSeconds;
    const bounceVelocity = firstContact
        ? getBounceVelocity(impactRatio)
        : Math.max(0, player.guardrailBounceVelocity - GUARDRAIL_COLLISION_CONFIG.bounceMaxVelocity * seconds);
    player.guardrailBounceVelocity = bounceVelocity;
    player.steeringVelocity = -side * bounceVelocity;
    player.driftLateralVelocity *= -GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
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

function getEffectiveRailContactLimit(context: GuardrailCollisionContext, side: -1 | 0 | 1) {
    const visualLimit = sanitizePositiveLimit(context.visualRailContactLimit);
    const contactInset = getAppliedContactInset(context, side);

    return visualLimit === null
        ? context.railContactLimit
        : Math.min(context.railContactLimit, Math.max(1, visualLimit - contactInset));
}

function getEffectivePavedHalfWidth(context: GuardrailCollisionContext, railContactLimit: number) {
    const visualLimit = sanitizePositiveLimit(context.visualPavedHalfWidth);
    const pavedHalfWidth = visualLimit === null
        ? context.pavedHalfWidth
        : Math.min(context.pavedHalfWidth, visualLimit);

    return Math.min(pavedHalfWidth, railContactLimit - 1);
}

function sanitizePositiveLimit(value: number | null | undefined) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function getAppliedContactInset(context: GuardrailCollisionContext, side: -1 | 0 | 1) {
    const visualLimit = sanitizePositiveLimit(context.visualRailContactLimit);
    const contactInset = side < 0
        ? GUARDRAIL_COLLISION_CONFIG.contactInsetLeft
        : GUARDRAIL_COLLISION_CONFIG.contactInsetRight;

    return visualLimit === null
        ? 0
        : Math.min(contactInset, Math.max(0, visualLimit - 1));
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
