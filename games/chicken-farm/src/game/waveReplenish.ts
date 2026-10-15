import type { EnemyId } from './balanceTypes';
import { getWaveOrdinaryEnemyTier } from './waveEnemyTiers';

export type WaveReplenishTarget = {
    readonly targetQuantity: number | null;
    readonly tier: number;
};

export type WaveTierAliveCount = {
    readonly aliveCount: number;
    readonly tier: number;
};

export type WaveReplenishRequest = {
    readonly count: number;
    readonly enemyId: EnemyId;
    readonly rawcode: string;
    readonly tier: number;
};

export type WaveReplenishPlan = {
    readonly requests: readonly WaveReplenishRequest[];
    readonly unresolvedTargetTiers: readonly number[];
};

/**
 * Computes a single 0.2-second replenish request without mutating alive state.
 * A known target is never overshot: shortage 1 requests 1, otherwise requests
 * are capped by both the shortage and the configured batch size.
 */
export function calculateWaveReplenishPlan(input: {
    readonly aliveCounts: readonly WaveTierAliveCount[];
    readonly batchSize: number;
    readonly targets: readonly WaveReplenishTarget[];
}): WaveReplenishPlan {
    if (!Number.isInteger(input.batchSize) || input.batchSize <= 0) {
        throw new Error(`Wave replenish batchSize must be a positive integer: ${input.batchSize}`);
    }
    const aliveByTier = toAliveCountMap(input.aliveCounts);
    const targetTiers = new Set<number>();
    const requests: WaveReplenishRequest[] = [];
    const unresolvedTargetTiers: number[] = [];

    for (const target of input.targets) {
        const enemy = getWaveOrdinaryEnemyTier(target.tier);
        if (!enemy) throw new Error(`Wave replenish target tier is unknown: ${target.tier}`);
        if (targetTiers.has(target.tier)) {
            throw new Error(`Wave replenish target tier is duplicated: ${target.tier}`);
        }
        targetTiers.add(target.tier);
        if (target.targetQuantity === null) {
            unresolvedTargetTiers.push(target.tier);
            continue;
        }
        if (!Number.isInteger(target.targetQuantity) || target.targetQuantity < 0) {
            throw new Error(`Wave replenish target quantity is invalid for tier ${target.tier}`);
        }
        const shortage = target.targetQuantity - (aliveByTier.get(target.tier) ?? 0);
        if (shortage <= 0) continue;
        requests.push({
            count: Math.min(shortage, input.batchSize),
            enemyId: enemy.enemyId,
            rawcode: enemy.rawcode,
            tier: target.tier,
        });
    }

    return { requests, unresolvedTargetTiers };
}

function toAliveCountMap(counts: readonly WaveTierAliveCount[]): ReadonlyMap<number, number> {
    const aliveByTier = new Map<number, number>();
    for (const entry of counts) {
        if (!getWaveOrdinaryEnemyTier(entry.tier)) {
            throw new Error(`Wave alive tier is unknown: ${entry.tier}`);
        }
        if (!Number.isInteger(entry.aliveCount) || entry.aliveCount < 0) {
            throw new Error(`Wave alive count is invalid for tier ${entry.tier}`);
        }
        if (aliveByTier.has(entry.tier)) {
            throw new Error(`Wave alive tier is duplicated: ${entry.tier}`);
        }
        aliveByTier.set(entry.tier, entry.aliveCount);
    }
    return aliveByTier;
}
