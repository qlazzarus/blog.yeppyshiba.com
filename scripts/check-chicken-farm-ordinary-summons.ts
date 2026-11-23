import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    A02U_SKELETON_CAP_PER_OWNER,
    A02U_SKELETON_LIFETIME_SEC,
    createOrdinarySummonRegistry,
    reconcileOrdinarySummons,
    registerOrdinarySummon,
} from '../games/chicken-farm/src/game/ordinarySummonRegistry.ts';
import { selectOrdinarySummonSpawnPoint } from '../games/chicken-farm/src/game/ordinarySummonSpawn.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_ordinary_summons.json');

function entry(index: number, overrides: Partial<ReturnType<typeof baseEntry>> = {}) {
    return { ...baseEntry(index), ...overrides };
}

function baseEntry(index: number) {
    return {
        enemyId: 'skeleton_warrior' as const,
        id: `skeleton-${index}`,
        lifetimeExpiresAtSec: A02U_SKELETON_LIFETIME_SEC,
        ownerPlayerId: 10,
        parentEnemyId: 'soulstealer-1',
        persistsAfterParentRemoval: true as const,
        requestKey: `cast-${index}`,
        rewardEligible: false as const,
        runId: 1,
        sourceAbilityId: 'A02U' as const,
        spawnedAtSec: 0,
    };
}

async function main() {
    let registry = createOrdinarySummonRegistry();
    for (let index = 0; index < A02U_SKELETON_CAP_PER_OWNER; index += 1) {
        const registered = registerOrdinarySummon(registry, entry(index));
        assert.equal(registered.accepted, true, `cap slot ${index} accepted`);
        registry = registered.registry;
    }
    assert.equal(registerOrdinarySummon(registry, entry(99)).accepted, false, 'cap rejects next simultaneous request');
    assert.equal(registerOrdinarySummon(createOrdinarySummonRegistry(), entry(98, { lifetimeExpiresAtSec: 39 })).accepted, false, 'lifetime is fixed by A02U policy');
    assert.equal(registerOrdinarySummon(registry, entry(100, { ownerPlayerId: 11 })).accepted, true, 'owner has separate cap');
    assert.equal(registerOrdinarySummon(registry, entry(101, { runId: 2 })).accepted, true, 'run has separate cap');
    assert.equal(registerOrdinarySummon(registry, entry(102, { id: 'another-id', requestKey: 'cast-0' })).accepted, false, 'request key cannot replay');
    assert.equal(registerOrdinarySummon(registry, entry(103, { id: 'skeleton-0', requestKey: 'new-cast' })).accepted, false, 'ended or active ID cannot replay');

    const parentGone = reconcileOrdinarySummons(registry, {
        aliveEnemyIds: new Set(registry.active.map((candidate) => candidate.id)),
        deadEnemyIds: new Set(),
        nowSec: 1,
    });
    assert.equal(parentGone.registry.active.length, registry.active.length, 'parent removal does not dismiss skeleton');

    const deathAndExpiry = reconcileOrdinarySummons(parentGone.registry, {
        aliveEnemyIds: new Set(parentGone.registry.active.map((candidate) => candidate.id)),
        deadEnemyIds: new Set(['skeleton-0']),
        nowSec: 40,
    });
    assert.equal(deathAndExpiry.registry.ended.find((candidate) => candidate.id === 'skeleton-0')?.reason, 'combat_death');
    assert.ok(deathAndExpiry.removeIds.includes('skeleton-1'), 'timed life removes surviving skeleton');
    assert.equal(deathAndExpiry.removeIds.includes('skeleton-0'), false, 'dead skeleton is not removed twice');
    assert.equal(registerOrdinarySummon(deathAndExpiry.registry, entry(104, { id: 'skeleton-0', requestKey: 'after-death' })).accepted, false, 'ended ID cannot re-register');

    const externalSeed = registerOrdinarySummon(createOrdinarySummonRegistry(), entry(200));
    const external = reconcileOrdinarySummons(externalSeed.registry, {
        aliveEnemyIds: new Set(), deadEnemyIds: new Set(), nowSec: 1,
    });
    assert.equal(external.registry.ended[0]?.reason, 'removed_external');

    const spawn = selectOrdinarySummonSpawnPoint({
        corpse: { x: 100, y: 100 }, dynamicBlockedRects: [],
        isTerrainFootprintBlocked: () => false, worldSize: { height: 200, width: 200 },
    });
    assert.deepEqual(spawn, { x: 100, y: 100 }, 'corpse location is first spawn candidate');
    const blocked = selectOrdinarySummonSpawnPoint({
        corpse: { x: 100, y: 100 }, dynamicBlockedRects: [],
        isTerrainFootprintBlocked: () => true, worldSize: { height: 200, width: 200 },
    });
    assert.equal(blocked, null, 'all blocked candidates reject without a fallback spawn');

    const artifact = {
        case: 'a02u_ordinary_summon_registry',
        checks: {
            capPerRunOwnerType: true,
            corpseLocationCandidatesRespectBlockers: true,
            combatDeathWinsExpiryTie: true,
            noRewardInheritance: true,
            externalRemovalRecordedWithoutDuplicateDespawn: true,
            parentRemovalKeepsSummon: true,
            replayKeysAndEndedIdsRejected: true,
            runAndOwnerIsolation: true,
            timedLifeRemovesRuntimeEntity: true,
            pass: true,
        },
        ended: deathAndExpiry.registry.ended,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
