import type {
    BuildingTemplateConfig,
    DefenderId,
    MvpBuildingId,
} from './balanceTypes';
import { BUILDING_TEMPLATES } from './buildingTemplates';

export type BuildingAcquisition = 'build' | 'starter_only' | 'upgrade_only';

export type GrowthBuildingRule = {
    readonly acquisition: BuildingAcquisition;
    /** Explicit web value; it is not a claimed W3X food conversion. */
    readonly supplyProvided: number;
};

export type ProductionRecipe = {
    readonly cost: { readonly gold: number; readonly lumber: number };
    readonly durationSec: number;
    readonly id: 'dog';
    readonly producerTemplateIds: readonly MvpBuildingId[];
    readonly sourceRawcodeRequirements: readonly string[];
    readonly supplyCost: number;
};

export type ResearchEffect =
    | { readonly kind: 'building_durability'; readonly hpPerLevel: number; readonly armorPerLevel: number }
    | { readonly kind: 'tower_damage'; readonly damagePerLevel: number; readonly towerLine: 'arcane' | 'guard' }
    | { readonly kind: 'dog_damage'; readonly damagePerLevel: number }
    | { readonly kind: 'dog_speed_claw'; readonly moveSpeedPctPerLevel: number; readonly cooldownPctPerLevel: number };

export type ResearchDefinition = {
    readonly costPerLevel: { readonly gold: number; readonly lumber: number };
    readonly effect: ResearchEffect;
    readonly id: 'arcaneTowerDamage' | 'dogDamage' | 'dogSpeedClaw' | 'guardTowerDamage' | 'masonry';
    readonly maxLevel: number;
    readonly providerTemplateIds: readonly MvpBuildingId[];
    readonly sourceRawcode: string;
    readonly timePerLevelSec: number;
};

/**
 * This is the canonical web progression graph. Template fields retain W3X
 * traces; the rules below state which acquisition route the web game allows.
 */
export const GROWTH_BUILDING_RULES = {
    arcane_lab: { acquisition: 'upgrade_only', supplyProvided: 0 },
    barrier_magic: { acquisition: 'upgrade_only', supplyProvided: 0 },
    blacksmith: { acquisition: 'build', supplyProvided: 0 },
    campfire: { acquisition: 'starter_only', supplyProvided: 0 },
    coop_basic: { acquisition: 'upgrade_only', supplyProvided: 0 },
    coop_high: { acquisition: 'upgrade_only', supplyProvided: 0 },
    coop_mid: { acquisition: 'upgrade_only', supplyProvided: 0 },
    egg_storage: { acquisition: 'build', supplyProvided: 0 },
    family_temple: { acquisition: 'upgrade_only', supplyProvided: 7 },
    farm_house: { acquisition: 'build', supplyProvided: 3 },
    fence_bronze: { acquisition: 'upgrade_only', supplyProvided: 0 },
    fence_wood: { acquisition: 'build', supplyProvided: 0 },
    gate_wood: { acquisition: 'build', supplyProvided: 0 },
    grand_market: { acquisition: 'upgrade_only', supplyProvided: 0 },
    lumber_mill: { acquisition: 'build', supplyProvided: 0 },
    lumber_mill_high: { acquisition: 'upgrade_only', supplyProvided: 0 },
    lumber_mill_mid: { acquisition: 'upgrade_only', supplyProvided: 0 },
    market: { acquisition: 'build', supplyProvided: 0 },
    mercenary_barracks: { acquisition: 'build', supplyProvided: 0 },
    plasma_wall: { acquisition: 'upgrade_only', supplyProvided: 0 },
    power_generator: { acquisition: 'build', supplyProvided: 0 },
    tower_arcane_grand: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_arcane_large: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_arcane_medium: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_arcane_small: { acquisition: 'build', supplyProvided: 0 },
    tower_guard_black: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_guard_grand: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_guard_large: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_guard_medium: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_guard_small: { acquisition: 'upgrade_only', supplyProvided: 0 },
    tower_scout: { acquisition: 'build', supplyProvided: 0 },
    town_hall: { acquisition: 'upgrade_only', supplyProvided: 5 },
    wall_stone: { acquisition: 'upgrade_only', supplyProvided: 0 },
    well_basic: { acquisition: 'build', supplyProvided: 0 },
    workshop_lab: { acquisition: 'build', supplyProvided: 0 },
} satisfies Record<MvpBuildingId, GrowthBuildingRule>;

/** Existing dog is the only non-hatch unit production in SP-09 scope. */
export const GROWTH_PRODUCTION_RECIPES = {
    dog: {
        cost: { gold: 70, lumber: 20 },
        durationSec: 16,
        id: 'dog',
        producerTemplateIds: ['farm_house', 'town_hall'],
        sourceRawcodeRequirements: ['h001', 'h00H'],
        supplyCost: 1,
    },
} satisfies Record<DefenderId & 'dog', ProductionRecipe>;

/**
 * These are deliberately web balance values. Provider/target identity and
 * maximum-level evidence come from the W3X table; its cost/time/effect values
 * are incomplete, so SP-15 may retune these without changing the graph.
 */
export const GROWTH_RESEARCH = {
    arcaneTowerDamage: {
        costPerLevel: { gold: 80, lumber: 60 },
        effect: { damagePerLevel: 5, kind: 'tower_damage', towerLine: 'arcane' },
        id: 'arcaneTowerDamage',
        maxLevel: 3,
        providerTemplateIds: ['power_generator'],
        sourceRawcode: 'R009',
        timePerLevelSec: 24,
    },
    dogDamage: {
        costPerLevel: { gold: 60, lumber: 30 },
        effect: { damagePerLevel: 4, kind: 'dog_damage' },
        id: 'dogDamage',
        maxLevel: 3,
        providerTemplateIds: ['family_temple'],
        sourceRawcode: 'R00A',
        timePerLevelSec: 20,
    },
    dogSpeedClaw: {
        costPerLevel: { gold: 80, lumber: 50 },
        effect: { cooldownPctPerLevel: 8, kind: 'dog_speed_claw', moveSpeedPctPerLevel: 8 },
        id: 'dogSpeedClaw',
        maxLevel: 3,
        providerTemplateIds: ['arcane_lab'],
        sourceRawcode: 'R00D',
        timePerLevelSec: 24,
    },
    guardTowerDamage: {
        costPerLevel: { gold: 70, lumber: 50 },
        effect: { damagePerLevel: 4, kind: 'tower_damage', towerLine: 'guard' },
        id: 'guardTowerDamage',
        maxLevel: 3,
        providerTemplateIds: ['power_generator'],
        sourceRawcode: 'R008',
        timePerLevelSec: 22,
    },
    masonry: {
        costPerLevel: { gold: 55, lumber: 35 },
        effect: { armorPerLevel: 1, hpPerLevel: 50, kind: 'building_durability' },
        id: 'masonry',
        maxLevel: 3,
        providerTemplateIds: ['lumber_mill', 'lumber_mill_mid', 'lumber_mill_high'],
        sourceRawcode: 'Rhac',
        timePerLevelSec: 18,
    },
} satisfies Record<ResearchDefinition['id'], ResearchDefinition>;

const TEMPLATES: Record<MvpBuildingId, BuildingTemplateConfig> = BUILDING_TEMPLATES;

export type GrowthProgressionValidation = {
    readonly cycles: readonly MvpBuildingId[][];
    readonly invalidUpgradeTargets: readonly MvpBuildingId[];
    readonly missingRuleIds: readonly string[];
    readonly reachable: readonly MvpBuildingId[];
    readonly unreachable: readonly MvpBuildingId[];
};

export function validateGrowthProgression(
    initialBuildings: readonly MvpBuildingId[] = ['farm_house', 'market'],
): GrowthProgressionValidation {
    const templateIds = Object.keys(TEMPLATES) as MvpBuildingId[];
    const ruleIds = Object.keys(GROWTH_BUILDING_RULES);
    const missingRuleIds = [
        ...templateIds.filter((id) => !ruleIds.includes(id)),
        ...ruleIds.filter((id) => !templateIds.includes(id as MvpBuildingId)),
    ];
    const invalidUpgradeTargets = templateIds.filter((id) => {
        const target = TEMPLATES[id].upgradeTo;
        return Boolean(target && !TEMPLATES[target]);
    });
    const cycles = findUpgradeCycles(templateIds);
    const reachable = new Set<MvpBuildingId>(initialBuildings);
    let changed = true;
    while (changed) {
        changed = false;
        for (const id of templateIds) {
            if (reachable.has(id) || GROWTH_BUILDING_RULES[id].acquisition === 'starter_only') continue;
            const template = TEMPLATES[id];
            const requirementsMet = (template.requires ?? []).every((required) => reachable.has(required));
            const source = templateIds.find((sourceId) => TEMPLATES[sourceId].upgradeTo === id);
            const routeMet =
                GROWTH_BUILDING_RULES[id].acquisition === 'build' ||
                (source !== undefined && reachable.has(source));
            if (requirementsMet && routeMet) {
                reachable.add(id);
                changed = true;
            }
        }
    }
    return {
        cycles,
        invalidUpgradeTargets,
        missingRuleIds,
        reachable: templateIds.filter((id) => reachable.has(id)),
        unreachable: templateIds.filter((id) => !reachable.has(id)),
    };
}

function findUpgradeCycles(templateIds: readonly MvpBuildingId[]) {
    const visited = new Set<MvpBuildingId>();
    const visiting = new Set<MvpBuildingId>();
    const cycles: MvpBuildingId[][] = [];
    const visit = (id: MvpBuildingId, trail: readonly MvpBuildingId[]) => {
        if (visiting.has(id)) {
            cycles.push([...trail.slice(trail.indexOf(id)), id]);
            return;
        }
        if (visited.has(id)) return;
        visiting.add(id);
        const next = TEMPLATES[id].upgradeTo;
        if (next) visit(next, [...trail, id]);
        visiting.delete(id);
        visited.add(id);
    };
    templateIds.forEach((id) => visit(id, []));
    return cycles;
}
