import type { PlayerDriftState } from './vehicle';

export type VehicleUndersteerVisualConfig = {
    bodyAuthorityAttackResponse: number;
    bodyAuthorityRecoveryResponse: number;
    cueAttackResponse: number;
    cueFullLateralRoadRate: number;
    cueFullUndersteerRatio: number;
    cueReleaseResponse: number;
    cueStartUndersteerRatio: number;
    minimumBodyYawAuthority: number;
    poseAuthorityBlend: number;
};

export type VehicleUndersteerVisualInput = {
    baseGripAngleCap: number;
    driftState: PlayerDriftState;
    gripSteerAngleLimit: number;
    lateralVelocityRoadRate: number;
    physicalSteering: number;
    understeerRatio: number;
};

export type VehicleUndersteerVisualState = {
    bodyYawAuthority: number;
    bodyYawValue: number;
    cueIntensity: number;
    gripAuthorityRatio: number;
    inputPoseValue: number;
    poseAuthority: number;
    poseValue: number;
};

export const DEFAULT_VEHICLE_UNDERSTEER_VISUAL_CONFIG: VehicleUndersteerVisualConfig = {
    bodyAuthorityAttackResponse: 9,
    bodyAuthorityRecoveryResponse: 12,
    cueAttackResponse: 14,
    cueFullLateralRoadRate: 0.6,
    cueFullUndersteerRatio: 0.75,
    cueReleaseResponse: 8,
    cueStartUndersteerRatio: 0.15,
    minimumBodyYawAuthority: 0.46,
    poseAuthorityBlend: 0.58,
};

export function createVehicleUndersteerVisualState(): VehicleUndersteerVisualState {
    return {
        bodyYawAuthority: 1,
        bodyYawValue: 0,
        cueIntensity: 0,
        gripAuthorityRatio: 1,
        inputPoseValue: 0,
        poseAuthority: 1,
        poseValue: 0,
    };
}

export function updateVehicleUndersteerVisualState(
    current: VehicleUndersteerVisualState,
    input: VehicleUndersteerVisualInput,
    seconds: number,
    config = DEFAULT_VEHICLE_UNDERSTEER_VISUAL_CONFIG,
): VehicleUndersteerVisualState {
    const active = input.driftState === 'grip';
    const understeerRatio = active ? clamp(input.understeerRatio, 0, 1) : 0;
    const gripAuthorityRatio = active
        ? clamp(input.gripSteerAngleLimit / Math.max(0.01, input.baseGripAngleCap), 0, 1)
        : 1;
    const authorityDemand = smoothstep(clamp(
        understeerRatio / Math.max(0.01, config.cueFullUndersteerRatio),
        0,
        1,
    ));
    const bodyAuthorityTarget = lerp(
        1,
        Math.max(config.minimumBodyYawAuthority, gripAuthorityRatio),
        authorityDemand,
    );
    const bodyYawAuthority = damp(
        current.bodyYawAuthority,
        bodyAuthorityTarget,
        bodyAuthorityTarget < current.bodyYawAuthority
            ? config.bodyAuthorityAttackResponse
            : config.bodyAuthorityRecoveryResponse,
        seconds,
    );
    const poseAuthority = lerp(1, bodyYawAuthority, config.poseAuthorityBlend);
    const cueUndersteerRatio = smoothstep(clamp(
        (understeerRatio - config.cueStartUndersteerRatio) /
            Math.max(0.01, config.cueFullUndersteerRatio - config.cueStartUndersteerRatio),
        0,
        1,
    ));
    const cueLateralRatio = smoothstep(clamp(
        Math.abs(input.lateralVelocityRoadRate) /
            Math.max(0.01, config.cueFullLateralRoadRate),
        0,
        1,
    ));
    const cueTarget = active ? cueUndersteerRatio * cueLateralRatio : 0;
    const cueIntensity = damp(
        current.cueIntensity,
        cueTarget,
        cueTarget > current.cueIntensity
            ? config.cueAttackResponse
            : config.cueReleaseResponse,
        seconds,
    );

    return {
        bodyYawAuthority,
        bodyYawValue: input.physicalSteering * bodyYawAuthority,
        cueIntensity,
        gripAuthorityRatio,
        inputPoseValue: input.physicalSteering,
        poseAuthority,
        poseValue: input.physicalSteering * poseAuthority,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function damp(current: number, target: number, response: number, seconds: number) {
    if (seconds <= 0) return current;
    return lerp(current, target, 1 - Math.exp(-response * seconds));
}

function lerp(start: number, end: number, amount: number) {
    return start + (end - start) * amount;
}

function smoothstep(value: number) {
    return value * value * (3 - 2 * value);
}
