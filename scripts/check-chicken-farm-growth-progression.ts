import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { BUILDING_TEMPLATES } from '../games/chicken-farm/src/game/buildingTemplates.ts';
import {
    GROWTH_BUILDING_RULES,
    GROWTH_PRODUCTION_RECIPES,
    GROWTH_RESEARCH,
    validateGrowthProgression,
} from '../games/chicken-farm/src/game/growthProgression.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_progression.json',
);

async function main() {
    const result = validateGrowthProgression();
    assert.deepEqual(result.missingRuleIds, [], 'every template has exactly one growth rule');
    assert.deepEqual(result.invalidUpgradeTargets, [], 'upgrade targets exist');
    assert.deepEqual(result.cycles, [], 'upgrade graph has no cycle');
    assert.deepEqual(result.unreachable, ['campfire'], 'only starter-only campfire is outside build graph');
    assert.ok(result.reachable.includes('lumber_mill'), 'farm house reaches lumber mill');
    assert.ok(result.reachable.includes('tower_guard_small'), 'lumber mill reaches guard tower');
    assert.ok(result.reachable.includes('family_temple'), 'upper core branch is reachable');
    assert.ok(result.reachable.includes('arcane_lab'), 'temple reaches arcane lab');
    assert.equal(GROWTH_PRODUCTION_RECIPES.dog.supplyCost, 1, 'dog supply is explicit');
    assert.equal(GROWTH_RESEARCH.masonry.maxLevel, 3, 'masonry level cap is explicit');
    assert.equal(
        Object.keys(GROWTH_BUILDING_RULES).length,
        Object.keys(BUILDING_TEMPLATES).length,
        'rule and template counts match',
    );
    const artifact = {
        case: 'progression_graph',
        pass: true,
        productionRecipes: Object.values(GROWTH_PRODUCTION_RECIPES).map((recipe) => ({
            id: recipe.id,
            producerTemplateIds: recipe.producerTemplateIds,
            supplyCost: recipe.supplyCost,
        })),
        reachable: result.reachable,
        research: Object.values(GROWTH_RESEARCH).map((research) => ({
            id: research.id,
            maxLevel: research.maxLevel,
            providerTemplateIds: research.providerTemplateIds,
            sourceRawcode: research.sourceRawcode,
        })),
        templateCount: Object.keys(BUILDING_TEMPLATES).length,
        unreachable: result.unreachable,
        webSupplyPolicy: {
            family_temple: GROWTH_BUILDING_RULES.family_temple.supplyProvided,
            farm_house: GROWTH_BUILDING_RULES.farm_house.supplyProvided,
            town_hall: GROWTH_BUILDING_RULES.town_hall.supplyProvided,
        },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
