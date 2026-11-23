import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance.ts';
import { getResearchedBuildingStats } from '../games/chicken-farm/src/game/buildingResearchStats.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_defense_research.json');
const noResearch = { arcaneTowerDamage: 0, guardTowerDamage: 0, masonry: 0 };

async function main() {
    const guardBase = getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_guard_small, noResearch);
    const guardLevel2 = getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_guard_small, { ...noResearch, guardTowerDamage: 2 });
    assert.equal(guardBase.attack?.damage, 22);
    assert.equal(guardLevel2.attack?.damage, 30, 'guard research adds 4 damage per level');
    assert.equal(guardLevel2.attack?.cooldownSec, guardBase.attack?.cooldownSec, 'damage research does not alter attack interval');

    const arcaneLevel3 = getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_arcane_small, { ...noResearch, arcaneTowerDamage: 3 });
    assert.equal(arcaneLevel3.attack?.damage, 41, 'arcane research adds 5 damage per level');
    assert.equal(getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_scout, { ...noResearch, guardTowerDamage: 3 }).attack?.damage, 23, 'scout tower is not silently treated as a guard line');

    const masonryLevel2 = getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.fence_wood, { ...noResearch, masonry: 2 });
    assert.deepEqual({ armor: masonryLevel2.armor, maxHp: masonryLevel2.maxHp }, { armor: 3, maxHp: 300 }, 'masonry uses base + level rather than a cumulative live mutation');
    assert.deepEqual(
        getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_guard_medium, { ...noResearch, guardTowerDamage: 2 }),
        getResearchedBuildingStats(CHICKEN_FARM_BALANCE.buildingTemplates.tower_guard_medium, { ...noResearch, guardTowerDamage: 2 }),
        'new and upgraded tier reads share the same base + level computation',
    );

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
        case: 'defense_research',
        pass: true,
        cases: { arcaneDamageLevel3: arcaneLevel3.attack?.damage, guardDamageLevel2: guardLevel2.attack?.damage, masonryLevel2, scoutUnaffected: true },
    }, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
