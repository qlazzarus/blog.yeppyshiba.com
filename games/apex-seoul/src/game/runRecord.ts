import {
    createDefaultBuckets, createDefaultSetup, DEFAULT_REFERENCE_RECORDS,
    RECORD_RULESET, SAVE_COLORS, SAVE_COURSES, SAVE_VEHICLES,
    type RecordBucket, type RecordIdentity, type RunSummary,
} from './saveDefaults';

export const RECORDS_KEY = 'apex-seoul:records:v1';
export const PROFILE_KEY = 'apex-seoul:profile:v1';
const LEGACY_PREFIX = 'apex-seoul:best-run:';
export type SaveStatus = 'saved' | 'memory-only' | 'unsupported-version' | 'external-change' | 'excluded';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
type RecordDocument = { schemaVersion: 1; buckets: RecordBucket[]; legacy: { trackId: string; timeSec: number }[] };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const same = (a: RecordIdentity, b: RecordIdentity) => a.trackId === b.trackId && a.vehicleId === b.vehicleId && a.rulesetVersion === b.rulesetVersion;
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const identity = (v: unknown): v is RecordIdentity & Record<string, any> => object(v) && ['trackId', 'vehicleId', 'rulesetVersion'].every(k => typeof v[k] === 'string' && v[k].length > 0 && v[k].length < 100);

export function isRecordableSetup(setup: { trackId: string; vehicleId: string }) {
    return SAVE_COURSES.some(c => c.id === setup.trackId) && SAVE_VEHICLES.some(id => id === setup.vehicleId);
}

function validRun(value: unknown): value is RunSummary {
    if (!identity(value) || !object(value)) return false;
    const course = SAVE_COURSES.find(c => c.id === value.trackId);
    return typeof value.runId === 'string' && value.runId.length > 0 && value.runId.length < 150 &&
        typeof value.finishedAt === 'string' && Number.isFinite(Date.parse(value.finishedAt)) &&
        typeof value.vehicleColor === 'string' && value.vehicleColor.length < 50 && positive(value.finishTimeSec) &&
        Array.isArray(value.checkpointTimesSec) && value.checkpointTimesSec.length <= 32 &&
        (!course || value.rulesetVersion !== RECORD_RULESET || value.checkpointTimesSec.length === course.checkpointCount) &&
        value.checkpointTimesSec.every((t: unknown, i: number, times: number[]) => positive(t) && t <= value.finishTimeSec && (i === 0 || t >= times[i - 1]));
}

export class RunRecordStore {
    private document: RecordDocument = { schemaVersion: 1, buckets: createDefaultBuckets(), legacy: [] };
    private setup = createDefaultSetup();
    private loaded = false;
    private recordsBlocked: SaveStatus | null = null;
    private profileBlocked = false;
    private processedRuns = new Set<string>();

    constructor(private readonly storage: () => StoragePort = () => window.localStorage) {}

    private ensureLoaded() {
        if (this.loaded) return;
        this.loaded = true;
        try {
            const raw = this.storage().getItem(RECORDS_KEY);
            if (raw && raw.length <= 256 * 1024) {
                const data: unknown = JSON.parse(raw);
                if (object(data) && data.schemaVersion !== 1) this.recordsBlocked = 'unsupported-version';
                else if (object(data) && Array.isArray(data.buckets)) {
                    for (const b of data.buckets) {
                        if (!identity(b) || !object(b)) continue;
                        if (!Number.isSafeInteger(b.completedRunCount) || b.completedRunCount < 0 ||
                            typeof b.totalFinishTimeSec !== 'number' || !Number.isFinite(b.totalFinishTimeSec) || b.totalFinishTimeSec < 0) continue;
                        const bucket: RecordBucket = {
                            trackId: b.trackId, vehicleId: b.vehicleId, rulesetVersion: b.rulesetVersion,
                            bestRun: validRun(b.bestRun) && same(b, b.bestRun) ? clone(b.bestRun) : null,
                            recentRuns: Array.isArray(b.recentRuns) ? b.recentRuns.filter((r: unknown) => validRun(r) && same(b, r)).slice(0, 20).map((r: RunSummary) => clone(r)) : [],
                            completedRunCount: b.completedRunCount, totalFinishTimeSec: b.totalFinishTimeSec,
                        };
                        const index = this.document.buckets.findIndex(item => same(item, bucket));
                        if (index < 0) this.document.buckets.push(bucket);
                        else this.document.buckets[index] = bucket;
                    }
                    this.document.legacy = Array.isArray(data.legacy) ? data.legacy.filter((v: unknown) => object(v) && typeof v.trackId === 'string' && positive(v.timeSec)).map((v: any) => ({ trackId: v.trackId, timeSec: v.timeSec })) : [];
                }
            }
            // Only import when no v1 document exists. A reset document is the migration marker.
            if (raw === null) {
                for (const key of this.legacyKeys()) {
                    const timeSec = Number(this.storage().getItem(key));
                    if (positive(timeSec)) this.document.legacy.push({ trackId: key.slice(LEGACY_PREFIX.length), timeSec });
                }
                if (this.document.legacy.length && this.persist() === 'saved') this.removeLegacy();
            }
        } catch { /* Defaults remain playable; valid fields already loaded survive. */ }
        try {
            const raw = this.storage().getItem(PROFILE_KEY);
            const data: unknown = raw ? JSON.parse(raw) : null;
            if (object(data) && data.schemaVersion !== 1) this.profileBlocked = true;
            else if (object(data)) this.setup = this.normalizeSetup(data.lastRunSetup);
        } catch { /* Selection defaults are independent of record recovery. */ }
    }

    private normalizeSetup(value: unknown) {
        const defaults = createDefaultSetup();
        if (!object(value)) return defaults;
        return {
            trackId: SAVE_COURSES.some(c => c.id === value.trackId) ? value.trackId as string : defaults.trackId,
            vehicleId: SAVE_VEHICLES.some(id => id === value.vehicleId) ? value.vehicleId as string : defaults.vehicleId,
            vehicleColor: SAVE_COLORS.some(color => color === value.vehicleColor) ? value.vehicleColor as string : defaults.vehicleColor,
        };
    }

    getSetup() { this.ensureLoaded(); return { ...this.setup }; }
    saveSetup(value: ReturnType<typeof createDefaultSetup>): SaveStatus {
        this.ensureLoaded();
        this.setup = this.normalizeSetup(value);
        if (this.profileBlocked) return 'unsupported-version';
        try {
            this.storage().setItem(PROFILE_KEY, JSON.stringify({ schemaVersion: 1, lastRunSetup: this.setup }));
            return 'saved';
        } catch { return 'memory-only'; }
    }
    getRecords() { this.ensureLoaded(); return clone(this.document); }
    getBucket(trackId: string, vehicleId: string, rulesetVersion = RECORD_RULESET) {
        this.ensureLoaded();
        return clone(this.document.buckets.find(b => same(b, { trackId, vehicleId, rulesetVersion })) ?? {
            trackId, vehicleId, rulesetVersion, bestRun: null, recentRuns: [], completedRunCount: 0, totalFinishTimeSec: 0,
        });
    }
    getReferenceRecords() { return clone(DEFAULT_REFERENCE_RECORDS); }

    record(run: RunSummary, eligible = true): SaveStatus {
        this.ensureLoaded();
        if (!eligible || !isRecordableSetup(run) || run.rulesetVersion !== RECORD_RULESET || !validRun(run)) return 'excluded';
        if (this.recordsBlocked) return this.recordsBlocked;
        if (this.processedRuns.has(run.runId) || this.document.buckets.some(b => b.bestRun?.runId === run.runId || b.recentRuns.some(r => r.runId === run.runId))) return this.persist();
        const bucket = this.document.buckets.find(b => same(b, run))!;
        this.processedRuns.add(run.runId);
        bucket.completedRunCount += 1;
        bucket.totalFinishTimeSec += run.finishTimeSec;
        bucket.recentRuns.unshift(clone(run));
        bucket.recentRuns.length = Math.min(bucket.recentRuns.length, 20);
        if (!bucket.bestRun || run.finishTimeSec < bucket.bestRun.finishTimeSec) bucket.bestRun = clone(run);
        return this.persist();
    }

    private persist(): SaveStatus {
        if (this.recordsBlocked) return this.recordsBlocked;
        for (const b of this.document.buckets) if (b.rulesetVersion !== RECORD_RULESET) b.recentRuns = [];
        let raw = JSON.stringify(this.document);
        while (new TextEncoder().encode(raw).length > 256 * 1024) {
            const oldest = this.document.buckets.filter(b => b.recentRuns.length).sort((a, b) =>
                Date.parse(a.recentRuns.at(-1)!.finishedAt) - Date.parse(b.recentRuns.at(-1)!.finishedAt))[0];
            if (!oldest) return 'memory-only';
            oldest.recentRuns.pop();
            raw = JSON.stringify(this.document);
        }
        try { this.storage().setItem(RECORDS_KEY, raw); return 'saved'; }
        catch { return 'memory-only'; }
    }
    private legacyKeys() {
        const storage = this.storage();
        return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null && k.startsWith(LEGACY_PREFIX));
    }
    private removeLegacy() { for (const key of this.legacyKeys()) this.storage().removeItem(key); }
    resetRecords(): SaveStatus {
        this.ensureLoaded();
        this.document = { schemaVersion: 1, buckets: createDefaultBuckets(), legacy: [] };
        this.processedRuns.clear();
        this.recordsBlocked = null;
        const status = this.persist();
        try { this.removeLegacy(); } catch { return 'memory-only'; }
        return status;
    }
    handleExternalChange(key: string | null) {
        if (key === RECORDS_KEY || key === null) this.recordsBlocked = 'external-change';
    }
}

export const runRecordStore = new RunRecordStore();
if (typeof window !== 'undefined') window.addEventListener('storage', event => runRecordStore.handleExternalChange(event.key));
