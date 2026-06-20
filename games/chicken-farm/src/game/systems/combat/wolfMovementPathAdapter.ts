import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../../balance';
import type { CombatBuilding, CombatWolf } from '../../ecs/components';
import { POC_PATH_BOUNDS_PADDING, POC_WOLF_ID } from '../../poc/combatPocLayout';
import {
    canOccupyPoint,
    DEFAULT_UNIT_BLOCKER_CLEARANCE_PX,
} from '../movementGuards';
import { findGridPath, type GridPathPoint, type GridPathRect } from '../pathing';
import type { ControllableUnitCombatTarget } from '../playerCommandTypes';
import type { TerrainBlocker } from '../terrainBlocker';

export function moveWolfToward(config: {
    readonly deltaSec: number;
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly separateWolfFromControllableUnits: () => void;
    readonly speedPxPerSec: number;
    readonly targetX: number;
    readonly targetY: number;
    readonly terrainBlocker: TerrainBlocker;
    readonly wolf: CombatWolf;
    readonly worldSize: Phaser.Math.Vector2;
}) {
    const direction = new Phaser.Math.Vector2(
        config.targetX - config.wolf.body.x,
        config.targetY - config.wolf.body.y,
    );
    if (direction.lengthSq() < 16) return;

    direction.normalize().scale(config.speedPxPerSec * config.deltaSec);
    const nextX = config.wolf.body.x + direction.x;
    const nextY = config.wolf.body.y + direction.y;
    if (
        !canWolfOccupyPoint({
            dynamicBlockedRects: config.dynamicBlockedRects,
            terrainBlocker: config.terrainBlocker,
            worldSize: config.worldSize,
            x: nextX,
            y: nextY,
        })
    ) {
        return;
    }

    config.wolf.body.setPosition(nextX, nextY);
    config.separateWolfFromControllableUnits();
}

export function moveWolfAlongPath(config: {
    readonly deltaSec: number;
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly separateWolfFromControllableUnits: () => void;
    readonly speedPxPerSec: number;
    readonly terrainBlocker: TerrainBlocker;
    readonly wolf: CombatWolf;
    readonly worldSize: Phaser.Math.Vector2;
}) {
    const waypoint = config.wolf.path[config.wolf.pathIndex];
    if (!waypoint) return;

    moveWolfToward({
        deltaSec: config.deltaSec,
        dynamicBlockedRects: config.dynamicBlockedRects,
        separateWolfFromControllableUnits: config.separateWolfFromControllableUnits,
        speedPxPerSec: config.speedPxPerSec,
        targetX: waypoint.x,
        targetY: waypoint.y,
        terrainBlocker: config.terrainBlocker,
        wolf: config.wolf,
        worldSize: config.worldSize,
    });

    if (
        Phaser.Math.Distance.Between(
            config.wolf.body.x,
            config.wolf.body.y,
            waypoint.x,
            waypoint.y,
        ) < 8
    ) {
        config.wolf.pathIndex += 1;
    }
}

export function refreshWolfPath(config: {
    readonly combatBuildings: readonly CombatBuilding[];
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly elapsedSec: number;
    readonly focusedUnit: ControllableUnitCombatTarget | null;
    readonly force?: boolean;
    readonly getGoalBuilding: () => CombatBuilding | null;
    readonly getPathGoalCandidates: (building: CombatBuilding) => readonly GridPathPoint[];
    readonly getUnitPathGoalCandidates: (
        unit: ControllableUnitCombatTarget,
    ) => readonly GridPathPoint[];
    readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    readonly terrainBlocker: TerrainBlocker;
    readonly wolf: CombatWolf;
    readonly worldSize: Phaser.Math.Vector2;
}) {
    if (!config.force && config.elapsedSec < config.wolf.nextRepathAtSec) return;

    const refreshStartedAt = performance.now();
    const pathing = CHICKEN_FARM_BALANCE.pathing;
    const bounds = getCombatPathBounds({
        combatBuildings: config.combatBuildings,
        targetPoint: config.wolf.targetPoint,
        wolf: config.wolf,
        worldSize: config.worldSize,
    });
    const blockedRects = [
        ...config.terrainBlocker.getGroundBlockedRects(bounds),
        ...config.dynamicBlockedRects,
    ];
    const clearancePx =
        ((pathing.unitClearanceCells.wolf - 1) * pathing.cellSize) / 2;
    const goalBuilding = config.focusedUnit ? null : config.getGoalBuilding();
    const goalCandidates = config.focusedUnit
        ? config.getUnitPathGoalCandidates(config.focusedUnit)
        : goalBuilding
        ? config.getPathGoalCandidates(goalBuilding)
        : [{ x: config.wolf.targetPoint.x, y: config.wolf.targetPoint.y }];
    let path: readonly GridPathPoint[] | null = null;
    let pathGoal = goalCandidates[0] ?? {
        x: config.wolf.targetPoint.x,
        y: config.wolf.targetPoint.y,
    };

    for (const goal of goalCandidates) {
        const pathStartedAt = performance.now();
        const candidatePath = findGridPath({
            blockedRects,
            bounds,
            cellSize: pathing.cellSize,
            clearancePx,
            goal,
            pathSmoothingEnabled: pathing.pathSmoothingEnabled,
            start: { x: config.wolf.body.x, y: config.wolf.body.y },
        });
        config.recordPerformance?.(
            'path.wolf.findGridPath',
            performance.now() - pathStartedAt,
        );

        if (!candidatePath) continue;
        if (!path || candidatePath.length < path.length) {
            path = candidatePath;
            pathGoal = goal;
        }
    }

    config.wolf.targetPoint.set(pathGoal.x, pathGoal.y);
    config.wolf.path = path ?? [];
    config.wolf.pathIndex = 0;
    config.wolf.nextRepathAtSec = config.elapsedSec + pathing.repath.intervalSec;

    if (path) {
        config.wolf.pathFailedSinceSec = undefined;
    }
    config.recordPerformance?.(
        'path.wolf.refresh',
        performance.now() - refreshStartedAt,
    );
}

export function canWolfOccupyPoint(config: {
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly terrainBlocker: TerrainBlocker;
    readonly worldSize: Phaser.Math.Vector2;
    readonly x: number;
    readonly y: number;
}) {
    return canOccupyPoint(
        { x: config.x, y: config.y },
        {
            clearancePx: DEFAULT_UNIT_BLOCKER_CLEARANCE_PX,
            dynamicBlockedRects: config.dynamicBlockedRects,
            terrainBlocker: config.terrainBlocker,
            worldSize: config.worldSize,
        },
    );
}

export function getCombatPathBounds(config: {
    readonly combatBuildings: readonly CombatBuilding[];
    readonly targetPoint: Phaser.Math.Vector2;
    readonly wolf?: CombatWolf;
    readonly worldSize: Phaser.Math.Vector2;
}): GridPathRect {
    const points = [
        ...(config.wolf
            ? [{ x: config.wolf.body.x, y: config.wolf.body.y }]
            : []),
        { x: config.targetPoint.x, y: config.targetPoint.y },
        ...config.combatBuildings.map((building) => ({
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
    const width = Math.min(config.worldSize.x, maxX) - x;
    const height = Math.min(config.worldSize.y, maxY) - y;

    return {
        height: Math.max(32, height),
        width: Math.max(32, width),
        x,
        y,
    };
}

export function getWolfUnitPathGoalCandidates(config: {
    readonly unit: ControllableUnitCombatTarget;
    readonly wolf?: CombatWolf;
    readonly isBlocked: (point: GridPathPoint) => boolean;
}): GridPathPoint[] {
    const attackRange =
        CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
    const margin = Math.max(8, attackRange + config.unit.radius - 6);
    const candidates: GridPathPoint[] = [
        { x: config.unit.x - margin, y: config.unit.y },
        { x: config.unit.x + margin, y: config.unit.y },
        { x: config.unit.x, y: config.unit.y - margin },
        { x: config.unit.x, y: config.unit.y + margin },
        { x: config.unit.x - margin, y: config.unit.y - margin },
        { x: config.unit.x + margin, y: config.unit.y - margin },
        { x: config.unit.x - margin, y: config.unit.y + margin },
        { x: config.unit.x + margin, y: config.unit.y + margin },
    ];

    return sortCandidatesByWolfDistance(
        candidates.filter((candidate) => !config.isBlocked(candidate)),
        config.wolf,
    );
}

export function sortCandidatesByWolfDistance(
    candidates: readonly GridPathPoint[],
    wolf?: CombatWolf,
) {
    return [...candidates].sort((a, b) => {
        if (!wolf) return 0;
        return (
            Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
            Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y)
        );
    });
}
