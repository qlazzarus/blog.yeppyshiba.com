import type { EnemyId } from './balanceTypes';
import { WAVE_ORDINARY_ENEMY_TIERS } from './waveEnemyTiers';

export type OrdinaryEnemyAbilityPolicy = {
    readonly attachedAbilityIds: readonly string[];
    readonly enemyId: EnemyId;
    readonly execution: 'base_attack_only' | 'blocked_source_data' | 'implemented_web_policy';
    readonly reason: string;
};

const blockedAbilityIdsByEnemyId: Readonly<Partial<Record<EnemyId, readonly string[]>>> = {
    darkguard: ['A02I', 'A024'],
    fel_ravager: ['A02I'],
    overlord: ['A02I', 'A023'],
    satyr: ['A02W'],
    satyr_soulstealer: ['A02U'],
    shupikuta: ['A02I'],
};

const implementedWebAbilityIdsByEnemyId: Readonly<Partial<Record<EnemyId, readonly string[]>>> = {
    dire_frost_wolf: ['ACct'],
};

export const ORDINARY_ENEMY_ABILITY_POLICIES: readonly OrdinaryEnemyAbilityPolicy[] =
    WAVE_ORDINARY_ENEMY_TIERS.map(({ enemyId }) => {
        const implementedAbilityIds = implementedWebAbilityIdsByEnemyId[enemyId] ?? [];
        const attachedAbilityIds = blockedAbilityIdsByEnemyId[enemyId] ?? [];
        if (implementedAbilityIds.length) {
            return {
                attachedAbilityIds: implementedAbilityIds,
                enemyId,
                execution: 'implemented_web_policy' as const,
                reason:
                    'ACct-W1 is an approved web policy: n00C direct hostile unit hits use a deterministic 15% critical chance with a 2x multiplier.',
            };
        }
        return attachedAbilityIds.length
            ? {
                  attachedAbilityIds,
                  enemyId,
                  execution: 'blocked_source_data' as const,
                  reason:
                      'The extracted source confirms attachment or name only; target type, range, timing, damage, duration, and stacking are unresolved.',
              }
            : {
                  attachedAbilityIds: [],
                  enemyId,
                  execution: 'base_attack_only' as const,
                  reason: 'No attached special ability is recorded for this ordinary tier.',
              };
    });

export function getExecutableOrdinaryEnemyAbilities(enemyId: EnemyId): readonly string[] {
    const policy = ORDINARY_ENEMY_ABILITY_POLICIES.find(
        (candidate) => candidate.enemyId === enemyId,
    );
    return policy?.execution === 'implemented_web_policy' ? policy.attachedAbilityIds : [];
}

export function validateOrdinaryEnemyAbilityPolicies() {
    const tierEnemyIds = WAVE_ORDINARY_ENEMY_TIERS.map((tier) => tier.enemyId);
    const policyEnemyIds = ORDINARY_ENEMY_ABILITY_POLICIES.map((policy) => policy.enemyId);
    return {
        blockedPolicies: ORDINARY_ENEMY_ABILITY_POLICIES.filter(
            (policy) => policy.execution === 'blocked_source_data',
        ),
        implementedWebPolicies: ORDINARY_ENEMY_ABILITY_POLICIES.filter(
            (policy) => policy.execution === 'implemented_web_policy',
        ),
        duplicateEnemyIds: policyEnemyIds.filter(
            (enemyId, index) => policyEnemyIds.indexOf(enemyId) !== index,
        ),
        missingEnemyIds: tierEnemyIds.filter((enemyId) => !policyEnemyIds.includes(enemyId)),
        nonEmptyExecutablePolicies: ORDINARY_ENEMY_ABILITY_POLICIES.filter(
            (policy) => getExecutableOrdinaryEnemyAbilities(policy.enemyId).length > 0,
        ),
    };
}
