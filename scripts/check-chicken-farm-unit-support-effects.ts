import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance.ts';
import { getResearchedUnitStats } from '../games/chicken-farm/src/game/unitResearchStats.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_unit_support_effects.json');

async function main() {
    const levels = { dogDamage: 0, dogSpeedClaw: 0 };
    const baseDog = getResearchedUnitStats('dog', CHICKEN_FARM_BALANCE.defenders.dog, levels);
    const researchedDog = getResearchedUnitStats(
        'dog',
        CHICKEN_FARM_BALANCE.defenders.dog,
        { dogDamage: 2, dogSpeedClaw: 3 },
    );
    assert.deepEqual(
        {
            attackCooldownSec: researchedDog.attackCooldownSec,
            damage: researchedDog.damage,
            speedPxPerSec: researchedDog.speedPxPerSec,
        },
        { attackCooldownSec: 0.6080000000000001, damage: 26, speedPxPerSec: 359.6 },
    );
    assert.deepEqual(
        getResearchedUnitStats('farmer', CHICKEN_FARM_BALANCE.defenders.farmer, { dogDamage: 3, dogSpeedClaw: 3 }),
        CHICKEN_FARM_BALANCE.defenders.farmer,
        'dog research does not spill into farmers',
    );
    assert.equal(baseDog.damage, 18);
    assert.deepEqual(
        getResearchedUnitStats('dog', CHICKEN_FARM_BALANCE.defenders.dog, { dogDamage: 2, dogSpeedClaw: 3 }),
        researchedDog,
        'existing/new dogs share an idempotent base + level projection',
    );

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
        case: 'unit_support_effects',
        pass: true,
        cases: { baseDog, researchedDog, farmerUnaffected: true },
    }, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
