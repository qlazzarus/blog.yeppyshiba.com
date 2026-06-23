export type RoadSegment = {
    curve: number;
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
    startCurve: number;
    segments: number;
};

const TEST_TRACK_SECTIONS: TrackSection[] = [
    { endCurve: 0, segments: 20, startCurve: 0 },
    { endCurve: 0.48, segments: 28, startCurve: 0 },
    { endCurve: 0.48, segments: 30, startCurve: 0.48 },
    { endCurve: 0, segments: 24, startCurve: 0.48 },
    { endCurve: 0, segments: 14, startCurve: 0 },
    { endCurve: -0.52, segments: 32, startCurve: 0 },
    { endCurve: -0.52, segments: 34, startCurve: -0.52 },
    { endCurve: 0, segments: 28, startCurve: -0.52 },
    { endCurve: 0.38, segments: 22, startCurve: 0 },
    { endCurve: -0.38, segments: 34, startCurve: 0.38 },
    { endCurve: 0, segments: 24, startCurve: -0.38 },
    { endCurve: 0, segments: 32, startCurve: 0 },
];

export function createTestTrack(): RoadTrack {
    const segments = TEST_TRACK_SECTIONS.flatMap((section) =>
        Array.from({ length: section.segments }, (_, sectionIndex) => ({
            curve: ease(section.startCurve, section.endCurve, sectionIndex, section.segments),
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
