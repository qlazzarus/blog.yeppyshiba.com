import type { BoardLayout } from '../game/config';

export function isoToScreen(x: number, y: number, layout: BoardLayout) {
    return {
        x: layout.originX + (x - y) * (layout.tileWidth / 2),
        y: layout.originY + (x + y) * (layout.tileHeight / 2),
    };
}

export function isInsideIsoTile(
    screenX: number,
    screenY: number,
    tileCenterX: number,
    tileCenterY: number,
    layout: BoardLayout,
) {
    const dx = Math.abs(screenX - tileCenterX) / (layout.tileWidth / 2);
    const dy = Math.abs(screenY - tileCenterY) / (layout.tileHeight / 2);

    return dx + dy <= 1;
}
