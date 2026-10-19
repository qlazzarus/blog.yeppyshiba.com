import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    advanceEnemyCorpseRegistry,
    consumeReservedEnemyCorpse,
    createEnemyCorpseRegistry,
    registerEnemyCorpse,
    releaseEnemyCorpseReservation,
    reserveNearestEnemyCorpse,
} from '../games/chicken-farm/src/game/enemyCorpseRegistry.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_corpses.json',
);

const corpse = {
    createdAtSec: 2,
    deadEntityId: 'wolf-dead-1',
    deathKey: '7:wolf-dead-1:1',
    enemyId: 'timber_wolf' as const,
    expiresAtSec: 12,
    ownerPlayerId: 10,
    runId: 7,
    x: 100,
    y: 100,
};

async function main() {
    const registered = registerEnemyCorpse(createEnemyCorpseRegistry(), corpse);
    assert.equal(registered.accepted, true);
    assert.equal(registerEnemyCorpse(registered.registry, corpse).accepted, false, 'same death registers once');
    assert.equal(
        registerEnemyCorpse(registered.registry, { ...corpse, deathKey: '7:wolf-dead-1:2' }).accepted,
        false,
        'same dead entity registers once',
    );

    const firstReservation = reserveNearestEnemyCorpse(registered.registry, {
        casterId: 'soulstealer-a', ownerPlayerId: 10, radiusPx: 176, runId: 7, x: 90, y: 100,
    });
    assert.equal(firstReservation.corpse?.status, 'reserved');
    const competingReservation = reserveNearestEnemyCorpse(firstReservation.registry, {
        casterId: 'soulstealer-b', ownerPlayerId: 10, radiusPx: 176, runId: 7, x: 90, y: 100,
    });
    assert.equal(competingReservation.corpse, null, 'first accepted reservation wins');
    assert.equal(
        reserveNearestEnemyCorpse(firstReservation.registry, {
            casterId: 'wrong-run', ownerPlayerId: 10, radiusPx: 176, runId: 8, x: 90, y: 100,
        }).corpse,
        null,
        'previous run cannot reserve corpse',
    );

    const released = releaseEnemyCorpseReservation(firstReservation.registry, {
        casterId: 'soulstealer-a', deathKey: corpse.deathKey, runId: 7,
    });
    assert.equal(released.released, true);
    const secondReservation = reserveNearestEnemyCorpse(released.registry, {
        casterId: 'soulstealer-b', ownerPlayerId: 10, radiusPx: 176, runId: 7, x: 100, y: 100,
    });
    const consumed = consumeReservedEnemyCorpse(secondReservation.registry, {
        casterId: 'soulstealer-b', deathKey: corpse.deathKey, runId: 7,
    });
    assert.equal(consumed.consumed, true);
    assert.equal(consumeReservedEnemyCorpse(consumed.registry, {
        casterId: 'soulstealer-b', deathKey: corpse.deathKey, runId: 7,
    }).consumed, false, 'consumed corpse cannot be reused');

    const expirySource = registerEnemyCorpse(createEnemyCorpseRegistry(), corpse).registry;
    const atBoundary = advanceEnemyCorpseRegistry(expirySource, 12);
    assert.equal(atBoundary.corpses[0]?.status, 'expired');
    const split = advanceEnemyCorpseRegistry(advanceEnemyCorpseRegistry(expirySource, 6), 12);
    assert.deepEqual(split, atBoundary, 'time partition preserves expiry state');
    const reservedExpiry = advanceEnemyCorpseRegistry(firstReservation.registry, 12);
    assert.equal(reservedExpiry.corpses[0]?.status, 'expired', 'expired reservation releases');

    const artifact = {
        case: 'enemy_corpse_registry',
        checks: {
            consumedCorpseCannotBeReused: true,
            duplicateDeathRejected: true,
            expiryBoundaryAndDtSplitPreserved: true,
            pass: true,
            reservationCanRelease: true,
            reservationExpiresWithCorpse: true,
            runIsolationPreserved: true,
            sameCorpseCompetitionHasOneWinner: true,
        },
        corpses: consumed.registry.corpses,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
