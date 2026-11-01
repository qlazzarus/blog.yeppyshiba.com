import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ResearchQueue } from '../games/chicken-farm/src/game/systems/researchQueue.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_research_queue.json');

async function main() {
    const wallets = new Map([
        [3, { gold: 1_000, lumber: 1_000, supplyCap: 0, supplyUsed: 0 }],
        [4, { gold: 1_000, lumber: 1_000, supplyCap: 0, supplyUsed: 0 }],
    ]);
    const queue = new ResearchQueue((owner) => wallets.get(owner) ?? null);

    const guard = queue.start({ ownerPlayerId: 3, providerId: 'power-a', providerTemplateId: 'power_generator', researchId: 'guardTowerDamage' }, 0);
    assert.ok(guard);
    assert.deepEqual(wallets.get(3), { gold: 930, lumber: 950, supplyCap: 0, supplyUsed: 0 });
    assert.equal(
        queue.start({ ownerPlayerId: 3, providerId: 'power-b', providerTemplateId: 'power_generator', researchId: 'guardTowerDamage' }, 0),
        null,
        'an owner cannot buy the same next level from a second provider',
    );
    assert.equal(
        queue.start({ ownerPlayerId: 3, providerId: 'power-a', providerTemplateId: 'power_generator', researchId: 'arcaneTowerDamage' }, 0),
        null,
        'a provider runs one research job at a time',
    );
    assert.ok(
        queue.start({ ownerPlayerId: 4, providerId: 'power-4', providerTemplateId: 'power_generator', researchId: 'guardTowerDamage' }, 0),
        'other owners have independent research state',
    );
    queue.advance(22);
    assert.ok(queue.complete('power-a'));
    assert.equal(queue.getLevel(3, 'guardTowerDamage'), 1);
    assert.equal(queue.complete('power-a'), null, 'completion is exactly once');

    const cancel = queue.start({ ownerPlayerId: 3, providerId: 'temple-a', providerTemplateId: 'family_temple', researchId: 'dogDamage' }, 22);
    assert.ok(cancel);
    assert.ok(queue.cancel('temple-a', 3));
    assert.equal(queue.cancel('temple-a', 3), null, 'cancellation refunds exactly once');
    assert.deepEqual(wallets.get(3), { gold: 930, lumber: 950, supplyCap: 0, supplyUsed: 0 });

    const destroyed = queue.start({ ownerPlayerId: 3, providerId: 'arcane-a', providerTemplateId: 'arcane_lab', researchId: 'dogSpeedClaw' }, 22);
    assert.ok(destroyed);
    assert.ok(queue.discardProvider('arcane-a'));
    queue.advance(46);
    assert.equal(queue.complete('arcane-a'), null, 'destroyed provider beats ready completion');
    assert.equal(queue.getLevel(3, 'dogSpeedClaw'), 0);
    assert.deepEqual(wallets.get(3), { gold: 850, lumber: 900, supplyCap: 0, supplyUsed: 0 }, 'destroy does not refund');

    for (let targetLevel = 1; targetLevel <= 3; targetLevel += 1) {
        const job = queue.start({ ownerPlayerId: 3, providerId: `mill-${targetLevel}`, providerTemplateId: 'lumber_mill', researchId: 'masonry' }, 100 + targetLevel);
        assert.ok(job);
        queue.advance(job.completeAtSec);
        assert.ok(queue.complete(job.providerId));
        assert.equal(queue.getLevel(3, 'masonry'), targetLevel);
    }
    assert.equal(
        queue.start({ ownerPlayerId: 3, providerId: 'mill-max', providerTemplateId: 'lumber_mill', researchId: 'masonry' }, 200),
        null,
        'maximum research level is not charged',
    );

    const artifact = {
        case: 'research_queue',
        pass: true,
        cases: {
            cancellationFullRefund: true,
            destroyNoRefund: true,
            duplicateOwnerReservation: true,
            maxLevel: queue.getLevel(3, 'masonry'),
            ownerIsolation: queue.getLevel(4, 'guardTowerDamage'),
            readyCompletionOnce: true,
        },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
