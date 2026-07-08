import type {
    ChickenFarmEconomyConfig,
    ChickenFarmEconomyState,
    ChickenKind,
    CoopKind,
    EconomyChickenState,
    EconomyCoopState,
    EconomyEvent,
    EconomyInventorySlot,
    EconomyInventoryState,
    EconomyItemRawcode,
    EconomyPlayerState,
    EconomyPoint,
    EconomyWellState,
    FieldEggItemState,
    HatchJobState,
} from './economyTypes';

export const DEFAULT_CHICKEN_FARM_ECONOMY_CONFIG: ChickenFarmEconomyConfig = {
    chickenEggRules: {
        basic: {
            eggUnitsPerDrop: 1,
            intervalSec: 30,
        },
        giant: {
            eggUnitsPerDrop: 1,
            intervalSec: 6.8,
        },
        mid: {
            eggUnitsPerDrop: 1,
            intervalSec: 15,
        },
    },
    coopRules: {
        basic: {
            hatchCapacity: 1,
            hatchSec: 20,
            templateId: 'coop_basic',
        },
        high: {
            hatchCapacity: 3,
            hatchSec: 14,
            templateId: 'coop_high',
        },
        mid: {
            hatchCapacity: 2,
            hatchSec: 17,
            templateId: 'coop_mid',
        },
    },
    eggSellValueCoins: 12,
    inventorySlotCount: 6,
    wellBuff: {
        eggIntervalMultiplier: 0.75,
        radiusPx: 384,
    },
};

export function createChickenFarmEconomyState(config?: {
    readonly economyConfig?: ChickenFarmEconomyConfig;
    readonly players?: readonly EconomyPlayerState[];
}): ChickenFarmEconomyState {
    return {
        chickens: [],
        config: config?.economyConfig ?? DEFAULT_CHICKEN_FARM_ECONOMY_CONFIG,
        coops: [],
        fieldEggs: [],
        hatchJobs: [],
        inventories: [],
        nextChickenId: 1,
        nextEggId: 1,
        nextHatchJobId: 1,
        players: [...(config?.players ?? [{ carriedEggs: 0, coins: 120, id: 3 }])],
        wells: [],
    };
}

export function addEconomyChicken(
    state: ChickenFarmEconomyState,
    config: {
        readonly elapsedSec: number;
        readonly kind?: ChickenKind;
        readonly ownerPlayerId: number;
        readonly position: EconomyPoint;
    },
) {
    const kind = config.kind ?? 'basic';
    const chicken: EconomyChickenState = {
        id: `chicken-${state.nextChickenId}`,
        kind,
        nextEggAtSec: config.elapsedSec,
        ownerPlayerId: config.ownerPlayerId,
        position: config.position,
    };
    chicken.nextEggAtSec = config.elapsedSec + getCurrentEggIntervalSec(state, chicken);
    state.nextChickenId += 1;
    state.chickens.push(chicken);
    return chicken;
}

export function addEconomyCoop(
    state: ChickenFarmEconomyState,
    config: {
        readonly kind?: CoopKind;
        readonly ownerPlayerId: number;
        readonly position: EconomyPoint;
    },
) {
    const coop: EconomyCoopState = {
        id: `coop-${state.coops.length + 1}`,
        kind: config.kind ?? 'basic',
        ownerPlayerId: config.ownerPlayerId,
        position: config.position,
        storedEggs: 0,
    };
    state.coops.push(coop);
    ensureEconomyInventory(state, {
        capacity: state.config.inventorySlotCount,
        id: coop.id,
        ownerPlayerId: coop.ownerPlayerId,
    });
    return coop;
}

export function addEconomyWell(
    state: ChickenFarmEconomyState,
    config: {
        readonly ownerPlayerId: number;
        readonly position: EconomyPoint;
    },
) {
    const well: EconomyWellState = {
        id: `well-${state.wells.length + 1}`,
        ownerPlayerId: config.ownerPlayerId,
        position: config.position,
    };
    state.wells.push(well);
    return well;
}

export function updateChickenFarmEconomy(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
) {
    const events: EconomyEvent[] = [];
    updateEggDrops(state, elapsedSec, events);
    completeHatches(state, elapsedSec, events);
    return events;
}

export function depositFieldEggToCoop(
    state: ChickenFarmEconomyState,
    config: {
        readonly coopId: string;
        readonly eggId: string;
    },
) {
    const coop = state.coops.find((candidate) => candidate.id === config.coopId);
    const eggIndex = state.fieldEggs.findIndex(
        (candidate) => candidate.id === config.eggId,
    );
    const egg = state.fieldEggs[eggIndex];
    if (!coop || !egg) return null;
    if (coop.ownerPlayerId !== egg.ownerPlayerId) return null;

    coop.storedEggs += egg.stackCount;
    state.fieldEggs.splice(eggIndex, 1);
    return {
        coopId: coop.id,
        eggId: egg.id,
        stackCount: egg.stackCount,
        type: 'egg_deposited_to_coop',
    } satisfies EconomyEvent;
}

export function pickupFieldEgg(
    state: ChickenFarmEconomyState,
    config: {
        readonly eggId: string;
        readonly ownerPlayerId: number;
        readonly targetInventoryId: string;
    },
) {
    const eggIndex = state.fieldEggs.findIndex(
        (candidate) => candidate.id === config.eggId,
    );
    const egg = state.fieldEggs[eggIndex];
    if (!egg || egg.ownerPlayerId !== config.ownerPlayerId) return null;

    const slotIndex = addInventoryItem(state, config.targetInventoryId, {
        itemRawcode: 'I006',
        quantity: egg.stackCount,
    });
    if (slotIndex === null) return null;

    state.fieldEggs.splice(eggIndex, 1);
    return {
        eggId: egg.id,
        ownerPlayerId: egg.ownerPlayerId,
        slotIndex,
        stackCount: egg.stackCount,
        type: 'egg_picked_up',
    } satisfies EconomyEvent;
}

export function depositEggStackToCoop(
    state: ChickenFarmEconomyState,
    config: {
        readonly coopId: string;
        readonly ownerPlayerId: number;
        readonly sourceInventoryId: string;
        readonly sourceSlotIndex?: number;
    },
) {
    const coop = state.coops.find((candidate) => candidate.id === config.coopId);
    if (!coop || coop.ownerPlayerId !== config.ownerPlayerId) return null;

    const sourceInventory = getEconomyInventory(state, config.sourceInventoryId);
    const sourceSlotIndex =
        config.sourceSlotIndex ??
        sourceInventory?.slots.findIndex((slot) => slot?.itemRawcode === 'I006') ??
        -1;
    if (!sourceInventory || sourceSlotIndex < 0) return null;

    const removed = removeInventoryItemAtSlot(state, config.sourceInventoryId, {
        itemRawcode: 'I006',
        quantity: 1,
        slotIndex: sourceSlotIndex,
    });
    if (removed <= 0) return null;

    const targetSlotIndex = addInventoryItem(state, coop.id, {
        itemRawcode: 'I006',
        quantity: removed,
    });
    if (targetSlotIndex === null) {
        addInventoryItem(state, config.sourceInventoryId, {
            itemRawcode: 'I006',
            quantity: removed,
            preferredSlotIndex: sourceSlotIndex,
        });
        return null;
    }

    syncCoopStoredEggs(state, coop.id);
    return {
        coopId: coop.id,
        ownerPlayerId: coop.ownerPlayerId,
        sourceInventoryId: config.sourceInventoryId,
        sourceSlotIndex,
        stackCount: removed,
        targetSlotIndex,
        type: 'egg_stack_deposited_to_coop',
    } satisfies EconomyEvent;
}

export function dropInventoryEggToField(
    state: ChickenFarmEconomyState,
    config: {
        readonly droppedAtSec: number;
        readonly ownerPlayerId: number;
        readonly position: EconomyPoint;
        readonly sourceInventoryId: string;
        readonly sourceSlotIndex: number;
    },
) {
    const sourceInventory = getEconomyInventory(state, config.sourceInventoryId);
    if (!sourceInventory || sourceInventory.ownerPlayerId !== config.ownerPlayerId) {
        return null;
    }

    const removed = removeInventoryItemAtSlot(state, config.sourceInventoryId, {
        itemRawcode: 'I006',
        quantity: 1,
        slotIndex: config.sourceSlotIndex,
    });
    if (removed <= 0) return null;

    const egg = createFieldEgg(state, {
        droppedAtSec: config.droppedAtSec,
        ownerPlayerId: config.ownerPlayerId,
        position: config.position,
        sourceChickenId: config.sourceInventoryId,
        stackCount: removed,
        wellBuffed: false,
    });
    state.fieldEggs.push(egg);
    return {
        eggId: egg.id,
        ownerPlayerId: config.ownerPlayerId,
        position: config.position,
        sourceInventoryId: config.sourceInventoryId,
        sourceSlotIndex: config.sourceSlotIndex,
        stackCount: removed,
        type: 'egg_dropped_from_inventory',
    } satisfies EconomyEvent;
}

export function startCoopHatch(
    state: ChickenFarmEconomyState,
    config: {
        readonly coopId: string;
        readonly elapsedSec: number;
        readonly resultChickenKind?: ChickenKind;
    },
) {
    const coop = state.coops.find((candidate) => candidate.id === config.coopId);
    if (!coop) return null;
    syncCoopStoredEggs(state, coop.id);
    if (coop.storedEggs <= 0) return null;

    const activeJobs = state.hatchJobs.filter(
        (job) => job.coopId === coop.id,
    ).length;
    const coopRule = state.config.coopRules[coop.kind];
    if (activeJobs >= coopRule.hatchCapacity) return null;

    const eggSlotIndex = findInventoryItemSlot(state, coop.id, 'I006');
    if (eggSlotIndex === null) return null;
    const removed = removeInventoryItemAtSlot(state, coop.id, {
        itemRawcode: 'I006',
        quantity: 1,
        slotIndex: eggSlotIndex,
    });
    if (removed <= 0) return null;
    syncCoopStoredEggs(state, coop.id);
    const job: HatchJobState = {
        completeAtSec: config.elapsedSec + coopRule.hatchSec,
        coopId: coop.id,
        id: `hatch-${state.nextHatchJobId}`,
        ownerPlayerId: coop.ownerPlayerId,
        resultChickenKind: config.resultChickenKind ?? chickenKindForCoop(coop.kind),
        startedAtSec: config.elapsedSec,
    };
    state.nextHatchJobId += 1;
    state.hatchJobs.push(job);
    return {
        coopId: coop.id,
        hatchJobId: job.id,
        type: 'hatch_started',
    } satisfies EconomyEvent;
}

export function ensureEconomyInventory(
    state: ChickenFarmEconomyState,
    config: {
        readonly capacity?: number;
        readonly id: string;
        readonly ownerPlayerId: number;
    },
) {
    const existing = state.inventories.find((candidate) => candidate.id === config.id);
    if (existing) return existing;

    const capacity = config.capacity ?? state.config.inventorySlotCount;
    const inventory: EconomyInventoryState = {
        capacity,
        id: config.id,
        ownerPlayerId: config.ownerPlayerId,
        slots: Array.from({ length: capacity }, () => null),
    };
    state.inventories.push(inventory);
    return inventory;
}

export function getEconomyInventory(
    state: ChickenFarmEconomyState,
    inventoryId: string,
) {
    return state.inventories.find((candidate) => candidate.id === inventoryId) ?? null;
}

export function countInventoryItem(
    state: ChickenFarmEconomyState,
    inventoryId: string,
    itemRawcode: EconomyItemRawcode,
) {
    const inventory = getEconomyInventory(state, inventoryId);
    if (!inventory) return 0;

    return inventory.slots.reduce(
        (total, slot) => total + (slot?.itemRawcode === itemRawcode ? slot.quantity : 0),
        0,
    );
}

export function sellCarriedEggs(
    state: ChickenFarmEconomyState,
    playerId: number,
) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player || player.carriedEggs <= 0) return null;

    const soldEggs = player.carriedEggs;
    player.carriedEggs = 0;
    player.coins += soldEggs * state.config.eggSellValueCoins;
    return {
        playerId,
        soldEggs,
        totalCoins: player.coins,
        type: 'eggs_sold',
    } satisfies EconomyEvent;
}

function updateEggDrops(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
    events: EconomyEvent[],
) {
    state.chickens.forEach((chicken) => {
        while (elapsedSec >= chicken.nextEggAtSec) {
            const well = findBuffingWell(state, chicken);
            const egg = createFieldEgg(state, {
                droppedAtSec: chicken.nextEggAtSec,
                ownerPlayerId: chicken.ownerPlayerId,
                position: chicken.position,
                sourceChickenId: chicken.id,
                stackCount: state.config.chickenEggRules[chicken.kind].eggUnitsPerDrop,
                wellBuffed: Boolean(well),
            });
            state.fieldEggs.push(egg);
            events.push({
                chickenId: chicken.id,
                eggId: egg.id,
                stackCount: egg.stackCount,
                type: 'egg_dropped',
                wellBuffed: egg.wellBuffed,
            });
            chicken.nextEggAtSec += getCurrentEggIntervalSec(state, chicken);
        }
    });
}

function completeHatches(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
    events: EconomyEvent[],
) {
    for (let index = state.hatchJobs.length - 1; index >= 0; index -= 1) {
        const job = state.hatchJobs[index];
        if (elapsedSec < job.completeAtSec) continue;

        const coop = state.coops.find((candidate) => candidate.id === job.coopId);
        const position = coop?.position ?? { x: 0, y: 0 };
        const chicken = addEconomyChicken(state, {
            elapsedSec,
            kind: job.resultChickenKind,
            ownerPlayerId: job.ownerPlayerId,
            position: { x: position.x + 24, y: position.y + 24 },
        });
        state.hatchJobs.splice(index, 1);
        events.push({
            chickenId: chicken.id,
            coopId: job.coopId,
            hatchJobId: job.id,
            type: 'hatch_completed',
        });
    }
}

function createFieldEgg(
    state: ChickenFarmEconomyState,
    config: Omit<FieldEggItemState, 'id'>,
): FieldEggItemState {
    const egg = {
        ...config,
        id: `egg-${state.nextEggId}`,
    };
    state.nextEggId += 1;
    return egg;
}

function addInventoryItem(
    state: ChickenFarmEconomyState,
    inventoryId: string,
    config: {
        readonly itemRawcode: EconomyItemRawcode;
        readonly preferredSlotIndex?: number;
        readonly quantity: number;
    },
) {
    const inventory = getEconomyInventory(state, inventoryId);
    if (!inventory) return null;

    const quantity = Math.max(0, Math.floor(config.quantity));
    if (quantity <= 0) return null;

    if (
        config.preferredSlotIndex !== undefined &&
        canPlaceInInventorySlot(inventory, config.preferredSlotIndex, config.itemRawcode)
    ) {
        mergeInventorySlot(inventory, config.preferredSlotIndex, {
            itemRawcode: config.itemRawcode,
            quantity,
        });
        return config.preferredSlotIndex;
    }

    const matchingSlotIndex = inventory.slots.findIndex(
        (slot) => slot?.itemRawcode === config.itemRawcode,
    );
    if (matchingSlotIndex >= 0) {
        inventory.slots[matchingSlotIndex]!.quantity += quantity;
        return matchingSlotIndex;
    }

    const emptySlotIndex = inventory.slots.findIndex((slot) => slot === null);
    if (emptySlotIndex < 0) return null;

    inventory.slots[emptySlotIndex] = {
        itemRawcode: config.itemRawcode,
        quantity,
    };
    return emptySlotIndex;
}

function removeInventoryItemAtSlot(
    state: ChickenFarmEconomyState,
    inventoryId: string,
    config: {
        readonly itemRawcode: EconomyItemRawcode;
        readonly quantity: number;
        readonly slotIndex: number;
    },
) {
    const inventory = getEconomyInventory(state, inventoryId);
    const slot = inventory?.slots[config.slotIndex];
    if (!inventory || !slot || slot.itemRawcode !== config.itemRawcode) return 0;

    const removed = Math.min(slot.quantity, Math.max(0, Math.floor(config.quantity)));
    slot.quantity -= removed;
    if (slot.quantity <= 0) inventory.slots[config.slotIndex] = null;
    return removed;
}

function findInventoryItemSlot(
    state: ChickenFarmEconomyState,
    inventoryId: string,
    itemRawcode: EconomyItemRawcode,
) {
    const inventory = getEconomyInventory(state, inventoryId);
    if (!inventory) return null;

    const slotIndex = inventory.slots.findIndex(
        (slot) => slot?.itemRawcode === itemRawcode,
    );
    return slotIndex >= 0 ? slotIndex : null;
}

function syncCoopStoredEggs(state: ChickenFarmEconomyState, coopId: string) {
    const coop = state.coops.find((candidate) => candidate.id === coopId);
    if (!coop) return;

    coop.storedEggs = countInventoryItem(state, coopId, 'I006');
}

function canPlaceInInventorySlot(
    inventory: EconomyInventoryState,
    slotIndex: number,
    itemRawcode: EconomyItemRawcode,
) {
    const slot = inventory.slots[slotIndex];
    return slot === null || slot?.itemRawcode === itemRawcode;
}

function mergeInventorySlot(
    inventory: EconomyInventoryState,
    slotIndex: number,
    item: EconomyInventorySlot,
) {
    const slot = inventory.slots[slotIndex];
    if (slot) {
        slot.quantity += item.quantity;
    } else {
        inventory.slots[slotIndex] = { ...item };
    }
}

function findBuffingWell(
    state: ChickenFarmEconomyState,
    chicken: EconomyChickenState,
) {
    return (
        state.wells.find(
            (well) =>
                well.ownerPlayerId === chicken.ownerPlayerId &&
                distance(well.position, chicken.position) <= state.config.wellBuff.radiusPx,
        ) ?? null
    );
}

function getCurrentEggIntervalSec(
    state: ChickenFarmEconomyState,
    chicken: EconomyChickenState,
) {
    const baseInterval = state.config.chickenEggRules[chicken.kind].intervalSec;
    if (!findBuffingWell(state, chicken)) return baseInterval;

    return baseInterval * state.config.wellBuff.eggIntervalMultiplier;
}

function chickenKindForCoop(coopKind: CoopKind): ChickenKind {
    if (coopKind === 'high') return 'giant';
    if (coopKind === 'mid') return 'mid';
    return 'basic';
}

function distance(a: EconomyPoint, b: EconomyPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
