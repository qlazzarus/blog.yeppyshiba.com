import type { GuardrailCollisionGeometry } from './guardrailCollision';
import type { RoadScreenSpan } from './roadRenderer';

export type GuardrailScreenProjection = {
    activeGapPx: number;
    centerX: number;
    leftGapPx: number;
    leftRailX: number;
    normalizedOffset: number;
    rightGapPx: number;
    rightRailX: number;
    roadCenterX: number;
    roadScalePxPerUnit: number;
    vehicleContactHalfWidthPx: number;
    vehicleLeftX: number;
    vehicleRightX: number;
};

export function projectGuardrailCollisionToScreen(
    roadSpan: RoadScreenSpan,
    geometry: GuardrailCollisionGeometry,
    lateralOffset: number,
    vehicleContactWidthPx: number,
    centerBiasPx = 0,
): GuardrailScreenProjection {
    const roadWidthPx = Math.max(1, roadSpan.rightX - roadSpan.leftX);
    const roadScalePxPerUnit = roadWidthPx / Math.max(1, geometry.pavedCenterLimit * 2 + geometry.vehicleHalfWidth * 2);
    const roadCenterX = (roadSpan.leftX + roadSpan.rightX) / 2 + centerBiasPx;
    const shoulderPx = (geometry.railOffset - (
        geometry.pavedCenterLimit + geometry.vehicleHalfWidth
    )) * roadScalePxPerUnit;
    const leftRailX = roadSpan.leftX + centerBiasPx - shoulderPx;
    const rightRailX = roadSpan.rightX + centerBiasPx + shoulderPx;
    const vehicleContactHalfWidthPx = Math.max(1, vehicleContactWidthPx / 2);
    const normalizedOffset = clamp(
        lateralOffset / Math.max(1, geometry.railCenterLimit),
        -1,
        1,
    );
    const leftContactCenterX = leftRailX + vehicleContactHalfWidthPx;
    const rightContactCenterX = rightRailX - vehicleContactHalfWidthPx;
    const centerX = normalizedOffset < 0
        ? lerp(roadCenterX, leftContactCenterX, -normalizedOffset)
        : lerp(roadCenterX, rightContactCenterX, normalizedOffset);
    const vehicleLeftX = centerX - vehicleContactHalfWidthPx;
    const vehicleRightX = centerX + vehicleContactHalfWidthPx;
    const leftGapPx = vehicleLeftX - leftRailX;
    const rightGapPx = rightRailX - vehicleRightX;

    return {
        activeGapPx: normalizedOffset < 0 ? leftGapPx : normalizedOffset > 0 ? rightGapPx : Math.min(leftGapPx, rightGapPx),
        centerX,
        leftGapPx,
        leftRailX,
        normalizedOffset,
        rightGapPx,
        rightRailX,
        roadCenterX,
        roadScalePxPerUnit,
        vehicleContactHalfWidthPx,
        vehicleLeftX,
        vehicleRightX,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
    return start + (end - start) * amount;
}
