import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    addEconomyCoop,
    cancelCoopHatch,
    createChickenFarmEconomyState,
    getEconomyInventory,
    grantEconomyInventoryItem,
    removeEconomyBuilding,
    startCoopHatch,
    updateChickenFarmEconomy,
} from '../games/chicken-farm/src/game/systems/economySystem.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_hatch_reservation.json');

function createState() {
    const state = createChickenFarmEconomyState({
        players: [{ gold: 1500, id: 3, lumber: 0, supplyCap: 2, supplyReserved: 0, supplyUsed: 0 }],
    });
    addEconomyCoop(state, { id: 'coop-1', ownerPlayerId: 3, position: { x: 100, y: 100 } });
    grantEconomyInventoryItem(state, { inventoryId: 'coop-1', itemRawcode: 'I006', quantity: 2 });
    return state;
}

async function main() {
    const state = createState();
    const wallet = state.players[0]!;
    const started = startCoopHatch(state, { coopId: 'coop-1', elapsedSec: 0 });
    assert.ok(started, 'hatch begins');
    assert.deepEqual(wallet, { gold: 1500, id: 3, lumber: 0, supplyCap: 2, supplyReserved: 1, supplyUsed: 0 });
    assert.equal(state.hatchJobs.length, 1);
    assert.equal(startCoopHatch(state, { coopId: 'coop-1', elapsedSec: 0 }), null, 'existing coop capacity remains one');
    assert.equal(cancelCoopHatch(state, { hatchJobId: started.hatchJobId, ownerPlayerId: 4 }), null, 'foreign owner cannot cancel');
    assert.ok(cancelCoopHatch(state, { hatchJobId: started.hatchJobId, ownerPlayerId: 3 }));
    assert.equal(cancelCoopHatch(state, { hatchJobId: started.hatchJobId, ownerPlayerId: 3 }), null, 'cancel is exactly once');
    assert.deepEqual(wallet, { gold: 1500, id: 3, lumber: 0, supplyCap: 2, supplyReserved: 0, supplyUsed: 0 });
    assert.equal(state.hatchJobs.length, 0);
    assert.equal(getEconomyInventory(state, 'coop-1')?.slots[0]?.quantity, 2, 'egg restores to same coop');

    const exitWaitState = createState();
    const exitWaitJob = startCoopHatch(exitWaitState, { coopId: 'coop-1', elapsedSec: 0 });
    assert.ok(exitWaitJob);
    updateChickenFarmEconomy(exitWaitState, 21, { canChickenOccupyPoint: () => false });
    assert.equal(exitWaitState.hatchJobs.length, 1, 'blocked exit retains one job');
    assert.equal(exitWaitState.players[0]!.supplyReserved, 1, 'blocked exit retains reservation');
    assert.ok(cancelCoopHatch(exitWaitState, { hatchJobId: exitWaitJob.hatchJobId, ownerPlayerId: 3 }));
    assert.equal(exitWaitState.players[0]!.supplyReserved, 0);

    const completeState = createState();
    const completeJob = startCoopHatch(completeState, { coopId: 'coop-1', elapsedSec: 0 });
    assert.ok(completeJob);
    updateChickenFarmEconomy(completeState, 21, { canChickenOccupyPoint: () => true });
    assert.equal(completeState.hatchJobs.length, 0);
    assert.deepEqual(completeState.players[0], { gold: 1500, id: 3, lumber: 0, supplyCap: 2, supplyReserved: 0, supplyUsed: 1 });
    assert.equal(cancelCoopHatch(completeState, { hatchJobId: completeJob.hatchJobId, ownerPlayerId: 3 }), null, 'completed job cannot cancel');

    const fullState = createState();
    const fullJob = startCoopHatch(fullState, { coopId: 'coop-1', elapsedSec: 0 });
    assert.ok(fullJob);
    const inventory = getEconomyInventory(fullState, 'coop-1')!;
    inventory.slots.forEach((slot, index) => {
        if (!slot || slot.itemRawcode === 'I006') {
            inventory.slots[index] = { itemRawcode: 'I003', quantity: 1 };
        }
    });
    assert.equal(cancelCoopHatch(fullState, { hatchJobId: fullJob.hatchJobId, ownerPlayerId: 3 }), null, 'full inventory leaves job and reservation unchanged');
    assert.equal(fullState.hatchJobs.length, 1);
    assert.equal(fullState.players[0]!.supplyReserved, 1);

    const destroyedState = createState();
    const destroyedJob = startCoopHatch(destroyedState, { coopId: 'coop-1', elapsedSec: 0 });
    assert.ok(destroyedJob);
    assert.equal(removeEconomyBuilding(destroyedState, 'coop-1'), 'coop');
    assert.equal(destroyedState.hatchJobs.length, 0);
    assert.equal(destroyedState.players[0]!.supplyReserved, 0, 'destroy releases hatch reservation without restoring egg');
    assert.equal(removeEconomyBuilding(destroyedState, 'coop-1'), null, 'repeat destroy is a no-op');

    const artifact = {
        case: 'hatch_reservation',
        pass: true,
        cases: { activeCancel: true, blockedExitCancel: true, completedNoop: true, destroyedNoRefund: true, fullInventoryNoop: true, ownerIsolation: true },
        policy: { egg: 'restore_one_on_player_cancel', supply: 'reserve_then_commit_or_release' },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
