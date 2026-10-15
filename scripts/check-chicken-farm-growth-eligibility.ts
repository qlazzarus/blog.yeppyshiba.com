import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    evaluateBuildingEligibility,
    evaluateGrowthEligibility,
} from '../games/chicken-farm/src/game/growthEligibility.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/growth_check_eligibility.json',
);

const owner = 3;

function building(templateId: Parameters<typeof evaluateBuildingEligibility>[1], overrides = {}) {
    return {
        hp: 100,
        ownerPlayerId: owner,
        state: 'complete' as const,
        templateId,
        ...overrides,
    };
}

async function main() {
    const allSatisfied = evaluateGrowthEligibility(
        {
            buildings: [building('town_hall')],
            ownerPlayerId: owner,
            researchLevels: { masonry: 1 },
            units: [{ alive: true, ownerPlayerId: owner, templateId: 'dog' }],
        },
        {
            requiredBuildingTemplateIds: ['farm_house'],
            requiredResearchLevels: { masonry: 1 },
            requiredUnitTemplateIds: ['dog'],
        },
    );
    assert.equal(allSatisfied.eligible, true, 'higher town hall satisfies farm house');

    const missingOne = evaluateBuildingEligibility(
        { buildings: [building('farm_house')], ownerPlayerId: owner },
        'coop_basic',
    );
    assert.deepEqual(missingOne.missingBuildingTemplateIds, ['town_hall']);
    assert.equal(missingOne.reason, 'missing_building_prerequisite');

    const missingMultiple = evaluateBuildingEligibility(
        { buildings: [building('farm_house')], ownerPlayerId: owner },
        'gate_wood',
    );
    assert.deepEqual(missingMultiple.missingBuildingTemplateIds, ['arcane_lab', 'fence_wood']);
    assert.equal(missingMultiple.reason, 'missing_building_prerequisite');

    const higherTier = evaluateGrowthEligibility(
        { buildings: [building('lumber_mill_high')], ownerPlayerId: owner },
        { requiredBuildingTemplateIds: ['lumber_mill'] },
    );
    assert.equal(higherTier.eligible, true, 'high mill satisfies base mill');

    const ownerMismatch = evaluateBuildingEligibility(
        { buildings: [building('town_hall', { ownerPlayerId: 4 })], ownerPlayerId: owner },
        'coop_basic',
    );
    assert.equal(ownerMismatch.reason, 'missing_building_prerequisite');

    const constructing = evaluateBuildingEligibility(
        { buildings: [building('town_hall', { state: 'constructing' as const })], ownerPlayerId: owner },
        'coop_basic',
    );
    assert.equal(constructing.reason, 'missing_building_prerequisite');

    const removed = evaluateBuildingEligibility(
        { buildings: [building('town_hall', { hp: 0 })], ownerPlayerId: owner },
        'coop_basic',
    );
    assert.equal(removed.reason, 'missing_building_prerequisite');

    const artifact = {
        case: 'eligibility',
        cases: {
            allSatisfied,
            constructing,
            higherTier,
            missingMultiple,
            missingOne,
            ownerMismatch,
            removed,
        },
        pass: true,
        policy: {
            completeAndLivingOnly: true,
            higherTierSatisfiesAncestor: true,
            ownerScoped: true,
            unitRawcodesAreExactStrings: true,
        },
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${outputPath}`);
}

void main();
