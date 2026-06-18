import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from './game/balance';
import { type GridPathPoint, findGridPath } from './game/systems/pathing';
import { CHICKEN_FARM_TILEMAP_POC_01 } from './game/tilemapAssets';
import './styles.css';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 720;
const UI_HEIGHT = 180;
const WORLD_VIEW_HEIGHT = CANVAS_HEIGHT - UI_HEIGHT;
const TILESET_KEY = 'kenney-tiny-town-tiles';
const TILEMAP_KEY = 'chicken-farm-poc-01-map';
const CAMERA_ZOOM = 1.3;
const MINIMAP_HEIGHT = 124;
const MINIMAP_WIDTH = 132;
const MINIMAP_X = 24;
const MINIMAP_Y = WORLD_VIEW_HEIGHT + 20;
const PLAYER_SPEED_PX_PER_SEC = 150;
const BUILD_GRID_MAJOR_EVERY = 4;
const POC_WOLF_ID = 'timber_wolf';
const POC_FENCE_ID = 'fence_wood';
const POC_TOWER_ID = 'tower_scout';
const POC_PATH_BOUNDS_PADDING = 512;
const POC_WOLF_TEST_HP = 1400;
const POC_TOWER_FOCUS_LOCK_SEC = 0.45;
const POC_FIXED_PLAYER_SLOT_ID: number | null = 3;
const COMBAT_GRID_PX = 32;

type CombatPocFenceRow = {
    readonly fromX: number;
    readonly id: string;
    readonly toX: number;
    readonly y: number;
};

type CombatPocFenceColumn = {
    readonly fromY: number;
    readonly id: string;
    readonly toY: number;
    readonly x: number;
};

type CombatPocSingleCell = {
    readonly id: string;
    readonly x: number;
    readonly y: number;
};

type CombatPocStoneRow = {
    readonly fromX: number;
    readonly id: string;
    readonly toX: number;
    readonly y: number;
};

type CombatPocLayout = {
    readonly anchorSlotId: number;
    readonly farm: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly fenceColumns: readonly CombatPocFenceColumn[];
    readonly fenceRows: readonly CombatPocFenceRow[];
    readonly fenceSingles: readonly CombatPocSingleCell[];
    readonly label: string;
    readonly originOffsetCells: { readonly x: number; readonly y: number };
    readonly stoneRows: readonly CombatPocStoneRow[];
    readonly towerA: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly towerB: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
    readonly wolf: {
        readonly h: number;
        readonly w: number;
        readonly x: number;
        readonly y: number;
    };
};

// Backup of the current lower-left defense PoC. Move the whole setup by editing
// originOffsetCells; keep individual x/y values for relative fence/tower layout.
const COMBAT_POC_LAYOUT: CombatPocLayout = {
    anchorSlotId: 3,
    farm: { h: 2, w: 3, x: -3, y: 11 },
    fenceColumns: [
        { fromY: 3, id: 'fence_left', toY: 15, x: 4 },
        { fromY: 2, id: 'fence_right', toY: 6, x: 19 },
        { fromY: 7, id: 'fence_inner_turn', toY: 13, x: 8 },
    ],
    fenceRows: [
        { fromX: 4, id: 'fence_top', toX: 19, y: 2 },
        { fromX: 8, id: 'fence_inner_bottom', toX: 19, y: 7 },
    ],
    fenceSingles: [{ id: 'fence_tower_a_right', x: 4, y: 12 }],
    label: 'p3-lower-left-defense-backup',
    originOffsetCells: { x: -13, y: -1 },
    stoneRows: [{ fromX: 0, id: 'stone_bottom_lock', toX: 22, y: 16 }],
    towerA: { h: 2, w: 2, x: 1, y: 11 },
    towerB: { h: 2, w: 2, x: 16, y: 4 },
    wolf: { h: 1, w: 1, x: 22, y: 9 },
};

type CombatBuildingKind = 'farm_core' | 'fence' | 'tower';

type CombatBuilding = {
    readonly body: Phaser.GameObjects.Rectangle;
    readonly blocksPath: boolean;
    readonly footprint: Phaser.Geom.Rectangle;
    readonly hpBack: Phaser.GameObjects.Rectangle;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    readonly armor: number;
    hp: number;
    readonly id: string;
    readonly kind: CombatBuildingKind;
    readonly maxHp: number;
    readonly name: string;
    readonly attackDamageScale: number;
    nextAttackAtSec: number;
    readonly targetableByWolves: boolean;
};

type CombatWolf = {
    readonly body: Phaser.GameObjects.Container;
    readonly defaultTargetBuildingId: string;
    focusBuildingId?: string;
    focusLockedUntilSec: number;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    hp: number;
    readonly maxHp: number;
    nextAttackAtSec: number;
    nextRepathAtSec: number;
    path: readonly GridPathPoint[];
    pathIndex: number;
    pathFailedSinceSec?: number;
    state: 'attack' | 'blocked' | 'dead' | 'move';
    targetBuildingId?: string;
    targetPoint: Phaser.Math.Vector2;
};

type VisibilityOverlayConfig = {
    readonly cellSize: number;
    readonly exploredAlpha: number;
    readonly fogColor: number;
    readonly nightAlpha: number;
    readonly nightColor: number;
    readonly revealRadiusPx: number;
    readonly unexploredAlpha: number;
};

type MarkerStyle = {
    readonly color: number;
    readonly label: string;
    readonly radius: number;
};

type PlayerStart = {
    readonly id: number;
    readonly label: string;
    readonly x: number;
    readonly y: number;
};

type WorldMarker = {
    readonly color: number;
    readonly type: string;
    readonly x: number;
    readonly y: number;
};

const MARKER_STYLES: Record<string, MarkerStyle> = {
    boss_spawn: { color: 0xd4b15f, label: 'B', radius: 8 },
    neutral_spider: { color: 0x8e66d8, label: 'SP', radius: 7 },
    wolf_spawn: { color: 0xd45846, label: 'WF', radius: 7 },
    wolf_spawn_rect: { color: 0xd45846, label: 'WF', radius: 6 },
    wolf_stone: { color: 0x6cc7d8, label: 'STONE', radius: 8 },
};

const VISIBILITY_OVERLAY: VisibilityOverlayConfig = {
    cellSize: 48,
    exploredAlpha: 0.2,
    fogColor: 0x071107,
    nightAlpha: 0,
    nightColor: 0x0b1530,
    revealRadiusPx: 260,
    unexploredAlpha: 0.62,
};

class FarmScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private debugText!: Phaser.GameObjects.Text;
    private keys!: Record<
        | 'down'
        | 'left'
        | 'one'
        | 'right'
        | 'two'
        | 'three'
        | 'four'
        | 'five'
        | 'six'
        | 'seven'
        | 'eight'
        | 'grid'
        | 'up',
        Phaser.Input.Keyboard.Key
    >;
    private buildGridGraphics?: Phaser.GameObjects.Graphics;
    private buildGridVisible = true;
    private combatBuildings: CombatBuilding[] = [];
    private combatGraphics?: Phaser.GameObjects.Graphics;
    private combatLabel?: Phaser.GameObjects.Text;
    private combatWolf?: CombatWolf;
    private elapsedSec = 0;
    private exploredFogCells = new Set<string>();
    private fogGraphics?: Phaser.GameObjects.Graphics;
    private lightingGraphics?: Phaser.GameObjects.Graphics;
    private minimapGraphics?: Phaser.GameObjects.Graphics;
    private player?: Phaser.GameObjects.Container;
    private playerSlotText?: Phaser.GameObjects.Text;
    private playerStartLabel = 'P?';
    private playerStarts: PlayerStart[] = [];
    private uiObjects: Phaser.GameObjects.GameObject[] = [];
    private worldCamera!: Phaser.Cameras.Scene2D.Camera;
    private worldMarkers: WorldMarker[] = [];
    private worldObjects: Phaser.GameObjects.GameObject[] = [];
    private worldSize = new Phaser.Math.Vector2(0, 0);
    private worldScale = CHICKEN_FARM_TILEMAP_POC_01.defaultScale;

    constructor() {
        super('farm-poc');
    }

    preload() {
        this.load.image(TILESET_KEY, CHICKEN_FARM_TILEMAP_POC_01.tilesetImagePath);
        this.load.tilemapTiledJSON(TILEMAP_KEY, CHICKEN_FARM_TILEMAP_POC_01.mapPath);
    }

    create() {
        this.cameras.main.setBackgroundColor('#0b0f0a');
        this.worldCamera = this.cameras.main;
        this.worldCamera.setViewport(
            0,
            0,
            CHICKEN_FARM_TILEMAP_POC_01.defaultViewportWidth,
            CHICKEN_FARM_TILEMAP_POC_01.defaultViewportHeight,
        );

        const map = this.make.tilemap({ key: TILEMAP_KEY });
        const tileset = map.addTilesetImage('kenney-tiny-town', TILESET_KEY);

        if (!tileset) {
            throw new Error('Missing Kenney Tiny Town tileset');
        }

        this.createTileLayer(map, tileset, 'ground', 0);
        this.createTileLayer(map, tileset, 'collision_static', 2);
        this.createBuildGrid(map);
        this.renderObjectLayer(map, 'farm_zones');
        this.renderObjectLayer(map, 'spawns');
        this.createPlayerAtRandomStart();
        this.createUi();
        this.createVisibilityOverlays();
        this.configureCameras(map);
        this.createCombatPoc();
        this.updateLightingOverlay();
        this.updateFogOfWar();
        this.updateMinimap();
        this.configureControls();
    }

    update(_time: number, delta: number) {
        this.elapsedSec += delta / 1000;
        this.updatePlayerSlotHotkeys();
        this.updateBuildGridHotkey();
        this.updatePlayerMovement(delta / 1000);
        this.updateCombatPoc(delta / 1000);
        this.updateFogOfWar();
        this.updateMinimap();
        this.updateDebugText();
    }

    private createTileLayer(
        map: Phaser.Tilemaps.Tilemap,
        tileset: Phaser.Tilemaps.Tileset,
        layerName: string,
        depth: number,
    ) {
        const layer = map.createLayer(layerName, tileset, 0, 0);

        if (!layer) {
            throw new Error(`Missing tile layer: ${layerName}`);
        }

        layer.setDepth(depth);
        layer.setScale(this.worldScale);
        this.worldObjects.push(layer);

        return layer;
    }

    private renderObjectLayer(map: Phaser.Tilemaps.Tilemap, layerName: string) {
        const objectLayer = map.getObjectLayer(layerName);
        if (!objectLayer) return;

        const graphics = this.add
            .graphics()
            .setDepth(layerName === 'farm_zones' ? 4 : 5);
        const labelObjects: Phaser.GameObjects.Text[] = [];

        objectLayer.objects.forEach((object) => {
            const x = (object.x ?? 0) * this.worldScale;
            const y = (object.y ?? 0) * this.worldScale;
            const width = (object.width ?? 16) * this.worldScale;
            const height = (object.height ?? 16) * this.worldScale;

            if (object.type === 'farm_zone') {
                graphics.lineStyle(2, 0xf1d77a, 0.42);
                graphics.fillStyle(0xb98c4a, 0.07);
                graphics.fillRect(x, y, width, height);
                graphics.strokeRect(x, y, width, height);

                const label = this.add
                    .text(x + 8, y + 8, String(object.name ?? 'farm'), {
                        backgroundColor: 'rgba(28, 22, 12, 0.72)',
                        color: '#f5e6ae',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '12px',
                        padding: { bottom: 3, left: 5, right: 5, top: 3 },
                    })
                    .setDepth(8);
                labelObjects.push(label);

                const playerLabel = this.getPlayerStartLabel(object.name);
                if (playerLabel) {
                    const slotId = Number(playerLabel.slice(1));
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    this.playerStarts.push({
                        id: slotId,
                        label: playerLabel,
                        x: centerX,
                        y: centerY,
                    });

                    graphics.lineStyle(2, 0x101010, 0.56);
                    graphics.fillStyle(0xf0d45a, 0.34);
                    graphics.fillCircle(centerX, centerY, 10);
                    graphics.strokeCircle(centerX, centerY, 10);

                    const startText = this.add
                        .text(centerX, centerY - 1, playerLabel, {
                            color: '#f5e6ae',
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '12px',
                            fontStyle: '700',
                        })
                        .setDepth(9)
                        .setOrigin(0.5);
                    labelObjects.push(startText);
                }
                return;
            }

            const marker = MARKER_STYLES[object.type ?? ''] ?? {
                color: 0xffffff,
                label: '?',
                radius: 5,
            };
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            this.worldMarkers.push({
                color: marker.color,
                type: object.type ?? 'unknown',
                x: centerX,
                y: centerY,
            });

            graphics.lineStyle(2, 0x101010, 0.9);
            graphics.fillStyle(marker.color, 0.88);
            graphics.fillCircle(
                centerX,
                centerY,
                marker.radius * this.worldScale * 0.65,
            );
            graphics.strokeCircle(
                centerX,
                centerY,
                marker.radius * this.worldScale * 0.65,
            );

            const label = this.add
                .text(centerX, centerY, marker.label, {
                    color: '#101010',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: marker.label.length > 2 ? '9px' : '11px',
                    fontStyle: '700',
                })
                .setDepth(8)
                .setOrigin(0.5);
            labelObjects.push(label);
        });

        this.worldObjects.push(graphics, ...labelObjects);
    }

    private createBuildGrid(map: Phaser.Tilemaps.Tilemap) {
        const grid = this.add.graphics().setDepth(19);
        const tileWidth = map.tileWidth * this.worldScale;
        const tileHeight = map.tileHeight * this.worldScale;
        const width = map.widthInPixels * this.worldScale;
        const height = map.heightInPixels * this.worldScale;

        for (let x = 0; x <= width; x += tileWidth) {
            const tileIndex = Math.round(x / tileWidth);
            const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
            grid.lineStyle(1, major ? 0xffe58a : 0xe7dcc0, major ? 0.46 : 0.24);
            grid.lineBetween(x, 0, x, height);
        }

        for (let y = 0; y <= height; y += tileHeight) {
            const tileIndex = Math.round(y / tileHeight);
            const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
            grid.lineStyle(1, major ? 0xffe58a : 0xe7dcc0, major ? 0.46 : 0.24);
            grid.lineBetween(0, y, width, y);
        }

        this.buildGridGraphics = grid;
        this.worldObjects.push(grid);
    }

    private createCombatPoc() {
        if (!this.player) return;

        this.combatBuildings.forEach((building) => {
            building.body.destroy();
            building.hpBack.destroy();
            building.hpFill.destroy();
        });
        this.combatWolf?.body.destroy();
        this.combatGraphics?.destroy();
        this.combatLabel?.destroy();

        this.combatBuildings = [];
        const layout = COMBAT_POC_LAYOUT;
        const anchor = this.getPlayerStartById(layout.anchorSlotId) ?? {
            id: layout.anchorSlotId,
            label: `P${layout.anchorSlotId}`,
            x: this.player.x,
            y: this.player.y,
        };
        const snapToGrid = (value: number) =>
            Math.round(value / COMBAT_GRID_PX) * COMBAT_GRID_PX;
        const originWorldX = anchor.x + layout.originOffsetCells.x * COMBAT_GRID_PX;
        const originWorldY = anchor.y + layout.originOffsetCells.y * COMBAT_GRID_PX;
        const originX = snapToGrid(
            Phaser.Math.Clamp(originWorldX, 64, this.worldSize.x - 1024),
        );
        const originY = snapToGrid(
            Phaser.Math.Clamp(originWorldY, 64, this.worldSize.y - 1024),
        );
        const cellCenter = (
            cellX: number,
            cellY: number,
            cellWidth: number,
            cellHeight: number,
        ) => ({
            x: originX + (cellX + cellWidth / 2) * COMBAT_GRID_PX,
            y: originY + (cellY + cellHeight / 2) * COMBAT_GRID_PX,
        });

        this.combatGraphics = this.add.graphics().setDepth(21);
        this.worldObjects.push(this.combatGraphics);

        const farmCell = cellCenter(
            layout.farm.x,
            layout.farm.y,
            layout.farm.w,
            layout.farm.h,
        );
        const farmCore = this.addCombatBuilding({
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
        const towerTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID];
        const towerACell = cellCenter(
            layout.towerA.x,
            layout.towerA.y,
            layout.towerA.w,
            layout.towerA.h,
        );
        const towerA = this.addCombatBuilding({
            attackDamageScale: 0.55,
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
        const towerBCell = cellCenter(
            layout.towerB.x,
            layout.towerB.y,
            layout.towerB.w,
            layout.towerB.h,
        );
        const towerB = this.addCombatBuilding({
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
        towerB.nextAttackAtSec = this.elapsedSec + 0.58;

        const fenceTemplate = CHICKEN_FARM_BALANCE.buildingTemplates[POC_FENCE_ID];
        const addGridFence = (id: string, cellX: number, cellY: number) => {
            const position = cellCenter(cellX, cellY, 2, 1);
            return this.addCombatBuilding({
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
        const addGridStoneWall = (
            id: string,
            cellX: number,
            cellY: number,
            cellWidth: number,
            cellHeight: number,
        ) => {
            const position = cellCenter(cellX, cellY, cellWidth, cellHeight);
            return this.addCombatBuilding({
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
        const addFenceColumn = (
            id: string,
            cellX: number,
            fromY: number,
            toY: number,
        ) => {
            for (let cellY = fromY; cellY <= toY; cellY += 1) {
                addGridFence(`${id}_${cellY}`, cellX, cellY);
            }
        };
        const addFenceRow = (id: string, fromX: number, toX: number, cellY: number) => {
            for (let cellX = fromX; cellX <= toX; cellX += 2) {
                addGridFence(`${id}_${cellX}`, cellX, cellY);
            }
        };
        const addStoneRow = (id: string, fromX: number, toX: number, cellY: number) => {
            for (let cellX = fromX; cellX <= toX; cellX += 2) {
                addGridStoneWall(`${id}_${cellX}`, cellX, cellY, 2, 1);
            }
        };

        layout.fenceRows.forEach((row) =>
            addFenceRow(row.id, row.fromX, row.toX, row.y),
        );
        layout.fenceColumns.forEach((column) =>
            addFenceColumn(column.id, column.x, column.fromY, column.toY),
        );
        layout.fenceSingles.forEach((fence) =>
            addGridFence(fence.id, fence.x, fence.y),
        );
        layout.stoneRows.forEach((row) =>
            addStoneRow(row.id, row.fromX, row.toX, row.y),
        );

        const wolfCell = cellCenter(
            layout.wolf.x,
            layout.wolf.y,
            layout.wolf.w,
            layout.wolf.h,
        );
        this.createCombatWolf(
            wolfCell.x,
            wolfCell.y,
            farmCore.body.x,
            farmCore.body.y,
            farmCore.id,
        );

        this.combatLabel = this.add
            .text(originX, originY - COMBAT_GRID_PX * 2, layout.label, {
                backgroundColor: 'rgba(16,16,16,0.72)',
                color: '#f5e6ae',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '12px',
                padding: { bottom: 4, left: 6, right: 6, top: 4 },
            })
            .setDepth(31);
        this.worldObjects.push(this.combatLabel);
        this.updateCombatBuildingHealth(farmCore);
        this.updateCombatBuildingHealth(towerA);
        this.updateCombatBuildingHealth(towerB);
    }

    private addCombatBuilding(config: {
        readonly armor: number;
        readonly blocksPath: boolean;
        readonly color: number;
        readonly height: number;
        readonly hp: number;
        readonly id: string;
        readonly kind: CombatBuildingKind;
        readonly name: string;
        readonly attackDamageScale?: number;
        readonly targetableByWolves: boolean;
        readonly width: number;
        readonly x: number;
        readonly y: number;
    }): CombatBuilding {
        const body = this.add
            .rectangle(config.x, config.y, config.width, config.height, config.color, 1)
            .setStrokeStyle(2, 0x17120d, 0.9)
            .setDepth(24);
        const hpBack = this.add
            .rectangle(
                config.x,
                config.y - config.height / 2 - 12,
                config.width,
                5,
                0x111111,
                0.9,
            )
            .setDepth(25);
        const hpFill = this.add
            .rectangle(
                config.x - config.width / 2,
                config.y - config.height / 2 - 12,
                config.width,
                3,
                0x49d75d,
                1,
            )
            .setOrigin(0, 0.5)
            .setDepth(26);
        const label = this.add
            .text(config.x, config.y + config.height / 2 + 8, config.name, {
                color: '#f5e6ae',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(26)
            .setOrigin(0.5, 0);

        const building: CombatBuilding = {
            armor: config.armor,
            body,
            blocksPath: config.blocksPath,
            footprint: new Phaser.Geom.Rectangle(
                config.x - config.width / 2,
                config.y - config.height / 2,
                config.width,
                config.height,
            ),
            hp: config.hp,
            hpBack,
            hpFill,
            id: config.id,
            kind: config.kind,
            maxHp: config.hp,
            name: config.name,
            attackDamageScale: config.attackDamageScale ?? 1,
            nextAttackAtSec: 0,
            targetableByWolves: config.targetableByWolves,
        };

        this.combatBuildings.push(building);
        this.worldObjects.push(body, hpBack, hpFill, label);

        return building;
    }
    private createCombatWolf(
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        defaultTargetBuildingId: string,
    ) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const maxHp = Math.max(enemy.hp, POC_WOLF_TEST_HP);
        const shadow = this.add.ellipse(0, 11, 34, 15, 0x070807, 0.52).setDepth(24);
        const body = this.add.ellipse(0, 0, 32, 22, 0x714f42, 1).setDepth(25);
        const head = this.add
            .triangle(19, -2, 0, -8, 16, 0, 0, 8, 0x8a6758, 1)
            .setDepth(26);
        const hpBack = this.add.rectangle(0, -24, 38, 5, 0x111111, 0.9).setDepth(27);
        const hpFill = this.add
            .rectangle(-19, -24, 38, 3, 0xff5d52, 1)
            .setOrigin(0, 0.5)
            .setDepth(28);
        const label = this.add
            .text(0, 20, 'wolf', {
                color: '#f5d0b8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(28)
            .setOrigin(0.5);
        const container = this.add.container(x, y, [
            shadow,
            body,
            head,
            hpBack,
            hpFill,
            label,
        ]);
        container.setDepth(28);

        this.combatWolf = {
            body: container,
            defaultTargetBuildingId,
            focusLockedUntilSec: 0,
            hp: maxHp,
            hpFill,
            maxHp,
            nextAttackAtSec: 0,
            nextRepathAtSec: 0,
            path: [],
            pathIndex: 0,
            state: 'move',
            targetPoint: new Phaser.Math.Vector2(targetX, targetY),
        };
        this.worldObjects.push(container);
    }

    private updateCombatPoc(deltaSec: number) {
        if (!this.combatWolf || this.combatWolf.state === 'dead') return;

        this.updateTowerCombat();
        this.updateWolfCombat(deltaSec);
        this.drawCombatDebug();
    }

    private updateTowerCombat() {
        const wolf = this.combatWolf;
        if (!wolf || wolf.hp <= 0) return;

        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (!towerAttack) return;

        this.combatBuildings
            .filter((building) => building.kind === 'tower' && building.hp > 0)
            .forEach((tower) => {
                if (wolf.hp <= 0) return;

                const distance = Phaser.Math.Distance.Between(
                    tower.body.x,
                    tower.body.y,
                    wolf.body.x,
                    wolf.body.y,
                );
                if (
                    distance > towerAttack.rangePx ||
                    this.elapsedSec < tower.nextAttackAtSec
                ) {
                    return;
                }

                const scaledDamage = Math.max(
                    1,
                    Math.round(towerAttack.damage * tower.attackDamageScale),
                );
                wolf.hp = Math.max(0, wolf.hp - scaledDamage);
                wolf.hpFill.width = 38 * (wolf.hp / wolf.maxHp);
                tower.nextAttackAtSec = this.elapsedSec + towerAttack.cooldownSec;
                this.focusWolfOnBuilding(tower);

                if (wolf.hp <= 0) {
                    wolf.state = 'dead';
                    wolf.body.setAlpha(0.35);
                }
            });
    }

    private updateWolfCombat(deltaSec: number) {
        const wolf = this.combatWolf;
        if (!wolf || wolf.hp <= 0) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        this.syncWolfTargetPoint();
        const directTarget = this.getCurrentWolfTarget();

        if (directTarget) {
            wolf.targetBuildingId = directTarget.id;
            wolf.state = 'attack';
            this.attackCombatBuilding(directTarget, enemy.damage);
            return;
        }

        this.refreshWolfPathIfNeeded();

        if (wolf.path.length > 0 && wolf.pathIndex < wolf.path.length) {
            wolf.targetBuildingId = undefined;
            wolf.pathFailedSinceSec = undefined;
            wolf.state = 'move';
            this.moveWolfAlongPath(enemy.speedPxPerSec, deltaSec);
            return;
        }

        wolf.pathFailedSinceSec ??= this.elapsedSec;
        const blockedLongEnough =
            this.elapsedSec - wolf.pathFailedSinceSec >=
            CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire.blockedToBlockerDelaySec;
        const blockingTarget = this.getWolfBlockingTarget();

        if (blockingTarget && blockedLongEnough) {
            wolf.targetBuildingId = blockingTarget.id;
            if (this.isWolfInAttackRange(blockingTarget)) {
                wolf.state = 'attack';
                this.attackCombatBuilding(blockingTarget, enemy.damage);
                return;
            }

            wolf.state = 'blocked';
            this.moveWolfToward(
                blockingTarget.body.x,
                blockingTarget.body.y,
                enemy.speedPxPerSec,
                deltaSec,
            );
            return;
        }

        wolf.targetBuildingId = undefined;
        wolf.state = 'blocked';
    }

    private focusWolfOnBuilding(building: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf || building.hp <= 0 || !building.targetableByWolves) return;
        if (
            wolf.focusBuildingId &&
            wolf.focusBuildingId !== building.id &&
            this.elapsedSec < wolf.focusLockedUntilSec
        ) {
            return;
        }

        if (wolf.focusBuildingId !== building.id) {
            wolf.focusBuildingId = building.id;
            wolf.path = [];
            wolf.pathIndex = 0;
            wolf.nextRepathAtSec = 0;
            wolf.pathFailedSinceSec = undefined;
        }
        wolf.focusLockedUntilSec = this.elapsedSec + POC_TOWER_FOCUS_LOCK_SEC;
        wolf.targetPoint.set(building.body.x, building.body.y);
    }

    private syncWolfTargetPoint() {
        const wolf = this.combatWolf;
        const goal = this.getWolfGoalBuilding();
        if (!wolf || !goal) return;

        const [candidate] = this.getWolfPathGoalCandidates(goal);
        wolf.targetPoint.set(candidate?.x ?? goal.body.x, candidate?.y ?? goal.body.y);
    }

    private moveWolfToward(
        targetX: number,
        targetY: number,
        speedPxPerSec: number,
        deltaSec: number,
    ) {
        const wolf = this.combatWolf;
        if (!wolf) return;

        const direction = new Phaser.Math.Vector2(
            targetX - wolf.body.x,
            targetY - wolf.body.y,
        );
        if (direction.lengthSq() < 16) return;

        direction.normalize().scale(speedPxPerSec * deltaSec);
        wolf.body.setPosition(wolf.body.x + direction.x, wolf.body.y + direction.y);
    }

    private moveWolfAlongPath(speedPxPerSec: number, deltaSec: number) {
        const wolf = this.combatWolf;
        if (!wolf) return;

        const waypoint = wolf.path[wolf.pathIndex];
        if (!waypoint) return;

        this.moveWolfToward(waypoint.x, waypoint.y, speedPxPerSec, deltaSec);

        if (
            Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                waypoint.x,
                waypoint.y,
            ) < 8
        ) {
            wolf.pathIndex += 1;
        }
    }

    private refreshWolfPathIfNeeded(force = false) {
        const wolf = this.combatWolf;
        if (!wolf || (!force && this.elapsedSec < wolf.nextRepathAtSec)) return;

        const pathing = CHICKEN_FARM_BALANCE.pathing;
        const blockedRects = this.getCombatBlockedRects();
        const bounds = this.getCombatPathBounds();
        const clearancePx =
            ((pathing.unitClearanceCells.wolf - 1) * pathing.cellSize) / 2;
        const goalBuilding = this.getWolfGoalBuilding();
        const goalCandidates = goalBuilding
            ? this.getWolfPathGoalCandidates(goalBuilding)
            : [{ x: wolf.targetPoint.x, y: wolf.targetPoint.y }];
        let path: readonly GridPathPoint[] | null = null;
        let pathGoal = goalCandidates[0] ?? {
            x: wolf.targetPoint.x,
            y: wolf.targetPoint.y,
        };

        for (const goal of goalCandidates) {
            const candidatePath = findGridPath({
                blockedRects,
                bounds,
                cellSize: pathing.cellSize,
                clearancePx,
                goal,
                start: { x: wolf.body.x, y: wolf.body.y },
            });

            if (!candidatePath) continue;
            if (!path || candidatePath.length < path.length) {
                path = candidatePath;
                pathGoal = goal;
            }
        }

        wolf.targetPoint.set(pathGoal.x, pathGoal.y);

        wolf.path = path ?? [];
        wolf.pathIndex = 0;
        wolf.nextRepathAtSec = this.elapsedSec + pathing.repath.intervalSec;

        if (path) {
            wolf.pathFailedSinceSec = undefined;
        }
    }

    private getWolfPathGoalCandidates(building: CombatBuilding): GridPathPoint[] {
        const wolf = this.combatWolf;
        const attackRange =
            CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
        const margin = Math.max(12, attackRange - 10);
        const left = building.footprint.left;
        const right = building.footprint.right;
        const top = building.footprint.top;
        const bottom = building.footprint.bottom;
        const centerX = building.body.x;
        const centerY = building.body.y;
        const candidates: GridPathPoint[] = [
            { x: centerX, y: top - margin },
            { x: left - margin, y: centerY },
            { x: right + margin, y: centerY },
            { x: centerX, y: bottom + margin },
            { x: left - margin, y: top - margin },
            { x: right + margin, y: top - margin },
            { x: left - margin, y: bottom + margin },
            { x: right + margin, y: bottom + margin },
        ];

        return candidates
            .filter((candidate) => !this.isCombatPathPointBlocked(candidate))
            .sort((a, b) => {
                if (!wolf) return 0;
                return (
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y)
                );
            });
    }

    private isCombatPathPointBlocked(point: GridPathPoint) {
        return this.getCombatBlockedRects().some((rect) =>
            Phaser.Geom.Rectangle.Contains(
                new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height),
                point.x,
                point.y,
            ),
        );
    }

    private getCurrentWolfTarget() {
        const wolf = this.combatWolf;
        if (!wolf) return null;
        const focusedGoal = this.getWolfGoalBuilding();

        if (
            focusedGoal &&
            focusedGoal.kind !== 'fence' &&
            this.isWolfInAttackRange(focusedGoal) &&
            !this.isWolfAttackLineBlocked(focusedGoal)
        ) {
            return focusedGoal;
        }

        return (
            this.combatBuildings.find((building) => {
                if (!building.targetableByWolves || building.hp <= 0) return false;

                if (!this.isWolfInAttackRange(building)) return false;
                if (building.kind === 'fence') return false;
                if (this.isWolfAttackLineBlocked(building)) return false;
                if (building.kind === 'tower') return true;
                return true;
            }) ?? null
        );
    }

    private isWolfAttackLineBlocked(target: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf) return false;

        const line = new Phaser.Geom.Line(
            wolf.body.x,
            wolf.body.y,
            target.body.x,
            target.body.y,
        );

        return this.combatBuildings.some((building) => {
            if (building.id === target.id || building.hp <= 0 || !building.blocksPath) {
                return false;
            }

            return Phaser.Geom.Intersects.LineToRectangle(line, building.footprint);
        });
    }

    private getWolfGoalBuilding() {
        const wolf = this.combatWolf;
        if (!wolf) return null;

        const focused = wolf.focusBuildingId
            ? this.combatBuildings.find(
                  (building) =>
                      building.id === wolf.focusBuildingId &&
                      building.hp > 0 &&
                      building.targetableByWolves,
              )
            : undefined;
        if (focused) return focused;

        wolf.focusBuildingId = undefined;
        return (
            this.combatBuildings.find(
                (building) =>
                    building.id === wolf.defaultTargetBuildingId &&
                    building.hp > 0 &&
                    building.targetableByWolves,
            ) ?? null
        );
    }

    private getWolfBlockingTarget() {
        const wolf = this.combatWolf;
        if (!wolf) return null;

        const pathLine = this.getWolfTargetLine();
        const searchRadius =
            CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire.searchRadiusPx;
        const blockers = this.combatBuildings
            .filter((building) => {
                if (
                    !building.blocksPath ||
                    !building.targetableByWolves ||
                    building.hp <= 0
                ) {
                    return false;
                }

                const closeEnough =
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        building.body.x,
                        building.body.y,
                    ) <= searchRadius;

                return (
                    closeEnough ||
                    Phaser.Geom.Intersects.LineToRectangle(pathLine, building.footprint)
                );
            })
            .sort(
                (a, b) =>
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        a.body.x,
                        a.body.y,
                    ) -
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        b.body.x,
                        b.body.y,
                    ),
            );

        return blockers[0] ?? null;
    }

    private isWolfInAttackRange(building: CombatBuilding) {
        const wolf = this.combatWolf;
        if (!wolf) return false;

        const attackRange =
            CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
        const attackCircle = new Phaser.Geom.Circle(
            wolf.body.x,
            wolf.body.y,
            attackRange,
        );

        return (
            Phaser.Geom.Rectangle.Contains(
                building.footprint,
                wolf.body.x,
                wolf.body.y,
            ) ||
            Phaser.Geom.Intersects.CircleToRectangle(attackCircle, building.footprint)
        );
    }

    private attackCombatBuilding(building: CombatBuilding, damage: number) {
        const wolf = this.combatWolf;
        if (!wolf || this.elapsedSec < wolf.nextAttackAtSec) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        building.hp = Math.max(0, building.hp - Math.max(1, damage - building.armor));
        wolf.nextAttackAtSec = this.elapsedSec + enemy.attackCooldownSec;
        this.updateCombatBuildingHealth(building);

        if (building.hp <= 0) {
            building.body.setAlpha(0.22);
            building.hpBack.setVisible(false);
            building.hpFill.setVisible(false);
            if (wolf.focusBuildingId === building.id) {
                wolf.focusBuildingId = undefined;
            }
            this.refreshWolfPathIfNeeded(true);
        }
    }

    private getCombatBlockedRects() {
        return this.combatBuildings
            .filter(
                (building) =>
                    building.blocksPath &&
                    building.hp > 0 &&
                    building.kind !== 'farm_core',
            )
            .map((building) => ({
                height: building.footprint.height,
                width: building.footprint.width,
                x: building.footprint.x,
                y: building.footprint.y,
            }));
    }

    private getCombatPathBounds() {
        const wolf = this.combatWolf;
        const points = [
            ...(wolf ? [{ x: wolf.body.x, y: wolf.body.y }] : []),
            { x: wolf?.targetPoint.x ?? 0, y: wolf?.targetPoint.y ?? 0 },
            ...this.combatBuildings.map((building) => ({
                x: building.body.x,
                y: building.body.y,
            })),
        ];
        const minX =
            Math.min(...points.map((point) => point.x)) - POC_PATH_BOUNDS_PADDING;
        const minY =
            Math.min(...points.map((point) => point.y)) - POC_PATH_BOUNDS_PADDING;
        const maxX =
            Math.max(...points.map((point) => point.x)) + POC_PATH_BOUNDS_PADDING;
        const maxY =
            Math.max(...points.map((point) => point.y)) + POC_PATH_BOUNDS_PADDING;
        const x = Math.max(0, minX);
        const y = Math.max(0, minY);
        const width = Math.min(this.worldSize.x, maxX) - x;
        const height = Math.min(this.worldSize.y, maxY) - y;

        return {
            height: Math.max(COMBAT_GRID_PX, height),
            width: Math.max(COMBAT_GRID_PX, width),
            x,
            y,
        };
    }

    private updateCombatBuildingHealth(building: CombatBuilding) {
        building.hpFill.width = Math.max(
            0,
            building.body.width * (building.hp / building.maxHp),
        );
    }

    private getWolfTargetLine() {
        const wolf = this.combatWolf;

        return new Phaser.Geom.Line(
            wolf?.body.x ?? 0,
            wolf?.body.y ?? 0,
            wolf?.targetPoint.x ?? 0,
            wolf?.targetPoint.y ?? 0,
        );
    }

    private drawCombatDebug() {
        if (!this.combatGraphics || !this.combatWolf) return;

        const graphics = this.combatGraphics;
        const wolf = this.combatWolf;
        const towers = this.combatBuildings.filter(
            (building) => building.kind === 'tower' && building.hp > 0,
        );
        const goal = this.getWolfGoalBuilding();
        const blockingTarget = this.getWolfBlockingTarget();
        const target = this.getCurrentWolfTarget() ?? blockingTarget ?? goal;

        graphics.clear();
        graphics.lineStyle(2, 0xff675d, 0.68);
        graphics.lineBetween(
            wolf.body.x,
            wolf.body.y,
            wolf.targetPoint.x,
            wolf.targetPoint.y,
        );

        if (wolf.path.length > 0) {
            graphics.lineStyle(3, 0x7ee6ff, 0.76);
            let fromX = wolf.body.x;
            let fromY = wolf.body.y;
            for (let index = wolf.pathIndex; index < wolf.path.length; index += 1) {
                const waypoint = wolf.path[index];
                graphics.lineBetween(fromX, fromY, waypoint.x, waypoint.y);
                graphics.fillStyle(0x7ee6ff, 0.9);
                graphics.fillCircle(waypoint.x, waypoint.y, 3);
                fromX = waypoint.x;
                fromY = waypoint.y;
            }
        }

        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (towerAttack) {
            towers.forEach((tower) => {
                graphics.lineStyle(2, 0xffd35a, 0.58);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.fillStyle(0xffd35a, 0.06);
                graphics.fillCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
            });
        }

        this.combatLabel?.setText(
            `Combat PoC | wolf ${wolf.state}${target ? ` -> ${target.name}` : ''}\n` +
                `Tower aggro focus: ${goal?.name ?? 'none'} | HP ${Math.ceil(wolf.hp)}/${wolf.maxHp}\n` +
                `A* ${wolf.path.length > 0 ? `path ${wolf.path.length}` : 'no path'} | blocker attack only after sealed path.`,
        );
    }

    private getPlayerStartById(id: number) {
        return this.playerStarts.find((start) => start.id === id) ?? null;
    }

    private getPlayerStartLabel(name: unknown) {
        if (typeof name !== 'string') return null;

        const match = /^farm_p(\d+)$/u.exec(name);
        if (!match) return null;

        return `P${match[1]}`;
    }

    private createPlayerAtRandomStart() {
        if (!this.playerStarts.length) return;

        const start =
            (POC_FIXED_PLAYER_SLOT_ID
                ? this.getPlayerStartById(POC_FIXED_PLAYER_SLOT_ID)
                : null) ?? Phaser.Utils.Array.GetRandom(this.playerStarts);
        this.createPlayerMarker();
        this.movePlayerToStart(start);
    }

    private createPlayerMarker() {
        const shadow = this.add.ellipse(0, 9, 34, 14, 0x050805, 0.48).setDepth(10);
        const selection = this.add
            .ellipse(0, 12, 42, 20)
            .setStrokeStyle(2, 0x36d95e, 0.92)
            .setDepth(11);
        const body = this.add.circle(0, 0, 12, 0xe8d2a0, 1).setDepth(12);
        const cap = this.add.rectangle(0, -9, 18, 8, 0x6b4328, 1).setDepth(13);
        const nose = this.add
            .triangle(13, 0, 0, -4, 8, 0, 0, 4, 0xd88a3d, 1)
            .setDepth(13);
        const hpBack = this.add.rectangle(0, -25, 38, 5, 0x101010, 0.9).setDepth(14);
        const hpFill = this.add.rectangle(0, -25, 34, 3, 0x44d35f, 1).setDepth(15);
        const label = this.add
            .text(0, 23, '', {
                backgroundColor: 'rgba(16, 16, 16, 0.74)',
                color: '#f7e89a',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
                padding: { bottom: 2, left: 4, right: 4, top: 2 },
            })
            .setDepth(16)
            .setOrigin(0.5);

        this.playerSlotText = label;
        this.player = this.add.container(0, 0, [
            shadow,
            selection,
            body,
            cap,
            nose,
            hpBack,
            hpFill,
            label,
        ]);
        this.player.setDepth(20);
        this.worldObjects.push(this.player);
    }

    private movePlayerToStart(start: PlayerStart) {
        if (!this.player) return;

        this.player.setPosition(start.x, start.y);
        this.playerStartLabel = start.label;
        this.playerSlotText?.setText(`${start.label} PLAYER`);
        this.revealAroundPlayer();

        if (this.worldCamera) {
            this.worldCamera.centerOn(start.x, start.y);
        }
    }

    private updatePlayerMovement(deltaSec: number) {
        if (!this.player) return;

        const move = new Phaser.Math.Vector2(0, 0);

        if (this.cursors.left.isDown || this.keys.left.isDown) move.x -= 1;
        if (this.cursors.right.isDown || this.keys.right.isDown) move.x += 1;
        if (this.cursors.up.isDown || this.keys.up.isDown) move.y -= 1;
        if (this.cursors.down.isDown || this.keys.down.isDown) move.y += 1;

        if (move.lengthSq() <= 0) return;

        move.normalize().scale(PLAYER_SPEED_PX_PER_SEC * deltaSec);

        const nextX = Phaser.Math.Clamp(
            this.player.x + move.x,
            12,
            this.worldSize.x - 12,
        );
        const nextY = Phaser.Math.Clamp(
            this.player.y + move.y,
            12,
            this.worldSize.y - 12,
        );
        this.player.setPosition(nextX, nextY);
    }

    private createVisibilityOverlays() {
        this.lightingGraphics = this.add.graphics().setDepth(17);
        this.fogGraphics = this.add.graphics().setDepth(18);
        this.worldObjects.push(this.lightingGraphics, this.fogGraphics);
    }

    private updateLightingOverlay() {
        if (!this.lightingGraphics || this.worldSize.x <= 0) return;

        this.lightingGraphics.clear();

        if (VISIBILITY_OVERLAY.nightAlpha <= 0) return;

        this.lightingGraphics.fillStyle(
            VISIBILITY_OVERLAY.nightColor,
            VISIBILITY_OVERLAY.nightAlpha,
        );
        this.lightingGraphics.fillRect(0, 0, this.worldSize.x, this.worldSize.y);
    }

    private revealAroundPlayer() {
        if (!this.player) return;

        const playerCellX = Math.floor(this.player.x / VISIBILITY_OVERLAY.cellSize);
        const playerCellY = Math.floor(this.player.y / VISIBILITY_OVERLAY.cellSize);
        const radiusCells = Math.ceil(
            VISIBILITY_OVERLAY.revealRadiusPx / VISIBILITY_OVERLAY.cellSize,
        );

        for (
            let y = playerCellY - radiusCells;
            y <= playerCellY + radiusCells;
            y += 1
        ) {
            for (
                let x = playerCellX - radiusCells;
                x <= playerCellX + radiusCells;
                x += 1
            ) {
                const centerX =
                    x * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
                const centerY =
                    y * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;

                if (
                    centerX < 0 ||
                    centerY < 0 ||
                    centerX > this.worldSize.x ||
                    centerY > this.worldSize.y
                ) {
                    continue;
                }

                if (
                    Phaser.Math.Distance.Between(
                        this.player.x,
                        this.player.y,
                        centerX,
                        centerY,
                    ) <= VISIBILITY_OVERLAY.revealRadiusPx
                ) {
                    this.exploredFogCells.add(this.getFogCellKey(x, y));
                }
            }
        }
    }

    private updateFogOfWar() {
        if (!this.fogGraphics || !this.player || this.worldSize.x <= 0) return;

        this.revealAroundPlayer();
        this.fogGraphics.clear();

        const cols = Math.ceil(this.worldSize.x / VISIBILITY_OVERLAY.cellSize);
        const rows = Math.ceil(this.worldSize.y / VISIBILITY_OVERLAY.cellSize);

        for (let y = 0; y < rows; y += 1) {
            for (let x = 0; x < cols; x += 1) {
                const centerX =
                    x * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
                const centerY =
                    y * VISIBILITY_OVERLAY.cellSize + VISIBILITY_OVERLAY.cellSize / 2;
                const distance = Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    centerX,
                    centerY,
                );

                if (distance <= VISIBILITY_OVERLAY.revealRadiusPx) continue;

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

    private getFogCellKey(x: number, y: number) {
        return `${x},${y}`;
    }

    private updatePlayerSlotHotkeys() {
        const slotKeys = [
            this.keys.one,
            this.keys.two,
            this.keys.three,
            this.keys.four,
            this.keys.five,
            this.keys.six,
            this.keys.seven,
            this.keys.eight,
        ];

        slotKeys.forEach((key, index) => {
            if (!Phaser.Input.Keyboard.JustDown(key)) return;

            const start = this.playerStarts.find(
                (candidate) => candidate.id === index + 1,
            );
            if (start) this.movePlayerToStart(start);
        });
    }

    private updateBuildGridHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.grid)) return;

        this.buildGridVisible = !this.buildGridVisible;
        this.buildGridGraphics?.setVisible(this.buildGridVisible);
    }

    private createUi() {
        const panel = this.add
            .rectangle(0, WORLD_VIEW_HEIGHT, CANVAS_WIDTH, UI_HEIGHT, 0x141515, 1)
            .setOrigin(0, 0)
            .setDepth(100);
        const topBorder = this.add
            .rectangle(0, WORLD_VIEW_HEIGHT, CANVAS_WIDTH, 4, 0x6d6751, 1)
            .setOrigin(0, 0)
            .setDepth(101);
        const minimapFrame = this.add
            .rectangle(MINIMAP_X, MINIMAP_Y, MINIMAP_WIDTH, MINIMAP_HEIGHT, 0x1a2018, 1)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x8d7d58)
            .setDepth(102);
        this.minimapGraphics = this.add.graphics().setDepth(103);
        const commandGrid = this.add
            .rectangle(CANVAS_WIDTH - 210, WORLD_VIEW_HEIGHT + 18, 182, 86, 0x25251e, 1)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x8d7d58)
            .setDepth(102);
        const title = this.add
            .text(164, WORLD_VIEW_HEIGHT + 18, 'Chicken Farm Tilemap PoC', {
                color: '#f5e6ae',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                fontStyle: '700',
            })
            .setDepth(103);
        const help = this.add
            .text(
                164,
                WORLD_VIEW_HEIGHT + 48,
                'Arrow keys / WASD move player, 1-8 switch spawn, G grid',
                {
                    color: '#bcc9a6',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '14px',
                },
            )
            .setDepth(103);
        this.debugText = this.add
            .text(164, WORLD_VIEW_HEIGHT + 76, '', {
                color: '#d9d2ba',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '13px',
            })
            .setDepth(103);
        const legend = this.add
            .text(
                164,
                WORLD_VIEW_HEIGHT + 110,
                'P# player start | SP outer spider | WF wolf rect | STONE wolf stone | B boss',
                {
                    color: '#aebc9b',
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '13px',
                },
            )
            .setDepth(103);

        this.uiObjects.push(
            panel,
            topBorder,
            minimapFrame,
            this.minimapGraphics,
            commandGrid,
            title,
            help,
            this.debugText,
            legend,
        );
    }

    private updateMinimap() {
        if (!this.minimapGraphics || this.worldSize.x <= 0) return;

        const graphics = this.minimapGraphics;
        const padding = 6;
        const mapX = MINIMAP_X + padding;
        const mapY = MINIMAP_Y + padding;
        const mapWidth = MINIMAP_WIDTH - padding * 2;
        const mapHeight = MINIMAP_HEIGHT - padding * 2;
        const scaleX = mapWidth / this.worldSize.x;
        const scaleY = mapHeight / this.worldSize.y;

        graphics.clear();
        graphics.fillStyle(0x080b07, 1);
        graphics.fillRect(mapX, mapY, mapWidth, mapHeight);

        const cols = Math.ceil(this.worldSize.x / VISIBILITY_OVERLAY.cellSize);
        const rows = Math.ceil(this.worldSize.y / VISIBILITY_OVERLAY.cellSize);
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

        this.playerStarts.forEach((start) => {
            graphics.fillStyle(0xf0d45a, 0.92);
            graphics.fillCircle(mapX + start.x * scaleX, mapY + start.y * scaleY, 2.4);
        });

        this.worldMarkers.forEach((marker) => {
            const alpha = this.isExploredWorldPoint(marker.x, marker.y) ? 0.9 : 0.24;
            graphics.fillStyle(marker.color, alpha);
            graphics.fillCircle(
                mapX + marker.x * scaleX,
                mapY + marker.y * scaleY,
                1.8,
            );
        });

        if (this.player) {
            graphics.fillStyle(0x4dff66, 1);
            graphics.fillCircle(
                mapX + this.player.x * scaleX,
                mapY + this.player.y * scaleY,
                3.4,
            );
        }

        const viewWidth = this.worldCamera.width / this.worldCamera.zoom;
        const viewHeight = this.worldCamera.height / this.worldCamera.zoom;
        graphics.lineStyle(1, 0xf7e89a, 0.9);
        graphics.strokeRect(
            mapX + this.worldCamera.scrollX * scaleX,
            mapY + this.worldCamera.scrollY * scaleY,
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

    private configureCameras(map: Phaser.Tilemaps.Tilemap) {
        const worldWidth = map.widthInPixels * this.worldScale;
        const worldHeight = map.heightInPixels * this.worldScale;
        this.worldSize.set(worldWidth, worldHeight);

        this.worldCamera.setBounds(0, 0, worldWidth, worldHeight);
        this.worldCamera.setZoom(CAMERA_ZOOM);

        if (this.player) {
            this.worldCamera.startFollow(this.player, true, 0.16, 0.16);
            this.worldCamera.centerOn(this.player.x, this.player.y);
        } else {
            this.worldCamera.centerOn(worldWidth / 2, worldHeight / 2);
        }

        const uiCamera = this.cameras.add(
            0,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            false,
            'ui',
        );
        uiCamera.ignore(this.worldObjects);
        this.worldCamera.ignore(this.uiObjects);
        this.updateDebugText();
    }

    private configureControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = this.input.keyboard!.addKeys({
            down: Phaser.Input.Keyboard.KeyCodes.S,
            eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
            five: Phaser.Input.Keyboard.KeyCodes.FIVE,
            four: Phaser.Input.Keyboard.KeyCodes.FOUR,
            grid: Phaser.Input.Keyboard.KeyCodes.G,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            one: Phaser.Input.Keyboard.KeyCodes.ONE,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
            six: Phaser.Input.Keyboard.KeyCodes.SIX,
            three: Phaser.Input.Keyboard.KeyCodes.THREE,
            two: Phaser.Input.Keyboard.KeyCodes.TWO,
            up: Phaser.Input.Keyboard.KeyCodes.W,
        }) as FarmScene['keys'];
    }

    private updateDebugText() {
        if (!this.debugText) return;

        this.debugText.setText(
            `${this.playerStartLabel} player ${Math.round(this.player?.x ?? 0)}, ${Math.round(
                this.player?.y ?? 0,
            )} | camera ${Math.round(this.worldCamera.scrollX)}, ${Math.round(
                this.worldCamera.scrollY,
            )} | zoom ${CAMERA_ZOOM}x | grid ${
                this.buildGridVisible ? 'on' : 'off'
            } | vision ${VISIBILITY_OVERLAY.revealRadiusPx}px | viewport ${
                this.worldCamera.width
            }x${this.worldCamera.height}`,
        );
    }
}

new Phaser.Game({
    backgroundColor: '#0b0f0a',
    parent: 'game',
    scene: [FarmScene],
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        height: CANVAS_HEIGHT,
        mode: Phaser.Scale.FIT,
        width: CANVAS_WIDTH,
    },
    type: Phaser.AUTO,
});
