import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { BuildingTemplateConfig, MvpBuildingId } from '../balanceTypes';
import { VISIBILITY_OVERLAY } from '../config';
import type { GridPathRect } from './pathing';
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
    readonly ownerPlayerId: number;
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
    readonly getElapsedSec: () => number;
    readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    readonly scene: Phaser.Scene;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
};

type BuildRequest = {
    readonly ownerPlayerId: number;
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
    private readonly getElapsedSec: () => number;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private readonly scene: Phaser.Scene;
    private readonly views = new Map<string, BuildingView>();
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private nextBuildingId = 1;

    constructor(config: BuildingSystemConfig) {
        this.getElapsedSec = config.getElapsedSec;
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
        if (!this.canAfford(template)) return null;

        this.economy.gold -= template.costCoins;
        this.economy.coins = this.economy.gold;
        this.economy.lumber -= template.costLumber ?? 0;

        const footprint = getBuildingFootprint(request.templateId, request.x, request.y);
        const startedAtSec = this.getElapsedSec();
        const building: PlayerBuilding = {
            activeWorkerUnitId: request.workerUnitId,
            armor: template.armor,
            buildTimeSec: template.buildTimeSec,
            blocksPath: template.blocksPath,
            constructionActiveSinceSec: request.workerUnitId ? startedAtSec : undefined,
            constructionProgressSec: 0,
            footprint,
            hp: template.hp,
            id: `player-building-${this.nextBuildingId}`,
            maxHp: template.hp,
            ownerPlayerId: request.ownerPlayerId,
            startedAtSec,
            state: 'constructing',
            targetableByWolves: template.targetableByWolves,
            templateId: request.templateId,
            workerUnitId: request.workerUnitId,
        };

        this.nextBuildingId += 1;
        this.buildings.push(building);
        this.createView(building, template);
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
                this.recordTelemetry?.('building_completed', {
                    buildingId: building.id,
                    templateId: building.templateId,
                });
            }
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
            .setStrokeStyle(2, 0x1b1711, 0.9)
            .setDepth(23);
        const hpBack = this.scene.add
            .rectangle(centerX, building.footprint.y - 12, building.footprint.width, 5, 0x111111, 0.88)
            .setDepth(25);
        const hpFill = this.scene.add
            .rectangle(
                building.footprint.x,
                building.footprint.y - 12,
                building.footprint.width,
                3,
                0x55d76d,
                1,
            )
            .setOrigin(0, 0.5)
            .setDepth(26);
        const progressBack = this.scene.add
            .rectangle(centerX, building.footprint.y - 5, building.footprint.width, 4, 0x111111, 0.82)
            .setDepth(25);
        const progressFill = this.scene.add
            .rectangle(
                building.footprint.x,
                building.footprint.y - 5,
                building.footprint.width,
                3,
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
            progressBack,
            progressFill,
        });
        this.worldObjects.push(body, hpBack, hpFill, progressBack, progressFill, label);
    }

    private updateView(building: PlayerBuilding) {
        const view = this.views.get(building.id);
        if (!view) return;

        const progress = this.getConstructionProgress(building);
        view.body.setAlpha(building.state === 'complete' ? 0.88 : 0.5);
        view.body.setStrokeStyle(
            building.activeWorkerUnitId ? 2 : 3,
            building.activeWorkerUnitId ? 0x1b1711 : 0xd8b24c,
            building.activeWorkerUnitId ? 0.9 : 0.95,
        );
        view.progressBack.setVisible(building.state === 'constructing');
        view.progressFill.setVisible(building.state === 'constructing');
        view.progressFill.width = building.footprint.width * progress;
        view.hpFill.width = building.footprint.width * (building.hp / building.maxHp);
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

    private destroyView(buildingId: string) {
        const view = this.views.get(buildingId);
        if (!view) return;

        [
            view.body,
            view.hpBack,
            view.hpFill,
            view.label,
            view.progressBack,
            view.progressFill,
        ].forEach((gameObject) => gameObject.destroy());
        this.views.delete(buildingId);
    }

    private getBuildingVisionRadius(building: PlayerBuilding) {
        if (building.state === 'complete') return COMPLETE_BUILDING_VISION_RADIUS_PX;
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
