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
    { endCurve: 0, endElevation: 540, segments: 8, startCurve: 0, startElevation: 560 },
    // R2: alternate short commitments with recoveries. The total length and
    // downhill elevation budget are retained, while long one-direction runs
    // are removed so the next corner can be read before it arrives.
    { endCurve: 0.22, endElevation: 410, segments: 18, startCurve: 0, startElevation: 540 },
    { endCurve: 0.66, endElevation: 300, endRoadHalfWidth: 820, segments: 14, startCurve: 0.22, startElevation: 410, startRoadHalfWidth: 960 },
    { endCurve: 0.04, endElevation: 250, endRoadHalfWidth: 900, segments: 10, startCurve: 0.66, startElevation: 300, startRoadHalfWidth: 820 },
    { endCurve: -0.62, endElevation: 160, endRoadHalfWidth: 820, segments: 12, startCurve: 0.04, startElevation: 250, startRoadHalfWidth: 900 },
    { endCurve: -0.2, endElevation: 95, endRoadHalfWidth: 900, segments: 10, startCurve: -0.62, startElevation: 160, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: 60, endRoadHalfWidth: 960, segments: 10, startCurve: -0.2, startElevation: 95, startRoadHalfWidth: 900 },
    { endCurve: 0.64, endElevation: -20, endRoadHalfWidth: 820, segments: 14, startCurve: 0, startElevation: 60, startRoadHalfWidth: 960 },
    { endCurve: 0.16, endElevation: -75, endRoadHalfWidth: 900, segments: 10, startCurve: 0.64, startElevation: -20, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: -110, endRoadHalfWidth: 960, segments: 10, startCurve: 0.16, startElevation: -75, startRoadHalfWidth: 900 },
    { endCurve: -0.66, endElevation: -185, endRoadHalfWidth: 820, segments: 14, startCurve: 0, startElevation: -110, startRoadHalfWidth: 960 },
    { endCurve: -0.16, endElevation: -245, endRoadHalfWidth: 900, segments: 10, startCurve: -0.66, startElevation: -185, startRoadHalfWidth: 820 },
    { endCurve: 0.03, endElevation: -300, endRoadHalfWidth: 960, segments: 12, startCurve: -0.16, startElevation: -245, startRoadHalfWidth: 900 },
    { endCurve: 0.5, endElevation: -355, endRoadHalfWidth: 870, segments: 16, startCurve: 0.03, startElevation: -300, startRoadHalfWidth: 960 },
    { endCurve: 0.08, endElevation: -390, endRoadHalfWidth: 920, segments: 12, startCurve: 0.5, startElevation: -355, startRoadHalfWidth: 870 },
    { endCurve: -0.56, endElevation: -435, endRoadHalfWidth: 820, segments: 14, startCurve: 0.08, startElevation: -390, startRoadHalfWidth: 920 },
    { endCurve: -0.1, endElevation: -465, endRoadHalfWidth: 960, segments: 10, startCurve: -0.56, startElevation: -435, startRoadHalfWidth: 820 },
    { endCurve: 0, endElevation: -475, segments: 18, startCurve: -0.1, startElevation: -465 },
    { endCurve: 0.56, endElevation: -485, endRoadHalfWidth: 820, segments: 16, startCurve: 0, startElevation: -475, startRoadHalfWidth: 960 },
    { endCurve: 0.12, endElevation: -492, endRoadHalfWidth: 900, segments: 10, startCurve: 0.56, startElevation: -485, startRoadHalfWidth: 820 },
    { endCurve: -0.5, endElevation: -498, endRoadHalfWidth: 870, segments: 12, startCurve: 0.12, startElevation: -492, startRoadHalfWidth: 900 },
    { endCurve: -0.08, endElevation: -500, endRoadHalfWidth: 960, segments: 10, startCurve: -0.5, startElevation: -498, startRoadHalfWidth: 870 },
    { endCurve: 0, endElevation: -500, segments: 14, startCurve: -0.08, startElevation: -500 },
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
