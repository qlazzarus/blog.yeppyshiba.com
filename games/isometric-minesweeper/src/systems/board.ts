import type { World } from '../ecs/world';
import type { BoardLayout } from '../game/config';
import { createTileEntity } from '../ecs/world';
import { isoToScreen } from './isometric';

export function createBoardSystem(world: World, layout: BoardLayout) {
    for (let y = 0; y < layout.boardHeight; y += 1) {
        for (let x = 0; x < layout.boardWidth; x += 1) {
            const point = isoToScreen(x, y, layout);

            createTileEntity(
                world,
                { x, y },
                {
                    order: (x + y) * layout.boardWidth + x,
                    screenX: point.x,
                    screenY: point.y,
                },
            );
        }
    }
}

export function updateBoardRenderSystem(world: World, layout: BoardLayout) {
    for (const [entityId, position] of world.positions) {
        const point = isoToScreen(position.x, position.y, layout);

        world.renders.set(entityId, {
            order: (position.x + position.y) * layout.boardWidth + position.x,
            screenX: point.x,
            screenY: point.y,
        });
    }
}
