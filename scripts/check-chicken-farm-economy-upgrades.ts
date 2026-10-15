import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MvpBuildingId } from '../games/chicken-farm/src/game/balanceTypes.ts';
import type { PlayerBuilding } from '../games/chicken-farm/src/game/systems/buildingSystem.ts';
import {
    attachCompletedBuildingEconomy,
    upgradeCompletedBuildingEconomy,
} from '../games/chicken-farm/src/game/systems/buildingEconomyAdapter.ts';
import {
    addEconomyCoop,
    addEconomyLumberMill,
    createChickenFarmEconomyState,
    getEconomyInventory,
    grantEconomyInventoryItem,
    startCoopHatch,
    updateChickenFarmEconomy,
} from '../games/chicken-farm/src/game/systems/economySystem.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_economy_upgrades.json');

function building(id: string, templateId: MvpBuildingId, ownerPlayerId = 3): PlayerBuilding {
    return {
        armor: 0,
        blocksPath: true,
        buildTimeSec: 1,
        constructionProgressSec: 1,
        costPaid: true,
        footprint: { height: 128, width: 128, x: 100, y: 200 },
        hp: 100,
        id,
        maxHp: 100,
        nextAttackAtSec: 0,
        ownerPlayerId,
        startedAtSec: 0,
        state: 'complete',
        targetableByWolves: true,
        templateId,
    };
}

async function main() {
    const coopState = createChickenFarmEconomyState({
        players: [{ gold: 0, id: 3, lumber: 0, supplyCap: 5, supplyUsed: 0 }],
    });
    const coop = addEconomyCoop(coopState, { id: 'coop-a', kind: 'basic', ownerPlayerId: 3, position: { x: 164, y: 264 } });
    assert.notEqual(grantEconomyInventoryItem(coopState, { inventoryId: coop.id, itemRawcode: 'I006', quantity: 3 }), null);
    const firstHatch = startCoopHatch(coopState, { coopId: coop.id, elapsedSec: 0 });
    assert.ok(firstHatch, 'basic coop starts its existing hatch');
    const inventoryBefore = getEconomyInventory(coopState, coop.id);
    const jobBefore = coopState.hatchJobs[0];
    assert.ok(inventoryBefore && jobBefore);
    assert.equal(upgradeCompletedBuildingEconomy(coopState, building(coop.id, 'coop_mid')), 'coop');
    assert.equal(coopState.coops[0], coop, 'coop entity identity is preserved');
    assert.equal(coop.kind, 'mid');
    assert.equal(coop.storedEggs, 2, 'stored eggs are preserved');
    assert.equal(getEconomyInventory(coopState, coop.id), inventoryBefore, 'coop inventory identity is preserved');
    assert.equal(coopState.hatchJobs[0], jobBefore, 'active hatch job identity is preserved');
    assert.equal(jobBefore.resultChickenKind, 'basic', 'existing hatch result is not rewritten');
    assert.ok(startCoopHatch(coopState, { coopId: coop.id, elapsedSec: 1 }), 'mid tier adds its second hatch slot');
    assert.equal(startCoopHatch(coopState, { coopId: coop.id, elapsedSec: 1 }), null, 'mid tier capacity remains bounded');

    const lumberState = createChickenFarmEconomyState({
        players: [{ gold: 0, id: 3, lumber: 0, supplyCap: 3, supplyUsed: 0 }],
    });
    const mill = addEconomyLumberMill(lumberState, { activeFromSec: 0, id: 'mill-a', ownerPlayerId: 3, templateId: 'lumber_mill' });
    assert.ok(mill);
    updateChickenFarmEconomy(lumberState, 30);
    assert.equal(lumberState.players[0].lumber, 70, 'base mill pays the first shared 30-second tick');
    assert.equal(upgradeCompletedBuildingEconomy(lumberState, building('mill-a', 'lumber_mill_mid')), 'lumber_mill');
    assert.equal(mill.templateId, 'lumber_mill_mid');
    assert.equal(mill.activeFromSec, 0, 'tier change preserves original activation phase');
    updateChickenFarmEconomy(lumberState, 59.9);
    assert.equal(lumberState.players[0].lumber, 70, 'no off-phase lumber payment');
    updateChickenFarmEconomy(lumberState, 60);
    assert.equal(lumberState.players[0].lumber, 180, 'mid tier pays 110 at the next original global tick');
    assert.equal(upgradeCompletedBuildingEconomy(lumberState, building('mill-a', 'lumber_mill_high')), 'lumber_mill');
    updateChickenFarmEconomy(lumberState, 90);
    assert.equal(lumberState.players[0].lumber, 350, 'high tier pays 170 once at the following global tick');
    assert.equal(lumberState.lastLumberIncomeTickSec, 90);

    const marketState = createChickenFarmEconomyState();
    assert.equal(upgradeCompletedBuildingEconomy(marketState, building('market-a', 'grand_market')), 'market');
    const eggStorageState = createChickenFarmEconomyState();
    assert.equal(upgradeCompletedBuildingEconomy(eggStorageState, building('storage-a', 'coop_basic')), 'coop');
    assert.ok(eggStorageState.coops.some((candidate) => candidate.id === 'storage-a'), 'first coop capability creates its stable-ID inventory');
    assert.equal(attachCompletedBuildingEconomy(eggStorageState, building('storage-a', 'coop_basic')), null, 're-attach cannot duplicate the upgraded coop');

    const artifact = {
        case: 'economy_upgrade_adapter',
        checks: {
            coopInventoryAndJobsPreserved: true,
            firstCoopCapabilityStableId: true,
            lumberGlobalPhaseAndSinglePayout: true,
            marketUsesStableWorldBuildingId: true,
        },
        pass: true,
        policy: {
            coopExistingJobs: 'preserve_original_result_and_reservation',
            lumberIncome: 'global_30_second_phase_preserved',
            well: 'no_canonical_well_upgradeTo_template_in_current_growth_graph',
        },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
