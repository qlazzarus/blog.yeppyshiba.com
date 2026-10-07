import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type Phaser from 'phaser';
import { getOffsetTargetPoint } from '../games/chicken-farm/src/game/systems/movementGuards';
import { findGridPath, type GridPathPoint, type GridPathRect } from '../games/chicken-farm/src/game/systems/pathing';

type WpmGrid = {
    readonly cellSize: number;
    readonly groundBlocked: readonly boolean[];
    readonly height: number;
    readonly width: number;
};

const CELL_SIZE = 32;
const PLAYER_CLEARANCE_PX = 8;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
    const grid = JSON.parse(
        await readFile(
            path.join(rootDir, 'games/chicken-farm/assets/data/wpm_pathing_grid.json'),
            'utf8',
        ),
    ) as WpmGrid;
    const world = { x: grid.width * grid.cellSize, y: grid.height * grid.cellSize };
    const terrainBounds = { height: world.y, width: world.x, x: 0, y: 0 };
    const blockedRects = getGroundBlockedRects(grid, terrainBounds);

    assert(!isInsideWorld({ x: -1, y: 0 }, world), 'negative x must be outside world');
    assert(!isInsideWorld({ x: 0, y: -1 }, world), 'negative y must be outside world');
    assert(!isInsideWorld({ x: world.x + 1, y: world.y }, world), 'x beyond world must be outside');
    assert(!isInsideWorld({ x: world.x, y: world.y + 1 }, world), 'y beyond world must be outside');
    assert(isGroundBlocked({ x: 4816, y: 10384 }, grid), 'known blocked target changed');

    const terrainPath = findGridPath({
        allowBlockedGoal: false,
        allowBlockedStart: false,
        blockedRects,
        bounds: getBounds({ x: 3776, y: 3392 }, { x: 6336, y: 3392 }, world),
        cellSize: CELL_SIZE,
        clearancePx: PLAYER_CLEARANCE_PX,
        goal: { x: 6336, y: 3392 },
        pathSmoothingEnabled: true,
        start: { x: 3776, y: 3392 },
    });
    assert(terrainPath && terrainPath.length > 0, 'player terrain route must be found');
    assertPathClear({ x: 3776, y: 3392 }, terrainPath, blockedRects, PLAYER_CLEARANCE_PX);

    const corridorBounds = { height: 160, width: 256, x: 0, y: 0 };
    const corridorBlockers = [
        { height: 32, width: 256, x: 0, y: 0 },
        { height: 64, width: 256, x: 0, y: 96 },
    ];
    const corridorStart = { x: 16, y: 64 };
    const corridorGoal = { x: 240, y: 64 };
    const passableCorridor = findGridPath({
        allowBlockedGoal: false,
        allowBlockedStart: false,
        blockedRects: corridorBlockers,
        bounds: corridorBounds,
        cellSize: CELL_SIZE,
        clearancePx: PLAYER_CLEARANCE_PX,
        goal: corridorGoal,
        pathSmoothingEnabled: true,
        start: corridorStart,
    });
    assert(passableCorridor && passableCorridor.length > 0, 'player must pass 64px corridor');
    assertPathClear(corridorStart, passableCorridor, corridorBlockers, PLAYER_CLEARANCE_PX);
    const blockedCorridor = findGridPath({
        allowBlockedGoal: false,
        allowBlockedStart: false,
        blockedRects: corridorBlockers,
        bounds: corridorBounds,
        cellSize: CELL_SIZE,
        clearancePx: 32,
        goal: corridorGoal,
        pathSmoothingEnabled: true,
        start: corridorStart,
    });
    assert(blockedCorridor === null, '32px clearance must reject 64px corridor');

    const offsets = Array.from({ length: 4 }, (_, unitIndex) =>
        getOffsetTargetPoint({
            canOccupy: () => true,
            offsetPx: 34,
            targetPoint: { x: 128, y: 128 },
            unitCount: 4,
            unitIndex,
            worldSize: world as Phaser.Math.Vector2,
        }),
    );
    assert(new Set(offsets.map((point) => `${point.x},${point.y}`)).size === 4, 'multi-unit offsets must be unique');
    assert(offsets.every((point) => isInsideWorld(point, world)), 'multi-unit offsets must stay in world');

    const payload = {
        checks: {
            blockedGoal: true,
            bounds: true,
            multiUnitOffsets: true,
            passableCorridor: true,
            rejectedClearanceCorridor: true,
            smoothingSegments: true,
            terrainRoute: true,
        },
        terrainWaypointCount: terrainPath.length,
    };
    const artifactPath = path.join(
        rootDir,
        'docs/chicken_farm/chicken_farm_w3x_artifacts/player_pathing_check.json',
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(JSON.stringify({ ...payload, artifactPath }, null, 2));
}

function getBounds(start: GridPathPoint, goal: GridPathPoint, world: { x: number; y: number }): GridPathRect {
    const padding = 512;
    const x = Math.max(0, Math.min(start.x, goal.x) - padding);
    const y = Math.max(0, Math.min(start.y, goal.y) - padding);
    return {
        height: Math.min(world.y, Math.max(start.y, goal.y) + padding) - y,
        width: Math.min(world.x, Math.max(start.x, goal.x) + padding) - x,
        x,
        y,
    };
}

function getGroundBlockedRects(grid: WpmGrid, bounds: GridPathRect) {
    const rects: GridPathRect[] = [];
    const minCol = Math.floor(bounds.x / grid.cellSize);
    const maxCol = Math.ceil((bounds.x + bounds.width) / grid.cellSize);
    const minRow = Math.floor(bounds.y / grid.cellSize);
    const maxRow = Math.ceil((bounds.y + bounds.height) / grid.cellSize);
    for (let row = minRow; row < maxRow; row += 1) {
        for (let col = minCol; col < maxCol; col += 1) {
            if (!grid.groundBlocked[row * grid.width + col]) continue;
            rects.push({ height: grid.cellSize, width: grid.cellSize, x: col * grid.cellSize, y: row * grid.cellSize });
        }
    }
    return rects;
}

function assertPathClear(start: GridPathPoint, path: readonly GridPathPoint[], blockers: readonly GridPathRect[], clearance: number) {
    const points = [start, ...path];
    for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8));
        for (let step = 1; step < steps; step += 1) {
            const ratio = step / steps;
            const point = { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
            assert(!blockers.some((rect) => point.x >= rect.x - clearance && point.x <= rect.x + rect.width + clearance && point.y >= rect.y - clearance && point.y <= rect.y + rect.height + clearance), 'smoothed segment crosses a blocker');
        }
    }
}

function isGroundBlocked(point: GridPathPoint, grid: WpmGrid) {
    const col = Math.max(0, Math.min(grid.width - 1, Math.floor(point.x / grid.cellSize)));
    const row = Math.max(0, Math.min(grid.height - 1, Math.floor(point.y / grid.cellSize)));
    return Boolean(grid.groundBlocked[row * grid.width + col]);
}

function isInsideWorld(point: GridPathPoint, world: { x: number; y: number }) {
    return point.x >= 0 && point.y >= 0 && point.x <= world.x && point.y <= world.y;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

void main();
