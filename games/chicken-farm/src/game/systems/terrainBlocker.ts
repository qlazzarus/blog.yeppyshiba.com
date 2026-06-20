import Phaser from 'phaser';

import type { GridPathPoint, GridPathRect } from './pathing';

export type WpmPathingGrid = {
    readonly buildBlocked: readonly boolean[];
    readonly cellSize: number;
    readonly groundBlocked: readonly boolean[];
    readonly height: number;
    readonly trimOffset: {
        readonly x: number;
        readonly y: number;
    };
    readonly width: number;
};

type BlockedCellKind = 'build' | 'ground';

export class TerrainBlocker {
    private readonly buildBlocked: readonly boolean[];
    private readonly cellSize: number;
    private readonly groundBlocked: readonly boolean[];
    private readonly height: number;
    private readonly trimOffset: { readonly x: number; readonly y: number };
    private readonly width: number;

    constructor(grid: WpmPathingGrid) {
        this.buildBlocked = grid.buildBlocked;
        this.cellSize = grid.cellSize;
        this.groundBlocked = grid.groundBlocked;
        this.height = grid.height;
        this.trimOffset = grid.trimOffset;
        this.width = grid.width;
    }

    canBuild(worldX: number, worldY: number, footprintW: number, footprintH: number) {
        return !this.rectHasBlockedCell(
            { height: footprintH, width: footprintW, x: worldX, y: worldY },
            'build',
        );
    }

    canMove(worldX: number, worldY: number) {
        return !this.isPointBlocked({ x: worldX, y: worldY }, 'ground');
    }

    drawDebugOverlay(graphics: Phaser.GameObjects.Graphics) {
        graphics.clear();

        for (let row = 0; row < this.height; row += 1) {
            for (let col = 0; col < this.width; col += 1) {
                const index = this.cellIndex(col, row);
                if (this.groundBlocked[index]) {
                    const rect = this.cellRect(col, row);
                    graphics.fillStyle(0xff5d52, 0.32);
                    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
                    continue;
                }

                if (this.buildBlocked[index]) {
                    const rect = this.cellRect(col, row);
                    graphics.fillStyle(0xffa24c, 0.18);
                    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
                }
            }
        }
    }

    getGroundBlockedRects(bounds: GridPathRect): readonly GridPathRect[] {
        return this.getBlockedRects(bounds, 'ground');
    }

    isPointGroundBlocked(point: GridPathPoint) {
        return this.isPointBlocked(point, 'ground');
    }

    private cellIndex(col: number, row: number) {
        return row * this.width + col;
    }

    private cellRect(col: number, row: number): GridPathRect {
        return {
            height: this.cellSize,
            width: this.cellSize,
            x: col * this.cellSize,
            y: row * this.cellSize,
        };
    }

    private getBlockedRects(
        bounds: GridPathRect,
        kind: BlockedCellKind,
    ): readonly GridPathRect[] {
        const start = this.worldToCell(bounds.x, bounds.y);
        const end = this.worldToCell(
            bounds.x + bounds.width - 1,
            bounds.y + bounds.height - 1,
        );
        const blockedRects: GridPathRect[] = [];

        for (let row = start.row; row <= end.row; row += 1) {
            for (let col = start.col; col <= end.col; col += 1) {
                const index = this.cellIndex(col, row);
                const blocked =
                    kind === 'ground'
                        ? this.groundBlocked[index]
                        : this.buildBlocked[index];
                if (!blocked) continue;
                blockedRects.push(this.cellRect(col, row));
            }
        }

        return blockedRects;
    }

    private isPointBlocked(point: GridPathPoint, kind: BlockedCellKind) {
        const { col, row } = this.worldToCell(point.x, point.y);
        const index = this.cellIndex(col, row);
        return kind === 'ground'
            ? Boolean(this.groundBlocked[index])
            : Boolean(this.buildBlocked[index]);
    }

    private rectHasBlockedCell(rect: GridPathRect, kind: BlockedCellKind) {
        const start = this.worldToCell(rect.x, rect.y);
        const end = this.worldToCell(
            rect.x + rect.width - 1,
            rect.y + rect.height - 1,
        );

        for (let row = start.row; row <= end.row; row += 1) {
            for (let col = start.col; col <= end.col; col += 1) {
                const index = this.cellIndex(col, row);
                const blocked =
                    kind === 'ground'
                        ? this.groundBlocked[index]
                        : this.buildBlocked[index];
                if (blocked) return true;
            }
        }

        return false;
    }

    private worldToCell(worldX: number, worldY: number) {
        const mapWorldX = this.trimOffset.x + worldX;
        const mapWorldY = this.trimOffset.y + worldY;
        const col = Phaser.Math.Clamp(
            Math.floor((mapWorldX - this.trimOffset.x) / this.cellSize),
            0,
            this.width - 1,
        );
        const row = Phaser.Math.Clamp(
            Math.floor((mapWorldY - this.trimOffset.y) / this.cellSize),
            0,
            this.height - 1,
        );

        return { col, row };
    }
}
