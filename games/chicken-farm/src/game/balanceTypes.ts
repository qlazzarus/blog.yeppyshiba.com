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
    | 'plasma_wall'
    | 'gate_wood'
    | 'tower_scout'
    | 'tower_guard_small'
    | 'tower_guard_medium'
    | 'tower_guard_large'
    | 'tower_guard_grand'
    | 'tower_guard_black'
    | 'tower_arcane_small'
    | 'tower_arcane_medium'
    | 'tower_arcane_large'
    | 'tower_arcane_grand'
    | 'well_basic';
export type BuildingId = IncomeBuildingId | DefenseBuildingId;
export type CoreBuildingId = 'farm_house' | 'town_hall' | 'family_temple';
export type EconomyBuildingId =
    | IncomeBuildingId
    | 'egg_storage'
    | 'lumber_mill'
    | 'lumber_mill_mid'
    | 'lumber_mill_high';
export type MarketBuildingId = 'market' | 'grand_market';
export type ProductionBuildingId = 'mercenary_barracks';
export type ResearchBuildingId =
    | 'blacksmith'
    | 'workshop_lab'
    | 'arcane_lab'
    | 'power_generator';
export type MvpBuildingId =
    | CoreBuildingId
    | DefenseBuildingId
    | EconomyBuildingId
    | MarketBuildingId
    | ProductionBuildingId
    | ResearchBuildingId;
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
    readonly windupSec?: number;
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

export type BuildingTemplateConfig = {
    readonly armor: number;
    readonly blocksPath: boolean;
    readonly buildTimeSec: number;
    readonly category:
        | 'barracks'
        | 'core'
        | 'economy'
        | 'gate'
        | 'market'
        | 'research'
        | 'support'
        | 'tower'
        | 'wall';
    readonly costCoins: number;
    readonly costLumber?: number;
    readonly displayName: string;
    readonly footprintCells: {
        readonly h: number;
        readonly w: number;
    };
    readonly hp: number;
    readonly id: MvpBuildingId;
    readonly originalCost?: {
        readonly gold?: number;
        readonly lumber?: number;
    };
    readonly originalRequires?: readonly string[];
    readonly produces?: readonly (DefenderId | string)[];
    readonly providesResearch?: readonly string[];
    readonly requires?: readonly MvpBuildingId[];
    readonly source: SourceTrace;
    readonly targetableByWolves: boolean;
    readonly upgradeTo?: MvpBuildingId;
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
    readonly blockerAttackAcquire: {
        readonly blockedToBlockerDelaySec: number;
        readonly maxRepathAttemptsBeforeBlocker: number;
        readonly searchRadiusPx: number;
    };
    readonly cellSize: number;
    readonly centralHubBuildable: boolean;
    readonly dynamicBlockersEnabled: boolean;
    readonly farmAreaBuildable: boolean;
    readonly pathSmoothingEnabled: boolean;
    readonly repath: {
        readonly blockedGraceSec: number;
        readonly intervalSec: number;
        readonly targetMoveThresholdPx: number;
    };
    readonly unitClearanceCells: {
        readonly builder: number;
        readonly defender: number;
        readonly wolf: number;
    };
    readonly wolfAi: {
        readonly acquireIntervalSec: number;
        readonly attackMoveEnabled: boolean;
        readonly jassOrderModel: {
            readonly blockerTargeting: 'path_failure_only';
            readonly globalAttackRect: WorldRect;
            readonly optionalFocusRules: readonly WolfFocusRule[];
            readonly periodicAttackRefresh: WolfOrderRefreshRule;
            readonly spawnEntryAttackRefresh: WolfOrderRefreshRule;
        };
        readonly primaryTargetClasses: readonly WolfTargetClass[];
        readonly proximityTargetClasses: readonly WolfTargetClass[];
    };
    readonly wolfBlockedByPlayerFence: boolean;
};

export type WorldRect = {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
};

export type WolfOrderRefreshRule = {
    readonly enabled: boolean;
    readonly intervalSec?: number;
    readonly jassFlowType: string;
    readonly jassFunction: string;
    readonly order: 'attack_move_random_point_in_global_rect';
    readonly sourceLines: string;
    readonly unitScope: 'all_wolves' | 'trigger_wolf';
};

export type WolfFocusRule = {
    readonly enabledByDefault: boolean;
    readonly jassFlowType: string;
    readonly jassFunction: string;
    readonly radiusPx: number;
    readonly sourceLines: string;
    readonly translation: string;
};

export type WolfTargetClass =
    | 'income_building'
    | 'livestock'
    | 'builder_hero'
    | 'core_building'
    | 'defender'
    | 'defense_building'
    | 'blocker';

export type ChickenFarmBalance = {
    readonly buildingTemplates: Record<MvpBuildingId, BuildingTemplateConfig>;
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
