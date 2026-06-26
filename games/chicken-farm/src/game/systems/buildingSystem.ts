import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type { BuildingTemplateConfig, MvpBuildingId } from '../balanceTypes';
import type { GridPathRect } from './pathing';

export type PlayerEconomyState = {
    coins: number;
    lumber: number;
};

export type PlayerBuilding = {
    readonly armor: number;
    readonly blocksPath: boolean;
    readonly completesAtSec: number;
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

export class BuildingSystem {
    readonly economy: PlayerEconomyState = {
        coins: 500,
        lumber: 300,
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

    canAfford(template: BuildingTemplateConfig) {
        return (
            this.economy.coins >= template.costCoins &&
            this.economy.lumber >= (template.costLumber ?? 0)
        );
    }

    createBuilding(request: BuildRequest) {
        const template = CHICKEN_FARM_BALANCE.buildingTemplates[request.templateId];
        if (!this.canAfford(template)) return null;

        this.economy.coins -= template.costCoins;
        this.economy.lumber -= template.costLumber ?? 0;

        const footprint = getBuildingFootprint(request.templateId, request.x, request.y);
        const startedAtSec = this.getElapsedSec();
        const building: PlayerBuilding = {
            armor: template.armor,
            blocksPath: template.blocksPath,
            completesAtSec:
                startedAtSec + template.buildTimeSec,
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
        const elapsedSec = this.getElapsedSec();
        this.buildings.forEach((building) => {
            if (building.state === 'constructing' && elapsedSec >= building.completesAtSec) {
                building.state = 'complete';
                this.recordTelemetry?.('building_completed', {
                    buildingId: building.id,
                    templateId: building.templateId,
                });
            }
            this.updateView(building);
        });
    }

    isBuildingComplete(buildingId: string) {
        return this.buildings.some(
            (building) => building.id === buildingId && building.state === 'complete',
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

        const progress =
            building.completesAtSec <= building.startedAtSec
                ? 1
                : Phaser.Math.Clamp(
                      (this.getElapsedSec() - building.startedAtSec) /
                          (building.completesAtSec - building.startedAtSec),
                      0,
                      1,
                  );
        view.body.setAlpha(building.state === 'complete' ? 0.88 : 0.5);
        view.progressBack.setVisible(building.state === 'constructing');
        view.progressFill.setVisible(building.state === 'constructing');
        view.progressFill.width = building.footprint.width * progress;
        view.hpFill.width = building.footprint.width * (building.hp / building.maxHp);
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
