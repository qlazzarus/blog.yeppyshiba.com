export type VehicleRoadScaleConfig = {
    deadZoneRatio: number;
    maxScale: number;
    minScale: number;
    responseSeconds: number;
    targetRoadRatio: number;
};

export function getRoadRelativeVehicleTargetSize(
    baseSize: number,
    roadWidthAtVehicleY: number | null,
    config: VehicleRoadScaleConfig,
) {
    if (!roadWidthAtVehicleY || roadWidthAtVehicleY <= 0) return baseSize;

    const targetSize = roadWidthAtVehicleY * config.targetRoadRatio;

    return clamp(targetSize, baseSize * config.minScale, baseSize * config.maxScale);
}

export function updateRoadRelativeVehicleSize(
    currentSize: number,
    targetSize: number,
    baseSize: number,
    seconds: number,
    config: VehicleRoadScaleConfig,
) {
    if (seconds <= 0) return currentSize;
    if (Math.abs(targetSize - currentSize) <= baseSize * config.deadZoneRatio) return currentSize;

    const blend = 1 - Math.exp(-seconds / config.responseSeconds);

    return currentSize + (targetSize - currentSize) * blend;
}

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
}
