import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance.ts';
import {
    CANONICAL_ENEMY_DEFINITIONS,
    FARMER_LEVEL_REWARDS,
    validateCanonicalEnemyDefinitions,
} from '../games/chicken-farm/src/game/enemyProgression.ts';
import { WAVE_ORDINARY_ENEMY_TIERS } from '../games/chicken-farm/src/game/waveEnemyTiers.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_progression.json',
);

async function main() {
    const result = validateCanonicalEnemyDefinitions();
    assert.equal(WAVE_ORDINARY_ENEMY_TIERS.length, 18, '18 ordinary tiers');
    assert.equal(result.ordinaryDefinitions.length, 18, '18 ordinary definitions');
    assert.deepEqual(result.invalidOrdinary, [], 'ordinary definitions remain ordinary');
    assert.deepEqual(result.missingAbilityDefinitions, [], 'every EnemyId has an ability entry');
    assert.deepEqual(result.missingMilestoneDefinitions, [], 'five milestones resolve to definitions');
    assert.deepEqual(result.duplicateAbilityIds, [], 'ability IDs do not duplicate per enemy');
    assert.equal(CHICKEN_FARM_BALANCE.waves.bossMilestonesForSp10.length, 5, 'five boss milestones');
    assert.deepEqual(
        result.summonDefinitions.map((definition) => definition.enemyId),
        ['skeleton_warrior'],
        'n016 is the sole summon-only canonical enemy',
    );
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.skeleton_warrior.rawcode, 'n016');
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.skeleton_warrior.reward.score.effectiveScore, null);
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.skeleton_warrior.reward.score.source, 'web_policy_no_reward');
    assert.deepEqual(CANONICAL_ENEMY_DEFINITIONS.skeleton_warrior.abilities, []);
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.archimonde.reward.score.effectiveScore, null);
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.blood_wolf.reward.score.effectiveScore, 150);
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.doom_guard.reward.score.effectiveScore, 700);
    assert.equal(CANONICAL_ENEMY_DEFINITIONS.nether_dragon.reward.score.effectiveScore, 1000);
    assert.ok(result.unsupportedAbilityCount > 0, 'unsupported abilities remain explicit');
    assert.equal(
        CANONICAL_ENEMY_DEFINITIONS.dire_frost_wolf.abilities.find(
            (ability) => ability.id === 'ACct',
        )?.runtimeState,
        'implemented_web_policy',
        'ACct W1 runtime state is explicit',
    );
    assert.deepEqual(
        FARMER_LEVEL_REWARDS.map((reward) => reward.level),
        [5, 10, 15, 20, 25, 30, 35],
        'farmer level thresholds',
    );

    const artifact = {
        case: 'canonical_enemy_progression',
        farmerLevelRewards: FARMER_LEVEL_REWARDS,
        milestoneDefinitions: result.milestoneDefinitions,
        ordinaryDefinitions: result.ordinaryDefinitions,
        pass: true,
        summonDefinitions: result.summonDefinitions,
        unsupportedAbilityCount: result.unsupportedAbilityCount,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
