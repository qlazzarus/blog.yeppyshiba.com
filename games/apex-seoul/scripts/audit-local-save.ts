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
assert.equal(bucket().bestRun?.playerName, 'PLAYER');
assert.equal(new RunRecordStore(() => storage).getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.playerName, 'PLAYER');
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

// Compatible name metadata must not invalidate records created before name entry existed.
const nameStorage = new MemoryStorage();
const nameStore = new RunRecordStore(() => nameStorage);
assert.equal(nameStore.record({ ...run('named'), playerName: 'ABC' }), 'saved');
assert.equal(new RunRecordStore(() => nameStorage).getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.playerName, 'ABC');
assert.equal(nameStore.record({ ...run('bad-name'), playerName: 'A1C' }), 'excluded');
const oldDocument = JSON.parse(nameStorage.getItem(RECORDS_KEY)!);
for (const b of oldDocument.buckets) {
    if (b.bestRun) delete b.bestRun.playerName;
    for (const r of b.recentRuns) delete r.playerName;
}
nameStorage.setItem(RECORDS_KEY, JSON.stringify(oldDocument));
const oldBucket = new RunRecordStore(() => nameStorage).getBucket('bugak-ridge-downhill', 'raven-coupe');
assert.equal(oldBucket.bestRun?.playerName, 'PLAYER');
assert.equal(oldBucket.recentRuns[0].playerName, 'PLAYER');
console.log('PASS: name metadata persistence, validation and missing-name compatibility');

// Previous physics rules remain stored but cannot become a current-rules PB.
for (const oldRules of ['time-attack-v2', 'time-attack-v3', 'time-attack-v4']) {
    const rulesStorage = new MemoryStorage();
    const oldRulesRun = { ...run('old-best', 80), rulesetVersion: oldRules };
    rulesStorage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 1, buckets: [{
        ...createDefaultBuckets()[0], rulesetVersion: oldRules,
        bestRun: oldRulesRun, recentRuns: [oldRulesRun], completedRunCount: 1, totalFinishTimeSec: 80,
    }], legacy: [] }));
    const rulesStore = new RunRecordStore(() => rulesStorage);
    assert.equal(rulesStore.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun, null);
    assert.equal(rulesStore.getBucket('bugak-ridge-downhill', 'raven-coupe', oldRules).bestRun?.runId, 'old-best');
    assert.equal(rulesStore.record(run('current-first', 100)), 'saved');
    const reloadedRules = new RunRecordStore(() => rulesStorage);
    assert.equal(reloadedRules.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.runId, 'current-first');
    assert.equal(reloadedRules.getBucket('bugak-ridge-downhill', 'raven-coupe', oldRules).bestRun?.runId, 'old-best');
}
console.log('PASS: previous handling rules preserved and excluded from current PB');

// DS-07 updates an accepted run in place, independently reporting each document write.
const renameStorage = new MemoryStorage();
const rename = new RunRecordStore(() => renameStorage);
assert.equal(rename.getLastPlayerName(), 'PLAYER');
rename.record(run('rename-best', 80));
rename.record(run('rename-recent', 90));
rename.record(run('untouched', 95, 'mirae-gt'));
const beforeNames = rename.getRecords();
const withoutNames = (document: ReturnType<RunRecordStore['getRecords']>) => {
    for (const b of document.buckets) {
        if (b.bestRun) delete b.bestRun.playerName;
        for (const item of b.recentRuns) delete item.playerName;
    }
    return document;
};
assert.deepEqual(rename.updateRunName('rename-best', 'aBc'), { recordStatus: 'saved', profileStatus: 'saved' });
assert.deepEqual(rename.updateRunName('rename-best', 'ABC'), { recordStatus: 'saved', profileStatus: 'saved' });
assert.deepEqual(withoutNames(rename.getRecords()), withoutNames(beforeNames));
let renamedBucket = rename.getBucket('bugak-ridge-downhill', 'raven-coupe');
assert.equal(renamedBucket.bestRun?.playerName, 'ABC');
assert.equal(renamedBucket.recentRuns.find(item => item.runId === 'rename-best')?.playerName, 'ABC');
assert.equal(renamedBucket.recentRuns.find(item => item.runId === 'rename-recent')?.playerName, 'PLAYER');
assert.equal(rename.getBucket('bugak-ridge-downhill', 'mirae-gt').bestRun?.playerName, 'PLAYER');
assert.equal(rename.updateRunName('rename-recent', 'xyz').recordStatus, 'saved');
assert.equal(rename.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.playerName, 'ABC');
rename.saveSetup({ trackId: 'bugak-ridge-downhill', vehicleId: 'mirae-gt', vehicleColor: 'black' });
assert.equal(new RunRecordStore(() => renameStorage).getLastPlayerName(), 'XYZ');
assert.equal(new RunRecordStore(() => renameStorage).getSetup().vehicleColor, 'black');
const validBytes = [...renameStorage.data];
for (const invalid of ['', 'AB', 'ABCD', ' Aaa', 'A1C', '가나다', 'ＡＢＣ', 'ab\n', 'abc\n', null, 123, {}, 'ßaa']) {
    assert.deepEqual(rename.updateRunName('rename-best', invalid), { recordStatus: 'invalid-name', profileStatus: null });
}
rename.record(run('excluded-name'), false);
assert.equal(rename.updateRunName('excluded-name', 'ABC').recordStatus, 'excluded');
assert.equal(rename.updateRunName('missing', 'ABC').recordStatus, 'excluded');
assert.deepEqual([...renameStorage.data], validBytes);
for (let i = 0; i < 21; i++) rename.record(run(`evict-name-${i}`, 150));
assert.equal(rename.updateRunName('rename-recent', 'AAA').recordStatus, 'excluded');
assert.equal(rename.updateRunName('rename-best', 'pbx').recordStatus, 'saved');
assert.equal(rename.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.playerName, 'PBX');
renameStorage.denied = true;
assert.deepEqual(rename.updateRunName('rename-best', 'mem'), { recordStatus: 'memory-only', profileStatus: 'memory-only' });
assert.equal(rename.getLastPlayerName(), 'MEM');
assert.equal(rename.getBucket('bugak-ridge-downhill', 'raven-coupe').bestRun?.playerName, 'MEM');
renameStorage.denied = false;
assert.equal(rename.updateRunName('rename-best', 'mem').recordStatus, 'saved');
assert.equal(new RunRecordStore(() => renameStorage).getLastPlayerName(), 'MEM');
rename.handleExternalChange(RECORDS_KEY);
const externalBytes = [...renameStorage.data];
assert.deepEqual(rename.updateRunName('rename-best', 'BAD'), { recordStatus: 'external-change', profileStatus: null });
assert.deepEqual([...renameStorage.data], externalBytes);

// Independent document failures preserve the successful write and report partial persistence.
for (const deniedKey of [RECORDS_KEY, PROFILE_KEY]) {
    const partialStorage = new MemoryStorage();
    let blocked = false;
    const partial = new RunRecordStore(() => ({
        get length() { return partialStorage.length; },
        key: index => partialStorage.key(index),
        getItem: key => partialStorage.getItem(key),
        removeItem: key => partialStorage.removeItem(key),
        setItem(key, value) {
            if (blocked && key === deniedKey) throw Error('quota');
            partialStorage.setItem(key, value);
        },
    }));
    partial.record(run('partial'));
    blocked = true;
    assert.deepEqual(partial.updateRunName('partial', 'new'), {
        recordStatus: deniedKey === RECORDS_KEY ? 'memory-only' : 'saved',
        profileStatus: deniedKey === PROFILE_KEY ? 'memory-only' : 'saved',
    });
    blocked = false;
    assert.deepEqual(partial.updateRunName('partial', 'new'), { recordStatus: 'saved', profileStatus: 'saved' });
    assert.equal(partial.getBucket('bugak-ridge-downhill', 'raven-coupe').completedRunCount, 1);
}
const compatibilityStorage = new MemoryStorage();
compatibilityStorage.setItem(PROFILE_KEY, JSON.stringify({ schemaVersion: 1, lastRunSetup: store.getSetup() }));
const compatibility = new RunRecordStore(() => compatibilityStorage);
assert.equal(compatibility.getLastPlayerName(), 'PLAYER');
compatibility.record(run('compat'));
compatibilityStorage.setItem(PROFILE_KEY, JSON.stringify({ schemaVersion: 99, keep: 'future-profile' }));
const futureProfile = new RunRecordStore(() => compatibilityStorage);
assert.deepEqual(futureProfile.updateRunName('compat', 'new'), { recordStatus: 'saved', profileStatus: 'unsupported-version' });
assert(compatibilityStorage.getItem(PROFILE_KEY)?.includes('future-profile'));
compatibilityStorage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 99, keep: 'future-records' }));
const futureNames = new RunRecordStore(() => compatibilityStorage);
assert.deepEqual(futureNames.updateRunName('compat', 'new'), { recordStatus: 'unsupported-version', profileStatus: null });
assert(compatibilityStorage.getItem(RECORDS_KEY)?.includes('future-records'));
const profileExternal = new RunRecordStore(() => renameStorage);
profileExternal.handleExternalChange(PROFILE_KEY);
assert.deepEqual(profileExternal.updateRunName('rename-best', 'ext'), { recordStatus: 'saved', profileStatus: 'external-change' });
assert.equal(new RunRecordStore(() => renameStorage).getLastPlayerName(), 'MEM');
rename.resetRecords();
assert.equal(rename.updateRunName('rename-best', 'ABC').recordStatus, 'excluded');
assert.equal(denied.updateRunName('denied', 'abc').recordStatus, 'memory-only');
console.log('PASS: run-ID name update, ASCII normalization, PB/recent isolation, idempotency, eviction, profile compatibility, partial failure/retry, future/external/denied storage');
assert.equal(expanded.updateRunName('archived', 'ABC').recordStatus, 'excluded');
const ambiguousStorage = new MemoryStorage();
const ambiguousRun = run('ambiguous');
const otherAmbiguousRun = { ...ambiguousRun, vehicleId: 'mirae-gt' };
ambiguousStorage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 1, legacy: [], buckets: [
    { ...createDefaultBuckets()[0], bestRun: ambiguousRun, recentRuns: [ambiguousRun], completedRunCount: 1, totalFinishTimeSec: 100 },
    { ...createDefaultBuckets()[2], bestRun: otherAmbiguousRun, recentRuns: [otherAmbiguousRun], completedRunCount: 1, totalFinishTimeSec: 100 },
] }));
const ambiguous = new RunRecordStore(() => ambiguousStorage);
assert.equal(ambiguous.updateRunName('ambiguous', 'ABC').recordStatus, 'excluded');
assert(ambiguous.getRecords().buckets.every(item => !item.bestRun || item.bestRun.playerName === 'PLAYER'));
console.log('PASS: archived and ambiguous IDs cannot update another record');
