import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SupplyLifecycle } from '../games/chicken-farm/src/game/systems/supplyLifecycle.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_supply_lifecycle.json',
);

type Wallet = { gold: number; lumber: number; supplyCap: number; supplyUsed: number };

async function main() {
    const wallets = new Map<number, Wallet>([
        [3, { gold: 1500, lumber: 0, supplyCap: 3, supplyUsed: 0 }],
        [4, { gold: 0, lumber: 0, supplyCap: 0, supplyUsed: 0 }],
        [5, { gold: 0, lumber: 0, supplyCap: 1, supplyUsed: 0 }],
    ]);
    const lifecycle = new SupplyLifecycle((owner) => wallets.get(owner) ?? null);
    const owner3 = wallets.get(3)!;
    const owner4 = wallets.get(4)!;

    assert.equal(lifecycle.registerStarterUnit('p3-farmer', 3, 'farmer'), true);
    assert.equal(lifecycle.registerStarterUnit('p3-dog', 3, 'dog'), true);
    assert.deepEqual(owner3, { gold: 1500, lumber: 0, supplyCap: 3, supplyUsed: 0 });

    assert.equal(lifecycle.registerBuilding('farm-1', 3, 'farm_house'), true);
    assert.equal(lifecycle.registerBuilding('farm-1', 3, 'farm_house'), false);
    assert.equal(owner3.supplyCap, 6, 'completion adds supply once');
    assert.equal(lifecycle.registerChicken('chicken-1', 3), true);
    assert.equal(owner3.supplyUsed, 1, 'creation adds used supply');
    assert.equal(lifecycle.unregisterChicken('chicken-1'), true);
    assert.equal(lifecycle.unregisterChicken('chicken-1'), false);
    assert.equal(owner3.supplyUsed, 0, 'death/removal subtracts once');

    assert.equal(lifecycle.registerChicken('chicken-4', 4), true);
    const capBelowUsed = { available: owner4.supplyCap - owner4.supplyUsed, cap: owner4.supplyCap, used: owner4.supplyUsed };
    assert.deepEqual(capBelowUsed, { available: -1, cap: 0, used: 1 });
    assert.equal(lifecycle.registerBuilding('temple-4', 4, 'family_temple'), true);
    assert.deepEqual(owner4, { gold: 0, lumber: 0, supplyCap: 7, supplyUsed: 1 });
    assert.deepEqual(owner3, { gold: 1500, lumber: 0, supplyCap: 6, supplyUsed: 0 });
    assert.equal(lifecycle.registerChicken('chicken-5', 5), true);
    const owner5 = wallets.get(5)!;
    assert.deepEqual(owner5, { gold: 0, lumber: 0, supplyCap: 1, supplyUsed: 1 });

    assert.equal(lifecycle.unregisterBuilding('farm-1'), true);
    assert.equal(lifecycle.unregisterBuilding('farm-1'), false);
    assert.equal(owner3.supplyCap, 3, 'destroyed supply does not remove units');
    assert.equal(owner3.supplyUsed, 0);

    const artifact = {
        case: 'supply_lifecycle',
        cases: {
            capBelowUsed,
            capEqualUsed: { available: owner5.supplyCap - owner5.supplyUsed, cap: owner5.supplyCap, used: owner5.supplyUsed },
            capAboveUsed: { available: owner3.supplyCap - owner3.supplyUsed, cap: owner3.supplyCap, used: owner3.supplyUsed },
            owner3: owner3,
            owner4: owner4,
        },
        pass: true,
        policy: {
            chickenSupplyCost: 1,
            completedBuildingSupplyOnly: true,
            idempotentRegistration: true,
            starterFarmerAndDogSupplyCost: 0,
        },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
