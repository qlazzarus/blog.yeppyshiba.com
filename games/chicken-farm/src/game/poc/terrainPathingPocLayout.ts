import type { GridPathPoint, GridPathRect } from '../systems/pathing';

export type TerrainPathingProbe = {
    readonly id: string;
    readonly label: string;
    readonly start: GridPathPoint;
    readonly target: GridPathPoint;
};

export const TERRAIN_PATHING_POC_BOUNDS_PADDING = 768;

export const TERRAIN_PATHING_PROBES: readonly TerrainPathingProbe[] = [
    {
        id: 'micro_a',
        label: 'Terrain path A',
        start: { x: 3776, y: 4800 },
        target: { x: 6336, y: 4800 },
    },
    {
        id: 'micro_b',
        label: 'Terrain path B',
        start: { x: 3776, y: 3392 },
        target: { x: 6336, y: 3392 },
    },
];

export function getTerrainPathingProbeBounds(
    probe: TerrainPathingProbe,
): GridPathRect {
    const padding = TERRAIN_PATHING_POC_BOUNDS_PADDING;
    const minX = Math.min(probe.start.x, probe.target.x) - padding;
    const minY = Math.min(probe.start.y, probe.target.y) - padding;
    const maxX = Math.max(probe.start.x, probe.target.x) + padding;
    const maxY = Math.max(probe.start.y, probe.target.y) + padding;

    return {
        height: maxY - minY,
        width: maxX - minX,
        x: minX,
        y: minY,
    };
}
