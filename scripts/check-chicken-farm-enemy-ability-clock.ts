import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    advanceEnemyAbilityClock,
    createEnemyAbilityClock,
    startEnemyAbilityCast,
} from '../games/chicken-farm/src/game/enemyAbilityClock.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_ability_clock.json',
);

async function main() {
    const started = startEnemyAbilityCast(createEnemyAbilityClock(), {
        abilityId: 'test_ability', casterId: 'caster-a', cooldownSec: 3, nowSec: 10, targetId: 'target-a', windupSec: 0.5,
    });
    assert.equal(started.accepted, true);
    assert.equal(startEnemyAbilityCast(started.clock, {
        abilityId: 'test_ability', casterId: 'caster-a', cooldownSec: 3, nowSec: 10.1, targetId: 'target-a', windupSec: 0.5,
    }).accepted, false, 'cooldown does not reset each frame');
    const beforeBoundary = advanceEnemyAbilityClock(started.clock, 10.499, () => true, () => true);
    assert.equal(beforeBoundary.resolutions.length, 0, 'windup has not completed');
    const executed = advanceEnemyAbilityClock(beforeBoundary.clock, 10.5, () => true, () => true);
    assert.deepEqual(executed.resolutions.map((entry) => entry.status), ['executed']);
    assert.equal(startEnemyAbilityCast(executed.clock, {
        abilityId: 'test_ability', casterId: 'caster-a', cooldownSec: 3, nowSec: 12.99, targetId: 'target-a', windupSec: 0,
    }).accepted, false, 'cooldown boundary remains locked');
    assert.equal(startEnemyAbilityCast(executed.clock, {
        abilityId: 'test_ability', casterId: 'caster-a', cooldownSec: 3, nowSec: 13, targetId: 'target-a', windupSec: 0,
    }).accepted, true, 'cooldown unlocks at its fixed simulation time');

    const invalidTarget = advanceEnemyAbilityClock(startEnemyAbilityCast(createEnemyAbilityClock(), {
        abilityId: 'target_check', casterId: 'caster-b', cooldownSec: 1, nowSec: 0, targetId: 'target-b', windupSec: 0.2,
    }).clock, 1, () => true, () => false);
    const deadCaster = advanceEnemyAbilityClock(startEnemyAbilityCast(createEnemyAbilityClock(), {
        abilityId: 'caster_check', casterId: 'caster-c', cooldownSec: 1, nowSec: 0, targetId: 'target-c', windupSec: 0.2,
    }).clock, 1, () => false, () => true);
    assert.deepEqual(invalidTarget.resolutions.map((entry) => entry.status), ['cancelled_target_invalid']);
    assert.deepEqual(deadCaster.resolutions.map((entry) => entry.status), ['cancelled_caster_dead']);

    const splitStart = startEnemyAbilityCast(createEnemyAbilityClock(), {
        abilityId: 'dt_split', casterId: 'caster-d', cooldownSec: 1, nowSec: 0, targetId: 'target-d', windupSec: 0.6,
    }).clock;
    const split = advanceEnemyAbilityClock(advanceEnemyAbilityClock(splitStart, 0.25, () => true, () => true).clock, 0.6, () => true, () => true);
    const oneStep = advanceEnemyAbilityClock(splitStart, 0.6, () => true, () => true);
    assert.deepEqual(split.resolutions, oneStep.resolutions, 'dt split has the same resolution');

    const artifact = {
        case: 'enemy_ability_clock',
        checks: {
            casterDeathCancels: true,
            cooldownBoundaryStable: true,
            dtSplitStable: true,
            invalidTargetCancels: true,
            pass: true,
            windupBoundaryStable: true,
        },
        resolutions: { deadCaster: deadCaster.resolutions, executed: executed.resolutions, invalidTarget: invalidTarget.resolutions },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
