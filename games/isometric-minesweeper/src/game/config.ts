export const TILE_WIDTH = 72;
export const TILE_HEIGHT = 36;
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 10;
export const BOARD_ORIGIN_Y = 130;
export const HOVER_INSET = 3;
export const MINE_COUNT = 14;
export const MIN_TILE_WIDTH = 24;

export type DifficultyId = 'beginner' | 'standard' | 'expert';

export type DifficultyConfig = {
    boardHeight: number;
    boardWidth: number;
    id: DifficultyId;
    label: string;
    mineCount: number;
};

export const DIFFICULTIES: DifficultyConfig[] = [
    {
        boardHeight: 8,
        boardWidth: 8,
        id: 'beginner',
        label: 'Beginner',
        mineCount: 10,
    },
    {
        boardHeight: BOARD_HEIGHT,
        boardWidth: BOARD_WIDTH,
        id: 'standard',
        label: 'Standard',
        mineCount: MINE_COUNT,
    },
    {
        boardHeight: 14,
        boardWidth: 14,
        id: 'expert',
        label: 'Expert',
        mineCount: 32,
    },
];

export type BoardLayout = {
    boardHeight: number;
    boardWidth: number;
    difficulty: DifficultyConfig;
    hoverInset: number;
    mineCount: number;
    originX: number;
    originY: number;
    tileHeight: number;
    tileWidth: number;
};

export function createBoardLayout(
    viewportWidth: number,
    difficulty: DifficultyConfig = DIFFICULTIES[1],
    originY = BOARD_ORIGIN_Y,
    tileWidthLimit = TILE_WIDTH,
): BoardLayout {
    const maxTileWidth = Math.floor(
        ((viewportWidth - 48) * 2) / (difficulty.boardWidth + difficulty.boardHeight),
    );
    const tileWidth = Math.max(
        MIN_TILE_WIDTH,
        Math.min(TILE_WIDTH, tileWidthLimit, maxTileWidth),
    );
    const tileHeight = Math.round(tileWidth / 2);

    return {
        boardHeight: difficulty.boardHeight,
        boardWidth: difficulty.boardWidth,
        difficulty,
        hoverInset: HOVER_INSET,
        mineCount: difficulty.mineCount,
        originX: viewportWidth / 2,
        originY,
        tileHeight,
        tileWidth,
    };
}
