import Phaser from 'phaser';

import { BUILD_GRID_MAJOR_EVERY } from '../config';

type BuildGridConfig = {
    readonly map: Phaser.Tilemaps.Tilemap;
    readonly scene: Phaser.Scene;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldScale: number;
};

export function createBuildGrid(config: BuildGridConfig) {
    const grid = config.scene.add.graphics().setDepth(19);
    const tileWidth = config.map.tileWidth * config.worldScale;
    const tileHeight = config.map.tileHeight * config.worldScale;
    const width = config.map.widthInPixels * config.worldScale;
    const height = config.map.heightInPixels * config.worldScale;

    for (let x = 0; x <= width; x += tileWidth) {
        const tileIndex = Math.round(x / tileWidth);
        const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
        grid.lineStyle(major ? 3 : 1, major ? 0xffe58a : 0xe7dcc0, major ? 0.52 : 0.1);
        grid.lineBetween(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += tileHeight) {
        const tileIndex = Math.round(y / tileHeight);
        const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
        grid.lineStyle(major ? 3 : 1, major ? 0xffe58a : 0xe7dcc0, major ? 0.52 : 0.1);
        grid.lineBetween(0, y, width, y);
    }

    config.worldObjects.push(grid);

    return grid;
}
