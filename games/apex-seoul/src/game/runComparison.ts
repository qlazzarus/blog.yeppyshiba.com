import { RECORD_RULESET, SAVE_VEHICLES, type RecordBucket, type RunSummary } from './saveDefaults';

export const compareBestRuns = (a: RunSummary, b: RunSummary) =>
    a.finishTimeSec - b.finishTimeSec || Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.runId.localeCompare(b.runId);
export function currentBuckets(buckets: RecordBucket[], trackId: string) {
    return buckets.filter(b => b.trackId === trackId && b.rulesetVersion === RECORD_RULESET && SAVE_VEHICLES.some(v => v === b.vehicleId));
}
export type BestSnapshots = { overall: RunSummary | null; vehicle: RunSummary | null };
export function bestSnapshots(buckets: RecordBucket[], trackId: string, vehicleId: string): BestSnapshots {
    const runs = currentBuckets(buckets, trackId).flatMap(b => b.bestRun ? [b.bestRun] : []).sort(compareBestRuns);
    return { overall: runs[0] ?? null, vehicle: runs.find(r => r.vehicleId === vehicleId) ?? null };
}
export const formatDelta = (current: number | null, reference: number | null | undefined) => {
    if (current == null || reference == null) return '-- NO RECORD';
    const delta = current - reference;
    const rounded = Math.round(Math.abs(delta) * 100) / 100;
    return `${rounded === 0 ? '±' : delta < 0 ? '−' : '+'}${rounded.toFixed(2)}s ${rounded === 0 ? 'TIED' : delta < 0 ? 'AHEAD' : 'BEHIND'}`;
};
export function splitLines(snapshot: BestSnapshots, time: number | null, checkpoint?: number) {
    return (['overall', 'vehicle'] as const).map(scope => {
        const run = snapshot[scope];
        const reference = checkpoint === undefined ? run?.finishTimeSec : run?.checkpointTimesSec[checkpoint];
        return `${scope === 'overall' ? 'ALL' : 'CAR'} PB${run ? ` (${run.vehicleId.split('-')[0].toUpperCase()})` : ''}  ${formatDelta(time, reference)}`;
    }).join('\n');
}
export function finishRecordLabel(time: number, reference: RunSummary | null) {
    return !reference ? 'FIRST RECORD' : time < reference.finishTimeSec ? 'NEW BEST' : time === reference.finishTimeSec ? 'TIED' : 'FINISHED';
}
