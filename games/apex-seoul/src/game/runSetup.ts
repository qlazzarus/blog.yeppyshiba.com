export type RunSetup = {
    trackId: string;
    vehicleColor: string;
    vehicleId: string;
};

export type RunSetupInput = Partial<RunSetup> | undefined;

/**
 * Run selection owned by the garage flow. URL parameters remain a fallback for
 * direct development and QA entry points, but normal scene transitions pass
 * this object through Phaser's scene data.
 */
export function resolveRunSetup(input: RunSetupInput, params: URLSearchParams): RunSetup {
    return {
        trackId: input?.trackId ?? params.get('track') ?? 'bugak-ridge-downhill',
        vehicleColor: input?.vehicleColor ?? params.get('vehicleColor') ?? 'blue',
        vehicleId: input?.vehicleId ?? params.get('vehicle') ?? 'raven-coupe',
    };
}
