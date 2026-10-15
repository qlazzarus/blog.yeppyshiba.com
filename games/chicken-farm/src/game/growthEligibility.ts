import type { BuildingTemplateConfig, MvpBuildingId } from './balanceTypes';
import { BUILDING_TEMPLATES } from './buildingTemplates';
import type { ResearchDefinition } from './growthProgression';

const TEMPLATES: Record<MvpBuildingId, BuildingTemplateConfig> = BUILDING_TEMPLATES;

export type GrowthEligibilityBuilding = {
    readonly hp: number;
    readonly ownerPlayerId: number;
    readonly state: 'complete' | 'constructing';
    readonly templateId: MvpBuildingId;
};

export type GrowthEligibilityUnit = {
    readonly alive: boolean;
    readonly ownerPlayerId: number;
    /**
     * This is deliberately an exact web template/rawcode string. It does not
     * convert a W3X rawcode into a building ID.
     */
    readonly templateId: string;
};

export type GrowthEligibilityRequirements = {
    readonly requiredBuildingTemplateIds?: readonly MvpBuildingId[];
    readonly requiredResearchLevels?: Readonly<
        Partial<Record<ResearchDefinition['id'], number>>
    >;
    readonly requiredUnitTemplateIds?: readonly string[];
};

export type GrowthEligibilityState = {
    readonly buildings: readonly GrowthEligibilityBuilding[];
    readonly ownerPlayerId: number;
    readonly researchLevels?: Readonly<
        Partial<Record<ResearchDefinition['id'], number>>
    >;
    readonly units?: readonly GrowthEligibilityUnit[];
};

export type GrowthEligibilityResult = {
    readonly eligible: boolean;
    readonly missingBuildingTemplateIds: readonly MvpBuildingId[];
    readonly missingResearchLevels: readonly {
        readonly currentLevel: number;
        readonly id: ResearchDefinition['id'];
        readonly requiredLevel: number;
    }[];
    readonly missingUnitTemplateIds: readonly string[];
    readonly reason:
        | 'missing_building_prerequisite'
        | 'missing_multiple_prerequisites'
        | 'missing_research_prerequisite'
        | 'missing_unit_prerequisite'
        | null;
};

export function evaluateBuildingEligibility(
    state: GrowthEligibilityState,
    targetTemplateId: MvpBuildingId,
): GrowthEligibilityResult {
    return evaluateGrowthEligibility(state, {
        requiredBuildingTemplateIds:
            TEMPLATES[targetTemplateId].requires ?? [],
    });
}

export function evaluateGrowthEligibility(
    state: GrowthEligibilityState,
    requirements: GrowthEligibilityRequirements,
): GrowthEligibilityResult {
    const livingCompleteBuildings = state.buildings.filter(
        (building) =>
            building.ownerPlayerId === state.ownerPlayerId &&
            building.state === 'complete' &&
            building.hp > 0,
    );
    const missingBuildingTemplateIds = (requirements.requiredBuildingTemplateIds ?? []).filter(
        (requiredTemplateId) =>
            !livingCompleteBuildings.some((building) =>
                isTemplateOrUpgradeDescendant(
                    building.templateId,
                    requiredTemplateId,
                ),
            ),
    );
    const missingResearchLevels = Object.entries(
        requirements.requiredResearchLevels ?? {},
    ).flatMap(([id, requiredLevel]) => {
        const currentLevel = state.researchLevels?.[id as ResearchDefinition['id']] ?? 0;
        return currentLevel >= requiredLevel
            ? []
            : [{ currentLevel, id: id as ResearchDefinition['id'], requiredLevel }];
    });
    const ownedLivingUnitIds = new Set(
        (state.units ?? [])
            .filter(
                (unit) => unit.ownerPlayerId === state.ownerPlayerId && unit.alive,
            )
            .map((unit) => unit.templateId),
    );
    const missingUnitTemplateIds = (requirements.requiredUnitTemplateIds ?? []).filter(
        (templateId) => !ownedLivingUnitIds.has(templateId),
    );
    const missingKinds = [
        missingBuildingTemplateIds.length > 0,
        missingResearchLevels.length > 0,
        missingUnitTemplateIds.length > 0,
    ].filter(Boolean).length;
    return {
        eligible: missingKinds === 0,
        missingBuildingTemplateIds,
        missingResearchLevels,
        missingUnitTemplateIds,
        reason:
            missingKinds === 0
                ? null
                : missingKinds > 1
                  ? 'missing_multiple_prerequisites'
                  : missingBuildingTemplateIds.length > 0
                    ? 'missing_building_prerequisite'
                    : missingResearchLevels.length > 0
                      ? 'missing_research_prerequisite'
                      : 'missing_unit_prerequisite',
    };
}

/** A complete higher tier satisfies the requirement for every upgrade ancestor. */
export function isTemplateOrUpgradeDescendant(
    candidateTemplateId: MvpBuildingId,
    requiredTemplateId: MvpBuildingId,
) {
    let cursor: MvpBuildingId | undefined = requiredTemplateId;
    while (cursor) {
        if (cursor === candidateTemplateId) return true;
        cursor = TEMPLATES[cursor].upgradeTo;
    }
    return false;
}
