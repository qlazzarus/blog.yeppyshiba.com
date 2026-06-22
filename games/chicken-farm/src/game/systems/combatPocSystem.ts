import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type {
    CombatBuilding,
    CombatBuildingKind,
    CombatWolf,
    PlayerStart,
} from '../ecs/components';
import {
    COMBAT_POC_LAYOUT,
    POC_TOWER_FOCUS_LOCK_SEC,
    POC_TOWER_ID,
    POC_WOLF_COUNT,
    POC_WOLF_ID,
    POC_WOLF_SPAWN_SPACING_PX,
} from '../poc/combatPocLayout';
import {
    createCombatLayoutPlan,
    type CombatBuildingSpec,
} from './combat/combatLayoutFactory';
import {
    canWolfOccupyPoint,
    getWolfUnitPathGoalCandidates as getWolfUnitPathGoalCandidatesFromAdapter,
    moveWolfAlongPath as moveWolfAlongPathAdapter,
    moveWolfToward as moveWolfTowardAdapter,
    refreshWolfPath,
    sortCandidatesByWolfDistance,
} from './combat/wolfMovementPathAdapter';
import { updateTowerCombat as updateTowerCombatAdapter } from './combat/towerCombatAdapter';
import { type GridPathPoint } from './pathing';
import type {
    AttackableEnemyTarget,
    ControllableUnitCombatTarget,
} from './playerCommandTypes';
import { TerrainBlocker } from './terrainBlocker';
import { decideWolfAiBehavior } from './wolfAiStateMachine';

type CombatPocSystemConfig = {
    readonly scene: Phaser.Scene;
    readonly terrainBlocker: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldSize: Phaser.Math.Vector2;
    readonly damageControllableUnit?: (unitId: string, damage: number) => boolean;
    readonly getElapsedSec: () => number;
    readonly getWolfTargetableUnits?: () => readonly ControllableUnitCombatTarget[];
    readonly recordPerformance?: (label: string, elapsedMs: number) => void;
};

type WolfDirectTarget =
    | {
          readonly kind: 'building';
          readonly value: CombatBuilding;
      }
    | {
          readonly kind: 'unit';
          readonly value: ControllableUnitCombatTarget;
      };

const MAX_WOLF_MOVEMENT_DELTA_SEC = 1 / 60;
const COMBAT_DEBUG_DRAW_INTERVAL_SEC = 0.15;

export class CombatPocSystem {
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker: TerrainBlocker;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;
    private readonly damageControllableUnit?: (unitId: string, damage: number) => boolean;
    private readonly getElapsedSec: () => number;
    private readonly getWolfTargetableUnits: () => readonly ControllableUnitCombatTarget[];
    private readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    private combatBuildings: CombatBuilding[] = [];
    private combatGraphics?: Phaser.GameObjects.Graphics;
    private combatLabel?: Phaser.GameObjects.Text;
    private combatWolves: CombatWolf[] = [];
    private nextCombatDebugDrawAtSec = 0;

    constructor(config: CombatPocSystemConfig) {
        this.scene = config.scene;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.worldSize = config.worldSize;
        this.damageControllableUnit = config.damageControllableUnit;
        this.getElapsedSec = config.getElapsedSec;
        this.getWolfTargetableUnits = config.getWolfTargetableUnits ?? (() => []);
        this.recordPerformance = config.recordPerformance;
    }

    private get elapsedSec() {
        return this.getElapsedSec();
    }

    create(anchor: PlayerStart) {
        this.combatBuildings.forEach((building) => {
            building.body.destroy();
            building.hpBack.destroy();
            building.hpFill.destroy();
        });
        this.combatWolves.forEach((wolf) => wolf.body.destroy());
        this.combatGraphics?.destroy();
        this.combatLabel?.destroy();

        this.combatBuildings = [];
        this.combatWolves = [];
        const layoutPlan = createCombatLayoutPlan({
            anchor,
            worldSize: this.worldSize,
        });

        this.combatGraphics = this.scene.add.graphics().setDepth(29);
        this.worldObjects.push(this.combatGraphics);

        layoutPlan.buildings.forEach((building) => this.addCombatBuilding(building));
        const farmCore = this.combatBuildings.find(
            (building) => building.id === layoutPlan.wolf.defaultTargetBuildingId,
        );
        const towerB = this.combatBuildings.find((building) => building.id === 'tower_b');
        if (towerB) towerB.nextAttackAtSec = this.elapsedSec + 0.58;

        this.createCombatWolves({
            defaultTargetBuildingId:
                farmCore?.id ?? layoutPlan.wolf.defaultTargetBuildingId,
            targetX: layoutPlan.wolf.targetX,
            targetY: layoutPlan.wolf.targetY,
            x: layoutPlan.wolf.x,
            y: layoutPlan.wolf.y,
        });

        this.combatLabel = this.scene.add
            .text(layoutPlan.labelX, layoutPlan.labelY, layoutPlan.label, {
                backgroundColor: 'rgba(16,16,16,0.72)',
                color: '#f5e6ae',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '12px',
                padding: { bottom: 4, left: 6, right: 6, top: 4 },
            })
            .setDepth(31);
        if (this.combatLabel) this.worldObjects.push(this.combatLabel);
        this.combatBuildings.forEach((building) =>
            this.updateCombatBuildingHealth(building),
        );
    }

    private addCombatBuilding(config: CombatBuildingSpec): CombatBuilding {
        const body = this.scene.add
            .rectangle(config.x, config.y, config.width, config.height, config.color, 1)
            .setStrokeStyle(2, 0x17120d, 0.9)
            .setDepth(24);
        const hpBack = this.scene.add
            .rectangle(
                config.x,
                config.y - config.height / 2 - 12,
                config.width,
                5,
                0x111111,
                0.9,
            )
            .setDepth(25);
        const hpFill = this.scene.add
            .rectangle(
                config.x - config.width / 2,
                config.y - config.height / 2 - 12,
                config.width,
                3,
                0x49d75d,
                1,
            )
            .setOrigin(0, 0.5)
            .setDepth(26);
        const label = this.scene.add
            .text(config.x, config.y + config.height / 2 + 8, config.name, {
                color: '#f5e6ae',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(26)
            .setOrigin(0.5, 0);

        const building: CombatBuilding = {
            armor: config.armor,
            body,
            blocksPath: config.blocksPath,
            footprint: new Phaser.Geom.Rectangle(
                config.x - config.width / 2,
                config.y - config.height / 2,
                config.width,
                config.height,
            ),
            hp: config.hp,
            hpBack,
            hpFill,
            id: config.id,
            kind: config.kind,
            maxHp: config.hp,
            name: config.name,
            attackDamageScale: config.attackDamageScale ?? 1,
            nextAttackAtSec: 0,
            targetableByWolves: config.targetableByWolves,
        };

        this.combatBuildings.push(building);
        this.worldObjects.push(body, hpBack, hpFill, label);

        return building;
    }
    private createCombatWolves(config: {
        readonly defaultTargetBuildingId: string;
        readonly targetX: number;
        readonly targetY: number;
        readonly x: number;
        readonly y: number;
    }) {
        for (let index = 0; index < POC_WOLF_COUNT; index += 1) {
            const row = index - (POC_WOLF_COUNT - 1) / 2;
            this.createCombatWolf({
                defaultTargetBuildingId: config.defaultTargetBuildingId,
                id: `combat-wolf-${index + 1}`,
                label: `wolf ${index + 1}`,
                targetX: config.targetX,
                targetY: config.targetY,
                x: config.x + (index % 2) * POC_WOLF_SPAWN_SPACING_PX,
                y: config.y + row * POC_WOLF_SPAWN_SPACING_PX,
            });
        }
    }

    private createCombatWolf(config: {
        readonly defaultTargetBuildingId: string;
        readonly id: string;
        readonly label: string;
        readonly targetX: number;
        readonly targetY: number;
        readonly x: number;
        readonly y: number;
    }) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const maxHp = enemy.hp;
        const shadow = this.scene.add
            .ellipse(0, 11, 34, 15, 0x070807, 0.52)
            .setDepth(24);
        const body = this.scene.add.ellipse(0, 0, 32, 22, 0x714f42, 1).setDepth(25);
        const head = this.scene.add
            .triangle(19, -2, 0, -8, 16, 0, 0, 8, 0x8a6758, 1)
            .setDepth(26);
        const hpBack = this.scene.add
            .rectangle(0, -24, 38, 5, 0x111111, 0.9)
            .setDepth(27);
        const hpFill = this.scene.add
            .rectangle(-19, -24, 38, 3, 0xff5d52, 1)
            .setOrigin(0, 0.5)
            .setDepth(28);
        const label = this.scene.add
            .text(0, 20, config.label, {
                color: '#f5d0b8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(28)
            .setOrigin(0.5);
        const container = this.scene.add.container(config.x, config.y, [
            shadow,
            body,
            head,
            hpBack,
            hpFill,
            label,
        ]);
        container.setDepth(28);

        const wolf: CombatWolf = {
            body: container,
            defaultTargetBuildingId: config.defaultTargetBuildingId,
            focusLockedUntilSec: 0,
            hp: maxHp,
            hpFill,
            id: config.id,
            maxHp,
            nextAttackAtSec: 0,
            nextRepathAtSec: 0,
            path: [],
            pathIndex: 0,
            state: 'move',
            targetPoint: new Phaser.Math.Vector2(config.targetX, config.targetY),
        };
        this.combatWolves.push(wolf);
        this.worldObjects.push(container);
    }

    update(deltaSec: number) {
        if (!this.getAliveWolves().length) return;

        this.updateTowerCombat();
        this.getAliveWolves().forEach((wolf) => this.updateWolfCombat(wolf, deltaSec));
        this.getAliveWolves().forEach((wolf) =>
            this.separateWolfFromControllableUnits(wolf),
        );
        this.separateWolvesFromEachOther();
        this.drawCombatDebug();
    }

    getAttackableEnemyTarget(targetId: string): AttackableEnemyTarget | null {
        const wolf = this.getTargetWolf(targetId);
        if (!wolf) return null;

        return {
            hp: wolf.hp,
            id: wolf.id,
            radius: 17,
            x: wolf.body.x,
            y: wolf.body.y,
        };
    }

    hitTestEnemy(worldX: number, worldY: number) {
        const radius = 24;
        const wolf = this.getAliveWolves()
            .map((candidate) => ({
                distance: Phaser.Math.Distance.Between(
                    worldX,
                    worldY,
                    candidate.body.x,
                    candidate.body.y,
                ),
                wolf: candidate,
            }))
            .filter((candidate) => candidate.distance <= radius)
            .sort((a, b) => a.distance - b.distance)[0]?.wolf;
        if (!wolf) return null;

        return this.getAttackableEnemyTarget(wolf.id);
    }

    damageEnemyTarget(targetId: string, damage: number) {
        const wolf = this.getTargetWolf(targetId);
        if (!wolf) return false;

        wolf.hp = Math.max(0, wolf.hp - Math.max(1, damage));
        wolf.hpFill.width = 38 * (wolf.hp / wolf.maxHp);

        if (wolf.hp <= 0) {
            wolf.state = 'dead';
            wolf.body.setAlpha(0.35);
            wolf.path = [];
            wolf.pathIndex = 0;
        }

        return true;
    }

    getDynamicBlockedRects() {
        return this.combatBuildings
            .filter((building) => building.blocksPath && building.hp > 0)
            .map((building) => ({
                height: building.footprint.height,
                width: building.footprint.width,
                x: building.footprint.x,
                y: building.footprint.y,
            }));
    }

    private updateTowerCombat() {
        const wolves = this.getAliveWolves();
        if (!wolves.length) return;

        updateTowerCombatAdapter({
            combatBuildings: this.combatBuildings,
            elapsedSec: this.elapsedSec,
            focusWolfOnBuilding: (wolf, building) =>
                this.focusWolfOnBuilding(wolf, building),
            wolves,
        });
    }

    private updateWolfCombat(wolf: CombatWolf, deltaSec: number) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const movementDeltaSec = Math.min(deltaSec, MAX_WOLF_MOVEMENT_DELTA_SEC);
        this.updateWolfUnitFocus(wolf);
        this.syncWolfTargetPoint(wolf);
        const directTarget = this.getCurrentWolfTarget(wolf);
        this.refreshWolfPathIfNeeded(wolf);
        const blockingTarget = this.getWolfBlockingTarget(wolf);
        const decision = decideWolfAiBehavior({
            blockedToBlockerDelaySec:
                CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire
                    .blockedToBlockerDelaySec,
            elapsedSec: this.elapsedSec,
            hasBlockingTarget: Boolean(blockingTarget),
            hasDirectTarget: Boolean(directTarget),
            hasLivePathWaypoint:
                wolf.path.length > 0 && wolf.pathIndex < wolf.path.length,
            isBlockingTargetInAttackRange: blockingTarget
                ? this.isWolfInAttackRange(wolf, blockingTarget)
                : false,
            pathFailedSinceSec: wolf.pathFailedSinceSec,
        });

        wolf.state = decision.state;
        wolf.stateAction = decision.action;
        wolf.stateReason = decision.reason;

        if (decision.action === 'attack_direct_target' && directTarget) {
            wolf.targetBuildingId =
                directTarget.kind === 'building' ? directTarget.value.id : undefined;
            if (directTarget.kind === 'unit') {
                wolf.focusUnitId = directTarget.value.id;
            }
            this.attackWolfDirectTarget(wolf, directTarget, enemy.damage);
            return;
        }

        if (decision.action === 'follow_path') {
            wolf.targetBuildingId = undefined;
            wolf.pathFailedSinceSec = undefined;
            moveWolfAlongPathAdapter({
                deltaSec: movementDeltaSec,
                dynamicBlockedRects: this.getCombatBlockedRects(),
                separateWolfFromControllableUnits: () =>
                    this.separateWolfFromControllableUnits(wolf),
                speedPxPerSec: enemy.speedPxPerSec,
                terrainBlocker: this.terrainBlocker,
                wolf,
                worldSize: this.worldSize,
            });
            return;
        }

        wolf.pathFailedSinceSec ??= this.elapsedSec;

        if (decision.action === 'attack_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            this.attackCombatBuilding(wolf, blockingTarget, enemy.damage);
            return;
        }

        if (decision.action === 'approach_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            moveWolfTowardAdapter({
                deltaSec: movementDeltaSec,
                dynamicBlockedRects: this.getCombatBlockedRects(),
                separateWolfFromControllableUnits: () =>
                    this.separateWolfFromControllableUnits(wolf),
                speedPxPerSec: enemy.speedPxPerSec,
                targetX: blockingTarget.body.x,
                targetY: blockingTarget.body.y,
                terrainBlocker: this.terrainBlocker,
                wolf,
                worldSize: this.worldSize,
            });
            return;
        }

        wolf.targetBuildingId = undefined;
    }

    private focusWolfOnBuilding(wolf: CombatWolf, building: CombatBuilding) {
        if (building.hp <= 0 || !building.targetableByWolves) return;
        if (wolf.focusUnitId && this.getWolfFocusedUnit(wolf)) return;
        if (
            wolf.focusBuildingId &&
            wolf.focusBuildingId !== building.id &&
            this.elapsedSec < wolf.focusLockedUntilSec
        ) {
            return;
        }

        if (wolf.focusBuildingId !== building.id) {
            wolf.focusBuildingId = building.id;
            wolf.path = [];
            wolf.pathIndex = 0;
            wolf.nextRepathAtSec = 0;
            wolf.pathFailedSinceSec = undefined;
        }
        wolf.focusLockedUntilSec = this.elapsedSec + POC_TOWER_FOCUS_LOCK_SEC;
        wolf.targetPoint.set(building.body.x, building.body.y);
    }

    private syncWolfTargetPoint(wolf: CombatWolf) {
        const focusedUnit = this.getWolfFocusedUnit(wolf);
        if (focusedUnit) {
            const [candidate] = this.getWolfUnitPathGoalCandidates(wolf, focusedUnit);
            wolf.targetPoint.set(
                candidate?.x ?? focusedUnit.x,
                candidate?.y ?? focusedUnit.y,
            );
            return;
        }

        const goal = this.getWolfGoalBuilding(wolf);
        if (!goal) return;

        const [candidate] = this.getWolfPathGoalCandidates(wolf, goal);
        wolf.targetPoint.set(candidate?.x ?? goal.body.x, candidate?.y ?? goal.body.y);
    }

    private refreshWolfPathIfNeeded(wolf: CombatWolf, force = false) {
        const focusedUnit = this.getWolfFocusedUnit(wolf);
        refreshWolfPath({
            combatBuildings: this.combatBuildings,
            dynamicBlockedRects: this.getCombatBlockedRects(),
            elapsedSec: this.elapsedSec,
            focusedUnit,
            force,
            getGoalBuilding: () => this.getWolfGoalBuilding(wolf),
            getPathGoalCandidates: (building) =>
                this.getWolfPathGoalCandidates(wolf, building),
            getUnitPathGoalCandidates: (unit) =>
                this.getWolfUnitPathGoalCandidates(wolf, unit),
            recordPerformance: this.recordPerformance,
            terrainBlocker: this.terrainBlocker,
            wolf,
            worldSize: this.worldSize,
        });
    }

    private getWolfPathGoalCandidates(
        wolf: CombatWolf,
        building: CombatBuilding,
    ): GridPathPoint[] {
        const attackRange =
            CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
        const margin = Math.max(12, attackRange - 10);
        const left = building.footprint.left;
        const right = building.footprint.right;
        const top = building.footprint.top;
        const bottom = building.footprint.bottom;
        const centerX = building.body.x;
        const centerY = building.body.y;
        const candidates: GridPathPoint[] = [
            { x: centerX, y: top - margin },
            { x: left - margin, y: centerY },
            { x: right + margin, y: centerY },
            { x: centerX, y: bottom + margin },
            { x: left - margin, y: top - margin },
            { x: right + margin, y: top - margin },
            { x: left - margin, y: bottom + margin },
            { x: right + margin, y: bottom + margin },
        ];

        return sortCandidatesByWolfDistance(
            candidates.filter(
                (candidate) =>
                    !this.isCombatPathPointBlocked(candidate) &&
                    !this.isAttackCandidateLineBlocked(candidate, building),
            ),
            wolf,
        );
    }

    private isAttackCandidateLineBlocked(
        candidate: GridPathPoint,
        targetBuilding: CombatBuilding,
    ) {
        const attackLine = new Phaser.Geom.Line(
            candidate.x,
            candidate.y,
            targetBuilding.body.x,
            targetBuilding.body.y,
        );

        return this.combatBuildings.some((building) => {
            if (building.id === targetBuilding.id) return false;
            if (!building.blocksPath || building.hp <= 0) return false;

            return Phaser.Geom.Intersects.LineToRectangle(
                attackLine,
                building.footprint,
            );
        });
    }

    private isCombatPathPointBlocked(point: GridPathPoint) {
        if (this.terrainBlocker.isPointGroundBlocked(point)) return true;

        return this.getCombatBlockedRects().some((rect) =>
            Phaser.Geom.Rectangle.Contains(
                new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height),
                point.x,
                point.y,
            ),
        );
    }

    private getCurrentWolfTarget(wolf: CombatWolf) {
        const unitTarget = this.getWolfUnitTargetInAttackRange(wolf);
        if (unitTarget) return unitTarget;

        const focusedGoal = this.getWolfGoalBuilding(wolf);

        if (
            focusedGoal &&
            focusedGoal.kind !== 'fence' &&
            this.isWolfInAttackRange(wolf, focusedGoal) &&
            !this.isWolfAttackLineBlocked(wolf, focusedGoal)
        ) {
            return { kind: 'building', value: focusedGoal };
        }

        const buildingTarget =
            this.combatBuildings.find((building) => {
                if (!building.targetableByWolves || building.hp <= 0) return false;

                if (!this.isWolfInAttackRange(wolf, building)) return false;
                if (building.kind === 'fence') return false;
                if (this.isWolfAttackLineBlocked(wolf, building)) return false;
                if (building.kind === 'tower') return true;
                return true;
            }) ?? null;

        return buildingTarget ? { kind: 'building', value: buildingTarget } : null;
    }

    private updateWolfUnitFocus(wolf: CombatWolf) {
        const focusedUnit = this.getWolfFocusedUnit(wolf);
        if (focusedUnit) {
            const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
            const distance = Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                focusedUnit.x,
                focusedUnit.y,
            );
            const leashRange =
                (enemy.acquireRangePx ?? 176) +
                (enemy.rangeLeashPx ?? 16) +
                focusedUnit.radius;
            if (distance <= leashRange) return;
        }

        wolf.focusUnitId = undefined;
        const target = this.getWolfUnitTargetInAcquireRange(wolf);
        if (!target) return;

        wolf.focusUnitId = target.id;
        wolf.focusBuildingId = undefined;
        wolf.path = [];
        wolf.pathIndex = 0;
        wolf.nextRepathAtSec = 0;
        wolf.pathFailedSinceSec = undefined;
    }

    private getWolfFocusedUnit(wolf: CombatWolf) {
        if (!wolf.focusUnitId) return null;

        const focusedUnit =
            this.getWolfTargetableUnits().find(
                (unit) =>
                    unit.id === wolf.focusUnitId &&
                    unit.hp > 0 &&
                    unit.targetableByWolves,
            ) ?? null;
        if (!focusedUnit) {
            wolf.focusUnitId = undefined;
        }

        return focusedUnit;
    }

    private getWolfUnitTargetInAcquireRange(wolf: CombatWolf) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const acquireRange = enemy.acquireRangePx ?? 176;
        const units = this.getWolfTargetableUnits()
            .filter((unit) => {
                if (!unit.targetableByWolves || unit.hp <= 0) return false;
                return (
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        unit.x,
                        unit.y,
                    ) <=
                    acquireRange + unit.radius
                );
            })
            .sort(
                (a, b) =>
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y),
            );

        return units[0] ?? null;
    }

    private getWolfUnitPathGoalCandidates(
        wolf: CombatWolf,
        unit: ControllableUnitCombatTarget,
    ): GridPathPoint[] {
        return getWolfUnitPathGoalCandidatesFromAdapter({
            isBlocked: (point) => this.isCombatPathPointBlocked(point),
            unit,
            wolf,
        });
    }

    private isWolfAttackLineBlocked(wolf: CombatWolf, target: CombatBuilding) {
        const line = new Phaser.Geom.Line(
            wolf.body.x,
            wolf.body.y,
            target.body.x,
            target.body.y,
        );

        return this.combatBuildings.some((building) => {
            if (building.id === target.id || building.hp <= 0 || !building.blocksPath) {
                return false;
            }

            return Phaser.Geom.Intersects.LineToRectangle(line, building.footprint);
        });
    }

    private getWolfUnitTargetInAttackRange(wolf: CombatWolf): WolfDirectTarget | null {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const acquireRange = enemy.acquireRangePx ?? 176;
        const attackRange = enemy.attackRangePx ?? 34;
        const units = this.getWolfTargetableUnits()
            .filter((unit) => {
                if (!unit.targetableByWolves || unit.hp <= 0) return false;
                const distance = Phaser.Math.Distance.Between(
                    wolf.body.x,
                    wolf.body.y,
                    unit.x,
                    unit.y,
                );
                if (distance > acquireRange) return false;
                if (distance > attackRange + unit.radius) return false;
                return !this.isWolfLineToPointBlocked(wolf, unit.x, unit.y);
            })
            .sort(
                (a, b) =>
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y),
            );

        return units[0] ? { kind: 'unit', value: units[0] } : null;
    }

    private isWolfLineToPointBlocked(
        wolf: CombatWolf,
        targetX: number,
        targetY: number,
    ) {
        const line = new Phaser.Geom.Line(wolf.body.x, wolf.body.y, targetX, targetY);
        return this.combatBuildings.some((building) => {
            if (building.hp <= 0 || !building.blocksPath) return false;
            return Phaser.Geom.Intersects.LineToRectangle(line, building.footprint);
        });
    }

    private getWolfGoalBuilding(wolf: CombatWolf) {
        const focused = wolf.focusBuildingId
            ? this.combatBuildings.find(
                  (building) =>
                      building.id === wolf.focusBuildingId &&
                      building.hp > 0 &&
                      building.targetableByWolves,
              )
            : undefined;
        if (focused) return focused;

        wolf.focusBuildingId = undefined;
        return (
            this.combatBuildings.find(
                (building) =>
                    building.id === wolf.defaultTargetBuildingId &&
                    building.hp > 0 &&
                    building.targetableByWolves,
            ) ?? null
        );
    }

    private getWolfBlockingTarget(wolf: CombatWolf) {
        const pathLine = this.getWolfTargetLine(wolf);
        const searchRadius =
            CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire.searchRadiusPx;
        const targetableBlockers = this.combatBuildings.filter((building) => {
            return (
                building.blocksPath &&
                building.targetableByWolves &&
                building.hp > 0
            );
        });
        const byDistanceFromWolf = (a: CombatBuilding, b: CombatBuilding) =>
            Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                a.body.x,
                a.body.y,
            ) -
            Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                b.body.x,
                b.body.y,
            );
        const lineBlockers = targetableBlockers
            .filter((building) =>
                Phaser.Geom.Intersects.LineToRectangle(pathLine, building.footprint),
            )
            .sort(byDistanceFromWolf);
        if (lineBlockers[0]) return lineBlockers[0];

        const closeBlockers = targetableBlockers
            .filter((building) => {
                if (
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        building.body.x,
                        building.body.y,
                    ) > searchRadius
                ) {
                    return false;
                }

                return true;
            })
            .sort(byDistanceFromWolf);

        return closeBlockers[0] ?? null;
    }

    private isWolfInAttackRange(wolf: CombatWolf, building: CombatBuilding) {
        const attackRange =
            CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
        const attackCircle = new Phaser.Geom.Circle(
            wolf.body.x,
            wolf.body.y,
            attackRange,
        );

        return (
            Phaser.Geom.Rectangle.Contains(
                building.footprint,
                wolf.body.x,
                wolf.body.y,
            ) ||
            Phaser.Geom.Intersects.CircleToRectangle(attackCircle, building.footprint)
        );
    }

    private attackCombatBuilding(
        wolf: CombatWolf,
        building: CombatBuilding,
        damage: number,
    ) {
        if (this.elapsedSec < wolf.nextAttackAtSec) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        building.hp = Math.max(0, building.hp - Math.max(1, damage - building.armor));
        wolf.nextAttackAtSec = this.elapsedSec + enemy.attackCooldownSec;
        this.updateCombatBuildingHealth(building);

        if (building.hp <= 0) {
            building.body.setAlpha(0.22);
            building.hpBack.setVisible(false);
            building.hpFill.setVisible(false);
            if (wolf.focusBuildingId === building.id) {
                wolf.focusBuildingId = undefined;
            }
            this.getAliveWolves().forEach((aliveWolf) =>
                this.refreshWolfPathIfNeeded(aliveWolf, true),
            );
        }
    }

    private attackWolfDirectTarget(
        wolf: CombatWolf,
        target: WolfDirectTarget,
        damage: number,
    ) {
        if (target.kind === 'building') {
            this.attackCombatBuilding(wolf, target.value, damage);
            return;
        }

        if (this.elapsedSec < wolf.nextAttackAtSec) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        this.damageControllableUnit?.(target.value.id, damage);
        wolf.nextAttackAtSec = this.elapsedSec + enemy.attackCooldownSec;
    }

    private separateWolfFromControllableUnits(wolf: CombatWolf) {
        const wolfRadius = 17;
        this.getWolfTargetableUnits().forEach((unit) => {
            if (unit.hp <= 0) return;

            const minDistance = wolfRadius + unit.radius;
            const delta = new Phaser.Math.Vector2(
                wolf.body.x - unit.x,
                wolf.body.y - unit.y,
            );
            const distance = delta.length();
            if (distance >= minDistance) return;

            if (distance <= 0.001) {
                const nextX = unit.x + minDistance;
                const nextY = unit.y;
                if (this.canWolfOccupyPoint(nextX, nextY)) {
                    wolf.body.setPosition(nextX, nextY);
                }
                return;
            }

            delta.normalize().scale(minDistance - distance);
            const nextX = wolf.body.x + delta.x;
            const nextY = wolf.body.y + delta.y;
            if (this.canWolfOccupyPoint(nextX, nextY)) {
                wolf.body.setPosition(nextX, nextY);
            }
        });
    }

    private separateWolvesFromEachOther() {
        const wolves = this.getAliveWolves();
        const wolfRadius = 17;
        for (let a = 0; a < wolves.length; a += 1) {
            for (let b = a + 1; b < wolves.length; b += 1) {
                const wolfA = wolves[a];
                const wolfB = wolves[b];
                const minDistance = wolfRadius * 2;
                const delta = new Phaser.Math.Vector2(
                    wolfB.body.x - wolfA.body.x,
                    wolfB.body.y - wolfA.body.y,
                );
                const distance = delta.length();
                if (distance >= minDistance) continue;

                const push = (minDistance - Math.max(distance, 0.001)) / 2;
                if (distance <= 0.001) {
                    delta.set(1, 0);
                } else {
                    delta.normalize();
                }
                const nextA = {
                    x: wolfA.body.x - delta.x * push,
                    y: wolfA.body.y - delta.y * push,
                };
                const nextB = {
                    x: wolfB.body.x + delta.x * push,
                    y: wolfB.body.y + delta.y * push,
                };
                if (this.canWolfOccupyPoint(nextA.x, nextA.y)) {
                    wolfA.body.setPosition(nextA.x, nextA.y);
                }
                if (this.canWolfOccupyPoint(nextB.x, nextB.y)) {
                    wolfB.body.setPosition(nextB.x, nextB.y);
                }
            }
        }
    }

    private canWolfOccupyPoint(x: number, y: number) {
        return canWolfOccupyPoint({
            dynamicBlockedRects: this.getCombatBlockedRects(),
            terrainBlocker: this.terrainBlocker,
            worldSize: this.worldSize,
            x,
            y,
        });
    }

    private getCombatBlockedRects() {
        return this.combatBuildings
            .filter(
                (building) =>
                    building.blocksPath &&
                    building.hp > 0 &&
                    building.kind !== 'farm_core',
            )
            .map((building) => ({
                height: building.footprint.height,
                width: building.footprint.width,
                x: building.footprint.x,
                y: building.footprint.y,
            }));
    }

    private updateCombatBuildingHealth(building: CombatBuilding) {
        building.hpFill.width = Math.max(
            0,
            building.body.width * (building.hp / building.maxHp),
        );
    }

    private getWolfTargetLine(wolf: CombatWolf) {
        return new Phaser.Geom.Line(
            wolf.body.x,
            wolf.body.y,
            wolf.targetPoint.x,
            wolf.targetPoint.y,
        );
    }

    private getAliveWolves() {
        return this.combatWolves.filter((wolf) => wolf.hp > 0 && wolf.state !== 'dead');
    }

    private getTargetWolf(targetId: string) {
        return (
            this.combatWolves.find((wolf) => wolf.id === targetId && wolf.hp > 0) ??
            null
        );
    }

    private drawCombatDebug() {
        const wolf = this.getAliveWolves()[0];
        if (!this.combatGraphics || !wolf) return;
        if (this.elapsedSec < this.nextCombatDebugDrawAtSec) return;
        this.nextCombatDebugDrawAtSec =
            this.elapsedSec + COMBAT_DEBUG_DRAW_INTERVAL_SEC;

        const graphics = this.combatGraphics;
        const towers = this.combatBuildings.filter(
            (building) => building.kind === 'tower' && building.hp > 0,
        );
        const goal = this.getWolfGoalBuilding(wolf);
        const blockingTarget = this.getWolfBlockingTarget(wolf);
        const target = this.getCurrentWolfTarget(wolf);
        const targetName =
            target?.value.name ?? blockingTarget?.name ?? goal?.name ?? undefined;

        graphics.clear();
        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (towerAttack) {
            towers.forEach((tower) => {
                graphics.fillStyle(0xffd35a, 0.025);
                graphics.fillCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.lineStyle(3, 0xffd35a, 0.86);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.lineStyle(1, 0x2b1b08, 0.75);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx - 2);
            });
        }

        graphics.lineStyle(2, 0xff675d, 0.68);
        graphics.lineBetween(
            wolf.body.x,
            wolf.body.y,
            wolf.targetPoint.x,
            wolf.targetPoint.y,
        );

        if (wolf.path.length > 0) {
            graphics.lineStyle(3, 0x7ee6ff, 0.76);
            let fromX = wolf.body.x;
            let fromY = wolf.body.y;
            for (let index = wolf.pathIndex; index < wolf.path.length; index += 1) {
                const waypoint = wolf.path[index];
                graphics.lineBetween(fromX, fromY, waypoint.x, waypoint.y);
                graphics.fillStyle(0x7ee6ff, 0.9);
                graphics.fillCircle(waypoint.x, waypoint.y, 3);
                fromX = waypoint.x;
                fromY = waypoint.y;
            }
        }

        this.combatLabel?.setText(
            `Combat PoC | wolf ${wolf.state}${targetName ? ` -> ${targetName}` : ''}\n` +
                `Wolves ${this.getAliveWolves().length}/${POC_WOLF_COUNT} | sample ${wolf.id} ${wolf.state} HP ${Math.ceil(wolf.hp)}/${wolf.maxHp}\n` +
                `AI ${wolf.stateAction ?? 'none'} / ${wolf.stateReason ?? 'none'}\n` +
                `Tower aggro focus: ${goal?.name ?? 'none'}\n` +
                `A* ${wolf.path.length > 0 ? `path ${wolf.path.length}` : 'no path'} | blocker attack only after sealed path.`,
        );
    }
}
