import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';
import {
    TERRAIN_PATHING_PROBES,
    getTerrainPathingProbeBounds,
    type TerrainPathingProbe,
} from '../games/chicken-farm/src/game/poc/terrainPathingPocLayout';
import {
    type GridPathPoint,
    type GridPathRect,
    findGridPath,
} from '../games/chicken-farm/src/game/systems/pathing';

type WpmPathingGrid = {
    readonly cellSize: number;
    readonly groundBlocked: readonly boolean[];
    readonly height: number;
    readonly width: number;
};

type PathingMetrics = {
    readonly blockedWaypointCount: number;
    readonly expectedTravelSec: number;
    readonly minClearanceCells: number | null;
    readonly pathComputeMs: number;
    readonly pathDistance: number;
    readonly pathFound: boolean;
    readonly pathSegmentBlockedHits: number;
    readonly detourRatio: number | null;
    readonly turnCount: number;
    readonly waypointCount: number;
};

type ProbeMetrics = {
    readonly direct: {
        readonly blockedHits: number;
        readonly blockedPct: number;
        readonly distance: number;
        readonly maxBlockedRun: number;
    };
    readonly label: string;
    readonly probeId: string;
    readonly raw: PathingMetrics;
    readonly smoothed: PathingMetrics;
    readonly smoothingDelta: {
        readonly detourRatioDelta: number | null;
        readonly distanceDelta: number;
        readonly expectedTravelSecDelta: number;
        readonly turnReduction: number;
        readonly waypointReduction: number;
        readonly waypointReductionPct: number | null;
    };
    readonly start: GridPathPoint;
    readonly target: GridPathPoint;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const wpmGridPath = path.join(
    rootDir,
    'games/chicken-farm/assets/data/wpm_pathing_grid.json',
);
const outputDir = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts',
);
const outputPath = path.join(outputDir, 'terrain_pathing_poc_metrics.json');

async function main() {
    const grid = JSON.parse(await readFile(wpmGridPath, 'utf8')) as WpmPathingGrid;
    const metrics = TERRAIN_PATHING_PROBES.map((probe) =>
        measureProbe(probe, grid),
    );
    const payload = {
        generatedAt: new Date().toISOString(),
        parameters: {
            cellSize: CHICKEN_FARM_BALANCE.pathing.cellSize,
            clearancePx:
                ((CHICKEN_FARM_BALANCE.pathing.unitClearanceCells.wolf - 1) *
                    CHICKEN_FARM_BALANCE.pathing.cellSize) /
                2,
            directSampleStepPx: CHICKEN_FARM_BALANCE.pathing.cellSize / 2,
            sourceGrid: 'games/chicken-farm/assets/data/wpm_pathing_grid.json',
            wolfSpeedPxPerSec:
                CHICKEN_FARM_BALANCE.enemies.timber_wolf.speedPxPerSec,
        },
        metrics,
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

    console.table(
        metrics.map((metric) => ({
            id: metric.probeId,
            directBlockedHits: metric.direct.blockedHits,
            rawViolations: metric.raw.blockedWaypointCount,
            smoothViolations: metric.smoothed.blockedWaypointCount,
            smoothSegmentHits: metric.smoothed.pathSegmentBlockedHits,
            rawDetour: metric.raw.detourRatio,
            smoothDetour: metric.smoothed.detourRatio,
            waypointReduction: metric.smoothingDelta.waypointReduction,
            waypointReductionPct: metric.smoothingDelta.waypointReductionPct,
            turnReduction: metric.smoothingDelta.turnReduction,
            smoothComputeMs: metric.smoothed.pathComputeMs,
        })),
    );
    console.log(`Wrote ${outputPath}`);
}

function measureProbe(
    probe: TerrainPathingProbe,
    grid: WpmPathingGrid,
): ProbeMetrics {
    const pathing = CHICKEN_FARM_BALANCE.pathing;
    const bounds = getTerrainPathingProbeBounds(probe);
    const blockedRects = getGroundBlockedRects(grid, bounds);
    const clearancePx =
        ((pathing.unitClearanceCells.wolf - 1) * pathing.cellSize) / 2;
    const directDistance = distance(probe.start, probe.target);
    const directStats = measureDirectBlockedSamples(probe, grid);
    const raw = measurePathVariant({
        blockedRects,
        bounds,
        clearancePx,
        directDistance,
        grid,
        pathSmoothingEnabled: false,
        probe,
    });
    const smoothed = measurePathVariant({
        blockedRects,
        bounds,
        clearancePx,
        directDistance,
        grid,
        pathSmoothingEnabled: true,
        probe,
    });

    return {
        direct: {
            blockedHits: directStats.blockedHits,
            blockedPct: directStats.blockedPct,
            distance: round2(directDistance),
            maxBlockedRun: directStats.maxBlockedRun,
        },
        label: probe.label,
        probeId: probe.id,
        raw,
        smoothed,
        smoothingDelta: {
            detourRatioDelta:
                raw.detourRatio !== null && smoothed.detourRatio !== null
                    ? round2(smoothed.detourRatio - raw.detourRatio)
                    : null,
            distanceDelta: round2(smoothed.pathDistance - raw.pathDistance),
            expectedTravelSecDelta: round2(
                smoothed.expectedTravelSec - raw.expectedTravelSec,
            ),
            turnReduction: raw.turnCount - smoothed.turnCount,
            waypointReduction: raw.waypointCount - smoothed.waypointCount,
            waypointReductionPct:
                raw.waypointCount > 0
                    ? round2(
                          ((raw.waypointCount - smoothed.waypointCount) /
                              raw.waypointCount) *
                              100,
                      )
                    : null,
        },
        start: probe.start,
        target: probe.target,
    };
}

function measurePathVariant(config: {
    readonly blockedRects: readonly GridPathRect[];
    readonly bounds: GridPathRect;
    readonly clearancePx: number;
    readonly directDistance: number;
    readonly grid: WpmPathingGrid;
    readonly pathSmoothingEnabled: boolean;
    readonly probe: TerrainPathingProbe;
}): PathingMetrics {
    const pathing = CHICKEN_FARM_BALANCE.pathing;
    const startedAt = performance.now();
    const path =
        findGridPath({
            blockedRects: config.blockedRects,
            bounds: config.bounds,
            cellSize: pathing.cellSize,
            clearancePx: config.clearancePx,
            goal: config.probe.target,
            pathSmoothingEnabled: config.pathSmoothingEnabled,
            start: config.probe.start,
        }) ?? [];
    const pathComputeMs = performance.now() - startedAt;
    const pathDistance = measurePathDistance(config.probe.start, path);
    const blockedWaypointCount = path.filter((point) =>
        isPointBlockedWithClearance(point, config.grid, config.clearancePx),
    ).length;
    const minClearanceCells =
        path.length > 0
            ? round2(
                  Math.min(
                      ...path.map((point) =>
                          getMinBlockedDistance(point, config.grid),
                      ),
                  ) / pathing.cellSize,
              )
            : null;

    return {
        blockedWaypointCount,
        expectedTravelSec: round2(
            pathDistance / CHICKEN_FARM_BALANCE.enemies.timber_wolf.speedPxPerSec,
        ),
        minClearanceCells,
        pathComputeMs: round2(pathComputeMs),
        pathDistance: round2(pathDistance),
        pathSegmentBlockedHits: measurePathSegmentBlockedHits(
            config.probe.start,
            path,
            config.grid,
            config.clearancePx,
        ),
        pathFound: path.length > 0,
        detourRatio:
            path.length > 0 ? round2(pathDistance / config.directDistance) : null,
        turnCount: countTurns([config.probe.start, ...path]),
        waypointCount: path.length,
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

function measureDirectBlockedSamples(
    probe: TerrainPathingProbe,
    grid: WpmPathingGrid,
) {
    const directDistance = distance(probe.start, probe.target);
    const sampleStep = CHICKEN_FARM_BALANCE.pathing.cellSize / 2;
    const steps = Math.max(1, Math.ceil(directDistance / sampleStep));
    let blockedHits = 0;
    let currentRun = 0;
    let maxBlockedRun = 0;

    for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps;
        const point = {
            x: probe.start.x + (probe.target.x - probe.start.x) * ratio,
            y: probe.start.y + (probe.target.y - probe.start.y) * ratio,
        };
        if (isPointGroundBlocked(point, grid)) {
            blockedHits += 1;
            currentRun += 1;
            maxBlockedRun = Math.max(maxBlockedRun, currentRun);
        } else {
            currentRun = 0;
        }
    }

    return {
        blockedHits,
        blockedPct: round2((blockedHits / (steps + 1)) * 100),
        maxBlockedRun,
    };
}

function isPointBlockedWithClearance(
    point: GridPathPoint,
    grid: WpmPathingGrid,
    clearancePx: number,
) {
    const center = worldToCell(point.x, point.y, grid);
    const cellRadius = Math.ceil(clearancePx / grid.cellSize);

    for (let row = center.row - cellRadius; row <= center.row + cellRadius; row += 1) {
        for (
            let col = center.col - cellRadius;
            col <= center.col + cellRadius;
            col += 1
        ) {
            if (col < 0 || row < 0 || col >= grid.width || row >= grid.height) {
                continue;
            }

            if (!grid.groundBlocked[row * grid.width + col]) continue;
            const rect = {
                height: grid.cellSize,
                width: grid.cellSize,
                x: col * grid.cellSize,
                y: row * grid.cellSize,
            };
            if (distanceToRect(point, rect) <= clearancePx) return true;
        }
    }

    return false;
}

function isPointGroundBlocked(point: GridPathPoint, grid: WpmPathingGrid) {
    const { col, row } = worldToCell(point.x, point.y, grid);
    return Boolean(grid.groundBlocked[row * grid.width + col]);
}

function getMinBlockedDistance(point: GridPathPoint, grid: WpmPathingGrid) {
    let minDistance = Number.POSITIVE_INFINITY;

    for (let row = 0; row < grid.height; row += 1) {
        for (let col = 0; col < grid.width; col += 1) {
            if (!grid.groundBlocked[row * grid.width + col]) continue;
            const rect = {
                height: grid.cellSize,
                width: grid.cellSize,
                x: col * grid.cellSize,
                y: row * grid.cellSize,
            };
            minDistance = Math.min(minDistance, distanceToRect(point, rect));
        }
    }

    return minDistance;
}

function measurePathDistance(start: GridPathPoint, path: readonly GridPathPoint[]) {
    return [start, ...path].reduce((sum, point, index, points) => {
        const previous = points[index - 1];
        return previous ? sum + distance(previous, point) : sum;
    }, 0);
}

function measurePathSegmentBlockedHits(
    start: GridPathPoint,
    path: readonly GridPathPoint[],
    grid: WpmPathingGrid,
    clearancePx: number,
) {
    const points = [start, ...path];
    const sampleStep = CHICKEN_FARM_BALANCE.pathing.cellSize / 2;
    let hits = 0;

    for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const segmentDistance = distance(from, to);
        const steps = Math.max(1, Math.ceil(segmentDistance / sampleStep));

        for (let step = 1; step < steps; step += 1) {
            const ratio = step / steps;
            const point = {
                x: from.x + (to.x - from.x) * ratio,
                y: from.y + (to.y - from.y) * ratio,
            };
            if (isPointBlockedWithClearance(point, grid, clearancePx)) hits += 1;
        }
    }

    return hits;
}

function countTurns(points: readonly GridPathPoint[]) {
    let turns = 0;
    let previousDirection = '';

    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const direction = `${Math.sign(current.x - previous.x)},${Math.sign(
            current.y - previous.y,
        )}`;
        if (previousDirection && direction !== previousDirection) turns += 1;
        previousDirection = direction;
    }

    return turns;
}

function distance(a: GridPathPoint, b: GridPathPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToRect(point: GridPathPoint, rect: GridPathRect) {
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
    return Math.hypot(dx, dy);
}

function worldToCell(worldX: number, worldY: number, grid: WpmPathingGrid) {
    return {
        col: clamp(Math.floor(worldX / grid.cellSize), 0, grid.width - 1),
        row: clamp(Math.floor(worldY / grid.cellSize), 0, grid.height - 1),
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
    return Number(value.toFixed(2));
}

await main();
