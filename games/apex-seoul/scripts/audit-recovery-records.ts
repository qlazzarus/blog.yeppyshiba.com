import assert from 'node:assert/strict';
import { createStuckRecoveryState, updateStuckRecovery } from '../src/game/stuckRecovery';
import { bestSnapshots, splitLines, finishRecordLabel, currentBuckets } from '../src/game/runComparison';
import { createCourseRunState, updateCourseRunProgress } from '../src/game/courseRun';
import { RunRecordStore, RECORDS_KEY } from '../src/game/runRecord';
import { RECORD_RULESET, type RunSummary } from '../src/game/saveDefaults';
const input = { active: true, attempting: true, contact: true, z: 100, x: 200 };
for (const fps of [30, 60, 120]) {
    const state = createStuckRecoveryState();
    let frame = 0;
    while (!updateStuckRecovery(state, input, 1 / fps) && frame++ < fps * 5) {}
    assert(Math.abs((frame + 1) / fps - 3.5) <= 1 / fps);
    assert.equal(state.count, 1);
    for (let i = 0; i < fps; i++) assert.equal(updateStuckRecovery(state, input, 1 / fps), false);
    for (const override of [{ attempting: false }, { active: false }, { contact: false }]) {
        const s = createStuckRecoveryState();
        for (let i = 0; i < fps * 8; i++) assert.equal(updateStuckRecovery(s, { ...input, ...override }, 1 / fps), false);
    }
    const moving = createStuckRecoveryState();
    for (let i = 0; i < fps * 8; i++) assert.equal(updateStuckRecovery(moving, { ...input, z: 100 - i * 20 / fps }, 1 / fps), false);
    const config = { checkpointRatios: [0.25, 0.5, 0.75], countdownSeconds: 0, finishRatio: 1 };
    const run = createCourseRunState(config, true);
    for (let frame = 1; !run.finished; frame++) updateCourseRunProgress(run, frame / fps / 7.123, 1 / fps, config);
    assert(Math.abs(run.finishTimeSec! - 7.123) < 1e-8);
    assert(Math.abs(run.checkpointTimesSec[0]! - 7.123 / 4) < 1e-8);
}
const data = new Map<string, string>();
const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); }, key: (i: number) => [...data.keys()][i] ?? null, get length() { return data.size; } };
const store = new RunRecordStore(() => storage);
const run = (id: string, vehicleId: string, finishTimeSec: number): RunSummary => ({ runId: id, vehicleId, trackId: 'bugak-ridge-downhill', vehicleColor: 'blue', rulesetVersion: RECORD_RULESET, finishedAt: '2026-09-13T00:00:00Z', finishTimeSec, checkpointTimesSec: [20, 40, 60] });
assert.equal(store.record({ ...run('invalid', 'raven-coupe', 100), recoveryCount: -1 }), 'excluded');
store.record(run('raven', 'raven-coupe', 100));
store.record({ ...run('mirae', 'mirae-gt', 90), recoveryCount: 2 });
const snapshot = bestSnapshots(store.getRecords().buckets, 'bugak-ridge-downhill', 'raven-coupe');
assert.equal(snapshot.overall?.runId, 'mirae'); assert.equal(snapshot.vehicle?.runId, 'raven');
assert(splitLines(snapshot, 19, 0).includes('−1.00s AHEAD'));
assert.equal(finishRecordLabel(90, snapshot.overall), 'TIED');
for (let i = 0; i < 21; i++) store.record(run(`slow-${i}`, 'mirae-gt', 110));
assert.equal(bestSnapshots(store.getRecords().buckets, 'bugak-ridge-downhill', 'mirae-gt').overall?.runId, 'mirae');
store.record(run('new', 'raven-coupe', 80));
assert.equal(snapshot.overall?.finishTimeSec, 90);
assert.equal(bestSnapshots(store.getRecords().buckets, 'bugak-ridge-downhill', 'seorin-gt').vehicle, null);
const reloaded = new RunRecordStore(() => storage);
assert.equal(reloaded.getBucket('bugak-ridge-downhill', 'mirae-gt').bestRun?.recoveryCount, 2);
assert.equal(reloaded.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.recoveryCount, 0);
const raw = JSON.parse(data.get(RECORDS_KEY)!); raw.buckets[0].rulesetVersion = 'time-attack-v1';
assert.equal(currentBuckets(raw.buckets, 'bugak-ridge-downhill').length, 2);
console.log('PASS: recovery timing/false positives, frame-independent splits, PB snapshots, history eviction, recovery persistence');
