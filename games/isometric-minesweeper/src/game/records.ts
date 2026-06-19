import type { DifficultyId } from './config';

const BEST_RECORDS_STORAGE_KEY = 'isometric-minesweeper:best-records:v1';

export type BestRecord = {
    completedAt: string;
    elapsedSeconds: number;
};

export type BestRecords = Partial<Record<DifficultyId, BestRecord>>;

type StorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export function loadBestRecords(storage = getLocalStorage()): BestRecords {
    if (!storage) return {};

    try {
        const rawRecords = storage.getItem(BEST_RECORDS_STORAGE_KEY);
        if (!rawRecords) return {};

        return normalizeRecords(JSON.parse(rawRecords));
    } catch {
        return {};
    }
}

export function saveBestRecord(
    difficultyId: DifficultyId,
    elapsedSeconds: number,
    storage = getLocalStorage(),
    completedAt = new Date(),
) {
    const records = loadBestRecords(storage);
    if (!storage) {
        return {
            records,
            updated: false,
        };
    }

    const previousRecord = records[difficultyId];

    if (
        elapsedSeconds <= 0 ||
        (previousRecord && previousRecord.elapsedSeconds <= elapsedSeconds)
    ) {
        return {
            records,
            updated: false,
        };
    }

    const nextRecords = {
        ...records,
        [difficultyId]: {
            completedAt: completedAt.toISOString(),
            elapsedSeconds,
        },
    };

    try {
        storage?.setItem(BEST_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
    } catch {
        return {
            records,
            updated: false,
        };
    }

    return {
        records: nextRecords,
        updated: true,
    };
}

export function clearBestRecords(storage = getLocalStorage()) {
    try {
        storage?.removeItem(BEST_RECORDS_STORAGE_KEY);
    } catch {
        // localStorage can be unavailable in private or restricted browser contexts.
    }
}

export function formatRecordTime(seconds: number) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}

function getLocalStorage(): StorageLike | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

function normalizeRecords(value: unknown): BestRecords {
    if (!value || typeof value !== 'object') return {};

    const records: BestRecords = {};

    for (const difficultyId of ['beginner', 'standard', 'expert'] as const) {
        const candidate = (value as Record<string, unknown>)[difficultyId];

        if (!candidate || typeof candidate !== 'object') continue;

        const record = candidate as Record<string, unknown>;
        const elapsedSeconds = record.elapsedSeconds;
        const completedAt = record.completedAt;

        if (
            typeof elapsedSeconds !== 'number' ||
            !Number.isFinite(elapsedSeconds) ||
            elapsedSeconds <= 0 ||
            typeof completedAt !== 'string'
        ) {
            continue;
        }

        records[difficultyId] = {
            completedAt,
            elapsedSeconds: Math.floor(elapsedSeconds),
        };
    }

    return records;
}
