import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ProductionQueue } from '../games/chicken-farm/src/game/systems/productionQueue.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_production_queue.json');

async function main() {
    const wallets = new Map([
        [3, { gold: 100, lumber: 20, supplyCap: 2, supplyReserved: 0, supplyUsed: 0 }],
        [4, { gold: 100, lumber: 20, supplyCap: 1, supplyReserved: 0, supplyUsed: 0 }],
    ]);
    const queue = new ProductionQueue((owner) => wallets.get(owner) ?? null);
    const recipe = { cost: { gold: 20, lumber: 5 }, durationSec: 10, ownerPlayerId: 3, producerId: 'farm-a', recipeId: 'dog', supplyCost: 1 };

    const first = queue.enqueue(recipe, 0);
    const second = queue.enqueue(recipe, 0);
    assert.ok(first && second, 'two affordable jobs are accepted');
    assert.deepEqual(queue.getJobs(3).map((job) => job.state), ['running', 'queued'], 'single producer is FIFO/serial');
    assert.deepEqual(wallets.get(3), { gold: 60, lumber: 10, supplyCap: 2, supplyReserved: 2, supplyUsed: 0 });
    assert.equal(queue.enqueue(recipe, 0), null, 'reserved supply blocks same-tick third request');
    assert.deepEqual(wallets.get(3), { gold: 60, lumber: 10, supplyCap: 2, supplyReserved: 2, supplyUsed: 0 });

    queue.advance(10);
    assert.equal(queue.getJobs(3)[0]?.state, 'exit_wait');
    assert.ok(queue.complete(first.id, 10));
    assert.deepEqual(queue.getJobs(3).map((job) => job.state), ['running'], 'completion starts next FIFO job');
    assert.deepEqual(wallets.get(3), { gold: 60, lumber: 10, supplyCap: 2, supplyReserved: 1, supplyUsed: 1 });
    assert.ok(queue.cancel(second.id, 3, 11));
    assert.equal(queue.cancel(second.id, 3, 11), null, 'cancellation refunds exactly once');
    assert.deepEqual(wallets.get(3), { gold: 80, lumber: 15, supplyCap: 2, supplyReserved: 0, supplyUsed: 1 });

    const insufficientWallet = queue.enqueue({ ...recipe, cost: { gold: 100, lumber: 0 }, producerId: 'farm-b' }, 12);
    assert.equal(insufficientWallet, null);
    const owner4 = wallets.get(4)!;
    const owner4First = queue.enqueue({ ...recipe, ownerPlayerId: 4, producerId: 'farm-4' }, 0);
    assert.ok(owner4First);
    assert.equal(queue.enqueue({ ...recipe, ownerPlayerId: 4, producerId: 'farm-4' }, 0), null, 'owner-local reservation blocks cap overflow');
    assert.deepEqual(owner4, { gold: 80, lumber: 15, supplyCap: 1, supplyReserved: 1, supplyUsed: 0 });
    assert.equal(queue.discardProducer('farm-4').length, 1);
    assert.deepEqual(owner4, { gold: 80, lumber: 15, supplyCap: 1, supplyReserved: 0, supplyUsed: 0 }, 'destroy releases reservation without refund');

    const artifact = {
        case: 'production_queue',
        pass: true,
        cases: {
            cancellation: wallets.get(3),
            destroy: owner4,
            fifo: true,
            insufficientWallet: true,
            sameTickSupplyContention: true,
        },
        policy: { capacityPerProducer: 1, payment: 'enqueue', queue: 'FIFO', reservation: 'enqueue_to_complete_or_cancel' },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
