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

export type TileContentRenderState = {
    graphics: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[];
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
            stroke: getTileStroke(world, entityId, revealed, mineRevealed),
            width: layout.tileWidth,
            x: render.screenX,
            y: render.screenY,
        });

        if (!revealed) {
            drawTileTopHighlight(graphics, render.screenX, render.screenY, layout);
        }
    });
}

export function renderTileContentSystem(
    world: World,
    scene: Phaser.Scene,
    previousState: TileContentRenderState,
    layout: BoardLayout,
) {
    previousState.labels.forEach((label) => label.destroy());
    previousState.graphics.clear();

    const nextLabels: Phaser.GameObjects.Text[] = [];

    getRenderableEntities(world).forEach((entityId) => {
        const render = world.renders.get(entityId);
        const tile = world.tiles.get(entityId);
        if (!render || !tile) return;

        if (!tile.revealed && world.flags.has(entityId)) {
            drawFlagIcon(previousState.graphics, render.screenX, render.screenY, layout);
            return;
        }

        if (tile.revealed && world.mines.has(entityId)) {
            drawMineIcon(previousState.graphics, render.screenX, render.screenY, layout);
            return;
        }

        const labelText = getTileLabel(world, entityId, tile.revealed);
        if (!labelText) return;

        const label = scene.add
            .text(render.screenX, render.screenY - layout.tileHeight * 0.25, labelText, {
                align: 'center',
                color: getTileLabelColor(world, entityId),
                fontFamily: 'system-ui, sans-serif',
                fontSize: `${Math.max(15, Math.floor(layout.tileWidth * 0.27))}px`,
                fontStyle: '800',
            })
            .setDepth(6)
            .setOrigin(0.5);

        nextLabels.push(label);
    });

    return {
        graphics: previousState.graphics,
        labels: nextLabels,
    };
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
        alpha: 0.3,
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
    if (mineRevealed) return world.resources.gameStatus === 'lost' ? 0x9f5050 : 0x776b60;
    if (revealed) return 0xc3d0bc;
    if (world.flags.has(entityId)) return 0x5f7780;

    return 0x5f8d72;
}

function getTileStroke(
    world: World,
    entityId: number,
    revealed: boolean,
    mineRevealed: boolean,
) {
    if (mineRevealed) return world.resources.gameStatus === 'lost' ? 0xe0a0a0 : 0x4e4944;
    if (world.flags.has(entityId)) return 0xaec6c9;
    if (revealed) return 0x53645e;

    return 0x2c463c;
}

function getTileLabel(world: World, entityId: number, revealed: boolean) {
    if (!revealed || world.mines.has(entityId)) return '';

    const count = world.adjacentMineCounts.get(entityId) ?? 0;

    return count > 0 ? count.toString() : '';
}

function getTileLabelColor(world: World, entityId: number) {
    const count = world.adjacentMineCounts.get(entityId) ?? 0;
    const countColors = [
        '#f3efe2',
        '#255fb8',
        '#247342',
        '#b33434',
        '#6440a6',
        '#905129',
        '#23757b',
        '#222b2f',
        '#5f676b',
    ];

    return countColors[count] ?? '#2d3335';
}

function drawTileTopHighlight(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    layout: BoardLayout,
) {
    const halfWidth = layout.tileWidth / 2;
    const halfHeight = layout.tileHeight / 2;

    graphics.lineStyle(1, 0x8fbea0, 0.28);
    graphics.beginPath();
    graphics.moveTo(x, y - halfHeight + 2);
    graphics.lineTo(x + halfWidth - 4, y);
    graphics.strokePath();
}

function drawFlagIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    layout: BoardLayout,
) {
    const poleHeight = layout.tileHeight * 0.72;
    const poleTop = y - layout.tileHeight * 0.56;
    const poleBottom = poleTop + poleHeight;
    const flagWidth = layout.tileWidth * 0.24;
    const flagHeight = layout.tileHeight * 0.34;

    graphics.lineStyle(3, 0x253238, 1);
    graphics.beginPath();
    graphics.moveTo(x - 4, poleTop);
    graphics.lineTo(x - 4, poleBottom);
    graphics.strokePath();

    graphics.fillStyle(0xf2c94c, 1);
    graphics.lineStyle(1, 0x815f16, 1);
    graphics.beginPath();
    graphics.moveTo(x - 2, poleTop + 2);
    graphics.lineTo(x + flagWidth, poleTop + flagHeight * 0.45);
    graphics.lineTo(x - 2, poleTop + flagHeight);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.fillStyle(0x253238, 0.32);
    graphics.fillEllipse(x - 4, poleBottom + 2, layout.tileWidth * 0.22, 5);
}

function drawMineIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    layout: BoardLayout,
) {
    const radius = Math.max(7, layout.tileWidth * 0.14);
    const centerY = y - layout.tileHeight * 0.2;

    graphics.lineStyle(2, 0x1f1717, 1);
    for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8;
        const innerX = x + Math.cos(angle) * (radius * 0.7);
        const innerY = centerY + Math.sin(angle) * (radius * 0.7);
        const outerX = x + Math.cos(angle) * (radius * 1.35);
        const outerY = centerY + Math.sin(angle) * (radius * 1.1);

        graphics.beginPath();
        graphics.moveTo(innerX, innerY);
        graphics.lineTo(outerX, outerY);
        graphics.strokePath();
    }

    graphics.fillStyle(0x2b2423, 1);
    graphics.lineStyle(2, 0x14100f, 1);
    graphics.fillCircle(x, centerY, radius);
    graphics.strokeCircle(x, centerY, radius);

    graphics.fillStyle(0xf0d8b0, 0.78);
    graphics.fillCircle(x - radius * 0.35, centerY - radius * 0.35, radius * 0.24);
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
