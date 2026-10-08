import {
    w3xPositionToPhaserWorld,
    type PlacementPoint,
} from './initialPlacementManifest';

export type WaveSpawnSourceRect = {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
};

export type WaveSpawnRect = {
    readonly id: string;
    readonly source: WaveSpawnSourceRect;
    readonly sourceLine: number;
    readonly sourceRectSymbol: string;
    readonly world: WaveSpawnSourceRect;
};

function normalizeRect(min: PlacementPoint, max: PlacementPoint): WaveSpawnSourceRect {
    return {
        maxX: Math.max(min.x, max.x),
        maxY: Math.max(min.y, max.y),
        minX: Math.min(min.x, max.x),
        minY: Math.min(min.y, max.y),
    };
}

export function w3xRectToPhaserWorld(rect: WaveSpawnSourceRect): WaveSpawnSourceRect {
    return normalizeRect(
        w3xPositionToPhaserWorld({ x: rect.minX, y: rect.minY }),
        w3xPositionToPhaserWorld({ x: rect.maxX, y: rect.maxY }),
    );
}

function waveSpawnRect(
    id: string,
    sourceRectSymbol: string,
    sourceLine: number,
    source: WaveSpawnSourceRect,
): WaveSpawnRect {
    return {
        id,
        source,
        sourceLine,
        sourceRectSymbol,
        world: w3xRectToPhaserWorld(source),
    };
}

// These are the 13 JASS rects that register Player(10) wolf spawn entry.
// Their source coordinates are retained so later selection never treats tilemap
// object markers as the authoritative spawn region.
export const WAVE_SPAWN_MANIFEST: readonly WaveSpawnRect[] = [
    waveSpawnRect('wolf_spawn_rect_01', 'lili', 1244, { maxX: -1408, maxY: 1088, minX: -1600, minY: 896 }),
    waveSpawnRect('wolf_spawn_rect_02', 'llIi', 1245, { maxX: 2112, maxY: 1024, minX: 1920, minY: 832 }),
    waveSpawnRect('wolf_spawn_rect_03', 'llii', 1246, { maxX: 4128, maxY: -1536, minX: 3936, minY: -1728 }),
    waveSpawnRect('wolf_spawn_rect_04', 'llli', 1247, { maxX: 4928, maxY: 1184, minX: 4736, minY: 992 }),
    waveSpawnRect('wolf_spawn_rect_05', 'IIIII', 1248, { maxX: 256, maxY: -1088, minX: 64, minY: -1280 }),
    waveSpawnRect('wolf_spawn_rect_06', 'IIIiI', 1249, { maxX: -1600, maxY: -1728, minX: -1792, minY: -1920 }),
    waveSpawnRect('wolf_spawn_rect_07', 'IIIlI', 1250, { maxX: 6720, maxY: -1984, minX: 6528, minY: -2176 }),
    waveSpawnRect('wolf_spawn_rect_08', 'IIiII', 1251, { maxX: -1632, maxY: -4160, minX: -1824, minY: -4352 }),
    waveSpawnRect('wolf_spawn_rect_09', 'IIiiI', 1252, { maxX: 448, maxY: -5312, minX: 256, minY: -5504 }),
    waveSpawnRect('wolf_spawn_rect_10', 'IIilI', 1253, { maxX: 4416, maxY: -4800, minX: 4224, minY: -4992 }),
    waveSpawnRect('wolf_spawn_rect_11', 'IIlII', 1254, { maxX: -1376, maxY: -6208, minX: -1568, minY: -6400 }),
    waveSpawnRect('wolf_spawn_rect_12', 'IIliI', 1255, { maxX: 2496, maxY: -5920, minX: 2304, minY: -6112 }),
    waveSpawnRect('wolf_spawn_rect_13', 'IIllI', 1256, { maxX: 5632, maxY: -5952, minX: 5440, minY: -6144 }),
] as const;
