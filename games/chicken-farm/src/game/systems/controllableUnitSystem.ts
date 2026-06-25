import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { PlayerStart } from '../ecs/components';
import { findGridPath, type GridPathRect } from './pathing';
import {
    canOccupyPoint,
    DEFAULT_UNIT_BLOCKER_CLEARANCE_PX,
    getOffsetTargetPoint,
} from './movementGuards';
import type {
    AttackableEnemyTarget,
    ControllableUnitCombatTarget,
    ControllableUnitState,
    ControllableUnitTemplateId,
    Point,
} from './playerCommandTypes';
import type { TerrainBlocker } from './terrainBlocker';

type ControllableUnitSystemConfig = {
    readonly damageEnemyTarget?: (targetId: string, damage: number) => boolean;
    readonly getAttackableEnemyTarget?: (targetId: string) => AttackableEnemyTarget | null;
    readonly getDynamicBlockedRects?: () => readonly GridPathRect[];
    readonly getElapsedSec: () => number;
    readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    readonly scene: Phaser.Scene;
    readonly terrainBlocker?: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldSize: Phaser.Math.Vector2;
};

type UnitView = {
    readonly body: Phaser.GameObjects.Container;
    readonly hpBack: Phaser.GameObjects.Rectangle;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    readonly label: Phaser.GameObjects.Text;
    readonly selectionRing: Phaser.GameObjects.Ellipse;
};

const SELECTION_RADIUS_BY_TEMPLATE: Record<ControllableUnitTemplateId, number> = {
    dog: 24,
    farmer: 28,
};

const COLLISION_RADIUS_BY_TEMPLATE: Record<ControllableUnitTemplateId, number> = {
    dog: 18,
    farmer: 20,
};

const UNIT_PUSH_DISTANCE_SCALE = 0.78;
const UNIT_PUSH_MAX_STEP_PX = 10;
const MULTI_UNIT_DESTINATION_OFFSET_PX = 34;
const MAX_CONTROLLABLE_UNIT_MOVEMENT_DELTA_SEC = 1 / 60;
const PLAYER_PATH_BOUNDS_PADDING_PX = 512;

const UNIT_OFFSETS: Record<ControllableUnitTemplateId, Phaser.Math.Vector2> = {
    // Original command-control PoC offsets, restore after wolf maze validation:
    // dog: new Phaser.Math.Vector2(42, 18),
    // farmer: new Phaser.Math.Vector2(0, 0),
    dog: new Phaser.Math.Vector2(-640, -520),
    farmer: new Phaser.Math.Vector2(-700, -560),
};

export class ControllableUnitSystem {
    private readonly damageEnemyTarget?: (targetId: string, damage: number) => boolean;
    private readonly getAttackableEnemyTarget: (
        targetId: string,
    ) => AttackableEnemyTarget | null;
    private readonly getDynamicBlockedRects?: () => readonly GridPathRect[];
    private readonly getElapsedSec: () => number;
    private readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker?: TerrainBlocker;
    private readonly units: ControllableUnitState[] = [];
    private readonly views = new Map<string, UnitView>();
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;

    constructor(config: ControllableUnitSystemConfig) {
        this.damageEnemyTarget = config.damageEnemyTarget;
        this.getAttackableEnemyTarget = config.getAttackableEnemyTarget ?? (() => null);
        this.getDynamicBlockedRects = config.getDynamicBlockedRects;
        this.getElapsedSec = config.getElapsedSec;
        this.recordPerformance = config.recordPerformance;
        this.scene = config.scene;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.worldSize = config.worldSize;
    }

    createForStart(start: PlayerStart) {
        this.upsertUnit('farmer', start, start.id);
        this.upsertUnit('dog', start, start.id);
    }

    getPrimaryUnitObject() {
        return this.views.get(this.getPrimaryUnit()?.id ?? '')?.body;
    }

    getPrimaryUnit() {
        return this.units.find((unit) => unit.templateId === 'farmer') ?? this.units[0];
    }

    getUnitSummary() {
        if (!this.units.length) return 'units none';

        return this.units
            .map(
                (unit) =>
                    `${unit.selected ? '*' : ''}${unit.templateId} ${Math.round(
                        unit.position.x,
                    )},${Math.round(unit.position.y)}`,
            )
            .join(' | ');
    }

    getUnits() {
        return this.units;
    }

    selectAt(worldX: number, worldY: number) {
        const selected = this.findUnitAt(worldX, worldY);
        this.units.forEach((unit) => {
            unit.selected = selected?.id === unit.id;
            this.updateView(unit);
        });

        return selected ?? null;
    }

    selectInRect(rect: Phaser.Geom.Rectangle) {
        const selectedUnits = this.units.filter((unit) => {
            const radius = SELECTION_RADIUS_BY_TEMPLATE[unit.templateId];
            const selectionCircle = new Phaser.Geom.Circle(
                unit.position.x,
                unit.position.y,
                radius,
            );
            return Phaser.Geom.Intersects.CircleToRectangle(selectionCircle, rect);
        });
        const selectedIds = new Set(selectedUnits.map((unit) => unit.id));

        this.units.forEach((unit) => {
            unit.selected = selectedIds.has(unit.id);
            this.updateView(unit);
        });

        return selectedUnits;
    }

    clearSelection() {
        this.units.forEach((unit) => {
            unit.selected = false;
            this.updateView(unit);
        });
    }

    getSelectedUnits() {
        return this.units.filter((unit) => unit.selected);
    }

    getNearestUnitSummary(worldX: number, worldY: number) {
        const nearest = [...this.units]
            .map((unit) => ({
                distance: Phaser.Math.Distance.Between(
                    worldX,
                    worldY,
                    unit.position.x,
                    unit.position.y,
                ),
                unit,
            }))
            .sort((a, b) => a.distance - b.distance)[0];

        if (!nearest) return null;

        return {
            distance: Number(nearest.distance.toFixed(1)),
            id: nearest.unit.id,
            templateId: nearest.unit.templateId,
            x: Number(nearest.unit.position.x.toFixed(1)),
            y: Number(nearest.unit.position.y.toFixed(1)),
        };
    }

    getWolfTargetableUnits(): readonly ControllableUnitCombatTarget[] {
        return this.units
            .filter((unit) => unit.hp > 0)
            .map((unit) => ({
                armor: unit.armor,
                hp: unit.hp,
                id: unit.id,
                maxHp: unit.maxHp,
                name: unit.templateId === 'farmer' ? 'Farmer' : 'Dog',
                radius: COLLISION_RADIUS_BY_TEMPLATE[unit.templateId],
                targetableByWolves: true,
                templateId: unit.templateId,
                x: unit.position.x,
                y: unit.position.y,
            }));
    }

    damageUnit(unitId: string, damage: number) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit || unit.hp <= 0) return false;

        unit.hp = Math.max(0, unit.hp - Math.max(1, damage - unit.armor));
        unit.currentCommand = unit.hp > 0 ? unit.currentCommand : undefined;
        unit.path = unit.hp > 0 ? unit.path : [];
        unit.pathIndex = unit.hp > 0 ? unit.pathIndex : 0;
        this.updateView(unit);
        return true;
    }

    issueMoveCommandToSelected(targetPoint: Point) {
        const selectedUnits = this.getSelectedUnits();
        return this.issueMoveCommandToUnits(
            selectedUnits.map((unit) => unit.id),
            targetPoint,
        );
    }

    issueMoveCommandToUnits(unitIds: readonly string[], targetPoint: Point) {
        const unitIdSet = new Set(unitIds);
        const targetUnits = this.units.filter(
            (unit) =>
                unitIdSet.has(unit.id) &&
                unit.currentCommand?.type !== 'build',
        );
        if (!targetUnits.length) return { movedUnitCount: 0, pathFoundCount: 0 };

        let pathFoundCount = 0;
        targetUnits.forEach((unit, index) => {
            const unitTargetPoint = this.getMoveTargetPointForUnit(
                targetPoint,
                index,
                targetUnits.length,
            );
            const path = this.findMovePath(unit.position, unitTargetPoint);
            unit.currentCommand = {
                targetPoint: unitTargetPoint,
                type: 'move',
                unitIds: [unit.id],
            };
            unit.path = path ?? [];
            unit.pathIndex = 0;
            if (path?.length) pathFoundCount += 1;
            this.updateView(unit);
        });
        this.drawMoveMarker(targetPoint, pathFoundCount > 0);

        return { movedUnitCount: targetUnits.length, pathFoundCount };
    }

    setUnitBuildCommand(unitId: string, siteId: string, targetPoint: Point) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit || unit.hp <= 0) return false;

        unit.currentCommand = {
            siteId,
            targetPoint,
            type: 'build',
            unitIds: [unit.id],
        };
        unit.path = [];
        unit.pathIndex = 0;
        this.updateView(unit);
        return true;
    }

    clearBuildCommand(unitId: string, siteId: string) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit || unit.currentCommand?.type !== 'build') return false;
        if (unit.currentCommand.siteId !== siteId) return false;

        unit.currentCommand = undefined;
        this.updateView(unit);
        return true;
    }

    issueSmartCommandToSelected(targetPoint: Point, targetEntityId?: string) {
        const selectedUnits = this.getSelectedUnits();
        if (!selectedUnits.length) return { action: 'none', affectedUnitCount: 0 };

        if (!targetEntityId) {
            const moveResult = this.issueMoveCommandToSelected(targetPoint);
            return {
                action: 'move',
                affectedUnitCount: moveResult.movedUnitCount,
            };
        }

        selectedUnits.forEach((unit) => {
            if (unit.currentCommand?.type === 'build') return;

            unit.currentCommand = {
                targetEntityId,
                targetPoint,
                type: 'attack',
                unitIds: [unit.id],
            };
            unit.path = [];
            unit.pathIndex = 0;
            this.updateView(unit);
        });

        return { action: 'attack_target', affectedUnitCount: selectedUnits.length };
    }

    stopSelectedUnits() {
        const selectedUnits = this.getSelectedUnits();
        selectedUnits.forEach((unit) => {
            if (unit.currentCommand?.type === 'build') return;

            unit.currentCommand = {
                type: 'stop',
                unitIds: [unit.id],
            };
            unit.path = [];
            unit.pathIndex = 0;
            this.updateView(unit);
        });

        return selectedUnits.length;
    }

    update(deltaSec: number) {
        const movementDeltaSec = Math.min(
            deltaSec,
            MAX_CONTROLLABLE_UNIT_MOVEMENT_DELTA_SEC,
        );
        this.units.forEach((unit) => {
            if (unit.currentCommand?.type === 'move') {
                this.updateMoveCommand(unit, movementDeltaSec);
                return;
            }

            if (unit.currentCommand?.type === 'attack') {
                this.updateAttackCommand(unit, movementDeltaSec);
            }
        });
        this.resolveUnitPush();
    }

    private upsertUnit(
        templateId: ControllableUnitTemplateId,
        start: PlayerStart,
        ownerPlayerId: number,
    ) {
        const id = `p${ownerPlayerId}-${templateId}`;
        const offset = UNIT_OFFSETS[templateId];
        const position = {
            x: start.x + offset.x,
            y: start.y + offset.y,
        };
        const existing = this.units.find((unit) => unit.id === id);

        if (existing) {
            existing.ownerPlayerId = ownerPlayerId;
            existing.position = position;
            existing.selected = false;
            existing.currentCommand = undefined;
            existing.hp = existing.maxHp;
            existing.path = [];
            existing.pathIndex = 0;
            this.updateView(existing);
            return;
        }

        const state: ControllableUnitState = {
            armor: CHICKEN_FARM_BALANCE.defenders[templateId].armor,
            hp: CHICKEN_FARM_BALANCE.defenders[templateId].hp,
            id,
            maxHp: CHICKEN_FARM_BALANCE.defenders[templateId].hp,
            nextAttackAtSec: 0,
            ownerPlayerId,
            path: [],
            pathIndex: 0,
            position,
            selected: false,
            speedPxPerSec: CHICKEN_FARM_BALANCE.defenders[templateId].speedPxPerSec,
            templateId,
        };

        this.units.push(state);
        this.createView(state);
    }

    private createView(unit: ControllableUnitState) {
        const isFarmer = unit.templateId === 'farmer';
        const selectionRing = this.scene.add
            .ellipse(
                0,
                12,
                isFarmer ? 48 : 42,
                isFarmer ? 22 : 18,
            )
            .setStrokeStyle(2, 0x36d95e, 0.94)
            .setDepth(24)
            .setVisible(false);
        const shadow = this.scene.add
            .ellipse(0, 10, isFarmer ? 32 : 28, isFarmer ? 13 : 11, 0x050805, 0.44)
            .setDepth(24);
        const body = isFarmer
            ? this.createFarmerBody()
            : this.createDogBody();
        const label = this.scene.add
            .text(0, isFarmer ? 26 : 22, isFarmer ? 'FARMER' : 'DOG', {
                backgroundColor: 'rgba(12, 13, 10, 0.7)',
                color: isFarmer ? '#f7e89a' : '#cfe8ff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '10px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setDepth(28)
            .setOrigin(0.5);
        const hpBack = this.scene.add
            .rectangle(0, isFarmer ? -26 : -22, isFarmer ? 38 : 34, 5, 0x101010, 0.9)
            .setDepth(28);
        const hpFill = this.scene.add
            .rectangle(
                isFarmer ? -19 : -17,
                isFarmer ? -26 : -22,
                isFarmer ? 38 : 34,
                3,
                0x44d35f,
                1,
            )
            .setDepth(29)
            .setOrigin(0, 0.5);
        const container = this.scene.add.container(unit.position.x, unit.position.y, [
            selectionRing,
            shadow,
            ...body,
            hpBack,
            hpFill,
            label,
        ]);

        container.setDepth(25);
        this.views.set(unit.id, { body: container, hpBack, hpFill, label, selectionRing });
        this.worldObjects.push(container);
    }

    private createFarmerBody() {
        return [
            this.scene.add.circle(0, 0, 12, 0xe8d2a0, 1).setDepth(25),
            this.scene.add.rectangle(0, -9, 18, 8, 0x6b4328, 1).setDepth(26),
            this.scene.add
                .triangle(13, 0, 0, -4, 8, 0, 0, 4, 0xd88a3d, 1)
                .setDepth(26),
            this.scene.add.rectangle(-10, 2, 5, 18, 0x785231, 1).setDepth(26),
        ];
    }

    private createDogBody() {
        return [
            this.scene.add.ellipse(0, 2, 28, 15, 0x8d5a35, 1).setDepth(25),
            this.scene.add.circle(13, -4, 8, 0xa66b3d, 1).setDepth(26),
            this.scene.add.triangle(18, -9, 0, 0, 7, -8, 10, 1, 0x5b351f, 1).setDepth(27),
            this.scene.add.rectangle(-14, -1, 10, 4, 0x5b351f, 1).setDepth(26),
        ];
    }

    private updateView(unit: ControllableUnitState) {
        const view = this.views.get(unit.id);
        if (!view) return;

        view.body.setPosition(unit.position.x, unit.position.y);
        view.label.setText(unit.templateId === 'farmer' ? 'FARMER' : 'DOG');
        view.selectionRing.setVisible(unit.selected);
        view.body.setAlpha(unit.hp > 0 ? 1 : 0.35);
        view.hpBack.setVisible(unit.hp > 0);
        view.hpFill.setVisible(unit.hp > 0);
        view.hpFill.width =
            (unit.templateId === 'farmer' ? 38 : 34) * (unit.hp / unit.maxHp);
    }

    private findMovePath(from: Point, to: Point) {
        if (!this.canUnitOccupyPoint(to)) return null;

        const bounds = this.getMovePathBounds(from, to);
        const terrainBlockedRects =
            this.terrainBlocker?.getGroundBlockedRects(bounds) ?? [];
        const dynamicBlockedRects = this.getDynamicBlockedRectsInBounds(bounds);

        const startedAt = performance.now();
        const path = findGridPath({
            blockedRects: [...terrainBlockedRects, ...dynamicBlockedRects],
            bounds,
            cellSize: 32,
            clearancePx: 8,
            goal: to,
            maxIterations: 70000,
            pathSmoothingEnabled: true,
            start: from,
        });
        this.recordPerformance?.(
            'path.player.findGridPath',
            performance.now() - startedAt,
        );

        return path;
    }

    private getMovePathBounds(from: Point, to: Point): GridPathRect {
        const minX = Math.max(
            0,
            Math.min(from.x, to.x) - PLAYER_PATH_BOUNDS_PADDING_PX,
        );
        const minY = Math.max(
            0,
            Math.min(from.y, to.y) - PLAYER_PATH_BOUNDS_PADDING_PX,
        );
        const maxX = Math.min(
            this.worldSize.x,
            Math.max(from.x, to.x) + PLAYER_PATH_BOUNDS_PADDING_PX,
        );
        const maxY = Math.min(
            this.worldSize.y,
            Math.max(from.y, to.y) + PLAYER_PATH_BOUNDS_PADDING_PX,
        );

        return {
            height: Math.max(32, maxY - minY),
            width: Math.max(32, maxX - minX),
            x: minX,
            y: minY,
        };
    }

    private getDynamicBlockedRectsInBounds(bounds: GridPathRect) {
        return (this.getDynamicBlockedRects?.() ?? []).filter((rect) => {
            return (
                rect.x < bounds.x + bounds.width &&
                rect.x + rect.width > bounds.x &&
                rect.y < bounds.y + bounds.height &&
                rect.y + rect.height > bounds.y
            );
        });
    }

    private updateMoveCommand(unit: ControllableUnitState, deltaSec: number) {
        const waypoint = unit.path[unit.pathIndex];

        if (!waypoint) {
            unit.currentCommand = undefined;
            return;
        }

        const distance = Phaser.Math.Distance.Between(
            unit.position.x,
            unit.position.y,
            waypoint.x,
            waypoint.y,
        );
        const step = unit.speedPxPerSec * deltaSec;

        if (distance <= Math.max(1, step)) {
            unit.position = { x: waypoint.x, y: waypoint.y };
            unit.pathIndex += 1;
            if (unit.pathIndex >= unit.path.length) {
                unit.currentCommand = undefined;
                unit.path = [];
                unit.pathIndex = 0;
            }
            this.updateView(unit);
            return;
        }

        const direction = new Phaser.Math.Vector2(
            waypoint.x - unit.position.x,
            waypoint.y - unit.position.y,
        )
            .normalize()
            .scale(step);
        unit.position = {
            x: unit.position.x + direction.x,
            y: unit.position.y + direction.y,
        };
        this.updateView(unit);
    }

    private updateAttackCommand(unit: ControllableUnitState, deltaSec: number) {
        if (unit.currentCommand?.type !== 'attack') return;

        const target = this.getAttackableEnemyTarget(unit.currentCommand.targetEntityId);
        if (!target || target.hp <= 0) {
            unit.currentCommand = undefined;
            unit.path = [];
            unit.pathIndex = 0;
            this.updateView(unit);
            return;
        }

        const stats = CHICKEN_FARM_BALANCE.defenders[unit.templateId];
        const attackRange = stats.attackRangePx ?? 85;
        const distance = Phaser.Math.Distance.Between(
            unit.position.x,
            unit.position.y,
            target.x,
            target.y,
        );

        if (distance > attackRange + target.radius) {
            this.moveUnitToward(unit, target, deltaSec);
            return;
        }

        if (this.getElapsedSec() < unit.nextAttackAtSec) return;

        this.damageEnemyTarget?.(target.id, stats.damage);
        unit.nextAttackAtSec = this.getElapsedSec() + stats.attackCooldownSec;
    }

    private moveUnitToward(
        unit: ControllableUnitState,
        target: AttackableEnemyTarget,
        deltaSec: number,
    ) {
        const direction = new Phaser.Math.Vector2(
            target.x - unit.position.x,
            target.y - unit.position.y,
        );
        if (direction.lengthSq() <= 1) return;

        direction.normalize().scale(unit.speedPxPerSec * deltaSec);
        const nextPosition = {
            x: unit.position.x + direction.x,
            y: unit.position.y + direction.y,
        };
        if (!this.canUnitOccupyPoint(nextPosition)) return;

        unit.position = nextPosition;
        this.updateView(unit);
    }

    private getMoveTargetPointForUnit(
        targetPoint: Point,
        unitIndex: number,
        unitCount: number,
    ): Point {
        if (unitCount <= 1) return targetPoint;

        return getOffsetTargetPoint({
            canOccupy: (point) => this.canUnitOccupyPoint(point),
            offsetPx: MULTI_UNIT_DESTINATION_OFFSET_PX,
            targetPoint,
            unitCount,
            unitIndex,
            worldSize: this.worldSize,
        });
    }

    private resolveUnitPush() {
        const liveUnits = this.units.filter((unit) => unit.hp > 0);
        if (liveUnits.length < 2) return;

        for (let i = 0; i < liveUnits.length; i += 1) {
            for (let j = i + 1; j < liveUnits.length; j += 1) {
                this.pushUnitsApart(liveUnits[i], liveUnits[j], i, j);
            }
        }
    }

    private pushUnitsApart(
        unitA: ControllableUnitState,
        unitB: ControllableUnitState,
        fallbackIndexA: number,
        fallbackIndexB: number,
    ) {
        const radiusA = COLLISION_RADIUS_BY_TEMPLATE[unitA.templateId];
        const radiusB = COLLISION_RADIUS_BY_TEMPLATE[unitB.templateId];
        const minDistance = (radiusA + radiusB) * UNIT_PUSH_DISTANCE_SCALE;
        const delta = new Phaser.Math.Vector2(
            unitB.position.x - unitA.position.x,
            unitB.position.y - unitA.position.y,
        );
        const distance = delta.length();
        if (distance >= minDistance) return;

        if (distance <= 0.001) {
            const fallbackAngle =
                ((fallbackIndexA + fallbackIndexB + 1) * Math.PI) / 3;
            delta.set(Math.cos(fallbackAngle), Math.sin(fallbackAngle));
        } else {
            delta.scale(1 / distance);
        }

        const overlap = minDistance - Math.max(distance, 0);
        const pushDistance = Math.min(overlap / 2, UNIT_PUSH_MAX_STEP_PX);
        const pushX = delta.x * pushDistance;
        const pushY = delta.y * pushDistance;

        const nextA = {
            x: Phaser.Math.Clamp(unitA.position.x - pushX, 0, this.worldSize.x),
            y: Phaser.Math.Clamp(unitA.position.y - pushY, 0, this.worldSize.y),
        };
        const nextB = {
            x: Phaser.Math.Clamp(unitB.position.x + pushX, 0, this.worldSize.x),
            y: Phaser.Math.Clamp(unitB.position.y + pushY, 0, this.worldSize.y),
        };
        const canMoveA = this.canUnitOccupyPoint(nextA);
        const canMoveB = this.canUnitOccupyPoint(nextB);

        if (canMoveA) {
            unitA.position = nextA;
            this.updateView(unitA);
        }
        if (canMoveB) {
            unitB.position = nextB;
            this.updateView(unitB);
        }
    }

    private canUnitOccupyPoint(point: Point) {
        return canOccupyPoint(point, {
            clearancePx: DEFAULT_UNIT_BLOCKER_CLEARANCE_PX,
            dynamicBlockedRects: this.getDynamicBlockedRects?.() ?? [],
            terrainBlocker: this.terrainBlocker,
            worldSize: this.worldSize,
        });
    }

    private drawMoveMarker(targetPoint: Point, valid: boolean) {
        const marker = this.scene.add
            .circle(targetPoint.x, targetPoint.y, 10, valid ? 0x42f58d : 0xe45555, 0.7)
            .setStrokeStyle(2, valid ? 0xe9ffe8 : 0xffd2d2, 0.95)
            .setDepth(32);
        this.worldObjects.push(marker);
        this.scene.tweens.add({
            alpha: 0,
            duration: 520,
            onComplete: () => marker.destroy(),
            scale: 1.8,
            targets: marker,
        });
    }

    private findUnitAt(worldX: number, worldY: number) {
        return (
            [...this.units]
                .reverse()
                .find(
                    (unit) =>
                        Phaser.Math.Distance.Between(
                            worldX,
                            worldY,
                            unit.position.x,
                            unit.position.y,
                        ) <= SELECTION_RADIUS_BY_TEMPLATE[unit.templateId],
                ) ?? null
        );
    }
}
