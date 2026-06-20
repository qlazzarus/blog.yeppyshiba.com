import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type {
    CombatBuilding,
    CombatBuildingKind,
    CombatWolf,
    PlayerStart,
} from '../ecs/components';
import {
    COMBAT_GRID_PX,
    COMBAT_POC_LAYOUT,
    POC_FENCE_ID,
    POC_PATH_BOUNDS_PADDING,
    POC_TOWER_FOCUS_LOCK_SEC,
    POC_TOWER_ID,
    POC_WOLF_ID,
    POC_WOLF_TEST_HP,
} from '../poc/combatPocLayout';
import { type GridPathPoint, findGridPath } from './pathing';
import { TerrainBlocker } from './terrainBlocker';
import { decideWolfAiBehavior } from './wolfAiStateMachine';

type CombatPocSystemConfig = {
    readonly scene: Phaser.Scene;
    readonly terrainBlocker: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldSize: Phaser.Math.Vector2;
    readonly getElapsedSec: () => number;
};

export class CombatPocSystem {
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker: TerrainBlocker;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;
    private readonly getElapsedSec: () => number;
    private combatBuildings: CombatBuilding[] = [];
    private combatGraphics?: Phaser.GameObjects.Graphics;
    private combatLabel?: Phaser.GameObjects.Text;
    private combatWolf?: CombatWolf;

    constructor(config: CombatPocSystemConfig) {
        this.scene = config.scene;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.worldSize = config.worldSize;
        this.getElapsedSec = config.getElapsedSec;
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
        this.combatWolf?.body.destroy();
        this.combatGraphics?.destroy();
        this.combatLabel?.destroy();

        this.combatBuildings = [];
        const layout = COMBAT_POC_LAYOUT;
        const snapToGrid = (value: number) =>
            Math.round(value / COMBAT_GRID_PX) * COMBAT_GRID_PX;
        const originWorldX = anchor.x + layout.originOffsetCells.x * COMBAT_GRID_PX;
        const originWorldY = anchor.y + layout.originOffsetCells.y * COMBAT_GRID_PX;
        const originX = snapToGrid(
            Phaser.Math.Clamp(originWorldX, 64, this.worldSize.x - 1024),
        );
        const originY = snapToGrid(
            Phaser.Math.Clamp(originWorldY, 64, this.worldSize.y - 1024),
        );
        const cellCenter = (
            cellX: number,
            cellY: number,
            cellWidth: number,
            cellHeight: number,
        ) => ({
            x: originX + (cellX + cellWidth / 2) * COMBAT_GRID_PX,
            y: originY + (cellY + cellHeight / 2) * COMBAT_GRID_PX,
        });

        this.combatGraphics = this.scene.add.graphics().setDepth(21);
        this.worldObjects.push(this.combatGraphics);

        const farmCell = cellCenter(
            layout.farm.x,
            layout.farm.y,
            layout.farm.w,
            layout.farm.h,
        );
        const farmCore = this.addCombatBuilding({
            attackDamageScale: 1,
            armor: 0,
            blocksPath: true,
            color: 0x8ebf58,
            height: COMBAT_GRID_PX * layout.farm.h,
            hp: 500,
            id: 'farm_core',
            kind: 'farm_core',
            name: 'Farm Target',
            targetableByWolves: true,
            width: COMBAT_GRID_PX * layout.farm.w,
            x: farmCell.x,
            y: farmCell.y,
        });
        const towerTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID];
        const towerACell = cellCenter(
            layout.towerA.x,
            layout.towerA.y,
            layout.towerA.w,
            layout.towerA.h,
        );
        const towerA = this.addCombatBuilding({
            attackDamageScale: 0.55,
            armor: towerTemplate.armor,
            blocksPath: towerTemplate.blocksPath,
            color: 0xd9bb73,
            height: COMBAT_GRID_PX * layout.towerA.h,
            hp: towerTemplate.hp,
            id: 'tower_a',
            kind: 'tower',
            name: `${towerTemplate.displayName} A`,
            targetableByWolves: towerTemplate.targetableByWolves,
            width: COMBAT_GRID_PX * layout.towerA.w,
            x: towerACell.x,
            y: towerACell.y,
        });
        const towerBCell = cellCenter(
            layout.towerB.x,
            layout.towerB.y,
            layout.towerB.w,
            layout.towerB.h,
        );
        const towerB = this.addCombatBuilding({
            attackDamageScale: 1,
            armor: towerTemplate.armor,
            blocksPath: towerTemplate.blocksPath,
            color: 0xc99545,
            height: COMBAT_GRID_PX * layout.towerB.h,
            hp: towerTemplate.hp,
            id: 'tower_b',
            kind: 'tower',
            name: `${towerTemplate.displayName} B`,
            targetableByWolves: towerTemplate.targetableByWolves,
            width: COMBAT_GRID_PX * layout.towerB.w,
            x: towerBCell.x,
            y: towerBCell.y,
        });
        towerB.nextAttackAtSec = this.elapsedSec + 0.58;

        const fenceTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_FENCE_ID];
        const addGridFence = (id: string, cellX: number, cellY: number) => {
            const position = cellCenter(cellX, cellY, 2, 1);
            return this.addCombatBuilding({
                attackDamageScale: 1,
                armor: fenceTemplate.armor,
                blocksPath: fenceTemplate.blocksPath,
                color: 0x9b7a4a,
                height: COMBAT_GRID_PX,
                hp: fenceTemplate.hp,
                id,
                kind: 'fence',
                name: fenceTemplate.displayName,
                targetableByWolves: fenceTemplate.targetableByWolves,
                width: COMBAT_GRID_PX * 2,
                x: position.x,
                y: position.y,
            });
        };
        const addGridStoneWall = (
            id: string,
            cellX: number,
            cellY: number,
            cellWidth: number,
            cellHeight: number,
        ) => {
            const position = cellCenter(cellX, cellY, cellWidth, cellHeight);
            return this.addCombatBuilding({
                attackDamageScale: 1,
                armor: 999,
                blocksPath: true,
                color: 0x727672,
                height: cellHeight * COMBAT_GRID_PX,
                hp: 9999,
                id,
                kind: 'fence',
                name: '돌벽',
                targetableByWolves: false,
                width: cellWidth * COMBAT_GRID_PX,
                x: position.x,
                y: position.y,
            });
        };
        const addFenceColumn = (
            id: string,
            cellX: number,
            fromY: number,
            toY: number,
        ) => {
            for (let cellY = fromY; cellY <= toY; cellY += 1) {
                addGridFence(`${id}_${cellY}`, cellX, cellY);
            }
        };
        const addFenceRow = (id: string, fromX: number, toX: number, cellY: number) => {
            for (let cellX = fromX; cellX <= toX; cellX += 2) {
                addGridFence(`${id}_${cellX}`, cellX, cellY);
            }
        };
        const addStoneRow = (id: string, fromX: number, toX: number, cellY: number) => {
            for (let cellX = fromX; cellX <= toX; cellX += 2) {
                addGridStoneWall(`${id}_${cellX}`, cellX, cellY, 2, 1);
            }
        };

        layout.fenceRows.forEach((row) =>
            addFenceRow(row.id, row.fromX, row.toX, row.y),
        );
        layout.fenceColumns.forEach((column) =>
            addFenceColumn(column.id, column.x, column.fromY, column.toY),
        );
        layout.fenceSingles.forEach((fence) =>
            addGridFence(fence.id, fence.x, fence.y),
        );
        layout.stoneRows.forEach((row) =>
            addStoneRow(row.id, row.fromX, row.toX, row.y),
        );

        const wolfCell = cellCenter(
            layout.wolf.x,
            layout.wolf.y,
            layout.wolf.w,
            layout.wolf.h,
        );
        this.createCombatWolf(
            wolfCell.x,
            wolfCell.y,
            farmCore.body.x,
            farmCore.body.y,
            farmCore.id,
        );

        this.combatLabel = this.scene.add
            .text(originX, originY - COMBAT_GRID_PX * 2, layout.label, {
                backgroundColor: 'rgba(16,16,16,0.72)',
                color: '#f5e6ae',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '12px',
                padding: { bottom: 4, left: 6, right: 6, top: 4 },
            })
            .setDepth(31);
        if (this.combatLabel) this.worldObjects.push(this.combatLabel);
        this.updateCombatBuildingHealth(farmCore);
        this.updateCombatBuildingHealth(towerA);
        this.updateCombatBuildingHealth(towerB);
    }

    private addCombatBuilding(config: {
        readonly armor: number;
        readonly blocksPath: boolean;
        readonly color: number;
        readonly height: number;
        readonly hp: number;
        readonly id: string;
        readonly kind: CombatBuildingKind;
        readonly name: string;
        readonly attackDamageScale?: number;
        readonly targetableByWolves: boolean;
        readonly width: number;
        readonly x: number;
        readonly y: number;
    }): CombatBuilding {
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
    private createCombatWolf(
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        defaultTargetBuildingId: string,
    ) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const maxHp = Math.max(enemy.hp, POC_WOLF_TEST_HP);
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
            .text(0, 20, 'wolf', {
                color: '#f5d0b8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(28)
            .setOrigin(0.5);
        const container = this.scene.add.container(x, y, [
            shadow,
            body,
            head,
            hpBack,
            hpFill,
            label,
        ]);
        container.setDepth(28);

        this.combatWolf = {
            body: container,
            defaultTargetBuildingId,
            focusLockedUntilSec: 0,
            hp: maxHp,
            hpFill,
            maxHp,
            nextAttackAtSec: 0,
            nextRepathAtSec: 0,
            path: [],
            pathIndex: 0,
            state: 'move',
            targetPoint: new Phaser.Math.Vector2(targetX, targetY),
        };
        this.worldObjects.push(container);
    }

    update(deltaSec: number) {
        if (!this.combatWolf || this.combatWolf.state === 'dead') return;

        this.updateTowerCombat();
        this.updateWolfCombat(deltaSec);
        this.drawCombatDebug();
    }

    private updateTowerCombat() {
        const wolf = this.combatWolf;
        if (!wolf || wolf.hp <= 0) return;

        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (!towerAttack) return;

        this.combatBuildings
            .filter((building) => building.kind === 'tower' && building.hp > 0)
            .forEach((tower) => {
                if (wolf.hp <= 0) return;

                const distance = Phaser.Math.Distance.Between(
                    tower.body.x,
                    tower.body.y,
                    wolf.body.x,
                    wolf.body.y,
                );
                if (
                    distance > towerAttack.rangePx ||
                    this.elapsedSec < tower.nextAttackAtSec
                ) {
                    return;
                }

                const scaledDamage = Math.max(
                    1,
                    Math.round(towerAttack.damage * tower.attackDamageScale),
                );
                wolf.hp = Math.max(0, wolf.hp - scaledDamage);
                wolf.hpFill.width = 38 * (wolf.hp / wolf.maxHp);
                tower.nextAttackAtSec = this.elapsedSec + towerAttack.cooldownSec;
                this.focusWolfOnBuilding(tower);

                if (wolf.hp <= 0) {
                    wolf.state = 'dead';
                    wolf.body.setAlpha(0.35);
                }
            });
    }

    private updateWolfCombat(deltaSec: number) {
        const wolf = this.combatWolf;
        if (!wolf || wolf.hp <= 0) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        this.syncWolfTargetPoint();
        const directTarget = this.getCurrentWolfTarget();
        this.refreshWolfPathIfNeeded();
        const blockingTarget = this.getWolfBlockingTarget();
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
                ? this.isWolfInAttackRange(blockingTarget)
                : false,
            pathFailedSinceSec: wolf.pathFailedSinceSec,
        });

        wolf.state = decision.state;
        wolf.stateAction = decision.action;
        wolf.stateReason = decision.reason;

        if (decision.action === 'attack_direct_target' && directTarget) {
            wolf.targetBuildingId = directTarget.id;
            this.attackCombatBuilding(directTarget, enemy.damage);
            return;
        }

        if (decision.action === 'follow_path') {
            wolf.targetBuildingId = undefined;
            wolf.pathFailedSinceSec = undefined;
            this.moveWolfAlongPath(enemy.speedPxPerSec, deltaSec);
            return;
        }

        wolf.pathFailedSinceSec ??= this.elapsedSec;

        if (decision.action === 'attack_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            this.attackCombatBuilding(blockingTarget, enemy.damage);
            return;
        }

        if (decision.action === 'approach_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            this.moveWolfToward(
                blockingTarget.body.x,
                blockingTarget.body.y,
                enemy.speedPxPerSec,
                deltaSec,
            );
            return;
        }

        wolf.targetBuildingId = undefined;
    }

    private focusWolfOnBuilding(building: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf || building.hp <= 0 || !building.targetableByWolves) return;
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

    private syncWolfTargetPoint() {
        const wolf = this.combatWolf;
        const goal = this.getWolfGoalBuilding();
        if (!wolf || !goal) return;

        const [candidate] = this.getWolfPathGoalCandidates(goal);
        wolf.targetPoint.set(candidate?.x ?? goal.body.x, candidate?.y ?? goal.body.y);
    }

    private moveWolfToward(
        targetX: number,
        targetY: number,
        speedPxPerSec: number,
        deltaSec: number,
    ) {
        const wolf = this.combatWolf;
        if (!wolf) return;

        const direction = new Phaser.Math.Vector2(
            targetX - wolf.body.x,
            targetY - wolf.body.y,
        );
        if (direction.lengthSq() < 16) return;

        direction.normalize().scale(speedPxPerSec * deltaSec);
        wolf.body.setPosition(wolf.body.x + direction.x, wolf.body.y + direction.y);
    }

    private moveWolfAlongPath(speedPxPerSec: number, deltaSec: number) {
        const wolf = this.combatWolf;
        if (!wolf) return;

        const waypoint = wolf.path[wolf.pathIndex];
        if (!waypoint) return;

        this.moveWolfToward(waypoint.x, waypoint.y, speedPxPerSec, deltaSec);

        if (
            Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                waypoint.x,
                waypoint.y,
            ) < 8
        ) {
            wolf.pathIndex += 1;
        }
    }

    private refreshWolfPathIfNeeded(force = false) {
        const wolf = this.combatWolf;
        if (!wolf || (!force && this.elapsedSec < wolf.nextRepathAtSec)) return;

        const pathing = CHICKEN_FARM_BALANCE.pathing;
        const bounds = this.getCombatPathBounds();
        const blockedRects = [
            ...this.terrainBlocker.getGroundBlockedRects(bounds),
            ...this.getCombatBlockedRects(),
        ];
        const clearancePx =
            ((pathing.unitClearanceCells.wolf - 1) * pathing.cellSize) / 2;
        const goalBuilding = this.getWolfGoalBuilding();
        const goalCandidates = goalBuilding
            ? this.getWolfPathGoalCandidates(goalBuilding)
            : [{ x: wolf.targetPoint.x, y: wolf.targetPoint.y }];
        let path: readonly GridPathPoint[] | null = null;
        let pathGoal = goalCandidates[0] ?? {
            x: wolf.targetPoint.x,
            y: wolf.targetPoint.y,
        };

        for (const goal of goalCandidates) {
            const candidatePath = findGridPath({
                blockedRects,
                bounds,
                cellSize: pathing.cellSize,
                clearancePx,
                goal,
                pathSmoothingEnabled: pathing.pathSmoothingEnabled,
                start: { x: wolf.body.x, y: wolf.body.y },
            });

            if (!candidatePath) continue;
            if (!path || candidatePath.length < path.length) {
                path = candidatePath;
                pathGoal = goal;
            }
        }

        wolf.targetPoint.set(pathGoal.x, pathGoal.y);

        wolf.path = path ?? [];
        wolf.pathIndex = 0;
        wolf.nextRepathAtSec = this.elapsedSec + pathing.repath.intervalSec;

        if (path) {
            wolf.pathFailedSinceSec = undefined;
        }
    }

    private getWolfPathGoalCandidates(building: CombatBuilding): GridPathPoint[] {
        const wolf = this.combatWolf;
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

        return candidates
            .filter((candidate) => !this.isCombatPathPointBlocked(candidate))
            .sort((a, b) => {
                if (!wolf) return 0;
                return (
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y)
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

    private getCurrentWolfTarget() {
        const wolf = this.combatWolf;
        if (!wolf) return null;
        const focusedGoal = this.getWolfGoalBuilding();

        if (
            focusedGoal &&
            focusedGoal.kind !== 'fence' &&
            this.isWolfInAttackRange(focusedGoal) &&
            !this.isWolfAttackLineBlocked(focusedGoal)
        ) {
            return focusedGoal;
        }

        return (
            this.combatBuildings.find((building) => {
                if (!building.targetableByWolves || building.hp <= 0) return false;

                if (!this.isWolfInAttackRange(building)) return false;
                if (building.kind === 'fence') return false;
                if (this.isWolfAttackLineBlocked(building)) return false;
                if (building.kind === 'tower') return true;
                return true;
            }) ?? null
        );
    }

    private isWolfAttackLineBlocked(target: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf) return false;

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

    private getWolfGoalBuilding() {
        const wolf = this.combatWolf;
        if (!wolf) return null;

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

    private getWolfBlockingTarget() {
        const wolf = this.combatWolf;
        if (!wolf) return null;

        const pathLine = this.getWolfTargetLine();
        const searchRadius =
            CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire.searchRadiusPx;
        const blockers = this.combatBuildings
            .filter((building) => {
                if (
                    !building.blocksPath ||
                    !building.targetableByWolves ||
                    building.hp <= 0
                ) {
                    return false;
                }

                const closeEnough =
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        building.body.x,
                        building.body.y,
                    ) <= searchRadius;

                return (
                    closeEnough ||
                    Phaser.Geom.Intersects.LineToRectangle(pathLine, building.footprint)
                );
            })
            .sort(
                (a, b) =>
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
                    ),
            );

        return blockers[0] ?? null;
    }

    private isWolfInAttackRange(building: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf) return false;

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

    private attackCombatBuilding(building: CombatBuilding, damage: number) {
        const wolf = this.combatWolf;
        if (!wolf || this.elapsedSec < wolf.nextAttackAtSec) return;

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
            this.refreshWolfPathIfNeeded(true);
        }
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

    private getCombatPathBounds() {
        const wolf = this.combatWolf;
        const points = [
            ...(wolf ? [{ x: wolf.body.x, y: wolf.body.y }] : []),
            { x: wolf?.targetPoint.x ?? 0, y: wolf?.targetPoint.y ?? 0 },
            ...this.combatBuildings.map((building) => ({
                x: building.body.x,
                y: building.body.y,
            })),
        ];
        const minX =
            Math.min(...points.map((point) => point.x)) - POC_PATH_BOUNDS_PADDING;
        const minY =
            Math.min(...points.map((point) => point.y)) - POC_PATH_BOUNDS_PADDING;
        const maxX =
            Math.max(...points.map((point) => point.x)) + POC_PATH_BOUNDS_PADDING;
        const maxY =
            Math.max(...points.map((point) => point.y)) + POC_PATH_BOUNDS_PADDING;
        const x = Math.max(0, minX);
        const y = Math.max(0, minY);
        const width = Math.min(this.worldSize.x, maxX) - x;
        const height = Math.min(this.worldSize.y, maxY) - y;

        return {
            height: Math.max(COMBAT_GRID_PX, height),
            width: Math.max(COMBAT_GRID_PX, width),
            x,
            y,
        };
    }

    private updateCombatBuildingHealth(building: CombatBuilding) {
        building.hpFill.width = Math.max(
            0,
            building.body.width * (building.hp / building.maxHp),
        );
    }

    private getWolfTargetLine() {
        const wolf = this.combatWolf;

        return new Phaser.Geom.Line(
            wolf?.body.x ?? 0,
            wolf?.body.y ?? 0,
            wolf?.targetPoint.x ?? 0,
            wolf?.targetPoint.y ?? 0,
        );
    }

    private drawCombatDebug() {
        if (!this.combatGraphics || !this.combatWolf) return;

        const graphics = this.combatGraphics;
        const wolf = this.combatWolf;
        const towers = this.combatBuildings.filter(
            (building) => building.kind === 'tower' && building.hp > 0,
        );
        const goal = this.getWolfGoalBuilding();
        const blockingTarget = this.getWolfBlockingTarget();
        const target = this.getCurrentWolfTarget() ?? blockingTarget ?? goal;

        graphics.clear();
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

        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (towerAttack) {
            towers.forEach((tower) => {
                graphics.lineStyle(2, 0xffd35a, 0.58);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.fillStyle(0xffd35a, 0.06);
                graphics.fillCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
            });
        }

        this.combatLabel?.setText(
            `Combat PoC | wolf ${wolf.state}${target ? ` -> ${target.name}` : ''}\n` +
                `AI ${wolf.stateAction ?? 'none'} / ${wolf.stateReason ?? 'none'} | HP ${Math.ceil(wolf.hp)}/${wolf.maxHp}\n` +
                `Tower aggro focus: ${goal?.name ?? 'none'}\n` +
                `A* ${wolf.path.length > 0 ? `path ${wolf.path.length}` : 'no path'} | blocker attack only after sealed path.`,
        );
    }
}
