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
    pickupFieldEgg,
    startCoopHatch,
    updateChickenFarmEconomy,
} from '../games/chicken-farm/src/game/systems/economySystem';
import { resolveBuildingProductionExit } from '../games/chicken-farm/src/game/systems/buildingProductionExit';
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
    const coop = addEconomyCoop(state, {
        kind: 'basic',
        ownerPlayerId: 3,
        position: { x: 1000, y: 1000 },
    });
    const well = addEconomyWell(state, {
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
    const hatchSpawnMoved =
        Boolean(hatchedChicken && hatchSpawnPosition) &&
        (hatchedChicken!.position.x !== hatchSpawnPosition!.x ||
            hatchedChicken!.position.y !== hatchSpawnPosition!.y);
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
                coopOccupiedSlots: stackedCoopSlots,
                farmerEggsBeforeDeposit: stackedFarmerEggs,
                farmerOccupiedSlotsBeforeDeposit: stackedFarmerSlots,
            },
            vitalityValidation: {
                finalAiState: vitalityChicken.aiState,
                finalHp: Number(vitalityChicken.hp.toFixed(2)),
                recoverObserved,
                seekObserved,
                strandedAiState: strandedChicken.aiState,
            },
            hatchSpawnValidation: {
                fallbackExit: fallbackProductionExit,
                movedAfterSpawn: hatchSpawnMoved,
                offsetFromCoop: hatchSpawnPosition
                    ? {
                          x: hatchSpawnPosition.x - coop.position.x,
                          y: hatchSpawnPosition.y - coop.position.y,
                      }
                    : null,
            },
            wellCount: state.wells.length,
        },
        checks: [
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
                id: 'well_buffed_chicken_drops_at_22_5s',
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
                actual: hatchSpawnMoved,
                expected: true,
                id: 'hatched_chicken_ai_moves_after_spawn',
                pass: hatchSpawnMoved,
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
                    recoverObserved,
                    seekObserved,
                },
                expected: {
                    recoverObserved: true,
                    seekObserved: true,
                },
                id: 'low_hp_chicken_seeks_well_and_recovers',
                pass: seekObserved && recoverObserved,
            },
            {
                actual: strandedChicken.aiState,
                expected: 'stranded',
                id: 'low_hp_chicken_without_well_becomes_stranded',
                pass: strandedChicken.aiState === 'stranded',
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
