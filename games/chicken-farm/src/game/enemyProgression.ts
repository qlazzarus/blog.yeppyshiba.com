import { CHICKEN_FARM_BALANCE } from './balance';
import type {
    CanonicalEnemyAbility,
    CanonicalEnemyDefinition,
    EnemyId,
    FarmerLevelRewardDefinition,
} from './balanceTypes';
import { WAVE_ORDINARY_ENEMY_TIERS } from './waveEnemyTiers';
import type { EnemyDeathEvent } from './enemyDeathLedger';
import type { EnemyAbilityCast } from './enemyAbilityClock';
import type { LinkedSummonEntry, LinkedSummonTerminationReason } from './linkedSummonRegistry';
import type { EnemyCorpseEntry } from './enemyCorpseRegistry';
import type { OrdinarySummonEntry, OrdinarySummonTerminationReason } from './ordinarySummonRegistry';

type AbilitySpec = Omit<CanonicalEnemyAbility, 'runtimeState'>;

const UNSUPPORTED = 'unsupported' as const;
const IMPLEMENTED_WEB_POLICY = 'implemented_web_policy' as const;

export type EnemyProgressionSnapshot = {
    readonly bossMilestones: readonly {
        readonly atSec: number;
        readonly enemyId: EnemyId;
        readonly rawcode: string;
        readonly state: 'pending' | 'due_not_scheduled';
    }[];
    readonly canonicalEnemies: readonly CanonicalEnemyDefinition[];
    readonly abilityClock: {
        readonly activeCasts: readonly EnemyAbilityCast[];
        readonly cooldownCount: number;
        readonly state: 'ready_no_supported_abilities';
    };
    readonly elapsedSec: number;
    readonly deathEvents: readonly EnemyDeathEvent[];
    readonly corpses: {
        readonly entries: readonly EnemyCorpseEntry[];
        readonly state: 'active';
    };
    readonly fieldDrops: { readonly entries: readonly []; readonly state: 'not_started' };
    readonly finalTracking: {
        readonly state: 'not_started';
        readonly trackedLinkedSummonIds: readonly [];
        readonly trackedWaveEnemyIds: readonly [];
    };
    readonly linkedSummons: {
        readonly active: readonly LinkedSummonEntry[];
        readonly ended: readonly (LinkedSummonEntry & { readonly reason: LinkedSummonTerminationReason })[];
        readonly state: 'registry_active';
    };
    readonly ordinarySummons: {
        readonly active: readonly OrdinarySummonEntry[];
        readonly ended: readonly (OrdinarySummonEntry & { readonly reason: OrdinarySummonTerminationReason })[];
        readonly state: 'registry_active';
    };
    readonly fixturesEnabled: boolean;
    readonly farmerProgression: { readonly owners: readonly []; readonly state: 'not_started' };
    readonly rewardLedger: { readonly entries: readonly []; readonly state: 'not_started' };
    readonly runId: number;
    readonly runtimeEnemies: readonly {
        readonly abilities: readonly CanonicalEnemyAbility[];
        readonly enemyId: EnemyId;
        readonly id: string;
        readonly origin: 'linked_summon' | 'ordinary_summon' | 'ordinary_wave' | 'runtime_fixture_or_other';
        readonly ownerPlayerId: number;
        readonly ordinaryAbilityPolicy: {
            readonly attachedAbilityIds: readonly string[];
            readonly execution: 'base_attack_only' | 'blocked_source_data' | 'implemented_web_policy';
        } | null;
        readonly parentEnemyId: string | null;
        readonly rawcode: string;
        readonly rewardEligible: boolean;
    }[];
};

const abilitiesByEnemyId: Readonly<Record<EnemyId, readonly AbilitySpec[]>> = {
    archimonde: [
        { evidence: 'unknown', id: 'A03F' },
        { evidence: 'unknown', id: 'A02R' },
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A02Q' },
    ],
    blood_wolf: [
        { evidence: 'unknown', id: 'A03B' },
        { evidence: 'confirmed_name', id: 'A02I' },
    ],
    darkguard: [
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A024' },
    ],
    dire_frost_wolf: [{ evidence: 'unknown', id: 'ACct' }],
    dire_wolf: [],
    dire_wolf_tier_8: [],
    doom_guard: [
        {
            evidence: 'source_description',
            id: 'A03C',
            sourceDescription:
                'Summons an Infernal; landing deals 300 damage to enemy ground units and stuns them for a source-defined duration.',
        },
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A023' },
        { evidence: 'confirmed_name', id: 'A025' },
    ],
    fel_beast: [],
    fel_ravager: [{ evidence: 'confirmed_name', id: 'A02I' }],
    fel_stalker: [],
    frost_wolf: [],
    giant_frost_wolf: [],
    giant_wolf: [],
    hell_hound: [
        { evidence: 'confirmed_name', id: 'A03E' },
        { evidence: 'confirmed_name', id: 'A01R' },
        { evidence: 'confirmed_name', id: 'A01H' },
    ],
    nether_dragon: [
        { evidence: 'confirmed_name', id: 'A03G' },
        { evidence: 'confirmed_name', id: 'A01J' },
        { evidence: 'unknown', id: 'A02T' },
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A02S' },
        { evidence: 'unknown', id: 'A02V' },
    ],
    overlord: [
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A023' },
    ],
    satyr: [{ evidence: 'unknown', id: 'A02W' }],
    satyr_shadowdancer: [],
    satyr_soulstealer: [{ evidence: 'confirmed_name', id: 'A02U' }],
    shadow_wolf: [],
    shupikuta: [{ evidence: 'confirmed_name', id: 'A02I' }],
    skeleton_warrior: [],
    spirit_wolf: [],
    timber_wolf: [],
    wild_wolf: [
        { evidence: 'unknown', id: 'A03H' },
        { evidence: 'confirmed_name', id: 'A02I' },
        { evidence: 'unknown', id: 'A01G' },
    ],
};

const sourceBossScoreByEnemyId: Readonly<Partial<Record<EnemyId, number>>> = {
    blood_wolf: 150,
    doom_guard: 700,
    hell_hound: 450,
    nether_dragon: 1000,
    wild_wolf: 300,
};

export const FARMER_LEVEL_REWARDS: readonly FarmerLevelRewardDefinition[] = [
    { level: 5, sourceEffect: 'STR +10, AGI +10, INT +10' },
    { level: 10, sourceEffect: 'STR +15, AGI +15, INT +5' },
    {
        level: 15,
        sourceEffect: 'repair/defense/blessing ability unlocks; STR +30, AGI +30, INT +30',
    },
    { itemRawcode: 'I00Q', level: 20, sourceEffect: 'Haste Glove' },
    { itemRawcode: 'I00H', level: 25, sourceEffect: 'Awakening Item 1' },
    { itemRawcode: 'I00I', level: 30, sourceEffect: 'Awakening Item 2' },
    { itemRawcode: 'I00N', level: 35, sourceEffect: 'Awakening Item 3' },
] as const;

function defineEnemy(enemyId: EnemyId): CanonicalEnemyDefinition {
    const config = CHICKEN_FARM_BALANCE.enemies[enemyId];
    const sourceScore = sourceBossScoreByEnemyId[enemyId];
    const isOrdinary = config.tags.includes('ordinary');
    const isSummon = config.tags.includes('summon');
    const role = isSummon
        ? 'summon'
        : isOrdinary
          ? 'ordinary'
          : enemyId === 'nether_dragon'
            ? 'conditional_boss'
            : 'regular_boss';

    return {
        abilities: abilitiesByEnemyId[enemyId].map((ability) => ({
            ...ability,
            runtimeState:
                enemyId === 'dire_frost_wolf' && ability.id === 'ACct'
                    ? IMPLEMENTED_WEB_POLICY
                    : UNSUPPORTED,
        })),
        enemyId,
        rawcode: config.source.rawcode ?? '',
        reward: {
            farmerKillXp: 0,
            score: {
                effectiveScore:
                    sourceScore ?? (isOrdinary ? config.score : null),
                source: sourceScore
                    ? 'source_score_message'
                    : isOrdinary
                      ? 'web_baseline'
                      : isSummon
                        ? 'web_policy_no_reward'
                      : 'unresolved',
            },
        },
        role,
    };
}

export const CANONICAL_ENEMY_DEFINITIONS: Readonly<Record<EnemyId, CanonicalEnemyDefinition>> =
    Object.fromEntries(
        (Object.keys(CHICKEN_FARM_BALANCE.enemies) as EnemyId[]).map((enemyId) => [
            enemyId,
            defineEnemy(enemyId),
        ]),
    ) as Readonly<Record<EnemyId, CanonicalEnemyDefinition>>;

export function validateCanonicalEnemyDefinitions() {
    const definitions = Object.values(CANONICAL_ENEMY_DEFINITIONS);
    const ordinary = WAVE_ORDINARY_ENEMY_TIERS.map(
        (tier) => CANONICAL_ENEMY_DEFINITIONS[tier.enemyId],
    );
    const milestones = CHICKEN_FARM_BALANCE.waves.bossMilestonesForSp10.map(
        (milestone) =>
            definitions.find((definition) => definition.rawcode === milestone.bossRawcode) ?? null,
    );

    return {
        duplicateAbilityIds: definitions.flatMap((definition) => {
            const ids = definition.abilities.map((ability) => ability.id);
            return ids.length === new Set(ids).size ? [] : [definition.enemyId];
        }),
        invalidOrdinary: ordinary
            .filter((definition) => definition.role !== 'ordinary')
            .map((definition) => definition.enemyId),
        missingAbilityDefinitions: (Object.keys(CHICKEN_FARM_BALANCE.enemies) as EnemyId[]).filter(
            (enemyId) => !abilitiesByEnemyId[enemyId],
        ),
        missingMilestoneDefinitions: milestones
            .filter((definition): definition is null => definition === null)
            .map((_, index) => CHICKEN_FARM_BALANCE.waves.bossMilestonesForSp10[index]!.bossRawcode),
        milestoneDefinitions: milestones,
        ordinaryDefinitions: ordinary,
        summonDefinitions: definitions.filter((definition) => definition.role === 'summon'),
        unsupportedAbilityCount: definitions.flatMap((definition) => definition.abilities).filter(
            (ability) => ability.runtimeState === UNSUPPORTED,
        ).length,
    };
}
