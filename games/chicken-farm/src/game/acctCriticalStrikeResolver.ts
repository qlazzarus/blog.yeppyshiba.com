import {
    ACCT_CRITICAL_STRIKE_W1_POLICY,
    isAcctCriticalStrikeActor,
    isAcctCriticalStrikeTarget,
    isValidAcctCriticalStrikePolicy,
    type AcctCriticalStrikeActor,
    type AcctCriticalStrikeTarget,
    type AcctCriticalStrikeWebPolicy,
} from './acctCriticalStrikePolicy';

export type AcctCriticalStrikeDecision = {
    readonly adjustedDamage: number;
    readonly attackId: string;
    readonly damage: number;
    readonly proc: boolean;
    readonly roll: number;
};

export type AcctCriticalStrikeState = {
    readonly decisionsByAttackId: Readonly<Record<string, AcctCriticalStrikeDecision>>;
    readonly draws: number;
    readonly seed: number;
    readonly state: number;
};

export type AcctCriticalStrikeResolution = {
    readonly decision?: AcctCriticalStrikeDecision;
    readonly drawConsumed: boolean;
    readonly state: AcctCriticalStrikeState;
    readonly status: 'duplicate' | 'ineligible' | 'invalid_damage' | 'resolved';
};

export function createAcctCriticalStrikeState(seed: number): AcctCriticalStrikeState {
    const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
    return {
        decisionsByAttackId: {},
        draws: 0,
        seed: normalizedSeed,
        state: normalizedSeed,
    };
}

/** Dedicated LCG stream. Its state is never shared with movement or UI randomization. */
export function nextAcctCriticalStrikeRoll(state: AcctCriticalStrikeState) {
    const nextState = (Math.imul(state.state, 1664525) + 1013904223) >>> 0;
    return {
        roll: nextState / 0x1_0000_0000,
        state: nextState,
    };
}

export function isAcctCriticalStrikeProc(roll: number, chance: number) {
    return Number.isFinite(roll) && roll >= 0 && roll < 1 && Number.isFinite(chance) && roll < chance;
}

export function resolveAcctCriticalStrike(
    state: AcctCriticalStrikeState,
    input: {
        readonly actor: AcctCriticalStrikeActor;
        readonly adjustedDamage: number;
        readonly attackId: string;
        readonly policy?: AcctCriticalStrikeWebPolicy;
        readonly target: AcctCriticalStrikeTarget;
    },
): AcctCriticalStrikeResolution {
    const existing = state.decisionsByAttackId[input.attackId];
    if (existing) {
        return { decision: existing, drawConsumed: false, state, status: 'duplicate' };
    }

    const policy = input.policy ?? ACCT_CRITICAL_STRIKE_W1_POLICY;
    if (
        !input.attackId ||
        !isValidAcctCriticalStrikePolicy(policy) ||
        !isAcctCriticalStrikeActor(input.actor) ||
        !isAcctCriticalStrikeTarget(input.target)
    ) {
        return { drawConsumed: false, state, status: 'ineligible' };
    }
    if (!Number.isFinite(input.adjustedDamage) || input.adjustedDamage < 0) {
        return { drawConsumed: false, state, status: 'invalid_damage' };
    }

    const next = nextAcctCriticalStrikeRoll(state);
    const proc = isAcctCriticalStrikeProc(next.roll, policy.chance);
    const decision: AcctCriticalStrikeDecision = {
        adjustedDamage: input.adjustedDamage,
        attackId: input.attackId,
        damage: proc ? input.adjustedDamage * policy.damageMultiplier : input.adjustedDamage,
        proc,
        roll: next.roll,
    };
    return {
        decision,
        drawConsumed: true,
        state: {
            decisionsByAttackId: {
                ...state.decisionsByAttackId,
                [input.attackId]: decision,
            },
            draws: state.draws + 1,
            seed: state.seed,
            state: next.state,
        },
        status: 'resolved',
    };
}
