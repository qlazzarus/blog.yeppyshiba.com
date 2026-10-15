import { CHICKEN_FARM_BALANCE } from './balance';
import type { GridPathRect } from './systems/pathing';
import type { WaveSpawnRect } from './waveSpawnManifest';

export type WaveSpawnPoint = {
    readonly x: number;
    readonly y: number;
};

export type WaveSpawnWorldSize = {
    readonly height: number;
    readonly width: number;
};

export type WaveSpawnRejectionReason =
    | 'dynamic_blocker'
    | 'outside_world'
    | 'rect_too_small_for_clearance'
    | 'terrain_blocker';

export type WaveSpawnAttempt = {
    readonly candidate?: WaveSpawnPoint;
    readonly rectId: string;
    readonly reason: WaveSpawnRejectionReason;
};

export type WaveSpawnSelection = {
    readonly attempts: readonly WaveSpawnAttempt[];
    readonly candidate: WaveSpawnPoint;
    readonly footprint: GridPathRect;
    readonly rect: WaveSpawnRect;
};

export type WaveSpawnSelectionConfig = {
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly isTerrainFootprintBlocked: (footprint: GridPathRect) => boolean;
    readonly maxAttemptsPerRect?: number;
    readonly random?: () => number;
    readonly rects: readonly WaveSpawnRect[];
    readonly wolfClearancePx?: number;
    readonly worldSize: WaveSpawnWorldSize;
};

const defaultMaxAttemptsPerRect = 4;

export const WOLF_SPAWN_CLEARANCE_PX =
    ((CHICKEN_FARM_BALANCE.pathing.unitClearanceCells.wolf - 1) *
        CHICKEN_FARM_BALANCE.pathing.cellSize) /
    2;

/**
 * Selects only from the original W3X spawn rects. It never substitutes a farm
 * position when placement fails; the scheduler can retry on its next tick.
 */
export function selectWaveSpawnPoint(
    config: WaveSpawnSelectionConfig,
): WaveSpawnSelection | null {
    const random = config.random ?? Math.random;
    const maxAttempts = Math.max(1, Math.floor(config.maxAttemptsPerRect ?? defaultMaxAttemptsPerRect));
    const clearance = config.wolfClearancePx ?? WOLF_SPAWN_CLEARANCE_PX;
    const attempts: WaveSpawnAttempt[] = [];
    if (!config.rects.length || !isFiniteNonNegative(clearance)) return null;

    const startIndex = Math.floor(normalizeRandom(random()) * config.rects.length);
    for (let offset = 0; offset < config.rects.length; offset += 1) {
        const rect = config.rects[(startIndex + offset) % config.rects.length];
        const inner = insetRect(rect.world, clearance);
        if (!inner) {
            attempts.push({ rectId: rect.id, reason: 'rect_too_small_for_clearance' });
            continue;
        }

        for (let candidateIndex = 0; candidateIndex < maxAttempts; candidateIndex += 1) {
            const candidate = {
                x: lerp(inner.minX, inner.maxX, normalizeRandom(random())),
                y: lerp(inner.minY, inner.maxY, normalizeRandom(random())),
            };
            const footprint = toFootprint(candidate, clearance);
            const reason = getRejectionReason(footprint, config);
            if (reason) {
                attempts.push({ candidate, rectId: rect.id, reason });
                continue;
            }

            return { attempts, candidate, footprint, rect };
        }
    }

    return null;
}

function getRejectionReason(
    footprint: GridPathRect,
    config: WaveSpawnSelectionConfig,
): WaveSpawnRejectionReason | null {
    if (!isFootprintInsideWorld(footprint, config.worldSize)) return 'outside_world';
    if (config.isTerrainFootprintBlocked(footprint)) return 'terrain_blocker';
    if (config.dynamicBlockedRects.some((blocker) => rectsIntersect(footprint, blocker))) {
        return 'dynamic_blocker';
    }
    return null;
}

function insetRect(
    rect: WaveSpawnRect['world'],
    clearance: number,
): WaveSpawnRect['world'] | null {
    const minX = rect.minX + clearance;
    const minY = rect.minY + clearance;
    const maxX = rect.maxX - clearance;
    const maxY = rect.maxY - clearance;
    return minX <= maxX && minY <= maxY ? { maxX, maxY, minX, minY } : null;
}

function toFootprint(point: WaveSpawnPoint, clearance: number): GridPathRect {
    return {
        height: clearance * 2,
        width: clearance * 2,
        x: point.x - clearance,
        y: point.y - clearance,
    };
}

function isFootprintInsideWorld(
    footprint: GridPathRect,
    world: WaveSpawnWorldSize,
): boolean {
    return (
        footprint.x >= 0 &&
        footprint.y >= 0 &&
        footprint.x + footprint.width <= world.width &&
        footprint.y + footprint.height <= world.height
    );
}

function rectsIntersect(a: GridPathRect, b: GridPathRect): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function normalizeRandom(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 0.9999999999999999);
}

function isFiniteNonNegative(value: number): boolean {
    return Number.isFinite(value) && value >= 0;
}

function lerp(min: number, max: number, amount: number): number {
    return min + (max - min) * amount;
}
