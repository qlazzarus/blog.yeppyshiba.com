import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    createEnemyDeathLedger,
    recordEnemyDeath,
} from '../games/chicken-farm/src/game/enemyDeathLedger.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_death.json',
);

async function main() {
    const input = {
        attackerEntityId: 'p3-farmer',
        cause: 'unit' as const,
        deadEntityId: 'wolf-a',
        enemyId: 'timber_wolf' as const,
        ownerPlayerId: 3,
        rewardEligible: true,
        runId: 17,
        x: 3600,
        y: 8700,
    };
    const first = recordEnemyDeath(createEnemyDeathLedger(), input);
    const duplicate = recordEnemyDeath(first.ledger, input);
    const environment = recordEnemyDeath(duplicate.ledger, {
        ...input,
        attackerEntityId: null,
        cause: 'environment',
        deadEntityId: 'wolf-b',
        ownerPlayerId: null,
        rewardEligible: false,
    });
    const tower = recordEnemyDeath(environment.ledger, {
        ...input,
        attackerEntityId: 'tower-3',
        cause: 'tower',
        deadEntityId: 'wolf-c',
        ownerPlayerId: 3,
    });

    assert.ok(first.event, 'first lethal hit records a death');
    assert.equal(first.event.deathKey, '17:wolf-a:1');
    assert.equal(duplicate.event, null, 'duplicate lethal hit records no second death');
    assert.equal(tower.ledger.events.length, 3);
    assert.equal(tower.event?.cause, 'tower');
    assert.equal(tower.event?.attackerEntityId, 'tower-3');
    assert.equal(tower.event?.ownerPlayerId, 3);
    assert.equal(tower.event?.rewardEligible, true);
    assert.deepEqual(environment.ledger.events[1], {
        ...input,
        attackerEntityId: null,
        cause: 'environment',
        deathKey: '17:wolf-b:2',
        deathSequence: 2,
        deadEntityId: 'wolf-b',
        ownerPlayerId: null,
        rewardEligible: false,
    });

    const artifact = {
        case: 'enemy_death_ledger',
        checks: {
            duplicateLethalIgnored: true,
            environmentIsNotRewardEligible: true,
            ownerAndPositionPreserved: true,
            pass: true,
            runScopedDeathKey: true,
        },
        events: tower.ledger.events,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
