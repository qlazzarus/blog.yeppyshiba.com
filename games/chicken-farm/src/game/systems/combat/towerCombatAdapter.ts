import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../../balance';
import type { CombatBuilding, CombatWolf } from '../../ecs/components';
import { POC_TOWER_ID } from '../../poc/combatPocLayout';

const WOLF_TOWER_TARGET_RADIUS_PX = 32;

export function updateTowerCombat(config: {
    readonly combatBuildings: readonly CombatBuilding[];
    readonly elapsedSec: number;
    readonly focusWolfOnBuilding: (wolf: CombatWolf, building: CombatBuilding) => void;
    readonly onTowerHit?: (event: {
        readonly damage: number;
        readonly target: CombatWolf;
        readonly tower: CombatBuilding;
    }) => void;
    readonly wolves: readonly CombatWolf[];
}) {
    const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
    if (!towerAttack) return;

    config.combatBuildings
        .filter((building) => building.kind === 'tower' && building.hp > 0)
        .forEach((tower) => {
            if (config.elapsedSec < tower.nextAttackAtSec) return;
            const target = config.wolves
                .filter((wolf) => wolf.hp > 0)
                .map((wolf) => ({
                    distance: Phaser.Math.Distance.Between(
                        tower.body.x,
                        tower.body.y,
                        wolf.body.x,
                        wolf.body.y,
                    ),
                    wolf,
                }))
                .filter(
                    (candidate) =>
                        candidate.distance <=
                        towerAttack.rangePx + WOLF_TOWER_TARGET_RADIUS_PX,
                )
                .sort((a, b) => a.distance - b.distance)[0]?.wolf;
            if (!target) return;

            const scaledDamage = Math.max(
                1,
                Math.round(towerAttack.damage * tower.attackDamageScale),
            );
            target.hp = Math.max(0, target.hp - scaledDamage);
            target.hpFill.width = 38 * (target.hp / target.maxHp);
            tower.nextAttackAtSec = config.elapsedSec + towerAttack.cooldownSec;
            config.onTowerHit?.({ damage: scaledDamage, target, tower });
            config.focusWolfOnBuilding(target, tower);

            if (target.hp <= 0) {
                target.state = 'dead';
                target.body.setAlpha(0.35);
            }
        });
}
