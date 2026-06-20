import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import {
    TERRAIN_PATHING_PROBES,
    getTerrainPathingProbeBounds,
    type TerrainPathingProbe,
} from '../poc/terrainPathingPocLayout';
import { type GridPathPoint, findGridPath } from './pathing';
import { TerrainBlocker } from './terrainBlocker';

type TerrainPathingPocSystemConfig = {
    readonly scene: Phaser.Scene;
    readonly terrainBlocker: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
};

type TerrainPathingProbeRuntime = TerrainPathingProbe & {
    readonly agent: Phaser.GameObjects.Container;
    readonly path: readonly GridPathPoint[];
    readonly targetObject: Phaser.GameObjects.Rectangle;
    pathIndex: number;
};

export class TerrainPathingPocSystem {
    private readonly graphics: Phaser.GameObjects.Graphics;
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker: TerrainBlocker;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private probes: TerrainPathingProbeRuntime[] = [];

    constructor(config: TerrainPathingPocSystemConfig) {
        this.scene = config.scene;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.graphics = this.scene.add.graphics().setDepth(23);
        this.worldObjects.push(this.graphics);
    }

    create() {
        this.probes.forEach((probe) => {
            probe.agent.destroy();
            probe.targetObject.destroy();
        });
        this.probes = TERRAIN_PATHING_PROBES.map((probe) =>
            this.createProbe(probe),
        );
        this.drawDebug();
    }

    getFocusPoint(): GridPathPoint {
        const points = TERRAIN_PATHING_PROBES.flatMap((probe) => [
            probe.start,
            probe.target,
        ]);
        const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
        const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;

        return { x, y };
    }

    update(deltaSec: number) {
        const speed = CHICKEN_FARM_BALANCE.enemies.timber_wolf.speedPxPerSec;

        this.probes.forEach((probe) => {
            const waypoint = probe.path[probe.pathIndex];
            if (!waypoint) {
                probe.agent.setPosition(probe.start.x, probe.start.y);
                probe.pathIndex = 0;
                return;
            }

            const direction = new Phaser.Math.Vector2(
                waypoint.x - probe.agent.x,
                waypoint.y - probe.agent.y,
            );
            if (direction.lengthSq() < 64) {
                probe.pathIndex += 1;
                return;
            }

            direction.normalize().scale(speed * deltaSec);
            probe.agent.setPosition(
                probe.agent.x + direction.x,
                probe.agent.y + direction.y,
            );
        });
    }

    private createProbe(probe: TerrainPathingProbe): TerrainPathingProbeRuntime {
        const targetObject = this.scene.add
            .rectangle(probe.target.x, probe.target.y, 42, 42, 0x64d66f, 0.95)
            .setStrokeStyle(2, 0x101010, 0.9)
            .setDepth(24);
        const agent = this.createProbeAgent(probe.start, probe.label);
        const path = this.findProbePath(probe);

        this.worldObjects.push(targetObject, agent);

        return {
            ...probe,
            agent,
            path,
            pathIndex: 0,
            targetObject,
        };
    }

    private createProbeAgent(point: GridPathPoint, labelText: string) {
        const shadow = this.scene.add.ellipse(0, 10, 34, 13, 0x050805, 0.45);
        const body = this.scene.add.ellipse(0, 0, 30, 20, 0x714f42, 1);
        const head = this.scene.add.triangle(18, -2, 0, -7, 15, 0, 0, 7, 0x8a6758);
        const label = this.scene.add
            .text(0, 22, labelText, {
                backgroundColor: 'rgba(14, 14, 12, 0.76)',
                color: '#f5d0b8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setOrigin(0.5, 0);
        const agent = this.scene.add.container(point.x, point.y, [
            shadow,
            body,
            head,
            label,
        ]);

        return agent.setDepth(25);
    }

    private drawDebug() {
        this.graphics.clear();

        this.probes.forEach((probe) => {
            this.graphics.lineStyle(2, 0xff675d, 0.68);
            this.graphics.lineBetween(
                probe.start.x,
                probe.start.y,
                probe.target.x,
                probe.target.y,
            );

            this.graphics.fillStyle(0xff675d, 0.9);
            this.graphics.fillCircle(probe.start.x, probe.start.y, 5);
            this.graphics.fillStyle(0x64d66f, 0.9);
            this.graphics.fillCircle(probe.target.x, probe.target.y, 5);

            if (probe.path.length <= 0) return;

            this.graphics.lineStyle(3, 0x7ee6ff, 0.76);
            let fromX = probe.start.x;
            let fromY = probe.start.y;
            probe.path.forEach((waypoint) => {
                this.graphics.lineBetween(fromX, fromY, waypoint.x, waypoint.y);
                this.graphics.fillStyle(0x7ee6ff, 0.9);
                this.graphics.fillCircle(waypoint.x, waypoint.y, 3);
                fromX = waypoint.x;
                fromY = waypoint.y;
            });
        });
    }

    private findProbePath(probe: TerrainPathingProbe): readonly GridPathPoint[] {
        const pathing = CHICKEN_FARM_BALANCE.pathing;
        const bounds = getTerrainPathingProbeBounds(probe);
        const blockedRects = this.terrainBlocker.getGroundBlockedRects(bounds);
        const clearancePx =
            ((pathing.unitClearanceCells.wolf - 1) * pathing.cellSize) / 2;

        return (
            findGridPath({
                blockedRects,
                bounds,
                cellSize: pathing.cellSize,
                clearancePx,
                goal: probe.target,
                pathSmoothingEnabled: pathing.pathSmoothingEnabled,
                start: probe.start,
            }) ?? []
        );
    }
}
