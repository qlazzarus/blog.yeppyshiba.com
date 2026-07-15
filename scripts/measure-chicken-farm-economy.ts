import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    addEconomyChicken,
    addEconomyCoop,
    addEconomyFieldEgg,
    addEconomyWell,
    countInventoryItem,
    createChickenFarmEconomyState,
    depositEggStackToCoop,
    dropInventoryEggToField,
    ensureEconomyInventory,
    feedNearestEconomyChicken,
    herdEconomyChickens,
    pickupFieldEgg,
    sellEconomyInventoryEggStack,
    startCoopHatch,
    upgradeEconomyWellToWindmill,
    updateChickenFarmEconomy,
} from '../games/chicken-farm/src/game/systems/economySystem';
import { resolveBuildingProductionExit } from '../games/chicken-farm/src/game/systems/buildingProductionExit';
import {
    attachCompletedBuildingEconomy,
    detachBuildingEconomy,
} from '../games/chicken-farm/src/game/systems/buildingEconomyAdapter';
import type { PlayerBuilding } from '../games/chicken-farm/src/game/systems/buildingSystem';
import type { EconomyEvent } from '../games/chicken-farm/src/game/systems/economyTypes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
);
const outputPath = path.join(outputDir, 'economy_poc_metrics.json');

async function main() {
    const state = createChickenFarmEconomyState({
        players: [{ carriedEggs: 0, coins: 120, id: 3 }],
    });
    const lifecycleState = createChickenFarmEconomyState();
    const lifecycleBuilding = (
        id: string,
        templateId: PlayerBuilding['templateId'],
        x: number,
        y: number,
    ) =>
        ({
            footprint: { height: 128, width: 128, x, y },
            id,
            ownerPlayerId: 3,
            templateId,
        }) as PlayerBuilding;
    const lifecycleCoopBuilding = lifecycleBuilding(
        'player-building-42',
        'coop_basic',
        256,
        256,
    );
    const lifecycleWellBuilding = lifecycleBuilding(
        'player-building-43',
        'well_basic',
        384,
        256,
    );
    const lifecycleCoop = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleCoopBuilding,
    );
    const lifecycleWell = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleWellBuilding,
    );
    const removedLifecycleCoop = detachBuildingEconomy(
        lifecycleState,
        lifecycleCoopBuilding,
    );
    const removedLifecycleWell = detachBuildingEconomy(
        lifecycleState,
        lifecycleWellBuilding,
    );
    const coop = addEconomyCoop(state, {
        kind: 'basic',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const well = addEconomyWell(state, {
        kind: 'windmill',
        ownerPlayerId: 3,
        position: { x: 1040, y: 1000 },
    });
    const buffedChicken = addEconomyChicken(state, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1080, y: 1000 },
    });
    const unbuffedChicken = addEconomyChicken(state, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1800, y: 1000 },
    });

    const events: EconomyEvent[] = [];
    const farmerInventory = ensureEconomyInventory(state, {
        id: 'p3-farmer',
        ownerPlayerId: 3,
    });
    events.push(...updateChickenFarmEconomy(state, 22.49));
    const beforeBuffDropCount = state.fieldEggs.length;
    events.push(...updateChickenFarmEconomy(state, 22.5));
    const buffedDrop = state.fieldEggs.find(
        (egg) => egg.sourceChickenId === buffedChicken.id,
    );
    events.push(...updateChickenFarmEconomy(state, 29.99));
    const beforeUnbuffedDropCount = state.fieldEggs.length;
    events.push(...updateChickenFarmEconomy(state, 30));
    const unbuffedDrop = state.fieldEggs.find(
        (egg) => egg.sourceChickenId === unbuffedChicken.id,
    );
    let farmerInventoryEggs = 0;
    let coopInventoryEggsAfterDeposit = 0;
    let fieldEggsAfterInventoryDrop = 0;

    if (buffedDrop) {
        const pickupEvent = pickupFieldEgg(state, {
            eggId: buffedDrop.id,
            ownerPlayerId: 3,
            targetInventoryId: farmerInventory.id,
        });
        if (pickupEvent) {
            farmerInventoryEggs += pickupEvent.stackCount;
            events.push(pickupEvent);
        }
        const fieldDropEvent = dropInventoryEggToField(state, {
            droppedAtSec: 24,
            ownerPlayerId: 3,
            position: { x: 1120, y: 1040 },
            sourceInventoryId: farmerInventory.id,
            sourceSlotIndex: pickupEvent?.slotIndex ?? 0,
        });
        if (fieldDropEvent) {
            farmerInventoryEggs -= fieldDropEvent.stackCount;
            events.push(fieldDropEvent);
        }
        fieldEggsAfterInventoryDrop = state.fieldEggs.length;
        const repickupEvent = fieldDropEvent
            ? pickupFieldEgg(state, {
                  eggId: fieldDropEvent.eggId,
                  ownerPlayerId: 3,
                  targetInventoryId: farmerInventory.id,
              })
            : null;
        if (repickupEvent) {
            farmerInventoryEggs += repickupEvent.stackCount;
            events.push(repickupEvent);
        }
        const depositEvent = depositEggStackToCoop(state, {
            coopId: coop.id,
            ownerPlayerId: 3,
            sourceInventoryId: 'p3-farmer',
            sourceSlotIndex: repickupEvent?.slotIndex ?? pickupEvent?.slotIndex ?? 0,
        });
        if (depositEvent) {
            farmerInventoryEggs -= depositEvent.stackCount;
            events.push(depositEvent);
        }
    }
    coopInventoryEggsAfterDeposit = countInventoryItem(state, coop.id, 'I006');
    const hatchStarted = startCoopHatch(state, {
        coopId: coop.id,
        elapsedSec: 30,
    });
    if (hatchStarted) events.push(hatchStarted);
    events.push(...updateChickenFarmEconomy(state, 49.99));
    const beforeHatchChickenCount = state.chickens.length;
    events.push(...updateChickenFarmEconomy(state, 50));
    const hatchedChicken = state.chickens.at(-1);
    const hatchSpawnPosition = hatchedChicken
        ? { ...hatchedChicken.position }
        : null;
    updateChickenFarmEconomy(state, 50.25);
    const hatchSpawnAiActive =
        Boolean(hatchedChicken) &&
        (hatchedChicken!.aiState === 'recover' ||
            hatchedChicken!.aiState === 'seek_well' ||
            hatchedChicken!.aiState === 'wander');
    const expectedHatchExit = resolveBuildingProductionExit({
        buildingCenter: coop.position,
        templateId: 'coop_basic',
        unitRadiusPx: 20,
    }).point;
    const fallbackProductionExit = resolveBuildingProductionExit({
        buildingCenter: coop.position,
        isPositionAvailable: (point) => point.x < coop.position.x,
        templateId: 'coop_basic',
        unitRadiusPx: 20,
    });

    const stackState = createChickenFarmEconomyState({
        players: [{ carriedEggs: 0, coins: 120, id: 3 }],
    });
    const stackCoop = addEconomyCoop(stackState, {
        kind: 'basic',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const stackFarmerInventory = ensureEconomyInventory(stackState, {
        id: 'stack-test-farmer',
        ownerPlayerId: 3,
    });
    for (let index = 0; index < 4; index += 1) {
        const egg = addEconomyFieldEgg(stackState, {
            droppedAtSec: 0,
            ownerPlayerId: 3,
            position: { x: 900 + index * 16, y: 1000 },
            sourceChickenId: 'stack-test',
            stackCount: 1,
            wellBuffed: false,
        });
        pickupFieldEgg(stackState, {
            eggId: egg.id,
            ownerPlayerId: 3,
            targetInventoryId: stackFarmerInventory.id,
        });
    }
    const stackedFarmerEggs = countInventoryItem(
        stackState,
        stackFarmerInventory.id,
        'I006',
    );
    const stackedFarmerSlots = stackFarmerInventory.slots.filter(Boolean).length;
    depositEggStackToCoop(stackState, {
        coopId: stackCoop.id,
        ownerPlayerId: 3,
        sourceInventoryId: stackFarmerInventory.id,
        sourceSlotIndex: 0,
    });
    const stackedCoopEggs = countInventoryItem(stackState, stackCoop.id, 'I006');
    const stackedCoopSlots =
        stackState.inventories
            .find((inventory) => inventory.id === stackCoop.id)
            ?.slots.filter(Boolean).length ?? 0;
    const explicitStackHatch = startCoopHatch(stackState, {
        coopId: stackCoop.id,
        elapsedSec: 10,
    });
    const stackedCoopEggsAfterExplicitHatch = countInventoryItem(
        stackState,
        stackCoop.id,
        'I006',
    );
    const sharedWallet = {
        carriedEggs: 0,
        coins: 120,
        eggs: 0,
        gold: 120,
        id: 3,
        lumber: 52,
        supplyCap: 0,
        supplyUsed: 0,
    };
    const walletState = createChickenFarmEconomyState({ players: [sharedWallet] });
    const walletInventory = ensureEconomyInventory(walletState, {
        id: 'wallet-farmer',
        ownerPlayerId: 3,
    });
    walletInventory.slots[0] = { itemRawcode: 'I006', quantity: 3 };
    const saleWithoutMarket = sellEconomyInventoryEggStack(walletState, {
        inventoryId: walletInventory.id,
        marketId: '',
        ownerPlayerId: 3,
        slotIndex: 0,
    });
    const walletSale = sellEconomyInventoryEggStack(walletState, {
        inventoryId: walletInventory.id,
        marketId: 'player-building-market',
        ownerPlayerId: 3,
        slotIndex: 0,
    });

    const vitalityState = createChickenFarmEconomyState();
    addEconomyWell(vitalityState, {
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const vitalityChicken = addEconomyChicken(vitalityState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1300, y: 1000 },
    });
    let seekObserved = false;
    let recoverObserved = false;
    for (let elapsedSec = 0.25; elapsedSec <= 180; elapsedSec += 0.25) {
        updateChickenFarmEconomy(vitalityState, elapsedSec);
        seekObserved ||= vitalityChicken.aiState === 'seek_well';
        recoverObserved ||= vitalityChicken.aiState === 'recover';
    }
    const strandedState = createChickenFarmEconomyState();
    const strandedChicken = addEconomyChicken(strandedState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1300, y: 1000 },
    });
    for (let elapsedSec = 0.25; elapsedSec <= 125; elapsedSec += 0.25) {
        updateChickenFarmEconomy(strandedState, elapsedSec);
    }
    const capacityState = createChickenFarmEconomyState();
    addEconomyWell(capacityState, {
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    for (let index = 0; index < 9; index += 1) {
        addEconomyChicken(capacityState, {
            elapsedSec: 0,
            ownerPlayerId: 3,
            position: { x: 1120 + index * 4, y: 1000 },
        });
    }
    updateChickenFarmEconomy(capacityState, 0.25);
    const basicWellAttractedCount = capacityState.chickens.filter(
        (chicken) => chicken.targetWellId !== null,
    ).length;
    const upgradedToWindmill = upgradeEconomyWellToWindmill(
        capacityState,
        capacityState.wells[0].id,
    );
    const windmillCapacityState = createChickenFarmEconomyState();
    addEconomyWell(windmillCapacityState, {
        kind: 'windmill',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    for (let index = 0; index < 17; index += 1) {
        addEconomyChicken(windmillCapacityState, {
            elapsedSec: 0,
            ownerPlayerId: 3,
            position: { x: 1120 + index * 4, y: 1000 },
        });
    }
    updateChickenFarmEconomy(windmillCapacityState, 0.25);
    const windmillAttractedCount = windmillCapacityState.chickens.filter(
        (chicken) => chicken.targetWellId !== null,
    ).length;
    const herdState = createChickenFarmEconomyState();
    for (let index = 0; index < 9; index += 1) {
        addEconomyChicken(herdState, {
            elapsedSec: 0,
            ownerPlayerId: 3,
            position: { x: 1000 + index * 12, y: 1000 },
        });
    }
    const herdStartX = herdState.chickens.map((chicken) => chicken.position.x);
    const herdedChickenIds = herdEconomyChickens(herdState, {
        casterPosition: { x: 1000, y: 1000 },
        elapsedSec: 0,
        ownerPlayerId: 3,
        targetPosition: { x: 1300, y: 1000 },
    });
    updateChickenFarmEconomy(herdState, 0.25);
    const herdedIdSet = new Set(herdedChickenIds);
    const movedHerdChickenCount = herdState.chickens.filter(
        (chicken, index) =>
            herdedIdSet.has(chicken.id) && chicken.position.x > herdStartX[index],
    ).length;
    const feedState = createChickenFarmEconomyState();
    const hungriestChicken = addEconomyChicken(feedState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1040, y: 1000 },
    });
    const otherHungryChicken = addEconomyChicken(feedState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1080, y: 1000 },
    });
    hungriestChicken.hp = 10;
    otherHungryChicken.hp = 20;
    const feedResult = feedNearestEconomyChicken(feedState, {
        casterPosition: { x: 1000, y: 1000 },
        ownerPlayerId: 3,
    });

    const metrics = {
        generatedAt: new Date().toISOString(),
        scenario: {
            description:
                'Chicken Farm economy P0: well-buffed chicken lays early, farmer inventory carries the egg into a Warcraft III-style coop inventory, then hatch explicitly consumes one egg.',
            sourceReferences: [
                'object_mod_key_strings.tsv: A000 알낳기',
                'object_mod_key_strings.tsv: A02G 촉진제',
                'unit_rawcode_crosscheck.tsv: H000 AInv',
                'object_mod_key_strings.tsv: A00K/A00N/A03L 부화',
                'item_catalog_reference.tsv: I006 알',
            ],
        },
        state: {
            chickenCount: state.chickens.length,
            coopInventoryEggsAfterDeposit,
            coopStoredEggs: coop.storedEggs,
            fieldEggCount: state.fieldEggs.length,
            fieldEggsAfterInventoryDrop,
            hatchJobCount: state.hatchJobs.length,
            farmerInventoryEggs,
            stackValidation: {
                coopEggs: stackedCoopEggs,
                coopEggsAfterExplicitHatch: stackedCoopEggsAfterExplicitHatch,
                coopOccupiedSlots: stackedCoopSlots,
                farmerEggsBeforeDeposit: stackedFarmerEggs,
                farmerOccupiedSlotsBeforeDeposit: stackedFarmerSlots,
            },
            walletValidation: {
                coins: sharedWallet.coins,
                gold: sharedWallet.gold,
                remainingFarmerEggs: countInventoryItem(walletState, walletInventory.id, 'I006'),
                saleWithoutMarket: saleWithoutMarket !== null,
                soldEggs: walletSale?.soldEggs ?? 0,
            },
            vitalityValidation: {
                basicWellAttractedCount,
                finalAiState: vitalityChicken.aiState,
                finalHp: Number(vitalityChicken.hp.toFixed(2)),
                recoverObserved,
                seekObserved,
                strandedAiState: strandedChicken.aiState,
                windmillAttractedCount,
                upgradedToWindmill,
            },
            hatchSpawnValidation: {
                fallbackExit: fallbackProductionExit,
                aiActiveAfterSpawn: hatchSpawnAiActive,
                offsetFromCoop: hatchSpawnPosition
                    ? {
                          x: hatchSpawnPosition.x - coop.position.x,
                          y: hatchSpawnPosition.y - coop.position.y,
                      }
                    : null,
            },
            herdValidation: {
                affectedCount: herdedChickenIds.length,
                movedCount: movedHerdChickenCount,
            },
            feedValidation: {
                healedChickenId: feedResult?.chickenId ?? null,
                healedAmount: feedResult?.healed ?? 0,
            },
            wellCount: state.wells.length,
        },
        checks: [
            {
                actual: {
                    coopInventoryRemoved: !lifecycleState.inventories.some(
                        (inventory) => inventory.id === lifecycleCoopBuilding.id,
                    ),
                    coopRemoved: !lifecycleState.coops.some(
                        (candidate) => candidate.id === lifecycleCoopBuilding.id,
                    ),
                    removedCoop: removedLifecycleCoop,
                    removedWell: removedLifecycleWell,
                    wellRemoved: !lifecycleState.wells.some(
                        (candidate) => candidate.id === lifecycleWellBuilding.id,
                    ),
                },
                expected: {
                    coopInventoryRemoved: true,
                    coopRemoved: true,
                    removedCoop: 'coop',
                    removedWell: 'well',
                    wellRemoved: true,
                },
                id: 'world_building_id_owns_and_cleans_economy_capability',
                pass:
                    removedLifecycleCoop === 'coop' &&
                    removedLifecycleWell === 'well' &&
                    !lifecycleState.coops.some(
                        (candidate) => candidate.id === lifecycleCoopBuilding.id,
                    ) &&
                    !lifecycleState.wells.some(
                        (candidate) => candidate.id === lifecycleWellBuilding.id,
                    ) &&
                    !lifecycleState.inventories.some(
                        (inventory) => inventory.id === lifecycleCoopBuilding.id,
                    ),
            },
            {
                actual: beforeBuffDropCount,
                expected: 0,
                id: 'no_egg_before_buffed_interval',
                pass: beforeBuffDropCount === 0,
            },
            {
                actual: {
                    droppedAtSec: buffedDrop?.droppedAtSec ?? null,
                    wellBuffed: buffedDrop?.wellBuffed ?? null,
                },
                expected: {
                    droppedAtSec: 22.5,
                    wellBuffed: true,
                },
                id: 'windmill_accelerated_chicken_drops_at_22_5s',
                pass: buffedDrop?.wellBuffed === true && buffedDrop.droppedAtSec === 22.5,
            },
            {
                actual: beforeUnbuffedDropCount,
                expected: 1,
                id: 'unbuffed_chicken_waits_until_30s',
                pass: beforeUnbuffedDropCount === 1,
            },
            {
                actual: {
                    droppedAtSec: unbuffedDrop?.droppedAtSec ?? null,
                    wellBuffed: unbuffedDrop?.wellBuffed ?? null,
                },
                expected: {
                    droppedAtSec: 30,
                    wellBuffed: false,
                },
                id: 'unbuffed_chicken_drops_at_30s',
                pass:
                    unbuffedDrop?.wellBuffed === false && unbuffedDrop.droppedAtSec === 30,
            },
            {
                actual: {
                    coopInventoryEggsAfterDeposit,
                    farmerInventoryEggs,
                },
                expected: {
                    coopInventoryEggsAfterDeposit: 1,
                    farmerInventoryEggs: 0,
                },
                id: 'farmer_inventory_deposits_and_coop_keeps_egg',
                pass: farmerInventoryEggs === 0 && coopInventoryEggsAfterDeposit === 1,
            },
            {
                actual: fieldEggsAfterInventoryDrop,
                expected: 2,
                id: 'inventory_egg_can_drop_back_to_field',
                pass: fieldEggsAfterInventoryDrop === 2,
            },
            {
                actual: {
                    coopSlots: state.inventories.find(
                        (inventory) => inventory.id === coop.id,
                    )?.capacity,
                    farmerSlots: farmerInventory.capacity,
                },
                expected: {
                    coopSlots: 6,
                    farmerSlots: 6,
                },
                id: 'war3_inventory_has_six_slots',
                pass:
                    farmerInventory.capacity === 6 &&
                    state.inventories.find((inventory) => inventory.id === coop.id)
                        ?.capacity === 6,
            },
            {
                actual: beforeHatchChickenCount,
                expected: 2,
                id: 'hatch_waits_until_20s_duration',
                pass: beforeHatchChickenCount === 2,
            },
            {
                actual: state.chickens.length,
                expected: 3,
                id: 'coop_hatch_adds_chicken_at_50s',
                pass: state.chickens.length === 3,
            },
            {
                actual: hatchSpawnPosition
                    ? {
                          x: hatchSpawnPosition.x - coop.position.x,
                          y: hatchSpawnPosition.y - coop.position.y,
                      }
                    : null,
                expected: {
                    x: expectedHatchExit.x - coop.position.x,
                    y: expectedHatchExit.y - coop.position.y,
                },
                id: 'hatched_chicken_spawns_outside_coop_footprint',
                pass:
                    hatchSpawnPosition?.x === expectedHatchExit.x &&
                    hatchSpawnPosition.y === expectedHatchExit.y,
            },
            {
                actual: hatchSpawnAiActive,
                expected: true,
                id: 'hatched_chicken_ai_activates_after_spawn',
                pass: hatchSpawnAiActive,
            },
            {
                actual: {
                    resolved: fallbackProductionExit.resolved,
                    side: fallbackProductionExit.side,
                },
                expected: {
                    resolved: true,
                    side: 'west',
                },
                id: 'blocked_production_exit_falls_back_to_open_side',
                pass:
                    fallbackProductionExit.resolved &&
                    fallbackProductionExit.side === 'west',
            },
            {
                actual: {
                    eggs: stackedFarmerEggs,
                    occupiedSlots: stackedFarmerSlots,
                },
                expected: {
                    eggs: 4,
                    occupiedSlots: 1,
                },
                id: 'picked_up_eggs_stack_in_one_farmer_slot',
                pass: stackedFarmerEggs === 4 && stackedFarmerSlots === 1,
            },
            {
                actual: {
                    eggs: stackedCoopEggs,
                    occupiedSlots: stackedCoopSlots,
                },
                expected: {
                    eggs: 4,
                    occupiedSlots: 1,
                },
                id: 'egg_stack_moves_to_one_coop_slot',
                pass: stackedCoopEggs === 4 && stackedCoopSlots === 1,
            },
            {
                actual: {
                    eggsAfterDeposit: stackedCoopEggs,
                    eggsAfterHatchCommand: stackedCoopEggsAfterExplicitHatch,
                    hatchStarted: Boolean(explicitStackHatch),
                },
                expected: {
                    eggsAfterDeposit: 4,
                    eggsAfterHatchCommand: 3,
                    hatchStarted: true,
                },
                id: 'coop_keeps_full_stack_until_explicit_hatch_command',
                pass:
                    stackedCoopEggs === 4 &&
                    stackedCoopEggsAfterExplicitHatch === 3 &&
                    Boolean(explicitStackHatch),
            },
            {
                actual: {
                    coins: sharedWallet.coins,
                    gold: sharedWallet.gold,
                    remainingFarmerEggs: countInventoryItem(walletState, walletInventory.id, 'I006'),
                    saleWithoutMarket: saleWithoutMarket !== null,
                    soldEggs: walletSale?.soldEggs ?? 0,
                },
                expected: {
                    coins: 156,
                    gold: 156,
                    remainingFarmerEggs: 0,
                    saleWithoutMarket: false,
                    soldEggs: 3,
                },
                id: 'market_required_for_egg_sale_and_shared_wallet_updates_once',
                pass:
                    saleWithoutMarket === null &&
                    walletSale?.soldEggs === 3 &&
                    sharedWallet.coins === 156 &&
                    sharedWallet.gold === 156 &&
                    countInventoryItem(walletState, walletInventory.id, 'I006') === 0,
            },
            {
                actual: {
                    recoverObserved,
                    seekObserved,
                },
                expected: {
                    recoverObserved: true,
                    seekObserved: true,
                },
                id: 'lured_chicken_seeks_well_and_recovers',
                pass: seekObserved && recoverObserved,
            },
            {
                actual: {
                    aiState: strandedChicken.aiState,
                    hp: Number(strandedChicken.hp.toFixed(2)),
                },
                expected: {
                    aiState: 'wander',
                    hpBelowMax: true,
                },
                id: 'chicken_outside_lure_keeps_wandering_and_loses_hp',
                pass:
                    strandedChicken.aiState === 'wander' &&
                    strandedChicken.hp < strandedChicken.maxHp,
            },
            {
                actual: basicWellAttractedCount,
                expected: 8,
                id: 'basic_well_feeds_up_to_eight_chickens',
                pass: basicWellAttractedCount === 8,
            },
            {
                actual: windmillAttractedCount,
                expected: 16,
                id: 'windmill_feeds_up_to_sixteen_chickens',
                pass: windmillAttractedCount === 16,
            },
            {
                actual: {
                    kind: capacityState.wells[0].kind,
                    upgraded: upgradedToWindmill,
                },
                expected: {
                    kind: 'windmill',
                    upgraded: true,
                },
                id: 'basic_well_upgrades_to_windmill',
                pass:
                    upgradedToWindmill &&
                    capacityState.wells[0].kind === 'windmill',
            },
            {
                actual: {
                    affectedCount: herdedChickenIds.length,
                    movedCount: movedHerdChickenCount,
                },
                expected: {
                    affectedCount: 8,
                    movedCount: 8,
                },
                id: 'farmer_a002_herds_up_to_eight_nearby_chickens',
                pass:
                    herdedChickenIds.length === 8 &&
                    movedHerdChickenCount === 8,
            },
            {
                actual: {
                    healed: feedResult?.healed ?? 0,
                    healedChickenId: feedResult?.chickenId ?? null,
                    hp: hungriestChicken.hp,
                    otherHp: otherHungryChicken.hp,
                },
                expected: {
                    healed: 10,
                    healedChickenId: hungriestChicken.id,
                    hp: 20,
                    otherHp: 20,
                },
                id: 'farmer_a001_feeds_most_hungry_nearby_chicken',
                pass:
                    feedResult?.chickenId === hungriestChicken.id &&
                    feedResult.healed === 10 &&
                    hungriestChicken.hp === 20 &&
                    otherHungryChicken.hp === 20,
            },
        ],
        events,
    };
    const pass = metrics.checks.every((check) => check.pass);

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({ ...metrics, pass }, null, 2)}\n`);

    console.table(
        metrics.checks.map((check) => ({
            actual: JSON.stringify(check.actual),
            expected: JSON.stringify(check.expected),
            id: check.id,
            pass: check.pass,
        })),
    );
    console.log(`Wrote ${outputPath}`);
    if (!pass) {
        process.exitCode = 1;
    }
}

void main();
