export type RoadSegment = {
    curve: number;
    elevation: number;
    index: number;
    laneCount: number;
    length: number;
};

export type RoadTrack = {
    length: number;
    segmentLength: number;
    segments: RoadSegment[];
};

export const SEGMENT_LENGTH = 240;

const DEFAULT_LANE_COUNT = 2;

type TrackSection = {
    endCurve: number;
    endElevation: number;
    startCurve: number;
    startElevation: number;
    segments: number;
};

const BUGAK_RIDGE_DOWNHILL_SECTIONS: TrackSection[] = [
    { endCurve: 0, endElevation: 540, segments: 8, startCurve: 0, startElevation: 560 },
    { endCurve: 0.22, endElevation: 360, segments: 20, startCurve: 0, startElevation: 540 },
    { endCurve: 0.62, endElevation: 220, segments: 28, startCurve: 0.22, startElevation: 360 },
    { endCurve: 0.1, endElevation: 160, segments: 22, startCurve: 0.62, startElevation: 220 },
    { endCurve: -0.72, endElevation: 10, segments: 34, startCurve: 0.1, startElevation: 160 },
    { endCurve: -0.34, endElevation: -110, segments: 24, startCurve: -0.72, startElevation: 10 },
    { endCurve: 0.58, endElevation: -240, segments: 32, startCurve: -0.34, startElevation: -110 },
    { endCurve: -0.54, endElevation: -360, segments: 34, startCurve: 0.58, startElevation: -240 },
    { endCurve: -0.12, endElevation: -420, segments: 22, startCurve: -0.54, startElevation: -360 },
    { endCurve: 0.36, endElevation: -470, segments: 26, startCurve: -0.12, startElevation: -420 },
    { endCurve: 0, endElevation: -500, segments: 18, startCurve: 0.36, startElevation: -470 },
    { endCurve: 0, endElevation: -500, segments: 16, startCurve: 0, startElevation: -500 },
];

export function createBugakRidgeDownhillTrack(): RoadTrack {
    const segments = BUGAK_RIDGE_DOWNHILL_SECTIONS.flatMap((section) =>
        Array.from({ length: section.segments }, (_, sectionIndex) => ({
            curve: ease(section.startCurve, section.endCurve, sectionIndex, section.segments),
            elevation: ease(section.startElevation, section.endElevation, sectionIndex, section.segments),
            index: sectionIndex,
            laneCount: DEFAULT_LANE_COUNT,
            length: SEGMENT_LENGTH,
        })),
    ).map((segment, index) => ({
        ...segment,
        index,
    }));

    return {
        length: segments.length * SEGMENT_LENGTH,
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
