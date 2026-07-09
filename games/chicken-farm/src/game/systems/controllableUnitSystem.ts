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
    CommandQueueMode,
    ControllableUnitCombatTarget,
    ControllableUnitState,
    ControllableUnitTemplateId,
    Point,
    UnitCommand,
} from './playerCommandTypes';
import type { TerrainBlocker } from './terrainBlocker';

type ControllableUnitSystemConfig = {
    readonly damageEnemyTarget?: (targetId: string, damage: number) => boolean;
    readonly getAttackableEnemyTarget?: (targetId: string) => AttackableEnemyTarget | null;
    readonly getAttackableEnemyTargets?: () => readonly AttackableEnemyTarget[];
    readonly getDynamicBlockedRects?: () => readonly GridPathRect[];
    readonly getElapsedSec: () => number;
    readonly onBuildCommandInterrupted?: (
        unitId: string,
        siteId: string,
        reason: string,
    ) => void;
    readonly onPendingBuildOrdersInterrupted?: (
        unitId: string,
        reason: string,
    ) => void;
    readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
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
    readonly manaBack: Phaser.GameObjects.Rectangle;
    readonly manaFill: Phaser.GameObjects.Rectangle;
    readonly selectionRing: Phaser.GameObjects.Ellipse;
};

export type ExternalUnitCollisionBody = {
    readonly id: string;
    position: Point;
    readonly radius: number;
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
    dog: new Phaser.Math.Vector2(42, 18),
    farmer: new Phaser.Math.Vector2(0, 0),
};
const UNIT_HP_BAR_WIDTH_BY_TEMPLATE: Record<ControllableUnitTemplateId, number> = {
    dog: 48,
    farmer: 56,
};
const UNIT_HP_BAR_HEIGHT_PX = 9;
const UNIT_HP_BAR_BORDER_PX = 2;
const UNIT_HP_FILL_HEIGHT_PX = UNIT_HP_BAR_HEIGHT_PX - UNIT_HP_BAR_BORDER_PX * 2;
const UNIT_SELECTION_STROKE_PX = 4;
const UNIT_ATTACK_MOVE_ACQUIRE_RADIUS_PX = 190;

export class ControllableUnitSystem {
    private readonly damageEnemyTarget?: (targetId: string, damage: number) => boolean;
    private readonly getAttackableEnemyTarget: (
        targetId: string,
    ) => AttackableEnemyTarget | null;
    private readonly getAttackableEnemyTargets: () => readonly AttackableEnemyTarget[];
    private readonly getDynamicBlockedRects?: () => readonly GridPathRect[];
    private readonly getElapsedSec: () => number;
    private readonly onBuildCommandInterrupted?: (
        unitId: string,
        siteId: string,
        reason: string,
    ) => void;
    private readonly onPendingBuildOrdersInterrupted?: (
        unitId: string,
        reason: string,
    ) => void;
    private readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker?: TerrainBlocker;
    private readonly units: ControllableUnitState[] = [];
    private readonly views = new Map<string, UnitView>();
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;

    constructor(config: ControllableUnitSystemConfig) {
        this.damageEnemyTarget = config.damageEnemyTarget;
        this.getAttackableEnemyTarget = config.getAttackableEnemyTarget ?? (() => null);
        this.getAttackableEnemyTargets = config.getAttackableEnemyTargets ?? (() => []);
        this.getDynamicBlockedRects = config.getDynamicBlockedRects;
        this.getElapsedSec = config.getElapsedSec;
        this.onBuildCommandInterrupted = config.onBuildCommandInterrupted;
        this.onPendingBuildOrdersInterrupted =
            config.onPendingBuildOrdersInterrupted;
        this.recordPerformance = config.recordPerformance;
        this.recordTelemetry = config.recordTelemetry;
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

    hasMana(unitId: string, amount: number) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        return Boolean(unit && unit.hp > 0 && unit.mana >= amount);
    }

    spendMana(unitId: string, amount: number) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit || unit.hp <= 0 || unit.mana < amount) return false;

        unit.mana = Math.max(0, unit.mana - amount);
        this.updateView(unit);
        return true;
    }

    resolveExternalUnitPush(externalBodies: readonly ExternalUnitCollisionBody[]) {
        this.units
            .filter((unit) => unit.hp > 0)
            .forEach((unit, unitIndex) => {
                externalBodies.forEach((body, bodyIndex) => {
                    const unitRadius = COLLISION_RADIUS_BY_TEMPLATE[unit.templateId];
                    const minDistance =
                        (unitRadius + body.radius) * UNIT_PUSH_DISTANCE_SCALE;
                    const delta = new Phaser.Math.Vector2(
                        body.position.x - unit.position.x,
                        body.position.y - unit.position.y,
                    );
                    const distance = delta.length();
                    if (distance >= minDistance) return;

                    if (distance <= 0.001) {
                        const angle = ((unitIndex + bodyIndex + 1) * Math.PI) / 3;
                        delta.set(Math.cos(angle), Math.sin(angle));
                    } else {
                        delta.scale(1 / distance);
                    }

                    const overlap = minDistance - Math.max(0, distance);
                    const pushDistance = Math.min(
                        overlap / 2,
                        UNIT_PUSH_MAX_STEP_PX,
                    );
                    const unitNext = {
                        x: Phaser.Math.Clamp(
                            unit.position.x - delta.x * pushDistance,
                            0,
                            this.worldSize.x,
                        ),
                        y: Phaser.Math.Clamp(
                            unit.position.y - delta.y * pushDistance,
                            0,
                            this.worldSize.y,
                        ),
                    };
                    const bodyNext = {
                        x: Phaser.Math.Clamp(
                            body.position.x + delta.x * pushDistance,
                            0,
                            this.worldSize.x,
                        ),
                        y: Phaser.Math.Clamp(
                            body.position.y + delta.y * pushDistance,
                            0,
                            this.worldSize.y,
                        ),
                    };

                    if (this.canUnitOccupyPoint(unitNext)) {
                        unit.position = unitNext;
                        this.updateView(unit);
                    }
                    if (this.canUnitOccupyPoint(bodyNext)) {
                        body.position.x = bodyNext.x;
                        body.position.y = bodyNext.y;
                    }
                });
            });
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

    getSelectedCommandQueueCount() {
        return this.getSelectedUnits().reduce(
            (count, unit) => count + unit.commandQueue.length,
            0,
        );
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

    damageUnit(unitId: string, damage: number, attackerTargetId?: string) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit || unit.hp <= 0) return false;

        unit.hp = Math.max(0, unit.hp - Math.max(1, damage - unit.armor));
        unit.currentCommand = unit.hp > 0 ? unit.currentCommand : undefined;
        unit.commandQueue = unit.hp > 0 ? unit.commandQueue : [];
        unit.path = unit.hp > 0 ? unit.path : [];
        unit.pathIndex = unit.hp > 0 ? unit.pathIndex : 0;
        if (unit.hp > 0 && attackerTargetId) {
            this.issueRetaliationCommand(unit, attackerTargetId);
        }
        this.updateView(unit);
        return true;
    }

    issueMoveCommandToSelected(
        targetPoint: Point,
        queueMode: CommandQueueMode = 'replace',
    ) {
        const selectedUnits = this.getSelectedUnits();
        return this.issueMoveCommandToUnits(
            selectedUnits.map((unit) => unit.id),
            targetPoint,
            queueMode,
        );
    }

    issueMoveCommandToUnits(
        unitIds: readonly string[],
        targetPoint: Point,
        queueMode: CommandQueueMode = 'replace',
    ) {
        const unitIdSet = new Set(unitIds);
        const targetUnits = this.units.filter((unit) => unitIdSet.has(unit.id));
        if (!targetUnits.length) return { movedUnitCount: 0, pathFoundCount: 0 };

        let pathFoundCount = 0;
        targetUnits.forEach((unit, index) => {
            const unitTargetPoint = this.getMoveTargetPointForUnit(
                targetPoint,
                index,
                targetUnits.length,
            );
            const command: UnitCommand = {
                targetPoint: unitTargetPoint,
                type: 'move',
                unitIds: [unit.id],
            };
            if (this.issueUnitCommand(unit, command, queueMode)) pathFoundCount += 1;
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
        this.pollNextQueuedCommand(unit);
        this.updateView(unit);
        return true;
    }

    issueSmartCommandToSelected(
        targetPoint: Point,
        targetEntityId?: string,
        queueMode: CommandQueueMode = 'replace',
    ) {
        const selectedUnits = this.getSelectedUnits();
        if (!selectedUnits.length) return { action: 'none', affectedUnitCount: 0 };

        if (!targetEntityId) {
            const moveResult = this.issueMoveCommandToSelected(targetPoint, queueMode);
            return {
                action: 'move',
                affectedUnitCount: moveResult.movedUnitCount,
            };
        }

        let affectedUnitCount = 0;
        selectedUnits.forEach((unit) => {
            const command: UnitCommand = {
                targetEntityId,
                targetPoint,
                type: 'attack',
                unitIds: [unit.id],
            };
            if (this.issueUnitCommand(unit, command, queueMode)) affectedUnitCount += 1;
        });

        return { action: 'attack_target', affectedUnitCount };
    }

    issueAttackCommandToSelected(
        targetPoint: Point,
        targetEntityId?: string,
        queueMode: CommandQueueMode = 'replace',
    ) {
        const selectedUnits = this.getSelectedUnits();
        if (!selectedUnits.length) return { action: 'none', affectedUnitCount: 0 };

        let affectedUnitCount = 0;
        selectedUnits.forEach((unit) => {
            const command: UnitCommand = targetEntityId
                ? {
                      targetEntityId,
                      targetPoint,
                      type: 'attack',
                      unitIds: [unit.id],
                  }
                : {
                      targetPoint,
                      type: 'attack_move',
                      unitIds: [unit.id],
                  };
            if (this.issueUnitCommand(unit, command, queueMode)) affectedUnitCount += 1;
        });
        this.drawAttackMarker(targetPoint, Boolean(targetEntityId));

        return {
            action: targetEntityId ? 'attack_target' : 'attack_move',
            affectedUnitCount,
        };
    }

    stopSelectedUnits() {
        const selectedUnits = this.getSelectedUnits();
        selectedUnits.forEach((unit) => {
            this.interruptBuildCommand(unit, 'stop');
            this.interruptPendingBuildOrders(unit, 'stop');
            unit.commandQueue = [];
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

    clearUnitCommand(unitId: string) {
        const unit = this.units.find((candidate) => candidate.id === unitId);
        if (!unit) return false;

        unit.currentCommand = undefined;
        unit.path = [];
        unit.pathIndex = 0;
        this.updateView(unit);
        return true;
    }

    update(deltaSec: number) {
        const movementDeltaSec = Math.min(
            deltaSec,
            MAX_CONTROLLABLE_UNIT_MOVEMENT_DELTA_SEC,
        );
        this.units.forEach((unit) => {
            if (unit.hp > 0 && unit.mana < unit.maxMana) {
                unit.mana = Math.min(
                    unit.maxMana,
                    unit.mana + unit.manaRegenPerSec * deltaSec,
                );
                this.updateView(unit);
            }
            if (unit.currentCommand?.type === 'move') {
                this.updateMoveCommand(unit, movementDeltaSec);
                return;
            }

            if (unit.currentCommand?.type === 'attack') {
                this.updateAttackCommand(unit, movementDeltaSec);
                return;
            }

            if (unit.currentCommand?.type === 'attack_move') {
                this.updateAttackMoveCommand(unit, movementDeltaSec);
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
            existing.commandQueue = [];
            existing.hp = existing.maxHp;
            existing.mana = existing.maxMana;
            existing.path = [];
            existing.pathIndex = 0;
            this.updateView(existing);
            return;
        }

        const stats = CHICKEN_FARM_BALANCE.defenders[templateId];
        const state: ControllableUnitState = {
            armor: stats.armor,
            hp: stats.hp,
            id,
            mana: stats.mana ?? 0,
            manaRegenPerSec: stats.manaRegenPerSec ?? 0,
            maxHp: stats.hp,
            maxMana: stats.mana ?? 0,
            nextAttackAtSec: 0,
            ownerPlayerId,
            path: [],
            pathIndex: 0,
            position,
            selected: false,
            speedPxPerSec: stats.speedPxPerSec,
            templateId,
            commandQueue: [],
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
                isFarmer ? 56 : 48,
                isFarmer ? 27 : 22,
            )
            .setStrokeStyle(UNIT_SELECTION_STROKE_PX, 0x36d95e, 0.94)
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
                backgroundColor: 'rgba(12, 13, 10, 0.82)',
                color: isFarmer ? '#f7e89a' : '#cfe8ff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setDepth(28)
            .setOrigin(0.5);
        const hpBack = this.scene.add
            .rectangle(
                0,
                isFarmer ? -26 : -22,
                UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId],
                UNIT_HP_BAR_HEIGHT_PX,
                0x030303,
                0.98,
            )
            .setStrokeStyle(UNIT_HP_BAR_BORDER_PX, 0x030303, 1)
            .setDepth(28);
        const hpFill = this.scene.add
            .rectangle(
                -UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] / 2 + UNIT_HP_BAR_BORDER_PX,
                isFarmer ? -26 : -22,
                UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] - UNIT_HP_BAR_BORDER_PX * 2,
                UNIT_HP_FILL_HEIGHT_PX,
                0x44d35f,
                1,
            )
            .setDepth(29)
            .setOrigin(0, 0.5);
        const manaY = isFarmer ? -35 : -31;
        const manaBack = this.scene.add
            .rectangle(
                0,
                manaY,
                UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId],
                UNIT_HP_BAR_HEIGHT_PX,
                0x061020,
                0.98,
            )
            .setStrokeStyle(UNIT_HP_BAR_BORDER_PX, 0x030303, 1)
            .setDepth(28);
        const manaFill = this.scene.add
            .rectangle(
                -UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] / 2 +
                    UNIT_HP_BAR_BORDER_PX,
                manaY,
                UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] -
                    UNIT_HP_BAR_BORDER_PX * 2,
                UNIT_HP_FILL_HEIGHT_PX,
                0x3185e8,
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
            manaBack,
            manaFill,
            label,
        ]);

        container.setDepth(25);
        this.views.set(unit.id, {
            body: container,
            hpBack,
            hpFill,
            label,
            manaBack,
            manaFill,
            selectionRing,
        });
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

        const ringVisible =
            unit.selected ||
            unit.currentCommand?.type === 'build' ||
            unit.commandQueue.length > 0;
        const ringColor = this.getUnitStateColor(unit);
        view.body.setPosition(unit.position.x, unit.position.y);
        view.label.setText(this.getUnitDisplayLabel(unit));
        view.selectionRing
            .setVisible(ringVisible)
            .setStrokeStyle(
                unit.currentCommand?.type === 'build' ? 5 : UNIT_SELECTION_STROKE_PX,
                ringColor,
                unit.selected ? 1 : 0.82,
            );
        view.body.setAlpha(unit.hp > 0 ? 1 : 0.35);
        view.hpBack.setVisible(unit.hp > 0);
        view.hpFill.setVisible(unit.hp > 0);
        const hpRatio = Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
        view.hpFill.width =
            (UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] -
                UNIT_HP_BAR_BORDER_PX * 2) *
            hpRatio;
        view.hpFill.setFillStyle(this.getHpBarColor(hpRatio), 1);
        const manaRatio =
            unit.maxMana > 0 ? Phaser.Math.Clamp(unit.mana / unit.maxMana, 0, 1) : 0;
        view.manaBack.setVisible(unit.hp > 0 && unit.maxMana > 0);
        view.manaFill.setVisible(unit.hp > 0 && unit.maxMana > 0);
        view.manaFill.width =
            (UNIT_HP_BAR_WIDTH_BY_TEMPLATE[unit.templateId] -
                UNIT_HP_BAR_BORDER_PX * 2) *
            manaRatio;
    }

    private getUnitDisplayLabel(unit: ControllableUnitState) {
        if (unit.currentCommand?.type === 'build') return 'BUILD';
        if (unit.currentCommand?.type === 'attack') return 'ATTACK';
        if (unit.currentCommand?.type === 'attack_move') return 'A-MOVE';
        if (unit.commandQueue.length > 0) return `QUEUE ${unit.commandQueue.length}`;
        if (unit.currentCommand?.type === 'move') return 'MOVE';
        return unit.templateId === 'farmer' ? 'FARMER' : 'DOG';
    }

    private getUnitStateColor(unit: ControllableUnitState) {
        if (unit.currentCommand?.type === 'build') return 0xf1c65c;
        if (unit.commandQueue.length > 0) return 0xffefaa;
        if (
            unit.currentCommand?.type === 'attack' ||
            unit.currentCommand?.type === 'attack_move'
        ) {
            return 0xff7a62;
        }
        return 0x36d95e;
    }

    private getHpBarColor(hpRatio: number) {
        if (hpRatio > 0.55) return 0x55d76d;
        if (hpRatio > 0.28) return 0xf2c94c;
        return 0xe85d4f;
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
            this.pollNextQueuedCommand(unit);
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
                this.pollNextQueuedCommand(unit);
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
            this.pollNextQueuedCommand(unit);
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

    private updateAttackMoveCommand(unit: ControllableUnitState, deltaSec: number) {
        if (unit.currentCommand?.type !== 'attack_move') return;

        const target = this.findAttackMoveTarget(unit);
        if (target) {
            unit.currentCommand = {
                targetEntityId: target.id,
                targetPoint: { x: target.x, y: target.y },
                type: 'attack',
                unitIds: [unit.id],
            };
            unit.path = [];
            unit.pathIndex = 0;
            this.updateView(unit);
            return;
        }

        this.updateMoveCommand(unit, deltaSec);
    }

    private findAttackMoveTarget(unit: ControllableUnitState) {
        const stats = CHICKEN_FARM_BALANCE.defenders[unit.templateId];
        const acquireRadius = Math.max(
            UNIT_ATTACK_MOVE_ACQUIRE_RADIUS_PX,
            (stats.attackRangePx ?? 85) * 2,
        );

        return (
            this.getAttackableEnemyTargets()
                .filter((target) => target.hp > 0)
                .map((target) => ({
                    distance: Phaser.Math.Distance.Between(
                        unit.position.x,
                        unit.position.y,
                        target.x,
                        target.y,
                    ),
                    target,
                }))
                .filter((candidate) => candidate.distance <= acquireRadius)
                .sort((a, b) => a.distance - b.distance)[0]?.target ?? null
        );
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

    private issueUnitCommand(
        unit: ControllableUnitState,
        command: UnitCommand,
        queueMode: CommandQueueMode,
    ) {
        if (queueMode === 'append') {
            unit.commandQueue.push(command);
            this.recordQueuedCommand(unit, command);
            if (!unit.currentCommand) return this.pollNextQueuedCommand(unit);

            this.updateView(unit);
            return true;
        }

        unit.commandQueue = [];
        return this.startUnitCommand(unit, command, 'replace');
    }

    private pollNextQueuedCommand(unit: ControllableUnitState) {
        const command = unit.commandQueue.shift();
        if (!command) {
            this.updateView(unit);
            return false;
        }

        return this.startUnitCommand(unit, command, 'queued');
    }

    private startUnitCommand(
        unit: ControllableUnitState,
        command: UnitCommand,
        source: 'queued' | 'replace',
    ) {
        if (command.type === 'move' || command.type === 'attack_move') {
            const path = this.findMovePath(unit.position, command.targetPoint);
            if (source === 'replace') {
                this.interruptBuildCommand(
                    unit,
                    command.type === 'attack_move' ? 'attack' : 'move',
                );
                this.interruptPendingBuildOrders(
                    unit,
                    command.type === 'attack_move' ? 'attack' : 'move',
                );
            }
            unit.currentCommand = command;
            unit.path = path ?? [];
            unit.pathIndex = 0;
            this.updateView(unit);
            return Boolean(path?.length);
        }

        if (command.type === 'attack') {
            if (source === 'replace') {
                this.interruptBuildCommand(unit, 'attack');
                this.interruptPendingBuildOrders(unit, 'attack');
            }
            unit.currentCommand = command;
            unit.path = [];
            unit.pathIndex = 0;
            this.updateView(unit);
            return true;
        }

        unit.currentCommand = command;
        unit.path = [];
        unit.pathIndex = 0;
        this.updateView(unit);
        return true;
    }

    private recordQueuedCommand(unit: ControllableUnitState, command: UnitCommand) {
        if (
            command.type !== 'move' &&
            command.type !== 'attack' &&
            command.type !== 'attack_move'
        ) {
            return;
        }

        const targetPoint = command.targetPoint;
        const marker = this.scene.add
            .circle(targetPoint.x, targetPoint.y, 11, 0xf1c65c, 0.5)
            .setStrokeStyle(3, 0xfff0aa, 0.98)
            .setDepth(31);
        const label = this.scene.add
            .text(targetPoint.x, targetPoint.y - 17, String(unit.commandQueue.length), {
                align: 'center',
                color: '#fff0aa',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '11px',
                fontStyle: '700',
            })
            .setDepth(32)
            .setOrigin(0.5);
        this.worldObjects.push(marker, label);
        this.scene.tweens.add({
            alpha: 0.18,
            duration: 1100,
            onComplete: () => {
                marker.destroy();
                label.destroy();
            },
            yoyo: true,
            repeat: 2,
            targets: [marker, label],
        });
    }

    private interruptBuildCommand(unit: ControllableUnitState, reason: string) {
        if (unit.currentCommand?.type !== 'build') return;

        this.onBuildCommandInterrupted?.(
            unit.id,
            unit.currentCommand.siteId,
            reason,
        );
    }

    private interruptPendingBuildOrders(
        unit: ControllableUnitState,
        reason: string,
    ) {
        if (unit.currentCommand?.type === 'build') return;

        this.onPendingBuildOrdersInterrupted?.(unit.id, reason);
    }

    private issueRetaliationCommand(
        unit: ControllableUnitState,
        attackerTargetId: string,
    ) {
        if (
            unit.currentCommand &&
            unit.currentCommand.type !== 'stop'
        ) {
            return;
        }

        const attacker = this.getAttackableEnemyTarget(attackerTargetId);
        if (!attacker || attacker.hp <= 0) return;

        unit.currentCommand = {
            targetEntityId: attacker.id,
            targetPoint: { x: attacker.x, y: attacker.y },
            type: 'attack',
            unitIds: [unit.id],
        };
        unit.path = [];
        unit.pathIndex = 0;
        this.recordTelemetry?.('unit_retaliation_order_issued', {
            attackerId: attacker.id,
            unitId: unit.id,
            unitType: unit.templateId,
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
            .circle(targetPoint.x, targetPoint.y, 14, valid ? 0x42f58d : 0xe45555, 0.62)
            .setStrokeStyle(3, valid ? 0xe9ffe8 : 0xffd2d2, 0.95)
            .setDepth(32);
        this.worldObjects.push(marker);
        this.scene.tweens.add({
            alpha: 0,
            duration: 680,
            onComplete: () => marker.destroy(),
            scale: 1.8,
            targets: marker,
        });
    }

    private drawAttackMarker(targetPoint: Point, explicitTarget: boolean) {
        const marker = this.scene.add
            .circle(targetPoint.x, targetPoint.y, explicitTarget ? 15 : 13, 0xff6f4d, 0.58)
            .setStrokeStyle(3, 0xffddc9, 0.96)
            .setDepth(32);
        const cross = this.scene.add.graphics().setDepth(33);
        cross.lineStyle(3, 0xffddc9, 0.9);
        cross.lineBetween(targetPoint.x - 9, targetPoint.y, targetPoint.x + 9, targetPoint.y);
        cross.lineBetween(targetPoint.x, targetPoint.y - 9, targetPoint.x, targetPoint.y + 9);
        this.worldObjects.push(marker, cross);
        this.scene.tweens.add({
            alpha: 0,
            duration: 720,
            onComplete: () => {
                marker.destroy();
                cross.destroy();
            },
            scale: explicitTarget ? 1.7 : 1.45,
            targets: [marker, cross],
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
