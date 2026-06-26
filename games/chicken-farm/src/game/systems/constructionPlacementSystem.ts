import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { MvpBuildingId } from '../balanceTypes';
import type {
    ControllableUnitState,
    ControllableUnitTemplateId,
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

type ConstructionPlacementSystemConfig = {
    readonly buildingSystem: BuildingSystem;
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly clearBuilderBuildCommand: (unitId: string, siteId: string) => boolean;
    readonly getSelectedUnits: () => readonly ControllableUnitState[];
    readonly getUnits: () => readonly ControllableUnitState[];
    readonly issueBuilderMove: (
        unitId: string,
        targetPoint: { readonly x: number; readonly y: number },
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

type PendingBuildOrder = {
    readonly builderUnitId: string;
    readonly footprint: GridPathRect;
    readonly id: string;
    runtimeBuildingId?: string;
    readonly targetPoint: { readonly x: number; readonly y: number };
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
        this.worldSize = config.worldSize;
        this.ghost = config.scene.add.graphics().setDepth(48).setVisible(false);
        this.pendingGraphics = config.scene.add.graphics().setDepth(47);
        config.worldObjects.push(this.ghost, this.pendingGraphics);
    }

    getActiveBuildingId() {
        return this.activeBuildingId ?? null;
    }

    isActive() {
        return Boolean(this.activeBuildingId);
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

    handlePrimaryClick(worldX: number, worldY: number) {
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

        const targetPoint = this.getBuildTargetPoints(this.currentFootprint, builder).find(
            (candidate) => this.issueBuilderMove(builder.id, candidate),
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
            targetX: Number(targetPoint.x.toFixed(1)),
            targetY: Number(targetPoint.y.toFixed(1)),
            x: Number(this.currentFootprint.x.toFixed(1)),
            y: Number(this.currentFootprint.y.toFixed(1)),
        });
        this.cancelPlacement('placed');
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
    ): PlacementValidation {
        const template = CHICKEN_FARM_BALANCE.buildingTemplates[buildingId];
        if (!this.getSelectedBuilder()) {
            return { reason: 'missing_builder_selection', valid: false };
        }
        if (!this.buildingSystem.canAfford(template)) {
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
        for (let index = this.pendingOrders.length - 1; index >= 0; index -= 1) {
            const order = this.pendingOrders[index];
            const builder = this.getUnitById(order.builderUnitId);
            if (!builder || builder.hp <= 0) {
                this.pendingOrders.splice(index, 1);
                continue;
            }

            if (order.runtimeBuildingId) {
                if (this.buildingSystem.isBuildingComplete(order.runtimeBuildingId)) {
                    this.clearBuilderBuildCommand(builder.id, order.runtimeBuildingId);
                    this.pendingOrders.splice(index, 1);
                }
                continue;
            }

            const distance = Phaser.Math.Distance.Between(
                builder.position.x,
                builder.position.y,
                order.targetPoint.x,
                order.targetPoint.y,
            );
            if (distance > BUILDER_START_DISTANCE_PX) continue;

            const building = this.buildingSystem.createBuilding({
                ownerPlayerId: builder.ownerPlayerId,
                templateId: order.templateId,
                workerUnitId: builder.id,
                x: order.footprint.x,
                y: order.footprint.y,
            });
            if (!building) {
                this.recordTelemetry?.('build_placement_rejected', {
                    buildingId: order.templateId,
                    reason: 'insufficient_resources_at_site',
                    siteId: order.id,
                    x: Number(order.footprint.x.toFixed(1)),
                    y: Number(order.footprint.y.toFixed(1)),
                });
                this.pendingOrders.splice(index, 1);
                continue;
            }

            order.runtimeBuildingId = building.id;
            this.setBuilderBuildCommand(builder.id, building.id, order.targetPoint);
        }
    }

    private drawPendingOrders() {
        this.pendingGraphics.clear();
        this.pendingOrders.forEach((order) => {
            if (order.runtimeBuildingId) return;

            this.pendingGraphics.fillStyle(0xf1c65c, 0.12);
            this.pendingGraphics.fillRect(
                order.footprint.x,
                order.footprint.y,
                order.footprint.width,
                order.footprint.height,
            );
            this.pendingGraphics.lineStyle(2, 0xf1c65c, 0.72);
            this.pendingGraphics.strokeRect(
                order.footprint.x,
                order.footprint.y,
                order.footprint.width,
                order.footprint.height,
            );
            this.pendingGraphics.lineStyle(1, 0xf1c65c, 0.48);
            this.pendingGraphics.lineBetween(
                order.targetPoint.x,
                order.targetPoint.y,
                order.footprint.x + order.footprint.width / 2,
                order.footprint.y + order.footprint.height / 2,
            );
        });
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
        this.ghost.clear();
        this.ghost.fillStyle(color, 0.24);
        this.ghost.fillRect(footprint.x, footprint.y, footprint.width, footprint.height);
        this.ghost.lineStyle(2, color, 0.95);
        this.ghost.strokeRect(footprint.x, footprint.y, footprint.width, footprint.height);
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
