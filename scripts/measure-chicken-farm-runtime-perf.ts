import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';
import { VISIBILITY_OVERLAY } from '../games/chicken-farm/src/game/config';
import {
    COMBAT_GRID_PX,
    COMBAT_POC_LAYOUT,
    POC_FENCE_ID,
    POC_TOWER_ID,
} from '../games/chicken-farm/src/game/poc/combatPocLayout';
import {
    type GridPathPoint,
    type GridPathRect,
    findGridPath,
} from '../games/chicken-farm/src/game/systems/pathing';

type TiledMap = {
    readonly height: number;
    readonly layers: readonly TiledLayer[];
    readonly tileheight: number;
    readonly tilewidth: number;
    readonly width: number;
};

type TiledLayer = {
    readonly name: string;
    readonly objects?: readonly TiledObject[];
    readonly type: string;
};

type TiledObject = {
    readonly height?: number;
    readonly name?: string;
    readonly type?: string;
    readonly width?: number;
    readonly x?: number;
    readonly y?: number;
};

type WpmPathingGrid = {
    readonly buildBlocked: readonly boolean[];
    readonly cellSize: number;
    readonly groundBlocked: readonly boolean[];
    readonly height: number;
    readonly width: number;
};

type PlayerStart = {
    readonly id: number;
    readonly label: string;
    readonly x: number;
    readonly y: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const mapPath = path.join(
    rootDir,
    'games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json',
);
const wpmGridPath = path.join(
    rootDir,
    'games/chicken-farm/assets/data/wpm_pathing_grid.json',
);
const outputDir = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
);
const outputPath = path.join(outputDir, 'runtime_performance_debug_metrics.json');
const worldScale = 2;
const commandIterations = 5;
const loopIterations = 60;
const pathBoundsPaddingPx = 512;

async function main() {
    const map = JSON.parse(await readFile(mapPath, 'utf8')) as TiledMap;
    const grid = JSON.parse(await readFile(wpmGridPath, 'utf8')) as WpmPathingGrid;
    const worldSize = {
        x: map.width * map.tilewidth * worldScale,
        y: map.height * map.tileheight * worldScale,
    };
    const playerStarts = getPlayerStarts(map);
    const anchor = getPlayerStart(playerStarts, COMBAT_POC_LAYOUT.anchorSlotId);
    const dynamicBlockedRects = createCombatBlockedRects(anchor, worldSize);
    const pathScenarios = createPathScenarios(anchor, worldSize);
    const playerPathMetrics = pathScenarios.map((scenario) =>
        measureRepeated(`player.${scenario.id}`, commandIterations, () => {
            const bounds = getPathBounds([scenario.start, scenario.goal], worldSize);
            const blockedRects = [
                ...getGroundBlockedRects(grid, bounds),
                ...getRectsIntersectingBounds(dynamicBlockedRects, bounds),
            ];
            return findGridPath({
                blockedRects,
                bounds,
                cellSize: CHICKEN_FARM_BALANCE.pathing.cellSize,
                clearancePx: 8,
                goal: scenario.goal,
                maxIterations: 70000,
                pathSmoothingEnabled: true,
                start: scenario.start,
            });
        },
        ),
    );
    const wolfMetrics = measureWolfRepathCandidates({
        anchor,
        dynamicBlockedRects,
        grid,
        worldSize,
    });
    const wolfBlockedGoalRegression = measureWolfBlockedGoalRegression({
        anchor,
        dynamicBlockedRects,
        grid,
        worldSize,
    });
    const wolfBlockerPriorityRegression = measureWolfBlockerPriorityRegression();
    const fogLoopMetric = measureRepeated('fog.loop', loopIterations, () =>
        simulateFogLoop(anchor, worldSize),
    );
    const minimapLoopMetric = measureRepeated('minimap.loop', loopIterations, () =>
        simulateMinimapLoop(anchor, worldSize),
    );
    const payload = {
        generatedAt: new Date().toISOString(),
        parameters: {
            commandIterations,
            dynamicBlockedRectCount: dynamicBlockedRects.length,
            loopIterations,
            sourceMap: 'games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json',
            sourceWpmGrid: 'games/chicken-farm/assets/data/wpm_pathing_grid.json',
            pathBoundsPaddingPx,
            worldScale,
            worldSize,
        },
        metrics: {
            fogLoop: fogLoopMetric,
            minimapLoop: minimapLoopMetric,
            playerPathCommands: playerPathMetrics,
            wolfBlockerPriorityRegression,
            wolfBlockedGoalRegression,
            wolfRepath: wolfMetrics,
        },
        interpretation: {
            note: 'Node automation measures logic cost only. Browser-only Phaser Graphics draw cost still needs Playwright or manual runtime profiler overlay.',
            likelyRuntimeLabels: [
                'command.smart.total',
                'path.player.findGridPath',
                'path.wolf.findGridPath',
                'update.fog',
                'update.minimap',
            ],
        },
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

    console.table([
        ...playerPathMetrics.map((metric) => ({
            avgMs: metric.avgMs,
            id: metric.id,
            maxMs: metric.maxMs,
            minMs: metric.minMs,
        })),
        {
            avgMs: wolfMetrics.avgMs,
            id: wolfMetrics.id,
            maxMs: wolfMetrics.maxMs,
            minMs: wolfMetrics.minMs,
        },
        {
            avgMs: wolfBlockedGoalRegression.avgMs,
            id: wolfBlockedGoalRegression.id,
            maxMs: wolfBlockedGoalRegression.maxMs,
            minMs: wolfBlockedGoalRegression.minMs,
        },
        {
            avgMs: wolfBlockerPriorityRegression.avgMs,
            id: wolfBlockerPriorityRegression.id,
            maxMs: wolfBlockerPriorityRegression.maxMs,
            minMs: wolfBlockerPriorityRegression.minMs,
        },
        {
            avgMs: fogLoopMetric.avgMs,
            id: fogLoopMetric.id,
            maxMs: fogLoopMetric.maxMs,
            minMs: fogLoopMetric.minMs,
        },
        {
            avgMs: minimapLoopMetric.avgMs,
            id: minimapLoopMetric.id,
            maxMs: minimapLoopMetric.maxMs,
            minMs: minimapLoopMetric.minMs,
        },
    ]);
    console.log(`Wrote ${outputPath}`);
}

function measureRepeated<T>(id: string, iterations: number, run: () => T) {
    const samples: number[] = [];
    let lastResult: T | undefined;

    for (let i = 0; i < iterations; i += 1) {
        const startedAt = performance.now();
        lastResult = run();
        samples.push(performance.now() - startedAt);
    }

    const totalMs = samples.reduce((sum, sample) => sum + sample, 0);
    return {
        avgMs: round2(totalMs / iterations),
        id,
        iterations,
        maxMs: round2(Math.max(...samples)),
        minMs: round2(Math.min(...samples)),
        resultSummary: summarizeResult(lastResult),
        totalMs: round2(totalMs),
    };
}

function measureWolfRepathCandidates(config: {
    readonly anchor: PlayerStart;
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly grid: WpmPathingGrid;
    readonly worldSize: GridPathPoint;
}) {
    const layout = createCombatLayout(config.anchor, config.worldSize);
    const wolf = layout.wolf;
    const farm = layout.buildings.find((building) => building.id === 'farm_core');
    if (!farm) throw new Error('Missing farm_core in combat layout');

    const attackRange =
        CHICKEN_FARM_BALANCE.enemies.timber_wolf.attackRangePx ?? 34;
    const margin = Math.max(12, attackRange - 10);
    const candidates = [
        { x: farm.x, y: farm.y - farm.height / 2 - margin },
        { x: farm.x - farm.width / 2 - margin, y: farm.y },
        { x: farm.x + farm.width / 2 + margin, y: farm.y },
        { x: farm.x, y: farm.y + farm.height / 2 + margin },
    ];

    return measureRepeated('wolf.repath.candidates', commandIterations, () => {
        const bounds = getPathBounds([wolf, ...candidates], config.worldSize);
        const blockedRects = [
            ...getGroundBlockedRects(config.grid, bounds),
            ...getRectsIntersectingBounds(config.dynamicBlockedRects, bounds),
        ];
        const paths = [];

        for (const goal of candidates.slice(0, 4)) {
            const path = findGridPath({
                blockedRects,
                bounds,
                cellSize: CHICKEN_FARM_BALANCE.pathing.cellSize,
                clearancePx:
                    ((CHICKEN_FARM_BALANCE.pathing.unitClearanceCells.wolf - 1) *
                        CHICKEN_FARM_BALANCE.pathing.cellSize) /
                    2,
                goal,
                pathSmoothingEnabled: CHICKEN_FARM_BALANCE.pathing.pathSmoothingEnabled,
                start: wolf,
            });
            paths.push(path);
            if (path) break;
        }

        return paths;
    });
}

function measureWolfBlockerPriorityRegression() {
    return measureRepeated('wolf.blocker_line_priority', commandIterations, () => {
        const wolf = { x: 0, y: 0 };
        const target = { x: 120, y: 0 };
        const line = { from: wolf, to: target };
        const blockers = [
            {
                height: 10,
                id: 'near_offline_blocker',
                width: 10,
                x: 8,
                y: 24,
            },
            {
                height: 16,
                id: 'target_line_blocker',
                width: 16,
                x: 64,
                y: -8,
            },
        ];
        const lineBlockers = blockers
            .filter((blocker) => lineIntersectsRect(line, blocker))
            .sort(
                (a, b) =>
                    distance(wolf, rectCenter(a)) - distance(wolf, rectCenter(b)),
            );
        const closeBlockers = blockers
            .filter((blocker) => distance(wolf, rectCenter(blocker)) <= 80)
            .sort(
                (a, b) =>
                    distance(wolf, rectCenter(a)) - distance(wolf, rectCenter(b)),
            );
        const selected = lineBlockers[0] ?? closeBlockers[0] ?? null;

        return {
            pass: selected?.id === 'target_line_blocker',
            selectedId: selected?.id ?? null,
        };
    });
}

function measureWolfBlockedGoalRegression(config: {
    readonly anchor: PlayerStart;
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly grid: WpmPathingGrid;
    readonly worldSize: GridPathPoint;
}) {
    const layout = createCombatLayout(config.anchor, config.worldSize);
    const wolf = layout.wolf;
    const tower = layout.buildings.find((building) => building.id === 'tower_b');
    if (!tower) throw new Error('Missing tower_b in combat layout');

    return measureRepeated('wolf.blocked_tower_goal_rejected', commandIterations, () => {
        const goal = { x: tower.x, y: tower.y };
        const bounds = getPathBounds([wolf, goal], config.worldSize);
        const blockedRects = [
            ...getGroundBlockedRects(config.grid, bounds),
            ...getRectsIntersectingBounds(config.dynamicBlockedRects, bounds),
        ];
        const path = findGridPath({
            allowBlockedGoal: false,
            allowBlockedStart: false,
            blockedRects,
            bounds,
            cellSize: CHICKEN_FARM_BALANCE.pathing.cellSize,
            clearancePx:
                ((CHICKEN_FARM_BALANCE.pathing.unitClearanceCells.wolf - 1) *
                    CHICKEN_FARM_BALANCE.pathing.cellSize) /
                2,
            goal,
            pathSmoothingEnabled: CHICKEN_FARM_BALANCE.pathing.pathSmoothingEnabled,
            start: wolf,
        });

        return {
            pass: path === null,
            pathLength: path?.length ?? 0,
        };
    });
}

function getPathBounds(
    points: readonly GridPathPoint[],
    worldSize: GridPathPoint,
): GridPathRect {
    const minX = Math.max(
        0,
        Math.min(...points.map((point) => point.x)) - pathBoundsPaddingPx,
    );
    const minY = Math.max(
        0,
        Math.min(...points.map((point) => point.y)) - pathBoundsPaddingPx,
    );
    const maxX = Math.min(
        worldSize.x,
        Math.max(...points.map((point) => point.x)) + pathBoundsPaddingPx,
    );
    const maxY = Math.min(
        worldSize.y,
        Math.max(...points.map((point) => point.y)) + pathBoundsPaddingPx,
    );

    return {
        height: Math.max(CHICKEN_FARM_BALANCE.pathing.cellSize, maxY - minY),
        width: Math.max(CHICKEN_FARM_BALANCE.pathing.cellSize, maxX - minX),
        x: minX,
        y: minY,
    };
}

function getRectsIntersectingBounds(
    rects: readonly GridPathRect[],
    bounds: GridPathRect,
) {
    return rects.filter((rect) => {
        return (
            rect.x < bounds.x + bounds.width &&
            rect.x + rect.width > bounds.x &&
            rect.y < bounds.y + bounds.height &&
            rect.y + rect.height > bounds.y
        );
    });
}

function createPathScenarios(anchor: PlayerStart, worldSize: GridPathPoint) {
    const farmer = { x: anchor.x, y: anchor.y };
    const dog = { x: anchor.x + 42, y: anchor.y + 18 };
    return [
        {
            goal: clampPoint({ x: anchor.x + 640, y: anchor.y - 180 }, worldSize),
            id: 'farmer.short_defense_move',
            start: farmer,
        },
        {
            goal: clampPoint({ x: anchor.x - 560, y: anchor.y + 280 }, worldSize),
            id: 'farmer.blocker_edge_move',
            start: farmer,
        },
        {
            goal: clampPoint({ x: anchor.x + 720, y: anchor.y + 240 }, worldSize),
            id: 'dog.multi_select_offset_move',
            start: dog,
        },
    ];
}

function simulateFogLoop(player: GridPathPoint, worldSize: GridPathPoint) {
    const cols = Math.ceil(worldSize.x / VISIBILITY_OVERLAY.cellSize);
    const rows = Math.ceil(worldSize.y / VISIBILITY_OVERLAY.cellSize);
    let drawOps = 0;

    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const centerX =
                x * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
            const centerY =
                y * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
            const distance = Math.hypot(player.x - centerX, player.y - centerY);
            if (distance <= VISIBILITY_OVERLAY.revealRadiusPx) continue;
            drawOps += 1;
        }
    }

    return { cols, drawOps, rows };
}

function simulateMinimapLoop(player: GridPathPoint, worldSize: GridPathPoint) {
    const cols = Math.ceil(worldSize.x / VISIBILITY_OVERLAY.cellSize);
    const rows = Math.ceil(worldSize.y / VISIBILITY_OVERLAY.cellSize);
    const explored = new Set<string>();
    let drawOps = 0;

    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const centerX =
                x * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
            const centerY =
                y * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
            if (
                Math.hypot(player.x - centerX, player.y - centerY) <=
                VISIBILITY_OVERLAY.revealRadiusPx
            ) {
                explored.add(`${x}:${y}`);
            }
        }
    }

    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            if (!explored.has(`${x}:${y}`)) continue;
            drawOps += 1;
        }
    }

    return { cols, drawOps, exploredCells: explored.size, rows };
}

function createCombatBlockedRects(anchor: PlayerStart, worldSize: GridPathPoint) {
    return createCombatLayout(anchor, worldSize)
        .buildings.filter((building) => building.blocksPath)
        .map((building) => ({
            height: building.height,
            width: building.width,
            x: building.x - building.width / 2,
            y: building.y - building.height / 2,
        }));
}

function createCombatLayout(anchor: PlayerStart, worldSize: GridPathPoint) {
    const layout = COMBAT_POC_LAYOUT;
    const originX = snapToGrid(
        clamp(anchor.x + layout.originOffsetCells.x * COMBAT_GRID_PX, 64, worldSize.x - 1024),
    );
    const originY = snapToGrid(
        clamp(anchor.y + layout.originOffsetCells.y * COMBAT_GRID_PX, 64, worldSize.y - 1024),
    );
    const cellCenter = (cell: { readonly h: number; readonly w: number; readonly x: number; readonly y: number }) => ({
        x: originX + (cell.x + cell.w / 2) * COMBAT_GRID_PX,
        y: originY + (cell.y + cell.h / 2) * COMBAT_GRID_PX,
    });
    const towerTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID];
    const fenceTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_FENCE_ID];
    const buildings: {
        readonly blocksPath: boolean;
        readonly height: number;
        readonly id: string;
        readonly width: number;
        readonly x: number;
        readonly y: number;
    }[] = [];
    const farm = cellCenter(layout.farm);
    buildings.push({
        blocksPath: true,
        height: COMBAT_GRID_PX * layout.farm.h,
        id: 'farm_core',
        width: COMBAT_GRID_PX * layout.farm.w,
        x: farm.x,
        y: farm.y,
    });
    const addBuilding = (
        id: string,
        cell: { readonly h: number; readonly w: number; readonly x: number; readonly y: number },
        blocksPath: boolean,
    ) => {
        const position = cellCenter(cell);
        buildings.push({
            blocksPath,
            height: COMBAT_GRID_PX * cell.h,
            id,
            width: COMBAT_GRID_PX * cell.w,
            x: position.x,
            y: position.y,
        });
    };
    addBuilding('tower_a', layout.towerA, towerTemplate.blocksPath);
    addBuilding('tower_b', layout.towerB, towerTemplate.blocksPath);

    layout.fenceRows.forEach((row) => {
        for (let cellX = row.fromX; cellX <= row.toX; cellX += 2) {
            addBuilding(`${row.id}_${cellX}`, { h: 1, w: 2, x: cellX, y: row.y }, fenceTemplate.blocksPath);
        }
    });
    layout.fenceColumns.forEach((column) => {
        for (let cellY = column.fromY; cellY <= column.toY; cellY += 1) {
            addBuilding(`${column.id}_${cellY}`, { h: 1, w: 2, x: column.x, y: cellY }, fenceTemplate.blocksPath);
        }
    });
    layout.fenceSingles.forEach((fence) =>
        addBuilding(fence.id, { h: 1, w: 2, x: fence.x, y: fence.y }, fenceTemplate.blocksPath),
    );
    layout.stoneRows.forEach((row) => {
        for (let cellX = row.fromX; cellX <= row.toX; cellX += 2) {
            addBuilding(`${row.id}_${cellX}`, { h: 1, w: 2, x: cellX, y: row.y }, true);
        }
    });

    return {
        buildings,
        wolf: cellCenter(layout.wolf),
    };
}

function getGroundBlockedRects(
    grid: WpmPathingGrid,
    bounds: GridPathRect,
): readonly GridPathRect[] {
    const start = worldToCell(bounds.x, bounds.y, grid);
    const end = worldToCell(
        bounds.x + bounds.width - 1,
        bounds.y + bounds.height - 1,
        grid,
    );
    const rects: GridPathRect[] = [];

    for (let row = start.row; row <= end.row; row += 1) {
        for (let col = start.col; col <= end.col; col += 1) {
            const index = row * grid.width + col;
            if (!grid.groundBlocked[index]) continue;
            rects.push({
                height: grid.cellSize,
                width: grid.cellSize,
                x: col * grid.cellSize,
                y: row * grid.cellSize,
            });
        }
    }

    return rects;
}

function getPlayerStarts(map: TiledMap): readonly PlayerStart[] {
    const layer = map.layers.find((candidate) => candidate.name === 'farm_zones');
    if (!layer?.objects) return [];

    return layer.objects
        .filter((object) => object.type === 'farm_zone' && object.name)
        .map((object) => {
            const match = /^farm_p(\d+)$/u.exec(String(object.name));
            if (!match) return null;
            const width = (object.width ?? 16) * worldScale;
            const height = (object.height ?? 16) * worldScale;
            return {
                id: Number(match[1]),
                label: `P${match[1]}`,
                x: (object.x ?? 0) * worldScale + width / 2,
                y: (object.y ?? 0) * worldScale + height / 2,
            };
        })
        .filter((start): start is PlayerStart => Boolean(start));
}

function getPlayerStart(starts: readonly PlayerStart[], id: number) {
    const start = starts.find((candidate) => candidate.id === id);
    if (!start) throw new Error(`Missing player start P${id}`);
    return start;
}

function worldToCell(worldX: number, worldY: number, grid: WpmPathingGrid) {
    return {
        col: clamp(Math.floor(worldX / grid.cellSize), 0, grid.width - 1),
        row: clamp(Math.floor(worldY / grid.cellSize), 0, grid.height - 1),
    };
}

function clampPoint(point: GridPathPoint, worldSize: GridPathPoint) {
    return {
        x: clamp(point.x, 0, worldSize.x),
        y: clamp(point.y, 0, worldSize.y),
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function snapToGrid(value: number) {
    return Math.round(value / COMBAT_GRID_PX) * COMBAT_GRID_PX;
}

function summarizeResult(result: unknown) {
    if (Array.isArray(result)) {
        return {
            arrayLength: result.length,
            nestedLengths: result.map((item) => (Array.isArray(item) ? item.length : null)),
        };
    }

    return result;
}

function rectCenter(rect: GridPathRect) {
    return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
    };
}

function distance(a: GridPathPoint, b: GridPathPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function lineIntersectsRect(
    line: { readonly from: GridPathPoint; readonly to: GridPathPoint },
    rect: GridPathRect,
) {
    if (pointInRect(line.from, rect) || pointInRect(line.to, rect)) return true;

    const rectLines = [
        {
            from: { x: rect.x, y: rect.y },
            to: { x: rect.x + rect.width, y: rect.y },
        },
        {
            from: { x: rect.x + rect.width, y: rect.y },
            to: { x: rect.x + rect.width, y: rect.y + rect.height },
        },
        {
            from: { x: rect.x + rect.width, y: rect.y + rect.height },
            to: { x: rect.x, y: rect.y + rect.height },
        },
        {
            from: { x: rect.x, y: rect.y + rect.height },
            to: { x: rect.x, y: rect.y },
        },
    ];

    return rectLines.some((rectLine) => linesIntersect(line, rectLine));
}

function pointInRect(point: GridPathPoint, rect: GridPathRect) {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    );
}

function linesIntersect(
    a: { readonly from: GridPathPoint; readonly to: GridPathPoint },
    b: { readonly from: GridPathPoint; readonly to: GridPathPoint },
) {
    const d1 = direction(a.from, a.to, b.from);
    const d2 = direction(a.from, a.to, b.to);
    const d3 = direction(b.from, b.to, a.from);
    const d4 = direction(b.from, b.to, a.to);

    return d1 * d2 <= 0 && d3 * d4 <= 0;
}

function direction(a: GridPathPoint, b: GridPathPoint, c: GridPathPoint) {
    return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x);
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

await main();
