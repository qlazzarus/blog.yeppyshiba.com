import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../../balance';
import type { PlayerStart } from '../../ecs/components';
import {
    COMBAT_GRID_PX,
    COMBAT_POC_LAYOUT,
    POC_FENCE_ID,
    POC_TOWER_ID,
} from '../../poc/combatPocLayout';

type CellRect = {
    readonly h: number;
    readonly w: number;
    readonly x: number;
    readonly y: number;
};

export type CombatBuildingSpec = {
    readonly armor: number;
    readonly blocksPath: boolean;
    readonly color: number;
    readonly height: number;
    readonly hp: number;
    readonly id: string;
    readonly kind: 'farm_core' | 'fence' | 'tower';
    readonly name: string;
    readonly attackDamageScale?: number;
    readonly targetableByWolves: boolean;
    readonly width: number;
    readonly x: number;
    readonly y: number;
};

export type CombatLayoutPlan = {
    readonly buildings: readonly CombatBuildingSpec[];
    readonly label: string;
    readonly labelX: number;
    readonly labelY: number;
    readonly wolf: {
        readonly defaultTargetBuildingId: string;
        readonly targetX: number;
        readonly targetY: number;
        readonly x: number;
        readonly y: number;
    };
};

export function createCombatLayoutPlan(config: {
    readonly anchor: PlayerStart;
    readonly worldSize: Phaser.Math.Vector2;
}): CombatLayoutPlan {
    const layout = COMBAT_POC_LAYOUT;
    const originWorldX = config.anchor.x + layout.originOffsetCells.x * COMBAT_GRID_PX;
    const originWorldY = config.anchor.y + layout.originOffsetCells.y * COMBAT_GRID_PX;
    const originX = snapToGrid(
        Phaser.Math.Clamp(originWorldX, 64, config.worldSize.x - 1024),
    );
    const originY = snapToGrid(
        Phaser.Math.Clamp(originWorldY, 64, config.worldSize.y - 1024),
    );
    const cellCenter = (cell: CellRect) => ({
        x: originX + (cell.x + cell.w / 2) * COMBAT_GRID_PX,
        y: originY + (cell.y + cell.h / 2) * COMBAT_GRID_PX,
    });
    const towerTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID];
    const fenceTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_FENCE_ID];
    const buildings: CombatBuildingSpec[] = [];
    const farmCell = cellCenter(layout.farm);

    buildings.push({
        attackDamageScale: 1,
        armor: 0,
        blocksPath: true,
        color: 0x8ebf58,
        height: COMBAT_GRID_PX * layout.farm.h,
        hp: 500,
        id: 'farm_core',
        kind: 'farm_core',
        name: 'Farm Target',
        targetableByWolves: true,
        width: COMBAT_GRID_PX * layout.farm.w,
        x: farmCell.x,
        y: farmCell.y,
    });

    const towerACell = cellCenter(layout.towerA);
    buildings.push({
        attackDamageScale: 1,
        armor: towerTemplate.armor,
        blocksPath: towerTemplate.blocksPath,
        color: 0xd9bb73,
        height: COMBAT_GRID_PX * layout.towerA.h,
        hp: towerTemplate.hp,
        id: 'tower_a',
        kind: 'tower',
        name: `${towerTemplate.displayName} A`,
        targetableByWolves: towerTemplate.targetableByWolves,
        width: COMBAT_GRID_PX * layout.towerA.w,
        x: towerACell.x,
        y: towerACell.y,
    });

    const towerBCell = cellCenter(layout.towerB);
    buildings.push({
        attackDamageScale: 1,
        armor: towerTemplate.armor,
        blocksPath: towerTemplate.blocksPath,
        color: 0xc99545,
        height: COMBAT_GRID_PX * layout.towerB.h,
        hp: towerTemplate.hp,
        id: 'tower_b',
        kind: 'tower',
        name: `${towerTemplate.displayName} B`,
        targetableByWolves: towerTemplate.targetableByWolves,
        width: COMBAT_GRID_PX * layout.towerB.w,
        x: towerBCell.x,
        y: towerBCell.y,
    });

    const addFence = (id: string, cellX: number, cellY: number) => {
        const position = cellCenter({ h: 1, w: 2, x: cellX, y: cellY });
        buildings.push({
            attackDamageScale: 1,
            armor: fenceTemplate.armor,
            blocksPath: fenceTemplate.blocksPath,
            color: 0x9b7a4a,
            height: COMBAT_GRID_PX,
            hp: fenceTemplate.hp,
            id,
            kind: 'fence',
            name: fenceTemplate.displayName,
            targetableByWolves: fenceTemplate.targetableByWolves,
            width: COMBAT_GRID_PX * 2,
            x: position.x,
            y: position.y,
        });
    };
    const addStoneWall = (
        id: string,
        cellX: number,
        cellY: number,
        cellWidth: number,
        cellHeight: number,
    ) => {
        const position = cellCenter({
            h: cellHeight,
            w: cellWidth,
            x: cellX,
            y: cellY,
        });
        buildings.push({
            attackDamageScale: 1,
            armor: 999,
            blocksPath: true,
            color: 0x727672,
            height: cellHeight * COMBAT_GRID_PX,
            hp: 9999,
            id,
            kind: 'fence',
            name: '돌벽',
            targetableByWolves: false,
            width: cellWidth * COMBAT_GRID_PX,
            x: position.x,
            y: position.y,
        });
    };

    layout.fenceRows.forEach((row) => {
        for (let cellX = row.fromX; cellX <= row.toX; cellX += 2) {
            addFence(`${row.id}_${cellX}`, cellX, row.y);
        }
    });
    layout.fenceColumns.forEach((column) => {
        for (let cellY = column.fromY; cellY <= column.toY; cellY += 1) {
            addFence(`${column.id}_${cellY}`, column.x, cellY);
        }
    });
    layout.fenceSingles.forEach((fence) => addFence(fence.id, fence.x, fence.y));
    layout.stoneRows.forEach((row) => {
        for (let cellX = row.fromX; cellX <= row.toX; cellX += 2) {
            addStoneWall(`${row.id}_${cellX}`, cellX, row.y, 2, 1);
        }
    });

    const wolfCell = cellCenter(layout.wolf);

    return {
        buildings,
        label: layout.label,
        labelX: originX,
        labelY: originY - COMBAT_GRID_PX * 2,
        wolf: {
            defaultTargetBuildingId: 'farm_core',
            targetX: farmCell.x,
            targetY: farmCell.y,
            x: wolfCell.x,
            y: wolfCell.y,
        },
    };
}

function snapToGrid(value: number) {
    return Math.round(value / COMBAT_GRID_PX) * COMBAT_GRID_PX;
}
