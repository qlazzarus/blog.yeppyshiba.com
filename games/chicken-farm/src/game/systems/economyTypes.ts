import type { MvpBuildingId } from '../balanceTypes';

export type EconomyPoint = {
    readonly x: number;
    readonly y: number;
};

export type ChickenKind = 'basic' | 'giant' | 'mid';

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
    readonly id: string;
    readonly kind: ChickenKind;
    nextEggAtSec: number;
    readonly ownerPlayerId: number;
    readonly position: EconomyPoint;
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
