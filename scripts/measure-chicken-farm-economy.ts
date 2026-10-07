import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    addEconomyChicken,
    addEconomyCoop,
    addEconomyFieldEgg,
    addEconomyLumberMill,
    addEconomyWell,
    countInventoryItem,
    createChickenFarmEconomyState,
    depositEggStackToCoop,
    dropInventoryEggToField,
    ensureEconomyInventory,
    feedNearestEconomyChicken,
    getLumberMillIncomeSnapshot,
    grantEconomyInventoryItem,
    herdEconomyChickens,
    pickupFieldEgg,
    removeEconomyBuilding,
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
import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';
import {
    refundWalletCost,
    spendWalletCost,
} from '../games/chicken-farm/src/game/systems/playerWallet';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
);
const outputPath = path.join(outputDir, 'economy_poc_metrics.json');

async function main() {
    const state = createChickenFarmEconomyState({
        players: [{ gold: 120, id: 3, lumber: 0, supplyCap: 0, supplyUsed: 0 }],
    });
    const lifecycleState = createChickenFarmEconomyState({
        players: [
            { gold: 0, id: 3, lumber: 0, supplyCap: 0, supplyUsed: 0 },
            { gold: 0, id: 4, lumber: 0, supplyCap: 0, supplyUsed: 0 },
        ],
    });
    const lifecycleBuilding = (
        id: string,
        templateId: PlayerBuilding['templateId'],
        x: number,
        y: number,
    ) =>
        ({
            completedAtSec: 0,
            footprint: { height: 128, width: 128, x, y },
            id,
            ownerPlayerId: 3,
            startedAtSec: 0,
            state: 'complete',
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
    const lifecycleLumberMillBuilding = lifecycleBuilding(
        'player-building-44',
        'lumber_mill',
        512,
        256,
    );
    const lifecycleForeignLumberMillBuilding = {
        ...lifecycleBuilding('player-building-45', 'lumber_mill_mid', 640, 256),
        completedAtSec: 30,
        ownerPlayerId: 4,
        startedAtSec: 30,
    } as PlayerBuilding;
    const lifecycleConstructingLumberMillBuilding = {
        ...lifecycleBuilding('player-building-46', 'lumber_mill_high', 768, 256),
        state: 'constructing',
    } as PlayerBuilding;
    const lifecycleLumberMill = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleLumberMillBuilding,
    );
    const lifecycleLumberMillDuplicate = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleLumberMillBuilding,
    );
    const lifecycleForeignLumberMill = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleForeignLumberMillBuilding,
    );
    const lifecycleConstructingLumberMill = attachCompletedBuildingEconomy(
        lifecycleState,
        lifecycleConstructingLumberMillBuilding,
    );
    const lifecycleIncomeAt30 = updateChickenFarmEconomy(lifecycleState, 30);
    const removedLifecycleLumberMill = detachBuildingEconomy(
        lifecycleState,
        lifecycleLumberMillBuilding,
    );
    const repeatedRemovedLifecycleLumberMill = detachBuildingEconomy(
        lifecycleState,
        lifecycleLumberMillBuilding,
    );
    const lifecycleIncomeAt60 = updateChickenFarmEconomy(lifecycleState, 60);
    const lumberIncomeState = createChickenFarmEconomyState({
        players: [
            { gold: 101, id: 3, lumber: 7, supplyCap: 4, supplyUsed: 1 },
            { gold: 202, id: 4, lumber: 11, supplyCap: 6, supplyUsed: 2 },
        ],
    });
    const ownerThreeBasicMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-basic',
        ownerPlayerId: 3,
        templateId: 'lumber_mill',
    });
    const ownerThreeMidMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-mid',
        ownerPlayerId: 3,
        templateId: 'lumber_mill_mid',
    });
    const ownerThreeHighMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 30,
        id: 'lumber-mill-high',
        ownerPlayerId: 3,
        templateId: 'lumber_mill_high',
    });
    const ownerFourBasicMillOne = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-owner-four-one',
        ownerPlayerId: 4,
        templateId: 'lumber_mill',
    });
    const ownerFourBasicMillTwo = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-owner-four-two',
        ownerPlayerId: 4,
        templateId: 'lumber_mill',
    });
    const rejectedDuplicateLumberMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-basic',
        ownerPlayerId: 3,
        templateId: 'lumber_mill',
    });
    const rejectedForeignLumberMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-missing-owner',
        ownerPlayerId: 99,
        templateId: 'lumber_mill',
    });
    const rejectedUnknownLumberMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 0,
        id: 'lumber-mill-unknown-template',
        ownerPlayerId: 3,
        templateId: 'not_a_lumber_mill' as never,
    });
    addEconomyChicken(lumberIncomeState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 200, y: 200 },
    });
    const lumberIncomeBeforeTick = updateChickenFarmEconomy(lumberIncomeState, 29.999);
    const lumberIncomeAtFirstTick = updateChickenFarmEconomy(lumberIncomeState, 30);
    const lumberIncomeAtRepeatedTick = updateChickenFarmEconomy(lumberIncomeState, 30);
    const lateOwnerThreeBasicMill = addEconomyLumberMill(lumberIncomeState, {
        activeFromSec: 30.001,
        id: 'lumber-mill-late-basic',
        ownerPlayerId: 3,
        templateId: 'lumber_mill',
    });
    const lumberIncomeAtSecondTick = updateChickenFarmEconomy(lumberIncomeState, 60);
    const lumberIncomeLargeDelta = updateChickenFarmEconomy(lumberIncomeState, 125);
    const lumberIncomeWallets = lumberIncomeState.players.map((player) => ({
        gold: player.gold,
        id: player.id,
        lumber: player.lumber,
        supplyCap: player.supplyCap,
        supplyUsed: player.supplyUsed,
    }));
    const lumberIncomeSnapshotBeforeRepeat = getLumberMillIncomeSnapshot(lumberIncomeState);
    const lumberIncomeSnapshotAfterRepeat = getLumberMillIncomeSnapshot(lumberIncomeState);
    const resetLumberIncomeSnapshot = getLumberMillIncomeSnapshot(
        createChickenFarmEconomyState(),
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

    const blockedHatchState = createChickenFarmEconomyState();
    const blockedHatchCoop = addEconomyCoop(blockedHatchState, {
        ownerPlayerId: 3,
        position: { x: 1500, y: 1500 },
    });
    grantEconomyInventoryItem(blockedHatchState, {
        inventoryId: blockedHatchCoop.id,
        itemRawcode: 'I006',
        quantity: 1,
    });
    const blockedHatchStarted = startCoopHatch(blockedHatchState, {
        coopId: blockedHatchCoop.id,
        elapsedSec: 0,
    });
    const blockedHatchWallet = { ...blockedHatchState.players[0]! };
    const blockedHatchBeforeDue = updateChickenFarmEconomy(blockedHatchState, 19.99, {
        canChickenOccupyPoint: () => false,
    });
    const blockedHatchAtDue = updateChickenFarmEconomy(blockedHatchState, 20, {
        canChickenOccupyPoint: () => false,
    });
    const blockedHatchJobsAtDue = blockedHatchState.hatchJobs.length;
    const blockedHatchAfterRelease = updateChickenFarmEconomy(blockedHatchState, 20.25, {
        canChickenOccupyPoint: () => true,
    });
    updateChickenFarmEconomy(blockedHatchState, 21, { canChickenOccupyPoint: () => true });
    const orphanHatchState = createChickenFarmEconomyState();
    orphanHatchState.hatchJobs.push({
        completeAtSec: 20,
        coopId: 'removed-coop',
        id: 'hatch-orphan',
        ownerPlayerId: 3,
        resultChickenKind: 'basic',
        startedAtSec: 0,
    });
    updateChickenFarmEconomy(orphanHatchState, 20);

    const stackState = createChickenFarmEconomyState({
        players: [{ gold: 120, id: 3, lumber: 0, supplyCap: 0, supplyUsed: 0 }],
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
    const stackWalletGoldBeforeHatch = stackState.players[0]?.gold ?? 0;
    const stackWalletLumberBeforeHatch = stackState.players[0]?.lumber ?? 0;
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
        gold: 120,
        id: 3,
        lumber: 52,
        supplyCap: 0,
        supplyUsed: 0,
    };
    const walletState = createChickenFarmEconomyState({
        players: [
            sharedWallet,
            { gold: 80, id: 4, lumber: 13, supplyCap: 0, supplyUsed: 0 },
        ],
    });
    const walletInventory = ensureEconomyInventory(walletState, {
        id: 'wallet-farmer',
        ownerPlayerId: 3,
    });
    walletInventory.slots[0] = { itemRawcode: 'I006', quantity: 3 };
    const walletGoldBeforeRejectedSale = sharedWallet.gold;
    const walletLumberBeforeRejectedSale = sharedWallet.lumber;
    const saleWithoutMarket = sellEconomyInventoryEggStack(walletState, {
        inventoryId: walletInventory.id,
        marketId: '',
        ownerPlayerId: 3,
        slotIndex: 0,
    });
    const eggsAfterRejectedSale = countInventoryItem(walletState, walletInventory.id, 'I006');
    const walletGoldAfterRejectedSale = sharedWallet.gold;
    const walletLumberAfterRejectedSale = sharedWallet.lumber;
    const foreignOwnerSale = sellEconomyInventoryEggStack(walletState, {
        inventoryId: walletInventory.id,
        marketId: 'player-building-market',
        ownerPlayerId: 4,
        slotIndex: 0,
    });
    const eggsAfterForeignOwnerSale = countInventoryItem(walletState, walletInventory.id, 'I006');
    const walletSale = sellEconomyInventoryEggStack(walletState, {
        inventoryId: walletInventory.id,
        marketId: 'player-building-market',
        ownerPlayerId: 3,
        slotIndex: 0,
    });
    const constructionCost = {
        gold: CHICKEN_FARM_BALANCE.buildingTemplates.coop_basic.costGold,
        lumber: CHICKEN_FARM_BALANCE.buildingTemplates.coop_basic.costLumber,
    };
    const constructionWallet = {
        gold: constructionCost.gold,
        lumber: constructionCost.lumber ?? 0,
        supplyCap: 0,
        supplyUsed: 0,
    };
    const constructionPaid = spendWalletCost(constructionWallet, constructionCost);
    const constructionRefund = {
        gold: Math.floor(constructionCost.gold * 0.75),
        lumber: Math.floor((constructionCost.lumber ?? 0) * 0.75),
    };
    refundWalletCost(constructionWallet, constructionRefund);

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
    const pickupBoundaryState = createChickenFarmEconomyState();
    const fullInventory = ensureEconomyInventory(pickupBoundaryState, {
        capacity: 1,
        id: 'full-farmer',
        ownerPlayerId: 3,
    });
    grantEconomyInventoryItem(pickupBoundaryState, {
        inventoryId: fullInventory.id,
        itemRawcode: 'I003',
        quantity: 1,
    });
    const fullInventoryEgg = addEconomyFieldEgg(pickupBoundaryState, {
        droppedAtSec: 0,
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
        sourceChickenId: 'pickup-boundary',
        stackCount: 1,
        wellBuffed: false,
    });
    const foreignEgg = addEconomyFieldEgg(pickupBoundaryState, {
        droppedAtSec: 0,
        ownerPlayerId: 4,
        position: { x: 1020, y: 1000 },
        sourceChickenId: 'pickup-foreign',
        stackCount: 1,
        wellBuffed: false,
    });
    const fullPickup = pickupFieldEgg(pickupBoundaryState, {
        eggId: fullInventoryEgg.id,
        ownerPlayerId: 3,
        targetInventoryId: fullInventory.id,
    });
    const foreignPickup = pickupFieldEgg(pickupBoundaryState, {
        eggId: foreignEgg.id,
        ownerPlayerId: 3,
        targetInventoryId: fullInventory.id,
    });
    const wellBoundaryState = createChickenFarmEconomyState();
    const boundaryWell = addEconomyWell(wellBoundaryState, {
        id: 'boundary-well',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const insideChicken = addEconomyChicken(wellBoundaryState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1096, y: 1000 },
    });
    const outsideChicken = addEconomyChicken(wellBoundaryState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1097, y: 1000 },
    });
    const foreignChicken = addEconomyChicken(wellBoundaryState, {
        elapsedSec: 0,
        ownerPlayerId: 4,
        position: { x: 1000, y: 1000 },
    });
    insideChicken.hp = 20;
    outsideChicken.hp = 20;
    foreignChicken.hp = 20;
    updateChickenFarmEconomy(wellBoundaryState, 0.25);
    const afterWellBoundary = {
        foreignHp: foreignChicken.hp,
        insideHp: insideChicken.hp,
        outsideHp: outsideChicken.hp,
    };
    removeEconomyBuilding(wellBoundaryState, boundaryWell.id);
    updateChickenFarmEconomy(wellBoundaryState, 0.5);
    const afterWellRemovalHp = insideChicken.hp;
    const windmillOwnershipState = createChickenFarmEconomyState();
    addEconomyWell(windmillOwnershipState, {
        kind: 'windmill',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const windmillFriendly = addEconomyChicken(windmillOwnershipState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const windmillForeign = addEconomyChicken(windmillOwnershipState, {
        elapsedSec: 0,
        ownerPlayerId: 4,
        position: { x: 1000, y: 1000 },
    });
    const deadChickenState = createChickenFarmEconomyState();
    const deadChicken = addEconomyChicken(deadChickenState, {
        elapsedSec: 0,
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    deadChicken.hp = 0;
    updateChickenFarmEconomy(deadChickenState, 0.25);
    updateChickenFarmEconomy(deadChickenState, 60);
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
                constructionPaid,
                constructionWallet,
                gold: sharedWallet.gold,
                lumber: sharedWallet.lumber,
                rejectedSaleEggs: eggsAfterRejectedSale,
                rejectedSaleGoldAfter: walletGoldAfterRejectedSale,
                rejectedSaleGold: walletGoldBeforeRejectedSale,
                rejectedSaleLumberAfter: walletLumberAfterRejectedSale,
                rejectedSaleLumber: walletLumberBeforeRejectedSale,
                remainingFarmerEggs: countInventoryItem(walletState, walletInventory.id, 'I006'),
                saleWithoutMarket: saleWithoutMarket !== null,
                soldEggs: walletSale?.soldEggs ?? 0,
            },
            lumberIncomeValidation: {
                beforeTickIncomeEvents: lumberIncomeBeforeTick.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                firstTickIncomeEvents: lumberIncomeAtFirstTick.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                largeDeltaIncomeEvents: lumberIncomeLargeDelta.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                lumberMillCount: lumberIncomeState.lumberMills.length,
                repeatedTickIncomeEvents: lumberIncomeAtRepeatedTick.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                secondTickIncomeEvents: lumberIncomeAtSecondTick.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                wallets: lumberIncomeWallets,
                snapshot: lumberIncomeSnapshotBeforeRepeat,
                resetSnapshot: resetLumberIncomeSnapshot,
            },
            lumberMillLifecycleValidation: {
                incomeAt30: lifecycleIncomeAt30.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                incomeAt60: lifecycleIncomeAt60.filter(
                    (event) => event.type === 'lumber_income_paid',
                ),
                lumberMillIds: lifecycleState.lumberMills.map((mill) => mill.id),
                wallets: lifecycleState.players.map((player) => ({
                    id: player.id,
                    lumber: player.lumber,
                })),
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
                    canonicalRules: CHICKEN_FARM_BALANCE.lumberMillIncome,
                    firstTick: lumberIncomeAtFirstTick.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    firstTickAlsoLaidEgg: lumberIncomeAtFirstTick.some(
                        (event) => event.type === 'egg_dropped',
                    ),
                    largeDelta: lumberIncomeLargeDelta.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    lumberMillCount: lumberIncomeState.lumberMills.length,
                    repeatedTick: lumberIncomeAtRepeatedTick.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    secondTick: lumberIncomeAtSecondTick.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    wallets: lumberIncomeWallets,
                    snapshot: lumberIncomeSnapshotBeforeRepeat,
                    repeatedSnapshot: lumberIncomeSnapshotAfterRepeat,
                    resetSnapshot: resetLumberIncomeSnapshot,
                },
                expected: {
                    firstTick: [
                        { lumber: 350, playerId: 3, tickSec: 30 },
                        { lumber: 140, playerId: 4, tickSec: 30 },
                    ],
                    largeDelta: [
                        { lumber: 420, playerId: 3, tickSec: 90 },
                        { lumber: 140, playerId: 4, tickSec: 90 },
                        { lumber: 420, playerId: 3, tickSec: 120 },
                        { lumber: 140, playerId: 4, tickSec: 120 },
                    ],
                    lumberMillCount: 6,
                    repeatedTick: [],
                    secondTick: [
                        { lumber: 420, playerId: 3, tickSec: 60 },
                        { lumber: 140, playerId: 4, tickSec: 60 },
                    ],
                    wallets: [
                        { gold: 101, id: 3, lumber: 1617, supplyCap: 4, supplyUsed: 1 },
                        { gold: 202, id: 4, lumber: 571, supplyCap: 6, supplyUsed: 2 },
                    ],
                    snapshot: {
                        lastProcessedTickSec: 120,
                        mills: 6,
                        totalsByPlayer: [
                            { lumber: 1610, playerId: 3 },
                            { lumber: 560, playerId: 4 },
                        ],
                    },
                    resetSnapshot: {
                        lastProcessedTickSec: 0,
                        mills: [],
                        totalsByPlayer: [{ lumber: 0, playerId: 3 }],
                    },
                },
                id: 'lumber_mills_pay_global_30s_income_without_replacing_chicken_eggs',
                pass:
                    CHICKEN_FARM_BALANCE.lumberMillIncome.lumber_mill.lumberPerTick === 70 &&
                    CHICKEN_FARM_BALANCE.lumberMillIncome.lumber_mill_mid.lumberPerTick === 110 &&
                    CHICKEN_FARM_BALANCE.lumberMillIncome.lumber_mill_high.lumberPerTick === 170 &&
                    CHICKEN_FARM_BALANCE.lumberMillIncome.lumber_mill.incomeIntervalSec === 30 &&
                    lumberIncomeBeforeTick.filter((event) => event.type === 'lumber_income_paid').length === 0 &&
                    lumberIncomeAtFirstTick.some((event) => event.type === 'egg_dropped') &&
                    JSON.stringify(lumberIncomeAtFirstTick.filter((event) => event.type === 'lumber_income_paid')) ===
                        JSON.stringify([
                            { lumber: 350, playerId: 3, tickSec: 30, type: 'lumber_income_paid' },
                            { lumber: 140, playerId: 4, tickSec: 30, type: 'lumber_income_paid' },
                        ]) &&
                    lumberIncomeAtRepeatedTick.filter((event) => event.type === 'lumber_income_paid').length === 0 &&
                    JSON.stringify(lumberIncomeAtSecondTick.filter((event) => event.type === 'lumber_income_paid')) ===
                        JSON.stringify([
                            { lumber: 420, playerId: 3, tickSec: 60, type: 'lumber_income_paid' },
                            { lumber: 140, playerId: 4, tickSec: 60, type: 'lumber_income_paid' },
                        ]) &&
                    JSON.stringify(lumberIncomeLargeDelta.filter((event) => event.type === 'lumber_income_paid')) ===
                        JSON.stringify([
                            { lumber: 420, playerId: 3, tickSec: 90, type: 'lumber_income_paid' },
                            { lumber: 140, playerId: 4, tickSec: 90, type: 'lumber_income_paid' },
                            { lumber: 420, playerId: 3, tickSec: 120, type: 'lumber_income_paid' },
                            { lumber: 140, playerId: 4, tickSec: 120, type: 'lumber_income_paid' },
                        ]) &&
                    rejectedDuplicateLumberMill === null &&
                    rejectedForeignLumberMill === null &&
                    rejectedUnknownLumberMill === null &&
                    Boolean(ownerThreeBasicMill) &&
                    Boolean(ownerThreeMidMill) &&
                    Boolean(ownerThreeHighMill) &&
                    Boolean(ownerFourBasicMillOne) &&
                    Boolean(ownerFourBasicMillTwo) &&
                    Boolean(lateOwnerThreeBasicMill) &&
                    lumberIncomeState.lumberMills.length === 6 &&
                    JSON.stringify(lumberIncomeWallets) ===
                        JSON.stringify([
                            { gold: 101, id: 3, lumber: 1617, supplyCap: 4, supplyUsed: 1 },
                            { gold: 202, id: 4, lumber: 571, supplyCap: 6, supplyUsed: 2 },
                        ]) &&
                    lumberIncomeSnapshotBeforeRepeat.lastProcessedTickSec === 120 &&
                    lumberIncomeSnapshotBeforeRepeat.mills.length === 6 &&
                    JSON.stringify(lumberIncomeSnapshotBeforeRepeat.totalsByPlayer) ===
                        JSON.stringify([
                            { lumber: 1610, playerId: 3 },
                            { lumber: 560, playerId: 4 },
                        ]) &&
                    JSON.stringify(lumberIncomeSnapshotBeforeRepeat) ===
                        JSON.stringify(lumberIncomeSnapshotAfterRepeat) &&
                    JSON.stringify(resetLumberIncomeSnapshot) ===
                        JSON.stringify({
                            lastProcessedTickSec: 0,
                            mills: [],
                            totalsByPlayer: [{ lumber: 0, playerId: 3 }],
                        }),
            },
            {
                actual: {
                    constructingAttach: lifecycleConstructingLumberMill,
                    duplicateAttach: lifecycleLumberMillDuplicate,
                    foreignAttach: lifecycleForeignLumberMill,
                    incomeAt30: lifecycleIncomeAt30.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    incomeAt60: lifecycleIncomeAt60.filter(
                        (event) => event.type === 'lumber_income_paid',
                    ),
                    lumberMillIds: lifecycleState.lumberMills.map((mill) => mill.id),
                    removed: removedLifecycleLumberMill,
                    repeatedRemoval: repeatedRemovedLifecycleLumberMill,
                    sourceAttach: lifecycleLumberMill,
                    wallets: lifecycleState.players.map((player) => ({
                        id: player.id,
                        lumber: player.lumber,
                    })),
                },
                expected: {
                    incomeAt30: [
                        { lumber: 70, playerId: 3, tickSec: 30 },
                        { lumber: 110, playerId: 4, tickSec: 30 },
                    ],
                    incomeAt60: [{ lumber: 110, playerId: 4, tickSec: 60 }],
                    lumberMillIds: ['player-building-45'],
                    removed: 'lumber_mill',
                    wallets: [
                        { id: 3, lumber: 70 },
                        { id: 4, lumber: 220 },
                    ],
                },
                id: 'completed_lumber_mills_attach_once_pay_owner_and_detach_immediately',
                pass:
                    Boolean(lifecycleLumberMill) &&
                    lifecycleLumberMillDuplicate === null &&
                    Boolean(lifecycleForeignLumberMill) &&
                    lifecycleConstructingLumberMill === null &&
                    JSON.stringify(lifecycleIncomeAt30.filter((event) => event.type === 'lumber_income_paid')) ===
                        JSON.stringify([
                            { lumber: 70, playerId: 3, tickSec: 30, type: 'lumber_income_paid' },
                            { lumber: 110, playerId: 4, tickSec: 30, type: 'lumber_income_paid' },
                        ]) &&
                    removedLifecycleLumberMill === 'lumber_mill' &&
                    repeatedRemovedLifecycleLumberMill === null &&
                    JSON.stringify(lifecycleIncomeAt60.filter((event) => event.type === 'lumber_income_paid')) ===
                        JSON.stringify([
                            { lumber: 110, playerId: 4, tickSec: 60, type: 'lumber_income_paid' },
                        ]) &&
                    JSON.stringify(lifecycleState.lumberMills.map((mill) => mill.id)) ===
                        JSON.stringify(['player-building-45']) &&
                    JSON.stringify(lifecycleState.players.map((player) => ({
                        id: player.id,
                        lumber: player.lumber,
                    }))) ===
                        JSON.stringify([
                            { id: 3, lumber: 70 },
                            { id: 4, lumber: 220 },
                        ]),
            },
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
                    chickensAfterRelease: blockedHatchState.chickens.length,
                    completedOnRelease: blockedHatchAfterRelease.filter((event) => event.type === 'hatch_completed').length,
                    completedWhileBlocked: blockedHatchAtDue.filter((event) => event.type === 'hatch_completed').length,
                    jobsWhileBlocked: blockedHatchJobsAtDue,
                    jobsAfterRelease: blockedHatchState.hatchJobs.length,
                },
                expected: 'blocked exit keeps one due job; release completes it once',
                id: 'blocked_hatch_exit_retries_without_duplicate_chicken',
                pass:
                    Boolean(blockedHatchStarted) &&
                    blockedHatchBeforeDue.length === 0 &&
                    blockedHatchAtDue.length === 0 &&
                    blockedHatchJobsAtDue === 1 &&
                    blockedHatchAfterRelease.filter((event) => event.type === 'hatch_completed').length === 1 &&
                    blockedHatchState.chickens.length === 1 &&
                    blockedHatchState.hatchJobs.length === 0 &&
                    blockedHatchState.players[0]?.gold === blockedHatchWallet.gold &&
                    blockedHatchState.players[0]?.lumber === blockedHatchWallet.lumber,
            },
            {
                actual: { chickens: orphanHatchState.chickens.length, jobs: orphanHatchState.hatchJobs.length },
                expected: { chickens: 0, jobs: 0 },
                id: 'missing_coop_hatch_never_uses_origin_fallback',
                pass: orphanHatchState.chickens.length === 0 && orphanHatchState.hatchJobs.length === 0,
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
                    goldAfterHatch: stackState.players[0]?.gold ?? 0,
                    goldBeforeHatch: stackWalletGoldBeforeHatch,
                    lumberAfterHatch: stackState.players[0]?.lumber ?? 0,
                    lumberBeforeHatch: stackWalletLumberBeforeHatch,
                },
                expected: 'hatching only consumes one coop inventory egg',
                id: 'hatch_does_not_change_player_wallet',
                pass:
                    (stackState.players[0]?.gold ?? 0) === stackWalletGoldBeforeHatch &&
                    (stackState.players[0]?.lumber ?? 0) === stackWalletLumberBeforeHatch,
            },
            {
                actual: {
                    gold: sharedWallet.gold,
                    lumber: sharedWallet.lumber,
                    rejectedSaleEggs: eggsAfterRejectedSale,
                    foreignOwnerSale: foreignOwnerSale !== null,
                    eggsAfterForeignOwnerSale,
                    rejectedSaleGoldAfter: walletGoldAfterRejectedSale,
                    rejectedSaleGold: walletGoldBeforeRejectedSale,
                    rejectedSaleLumberAfter: walletLumberAfterRejectedSale,
                    rejectedSaleLumber: walletLumberBeforeRejectedSale,
                    remainingFarmerEggs: countInventoryItem(walletState, walletInventory.id, 'I006'),
                    saleWithoutMarket: saleWithoutMarket !== null,
                    soldEggs: walletSale?.soldEggs ?? 0,
                },
                expected: {
                    gold: 156,
                    lumber: 52,
                    remainingFarmerEggs: 0,
                    rejectedSaleEggs: 3,
                    foreignOwnerSale: false,
                    eggsAfterForeignOwnerSale: 3,
                    rejectedSaleGoldAfter: 120,
                    rejectedSaleGold: 120,
                    rejectedSaleLumberAfter: 52,
                    rejectedSaleLumber: 52,
                    saleWithoutMarket: false,
                    soldEggs: 3,
                },
                id: 'market_required_for_egg_sale_and_shared_wallet_updates_once',
                pass:
                    saleWithoutMarket === null &&
                    walletSale?.soldEggs === 3 &&
                    sharedWallet.gold === 156 &&
                    sharedWallet.lumber === 52 &&
                    eggsAfterRejectedSale === 3 &&
                    foreignOwnerSale === null &&
                    eggsAfterForeignOwnerSale === 3 &&
                    walletGoldAfterRejectedSale === 120 &&
                    walletGoldBeforeRejectedSale === 120 &&
                    walletLumberAfterRejectedSale === 52 &&
                    walletLumberBeforeRejectedSale === 52 &&
                    countInventoryItem(walletState, walletInventory.id, 'I006') === 0,
            },
            {
                actual: constructionWallet,
                expected: {
                    gold: Math.floor(constructionCost.gold * 0.75),
                    lumber: Math.floor((constructionCost.lumber ?? 0) * 0.75),
                    supplyCap: 0,
                    supplyUsed: 0,
                },
                id: 'construction_cost_and_cancel_refund_use_gold_and_lumber_wallet',
                pass:
                    constructionPaid &&
                    constructionWallet.gold === Math.floor(constructionCost.gold * 0.75) &&
                    constructionWallet.lumber ===
                        Math.floor((constructionCost.lumber ?? 0) * 0.75),
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
                actual: {
                    fieldEggIds: pickupBoundaryState.fieldEggs.map((egg) => egg.id),
                    foreignPickup,
                    fullPickup,
                    inventorySlot: fullInventory.slots[0],
                },
                expected: {
                    fieldEggCount: 2,
                    foreignPickup: null,
                    fullPickup: null,
                    inventoryItemRawcode: 'I003',
                },
                id: 'pickup_rejects_full_inventory_and_foreign_owner_without_loss',
                pass:
                    fullPickup === null &&
                    foreignPickup === null &&
                    pickupBoundaryState.fieldEggs.length === 2 &&
                    fullInventory.slots[0]?.itemRawcode === 'I003',
            },
            {
                actual: {
                    afterRemovalHp: Number(afterWellRemovalHp.toFixed(2)),
                    foreignHp: Number(afterWellBoundary.foreignHp.toFixed(2)),
                    insideHp: Number(afterWellBoundary.insideHp.toFixed(2)),
                    outsideHp: Number(afterWellBoundary.outsideHp.toFixed(2)),
                },
                expected: {
                    afterRemovalHpBelowInsideHp: true,
                    foreignHp: 19.95,
                    insideHp: 21,
                    outsideHp: 19.95,
                },
                id: 'basic_well_heals_only_same_owner_inside_radius_and_stops_on_removal',
                pass:
                    afterWellBoundary.insideHp === 21 &&
                    afterWellBoundary.outsideHp === 19.95 &&
                    afterWellBoundary.foreignHp === 19.95 &&
                    afterWellRemovalHp < afterWellBoundary.insideHp,
            },
            {
                actual: windmillAttractedCount,
                expected: 16,
                id: 'windmill_feeds_up_to_sixteen_chickens',
                pass: windmillAttractedCount === 16,
            },
            {
                actual: {
                    foreignNextEggAtSec: windmillForeign.nextEggAtSec,
                    friendlyNextEggAtSec: windmillFriendly.nextEggAtSec,
                },
                expected: {
                    foreignNextEggAtSec: 30,
                    friendlyNextEggAtSec: 22.5,
                },
                id: 'windmill_accelerates_only_same_owner_chicken',
                pass:
                    windmillFriendly.nextEggAtSec === 22.5 &&
                    windmillForeign.nextEggAtSec === 30,
            },
            {
                actual: {
                    aiState: deadChicken.aiState,
                    fieldEggs: deadChickenState.fieldEggs.length,
                },
                expected: { aiState: 'dead', fieldEggs: 0 },
                id: 'dead_chicken_never_drops_eggs',
                pass: deadChicken.aiState === 'dead' && deadChickenState.fieldEggs.length === 0,
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
