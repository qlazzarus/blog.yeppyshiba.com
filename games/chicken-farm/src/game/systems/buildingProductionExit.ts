import { BUILDING_TEMPLATES } from '../buildingTemplates';
import type { BuildingTemplateConfig, MvpBuildingId } from '../balanceTypes';
import type { EconomyPoint } from './economyTypes';

const BUILDING_FOOTPRINT_CELL_PX = 32;
const EXIT_FALLBACK_STEP_PX = 32;
const DEFAULT_EXIT_CLEARANCE_PX = 8;

type ExitSide = NonNullable<BuildingTemplateConfig['productionExit']>['side'];

export type BuildingProductionExitResult = {
    readonly fallbackIndex: number;
    readonly point: EconomyPoint;
    readonly preferredSide: ExitSide;
    readonly resolved: boolean;
    readonly side: ExitSide;
};

export function resolveBuildingProductionExit(config: {
    readonly buildingCenter: EconomyPoint;
    readonly isPositionAvailable?: (point: EconomyPoint) => boolean;
    readonly templateId: MvpBuildingId;
    readonly unitRadiusPx: number;
}): BuildingProductionExitResult {
    const template = BUILDING_TEMPLATES[config.templateId];
    const exit = template.productionExit ?? {
        clearancePx: DEFAULT_EXIT_CLEARANCE_PX,
        side: 'south' as const,
    };
    const preferredSide = exit.side;
    const orderedSides = getOrderedSides(preferredSide);
    const candidates = orderedSides.flatMap((side) =>
        [0, 1, 2].map((ring) => ({
            point: getExitPoint({
                buildingCenter: config.buildingCenter,
                clearancePx:
                    (exit.clearancePx ?? DEFAULT_EXIT_CLEARANCE_PX) +
                    ring * EXIT_FALLBACK_STEP_PX,
                footprintHeightPx:
                    template.footprintCells.h * BUILDING_FOOTPRINT_CELL_PX,
                footprintWidthPx:
                    template.footprintCells.w * BUILDING_FOOTPRINT_CELL_PX,
                offsetPx: exit.offsetPx ?? 0,
                side,
                unitRadiusPx: config.unitRadiusPx,
            }),
            side,
        })),
    );
    const fallbackIndex = candidates.findIndex(
        (candidate) =>
            !config.isPositionAvailable ||
            config.isPositionAvailable(candidate.point),
    );
    const selected = candidates[Math.max(0, fallbackIndex)];

    return {
        fallbackIndex: Math.max(0, fallbackIndex),
        point: selected.point,
        preferredSide,
        resolved: fallbackIndex >= 0,
        side: selected.side,
    };
}

function getExitPoint(config: {
    readonly buildingCenter: EconomyPoint;
    readonly clearancePx: number;
    readonly footprintHeightPx: number;
    readonly footprintWidthPx: number;
    readonly offsetPx: number;
    readonly side: ExitSide;
    readonly unitRadiusPx: number;
}): EconomyPoint {
    const horizontalDistance =
        config.footprintWidthPx / 2 + config.unitRadiusPx + config.clearancePx;
    const verticalDistance =
        config.footprintHeightPx / 2 + config.unitRadiusPx + config.clearancePx;

    switch (config.side) {
        case 'north':
            return {
                x: config.buildingCenter.x + config.offsetPx,
                y: config.buildingCenter.y - verticalDistance,
            };
        case 'east':
            return {
                x: config.buildingCenter.x + horizontalDistance,
                y: config.buildingCenter.y + config.offsetPx,
            };
        case 'west':
            return {
                x: config.buildingCenter.x - horizontalDistance,
                y: config.buildingCenter.y + config.offsetPx,
            };
        case 'south':
            return {
                x: config.buildingCenter.x + config.offsetPx,
                y: config.buildingCenter.y + verticalDistance,
            };
    }
}

function getOrderedSides(preferredSide: ExitSide): ExitSide[] {
    const clockwise: ExitSide[] = ['north', 'east', 'south', 'west'];
    const preferredIndex = clockwise.indexOf(preferredSide);
    return [
        clockwise[preferredIndex],
        clockwise[(preferredIndex + 1) % clockwise.length],
        clockwise[(preferredIndex + 3) % clockwise.length],
        clockwise[(preferredIndex + 2) % clockwise.length],
    ];
}
