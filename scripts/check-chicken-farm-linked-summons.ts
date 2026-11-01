import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    createLinkedSummonRegistry,
    reconcileLinkedSummons,
    registerLinkedSummon,
} from '../games/chicken-farm/src/game/linkedSummonRegistry.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_linked_summons.json');

async function main() {
    const entry = { enemyId: 'timber_wolf' as const, id: 'linked-1', lifetimeExpiresAtSec: 5, ownerPlayerId: 10, parentEnemyId: 'parent-1', runId: 2, spawnedAtSec: 0 };
    const registered = registerLinkedSummon(createLinkedSummonRegistry(), entry);
    assert.equal(registered.accepted, true);
    assert.equal(registerLinkedSummon(registered.registry, { ...entry, id: 'linked-2' }).accepted, false, 'one linked summon per parent fixture guard');
    const expired = reconcileLinkedSummons(registered.registry, { aliveEnemyIds: new Set(['parent-1', 'linked-1']), nowSec: 5 });
    assert.deepEqual(expired.removeIds, ['linked-1']);
    assert.equal(expired.registry.ended[0]?.reason, 'expired');
    const parentGone = reconcileLinkedSummons(registered.registry, { aliveEnemyIds: new Set(['linked-1']), nowSec: 1 });
    assert.deepEqual(parentGone.removeIds, ['linked-1']);
    assert.equal(parentGone.registry.ended[0]?.reason, 'parent_removed');
    const external = reconcileLinkedSummons(registered.registry, { aliveEnemyIds: new Set(['parent-1']), nowSec: 1 });
    assert.deepEqual(external.removeIds, []);
    assert.equal(external.registry.ended[0]?.reason, 'removed_external');

    const artifact = { case: 'linked_summon_registry', checks: { externalRemovalDoesNotRespawn: true, lifetimeExpiryRemoves: true, onePerParentFixtureGuard: true, parentRemovalRemoves: true, pass: true }, entries: { expired: expired.registry.ended, parentGone: parentGone.registry.ended } };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
