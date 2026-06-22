export const POC_WOLF_ID = 'timber_wolf';
export const POC_FENCE_ID = 'fence_wood';
export const POC_TOWER_ID = 'tower_scout';
export const POC_PATH_BOUNDS_PADDING = 512;
export const POC_TOWER_FOCUS_LOCK_SEC = 0.45;
export const POC_WOLF_COUNT = 5;
export const POC_WOLF_SPAWN_SPACING_PX = 26;
export const COMBAT_GRID_PX = 32;

type CombatPocFenceRow = {
    readonly fromX: number;
    readonly id: string;
    readonly toX: number;
    readonly y: number;
};

type CombatPocFenceColumn = {
    readonly fromY: number;
    readonly id: string;
    readonly toY: number;
    readonly x: number;
};

type CombatPocSingleCell = {
    readonly id: string;
    readonly x: number;
    readonly y: number;
};

type CombatPocStoneRow = {
    readonly fromX: number;
    readonly id: string;
    readonly toX: number;
    readonly y: number;
};

export type CombatPocLayout = {
    readonly anchorSlotId: number;
    readonly farm: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly fenceColumns: readonly CombatPocFenceColumn[];
    readonly fenceRows: readonly CombatPocFenceRow[];
    readonly fenceSingles: readonly CombatPocSingleCell[];
    readonly label: string;
    readonly originOffsetCells: { readonly x: number; readonly y: number };
    readonly stoneRows: readonly CombatPocStoneRow[];
    readonly towerA: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly towerB: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly wolf: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
};

// Pre-scale backup. It matched the entrance feel, but h00D's original 650 range
// caused the two scout tower ranges to overlap heavily.
export const COMBAT_POC_COMPACT_LAYOUT_BACKUP: CombatPocLayout = {
    anchorSlotId: 3,
    farm: { h: 2, w: 3, x: -3, y: 11 },
    fenceColumns: [
        { fromY: 3, id: 'fence_left', toY: 15, x: 4 },
        { fromY: 2, id: 'fence_right', toY: 6, x: 19 },
        { fromY: 7, id: 'fence_inner_turn', toY: 13, x: 8 },
        { fromY: 10, id: 'fence_inner_turn', toY: 15, x: 12 },
        { fromY: 7, id: 'fence_inner_turn', toY: 13, x: 16 },
        { fromY: 10, id: 'fence_inner_turn', toY: 15, x: 20 },
    ],
    fenceRows: [
        { fromX: 4, id: 'fence_top', toX: 19, y: 2 },
        { fromX: 8, id: 'fence_inner_bottom', toX: 19, y: 7 },
    ],
    fenceSingles: [{ id: 'fence_tower_a_right', x: 4, y: 12 }],
    label: 'p3-lower-left-defense-backup',
    originOffsetCells: { x: -13, y: -1 },
    stoneRows: [{ fromX: 0, id: 'stone_bottom_lock', toX: 22, y: 16 }],
    towerA: { h: 2, w: 2, x: 1, y: 11 },
    towerB: { h: 2, w: 2, x: 16, y: 4 },
    wolf: { h: 1, w: 1, x: 22, y: 9 },
};

// Expanded lower-left defense PoC. Coordinates are 32px minor cells.
// The two h00D scout towers are separated by about 1374px, so their original
// 650px attack ranges no longer overlap.
export const COMBAT_POC_LAYOUT: CombatPocLayout = {
    anchorSlotId: 3,
    farm: { h: 2, w: 3, x: -3, y: 24 },
    fenceColumns: [
        { fromY: 3, id: 'fence_left', toY: 30, x: 4 },
        { fromY: 2, id: 'fence_right', toY: 12, x: 43 },
        { fromY: 16, id: 'fence_inner_turn', toY: 30, x: 12 },
        { fromY: 14, id: 'fence_inner_turn', toY: 25, x: 20 },
        { fromY: 16, id: 'fence_inner_turn', toY: 30, x: 28 },
        { fromY: 14, id: 'fence_inner_turn', toY: 25, x: 36 },
    ],
    fenceRows: [
        { fromX: 4, id: 'fence_top', toX: 43, y: 2 },
        { fromX: 12, id: 'fence_inner_bottom', toX: 43, y: 13 },
    ],
    fenceSingles: [{ id: 'fence_tower_a_right', x: 4, y: 25 }],
    label: 'p3-lower-left-defense-expanded-range',
    originOffsetCells: { x: -13, y: -1 },
    stoneRows: [{ fromX: 0, id: 'stone_bottom_lock', toX: 60, y: 31 }],
    towerA: { h: 2, w: 2, x: 1, y: 24 },
    towerB: { h: 2, w: 2, x: 39, y: 4 },
    wolf: { h: 1, w: 1, x: 48, y: 16 },
};
