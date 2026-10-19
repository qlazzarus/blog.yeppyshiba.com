import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    ORDINARY_ENEMY_ABILITY_POLICIES,
    getExecutableOrdinaryEnemyAbilities,
    validateOrdinaryEnemyAbilityPolicies,
} from '../games/chicken-farm/src/game/ordinaryEnemyAbilityPolicies.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/enemy_check_ordinary_abilities.json',
);

async function main() {
    const result = validateOrdinaryEnemyAbilityPolicies();
    assert.equal(ORDINARY_ENEMY_ABILITY_POLICIES.length, 18);
    assert.deepEqual(result.duplicateEnemyIds, []);
    assert.deepEqual(result.missingEnemyIds, []);
    assert.deepEqual(
        result.nonEmptyExecutablePolicies.map((policy) => policy.enemyId),
        ['dire_frost_wolf'],
    );
    assert.equal(result.blockedPolicies.length, 6);
    assert.deepEqual(getExecutableOrdinaryEnemyAbilities('fel_ravager'), []);
    assert.deepEqual(getExecutableOrdinaryEnemyAbilities('dire_frost_wolf'), ['ACct']);
    assert.deepEqual(getExecutableOrdinaryEnemyAbilities('timber_wolf'), []);

    const artifact = {
        case: 'ordinary_enemy_ability_policy',
        checks: {
            all18TiersCovered: true,
            acctW1PolicyIsExecutable: true,
            baseAttackOnlyTiersExplicit: true,
            pass: true,
            unresolvedAbilityPoliciesRemainBlocked: true,
        },
        policies: ORDINARY_ENEMY_ABILITY_POLICIES,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
