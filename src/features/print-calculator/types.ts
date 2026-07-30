export type PathEstimate = {
    perimeterMm: number;
    sampledLayers: number;
    totalLayers: number;
    segments: number;
    closedLoops: number;
    outerLoops: number;
    holeLoops: number;
    openChains: number;
    invalidSegments: number;
    sampled: boolean;
};
