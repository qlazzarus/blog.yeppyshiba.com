import type { EnemyId } from './balanceTypes';

export const A02U_SKELETON_CAP_PER_OWNER = 25;
export const A02U_SKELETON_LIFETIME_SEC = 40;

export type OrdinarySummonTerminationReason =
    | 'combat_death'
    | 'expired'
    | 'removed_external';

export type OrdinarySummonEntry = {
    readonly enemyId: 'skeleton_warrior';
    readonly id: string;
    readonly lifetimeExpiresAtSec: number;
    readonly ownerPlayerId: number;
    readonly parentEnemyId: string;
    readonly persistsAfterParentRemoval: true;
    readonly requestKey: string;
    readonly rewardEligible: false;
    readonly runId: number;
    readonly sourceAbilityId: 'A02U';
    readonly spawnedAtSec: number;
};

export type OrdinarySummonRegistry = {
    readonly active: readonly OrdinarySummonEntry[];
    readonly ended: readonly (OrdinarySummonEntry & {
        readonly reason: OrdinarySummonTerminationReason;
    })[];
};

export function createOrdinarySummonRegistry(): OrdinarySummonRegistry {
    return { active: [], ended: [] };
}

export function registerOrdinarySummon(
    registry: OrdinarySummonRegistry,
    entry: OrdinarySummonEntry,
): { readonly accepted: boolean; readonly registry: OrdinarySummonRegistry } {
    const allEntries = [...registry.active, ...registry.ended];
    const activeForScope = registry.active.filter(
        (candidate) =>
            candidate.runId === entry.runId &&
            candidate.ownerPlayerId === entry.ownerPlayerId &&
            candidate.enemyId === entry.enemyId,
    );
    if (
        !entry.id ||
        !entry.requestKey ||
        !entry.parentEnemyId ||
        !Number.isFinite(entry.spawnedAtSec) ||
        !Number.isFinite(entry.lifetimeExpiresAtSec) ||
        entry.lifetimeExpiresAtSec !== entry.spawnedAtSec + A02U_SKELETON_LIFETIME_SEC ||
        entry.sourceAbilityId !== 'A02U' ||
        entry.enemyId !== 'skeleton_warrior' ||
        entry.rewardEligible !== false ||
        entry.persistsAfterParentRemoval !== true ||
        allEntries.some((candidate) => candidate.id === entry.id) ||
        allEntries.some(
            (candidate) =>
                candidate.runId === entry.runId && candidate.requestKey === entry.requestKey,
        ) ||
        activeForScope.length >= A02U_SKELETON_CAP_PER_OWNER
    ) {
        return { accepted: false, registry };
    }
    return { accepted: true, registry: { ...registry, active: [...registry.active, entry] } };
}

export function reconcileOrdinarySummons(
    registry: OrdinarySummonRegistry,
    input: {
        readonly aliveEnemyIds: ReadonlySet<string>;
        readonly deadEnemyIds: ReadonlySet<string>;
        readonly nowSec: number;
    },
): { readonly registry: OrdinarySummonRegistry; readonly removeIds: readonly string[] } {
    if (!Number.isFinite(input.nowSec)) return { registry, removeIds: [] };
    const ended: (OrdinarySummonEntry & { readonly reason: OrdinarySummonTerminationReason })[] = [];
    const active = registry.active.filter((entry) => {
        // Death wins if a lethal hit and timed life are observed in the same update.
        const reason = input.deadEnemyIds.has(entry.id)
            ? 'combat_death'
            : input.nowSec >= entry.lifetimeExpiresAtSec
              ? 'expired'
              : !input.aliveEnemyIds.has(entry.id)
                ? 'removed_external'
                : null;
        if (!reason) return true;
        ended.push({ ...entry, reason });
        return false;
    });
    return {
        registry: ended.length ? { active, ended: [...registry.ended, ...ended] } : registry,
        removeIds: ended.filter((entry) => entry.reason === 'expired').map((entry) => entry.id),
    };
}

export function isOrdinarySummonEnemy(enemyId: EnemyId): enemyId is 'skeleton_warrior' {
    return enemyId === 'skeleton_warrior';
}
