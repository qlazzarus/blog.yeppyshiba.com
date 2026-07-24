import type { PlayerVehicleState } from './vehicle';

export const GUARDRAIL_COLLISION_CONFIG = {
    bounceMaxVelocity: 128,
    bounceMinVelocity: 42,
    contactBounceHoldSeconds: 0.08,
    contactCooldownSeconds: 0.12,
    contactClearance: 220,
    contactReleaseInset: 52,
    contactReleaseSeconds: 1,
    physicalVehicleFrontLength: 420,
    impactSpeedLossScale: 0.09,
    impactVelocityThreshold: 12,
    lateralVelocityDamping: 0.22,
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

export function applyGuardrailCollision(
    player: PlayerVehicleState,
    context: GuardrailCollisionContext,
    seconds: number,
) {
    const offsetMagnitude = Math.abs(player.lateralOffset);
    const centerSide = getDirection(player.lateralOffset);
    const geometry = getGuardrailCollisionGeometry(context);
    const centerShoulderRatio = clamp(
        (offsetMagnitude - geometry.pavedCenterLimit) / geometry.shoulderWidth,
        0,
        1,
    );
    const frontGeometry = context.frontRoad
        ? getGuardrailCollisionGeometry({
            pavedHalfWidth: context.frontRoad.pavedHalfWidth,
            railContactLimit: context.frontRoad.railContactLimit,
            vehicleHalfWidth: context.vehicleHalfWidth,
        })
        : null;
    const frontCenterOffset = context.frontRoad
        ? player.lateralOffset +
            Math.tan(clamp(player.vehicleHeadingError, -0.85, 0.85)) *
                context.frontRoad.distance
        : player.lateralOffset;
    const frontOffsetMagnitude = Math.abs(frontCenterOffset);
    const frontSide = getDirection(frontCenterOffset);
    const frontShoulderRatio = frontGeometry
        ? clamp(
            (frontOffsetMagnitude - frontGeometry.pavedCenterLimit) /
                frontGeometry.shoulderWidth,
            0,
            1,
        )
        : 0;
    const shoulderRatio = Math.max(centerShoulderRatio, frontShoulderRatio);
    const isSideContacting = centerSide !== 0 &&
        offsetMagnitude >= geometry.railCenterLimit - 0.001;
    const isFrontContacting = Boolean(
        frontGeometry &&
        frontSide !== 0 &&
        frontOffsetMagnitude >= frontGeometry.railCenterLimit - 0.001,
    );
    const side = isSideContacting ? centerSide : frontSide;
    const isContacting = isSideContacting || isFrontContacting;

    player.guardrailShoulderRatio = shoulderRatio;
    player.guardrailImpactCue = approach(player.guardrailImpactCue, 0, 6, seconds);
    player.guardrailBounceVelocity = approach(player.guardrailBounceVelocity, 0, 220, seconds);
    player.guardrailContactInset = (isFrontContacting ? frontGeometry : geometry)
        ?.vehicleHalfWidth ?? geometry.vehicleHalfWidth;
    player.guardrailContactPhase = player.guardrailContactActive ? 'stay' : 'clear';

    if (shoulderRatio > 0) {
        player.speed = Math.max(
            0,
            player.speed - GUARDRAIL_COLLISION_CONFIG.shoulderScrubPerSecond * shoulderRatio * seconds,
        );
    }

    if (!isContacting) {
        player.guardrailContactTimer = Math.max(0, player.guardrailContactTimer - seconds);
        player.guardrailContactClearTimer = player.guardrailContactActive
            ? player.guardrailContactClearTimer + seconds
            : 0;
        if (
            player.guardrailContactActive &&
            (
                hasClearedLatchedRail(
                    player.guardrailContactDirection,
                    player.lateralOffset,
                    player.guardrailContactAnchorOffset,
                ) ||
                player.guardrailContactClearTimer >=
                    GUARDRAIL_COLLISION_CONFIG.contactReleaseSeconds
            )
        ) {
            player.guardrailContactActive = false;
            player.guardrailContactAnchorOffset = 0;
            player.guardrailContactClearTimer = 0;
            player.guardrailContactDirection = 0;
            player.guardrailContactPhase = 'exit';
        } else if (!player.guardrailContactActive) {
            player.guardrailContactDirection = 0;
        }
        return;
    }

    const outwardVelocity = side * (
        player.steeringVelocity +
        player.cornerInertiaLateralVelocity +
        player.driftLateralVelocity +
        player.gripCounterRoadLateralVelocity +
        player.overspeedUndersteerLateralVelocity
    ) + (isFrontContacting
        ? Math.max(
            0,
            side *
                Math.tan(clamp(player.vehicleHeadingError, -0.85, 0.85)) *
                player.speed,
        )
        : 0);
    const speedRatio = clamp(player.speed / 760, 0, 1);
    const impactRatio = clamp(
        (outwardVelocity - GUARDRAIL_COLLISION_CONFIG.impactVelocityThreshold) / 160,
        0,
        1,
    ) * (0.35 + speedRatio * 0.65);
    const firstContact = !player.guardrailContactActive ||
        player.guardrailContactDirection !== side;

    if (isSideContacting) {
        player.lateralOffset = side * geometry.railCenterLimit;
    }
    player.guardrailContactActive = true;
    player.guardrailContactClearTimer = 0;
    player.guardrailContactDirection = side;
    player.guardrailContactPhase = firstContact ? 'enter' : 'stay';
    player.guardrailContactTimer = GUARDRAIL_COLLISION_CONFIG.contactCooldownSeconds;
    player.speed = Math.max(
        0,
        player.speed - GUARDRAIL_COLLISION_CONFIG.sustainedContactScrubPerSecond * seconds -
            (firstContact ? player.speed * impactRatio * GUARDRAIL_COLLISION_CONFIG.impactSpeedLossScale : 0),
    );

    if (firstContact) {
        player.guardrailContactAnchorOffset = player.lateralOffset;
        const bounceVelocity = getBounceVelocity(impactRatio);
        player.guardrailBounceVelocity = bounceVelocity;
        player.steeringVelocity = -side * bounceVelocity;
        player.driftLateralVelocity *= -GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
        player.cornerInertiaLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
        player.vehicleHeadingError *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
        player.gripCounterRoadLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
        player.overspeedUndersteerLateralVelocity *= GUARDRAIL_COLLISION_CONFIG.lateralVelocityDamping;
        player.guardrailImpactCount += 1;
        player.guardrailImpactCue = Math.max(player.guardrailImpactCue, impactRatio);
        player.driftRatio *= 1 - impactRatio * 0.48;
        player.traction = Math.min(player.traction, 1 - impactRatio * 0.22);
    }
}

function hasClearedLatchedRail(
    side: -1 | 0 | 1,
    centerOffset: number,
    contactAnchorOffset: number,
) {
    if (side === 0) return true;

    const inwardTravel = side * (contactAnchorOffset - centerOffset);
    return inwardTravel >= GUARDRAIL_COLLISION_CONFIG.contactReleaseInset;
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
