import type { EnemyId } from './balanceTypes';

export type EnemyDeathCause = 'ability' | 'debug' | 'environment' | 'tower' | 'unit';

export type EnemyDamageSource = {
    readonly attackerEntityId: string | null;
    readonly cause: EnemyDeathCause;
    readonly ownerPlayerId: number | null;
    readonly rewardEligible: boolean;
};

export type EnemyDeathEvent = {
    readonly attackerEntityId: string | null;
    readonly cause: EnemyDeathCause;
    readonly deathKey: string;
    readonly deathSequence: number;
    readonly deadEntityId: string;
    readonly enemyId: EnemyId;
    readonly ownerPlayerId: number | null;
    readonly rewardEligible: boolean;
    readonly runId: number;
    readonly x: number;
    readonly y: number;
};

export type EnemyDeathLedger = {
    readonly events: readonly EnemyDeathEvent[];
    readonly nextDeathSequence: number;
};

export function createEnemyDeathLedger(): EnemyDeathLedger {
    return { events: [], nextDeathSequence: 1 };
}

export function recordEnemyDeath(
    ledger: EnemyDeathLedger,
    input: Omit<EnemyDeathEvent, 'deathKey' | 'deathSequence'>,
): { readonly event: EnemyDeathEvent | null; readonly ledger: EnemyDeathLedger } {
    if (ledger.events.some((event) => event.deadEntityId === input.deadEntityId)) {
        return { event: null, ledger };
    }

    const deathSequence = ledger.nextDeathSequence;
    const event: EnemyDeathEvent = {
        ...input,
        deathKey: `${input.runId}:${input.deadEntityId}:${deathSequence}`,
        deathSequence,
    };
    return {
        event,
        ledger: {
            events: [...ledger.events, event],
            nextDeathSequence: deathSequence + 1,
        },
    };
}
