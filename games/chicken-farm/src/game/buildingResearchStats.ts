import type { BuildingTemplateConfig, MvpBuildingId } from './balanceTypes';
import type { ResearchDefinition } from './growthProgression';

export type BuildingResearchLevels = Pick<
    Record<ResearchDefinition['id'], number>,
    'arcaneTowerDamage' | 'guardTowerDamage' | 'masonry'
>;

export type ResearchedBuildingStats = {
    readonly armor: number;
    readonly attack: BuildingTemplateConfig['attack'];
    readonly maxHp: number;
};

/** Computes from template base stats on every read; modifiers never stack. */
export function getResearchedBuildingStats(
    template: BuildingTemplateConfig,
    levels: BuildingResearchLevels,
): ResearchedBuildingStats {
    const masonry = Math.max(0, levels.masonry);
    const towerDamageBonus = getTowerDamageBonus(template.id, levels);
    return {
        armor: template.armor + masonry,
        attack: template.attack
            ? { ...template.attack, damage: template.attack.damage + towerDamageBonus }
            : undefined,
        maxHp: template.hp + masonry * 50,
    };
}

function getTowerDamageBonus(templateId: MvpBuildingId, levels: BuildingResearchLevels) {
    if (isGuardTower(templateId)) return Math.max(0, levels.guardTowerDamage) * 4;
    if (isArcaneTower(templateId)) return Math.max(0, levels.arcaneTowerDamage) * 5;
    return 0;
}

function isGuardTower(templateId: MvpBuildingId) {
    return templateId.startsWith('tower_guard_');
}

function isArcaneTower(templateId: MvpBuildingId) {
    return templateId.startsWith('tower_arcane_');
}
