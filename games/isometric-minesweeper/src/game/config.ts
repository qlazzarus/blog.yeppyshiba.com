export const TILE_WIDTH = 72;
export const TILE_HEIGHT = 36;
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 10;
export const BOARD_ORIGIN_Y = 130;
export const HOVER_INSET = 3;

export type BoardLayout = {
    boardHeight: number;
    boardWidth: number;
    hoverInset: number;
    originX: number;
    originY: number;
    tileHeight: number;
    tileWidth: number;
};

export function createBoardLayout(viewportWidth: number): BoardLayout {
    return {
        boardHeight: BOARD_HEIGHT,
        boardWidth: BOARD_WIDTH,
        hoverInset: HOVER_INSET,
        originX: viewportWidth / 2,
        originY: BOARD_ORIGIN_Y,
        tileHeight: TILE_HEIGHT,
        tileWidth: TILE_WIDTH,
    };
}
