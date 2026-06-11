import type { TilePoint, World } from '../ecs/world';
import type { BoardLayout } from '../game/config';
import { getRenderableEntities, sameTile } from '../ecs/world';
import { isInsideIsoTile } from './isometric';

export function updateHoveredTileSystem(
    world: World,
    screenX: number,
    screenY: number,
    layout: BoardLayout,
) {
    const nextHoveredTile = pickTile(world, screenX, screenY, layout);

    if (sameTile(world.resources.hoveredTile, nextHoveredTile)) return false;

    world.resources.hoveredTile = nextHoveredTile;
    return true;
}

export function clearHoveredTileSystem(world: World) {
    if (!world.resources.hoveredTile) return false;

    world.resources.hoveredTile = null;
    return true;
}

function pickTile(
    world: World,
    screenX: number,
    screenY: number,
    layout: BoardLayout,
): TilePoint | null {
    for (const entityId of [...getRenderableEntities(world)].reverse()) {
        const position = world.positions.get(entityId);
        const render = world.renders.get(entityId);

        if (!position || !render) continue;
        if (isInsideIsoTile(screenX, screenY, render.screenX, render.screenY, layout)) {
            return position;
        }
    }

    return null;
}
