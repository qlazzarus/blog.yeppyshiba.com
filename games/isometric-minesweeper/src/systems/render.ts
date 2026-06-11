import Phaser from 'phaser';
import type { World } from '../ecs/world';
import type { BoardLayout } from '../game/config';
import { getEntityAtTile, getRenderableEntities } from '../ecs/world';

type DiamondOptions = {
    alpha: number;
    fill: number;
    height: number;
    lineWidth: number;
    stroke: number;
    width: number;
    x: number;
    y: number;
};

export function renderBoardSystem(
    world: World,
    graphics: Phaser.GameObjects.Graphics,
    layout: BoardLayout,
) {
    graphics.clear();

    getRenderableEntities(world).forEach((entityId) => {
        const render = world.renders.get(entityId);
        if (!render) return;

        drawDiamond(graphics, {
            alpha: 1,
            fill: 0x5d846f,
            height: layout.tileHeight,
            lineWidth: 1,
            stroke: 0x273b35,
            width: layout.tileWidth,
            x: render.screenX,
            y: render.screenY,
        });
    });
}

export function renderHoverSystem(
    world: World,
    graphics: Phaser.GameObjects.Graphics,
    layout: BoardLayout,
) {
    graphics.clear();

    if (!world.resources.hoveredTile) return;

    const entityId = getEntityAtTile(world, world.resources.hoveredTile);
    const render = entityId ? world.renders.get(entityId) : null;

    if (!render) return;

    drawDiamond(graphics, {
        alpha: 0.24,
        fill: 0xd9b85f,
        height: layout.tileHeight - layout.hoverInset * 2,
        lineWidth: 2,
        stroke: 0xffe08f,
        width: layout.tileWidth - layout.hoverInset * 4,
        x: render.screenX,
        y: render.screenY,
    });
}

function drawDiamond(graphics: Phaser.GameObjects.Graphics, options: DiamondOptions) {
    const halfWidth = options.width / 2;
    const halfHeight = options.height / 2;

    graphics.fillStyle(options.fill, options.alpha);
    graphics.lineStyle(options.lineWidth, options.stroke, 1);
    graphics.beginPath();
    graphics.moveTo(options.x, options.y - halfHeight);
    graphics.lineTo(options.x + halfWidth, options.y);
    graphics.lineTo(options.x, options.y + halfHeight);
    graphics.lineTo(options.x - halfWidth, options.y);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
}
