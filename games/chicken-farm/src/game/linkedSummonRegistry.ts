import type { EnemyId } from './balanceTypes';

export type LinkedSummonTerminationReason = 'expired' | 'parent_removed' | 'removed_external';

export type LinkedSummonEntry = {
    readonly enemyId: EnemyId;
    readonly id: string;
    readonly lifetimeExpiresAtSec: number | null;
    readonly ownerPlayerId: number;
    readonly parentEnemyId: string;
    readonly runId: number;
    readonly spawnedAtSec: number;
};

export type LinkedSummonRegistry = {
    readonly active: readonly LinkedSummonEntry[];
    readonly ended: readonly (LinkedSummonEntry & { readonly reason: LinkedSummonTerminationReason })[];
};

export function createLinkedSummonRegistry(): LinkedSummonRegistry {
    return { active: [], ended: [] };
}

export function registerLinkedSummon(
    registry: LinkedSummonRegistry,
    entry: LinkedSummonEntry,
): { readonly accepted: boolean; readonly registry: LinkedSummonRegistry } {
    if (
        !entry.id ||
        !entry.parentEnemyId ||
        !Number.isFinite(entry.spawnedAtSec) ||
        (entry.lifetimeExpiresAtSec !== null && entry.lifetimeExpiresAtSec < entry.spawnedAtSec) ||
        registry.active.some((candidate) => candidate.id === entry.id) ||
        registry.active.some((candidate) => candidate.parentEnemyId === entry.parentEnemyId)
    ) {
        return { accepted: false, registry };
    }
    return { accepted: true, registry: { ...registry, active: [...registry.active, entry] } };
}

export function reconcileLinkedSummons(
    registry: LinkedSummonRegistry,
    input: { readonly aliveEnemyIds: ReadonlySet<string>; readonly nowSec: number },
): { readonly registry: LinkedSummonRegistry; readonly removeIds: readonly string[] } {
    const ended: (LinkedSummonEntry & { readonly reason: LinkedSummonTerminationReason })[] = [];
    const active = registry.active.filter((entry) => {
        const reason = !input.aliveEnemyIds.has(entry.id)
            ? 'removed_external'
            : !input.aliveEnemyIds.has(entry.parentEnemyId)
              ? 'parent_removed'
              : entry.lifetimeExpiresAtSec !== null && input.nowSec >= entry.lifetimeExpiresAtSec
                ? 'expired'
                : null;
        if (!reason) return true;
        ended.push({ ...entry, reason });
        return false;
    });
    return {
        registry: { active, ended: [...registry.ended, ...ended] },
        removeIds: ended
            .filter((entry) => entry.reason === 'parent_removed' || entry.reason === 'expired')
            .map((entry) => entry.id),
    };
}
