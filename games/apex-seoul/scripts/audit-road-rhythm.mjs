import {
    createBugakRidgeDownhillTrack,
    DEFAULT_ROAD_HALF_WIDTH,
} from '../src/game/road.ts';

const COMMITMENT_THRESHOLD = 0.55;
const RECOVERY_THRESHOLD = 0.16;
const MIN_RECOVERY_SEGMENTS = 8;

const track = createBugakRidgeDownhillTrack();
const classifications = track.segments.map((segment) => classifySegment(segment.curve));
const runs = collectRuns(classifications);
const commitmentRuns = runs.filter((run) => run.kind === 'left' || run.kind === 'right')
    .filter((run) => run.peakCurve >= COMMITMENT_THRESHOLD);
const recoveryRuns = runs.filter((run) => run.kind === 'recovery');
const reversals = collectReversals(commitmentRuns);

const report = {
    assumptions: {
        commitmentThreshold: COMMITMENT_THRESHOLD,
        minRecoverySegments: MIN_RECOVERY_SEGMENTS,
        recoveryThreshold: RECOVERY_THRESHOLD,
    },
    laneDemand: {
        // Road segments currently describe only curve/elevation. They contain no
        // target lateral line or width profile, so a fixed road-relative lane is
        // never invalidated by track data alone.
        forcedLaneTransitions: 0,
        model: 'road-relative lateral offset; no per-segment line target',
    },
    rhythm: {
        commitmentRuns: commitmentRuns.map(summarizeRun),
        commitmentRunCount: commitmentRuns.length,
        longestSameDirectionCommitmentSegments: Math.max(
            0,
            ...commitmentRuns.map((run) => run.length),
        ),
        recoveryRuns: recoveryRuns.map(summarizeRun),
        recoveryRunsAtLeastMinimum: recoveryRuns.filter((run) => run.length >= MIN_RECOVERY_SEGMENTS).length,
        reversals,
        reversalCount: reversals.length,
        reversalsWithRecovery: reversals.filter((reversal) => reversal.recoverySegments >= MIN_RECOVERY_SEGMENTS).length,
    },
    track: {
        narrowestHalfWidth: Math.min(...track.segments.map((segment) => segment.roadHalfWidth)),
        narrowestWidthRatio: Number((
            Math.min(...track.segments.map((segment) => segment.roadHalfWidth)) / DEFAULT_ROAD_HALF_WIDTH
        ).toFixed(4)),
        narrowedSegments: track.segments.filter(
            (segment) => segment.roadHalfWidth < DEFAULT_ROAD_HALF_WIDTH - 1,
        ).length,
        id: track.id,
        length: track.length,
        segmentLength: track.segmentLength,
        segments: track.segments.length,
    },
};

console.log(JSON.stringify(report, null, 2));

function classifySegment(curve) {
    if (Math.abs(curve) < RECOVERY_THRESHOLD) return 'recovery';

    return curve > 0 ? 'right' : 'left';
}

function collectRuns(values) {
    const runs = [];
    let start = 0;

    for (let index = 1; index <= values.length; index += 1) {
        if (index < values.length && values[index] === values[start]) continue;

        const segments = track.segments.slice(start, index);
        runs.push({
            endSegment: index - 1,
            kind: values[start],
            length: index - start,
            peakCurve: Math.max(...segments.map((segment) => Math.abs(segment.curve))),
            startSegment: start,
        });
        start = index;
    }

    return runs;
}

function collectReversals(runs) {
    const reversals = [];

    for (let index = 1; index < runs.length; index += 1) {
        const previous = runs[index - 1];
        const next = runs[index];
        const between = classifications.slice(previous.endSegment + 1, next.startSegment);

        if (previous.kind === next.kind) continue;

        reversals.push({
            from: previous.kind,
            recoverySegments: between.filter((kind) => kind === 'recovery').length,
            to: next.kind,
            transitionSegments: next.startSegment - previous.endSegment - 1,
        });
    }

    return reversals;
}

function summarizeRun(run) {
    return {
        endSegment: run.endSegment,
        length: run.length,
        peakCurve: Number(run.peakCurve.toFixed(3)),
        startSegment: run.startSegment,
    };
}
