import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    ACCT_CRITICAL_STRIKE_SOURCE_EVIDENCE,
    ACCT_CRITICAL_STRIKE_W1_POLICY,
    canApplyAcctCriticalStrike,
    isValidAcctCriticalStrikePolicy,
    type AcctCriticalStrikeActor,
    type AcctCriticalStrikeTarget,
} from '../games/chicken-farm/src/game/acctCriticalStrikePolicy.ts';
import {
    createAcctCriticalStrikeState,
    isAcctCriticalStrikeProc,
    resolveAcctCriticalStrike,
} from '../games/chicken-farm/src/game/acctCriticalStrikeResolver.ts';
import {
    getExecutableOrdinaryEnemyAbilities,
    validateOrdinaryEnemyAbilityPolicies,
} from '../games/chicken-farm/src/game/ordinaryEnemyAbilityPolicies.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_acct_critical_strike_policy.json',
);

const actor: AcctCriticalStrikeActor = {
    alive: true,
    enemyId: 'dire_frost_wolf',
    rawcode: 'n00C',
};

const unitTarget: AcctCriticalStrikeTarget = {
    alive: true,
    isHostile: true,
    targetKind: 'controllable_unit',
    targetableByWolves: true,
};

function target(overrides: Partial<AcctCriticalStrikeTarget>) {
    return { ...unitTarget, ...overrides };
}

async function main() {
    assert.equal(isValidAcctCriticalStrikePolicy(ACCT_CRITICAL_STRIKE_W1_POLICY), true);
    assert.equal(isValidAcctCriticalStrikePolicy({ chance: Number.NaN, damageMultiplier: 2 }), false);
    assert.equal(isValidAcctCriticalStrikePolicy({ chance: -0.01, damageMultiplier: 2 }), false);
    assert.equal(isValidAcctCriticalStrikePolicy({ chance: 1.01, damageMultiplier: 2 }), false);
    assert.equal(isValidAcctCriticalStrikePolicy({ chance: 0.15, damageMultiplier: Number.NaN }), false);
    assert.equal(isValidAcctCriticalStrikePolicy({ chance: 0.15, damageMultiplier: -1 }), false);

    assert.equal(canApplyAcctCriticalStrike(actor, unitTarget), true, 'hostile controllable unit is eligible');
    assert.equal(
        canApplyAcctCriticalStrike(actor, target({ targetKind: 'economy_chicken' })),
        true,
        'hostile economy chicken is eligible',
    );
    for (const targetKind of ['building', 'fence', 'corpse', 'item', 'neutral', 'other'] as const) {
        assert.equal(canApplyAcctCriticalStrike(actor, target({ targetKind })), false, `${targetKind} is excluded`);
    }
    assert.equal(canApplyAcctCriticalStrike(actor, target({ alive: false })), false, 'dead targets are excluded');
    assert.equal(canApplyAcctCriticalStrike(actor, target({ isHostile: false })), false, 'allies and self are excluded');
    assert.equal(canApplyAcctCriticalStrike(actor, target({ targetableByWolves: false })), false, 'basic attack exclusion wins');
    assert.equal(canApplyAcctCriticalStrike({ ...actor, alive: false }, unitTarget), false, 'dead actor is excluded');
    assert.equal(canApplyAcctCriticalStrike({ ...actor, rawcode: 'n00E' }, unitTarget), false, 'n00E is out of scope');
    assert.equal(canApplyAcctCriticalStrike({ ...actor, enemyId: 'dire_wolf' }, unitTarget), false, 'only n00C canonical enemy is in scope');

    const ordinaryPolicies = validateOrdinaryEnemyAbilityPolicies();
    assert.equal(ordinaryPolicies.blockedPolicies.length, 6, 'only unresolved ordinary abilities remain blocked');
    assert.deepEqual(
        ordinaryPolicies.implementedWebPolicies.map((policy) => policy.enemyId),
        ['dire_frost_wolf'],
        'ACct W1 is the sole implemented web policy',
    );
    assert.deepEqual(getExecutableOrdinaryEnemyAbilities('dire_frost_wolf'), ['ACct']);

    const w1First = resolveAcctCriticalStrike(createAcctCriticalStrikeState(91), {
        actor, adjustedDamage: 32, attackId: 'w1-1', target: unitTarget,
    });
    assert.equal(w1First.status, 'resolved');
    assert.equal(w1First.drawConsumed, true);
    assert.equal(w1First.decision?.damage, w1First.decision?.proc ? 64 : 32, 'W1 only multiplies difficulty-adjusted damage');
    const w1Replay = resolveAcctCriticalStrike(createAcctCriticalStrikeState(91), {
        actor, adjustedDamage: 32, attackId: 'w1-1', target: unitTarget,
    });
    assert.deepEqual(w1Replay.decision, w1First.decision, 'same seed and event replay identically');

    const invalidInserted = resolveAcctCriticalStrike(createAcctCriticalStrikeState(91), {
        actor, adjustedDamage: 32, attackId: 'building', target: target({ targetKind: 'building' }),
    });
    assert.equal(invalidInserted.drawConsumed, false);
    const afterInvalid = resolveAcctCriticalStrike(invalidInserted.state, {
        actor, adjustedDamage: 32, attackId: 'w1-1', target: unitTarget,
    });
    assert.deepEqual(afterInvalid.decision, w1First.decision, 'invalid events do not perturb eligible RNG order');

    const duplicate = resolveAcctCriticalStrike(w1First.state, {
        actor, adjustedDamage: 32, attackId: 'w1-1', target: unitTarget,
    });
    assert.equal(duplicate.status, 'duplicate');
    assert.equal(duplicate.drawConsumed, false);
    assert.equal(duplicate.state.draws, 1, 'duplicate attack consumes neither a second draw nor a second application');

    const zeroPolicy = { ...ACCT_CRITICAL_STRIKE_W1_POLICY, chance: 0 };
    const hundredPolicy = { ...ACCT_CRITICAL_STRIKE_W1_POLICY, chance: 1 };
    assert.equal(resolveAcctCriticalStrike(createAcctCriticalStrikeState(1), {
        actor, adjustedDamage: 32, attackId: 'zero', policy: zeroPolicy, target: unitTarget,
    }).decision?.proc, false, '0% fixture never procs');
    assert.equal(resolveAcctCriticalStrike(createAcctCriticalStrikeState(1), {
        actor, adjustedDamage: 32, attackId: 'hundred', policy: hundredPolicy, target: unitTarget,
    }).decision?.proc, true, '100% fixture always procs');
    assert.equal(isAcctCriticalStrikeProc(0.149999999999, 0.15), true, 'roll just below chance procs');
    assert.equal(isAcctCriticalStrikeProc(0.15, 0.15), false, 'chance equality does not proc');
    assert.equal(isAcctCriticalStrikeProc(0.150000000001, 0.15), false, 'roll just above chance does not proc');

    const invalidDamage = resolveAcctCriticalStrike(createAcctCriticalStrikeState(3), {
        actor, adjustedDamage: Number.NaN, attackId: 'nan-damage', target: unitTarget,
    });
    assert.equal(invalidDamage.status, 'invalid_damage');
    assert.equal(invalidDamage.drawConsumed, false);

    const artifact = {
        case: 'acct_w1_policy_and_target_eligibility',
        checks: {
            actorScopeIsN00COnly: true,
            callbackFailureRollbackIsDeferredToRuntimeAdapter: true,
            chanceBoundaryUsesStrictLessThan: true,
            dedicatedSeededRngReplaysAndSkipsInvalidEvents: true,
            duplicateAttackIdConsumesNoSecondDrawOrDamage: true,
            eligibleTargetsAreAliveHostileUnitsOnly: true,
            invalidPolicyValuesRejected: true,
            ordinaryRuntimeCoverageExposesACctW1: true,
            pass: true,
            sourceAndWebPolicySeparated: true,
        },
        sourceEvidence: ACCT_CRITICAL_STRIKE_SOURCE_EVIDENCE,
        webPolicy: ACCT_CRITICAL_STRIKE_W1_POLICY,
        resolverSample: w1First.decision,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
