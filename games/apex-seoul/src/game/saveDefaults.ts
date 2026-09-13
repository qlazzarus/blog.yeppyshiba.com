/** Stable IDs: extend these arrays when adding production courses or vehicles. */
export const SAVE_COURSES = [
    { id: 'bugak-ridge-downhill', name: 'Bugak Ridge Downhill', checkpointCount: 3 },
] as const;
export const SAVE_VEHICLES = ['raven-coupe', 'seorin-gt', 'mirae-gt'] as const;
export const SAVE_COLORS = ['blue', 'red', 'silver', 'black'] as const;
export const DEFAULT_PLAYER_NAME = 'PLAYER';
export const RECORD_RULESET = 'time-attack-v2';

export type RecordIdentity = { trackId: string; vehicleId: string; rulesetVersion: string };
export type RunSummary = RecordIdentity & {
    runId: string;
    finishedAt: string;
    vehicleColor: string;
    playerName?: string; // Older saves and runs before name entry use PLAYER.
    finishTimeSec: number;
    checkpointTimesSec: number[];
    recoveryCount?: number; // Missing in older v1 documents means zero.
};
export type RecordBucket = RecordIdentity & {
    bestRun: RunSummary | null;
    recentRuns: RunSummary[];
    completedRunCount: number;
    totalFinishTimeSec: number;
};

/** Bulk-authored reference records belong here, never in the player's PB. */
export const DEFAULT_REFERENCE_RECORDS: readonly RunSummary[] = [];

export function createDefaultBuckets(): RecordBucket[] {
    return SAVE_COURSES.flatMap(course => SAVE_VEHICLES.map(vehicleId => ({
        trackId: course.id, vehicleId, rulesetVersion: RECORD_RULESET,
        bestRun: null, recentRuns: [], completedRunCount: 0, totalFinishTimeSec: 0,
    })));
}

export function createDefaultSetup() {
    return { trackId: SAVE_COURSES[0].id as string, vehicleId: SAVE_VEHICLES[0] as string, vehicleColor: 'blue' };
}
