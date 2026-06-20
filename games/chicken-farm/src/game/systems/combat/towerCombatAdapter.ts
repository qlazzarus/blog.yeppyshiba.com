import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../../balance';
import type { CombatBuilding, CombatWolf } from '../../ecs/components';
import { POC_TOWER_ID } from '../../poc/combatPocLayout';

export function updateTowerCombat(config: {
    readonly combatBuildings: readonly CombatBuilding[];
    readonly elapsedSec: number;
    readonly focusWolfOnBuilding: (building: CombatBuilding) => void;
    readonly wolf: CombatWolf;
}) {
    const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
    if (!towerAttack || config.wolf.hp <= 0) return;

    config.combatBuildings
        .filter((building) => building.kind === 'tower' && building.hp > 0)
        .forEach((tower) => {
            if (config.wolf.hp <= 0) return;

            const distance = Phaser.Math.Distance.Between(
                tower.body.x,
                tower.body.y,
                config.wolf.body.x,
                config.wolf.body.y,
            );
            if (
                distance > towerAttack.rangePx ||
                config.elapsedSec < tower.nextAttackAtSec
            ) {
                return;
            }

            const scaledDamage = Math.max(
                1,
                Math.round(towerAttack.damage * tower.attackDamageScale),
            );
            config.wolf.hp = Math.max(0, config.wolf.hp - scaledDamage);
            config.wolf.hpFill.width = 38 * (config.wolf.hp / config.wolf.maxHp);
            tower.nextAttackAtSec = config.elapsedSec + towerAttack.cooldownSec;
            config.focusWolfOnBuilding(tower);

            if (config.wolf.hp <= 0) {
                config.wolf.state = 'dead';
                config.wolf.body.setAlpha(0.35);
            }
        });
}
