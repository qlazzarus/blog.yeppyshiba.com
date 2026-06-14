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
        const tile = world.tiles.get(entityId);
        if (!render) return;

        const revealed = tile?.revealed ?? false;
        const mineRevealed = revealed && world.mines.has(entityId);

        drawDiamond(graphics, {
            alpha: 1,
            fill: getTileFill(world, entityId, revealed, mineRevealed),
            height: layout.tileHeight,
            lineWidth: 1,
            stroke: revealed ? 0x4c5e59 : 0x273b35,
            width: layout.tileWidth,
            x: render.screenX,
            y: render.screenY,
        });
    });
}

export function renderTileContentSystem(
    world: World,
    scene: Phaser.Scene,
    previousLabels: Phaser.GameObjects.Text[],
) {
    previousLabels.forEach((label) => label.destroy());

    const nextLabels: Phaser.GameObjects.Text[] = [];

    getRenderableEntities(world).forEach((entityId) => {
        const render = world.renders.get(entityId);
        const tile = world.tiles.get(entityId);
        if (!render || !tile) return;

        const labelText = getTileLabel(world, entityId, tile.revealed);
        if (!labelText) return;

        const label = scene.add
            .text(render.screenX, render.screenY - 8, labelText, {
                align: 'center',
                color: getTileLabelColor(world, entityId),
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                fontStyle: '700',
            })
            .setDepth(6)
            .setOrigin(0.5);

        nextLabels.push(label);
    });

    return nextLabels;
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

function getTileFill(
    world: World,
    entityId: number,
    revealed: boolean,
    mineRevealed: boolean,
) {
    if (mineRevealed) return world.resources.gameStatus === 'lost' ? 0x8f4a4a : 0x6f6258;
    if (revealed) return 0xb9c7b3;
    if (world.flags.has(entityId)) return 0x6b7f88;

    return 0x5d846f;
}

function getTileLabel(world: World, entityId: number, revealed: boolean) {
    if (!revealed) return world.flags.has(entityId) ? 'F' : '';
    if (world.mines.has(entityId)) return 'M';

    const count = world.adjacentMineCounts.get(entityId) ?? 0;

    return count > 0 ? count.toString() : '';
}

function getTileLabelColor(world: World, entityId: number) {
    if (world.flags.has(entityId)) return '#f3d36b';
    if (world.mines.has(entityId)) return '#241a1a';

    const count = world.adjacentMineCounts.get(entityId) ?? 0;
    const countColors = [
        '#f3efe2',
        '#2f5fbd',
        '#267344',
        '#b44242',
        '#5a3f9b',
        '#8d4b24',
        '#287578',
        '#2d3335',
        '#6f7475',
    ];

    return countColors[count] ?? '#2d3335';
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
