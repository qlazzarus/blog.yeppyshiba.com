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
    readonly damage: number;
    readonly hp: number;
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
    readonly tags: readonly ('ordinary' | 'boss' | 'elite' | 'final' | 'requires_play_observation')[];
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

export type DiseaseBalance = {
    readonly cureInteractSec: number;
    readonly durationSec: number;
    readonly enabledByDefault: boolean;
    readonly eventIntervalSec: number;
    readonly sellValueMultiplierWhileInfected: number;
    readonly startAfterSec: number;
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
    readonly disease: DiseaseBalance;
    readonly economy: EconomyBalance;
    readonly enemies: Record<EnemyId, EnemyConfig>;
    readonly incomeBuildings: Record<IncomeBuildingId, IncomeBuildingConfig>;
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
    disease: {
        cureInteractSec: 5,
        durationSec: 20,
        enabledByDefault: false,
        eventIntervalSec: 90,
        sellValueMultiplierWhileInfected: 0.5,
        startAfterSec: 180,
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
                notes: ['Likely spawned after death/transform event; verify with actual play.'],
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
                condition: 'Spawn after archimonde death only if actual play confirms the transform.',
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

export function getStartingCoins(difficulty: DifficultyId = DEFAULT_DIFFICULTY): number {
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
        damage: Math.round(enemy.damage * config.enemyDamageMultiplier),
        hp: Math.round(enemy.hp * config.enemyHpMultiplier),
        speedPxPerSec: enemy.speedPxPerSec,
    };
}
