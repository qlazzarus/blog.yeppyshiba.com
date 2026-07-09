import type { MvpBuildingId } from '../balanceTypes';

export type EconomyPoint = {
    x: number;
    y: number;
};

export type ChickenKind = 'basic' | 'giant' | 'mid';
export type ChickenAiState = 'dead' | 'recover' | 'seek_well' | 'stranded' | 'wander';

export type CoopKind = 'basic' | 'high' | 'mid';

export type EconomyItemRawcode = 'I006';

export type EconomyInventorySlot = {
    readonly itemRawcode: EconomyItemRawcode;
    quantity: number;
};

export type EconomyInventoryState = {
    readonly capacity: number;
    readonly id: string;
    readonly ownerPlayerId: number;
    readonly slots: Array<EconomyInventorySlot | null>;
};

export type ChickenFarmEconomyConfig = {
    readonly chickenEggRules: Record<
        ChickenKind,
        {
            readonly eggUnitsPerDrop: number;
            readonly intervalSec: number;
        }
    >;
    readonly coopRules: Record<
        CoopKind,
        {
            readonly hatchCapacity: number;
            readonly hatchSec: number;
            readonly templateId: Extract<
                MvpBuildingId,
                'coop_basic' | 'coop_high' | 'coop_mid'
            >;
        }
    >;
    readonly eggSellValueCoins: number;
    readonly inventorySlotCount: number;
    readonly chickenVitality: {
        readonly hpByKind: Record<ChickenKind, number>;
        readonly hpDrainPerSec: number;
        readonly recoverExitRatio: number;
        readonly recoverPerSec: number;
        readonly seekRatio: number;
        readonly speedPxPerSec: number;
        readonly wanderRadiusPx: number;
        readonly wellRecoveryRadiusPx: number;
    };
    readonly wellBuff: {
        readonly eggIntervalMultiplier: number;
        readonly radiusPx: number;
    };
};

export type EconomyPlayerState = {
    carriedEggs: number;
    coins: number;
    readonly id: number;
};

export type EconomyChickenState = {
    readonly anchor: EconomyPoint;
    aiState: ChickenAiState;
    hp: number;
    readonly id: string;
    readonly kind: ChickenKind;
    readonly maxHp: number;
    nextAiDecisionAtSec: number;
    nextEggAtSec: number;
    readonly ownerPlayerId: number;
    position: EconomyPoint;
    targetPosition: EconomyPoint | null;
    targetWellId: string | null;
    vitalityUpdatedAtSec: number;
};

export type EconomyCoopState = {
    readonly id: string;
    readonly kind: CoopKind;
    readonly ownerPlayerId: number;
    readonly position: EconomyPoint;
    storedEggs: number;
};

export type EconomyWellState = {
    readonly id: string;
    readonly ownerPlayerId: number;
    readonly position: EconomyPoint;
};

export type FieldEggItemState = {
    readonly droppedAtSec: number;
    readonly id: string;
    readonly ownerPlayerId: number;
    readonly position: EconomyPoint;
    readonly sourceChickenId: string;
    readonly stackCount: number;
    readonly wellBuffed: boolean;
};

export type HatchJobState = {
    readonly completeAtSec: number;
    readonly coopId: string;
    readonly id: string;
    readonly ownerPlayerId: number;
    readonly resultChickenKind: ChickenKind;
    readonly startedAtSec: number;
};

export type EconomyEvent =
    | {
          readonly chickenId: string;
          readonly eggId: string;
          readonly stackCount: number;
          readonly type: 'egg_dropped';
          readonly wellBuffed: boolean;
      }
    | {
          readonly coopId: string;
          readonly eggId: string;
          readonly stackCount: number;
          readonly type: 'egg_deposited_to_coop';
      }
    | {
          readonly eggId: string;
          readonly ownerPlayerId: number;
          readonly slotIndex: number;
          readonly stackCount: number;
          readonly type: 'egg_picked_up';
      }
    | {
          readonly coopId: string;
          readonly ownerPlayerId: number;
          readonly sourceInventoryId: string;
          readonly sourceSlotIndex: number;
          readonly targetSlotIndex: number;
          readonly stackCount: number;
          readonly type: 'egg_stack_deposited_to_coop';
      }
    | {
          readonly eggId: string;
          readonly ownerPlayerId: number;
          readonly position: EconomyPoint;
          readonly sourceInventoryId: string;
          readonly sourceSlotIndex: number;
          readonly stackCount: number;
          readonly type: 'egg_dropped_from_inventory';
      }
    | {
          readonly coopId: string;
          readonly hatchJobId: string;
          readonly type: 'hatch_started';
      }
    | {
          readonly chickenId: string;
          readonly coopId: string;
          readonly hatchJobId: string;
          readonly type: 'hatch_completed';
      }
    | {
          readonly chickenId: string;
          readonly from: ChickenAiState;
          readonly to: ChickenAiState;
          readonly type: 'chicken_ai_state_changed';
      }
    | {
          readonly chickenId: string;
          readonly type: 'chicken_died';
      }
    | {
          readonly playerId: number;
          readonly soldEggs: number;
          readonly totalCoins: number;
          readonly type: 'eggs_sold';
      };

export type ChickenFarmEconomyState = {
    readonly chickens: EconomyChickenState[];
    readonly coops: EconomyCoopState[];
    readonly config: ChickenFarmEconomyConfig;
    readonly fieldEggs: FieldEggItemState[];
    readonly hatchJobs: HatchJobState[];
    readonly inventories: EconomyInventoryState[];
    nextChickenId: number;
    nextEggId: number;
    nextHatchJobId: number;
    readonly players: EconomyPlayerState[];
    readonly wells: EconomyWellState[];
};
