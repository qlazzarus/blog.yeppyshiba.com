import type { EnemyId } from './balanceTypes';

export type EnemyCorpseStatus = 'consumed' | 'eligible' | 'expired' | 'reserved';

export type EnemyCorpseEntry = {
    readonly createdAtSec: number;
    readonly deadEntityId: string;
    readonly deathKey: string;
    readonly enemyId: EnemyId;
    readonly expiresAtSec: number;
    readonly ownerPlayerId: number;
    readonly reservationCasterId: string | null;
    readonly runId: number;
    readonly status: EnemyCorpseStatus;
    readonly x: number;
    readonly y: number;
};

export type EnemyCorpseRegistry = {
    readonly corpses: readonly EnemyCorpseEntry[];
};

export function createEnemyCorpseRegistry(): EnemyCorpseRegistry {
    return { corpses: [] };
}

export function registerEnemyCorpse(
    registry: EnemyCorpseRegistry,
    entry: Omit<EnemyCorpseEntry, 'reservationCasterId' | 'status'>,
): { readonly accepted: boolean; readonly registry: EnemyCorpseRegistry } {
    if (
        !entry.deathKey ||
        !entry.deadEntityId ||
        !Number.isFinite(entry.createdAtSec) ||
        !Number.isFinite(entry.expiresAtSec) ||
        !Number.isFinite(entry.x) ||
        !Number.isFinite(entry.y) ||
        entry.expiresAtSec < entry.createdAtSec ||
        registry.corpses.some(
            (corpse) =>
                corpse.deathKey === entry.deathKey || corpse.deadEntityId === entry.deadEntityId,
        )
    ) {
        return { accepted: false, registry };
    }
    return {
        accepted: true,
        registry: {
            corpses: [
                ...registry.corpses,
                { ...entry, reservationCasterId: null, status: 'eligible' },
            ],
        },
    };
}

export function advanceEnemyCorpseRegistry(
    registry: EnemyCorpseRegistry,
    nowSec: number,
): EnemyCorpseRegistry {
    if (!Number.isFinite(nowSec)) return registry;
    let changed = false;
    const corpses = registry.corpses.map((corpse) => {
        if (
            (corpse.status === 'eligible' || corpse.status === 'reserved') &&
            nowSec >= corpse.expiresAtSec
        ) {
            changed = true;
            return { ...corpse, reservationCasterId: null, status: 'expired' as const };
        }
        return corpse;
    });
    return changed ? { corpses } : registry;
}

export function reserveNearestEnemyCorpse(
    registry: EnemyCorpseRegistry,
    input: {
        readonly casterId: string;
        readonly ownerPlayerId: number;
        readonly radiusPx: number;
        readonly runId: number;
        readonly x: number;
        readonly y: number;
    },
): { readonly corpse: EnemyCorpseEntry | null; readonly registry: EnemyCorpseRegistry } {
    if (
        !input.casterId ||
        !Number.isFinite(input.radiusPx) ||
        input.radiusPx < 0 ||
        !Number.isFinite(input.x) ||
        !Number.isFinite(input.y)
    ) {
        return { corpse: null, registry };
    }
    const candidate = registry.corpses
        .filter(
            (corpse) =>
                corpse.status === 'eligible' &&
                corpse.runId === input.runId &&
                corpse.ownerPlayerId === input.ownerPlayerId &&
                corpse.deadEntityId !== input.casterId,
        )
        .map((corpse) => ({
            corpse,
            distanceSquared: (corpse.x - input.x) ** 2 + (corpse.y - input.y) ** 2,
        }))
        .filter((candidate) => candidate.distanceSquared <= input.radiusPx ** 2)
        .sort(
            (left, right) =>
                left.distanceSquared - right.distanceSquared ||
                left.corpse.deathKey.localeCompare(right.corpse.deathKey),
        )[0]?.corpse;
    if (!candidate) return { corpse: null, registry };

    const reserved = { ...candidate, reservationCasterId: input.casterId, status: 'reserved' as const };
    return {
        corpse: reserved,
        registry: {
            corpses: registry.corpses.map((corpse) =>
                corpse.deathKey === candidate.deathKey ? reserved : corpse,
            ),
        },
    };
}

export function releaseEnemyCorpseReservation(
    registry: EnemyCorpseRegistry,
    input: { readonly casterId: string; readonly deathKey: string; readonly runId: number },
): { readonly released: boolean; readonly registry: EnemyCorpseRegistry } {
    const candidate = registry.corpses.find(
        (corpse) =>
            corpse.deathKey === input.deathKey &&
            corpse.runId === input.runId &&
            corpse.status === 'reserved' &&
            corpse.reservationCasterId === input.casterId,
    );
    if (!candidate) return { released: false, registry };
    const released = { ...candidate, reservationCasterId: null, status: 'eligible' as const };
    return {
        released: true,
        registry: {
            corpses: registry.corpses.map((corpse) =>
                corpse.deathKey === candidate.deathKey ? released : corpse,
            ),
        },
    };
}

export function consumeReservedEnemyCorpse(
    registry: EnemyCorpseRegistry,
    input: { readonly casterId: string; readonly deathKey: string; readonly runId: number },
): { readonly consumed: boolean; readonly registry: EnemyCorpseRegistry } {
    const candidate = registry.corpses.find(
        (corpse) =>
            corpse.deathKey === input.deathKey &&
            corpse.runId === input.runId &&
            corpse.status === 'reserved' &&
            corpse.reservationCasterId === input.casterId,
    );
    if (!candidate) return { consumed: false, registry };
    const consumed = { ...candidate, reservationCasterId: null, status: 'consumed' as const };
    return {
        consumed: true,
        registry: {
            corpses: registry.corpses.map((corpse) =>
                corpse.deathKey === candidate.deathKey ? consumed : corpse,
            ),
        },
    };
}
