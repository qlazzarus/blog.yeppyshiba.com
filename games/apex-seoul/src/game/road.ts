export type RoadSegment = {
    curve: number;
    elevation: number;
    index: number;
    laneCount: number;
    length: number;
    roadHalfWidth: number;
};

export type RoadTrack = {
    id: RoadTrackId;
    length: number;
    name: string;
    segmentLength: number;
    segments: RoadSegment[];
};

export type RoadHeadingPreview = {
    demandCurve: number;
    farTangentChange: number;
    nearTangentChange: number;
};

export const SEGMENT_LENGTH = 240;

const DEFAULT_LANE_COUNT = 2;
export const DEFAULT_ROAD_HALF_WIDTH = 960;

export type RoadTrackId = 'bugak-ridge-downhill' | 'elevation-test';

type TrackSection = {
    endCurve: number;
    endElevation: number;
    endRoadHalfWidth?: number;
    startCurve: number;
    startElevation: number;
    startRoadHalfWidth?: number;
    segments: number;
};

const BUGAK_RIDGE_DOWNHILL_BASELINE_SECTIONS: TrackSection[] = [
    { endCurve: 0, endElevation: 540, segments: 16, startCurve: 0, startElevation: 560 },

    // CSS-2/4: short commitments separated by long fast recoveries. Peak
    // grades and the total downhill budget stay intact, but no single turn
    // holds the player in one visual state for ten seconds.
    { endCurve: 0.22, endElevation: 500, segments: 7, startCurve: 0, startElevation: 540 },
    { endCurve: 0.66, endElevation: 440, endRoadHalfWidth: 820, segments: 7, startCurve: 0.22, startElevation: 500, startRoadHalfWidth: 960 },
    { endCurve: 0.04, endElevation: 410, endRoadHalfWidth: 900, segments: 6, startCurve: 0.66, startElevation: 440, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: 350, endRoadHalfWidth: 960, segments: 24, startCurve: 0.04, startElevation: 410, startRoadHalfWidth: 900 },

    { endCurve: -0.62, endElevation: 290, endRoadHalfWidth: 820, segments: 9, startCurve: 0, startElevation: 350, startRoadHalfWidth: 960 },
    { endCurve: -0.1, endElevation: 255, endRoadHalfWidth: 900, segments: 7, startCurve: -0.62, startElevation: 290, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: 200, endRoadHalfWidth: 960, segments: 26, startCurve: -0.1, startElevation: 255, startRoadHalfWidth: 900 },

    { endCurve: 0.64, endElevation: 140, endRoadHalfWidth: 820, segments: 9, startCurve: 0, startElevation: 200, startRoadHalfWidth: 960 },
    { endCurve: 0.1, endElevation: 105, endRoadHalfWidth: 900, segments: 7, startCurve: 0.64, startElevation: 140, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: 50, endRoadHalfWidth: 960, segments: 24, startCurve: 0.1, startElevation: 105, startRoadHalfWidth: 900 },

    { endCurve: -0.66, endElevation: -20, endRoadHalfWidth: 820, segments: 9, startCurve: 0, startElevation: 50, startRoadHalfWidth: 960 },
    { endCurve: -0.1, endElevation: -60, endRoadHalfWidth: 900, segments: 7, startCurve: -0.66, startElevation: -20, startRoadHalfWidth: 820 },
    { endCurve: 0.03, endElevation: -115, endRoadHalfWidth: 960, segments: 28, startCurve: -0.1, startElevation: -60, startRoadHalfWidth: 900 },

    { endCurve: 0.5, endElevation: -165, endRoadHalfWidth: 870, segments: 10, startCurve: 0.03, startElevation: -115, startRoadHalfWidth: 960 },
    { endCurve: 0.08, endElevation: -195, endRoadHalfWidth: 920, segments: 8, startCurve: 0.5, startElevation: -165, startRoadHalfWidth: 870 },
    { endCurve: -0.56, endElevation: -240, endRoadHalfWidth: 820, segments: 10, startCurve: 0.08, startElevation: -195, startRoadHalfWidth: 920 },
    { endCurve: -0.1, endElevation: -270, endRoadHalfWidth: 960, segments: 8, startCurve: -0.56, startElevation: -240, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: -325, segments: 28, startCurve: -0.1, startElevation: -270 },

    { endCurve: 0.56, endElevation: -370, endRoadHalfWidth: 820, segments: 10, startCurve: 0, startElevation: -325, startRoadHalfWidth: 960 },
    { endCurve: 0.12, endElevation: -395, endRoadHalfWidth: 900, segments: 8, startCurve: 0.56, startElevation: -370, startRoadHalfWidth: 820 },
    { endCurve: -0.5, endElevation: -430, endRoadHalfWidth: 870, segments: 10, startCurve: 0.12, startElevation: -395, startRoadHalfWidth: 900 },
    { endCurve: -0.08, endElevation: -450, endRoadHalfWidth: 960, segments: 8, startCurve: -0.5, startElevation: -430, startRoadHalfWidth: 870 },

    // A fast, low-demand S sector adds course length and direction changes
    // without extending another sharp commitment.
    { endCurve: 0.28, endElevation: -465, segments: 10, startCurve: -0.08, startElevation: -450 },
    { endCurve: -0.24, endElevation: -480, segments: 10, startCurve: 0.28, startElevation: -465 },
    { endCurve: 0, endElevation: -490, segments: 10, startCurve: -0.24, startElevation: -480 },
    { endCurve: 0, endElevation: -500, segments: 32, startCurve: 0, startElevation: -490 },
];

const BUGAK_RIDGE_DOWNHILL_SECTIONS = BUGAK_RIDGE_DOWNHILL_BASELINE_SECTIONS;

const ELEVATION_TEST_SECTIONS: TrackSection[] = [
    { endCurve: 0, endElevation: 620, segments: 8, startCurve: 0, startElevation: 620 },
    { endCurve: 0.78, endElevation: 300, segments: 16, startCurve: 0, startElevation: 620 },
    { endCurve: -0.82, endElevation: 40, segments: 14, startCurve: 0.78, startElevation: 300 },
    { endCurve: -0.25, endElevation: 260, segments: 12, startCurve: -0.82, startElevation: 40 },
    { endCurve: 0.72, endElevation: -80, segments: 18, startCurve: -0.25, startElevation: 260 },
    { endCurve: 0.1, endElevation: -260, segments: 10, startCurve: 0.72, startElevation: -80 },
    { endCurve: 0, endElevation: 620, segments: 24, startCurve: 0.1, startElevation: -260 },
];

export function createBugakRidgeDownhillTrack(): RoadTrack {
    return createTrackFromSections(
        'bugak-ridge-downhill',
        'Bugak Ridge Downhill',
        BUGAK_RIDGE_DOWNHILL_SECTIONS,
    );
}

export function createElevationTestTrack(): RoadTrack {
    return createTrackFromSections(
        'elevation-test',
        'Elevation Test Hairpins',
        ELEVATION_TEST_SECTIONS,
    );
}

export function createRoadTrack(trackId: RoadTrackId): RoadTrack {
    if (trackId === 'elevation-test') return createElevationTestTrack();

    return createBugakRidgeDownhillTrack();
}

export function parseRoadTrackId(value: string | null): RoadTrackId {
    if (value === 'elevation-test') return value;

    return 'bugak-ridge-downhill';
}

function createTrackFromSections(id: RoadTrackId, name: string, sections: TrackSection[]): RoadTrack {
    const segments = sections.flatMap((section) =>
        Array.from({ length: section.segments }, (_, sectionIndex) => ({
            curve: ease(section.startCurve, section.endCurve, sectionIndex, section.segments),
            elevation: ease(section.startElevation, section.endElevation, sectionIndex, section.segments),
            index: sectionIndex,
            laneCount: DEFAULT_LANE_COUNT,
            length: SEGMENT_LENGTH,
            roadHalfWidth: ease(
                section.startRoadHalfWidth ?? DEFAULT_ROAD_HALF_WIDTH,
                section.endRoadHalfWidth ?? DEFAULT_ROAD_HALF_WIDTH,
                sectionIndex,
                section.segments,
            ),
        })),
    ).map((segment, index) => ({
        ...segment,
        index,
    }));

    return {
        id,
        length: segments.length * SEGMENT_LENGTH,
        name,
        segmentLength: SEGMENT_LENGTH,
        segments,
    };
}

export const createTestTrack = createBugakRidgeDownhillTrack;

export function getRoadSegment(track: RoadTrack, absoluteIndex: number) {
    const index = wrapIndex(absoluteIndex, track.segments.length);

    return track.segments[index];
}

export function getCameraSegmentIndex(track: RoadTrack, cameraZ: number) {
    return wrapIndex(Math.floor(cameraZ / track.segmentLength), track.segments.length);
}

export function getCameraSegmentProgress(track: RoadTrack, cameraZ: number) {
    const localZ = wrapDistance(cameraZ, track.segmentLength);

    return localZ / track.segmentLength;
}

export function getRoadElevationAt(track: RoadTrack, worldZ: number) {
    const segmentIndex = Math.floor(worldZ / track.segmentLength);
    const progress = getCameraSegmentProgress(track, worldZ);
    const current = getRoadSegment(track, segmentIndex);
    const next = getRoadSegment(track, segmentIndex + 1);

    return current.elevation + (next.elevation - current.elevation) * progress;
}

export function getRoadCurveAt(track: RoadTrack, worldZ: number) {
    const segmentIndex = Math.floor(worldZ / track.segmentLength);
    const progress = getCameraSegmentProgress(track, worldZ);
    const current = getRoadSegment(track, segmentIndex);
    const next = getRoadSegment(track, segmentIndex + 1);

    return current.curve + (next.curve - current.curve) * progress;
}

export function getRoadHeadingPreview(
    track: RoadTrack,
    worldZ: number,
    nearDistance = SEGMENT_LENGTH * 2,
    farDistance = SEGMENT_LENGTH * 6,
): RoadHeadingPreview {
    const safeNearDistance = Math.max(SEGMENT_LENGTH * 0.5, nearDistance);
    const safeFarDistance = Math.max(safeNearDistance, farDistance);
    const sampleStep = SEGMENT_LENGTH * 0.5;
    let distance = 0;
    let previousCurve = getRoadCurveAt(track, worldZ);
    let nearIntegral = 0;
    let farIntegral = 0;

    while (distance < safeFarDistance) {
        const nextDistance = Math.min(safeFarDistance, distance + sampleStep);
        const nextCurve = getRoadCurveAt(track, worldZ + nextDistance);
        const span = nextDistance - distance;
        const integral = (previousCurve + nextCurve) * 0.5 * span;

        farIntegral += integral;
        if (distance < safeNearDistance) {
            const nearSpan = Math.min(nextDistance, safeNearDistance) - distance;
            const nearProgress = span <= 0 ? 0 : nearSpan / span;
            const nearEndCurve = previousCurve +
                (nextCurve - previousCurve) * nearProgress;
            nearIntegral += (previousCurve + nearEndCurve) * 0.5 * nearSpan;
        }

        distance = nextDistance;
        previousCurve = nextCurve;
    }

    const nearTangentChange = nearIntegral / SEGMENT_LENGTH;
    const farTangentChange = farIntegral / SEGMENT_LENGTH;
    const nearMeanCurve = nearIntegral / safeNearDistance;
    const farMeanCurve = farIntegral / safeFarDistance;

    return {
        demandCurve: nearMeanCurve * 0.68 + farMeanCurve * 0.32,
        farTangentChange,
        nearTangentChange,
    };
}

export function getRoadHalfWidthAt(track: RoadTrack, worldZ: number) {
    const segmentIndex = Math.floor(worldZ / track.segmentLength);
    const progress = getCameraSegmentProgress(track, worldZ);
    const current = getRoadSegment(track, segmentIndex);
    const next = getRoadSegment(track, segmentIndex + 1);

    return current.roadHalfWidth + (next.roadHalfWidth - current.roadHalfWidth) * progress;
}

export function wrapDistance(value: number, length: number) {
    return ((value % length) + length) % length;
}

function wrapIndex(index: number, length: number) {
    return ((index % length) + length) % length;
}

function ease(start: number, end: number, index: number, length: number) {
    if (length <= 1) return end;

    const t = index / (length - 1);
    const smooth = t * t * (3 - 2 * t);

    return start + (end - start) * smooth;
}
