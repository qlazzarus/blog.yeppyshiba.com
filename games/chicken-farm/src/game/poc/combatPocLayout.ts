export const POC_WOLF_ID = 'timber_wolf';
export const POC_FENCE_ID = 'fence_wood';
export const POC_TOWER_ID = 'tower_scout';
export const POC_PATH_BOUNDS_PADDING = 512;
export const POC_TOWER_FOCUS_LOCK_SEC = 2.25;
export const POC_WOLF_COUNT = 5;
export const POC_WOLF_SPAWN_SPACING_PX = 26;
export const COMBAT_GRID_PX = 32;

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
    readonly fences: readonly CombatPocSingleCell[];
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

// Compact lower-left defense PoC. Coordinates are 32px minor cells.
// It targets the 12x9-major-tile farm defense feel; tower ranges are scaled in
// balance data instead of stretching the layout to fit original War3 world units.
export const COMBAT_POC_COMPACT_LAYOUT_BACKUP: CombatPocLayout = {
    anchorSlotId: 3,
    farm: { h: 2, w: 3, x: -3, y: 11 },
    fences: [
        { id: 'fence_left_3', x: 4, y: 3 },
        { id: 'fence_left_11', x: 4, y: 11 },
        { id: 'fence_right_2', x: 19, y: 2 },
        { id: 'fence_inner_turn_a_7', x: 8, y: 7 },
        { id: 'fence_inner_turn_b_10', x: 12, y: 10 },
        { id: 'fence_inner_turn_c_7', x: 16, y: 7 },
        { id: 'fence_inner_turn_d_10', x: 20, y: 10 },
        { id: 'fence_top_4', x: 4, y: 2 },
        { id: 'fence_top_16', x: 16, y: 2 },
        { id: 'fence_inner_bottom_8', x: 8, y: 7 },
        { id: 'fence_tower_a_right', x: 4, y: 12 },
    ],
    label: 'p3-lower-left-defense-backup',
    originOffsetCells: { x: -13, y: -1 },
    stoneRows: [{ fromX: 0, id: 'stone_bottom_lock', toX: 22, y: 16 }],
    towerA: { h: 4, w: 4, x: 1, y: 11 },
    towerB: { h: 4, w: 4, x: 16, y: 4 },
    wolf: { h: 1, w: 1, x: 22, y: 9 },
};

// Current PoC uses the compact layout with Phaser-scaled combat ranges.
export const COMBAT_POC_LAYOUT: CombatPocLayout = {
    anchorSlotId: 3,
    farm: { h: 8, w: 8, x: -13, y: 6 },
    fences: [
        { id: 'fence_left_1', x: 7, y: -6 },
        { id: 'fence_left_2', x: 7, y: -2 },
        { id: 'fence_left_3', x: 7, y: 2 },
        { id: 'fence_left_4', x: 7, y: 6 },
        { id: 'fence_left_5', x: 7, y: 10 },
        { id: 'fence_left_6', x: 7, y: 14 },
        { id: 'fence_left_7', x: 7, y: 18 },
        { id: 'fence_left_8', x: 7, y: 22 },
        { id: 'fence_top_1', x: 7, y: -10 },
        { id: 'fence_top_2', x: 11, y: -10 },
        { id: 'fence_top_3', x: 15, y: -10 },
        { id: 'fence_top_4', x: 19, y: -10 },
        { id: 'fence_top_5', x: 23, y: -10 },
        { id: 'fence_top_6', x: 27, y: -10 },
        { id: 'fence_right_1', x: 27, y: -6 },
        { id: 'fence_right_2', x: 27, y: -2 },
        { id: 'fence_right_3', x: 27, y: 2 },
        { id: 'fence_bottom_1', x: 27, y: 6 },
        { id: 'fence_bottom_2', x: 23, y: 6 },
        { id: 'fence_bottom_3', x: 19, y: 6 },
        { id: 'fence_bottom_4', x: 15, y: 6 },
        { id: 'fence_inner_turn_a_1', x: 15, y: 10 },
        { id: 'fence_inner_turn_a_2', x: 15, y: 14 },
        { id: 'fence_inner_turn_a_3', x: 15, y: 18 },
        { id: 'fence_inner_turn_b_1', x: 23, y: 14 },
        { id: 'fence_inner_turn_b_2', x: 23, y: 18 },
        { id: 'fence_inner_turn_b_3', x: 23, y: 22 },
    ],
    label: 'p3-lower-left-defense-minor-range',
    originOffsetCells: { x: -13, y: -1 },
    stoneRows: [{ fromX: -13, id: 'stone_bottom_lock', toX: 30, y: 26 }],
    towerA: { h: 4, w: 4, x: -1, y: 10 },
    towerB: { h: 4, w: 4, x: 19, y: -2 },
    wolf: { h: 1, w: 1, x: 32, y: 9 },
};
