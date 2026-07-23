export const LONGITUDINAL_UNIT_SCALE_CANDIDATES = Object.freeze([
    1, 1.5, 2, 3,
] as const);

export const DEFAULT_LONGITUDINAL_UNIT_SCALE = LONGITUDINAL_UNIT_SCALE_CANDIDATES[2];

export type LongitudinalUnitScale = (typeof LONGITUDINAL_UNIT_SCALE_CANDIDATES)[number];

export type LongitudinalProgressionConfig = {
    candidateId: `U${number}`;
    diagnosticUpperBound: boolean;
    requestedScale: number | null;
    scale: LongitudinalUnitScale;
    usedFallback: boolean;
};

export function createLongitudinalProgressionConfig(
    params: URLSearchParams,
): LongitudinalProgressionConfig {
    const rawScale = params.get('longitudinalScale');
    const requestedScale = readRequestedScale(rawScale);
    const candidateIndex = LONGITUDINAL_UNIT_SCALE_CANDIDATES.findIndex(
        (candidate) => candidate === requestedScale,
    );
    const defaultIndex = LONGITUDINAL_UNIT_SCALE_CANDIDATES.indexOf(
        DEFAULT_LONGITUDINAL_UNIT_SCALE,
    );
    const resolvedIndex = candidateIndex >= 0 ? candidateIndex : defaultIndex;
    const scale = LONGITUDINAL_UNIT_SCALE_CANDIDATES[resolvedIndex];

    return {
        candidateId: `U${resolvedIndex}`,
        diagnosticUpperBound:
            resolvedIndex === LONGITUDINAL_UNIT_SCALE_CANDIDATES.length - 1,
        requestedScale,
        scale,
        usedFallback: rawScale !== null && candidateIndex < 0,
    };
}

export function getLongitudinalWorldTravelSpeed(
    physicalSpeed: number,
    scale: LongitudinalUnitScale,
) {
    if (!Number.isFinite(physicalSpeed)) return 0;

    return Math.max(0, physicalSpeed) * scale;
}

export function getNextLongitudinalUnitScale(
    current: LongitudinalUnitScale,
): LongitudinalUnitScale {
    const currentIndex = LONGITUDINAL_UNIT_SCALE_CANDIDATES.indexOf(current);
    const nextIndex =
        currentIndex < 0
            ? 0
            : (currentIndex + 1) % LONGITUDINAL_UNIT_SCALE_CANDIDATES.length;

    return LONGITUDINAL_UNIT_SCALE_CANDIDATES[nextIndex];
}

function readRequestedScale(rawValue: string | null) {
    if (rawValue === null) return null;

    const parsed = Number(rawValue);

    return Number.isFinite(parsed) ? parsed : null;
}
