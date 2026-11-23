import type { EnemyId } from './balanceTypes';

export type AcctCriticalStrikeSourceEvidence = {
    readonly abilityId: 'ACct';
    readonly actorRawcode: 'n00C';
    readonly inheritedFields: Readonly<Record<'DataA1' | 'DataB1', 'unresolved'>>;
    readonly sourceStatus: 'unresolved_inherited_values';
};

export type AcctCriticalStrikeWebPolicy = {
    readonly abilityId: 'ACct';
    readonly actor: { readonly enemyId: EnemyId; readonly rawcode: 'n00C' };
    readonly chance: number;
    readonly damageMultiplier: number;
    readonly flatBonusDamage: number;
    readonly provenance: 'approved_web_design_not_recovered_warcraft_data';
};

export const ACCT_CRITICAL_STRIKE_SOURCE_EVIDENCE: AcctCriticalStrikeSourceEvidence = {
    abilityId: 'ACct',
    actorRawcode: 'n00C',
    inheritedFields: {
        DataA1: 'unresolved',
        DataB1: 'unresolved',
    },
    sourceStatus: 'unresolved_inherited_values',
} as const;

export const ACCT_CRITICAL_STRIKE_W1_POLICY: AcctCriticalStrikeWebPolicy = {
    abilityId: 'ACct',
    actor: {
        enemyId: 'dire_frost_wolf' as EnemyId,
        rawcode: 'n00C',
    },
    chance: 0.15,
    damageMultiplier: 2,
    flatBonusDamage: 0,
    provenance: 'approved_web_design_not_recovered_warcraft_data',
} as const;

export type AcctCriticalStrikeActor = {
    readonly alive: boolean;
    readonly enemyId: EnemyId;
    readonly rawcode: string;
};

export type AcctCriticalStrikeTarget = {
    readonly alive: boolean;
    readonly isHostile: boolean;
    readonly targetKind:
        | 'building'
        | 'controllable_unit'
        | 'corpse'
        | 'economy_chicken'
        | 'fence'
        | 'item'
        | 'neutral'
        | 'other';
    /** Existing basic-attack targeting has already made the ground/air decision. */
    readonly targetableByWolves: boolean;
};

export function isValidAcctCriticalStrikePolicy(
    policy: Pick<AcctCriticalStrikeWebPolicy, 'chance' | 'damageMultiplier'>,
) {
    return (
        Number.isFinite(policy.chance) &&
        policy.chance >= 0 &&
        policy.chance <= 1 &&
        Number.isFinite(policy.damageMultiplier) &&
        policy.damageMultiplier >= 0
    );
}

export function isAcctCriticalStrikeActor(actor: AcctCriticalStrikeActor) {
    return (
        actor.alive &&
        actor.enemyId === ACCT_CRITICAL_STRIKE_W1_POLICY.actor.enemyId &&
        actor.rawcode === ACCT_CRITICAL_STRIKE_W1_POLICY.actor.rawcode
    );
}

export function isAcctCriticalStrikeTarget(target: AcctCriticalStrikeTarget) {
    return (
        target.alive &&
        target.isHostile &&
        target.targetableByWolves &&
        (target.targetKind === 'controllable_unit' || target.targetKind === 'economy_chicken')
    );
}

export function canApplyAcctCriticalStrike(
    actor: AcctCriticalStrikeActor,
    target: AcctCriticalStrikeTarget,
) {
    return (
        isValidAcctCriticalStrikePolicy(ACCT_CRITICAL_STRIKE_W1_POLICY) &&
        isAcctCriticalStrikeActor(actor) &&
        isAcctCriticalStrikeTarget(target)
    );
}
