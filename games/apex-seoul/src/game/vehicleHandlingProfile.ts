import type { VehicleEngineProfile } from './engineProfile';

/** Vehicle-specific character applied to the shared cornering controller. */
export type VehicleHandlingProfile = {
    id: string;
    steeringResponseScale: number;
    highSpeedStabilityScale: number;
    liftRotationScale: number;
    /** Applies only once a turbo has reached the authored boost threshold. */
    powerExitTractionScale: number;
    powerExitBoostThreshold: number;
};

export const RAVEN_COUPE_HANDLING_PROFILE: VehicleHandlingProfile = {
    id: 'raven-coupe-na', steeringResponseScale: 1.06, highSpeedStabilityScale: 0.92,
    liftRotationScale: 1.1, powerExitTractionScale: 1, powerExitBoostThreshold: 1,
};

export const SEORIN_GT_HANDLING_PROFILE: VehicleHandlingProfile = {
    id: 'seorin-gt-twin-turbo', steeringResponseScale: 0.97, highSpeedStabilityScale: 1.12,
    liftRotationScale: 0.88, powerExitTractionScale: 1.03, powerExitBoostThreshold: 0.58,
};

export const MIRAE_GT_HANDLING_PROFILE: VehicleHandlingProfile = {
    id: 'mirae-gt-single-turbo', steeringResponseScale: 0.94, highSpeedStabilityScale: 1.02,
    liftRotationScale: 0.94, powerExitTractionScale: 1.16, powerExitBoostThreshold: 0.7,
};

export function getVehicleHandlingProfile(engineProfile: VehicleEngineProfile) {
    switch (engineProfile.id) {
        case 'seorin-gt-twin-turbo': return SEORIN_GT_HANDLING_PROFILE;
        case 'mirae-gt-single-turbo': return MIRAE_GT_HANDLING_PROFILE;
        default: return RAVEN_COUPE_HANDLING_PROFILE;
    }
}
