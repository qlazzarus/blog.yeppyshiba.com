import type { DefenderConfig, DefenderId } from './balanceTypes';
import type { ResearchDefinition } from './growthProgression';

export type UnitResearchLevels = Pick<
    Record<ResearchDefinition['id'], number>,
    'dogDamage' | 'dogSpeedClaw'
>;

export function getResearchedUnitStats(
    templateId: DefenderId,
    base: DefenderConfig,
    levels: UnitResearchLevels,
) {
    if (templateId !== 'dog') return base;
    const damageLevel = Math.max(0, levels.dogDamage);
    const speedLevel = Math.max(0, levels.dogSpeedClaw);
    const speedMultiplier = 1 + speedLevel * 0.08;
    const cooldownMultiplier = Math.max(0.1, 1 - speedLevel * 0.08);
    return {
        ...base,
        attackCooldownSec: base.attackCooldownSec * cooldownMultiplier,
        damage: base.damage + damageLevel * 4,
        speedPxPerSec: base.speedPxPerSec * speedMultiplier,
    };
}
