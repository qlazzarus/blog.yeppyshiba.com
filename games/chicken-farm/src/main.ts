import Phaser from 'phaser';
import './styles.css';
import { CHICKEN_FARM_TILEMAP_POC_01 } from './game/tilemapAssets';

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
        this.updateLightingOverlay();
        this.updateFogOfWar();
        this.updateMinimap();
        this.configureControls();
    }

    update(_time: number, delta: number) {
        this.updatePlayerSlotHotkeys();
        this.updateBuildGridHotkey();
        this.updatePlayerMovement(delta / 1000);
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

        const graphics = this.add.graphics().setDepth(layerName === 'farm_zones' ? 4 : 5);
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
            graphics.fillCircle(centerX, centerY, marker.radius * this.worldScale * 0.65);
            graphics.strokeCircle(centerX, centerY, marker.radius * this.worldScale * 0.65);

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
        const grid = this.add.graphics().setDepth(3);
        const tileWidth = map.tileWidth * this.worldScale;
        const tileHeight = map.tileHeight * this.worldScale;
        const width = map.widthInPixels * this.worldScale;
        const height = map.heightInPixels * this.worldScale;

        for (let x = 0; x <= width; x += tileWidth) {
            const tileIndex = Math.round(x / tileWidth);
            const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
            grid.lineStyle(1, major ? 0xf2d77b : 0xd7c99a, major ? 0.28 : 0.13);
            grid.lineBetween(x, 0, x, height);
        }

        for (let y = 0; y <= height; y += tileHeight) {
            const tileIndex = Math.round(y / tileHeight);
            const major = tileIndex % BUILD_GRID_MAJOR_EVERY === 0;
            grid.lineStyle(1, major ? 0xf2d77b : 0xd7c99a, major ? 0.28 : 0.13);
            grid.lineBetween(0, y, width, y);
        }

        this.buildGridGraphics = grid;
        this.worldObjects.push(grid);
    }

    private getPlayerStartLabel(name: unknown) {
        if (typeof name !== 'string') return null;

        const match = /^farm_p(\d+)$/u.exec(name);
        if (!match) return null;

        return `P${match[1]}`;
    }

    private createPlayerAtRandomStart() {
        if (!this.playerStarts.length) return;

        const start = Phaser.Utils.Array.GetRandom(this.playerStarts);
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
        const nose = this.add.triangle(13, 0, 0, -4, 8, 0, 0, 4, 0xd88a3d, 1).setDepth(13);
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

        const nextX = Phaser.Math.Clamp(this.player.x + move.x, 12, this.worldSize.x - 12);
        const nextY = Phaser.Math.Clamp(this.player.y + move.y, 12, this.worldSize.y - 12);
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

        for (let y = playerCellY - radiusCells; y <= playerCellY + radiusCells; y += 1) {
            for (let x = playerCellX - radiusCells; x <= playerCellX + radiusCells; x += 1) {
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

            const start = this.playerStarts.find((candidate) => candidate.id === index + 1);
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
            .text(164, WORLD_VIEW_HEIGHT + 48, 'Arrow keys / WASD move player, 1-8 switch spawn, G grid', {
                color: '#bcc9a6',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '14px',
            })
            .setDepth(103);
        this.debugText = this.add
            .text(164, WORLD_VIEW_HEIGHT + 76, '', {
                color: '#d9d2ba',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '13px',
            })
            .setDepth(103);
        const legend = this.add
            .text(164, WORLD_VIEW_HEIGHT + 110, 'P# player start | SP outer spider | WF wolf rect | STONE wolf stone | B boss', {
                color: '#aebc9b',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
            })
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
            graphics.fillCircle(mapX + marker.x * scaleX, mapY + marker.y * scaleY, 1.8);
        });

        if (this.player) {
            graphics.fillStyle(0x4dff66, 1);
            graphics.fillCircle(mapX + this.player.x * scaleX, mapY + this.player.y * scaleY, 3.4);
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

        const uiCamera = this.cameras.add(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, false, 'ui');
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
