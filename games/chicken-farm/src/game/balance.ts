export type DifficultyId = 'easy' | 'normal' | 'hard' | 'crazy';

export type EnemyId =
    | 'timber_wolf'
    | 'frost_wolf'
    | 'giant_wolf'
    | 'blood_wolf'
    | 'wild_wolf'
    | 'hell_hound'
    | 'doom_guard'
    | 'archimonde'
    | 'nether_dragon';

export type DefenderId = 'farmer' | 'dog' | 'big_dog';
export type IncomeBuildingId = 'coop_basic' | 'coop_mid' | 'coop_high';
export type DefenseBuildingId =
    | 'fence_wood'
    | 'fence_bronze'
    | 'wall_stone'
    | 'barrier_magic'
    | 'tower_scout'
    | 'tower_guard_small'
    | 'tower_guard_medium'
    | 'tower_guard_large'
    | 'tower_guard_black'
    | 'tower_arcane_small'
    | 'tower_arcane_medium'
    | 'tower_arcane_large'
    | 'tower_arcane_grand'
    | 'well_basic';
export type BuildingId = IncomeBuildingId | DefenseBuildingId;
export type ShopItemId = IncomeBuildingId | 'dog' | 'big_dog';

export type SourceTrace = {
    readonly notes?: readonly string[];
    readonly rawcode?: string;
};

export type DifficultyConfig = {
    readonly enemyDamageMultiplier: number;
    readonly enemyHpMultiplier: number;
    readonly id: DifficultyId;
    readonly label: string;
    readonly startingCoinsBonus: number;
};

export type SessionBalance = {
    readonly finalPressureSec: number;
    readonly firstWaveSec: number;
    readonly incomeIntervalSec: number;
    readonly targetSessionSec: number;
    readonly waveCheckIntervalSec: number;
};

export type CombatStats = {
    readonly armor: number;
    readonly attackCooldownSec: number;
    readonly attackRangePx?: number;
    readonly acquireRangePx?: number;
    readonly damage: number;
    readonly hp: number;
    readonly rangeLeashPx?: number;
    readonly speedPxPerSec: number;
};

export type DefenderConfig = CombatStats & {
    readonly id: DefenderId;
    readonly role: 'builder_hero' | 'fast_defender' | 'elite_defender';
    readonly source: SourceTrace;
};

export type EnemyConfig = CombatStats & {
    readonly id: EnemyId;
    readonly score: number;
    readonly source: SourceTrace;
    readonly tags: readonly (
        | 'ordinary'
        | 'boss'
        | 'elite'
        | 'final'
        | 'requires_play_observation'
    )[];
};

export type IncomeBuildingConfig = {
    readonly eggUnitsPerTick: number;
    readonly hp: number;
    readonly id: IncomeBuildingId;
    readonly incomeIntervalSec: number;
    readonly sellValueCoins: number;
    readonly source: SourceTrace;
    readonly upgradeCostCoins?: number;
    readonly upgradeTo?: IncomeBuildingId;
};

export type DefenseBuildingConfig = {
    readonly armor: number;
    readonly buildTimeSec: number;
    readonly costCoins: number;
    readonly hp: number;
    readonly id: DefenseBuildingId;
    readonly blocksPath: boolean;
    readonly requires?: IncomeBuildingId | 'family_temple' | 'workshop';
    readonly targetableByWolves: boolean;
    readonly source: SourceTrace;
    readonly upgradeCostCoins?: number;
    readonly upgradeTo?: DefenseBuildingId;
    readonly attack?: {
        readonly cooldownSec: number;
        readonly damage: number;
        readonly rangePx: number;
    };
    readonly aura?: {
        readonly amountPerSec: number;
        readonly kind: 'heal';
        readonly rangePx: number;
    };
};

export type ShopItemConfig = {
    readonly costCoins: number;
    readonly id: ShopItemId;
    readonly kind: 'income_building' | 'defender';
    readonly produces: IncomeBuildingId | DefenderId;
};

export type EconomyBalance = {
    readonly easyBonusCoins: number;
    readonly eggUnitValueCoins: number;
    readonly exchangeEnabled: boolean;
    readonly reviveResourceLossPct: number;
    readonly startingCoins: number;
};

export type WaveEvent = {
    readonly atSec: number | null;
    readonly condition?: string;
    readonly count: number;
    readonly enemyId: EnemyId;
    readonly group: 'ordinary' | 'boss' | 'final';
};

export type WaveBalance = {
    readonly replenishBatchSize: number;
    readonly replenishMinAliveBase: number;
    readonly replenishMinAliveMax: number;
    readonly timeline: readonly WaveEvent[];
};

export type ScoreBalance = {
    readonly survivalEvery10Sec: number;
};

export type PathingBalance = {
    readonly baseBlockedRatioTarget: number;
    readonly cellSize: number;
    readonly centralHubBuildable: boolean;
    readonly farmAreaBuildable: boolean;
    readonly wolfBlockedByPlayerFence: boolean;
};

export type ChickenFarmBalance = {
    readonly defenders: Record<DefenderId, DefenderConfig>;
    readonly difficulties: Record<DifficultyId, DifficultyConfig>;
    readonly economy: EconomyBalance;
    readonly enemies: Record<EnemyId, EnemyConfig>;
    readonly incomeBuildings: Record<IncomeBuildingId, IncomeBuildingConfig>;
    readonly defenseBuildings: Record<DefenseBuildingId, DefenseBuildingConfig>;
    readonly pathing: PathingBalance;
    readonly score: ScoreBalance;
    readonly session: SessionBalance;
    readonly shopItems: Record<ShopItemId, ShopItemConfig>;
    readonly waves: WaveBalance;
};

export const CHICKEN_FARM_BALANCE: ChickenFarmBalance = {
    defenders: {
        big_dog: {
            armor: 4,
            attackCooldownSec: 1,
            damage: 45,
            hp: 650,
            id: 'big_dog',
            role: 'elite_defender',
            source: {
                rawcode: 'n00E',
            },
            speedPxPerSec: 122,
        },
        dog: {
            armor: 2,
            attackCooldownSec: 0.8,
            damage: 18,
            hp: 220,
            id: 'dog',
            role: 'fast_defender',
            source: {
                rawcode: 'n002',
            },
            speedPxPerSec: 118,
        },
        farmer: {
            armor: 0,
            attackCooldownSec: 0.9,
            damage: 10,
            hp: 100,
            id: 'farmer',
            role: 'builder_hero',
            source: {
                rawcode: 'H000',
            },
            speedPxPerSec: 100,
        },
    },
    difficulties: {
        crazy: {
            enemyDamageMultiplier: 1.25,
            enemyHpMultiplier: 1.4,
            id: 'crazy',
            label: 'Crazy',
            startingCoinsBonus: -10,
        },
        easy: {
            enemyDamageMultiplier: 0.85,
            enemyHpMultiplier: 0.85,
            id: 'easy',
            label: 'Easy',
            startingCoinsBonus: 20,
        },
        hard: {
            enemyDamageMultiplier: 1.15,
            enemyHpMultiplier: 1.2,
            id: 'hard',
            label: 'Hard',
            startingCoinsBonus: 0,
        },
        normal: {
            enemyDamageMultiplier: 1,
            enemyHpMultiplier: 1,
            id: 'normal',
            label: 'Normal',
            startingCoinsBonus: 0,
        },
    },
    economy: {
        easyBonusCoins: 20,
        eggUnitValueCoins: 12,
        exchangeEnabled: false,
        reviveResourceLossPct: 25,
        startingCoins: 120,
    },
    enemies: {
        archimonde: {
            armor: 4,
            attackCooldownSec: 1,
            damage: 46,
            hp: 700,
            id: 'archimonde',
            score: 160,
            source: {
                notes: ['Direct late boss spawn in static JASS analysis.'],
                rawcode: 'H01N',
            },
            speedPxPerSec: 102,
            tags: ['boss', 'final'],
        },
        blood_wolf: {
            armor: 1,
            attackCooldownSec: 1,
            damage: 14,
            hp: 130,
            id: 'blood_wolf',
            score: 40,
            source: {
                rawcode: 'H012',
            },
            speedPxPerSec: 110,
            tags: ['boss'],
        },
        doom_guard: {
            armor: 4,
            attackCooldownSec: 1,
            damage: 40,
            hp: 600,
            id: 'doom_guard',
            score: 140,
            source: {
                rawcode: 'H01B',
            },
            speedPxPerSec: 105,
            tags: ['boss'],
        },
        frost_wolf: {
            armor: 1,
            attackCooldownSec: 1.1,
            damage: 12,
            hp: 140,
            id: 'frost_wolf',
            score: 15,
            source: {
                rawcode: 'n008',
            },
            speedPxPerSec: 112,
            tags: ['ordinary'],
        },
        giant_wolf: {
            armor: 1,
            attackCooldownSec: 1.15,
            damage: 16,
            hp: 175,
            id: 'giant_wolf',
            score: 20,
            source: {
                rawcode: 'n009',
            },
            speedPxPerSec: 108,
            tags: ['ordinary'],
        },
        hell_hound: {
            armor: 3,
            attackCooldownSec: 0.9,
            damage: 32,
            hp: 360,
            id: 'hell_hound',
            score: 100,
            source: {
                rawcode: 'H013',
            },
            speedPxPerSec: 112,
            tags: ['boss'],
        },
        nether_dragon: {
            armor: 5,
            attackCooldownSec: 1.05,
            damage: 48,
            hp: 900,
            id: 'nether_dragon',
            score: 200,
            source: {
                notes: [
                    'Likely spawned after death/transform event; verify with actual play.',
                ],
                rawcode: 'H01O',
            },
            speedPxPerSec: 100,
            tags: ['boss', 'final', 'requires_play_observation'],
        },
        timber_wolf: {
            armor: 0,
            attackCooldownSec: 1.1,
            damage: 8,
            hp: 100,
            id: 'timber_wolf',
            score: 10,
            source: {
                rawcode: 'n007',
            },
            speedPxPerSec: 115,
            tags: ['ordinary'],
        },
        wild_wolf: {
            armor: 2,
            attackCooldownSec: 0.95,
            damage: 22,
            hp: 220,
            id: 'wild_wolf',
            score: 70,
            source: {
                rawcode: 'H00X',
            },
            speedPxPerSec: 112,
            tags: ['boss', 'elite'],
        },
    },
    incomeBuildings: {
        coop_basic: {
            eggUnitsPerTick: 1,
            hp: 120,
            id: 'coop_basic',
            incomeIntervalSec: 30,
            sellValueCoins: 36,
            source: {
                rawcode: 'h00A',
            },
            upgradeCostCoins: 80,
            upgradeTo: 'coop_mid',
        },
        coop_high: {
            eggUnitsPerTick: 3,
            hp: 180,
            id: 'coop_high',
            incomeIntervalSec: 30,
            sellValueCoins: 132,
            source: {
                rawcode: 'h00W',
            },
        },
        coop_mid: {
            eggUnitsPerTick: 2,
            hp: 150,
            id: 'coop_mid',
            incomeIntervalSec: 30,
            sellValueCoins: 72,
            source: {
                rawcode: 'h00J',
            },
            upgradeCostCoins: 140,
            upgradeTo: 'coop_high',
        },
    },
    defenseBuildings: {
        barrier_magic: {
            armor: 8,
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 46,
            hp: 650,
            id: 'barrier_magic',
            requires: 'workshop',
            source: {
                notes: ['Original chain h00K -> h00Y -> h014.'],
                rawcode: 'h00Y',
            },
            targetableByWolves: true,
        },
        fence_bronze: {
            armor: 2,
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 22,
            hp: 300,
            id: 'fence_bronze',
            source: {
                rawcode: 'h00L',
            },
            targetableByWolves: true,
            upgradeCostCoins: 26,
            upgradeTo: 'wall_stone',
        },
        fence_wood: {
            armor: 1,
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 8,
            hp: 200,
            id: 'fence_wood',
            source: {
                rawcode: 'h003',
            },
            targetableByWolves: true,
            upgradeCostCoins: 18,
            upgradeTo: 'fence_bronze',
        },
        tower_arcane_grand: {
            armor: 13,
            attack: {
                cooldownSec: 0.7,
                damage: 76,
                rangePx: 360,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 230,
            hp: 1000,
            id: 'tower_arcane_grand',
            requires: 'family_temple',
            source: {
                rawcode: 'h01K',
            },
            targetableByWolves: true,
        },
        tower_arcane_large: {
            armor: 9,
            attack: {
                cooldownSec: 0.7,
                damage: 54,
                rangePx: 330,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 160,
            hp: 800,
            id: 'tower_arcane_large',
            requires: 'family_temple',
            source: {
                rawcode: 'h017',
            },
            targetableByWolves: true,
            upgradeCostCoins: 120,
            upgradeTo: 'tower_arcane_grand',
        },
        tower_arcane_medium: {
            armor: 8,
            attack: {
                cooldownSec: 0.7,
                damage: 38,
                rangePx: 300,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 100,
            hp: 650,
            id: 'tower_arcane_medium',
            requires: 'workshop',
            source: {
                rawcode: 'h008',
            },
            targetableByWolves: true,
            upgradeCostCoins: 80,
            upgradeTo: 'tower_arcane_large',
        },
        tower_arcane_small: {
            armor: 7,
            attack: {
                cooldownSec: 0.7,
                damage: 26,
                rangePx: 270,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 76,
            hp: 400,
            id: 'tower_arcane_small',
            requires: 'coop_basic',
            source: {
                notes: ['Branch from h00D scout tower.'],
                rawcode: 'h016',
            },
            targetableByWolves: true,
            upgradeCostCoins: 58,
            upgradeTo: 'tower_arcane_medium',
        },
        tower_guard_black: {
            armor: 12,
            attack: {
                cooldownSec: 0.9,
                damage: 64,
                rangePx: 345,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 220,
            hp: 900,
            id: 'tower_guard_black',
            requires: 'family_temple',
            source: {
                rawcode: 'h01J',
            },
            targetableByWolves: true,
        },
        tower_guard_large: {
            armor: 8,
            attack: {
                cooldownSec: 0.8,
                damage: 40,
                rangePx: 285,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 76,
            hp: 550,
            id: 'tower_guard_large',
            requires: 'workshop',
            source: {
                rawcode: 'h00Z',
            },
            targetableByWolves: true,
            upgradeCostCoins: 118,
            upgradeTo: 'tower_guard_black',
        },
        tower_guard_medium: {
            armor: 7,
            attack: {
                cooldownSec: 0.85,
                damage: 34,
                rangePx: 255,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 56,
            hp: 400,
            id: 'tower_guard_medium',
            requires: 'coop_basic',
            source: {
                rawcode: 'h00Q',
            },
            targetableByWolves: true,
            upgradeCostCoins: 44,
            upgradeTo: 'tower_guard_large',
        },
        tower_guard_small: {
            armor: 6,
            attack: {
                cooldownSec: 0.9,
                damage: 22,
                rangePx: 225,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 44,
            hp: 300,
            id: 'tower_guard_small',
            requires: 'coop_basic',
            source: {
                notes: ['Branch from h00D scout tower.'],
                rawcode: 'h007',
            },
            targetableByWolves: true,
            upgradeCostCoins: 34,
            upgradeTo: 'tower_guard_medium',
        },
        tower_scout: {
            armor: 5,
            attack: {
                cooldownSec: 1.05,
                damage: 14,
                rangePx: 195,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 32,
            hp: 275,
            id: 'tower_scout',
            source: {
                rawcode: 'h00D',
            },
            targetableByWolves: true,
            upgradeCostCoins: 34,
            upgradeTo: 'tower_guard_small',
        },
        wall_stone: {
            armor: 5,
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 34,
            hp: 450,
            id: 'wall_stone',
            requires: 'coop_basic',
            source: {
                rawcode: 'h00K',
            },
            targetableByWolves: true,
            upgradeCostCoins: 40,
            upgradeTo: 'barrier_magic',
        },
        well_basic: {
            armor: 0,
            aura: {
                amountPerSec: 2,
                kind: 'heal',
                rangePx: 96,
            },
            blocksPath: true,
            buildTimeSec: 0,
            costCoins: 30,
            hp: 100,
            id: 'well_basic',
            source: {
                rawcode: 'h00M',
            },
            targetableByWolves: true,
        },
    },
    pathing: {
        baseBlockedRatioTarget: 0.04,
        cellSize: 32,
        centralHubBuildable: false,
        farmAreaBuildable: true,
        wolfBlockedByPlayerFence: true,
    },
    score: {
        survivalEvery10Sec: 5,
    },
    session: {
        finalPressureSec: 780,
        firstWaveSec: 70,
        incomeIntervalSec: 30,
        targetSessionSec: 840,
        waveCheckIntervalSec: 20,
    },
    shopItems: {
        big_dog: {
            costCoins: 180,
            id: 'big_dog',
            kind: 'defender',
            produces: 'big_dog',
        },
        coop_basic: {
            costCoins: 60,
            id: 'coop_basic',
            kind: 'income_building',
            produces: 'coop_basic',
        },
        coop_high: {
            costCoins: 220,
            id: 'coop_high',
            kind: 'income_building',
            produces: 'coop_high',
        },
        coop_mid: {
            costCoins: 120,
            id: 'coop_mid',
            kind: 'income_building',
            produces: 'coop_mid',
        },
        dog: {
            costCoins: 45,
            id: 'dog',
            kind: 'defender',
            produces: 'dog',
        },
    },
    waves: {
        replenishBatchSize: 2,
        replenishMinAliveBase: 2,
        replenishMinAliveMax: 6,
        timeline: [
            {
                atSec: 70,
                count: 4,
                enemyId: 'timber_wolf',
                group: 'ordinary',
            },
            {
                atSec: 120,
                count: 6,
                enemyId: 'timber_wolf',
                group: 'ordinary',
            },
            {
                atSec: 180,
                count: 5,
                enemyId: 'frost_wolf',
                group: 'ordinary',
            },
            {
                atSec: 240,
                count: 4,
                enemyId: 'giant_wolf',
                group: 'ordinary',
            },
            {
                atSec: 300,
                count: 1,
                enemyId: 'blood_wolf',
                group: 'boss',
            },
            {
                atSec: 420,
                count: 1,
                enemyId: 'wild_wolf',
                group: 'boss',
            },
            {
                atSec: 540,
                count: 1,
                enemyId: 'hell_hound',
                group: 'boss',
            },
            {
                atSec: 660,
                count: 1,
                enemyId: 'doom_guard',
                group: 'boss',
            },
            {
                atSec: 780,
                count: 1,
                enemyId: 'archimonde',
                group: 'final',
            },
            {
                atSec: null,
                condition:
                    'Spawn after archimonde death only if actual play confirms the transform.',
                count: 1,
                enemyId: 'nether_dragon',
                group: 'final',
            },
        ],
    },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export function getDifficultyConfig(
    difficulty: DifficultyId = DEFAULT_DIFFICULTY,
): DifficultyConfig {
    return CHICKEN_FARM_BALANCE.difficulties[difficulty];
}

export function getStartingCoins(
    difficulty: DifficultyId = DEFAULT_DIFFICULTY,
): number {
    const config = getDifficultyConfig(difficulty);
    return CHICKEN_FARM_BALANCE.economy.startingCoins + config.startingCoinsBonus;
}

export function getScaledEnemyStats(
    enemyId: EnemyId,
    difficulty: DifficultyId = DEFAULT_DIFFICULTY,
): CombatStats {
    const enemy = CHICKEN_FARM_BALANCE.enemies[enemyId];
    const config = getDifficultyConfig(difficulty);

    return {
        armor: enemy.armor,
        attackCooldownSec: enemy.attackCooldownSec,
        attackRangePx: enemy.attackRangePx,
        acquireRangePx: enemy.acquireRangePx,
        damage: Math.round(enemy.damage * config.enemyDamageMultiplier),
        hp: Math.round(enemy.hp * config.enemyHpMultiplier),
        rangeLeashPx: enemy.rangeLeashPx,
        speedPxPerSec: enemy.speedPxPerSec,
    };
}
