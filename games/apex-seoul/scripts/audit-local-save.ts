import assert from 'node:assert/strict';
import { RunRecordStore, RECORDS_KEY, PROFILE_KEY } from '../src/game/runRecord';
import { createDefaultBuckets, RECORD_RULESET, type RunSummary } from '../src/game/saveDefaults';

class MemoryStorage {
    data = new Map<string, string>();
    denied = false;
    get length() { return this.data.size; }
    key(index: number) { return [...this.data.keys()][index] ?? null; }
    getItem(key: string) { return this.data.get(key) ?? null; }
    setItem(key: string, value: string) { if (this.denied) throw Error('denied'); this.data.set(key, value); }
    removeItem(key: string) { if (this.denied) throw Error('denied'); this.data.delete(key); }
}
const storage = new MemoryStorage();
const store = new RunRecordStore(() => storage);
const run = (id: string, time = 100, vehicleId = 'raven-coupe'): RunSummary => ({
    trackId: 'bugak-ridge-downhill', vehicleId, rulesetVersion: RECORD_RULESET,
    runId: id, finishedAt: '2026-09-11T00:00:00.000Z', vehicleColor: 'blue',
    finishTimeSec: time, checkpointTimesSec: [time / 4, time / 2, time * 0.75],
});
const bucket = () => store.getBucket('bugak-ridge-downhill', 'raven-coupe');
assert.equal(store.getRecords().buckets.length, 3);
assert.equal(store.record(run('first')), 'saved');
assert.equal(store.record(run('first')), 'saved');
assert.equal(bucket().completedRunCount, 1);
store.record(run('slower', 110));
store.record({ ...run('tie'), vehicleColor: 'red' });
assert.equal(bucket().bestRun?.runId, 'first');
store.record(run('faster', 90));
assert.equal(bucket().bestRun?.runId, 'faster');
for (let i = 0; i < 25; i++) store.record(run(`recent-${i}`, 120));
assert.equal(bucket().recentRuns.length, 20);
assert.equal(bucket().completedRunCount, 29);
assert.equal(bucket().bestRun?.runId, 'faster');
store.record(run('other', 80, 'mirae-gt'));
assert.equal(bucket().bestRun?.finishTimeSec, 90);
assert.equal(store.record(run('qa', 1), false), 'excluded');
assert.equal(store.record({ ...run('test'), trackId: 'elevation-test' }), 'excluded');
assert.equal(store.record({ ...run('bad'), checkpointTimesSec: [20, 10, 50] }), 'excluded');
assert.equal(store.record({ ...run('bad2'), finishTimeSec: NaN }), 'excluded');
store.saveSetup({ trackId: 'bugak-ridge-downhill', vehicleId: 'mirae-gt', vehicleColor: 'red' });
assert.equal(new RunRecordStore(() => storage).getSetup().vehicleId, 'mirae-gt');
assert.equal(new RunRecordStore(() => storage).getBucket('bugak-ridge-downhill', 'raven-coupe').completedRunCount, 29);
storage.setItem('unrelated', 'keep');
assert.equal(store.resetRecords(), 'saved');
assert.deepEqual(new RunRecordStore(() => storage).getRecords().buckets, createDefaultBuckets());
assert.equal(store.getSetup().vehicleId, 'mirae-gt');
assert.equal(storage.getItem('unrelated'), 'keep');
assert(storage.getItem(PROFILE_KEY));
const exposed = store.getRecords(); exposed.buckets[0].completedRunCount = 999;
assert.equal(bucket().completedRunCount, 0);

storage.denied = true;
assert.equal(store.record(run('memory')), 'memory-only');
assert.equal(bucket().bestRun?.finishTimeSec, 100);
assert.equal(store.resetRecords(), 'memory-only');
assert.equal(bucket().bestRun, null);
storage.denied = false;
store.resetRecords();
store.handleExternalChange(RECORDS_KEY);
assert.equal(store.record(run('stale')), 'external-change');
assert.equal(bucket().completedRunCount, 0);
store.resetRecords();

storage.setItem(RECORDS_KEY, '{broken');
assert.deepEqual(new RunRecordStore(() => storage).getRecords().buckets, createDefaultBuckets());
storage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 99, payload: 'preserve' }));
const future = new RunRecordStore(() => storage);
assert.equal(future.record(run('future')), 'unsupported-version');
assert(storage.getItem(RECORDS_KEY)?.includes('preserve'));
assert.equal(future.resetRecords(), 'saved');

storage.removeItem(RECORDS_KEY);
storage.setItem('apex-seoul:best-run:bugak-ridge-downhill', '75');
const legacy = new RunRecordStore(() => storage);
assert.equal(legacy.getRecords().legacy.length, 1);
assert.equal(legacy.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun, null);
assert.equal(storage.getItem('apex-seoul:best-run:bugak-ridge-downhill'), null);
legacy.resetRecords();
assert.equal(new RunRecordStore(() => storage).getRecords().legacy.length, 0);
const denied = new RunRecordStore(() => { throw Error('read denied'); });
assert.equal(denied.getRecords().buckets.length, 3);
assert.equal(denied.record(run('denied')), 'memory-only');
assert.equal(denied.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.finishTimeSec, 100);
// New defaults are merged with saved buckets; old courses/rules remain separate.
const archivedRun = { ...run('archived'), trackId: 'future-course-fixture', rulesetVersion: 'old-rules' };
storage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 1, buckets: [
    { ...createDefaultBuckets()[0], trackId: archivedRun.trackId, rulesetVersion: archivedRun.rulesetVersion, bestRun: archivedRun, completedRunCount: 1, totalFinishTimeSec: 100 },
    { ...createDefaultBuckets()[1], completedRunCount: -1 },
], legacy: [] }));
const expanded = new RunRecordStore(() => storage);
assert.equal(expanded.getRecords().buckets.length, 4);
assert.equal(expanded.getBucket('bugak-ridge-downhill', 'seorin-gt').completedRunCount, 0);
assert.equal(expanded.getBucket('future-course-fixture', 'raven-coupe', 'old-rules').bestRun?.runId, 'archived');
assert.equal(expanded.getBucket('future-course-fixture', 'raven-coupe').bestRun, null);
console.log('PASS: vehicle isolation, PB/ties/history, duplicate finish, reload, profile, reset, defaults, QA exclusion, corrupt/denied/future storage, legacy, external reset');
