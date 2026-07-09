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
import { resolveBuildingProductionExit } from './buildingProductionExit';

const CHICKEN_COLLISION_RADIUS_PX = 20;

type EconomyUpdateOptions = {
    readonly canChickenOccupyPoint?: (point: EconomyPoint) => boolean;
};

export const DEFAULT_CHICKEN_FARM_ECONOMY_CONFIG: ChickenFarmEconomyConfig = {
    chickenVitality: {
        hpByKind: {
            basic: 40,
            giant: 65,
            mid: 55,
        },
        hpDrainPerSec: 0.2,
        recoverExitRatio: 0.9,
        recoverPerSec: 4,
        seekRatio: 0.4,
        speedPxPerSec: 45,
        wanderRadiusPx: 128,
        wellRecoveryRadiusPx: 96,
    },
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
    const maxHp = state.config.chickenVitality.hpByKind[kind];
    const chicken: EconomyChickenState = {
        anchor: { ...config.position },
        aiState: 'wander',
        hp: maxHp,
        id: `chicken-${state.nextChickenId}`,
        kind,
        maxHp,
        nextAiDecisionAtSec: config.elapsedSec,
        nextEggAtSec: config.elapsedSec,
        ownerPlayerId: config.ownerPlayerId,
        position: { ...config.position },
        targetPosition: null,
        targetWellId: null,
        vitalityUpdatedAtSec: config.elapsedSec,
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

export function addEconomyFieldEgg(
    state: ChickenFarmEconomyState,
    config: Omit<FieldEggItemState, 'id'>,
) {
    const egg = createFieldEgg(state, config);
    state.fieldEggs.push(egg);
    return egg;
}

export function updateChickenFarmEconomy(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
    options?: EconomyUpdateOptions,
) {
    const events: EconomyEvent[] = [];
    updateChickenVitalityAndAi(state, elapsedSec, events, options);
    updateEggDrops(state, elapsedSec, events);
    completeHatches(state, elapsedSec, events, options);
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

    const sourceQuantity = sourceInventory.slots[sourceSlotIndex]?.quantity ?? 0;
    const removed = removeInventoryItemAtSlot(state, config.sourceInventoryId, {
        itemRawcode: 'I006',
        quantity: sourceQuantity,
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
        if (chicken.aiState === 'dead') return;
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

function updateChickenVitalityAndAi(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
    events: EconomyEvent[],
    options?: EconomyUpdateOptions,
) {
    const rules = state.config.chickenVitality;
    const canOccupy = options?.canChickenOccupyPoint ?? (() => true);

    state.chickens.forEach((chicken) => {
        if (chicken.aiState === 'dead') return;
        const deltaSec = Math.max(
            0,
            Math.min(0.25, elapsedSec - chicken.vitalityUpdatedAtSec),
        );
        chicken.vitalityUpdatedAtSec = elapsedSec;

        const recoveryWell = state.wells.find(
            (well) =>
                well.ownerPlayerId === chicken.ownerPlayerId &&
                distanceBetween(well.position, chicken.position) <=
                    rules.wellRecoveryRadiusPx,
        );
        chicken.hp = recoveryWell
            ? Math.min(chicken.maxHp, chicken.hp + rules.recoverPerSec * deltaSec)
            : Math.max(0, chicken.hp - rules.hpDrainPerSec * deltaSec);

        if (chicken.hp <= 0) {
            changeChickenAiState(chicken, 'dead', events);
            chicken.targetPosition = null;
            chicken.targetWellId = null;
            events.push({ chickenId: chicken.id, type: 'chicken_died' });
            return;
        }

        if (recoveryWell) {
            chicken.targetWellId = recoveryWell.id;
            chicken.targetPosition = null;
            if (chicken.hp < chicken.maxHp * rules.recoverExitRatio) {
                changeChickenAiState(chicken, 'recover', events);
                return;
            }
            chicken.targetWellId = null;
            changeChickenAiState(chicken, 'wander', events);
            chicken.nextAiDecisionAtSec = elapsedSec;
        } else if (chicken.hp <= chicken.maxHp * rules.seekRatio) {
            const targetWell = findNearestOwnedWell(state, chicken);
            if (!targetWell) {
                chicken.targetWellId = null;
                chicken.targetPosition = null;
                changeChickenAiState(chicken, 'stranded', events);
                return;
            }
            chicken.targetWellId = targetWell.id;
            chicken.targetPosition = { ...targetWell.position };
            changeChickenAiState(chicken, 'seek_well', events);
        }

        if (chicken.aiState === 'recover' || chicken.aiState === 'stranded') return;
        if (
            chicken.aiState === 'wander' &&
            (elapsedSec >= chicken.nextAiDecisionAtSec ||
                !chicken.targetPosition ||
                distanceBetween(chicken.position, chicken.targetPosition) < 4)
        ) {
            chicken.targetPosition = getChickenWanderTarget(chicken, elapsedSec);
            chicken.nextAiDecisionAtSec = elapsedSec + 2.5;
        }
        if (chicken.targetPosition) {
            moveChickenToward(
                chicken,
                chicken.targetPosition,
                rules.speedPxPerSec * deltaSec,
                canOccupy,
            );
        }
    });
}

function changeChickenAiState(
    chicken: EconomyChickenState,
    nextState: EconomyChickenState['aiState'],
    events: EconomyEvent[],
) {
    if (chicken.aiState === nextState) return;
    const previousState = chicken.aiState;
    chicken.aiState = nextState;
    events.push({
        chickenId: chicken.id,
        from: previousState,
        to: nextState,
        type: 'chicken_ai_state_changed',
    });
}

function findNearestOwnedWell(
    state: ChickenFarmEconomyState,
    chicken: EconomyChickenState,
) {
    return state.wells
        .filter((well) => well.ownerPlayerId === chicken.ownerPlayerId)
        .sort(
            (a, b) =>
                distanceBetween(chicken.position, a.position) -
                distanceBetween(chicken.position, b.position),
        )[0];
}

function getChickenWanderTarget(
    chicken: EconomyChickenState,
    elapsedSec: number,
): EconomyPoint {
    const seed = Number(chicken.id.replace(/\D/g, '')) || 1;
    const step = Math.floor(elapsedSec / 2.5);
    const angle = ((seed * 137 + step * 83) * Math.PI) / 180;
    const radius = 40 + ((seed * 31 + step * 17) % 89);
    return {
        x: chicken.anchor.x + Math.cos(angle) * radius,
        y: chicken.anchor.y + Math.sin(angle) * radius,
    };
}

function moveChickenToward(
    chicken: EconomyChickenState,
    target: EconomyPoint,
    maxDistance: number,
    canOccupy: (point: EconomyPoint) => boolean,
) {
    const dx = target.x - chicken.position.x;
    const dy = target.y - chicken.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.001 || maxDistance <= 0) return;
    const scale = Math.min(1, maxDistance / distance);
    const nextPosition = {
        x: chicken.position.x + dx * scale,
        y: chicken.position.y + dy * scale,
    };
    if (canOccupy(nextPosition)) chicken.position = nextPosition;
}

function distanceBetween(a: EconomyPoint, b: EconomyPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function completeHatches(
    state: ChickenFarmEconomyState,
    elapsedSec: number,
    events: EconomyEvent[],
    options?: EconomyUpdateOptions,
) {
    for (let index = state.hatchJobs.length - 1; index >= 0; index -= 1) {
        const job = state.hatchJobs[index];
        if (elapsedSec < job.completeAtSec) continue;

        const coop = state.coops.find((candidate) => candidate.id === job.coopId);
        const position = coop?.position ?? { x: 0, y: 0 };
        const templateId = coop
            ? state.config.coopRules[coop.kind].templateId
            : 'coop_basic';
        const productionExit = resolveBuildingProductionExit({
            buildingCenter: position,
            isPositionAvailable: options?.canChickenOccupyPoint,
            templateId,
            unitRadiusPx: CHICKEN_COLLISION_RADIUS_PX,
        });
        const chicken = addEconomyChicken(state, {
            elapsedSec,
            kind: job.resultChickenKind,
            ownerPlayerId: job.ownerPlayerId,
            position: productionExit.point,
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
