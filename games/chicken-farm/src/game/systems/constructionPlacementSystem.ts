import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { MvpBuildingId } from '../balanceTypes';
import type {
    ControllableUnitState,
    ControllableUnitTemplateId,
    CommandQueueMode,
} from './playerCommandTypes';
import type { TerrainBlocker } from './terrainBlocker';
import {
    BuildingSystem,
    getBuildingFootprint,
    snapBuildingTopLeft,
} from './buildingSystem';
import type { GridPathRect } from './pathing';

type PlacementValidation =
    | {
          readonly valid: true;
      }
    | {
          readonly reason: string;
          readonly valid: false;
      };

type PlacementValidationOptions = {
    readonly ignoreBuilderSelection?: boolean;
    readonly ignoreCost?: boolean;
};

type BuildStartValidation = PlacementValidation;

type ConstructionPlacementSystemConfig = {
    readonly buildingSystem: BuildingSystem;
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly clearBuilderBuildCommand: (unitId: string, siteId: string) => boolean;
    readonly getSelectedUnits: () => readonly ControllableUnitState[];
    readonly getUnits: () => readonly ControllableUnitState[];
    readonly issueBuilderMove: (
        unitId: string,
        targetPoint: { readonly x: number; readonly y: number },
        queueMode?: CommandQueueMode,
    ) => boolean;
    readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    readonly scene: Phaser.Scene;
    readonly setBuilderBuildCommand: (
        unitId: string,
        siteId: string,
        targetPoint: { readonly x: number; readonly y: number },
    ) => boolean;
    readonly terrainBlocker?: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldSize: Phaser.Math.Vector2;
};

const BUILDER_TEMPLATE_IDS: readonly ControllableUnitTemplateId[] = ['farmer'];
const BUILDER_START_DISTANCE_PX = 40;
const BUILD_TARGET_MARGIN_PX = 30;
const GHOST_HATCH_SPACING_PX = 22;
const GHOST_CORNER_TICK_PX = 22;

type PendingBuildOrder = {
    readonly builderUnitId: string;
    readonly footprint: GridPathRect;
    readonly id: string;
    runtimeBuildingId?: string;
    targetPoint: { readonly x: number; readonly y: number };
    readonly templateId: MvpBuildingId;
};

export class ConstructionPlacementSystem {
    private readonly buildingSystem: BuildingSystem;
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly clearBuilderBuildCommand: (unitId: string, siteId: string) => boolean;
    private readonly getSelectedUnits: () => readonly ControllableUnitState[];
    private readonly getUnits: () => readonly ControllableUnitState[];
    private readonly ghost: Phaser.GameObjects.Graphics;
    private readonly issueBuilderMove: (
        unitId: string,
        targetPoint: { readonly x: number; readonly y: number },
        queueMode?: CommandQueueMode,
    ) => boolean;
    private readonly pendingGraphics: Phaser.GameObjects.Graphics;
    private readonly pendingOrders: PendingBuildOrder[] = [];
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private readonly scene: Phaser.Scene;
    private readonly setBuilderBuildCommand: (
        unitId: string,
        siteId: string,
        targetPoint: { readonly x: number; readonly y: number },
    ) => boolean;
    private readonly terrainBlocker?: TerrainBlocker;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;
    private activeBuildingId?: MvpBuildingId;
    private currentFootprint?: GridPathRect;
    private currentValidation: PlacementValidation = { reason: 'inactive', valid: false };
    private nextPendingBuildOrderId = 1;

    constructor(config: ConstructionPlacementSystemConfig) {
        this.buildingSystem = config.buildingSystem;
        this.camera = config.camera;
        this.clearBuilderBuildCommand = config.clearBuilderBuildCommand;
        this.getSelectedUnits = config.getSelectedUnits;
        this.getUnits = config.getUnits;
        this.issueBuilderMove = config.issueBuilderMove;
        this.recordTelemetry = config.recordTelemetry;
        this.scene = config.scene;
        this.setBuilderBuildCommand = config.setBuilderBuildCommand;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.worldSize = config.worldSize;
        this.ghost = config.scene.add.graphics().setDepth(48).setVisible(false);
        this.pendingGraphics = config.scene.add.graphics().setDepth(47);
        config.worldObjects.push(this.ghost, this.pendingGraphics);
    }

    getActiveBuildingId() {
        return this.activeBuildingId ?? null;
    }

    cancelConstruction(buildingId: string, reason = 'cancelled') {
        const orderIndex = this.pendingOrders.findIndex(
            (order) => order.runtimeBuildingId === buildingId,
        );
        const order = orderIndex >= 0 ? this.pendingOrders[orderIndex] : null;
        const result = this.buildingSystem.cancelConstruction(buildingId, reason);
        if (!result) return false;

        if (order) {
            this.clearBuilderBuildCommand(order.builderUnitId, buildingId);
            this.pendingOrders.splice(orderIndex, 1);
        }
        return true;
    }

    cancelPendingBuildOrdersForBuilder(builderUnitId: string, reason = 'interrupted') {
        const cancelledSiteIds: string[] = [];
        for (let index = this.pendingOrders.length - 1; index >= 0; index -= 1) {
            const order = this.pendingOrders[index];
            if (order.builderUnitId !== builderUnitId || order.runtimeBuildingId) {
                continue;
            }

            cancelledSiteIds.push(order.id);
            this.pendingOrders.splice(index, 1);
        }

        if (!cancelledSiteIds.length) return 0;

        this.recordTelemetry?.('pending_build_orders_cancelled', {
            builderUnitId,
            count: cancelledSiteIds.length,
            reason,
            siteIds: cancelledSiteIds.reverse(),
        });
        this.drawPendingOrders();
        this.issueMoveToNextBuilderOrder(builderUnitId);
        return cancelledSiteIds.length;
    }

    resumeConstructionWithBuilder(
        buildingId: string,
        builderUnitId: string,
        queueMode: CommandQueueMode = 'replace',
    ) {
        const building = this.buildingSystem.getBuilding(buildingId);
        const builder = this.getUnitById(builderUnitId);
        if (!building || !builder || building.state !== 'constructing') return false;

        let order = this.pendingOrders.find(
            (candidate) => candidate.runtimeBuildingId === buildingId,
        );
        const targetPoint = this.getBuildTargetPoints(building.footprint, builder).find(
            (candidate) => this.issueBuilderMove(builder.id, candidate, queueMode),
        );
        if (!targetPoint) return false;

        if (!order) {
            order = {
                builderUnitId: builder.id,
                footprint: building.footprint,
                id: `pending-build-${this.nextPendingBuildOrderId}`,
                runtimeBuildingId: building.id,
                targetPoint,
                templateId: building.templateId,
            };
            this.nextPendingBuildOrderId += 1;
            this.pendingOrders.push(order);
        } else {
            order.targetPoint = targetPoint;
        }

        this.recordTelemetry?.('building_resume_order_issued', {
            buildingId,
            builderUnitId,
            targetX: Number(targetPoint.x.toFixed(1)),
            targetY: Number(targetPoint.y.toFixed(1)),
        });
        this.showFootprintPulse(building.footprint, 0xffd45f);
        return true;
    }

    isActive() {
        return Boolean(this.activeBuildingId);
    }

    /** Shared by charged item targeting: same snap and world/pathing checks,
     * without requiring the normal builder selection or resource payment. */
    getItemPlacementPreview(buildingId: MvpBuildingId, worldX: number, worldY: number) {
        const snapped = snapBuildingTopLeft(buildingId, worldX, worldY);
        const footprint = getBuildingFootprint(buildingId, snapped.x, snapped.y);
        return {
            footprint,
            valid: this.validateFootprint(footprint, buildingId, {
                ignoreBuilderSelection: true,
                ignoreCost: true,
            }),
        };
    }

    startPlacement(buildingId: MvpBuildingId) {
        this.activeBuildingId = buildingId;
        this.ghost.setVisible(true);
        this.recordTelemetry?.('build_placement_started', { buildingId });
        this.updateGhost();
    }

    cancelPlacement(reason = 'cancelled') {
        if (!this.activeBuildingId) return false;

        this.recordTelemetry?.('build_placement_cancelled', {
            buildingId: this.activeBuildingId,
            reason,
        });
        this.activeBuildingId = undefined;
        this.currentFootprint = undefined;
        this.currentValidation = { reason: 'inactive', valid: false };
        this.ghost.clear().setVisible(false);
        return true;
    }

    update() {
        this.updatePendingOrders();
        this.drawPendingOrders();
        if (this.activeBuildingId) this.updateGhost();
    }

    handlePrimaryClick(
        worldX: number,
        worldY: number,
        options: { readonly keepPlacementActive?: boolean } = {},
    ) {
        if (!this.activeBuildingId) return false;

        this.updateGhost(worldX, worldY);
        if (!this.currentFootprint || !this.activeBuildingId) return true;

        if (!this.currentValidation.valid) {
            this.recordTelemetry?.('build_placement_rejected', {
                buildingId: this.activeBuildingId,
                reason: this.currentValidation.reason,
                x: Number(this.currentFootprint.x.toFixed(1)),
                y: Number(this.currentFootprint.y.toFixed(1)),
            });
            return true;
        }

        const builder = this.getSelectedBuilder();
        if (!builder) return true;

        const hasExistingBuilderOrder = this.pendingOrders.some(
            (order) => order.builderUnitId === builder.id,
        );
        const targetPoint = this.getBuildTargetPoints(this.currentFootprint, builder).find(
            (candidate) =>
                hasExistingBuilderOrder || this.issueBuilderMove(builder.id, candidate),
        );
        if (!targetPoint) {
            this.recordTelemetry?.('build_placement_rejected', {
                buildingId: this.activeBuildingId,
                reason: 'builder_path_missing',
                x: Number(this.currentFootprint.x.toFixed(1)),
                y: Number(this.currentFootprint.y.toFixed(1)),
            });
            return true;
        }

        const pendingOrder: PendingBuildOrder = {
            builderUnitId: builder.id,
            footprint: this.currentFootprint,
            id: `pending-build-${this.nextPendingBuildOrderId}`,
            targetPoint,
            templateId: this.activeBuildingId,
        };
        this.nextPendingBuildOrderId += 1;
        this.pendingOrders.push(pendingOrder);
        this.recordTelemetry?.('build_order_issued', {
            buildingId: this.activeBuildingId,
            builderUnitId: builder.id,
            siteId: pendingOrder.id,
            queued: hasExistingBuilderOrder,
            targetX: Number(targetPoint.x.toFixed(1)),
            targetY: Number(targetPoint.y.toFixed(1)),
            x: Number(this.currentFootprint.x.toFixed(1)),
            y: Number(this.currentFootprint.y.toFixed(1)),
        });
        this.showFootprintPulse(
            pendingOrder.footprint,
            hasExistingBuilderOrder ? 0xffd45f : 0x63e083,
        );
        if (!options.keepPlacementActive) {
            this.cancelPlacement('placed');
        } else {
            this.recordTelemetry?.('build_order_queued', {
                buildingId: this.activeBuildingId,
                builderUnitId: builder.id,
                siteId: pendingOrder.id,
            });
            this.updateGhost();
        }
        return true;
    }

    private updateGhost(worldX?: number, worldY?: number) {
        if (!this.activeBuildingId) return;

        const pointer = this.scene.input.activePointer;
        const worldPoint =
            worldX === undefined || worldY === undefined
                ? this.camera.getWorldPoint(pointer.x, pointer.y)
                : new Phaser.Math.Vector2(worldX, worldY);
        const snapped = snapBuildingTopLeft(
            this.activeBuildingId,
            worldPoint.x,
            worldPoint.y,
        );
        const footprint = getBuildingFootprint(
            this.activeBuildingId,
            snapped.x,
            snapped.y,
        );
        const validation = this.validateFootprint(footprint, this.activeBuildingId);

        this.currentFootprint = footprint;
        this.currentValidation = validation;
        this.drawGhost(footprint, validation);
    }

    private validateFootprint(
        footprint: GridPathRect,
        buildingId: MvpBuildingId,
        options: PlacementValidationOptions = {},
    ): PlacementValidation {
        const template = CHICKEN_FARM_BALANCE.buildingTemplates[buildingId];
        if (!options.ignoreBuilderSelection && !this.getSelectedBuilder()) {
            return { reason: 'missing_builder_selection', valid: false };
        }
        if (!options.ignoreCost && !this.buildingSystem.canAfford(template)) {
            return { reason: 'insufficient_resources', valid: false };
        }
        if (
            footprint.x < 0 ||
            footprint.y < 0 ||
            footprint.x + footprint.width > this.worldSize.x ||
            footprint.y + footprint.height > this.worldSize.y
        ) {
            return { reason: 'outside_world_bounds', valid: false };
        }
        if (
            this.terrainBlocker &&
            !this.terrainBlocker.canBuild(
                footprint.x,
                footprint.y,
                footprint.width,
                footprint.height,
            )
        ) {
            return { reason: 'terrain_build_blocked', valid: false };
        }
        if (
            this.buildingSystem
                .getAllFootprints()
                .some((existing) => rectsOverlap(existing, footprint))
        ) {
            return { reason: 'building_overlap', valid: false };
        }
        if (
            this.pendingOrders.some((pendingOrder) =>
                rectsOverlap(pendingOrder.footprint, footprint),
            )
        ) {
            return { reason: 'pending_build_overlap', valid: false };
        }

        return { valid: true };
    }

    private updatePendingOrders() {
        for (let index = 0; index < this.pendingOrders.length; index += 1) {
            const order = this.pendingOrders[index];
            const builder = this.getUnitById(order.builderUnitId);
            if (!builder || builder.hp <= 0) {
                this.pendingOrders.splice(index, 1);
                index -= 1;
                continue;
            }
            if (this.hasEarlierBuilderOrder(index, builder.id)) continue;

            if (order.runtimeBuildingId) {
                if (this.buildingSystem.isBuildingComplete(order.runtimeBuildingId)) {
                    this.clearBuilderBuildCommand(builder.id, order.runtimeBuildingId);
                    this.pendingOrders.splice(index, 1);
                    this.issueMoveToNextBuilderOrder(builder.id);
                    index -= 1;
                    continue;
                }

                const active = this.buildingSystem.isConstructionActive(
                    order.runtimeBuildingId,
                    builder.id,
                );
                if (active) continue;
                if (builder.currentCommand && builder.currentCommand.type !== 'build') {
                    continue;
                }

                const distance = Phaser.Math.Distance.Between(
                    builder.position.x,
                    builder.position.y,
                    order.targetPoint.x,
                    order.targetPoint.y,
                );
                if (distance > BUILDER_START_DISTANCE_PX) continue;

                this.buildingSystem.resumeConstruction(
                    order.runtimeBuildingId,
                    builder.id,
                );
                this.setBuilderBuildCommand(
                    builder.id,
                    order.runtimeBuildingId,
                    order.targetPoint,
                );
                continue;
            }

            const distance = Phaser.Math.Distance.Between(
                builder.position.x,
                builder.position.y,
                order.targetPoint.x,
                order.targetPoint.y,
            );
            if (distance > BUILDER_START_DISTANCE_PX) continue;

            const validation = this.validateBuildStart(order);
            if (!validation.valid) {
                this.rejectPendingOrderAtStart(index, order, validation.reason);
                index -= 1;
                continue;
            }

            const building = this.buildingSystem.createBuilding({
                ownerPlayerId: builder.ownerPlayerId,
                templateId: order.templateId,
                workerUnitId: builder.id,
                x: order.footprint.x,
                y: order.footprint.y,
            });
            if (!building) {
                this.rejectPendingOrderAtStart(
                    index,
                    order,
                    'insufficient_resources_at_site',
                );
                index -= 1;
                continue;
            }

            order.runtimeBuildingId = building.id;
            this.setBuilderBuildCommand(builder.id, building.id, order.targetPoint);
        }
    }

    private validateBuildStart(order: PendingBuildOrder): BuildStartValidation {
        const template = CHICKEN_FARM_BALANCE.buildingTemplates[order.templateId];
        if (!this.buildingSystem.canAfford(template)) {
            return { reason: 'insufficient_resources_at_site', valid: false };
        }
        if (
            order.footprint.x < 0 ||
            order.footprint.y < 0 ||
            order.footprint.x + order.footprint.width > this.worldSize.x ||
            order.footprint.y + order.footprint.height > this.worldSize.y
        ) {
            return { reason: 'outside_world_bounds_at_site', valid: false };
        }
        if (
            this.terrainBlocker &&
            !this.terrainBlocker.canBuild(
                order.footprint.x,
                order.footprint.y,
                order.footprint.width,
                order.footprint.height,
            )
        ) {
            return { reason: 'terrain_build_blocked_at_site', valid: false };
        }
        if (
            this.buildingSystem
                .getAllFootprints()
                .some((existing) => rectsOverlap(existing, order.footprint))
        ) {
            return { reason: 'building_overlap_at_site', valid: false };
        }

        return { valid: true };
    }

    private rejectPendingOrderAtStart(
        orderIndex: number,
        order: PendingBuildOrder,
        reason: string,
    ) {
        this.recordTelemetry?.('build_order_start_rejected', {
            buildingId: order.templateId,
            builderUnitId: order.builderUnitId,
            reason,
            siteId: order.id,
            x: Number(order.footprint.x.toFixed(1)),
            y: Number(order.footprint.y.toFixed(1)),
        });
        this.showBuildStartError(order, reason);
        this.pendingOrders.splice(orderIndex, 1);
        this.issueMoveToNextBuilderOrder(order.builderUnitId);
    }

    private hasEarlierBuilderOrder(orderIndex: number, builderUnitId: string) {
        return this.pendingOrders
            .slice(0, orderIndex)
            .some((order) => order.builderUnitId === builderUnitId);
    }

    private issueMoveToNextBuilderOrder(builderUnitId: string) {
        const nextOrder = this.pendingOrders.find(
            (order) => order.builderUnitId === builderUnitId,
        );
        if (!nextOrder) return false;

        return this.issueBuilderMove(builderUnitId, nextOrder.targetPoint);
    }

    private drawPendingOrders() {
        this.pendingGraphics.clear();
        this.pendingOrders.forEach((order, index) => {
            if (order.runtimeBuildingId) return;

            this.pendingGraphics.fillStyle(0xf1c65c, 0.12);
            this.pendingGraphics.fillRect(
                order.footprint.x,
                order.footprint.y,
                order.footprint.width,
                order.footprint.height,
            );
            this.pendingGraphics.lineStyle(4, 0xffda72, 0.86);
            this.pendingGraphics.strokeRect(
                order.footprint.x,
                order.footprint.y,
                order.footprint.width,
                order.footprint.height,
            );
            this.drawCornerTicks(this.pendingGraphics, order.footprint, 0xffefaa);
            this.pendingGraphics.fillStyle(0x231a0c, 0.86);
            this.pendingGraphics.fillCircle(
                order.footprint.x + 18,
                order.footprint.y + 18,
                13,
            );
            this.pendingGraphics.lineStyle(2, 0xffefaa, 0.95);
            this.pendingGraphics.strokeCircle(
                order.footprint.x + 18,
                order.footprint.y + 18,
                13,
            );
            this.pendingGraphics.lineStyle(2, 0xf1c65c, 0.66);
            this.pendingGraphics.lineBetween(
                order.targetPoint.x,
                order.targetPoint.y,
                order.footprint.x + order.footprint.width / 2,
                order.footprint.y + order.footprint.height / 2,
            );
            this.pendingGraphics.fillStyle(0xffefaa, 1);
            this.pendingGraphics.fillCircle(
                order.footprint.x + 18 + (index % 3) * 2,
                order.footprint.y + 18,
                3,
            );
        });
    }

    private showBuildStartError(order: PendingBuildOrder, reason: string) {
        const centerX = order.footprint.x + order.footprint.width / 2;
        const centerY = order.footprint.y + order.footprint.height / 2;
        const marker = this.scene.add
            .rectangle(
                centerX,
                centerY,
                order.footprint.width,
                order.footprint.height,
                0xd0473d,
                0.18,
            )
            .setStrokeStyle(2, 0xffd1c7, 0.9)
            .setDepth(49);
        const label = this.scene.add
            .text(centerX, centerY, this.getBuildStartErrorLabel(reason), {
                align: 'center',
                backgroundColor: 'rgba(33, 16, 13, 0.76)',
                color: '#ffe0d6',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 5, right: 5, top: 2 },
            })
            .setDepth(50)
            .setOrigin(0.5);
        this.scene.tweens.add({
            alpha: 0,
            duration: 900,
            onComplete: () => {
                marker.destroy();
                label.destroy();
            },
            targets: [marker, label],
        });
    }

    private showFootprintPulse(footprint: GridPathRect, color: number) {
        const centerX = footprint.x + footprint.width / 2;
        const centerY = footprint.y + footprint.height / 2;
        const marker = this.scene.add
            .rectangle(centerX, centerY, footprint.width, footprint.height, color, 0.07)
            .setStrokeStyle(5, color, 0.96)
            .setDepth(50);

        this.worldObjects.push(marker);
        this.scene.tweens.add({
            alpha: 0,
            duration: 720,
            onComplete: () => marker.destroy(),
            scaleX: 1.06,
            scaleY: 1.1,
            targets: marker,
        });
    }

    private getBuildStartErrorLabel(reason: string) {
        if (reason.includes('resource')) return 'Not enough resources';
        if (reason.includes('terrain')) return 'Cannot build there';
        if (reason.includes('overlap')) return 'Site blocked';
        if (reason.includes('bounds')) return 'Out of bounds';
        return 'Build failed';
    }

    private getBuildTargetPoints(
        footprint: GridPathRect,
        builder: ControllableUnitState,
    ) {
        const centerX = footprint.x + footprint.width / 2;
        const centerY = footprint.y + footprint.height / 2;
        const candidates = [
            { x: centerX, y: footprint.y + footprint.height + BUILD_TARGET_MARGIN_PX },
            { x: footprint.x - BUILD_TARGET_MARGIN_PX, y: centerY },
            { x: footprint.x + footprint.width + BUILD_TARGET_MARGIN_PX, y: centerY },
            { x: centerX, y: footprint.y - BUILD_TARGET_MARGIN_PX },
        ].map((candidate) => ({
            x: Phaser.Math.Clamp(candidate.x, 0, this.worldSize.x),
            y: Phaser.Math.Clamp(candidate.y, 0, this.worldSize.y),
        }));

        return candidates.sort(
            (a, b) =>
                Phaser.Math.Distance.Between(
                    builder.position.x,
                    builder.position.y,
                    a.x,
                    a.y,
                ) -
                Phaser.Math.Distance.Between(
                    builder.position.x,
                    builder.position.y,
                    b.x,
                    b.y,
                ),
        );
    }

    private getUnitById(unitId: string) {
        return this.getUnits().find((unit) => unit.id === unitId) ?? null;
    }

    private drawGhost(footprint: GridPathRect, validation: PlacementValidation) {
        const color = validation.valid ? 0x56d47a : 0xe05c4f;
        const outerColor = validation.valid ? 0xd8ffe1 : 0xffd1c7;
        this.ghost.clear();
        this.ghost.fillStyle(color, validation.valid ? 0.18 : 0.22);
        this.ghost.fillRect(footprint.x, footprint.y, footprint.width, footprint.height);
        this.ghost.lineStyle(6, outerColor, 0.96);
        this.ghost.strokeRect(footprint.x, footprint.y, footprint.width, footprint.height);
        this.ghost.lineStyle(2, color, 1);
        this.ghost.strokeRect(footprint.x, footprint.y, footprint.width, footprint.height);
        if (!validation.valid) {
            this.drawHatch(this.ghost, footprint, 0xffd1c7, 0.72);
        }
        this.drawCornerTicks(this.ghost, footprint, outerColor);
    }

    private drawCornerTicks(
        graphics: Phaser.GameObjects.Graphics,
        footprint: GridPathRect,
        color: number,
    ) {
        const tick = Math.min(
            GHOST_CORNER_TICK_PX,
            Math.max(10, Math.min(footprint.width, footprint.height) * 0.22),
        );
        graphics.lineStyle(4, color, 0.98);
        graphics.lineBetween(footprint.x, footprint.y, footprint.x + tick, footprint.y);
        graphics.lineBetween(footprint.x, footprint.y, footprint.x, footprint.y + tick);
        graphics.lineBetween(
            footprint.x + footprint.width,
            footprint.y,
            footprint.x + footprint.width - tick,
            footprint.y,
        );
        graphics.lineBetween(
            footprint.x + footprint.width,
            footprint.y,
            footprint.x + footprint.width,
            footprint.y + tick,
        );
        graphics.lineBetween(
            footprint.x,
            footprint.y + footprint.height,
            footprint.x + tick,
            footprint.y + footprint.height,
        );
        graphics.lineBetween(
            footprint.x,
            footprint.y + footprint.height,
            footprint.x,
            footprint.y + footprint.height - tick,
        );
        graphics.lineBetween(
            footprint.x + footprint.width,
            footprint.y + footprint.height,
            footprint.x + footprint.width - tick,
            footprint.y + footprint.height,
        );
        graphics.lineBetween(
            footprint.x + footprint.width,
            footprint.y + footprint.height,
            footprint.x + footprint.width,
            footprint.y + footprint.height - tick,
        );
    }

    private drawHatch(
        graphics: Phaser.GameObjects.Graphics,
        footprint: GridPathRect,
        color: number,
        alpha: number,
    ) {
        graphics.lineStyle(2, color, alpha);
        for (
            let offset = -footprint.height;
            offset < footprint.width;
            offset += GHOST_HATCH_SPACING_PX
        ) {
            const startX = footprint.x + Math.max(0, offset);
            const startY = footprint.y + Math.max(0, -offset);
            const endX = footprint.x + Math.min(footprint.width, offset + footprint.height);
            const endY =
                footprint.y +
                Math.min(footprint.height, footprint.height - Math.max(0, -offset));
            graphics.lineBetween(startX, startY, endX, endY);
        }
    }

    private getSelectedBuilder() {
        return (
            this.getSelectedUnits().find(
                (unit) =>
                    unit.hp > 0 &&
                    BUILDER_TEMPLATE_IDS.includes(unit.templateId),
            ) ?? null
        );
    }
}

function rectsOverlap(a: GridPathRect, b: GridPathRect) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}
