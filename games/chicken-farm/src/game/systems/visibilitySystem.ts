import Phaser from 'phaser';

import {
    MINIMAP_HEIGHT,
    MINIMAP_WIDTH,
    MINIMAP_X,
    MINIMAP_Y,
    VISIBILITY_OVERLAY,
} from '../config';
import type { PlayerStart, WorldMarker } from '../ecs/components';

type VisibilitySystemConfig = {
    readonly scene: Phaser.Scene;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
};

type MinimapConfig = {
    readonly camera: Phaser.Cameras.Scene2D.Camera;
    readonly graphics: Phaser.GameObjects.Graphics;
    readonly player?: Phaser.GameObjects.Container;
    readonly playerStarts: readonly PlayerStart[];
    readonly worldMarkers: readonly WorldMarker[];
    readonly worldSize: Phaser.Math.Vector2;
};

export type VisionSource = {
    readonly radiusPx: number;
    readonly x: number;
    readonly y: number;
};

export class VisibilitySystem {
    private readonly scene: Phaser.Scene;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly exploredFogCells = new Set<string>();
    private fogGraphics?: Phaser.GameObjects.Graphics;
    private lightingGraphics?: Phaser.GameObjects.Graphics;

    constructor(config: VisibilitySystemConfig) {
        this.scene = config.scene;
        this.worldObjects = config.worldObjects;
    }

    createOverlays() {
        this.lightingGraphics = this.scene.add.graphics().setDepth(17);
        this.fogGraphics = this.scene.add.graphics().setDepth(18);
        this.worldObjects.push(this.lightingGraphics, this.fogGraphics);
    }

    updateLightingOverlay(worldSize: Phaser.Math.Vector2) {
        if (!this.lightingGraphics || worldSize.x <= 0) return;

        this.lightingGraphics.clear();

        if (VISIBILITY_OVERLAY.nightAlpha <= 0) return;

        this.lightingGraphics.fillStyle(
            VISIBILITY_OVERLAY.nightColor,
            VISIBILITY_OVERLAY.nightAlpha,
        );
        this.lightingGraphics.fillRect(0, 0, worldSize.x, worldSize.y);
    }

    revealAroundPlayer(
        player: Phaser.GameObjects.Container | undefined,
        worldSize: Phaser.Math.Vector2,
    ) {
        if (!player) return;

        this.revealAroundSources(
            [{ radiusPx: VISIBILITY_OVERLAY.revealRadiusPx, x: player.x, y: player.y }],
            worldSize,
        );
    }

    revealAroundSources(
        sources: readonly VisionSource[],
        worldSize: Phaser.Math.Vector2,
    ) {
        sources.forEach((source) => {
            const sourceCellX = Math.floor(source.x / VISIBILITY_OVERLAY.cellSize);
            const sourceCellY = Math.floor(source.y / VISIBILITY_OVERLAY.cellSize);
            const radiusCells = Math.ceil(
                source.radiusPx / VISIBILITY_OVERLAY.cellSize,
            );

            for (
                let y = sourceCellY - radiusCells;
                y <= sourceCellY + radiusCells;
                y += 1
            ) {
                for (
                    let x = sourceCellX - radiusCells;
                    x <= sourceCellX + radiusCells;
                    x += 1
                ) {
                    const centerX =
                        x * VISIBILITY_OVERLAY.cellSize +
                        VISIBILITY_OVERLAY.cellSize / 2;
                    const centerY =
                        y * VISIBILITY_OVERLAY.cellSize +
                        VISIBILITY_OVERLAY.cellSize / 2;

                    if (
                        centerX < 0 ||
                        centerY < 0 ||
                        centerX > worldSize.x ||
                        centerY > worldSize.y
                    ) {
                        continue;
                    }

                    if (
                        Phaser.Math.Distance.Between(
                            source.x,
                            source.y,
                            centerX,
                            centerY,
                        ) <= source.radiusPx
                    ) {
                        this.exploredFogCells.add(this.getFogCellKey(x, y));
                    }
                }
            }
        });
    }

    updateFogOfWar(
        player: Phaser.GameObjects.Container | undefined,
        worldSize: Phaser.Math.Vector2,
    ) {
        if (!this.fogGraphics || !player || worldSize.x <= 0) return;

        this.updateFogOfWarForSources(
            [{ radiusPx: VISIBILITY_OVERLAY.revealRadiusPx, x: player.x, y: player.y }],
            worldSize,
        );
    }

    updateFogOfWarForSources(
        sources: readonly VisionSource[],
        worldSize: Phaser.Math.Vector2,
    ) {
        if (!this.fogGraphics || !sources.length || worldSize.x <= 0) return;

        this.revealAroundSources(sources, worldSize);
        this.fogGraphics.clear();

        const cols = Math.ceil(worldSize.x / VISIBILITY_OVERLAY.cellSize);
        const rows = Math.ceil(worldSize.y / VISIBILITY_OVERLAY.cellSize);

        for (let y = 0; y < rows; y += 1) {
            for (let x = 0; x < cols; x += 1) {
                const centerX =
                    x * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
                const centerY =
                    y * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
                if (sources.some((source) => {
                    return (
                        Phaser.Math.Distance.Between(
                            source.x,
                            source.y,
                            centerX,
                            centerY,
                        ) <= source.radiusPx
                    );
                })) continue;

                const explored = this.exploredFogCells.has(this.getFogCellKey(x, y));
                this.fogGraphics.fillStyle(
                    VISIBILITY_OVERLAY.fogColor,
                    explored
                        ? VISIBILITY_OVERLAY.exploredAlpha
                        : VISIBILITY_OVERLAY.unexploredAlpha,
                );
                this.fogGraphics.fillRect(
                    x * VISIBILITY_OVERLAY.cellSize,
                    y * VISIBILITY_OVERLAY.cellSize,
                    VISIBILITY_OVERLAY.cellSize,
                    VISIBILITY_OVERLAY.cellSize,
                );
            }
        }
    }

    updateMinimap(config: MinimapConfig) {
        if (config.worldSize.x <= 0) return;

        const graphics = config.graphics;
        const padding = 6;
        const mapX = MINIMAP_X + padding;
        const mapY = MINIMAP_Y + padding;
        const mapWidth = MINIMAP_WIDTH - padding * 2;
        const mapHeight = MINIMAP_HEIGHT - padding * 2;
        const scaleX = mapWidth / config.worldSize.x;
        const scaleY = mapHeight / config.worldSize.y;

        graphics.clear();
        graphics.fillStyle(0x080b07, 1);
        graphics.fillRect(mapX, mapY, mapWidth, mapHeight);

        const cols = Math.ceil(config.worldSize.x / VISIBILITY_OVERLAY.cellSize);
        const rows = Math.ceil(config.worldSize.y / VISIBILITY_OVERLAY.cellSize);
        graphics.fillStyle(0x678b57, 0.72);

        for (let y = 0; y < rows; y += 1) {
            for (let x = 0; x < cols; x += 1) {
                if (!this.exploredFogCells.has(this.getFogCellKey(x, y))) continue;

                graphics.fillRect(
                    mapX + x * VISIBILITY_OVERLAY.cellSize * scaleX,
                    mapY + y * VISIBILITY_OVERLAY.cellSize * scaleY,
                    Math.max(1, VISIBILITY_OVERLAY.cellSize * scaleX),
                    Math.max(1, VISIBILITY_OVERLAY.cellSize * scaleY),
                );
            }
        }

        config.playerStarts.forEach((start) => {
            graphics.fillStyle(0xf0d45a, 0.92);
            graphics.fillCircle(mapX + start.x * scaleX, mapY + start.y * scaleY, 2.4);
        });

        config.worldMarkers.forEach((marker) => {
            const alpha = this.isExploredWorldPoint(marker.x, marker.y) ? 0.9 : 0.24;
            graphics.fillStyle(marker.color, alpha);
            graphics.fillCircle(
                mapX + marker.x * scaleX,
                mapY + marker.y * scaleY,
                1.8,
            );
        });

        if (config.player) {
            graphics.fillStyle(0x4dff66, 1);
            graphics.fillCircle(
                mapX + config.player.x * scaleX,
                mapY + config.player.y * scaleY,
                3.4,
            );
        }

        const viewWidth = config.camera.width / config.camera.zoom;
        const viewHeight = config.camera.height / config.camera.zoom;
        graphics.lineStyle(1, 0xf7e89a, 0.9);
        graphics.strokeRect(
            mapX + config.camera.scrollX * scaleX,
            mapY + config.camera.scrollY * scaleY,
            viewWidth * scaleX,
            viewHeight * scaleY,
        );

        graphics.lineStyle(1, 0x8d7d58, 1);
        graphics.strokeRect(mapX, mapY, mapWidth, mapHeight);
    }

    private isExploredWorldPoint(x: number, y: number) {
        return this.exploredFogCells.has(
            this.getFogCellKey(
                Math.floor(x / VISIBILITY_OVERLAY.cellSize),
                Math.floor(y / VISIBILITY_OVERLAY.cellSize),
            ),
        );
    }

    private getFogCellKey(x: number, y: number) {
        return `${x},${y}`;
    }
}
