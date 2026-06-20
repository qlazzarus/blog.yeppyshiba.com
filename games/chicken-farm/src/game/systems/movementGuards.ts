import Phaser from 'phaser';

import type { GridPathRect } from './pathing';
import type { Point } from './playerCommandTypes';
import type { TerrainBlocker } from './terrainBlocker';

export const DEFAULT_UNIT_BLOCKER_CLEARANCE_PX = 8;

export type OccupancyConfig = {
    readonly dynamicBlockedRects?: readonly GridPathRect[];
    readonly terrainBlocker?: TerrainBlocker;
    readonly worldSize: Phaser.Math.Vector2;
    readonly clearancePx?: number;
};

export function canOccupyPoint(point: Point, config: OccupancyConfig) {
    if (!isInsideWorld(point, config.worldSize)) return false;
    if (config.terrainBlocker && !config.terrainBlocker.canMove(point.x, point.y)) {
        return false;
    }

    const clearancePx = config.clearancePx ?? DEFAULT_UNIT_BLOCKER_CLEARANCE_PX;
    return !(config.dynamicBlockedRects ?? []).some((rect) =>
        isPointInsideExpandedRect(point, rect, clearancePx),
    );
}

export function getOffsetTargetPoint(config: {
    readonly targetPoint: Point;
    readonly unitCount: number;
    readonly unitIndex: number;
    readonly offsetPx: number;
    readonly worldSize: Phaser.Math.Vector2;
    readonly canOccupy: (point: Point) => boolean;
}) {
    if (config.unitCount <= 1) return config.targetPoint;

    const angle = -Math.PI / 2 + (Math.PI * 2 * config.unitIndex) / config.unitCount;
    const offsetTarget = {
        x: Phaser.Math.Clamp(
            config.targetPoint.x + Math.cos(angle) * config.offsetPx,
            0,
            config.worldSize.x,
        ),
        y: Phaser.Math.Clamp(
            config.targetPoint.y + Math.sin(angle) * config.offsetPx,
            0,
            config.worldSize.y,
        ),
    };

    return config.canOccupy(offsetTarget) ? offsetTarget : config.targetPoint;
}

export function isInsideWorld(point: Point, worldSize: Phaser.Math.Vector2) {
    return (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x <= worldSize.x &&
        point.y <= worldSize.y
    );
}

export function isPointInsideExpandedRect(
    point: Point,
    rect: GridPathRect,
    clearancePx: number,
) {
    return (
        point.x >= rect.x - clearancePx &&
        point.x <= rect.x + rect.width + clearancePx &&
        point.y >= rect.y - clearancePx &&
        point.y <= rect.y + rect.height + clearancePx
    );
}
