import type { GridPathRect } from './systems/pathing';

export type OrdinarySummonSpawnPoint = { readonly x: number; readonly y: number };

const OFFSETS: readonly OrdinarySummonSpawnPoint[] = [
    { x: 0, y: 0 }, { x: 32, y: 0 }, { x: -32, y: 0 }, { x: 0, y: 32 }, { x: 0, y: -32 },
    { x: 32, y: 32 }, { x: -32, y: 32 }, { x: 32, y: -32 }, { x: -32, y: -32 },
];
const CLEARANCE_PX = 16;

export function selectOrdinarySummonSpawnPoint(input: {
    readonly corpse: OrdinarySummonSpawnPoint;
    readonly dynamicBlockedRects: readonly GridPathRect[];
    readonly isTerrainFootprintBlocked: (footprint: GridPathRect) => boolean;
    readonly worldSize: { readonly height: number; readonly width: number };
}): OrdinarySummonSpawnPoint | null {
    for (const offset of OFFSETS) {
        const candidate = { x: input.corpse.x + offset.x, y: input.corpse.y + offset.y };
        const footprint = {
            height: CLEARANCE_PX * 2,
            width: CLEARANCE_PX * 2,
            x: candidate.x - CLEARANCE_PX,
            y: candidate.y - CLEARANCE_PX,
        };
        if (
            footprint.x < 0 || footprint.y < 0 ||
            footprint.x + footprint.width > input.worldSize.width ||
            footprint.y + footprint.height > input.worldSize.height ||
            input.isTerrainFootprintBlocked(footprint) ||
            input.dynamicBlockedRects.some((blocker) => intersects(footprint, blocker))
        ) continue;
        return candidate;
    }
    return null;
}

function intersects(left: GridPathRect, right: GridPathRect) {
    return left.x < right.x + right.width && left.x + left.width > right.x &&
        left.y < right.y + right.height && left.y + left.height > right.y;
}
