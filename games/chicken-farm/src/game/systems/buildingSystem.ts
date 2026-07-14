import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { BuildingTemplateConfig, MvpBuildingId } from '../balanceTypes';
import { VISIBILITY_OVERLAY } from '../config';
import type { GridPathRect } from './pathing';
import type { AttackableEnemyTarget, Point } from './playerCommandTypes';
import { resolveBuildingProductionExit } from './buildingProductionExit';
import type { VisionSource } from './visibilitySystem';

export type PlayerEconomyState = {
    coins: number;
    eggs: number;
    gold: number;
    lumber: number;
    supplyCap: number;
    supplyUsed: number;
};

export type PlayerBuilding = {
    activeWorkerUnitId?: string;
    readonly armor: number;
    readonly buildTimeSec: number;
    readonly blocksPath: boolean;
    completedAtSec?: number;
    constructionActiveSinceSec?: number;
    constructionProgressSec: number;
    readonly footprint: GridPathRect;
    hp: number;
    readonly id: string;
    readonly maxHp: number;
    nextAttackAtSec: number;
    readonly ownerPlayerId: number;
    rallyPoint?: Point;
    readonly startedAtSec: number;
    state: 'complete' | 'constructing';
    readonly targetableByWolves: boolean;
    readonly templateId: MvpBuildingId;
    readonly workerUnitId?: string;
};

type BuildingView = {
    readonly body: Phaser.GameObjects.Rectangle;
    readonly hpBack: Phaser.GameObjects.Rectangle;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    readonly label: Phaser.GameObjects.Text;
    readonly overlay: Phaser.GameObjects.Graphics;
    readonly progressBack: Phaser.GameObjects.Rectangle;
    readonly progressFill: Phaser.GameObjects.Rectangle;
};

export type BuildingSelectionSummary = {
    readonly activeWorkerUnitId: string | null;
    readonly displayName: string;
    readonly footprintCells: { readonly h: number; readonly w: number };
    readonly hp: number;
    readonly id: string;
    readonly maxHp: number;
    readonly progress: number;
    readonly remainingSec: number;
    readonly state: PlayerBuilding['state'];
    readonly templateId: MvpBuildingId;
    readonly workerUnitId: string | null;
};

type BuildingSystemConfig = {
    readonly damageEnemyTarget?: (targetId: string, damage: number) => boolean;
    readonly getElapsedSec: () => number;
    readonly getAttackableEnemyTargets?: () => readonly AttackableEnemyTarget[];
    readonly isTargetVisible?: (x: number, y: number) => boolean;
    readonly onBuildingCompleted?: (building: PlayerBuilding) => void;
    readonly onBuildingRemoved?: (building: PlayerBuilding, reason: string) => void;
    readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    readonly scene: Phaser.Scene;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
};

type BuildRequest = {
    readonly completeImmediately?: boolean;
    readonly ownerPlayerId: number;
    readonly skipCost?: boolean;
    readonly templateId: MvpBuildingId;
    readonly workerUnitId?: string;
    readonly x: number;
    readonly y: number;
};

const BUILDING_FOOTPRINT_CELL_PX = 32;
const BUILDING_PLACEMENT_GRID_PX = 64;

const CATEGORY_COLORS: Record<BuildingTemplateConfig['category'], number> = {
    barracks: 0x8c7f68,
    core: 0xb9a46a,
    economy: 0x76a768,
    gate: 0x92775a,
    market: 0x9d7cc0,
    research: 0x6e8dab,
    support: 0x82a98f,
    tower: 0xb7745b,
    wall: 0x7d7463,
};

const CONSTRUCTION_CANCEL_REFUND_RATIO = 0.75;
const COMPLETE_BUILDING_VISION_RADIUS_PX = VISIBILITY_OVERLAY.revealRadiusPx * 0.75;
const ACTIVE_CONSTRUCTION_VISION_RADIUS_PX =
    VISIBILITY_OVERLAY.revealRadiusPx * 0.45;
const BUILDING_HP_BAR_HEIGHT_PX = 12;
const BUILDING_HP_BAR_BORDER_PX = 2;
const BUILDING_HP_FILL_HEIGHT_PX = BUILDING_HP_BAR_HEIGHT_PX - BUILDING_HP_BAR_BORDER_PX * 2;
const BUILDING_HP_BAR_PAD_PX = 4;
const BUILDING_HP_BAR_Y_OFFSET_PX = 24;
const BUILDING_PROGRESS_BAR_HEIGHT_PX = 7;
const BUILDING_STATUS_STROKE_WIDTH_PX = 5;
const BUILDING_HATCH_SPACING_PX = 24;

export class BuildingSystem {
    readonly economy: PlayerEconomyState = {
        coins:
            CHICKEN_FARM_BALANCE.economy.startingGold ??
            CHICKEN_FARM_BALANCE.economy.startingCoins,
        eggs: 0,
        gold:
            CHICKEN_FARM_BALANCE.economy.startingGold ??
            CHICKEN_FARM_BALANCE.economy.startingCoins,
        lumber: CHICKEN_FARM_BALANCE.economy.startingLumber ?? 0,
        supplyCap: CHICKEN_FARM_BALANCE.economy.startingSupplyCap ?? 0,
        supplyUsed: 0,
    };
    private readonly buildings: PlayerBuilding[] = [];
    private readonly damageEnemyTarget: (targetId: string, damage: number) => boolean;
    private readonly getElapsedSec: () => number;
    private readonly getAttackableEnemyTargets: () => readonly AttackableEnemyTarget[];
    private readonly isTargetVisible: (x: number, y: number) => boolean;
    private readonly onBuildingCompleted?: (building: PlayerBuilding) => void;
    private readonly onBuildingRemoved?: (building: PlayerBuilding, reason: string) => void;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private readonly scene: Phaser.Scene;
    private readonly views = new Map<string, BuildingView>();
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private nextBuildingId = 1;

    constructor(config: BuildingSystemConfig) {
        this.damageEnemyTarget = config.damageEnemyTarget ?? (() => false);
        this.getElapsedSec = config.getElapsedSec;
        this.getAttackableEnemyTargets = config.getAttackableEnemyTargets ?? (() => []);
        this.isTargetVisible = config.isTargetVisible ?? (() => true);
        this.onBuildingCompleted = config.onBuildingCompleted;
        this.onBuildingRemoved = config.onBuildingRemoved;
        this.recordTelemetry = config.recordTelemetry;
        this.scene = config.scene;
        this.worldObjects = config.worldObjects;
    }

    getBuildingCount() {
        return this.buildings.length;
    }

    getDynamicBlockedRects(): readonly GridPathRect[] {
        return this.buildings
            .filter((building) => building.blocksPath && building.state === 'complete')
            .map((building) => building.footprint);
    }

    getAllFootprints(): readonly GridPathRect[] {
        return this.buildings.map((building) => building.footprint);
    }

    getVisionSources(): readonly VisionSource[] {
        return this.buildings.flatMap((building) => {
            const radiusPx = this.getBuildingVisionRadius(building);
            if (radiusPx <= 0) return [];

            return [
                {
                    radiusPx,
                    x: building.footprint.x + building.footprint.width / 2,
                    y: building.footprint.y + building.footprint.height / 2,
                },
            ];
        });
    }

    getBuilding(buildingId: string) {
        return this.buildings.find((building) => building.id === buildingId) ?? null;
    }

    getProductionExit(
        buildingId: string,
        unitRadiusPx: number,
        isPositionAvailable?: (point: Point) => boolean,
    ) {
        const building = this.getBuilding(buildingId);
        if (!building) return null;

        return resolveBuildingProductionExit({
            buildingCenter: this.getBuildingCenter(building),
            isPositionAvailable,
            templateId: building.templateId,
            unitRadiusPx,
        });
    }

    getRallyPoint(buildingId: string) {
        const building = this.getBuilding(buildingId);
        return building?.rallyPoint ? { ...building.rallyPoint } : null;
    }

    setRallyPoint(buildingId: string, rallyPoint: Point) {
        const building = this.getBuilding(buildingId);
        if (!building) return false;
        building.rallyPoint = { ...rallyPoint };
        this.recordTelemetry?.('building_rally_point_changed', {
            buildingId,
            x: Number(rallyPoint.x.toFixed(1)),
            y: Number(rallyPoint.y.toFixed(1)),
        });
        return true;
    }

    hitTestBuilding(worldX: number, worldY: number) {
        return (
            [...this.buildings]
                .reverse()
                .find((building) =>
                    new Phaser.Geom.Rectangle(
                        building.footprint.x,
                        building.footprint.y,
                        building.footprint.width,
                        building.footprint.height,
                    ).contains(worldX, worldY),
                ) ?? null
        );
    }

    getBuildingSelectionSummary(buildingId: string): BuildingSelectionSummary | null {
        const building = this.getBuilding(buildingId);
        if (!building) return null;

        const template = CHICKEN_FARM_BALANCE.buildingTemplates[building.templateId];
        const progress = this.getConstructionProgress(building);
        return {
            activeWorkerUnitId: building.activeWorkerUnitId ?? null,
            displayName: template.displayName,
            footprintCells: template.footprintCells,
            hp: Math.ceil(building.hp),
            id: building.id,
            maxHp: building.maxHp,
            progress,
            remainingSec: Math.max(0, building.buildTimeSec - progress * building.buildTimeSec),
            state: building.state,
            templateId: building.templateId,
            workerUnitId: building.workerUnitId ?? null,
        };
    }

    canAfford(template: BuildingTemplateConfig) {
        return (
            this.economy.gold >= template.costCoins &&
            this.economy.lumber >= (template.costLumber ?? 0)
        );
    }

    createBuilding(request: BuildRequest) {
        const template = CHICKEN_FARM_BALANCE.buildingTemplates[request.templateId];
        if (!request.skipCost && !this.canAfford(template)) return null;

        if (!request.skipCost) {
            this.economy.gold -= template.costCoins;
            this.economy.coins = this.economy.gold;
            this.economy.lumber -= template.costLumber ?? 0;
        }

        const footprint = getBuildingFootprint(request.templateId, request.x, request.y);
        const startedAtSec = this.getElapsedSec();
        const building: PlayerBuilding = {
            activeWorkerUnitId: request.workerUnitId,
            armor: template.armor,
            buildTimeSec: template.buildTimeSec,
            blocksPath: template.blocksPath,
            constructionActiveSinceSec:
                request.completeImmediately || !request.workerUnitId ? undefined : startedAtSec,
            constructionProgressSec: request.completeImmediately ? template.buildTimeSec : 0,
            completedAtSec: request.completeImmediately ? startedAtSec : undefined,
            footprint,
            hp: template.hp,
            id: `player-building-${this.nextBuildingId}`,
            maxHp: template.hp,
            nextAttackAtSec: startedAtSec,
            ownerPlayerId: request.ownerPlayerId,
            startedAtSec,
            state: request.completeImmediately ? 'complete' : 'constructing',
            targetableByWolves: template.targetableByWolves,
            templateId: request.templateId,
            workerUnitId: request.workerUnitId,
        };

        this.nextBuildingId += 1;
        this.buildings.push(building);
        this.createView(building, template);
        if (request.completeImmediately) this.onBuildingCompleted?.(building);
        this.recordTelemetry?.('building_construction_started', {
            buildingId: building.id,
            templateId: building.templateId,
            x: Number(building.footprint.x.toFixed(1)),
            y: Number(building.footprint.y.toFixed(1)),
        });

        return building;
    }

    update() {
        this.buildings.forEach((building) => {
            if (
                building.state === 'constructing' &&
                this.getConstructionProgressSec(building) >= building.buildTimeSec
            ) {
                building.constructionProgressSec = building.buildTimeSec;
                building.constructionActiveSinceSec = undefined;
                building.activeWorkerUnitId = undefined;
                building.completedAtSec = this.getElapsedSec();
                building.state = 'complete';
                this.onBuildingCompleted?.(building);
                this.recordTelemetry?.('building_completed', {
                    buildingId: building.id,
                    templateId: building.templateId,
                });
            }
            this.updateBuildingCombat(building);
            this.updateView(building);
        });
    }

    pauseConstruction(buildingId: string, workerUnitId: string, reason: string) {
        const building = this.getBuilding(buildingId);
        if (!building || building.state !== 'constructing') return false;
        if (building.activeWorkerUnitId !== workerUnitId) return false;

        building.constructionProgressSec = this.getConstructionProgressSec(building);
        building.constructionActiveSinceSec = undefined;
        building.activeWorkerUnitId = undefined;
        this.recordTelemetry?.('building_construction_paused', {
            buildingId,
            progress: Number(this.getConstructionProgress(building).toFixed(3)),
            reason,
            workerUnitId,
        });
        this.updateView(building);
        return true;
    }

    resumeConstruction(buildingId: string, workerUnitId: string) {
        const building = this.getBuilding(buildingId);
        if (!building || building.state !== 'constructing') return false;

        building.activeWorkerUnitId = workerUnitId;
        building.constructionActiveSinceSec = this.getElapsedSec();
        this.recordTelemetry?.('building_construction_resumed', {
            buildingId,
            progress: Number(this.getConstructionProgress(building).toFixed(3)),
            workerUnitId,
        });
        this.updateView(building);
        return true;
    }

    cancelConstruction(buildingId: string, reason: string) {
        const buildingIndex = this.buildings.findIndex(
            (building) => building.id === buildingId,
        );
        const building = this.buildings[buildingIndex];
        if (!building || building.state !== 'constructing') return null;

        const template = CHICKEN_FARM_BALANCE.buildingTemplates[building.templateId];
        const refund = {
            coins: Math.floor(template.costCoins * CONSTRUCTION_CANCEL_REFUND_RATIO),
            lumber: Math.floor(
                (template.costLumber ?? 0) * CONSTRUCTION_CANCEL_REFUND_RATIO,
            ),
        };
        this.economy.gold += refund.coins;
        this.economy.coins = this.economy.gold;
        this.economy.lumber += refund.lumber;
        this.destroyView(building.id);
        this.buildings.splice(buildingIndex, 1);
        this.onBuildingRemoved?.(building, reason);
        this.recordTelemetry?.('building_construction_cancelled', {
            buildingId,
            reason,
            refundCoins: refund.coins,
            refundLumber: refund.lumber,
            templateId: building.templateId,
        });
        return { building, refund };
    }

    isBuildingComplete(buildingId: string) {
        return this.buildings.some(
            (building) => building.id === buildingId && building.state === 'complete',
        );
    }

    isConstructionActive(buildingId: string, workerUnitId: string) {
        const building = this.getBuilding(buildingId);
        return (
            building?.state === 'constructing' &&
            building.activeWorkerUnitId === workerUnitId
        );
    }

    private createView(building: PlayerBuilding, template: BuildingTemplateConfig) {
        const centerX = building.footprint.x + building.footprint.width / 2;
        const centerY = building.footprint.y + building.footprint.height / 2;
        const body = this.scene.add
            .rectangle(
                centerX,
                centerY,
                building.footprint.width,
                building.footprint.height,
                CATEGORY_COLORS[template.category],
                0.52,
            )
            .setStrokeStyle(BUILDING_STATUS_STROKE_WIDTH_PX, 0x1b1711, 0.9)
            .setDepth(23);
        const overlay = this.scene.add.graphics().setDepth(24);
        const hpBack = this.scene.add
            .rectangle(
                centerX,
                building.footprint.y - BUILDING_HP_BAR_Y_OFFSET_PX,
                building.footprint.width + BUILDING_HP_BAR_PAD_PX * 2,
                BUILDING_HP_BAR_HEIGHT_PX,
                0x030303,
                0.98,
            )
            .setStrokeStyle(BUILDING_HP_BAR_BORDER_PX, 0x030303, 1)
            .setDepth(25);
        const hpFill = this.scene.add
            .rectangle(
                building.footprint.x - BUILDING_HP_BAR_PAD_PX + BUILDING_HP_BAR_BORDER_PX,
                building.footprint.y - BUILDING_HP_BAR_Y_OFFSET_PX,
                building.footprint.width +
                    BUILDING_HP_BAR_PAD_PX * 2 -
                    BUILDING_HP_BAR_BORDER_PX * 2,
                BUILDING_HP_FILL_HEIGHT_PX,
                0x55d76d,
                1,
            )
            .setOrigin(0, 0.5)
            .setDepth(26);
        const progressBack = this.scene.add
            .rectangle(
                centerX,
                building.footprint.y - 7,
                building.footprint.width,
                BUILDING_PROGRESS_BAR_HEIGHT_PX,
                0x111111,
                0.84,
            )
            .setDepth(25);
        const progressFill = this.scene.add
            .rectangle(
                building.footprint.x,
                building.footprint.y - 7,
                building.footprint.width,
                BUILDING_PROGRESS_BAR_HEIGHT_PX - 2,
                0xf1c65c,
                1,
            )
            .setOrigin(0, 0.5)
            .setDepth(26);
        const label = this.scene.add
            .text(centerX, centerY, template.displayName, {
                align: 'center',
                backgroundColor: 'rgba(12, 13, 10, 0.58)',
                color: '#f5e6ae',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
                wordWrap: { width: Math.max(48, building.footprint.width - 8) },
            })
            .setDepth(27)
            .setOrigin(0.5);

        this.views.set(building.id, {
            body,
            hpBack,
            hpFill,
            label,
            overlay,
            progressBack,
            progressFill,
        });
        this.worldObjects.push(body, overlay, hpBack, hpFill, progressBack, progressFill, label);
    }

    private updateView(building: PlayerBuilding) {
        const view = this.views.get(building.id);
        if (!view) return;

        const progress = this.getConstructionProgress(building);
        const isPaused = building.state === 'constructing' && !building.activeWorkerUnitId;
        view.body.setAlpha(building.state === 'complete' ? 0.9 : 0.56);
        view.body.setStrokeStyle(
            isPaused ? 6 : BUILDING_STATUS_STROKE_WIDTH_PX,
            building.state === 'complete'
                ? 0x26351f
                : isPaused
                  ? 0xffd45f
                  : 0xf1c65c,
            isPaused ? 1 : 0.95,
        );
        this.drawStateOverlay(view.overlay, building, isPaused);
        view.progressBack.setVisible(building.state === 'constructing');
        view.progressFill.setVisible(building.state === 'constructing');
        view.progressFill.width = building.footprint.width * progress;
        const hpRatio = Phaser.Math.Clamp(building.hp / building.maxHp, 0, 1);
        view.hpFill.width =
            (building.footprint.width +
                BUILDING_HP_BAR_PAD_PX * 2 -
                BUILDING_HP_BAR_BORDER_PX * 2) *
            hpRatio;
        view.hpFill.setFillStyle(this.getHpBarColor(hpRatio), 1);
        view.label.setVisible(building.state === 'constructing');
    }

    private getHpBarColor(hpRatio: number) {
        if (hpRatio > 0.55) return 0x55d76d;
        if (hpRatio > 0.28) return 0xf2c94c;
        return 0xe85d4f;
    }

    private drawStateOverlay(
        overlay: Phaser.GameObjects.Graphics,
        building: PlayerBuilding,
        isPaused: boolean,
    ) {
        overlay.clear();
        const rect = building.footprint;
        if (building.state === 'complete') {
            overlay.lineStyle(2, 0xe8d48a, 0.72);
            overlay.strokeRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
            return;
        }

        overlay.lineStyle(2, isPaused ? 0xffe38a : 0xffd36a, isPaused ? 0.72 : 0.46);
        for (
            let offset = -rect.height;
            offset < rect.width;
            offset += BUILDING_HATCH_SPACING_PX
        ) {
            const startX = rect.x + Math.max(0, offset);
            const startY = rect.y + Math.max(0, -offset);
            const endX = rect.x + Math.min(rect.width, offset + rect.height);
            const endY = rect.y + Math.min(rect.height, rect.height - Math.max(0, -offset));
            overlay.lineBetween(startX, startY, endX, endY);
        }
        overlay.lineStyle(isPaused ? 4 : 3, isPaused ? 0xfff0b0 : 0xf1c65c, isPaused ? 0.92 : 0.72);
        overlay.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
    }

    private getConstructionProgress(building: PlayerBuilding) {
        if (building.state === 'complete') return 1;
        if (building.buildTimeSec <= 0) return 1;

        return Phaser.Math.Clamp(
            this.getConstructionProgressSec(building) / building.buildTimeSec,
            0,
            1,
        );
    }

    private getConstructionProgressSec(building: PlayerBuilding) {
        const activeSec =
            building.constructionActiveSinceSec === undefined
                ? 0
                : Math.max(0, this.getElapsedSec() - building.constructionActiveSinceSec);
        return Math.min(building.buildTimeSec, building.constructionProgressSec + activeSec);
    }

    private updateBuildingCombat(building: PlayerBuilding) {
        if (building.state !== 'complete') return;

        const template = CHICKEN_FARM_BALANCE.buildingTemplates[building.templateId];
        if (!template.attack) return;
        if (this.getElapsedSec() < building.nextAttackAtSec) return;

        const target = this.findBuildingCombatTarget(building, template.attack.rangePx);
        if (!target) return;

        const landed = this.damageEnemyTarget(target.id, template.attack.damage);
        if (!landed) return;

        const center = this.getBuildingCenter(building);
        building.nextAttackAtSec = this.getElapsedSec() + template.attack.cooldownSec;
        this.recordTelemetry?.('player_building_attack_landed', {
            buildingId: building.id,
            damage: template.attack.damage,
            rangePx: template.attack.rangePx,
            targetHpBefore: Math.ceil(target.hp),
            targetId: target.id,
            targetX: Number(target.x.toFixed(1)),
            targetY: Number(target.y.toFixed(1)),
            templateId: building.templateId,
            x: Number(center.x.toFixed(1)),
            y: Number(center.y.toFixed(1)),
        });
    }

    private findBuildingCombatTarget(building: PlayerBuilding, rangePx: number) {
        const center = this.getBuildingCenter(building);
        return (
            this.getAttackableEnemyTargets()
                .filter((target) => target.hp > 0)
                .filter((target) => this.isTargetVisible(target.x, target.y))
                .map((target) => ({
                    distance: Phaser.Math.Distance.Between(
                        center.x,
                        center.y,
                        target.x,
                        target.y,
                    ),
                    target,
                }))
                .filter((candidate) => candidate.distance <= rangePx + candidate.target.radius)
                .sort((a, b) => a.distance - b.distance)[0]?.target ?? null
        );
    }

    private getBuildingCenter(building: PlayerBuilding) {
        return {
            x: building.footprint.x + building.footprint.width / 2,
            y: building.footprint.y + building.footprint.height / 2,
        };
    }

    private destroyView(buildingId: string) {
        const view = this.views.get(buildingId);
        if (!view) return;

        [
            view.body,
            view.hpBack,
            view.hpFill,
            view.label,
            view.overlay,
            view.progressBack,
            view.progressFill,
        ].forEach((gameObject) => gameObject.destroy());
        this.views.delete(buildingId);
    }

    private getBuildingVisionRadius(building: PlayerBuilding) {
        if (building.state === 'complete') {
            const attackRange =
                CHICKEN_FARM_BALANCE.buildingTemplates[building.templateId].attack
                    ?.rangePx ?? 0;
            return Math.max(COMPLETE_BUILDING_VISION_RADIUS_PX, attackRange);
        }
        if (building.activeWorkerUnitId) return ACTIVE_CONSTRUCTION_VISION_RADIUS_PX;
        return 0;
    }
}

export function getBuildingFootprint(
    templateId: MvpBuildingId,
    x: number,
    y: number,
): GridPathRect {
    const template = CHICKEN_FARM_BALANCE.buildingTemplates[templateId];

    return {
        height: template.footprintCells.h * BUILDING_FOOTPRINT_CELL_PX,
        width: template.footprintCells.w * BUILDING_FOOTPRINT_CELL_PX,
        x,
        y,
    };
}

export function snapBuildingTopLeft(
    templateId: MvpBuildingId,
    worldX: number,
    worldY: number,
): { readonly x: number; readonly y: number } {
    const template = CHICKEN_FARM_BALANCE.buildingTemplates[templateId];
    const width = template.footprintCells.w * BUILDING_FOOTPRINT_CELL_PX;
    const height = template.footprintCells.h * BUILDING_FOOTPRINT_CELL_PX;

    return {
        x:
            Math.round((worldX - width / 2) / BUILDING_PLACEMENT_GRID_PX) *
            BUILDING_PLACEMENT_GRID_PX,
        y:
            Math.round((worldY - height / 2) / BUILDING_PLACEMENT_GRID_PX) *
            BUILDING_PLACEMENT_GRID_PX,
    };
}
