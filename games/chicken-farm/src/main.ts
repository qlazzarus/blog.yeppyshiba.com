import Phaser from 'phaser';

import {
    CAMERA_ZOOM,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    TILEMAP_KEY,
    TILESET_KEY,
    VISIBILITY_OVERLAY,
    WPM_PATHING_GRID_KEY,
} from './game/config';
import type { PlayerStart, WorldMarker } from './game/ecs/components';
import { COMBAT_POC_LAYOUT } from './game/poc/combatPocLayout';
import { createBuildGrid } from './game/rendering/buildGridRenderer';
import {
    createTileLayer,
    renderObjectLayer,
} from './game/rendering/tilemapObjectRenderer';
import { CameraControlSystem } from './game/systems/cameraControlSystem';
import { CombatPocSystem } from './game/systems/combatPocSystem';
import { ControllableUnitSystem } from './game/systems/controllableUnitSystem';
import { DragSelectionInputSystem } from './game/systems/dragSelectionInputSystem';
import {
    type FarmInputKeys,
    PlayerControlSystem,
} from './game/systems/playerControlSystem';
import { PerformanceProfiler } from './game/systems/performanceProfiler';
import { TerrainPathingPocSystem } from './game/systems/terrainPathingPocSystem';
import { TerrainBlocker, type WpmPathingGrid } from './game/systems/terrainBlocker';
import { TelemetryRecorder } from './game/systems/telemetryRecorder';
import { VisibilitySystem } from './game/systems/visibilitySystem';
import { CHICKEN_FARM_TILEMAP_POC_01 } from './game/tilemapAssets';
import { createFarmHud } from './game/ui/farmHud';
import './styles.css';

class FarmScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private debugText!: Phaser.GameObjects.Text;
    private keys!: FarmInputKeys;
    private buildGridGraphics?: Phaser.GameObjects.Graphics;
    private buildGridVisible = true;
    private cameraControl!: CameraControlSystem;
    private combatPoc?: CombatPocSystem;
    private controllableUnits!: ControllableUnitSystem;
    private dragSelectionInput?: DragSelectionInputSystem;
    private elapsedSec = 0;
    private minimapGraphics?: Phaser.GameObjects.Graphics;
    private performanceProfiler = new PerformanceProfiler();
    private playerControl!: PlayerControlSystem;
    private playerStarts: PlayerStart[] = [];
    private telemetry!: TelemetryRecorder;
    private nextTelemetrySampleSec = 0;
    private terrainBlocker?: TerrainBlocker;
    private terrainOverlayGraphics?: Phaser.GameObjects.Graphics;
    private terrainOverlayVisible = false;
    private terrainPathingPoc?: TerrainPathingPocSystem;
    private uiObjects: Phaser.GameObjects.GameObject[] = [];
    private visibility!: VisibilitySystem;
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
        this.load.json(
            WPM_PATHING_GRID_KEY,
            CHICKEN_FARM_TILEMAP_POC_01.wpmPathingGridPath,
        );
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

        createTileLayer(map, tileset, 'ground', 0, this.worldScale, this.worldObjects);
        createTileLayer(
            map,
            tileset,
            'collision_static',
            2,
            this.worldScale,
            this.worldObjects,
        );
        this.buildGridGraphics = createBuildGrid({
            map,
            scene: this,
            worldObjects: this.worldObjects,
            worldScale: this.worldScale,
        });
        const wpmGrid = this.cache.json.get(WPM_PATHING_GRID_KEY) as WpmPathingGrid;
        this.terrainBlocker = new TerrainBlocker(wpmGrid);
        this.terrainOverlayGraphics = this.add.graphics().setDepth(22).setVisible(false);
        this.terrainBlocker.drawDebugOverlay(this.terrainOverlayGraphics);
        this.worldObjects.push(this.terrainOverlayGraphics);
        this.renderTilemapObjects(map, 'farm_zones');
        this.renderTilemapObjects(map, 'spawns');
        this.telemetry = new TelemetryRecorder({
            gameId: 'chicken-farm-poc',
            getTimeSec: () => this.elapsedSec,
            mapId: CHICKEN_FARM_TILEMAP_POC_01.mapPath,
        });
        this.telemetry.record('tilemap_loaded', {
            mapHeight: map.height,
            mapWidth: map.width,
            worldScale: this.worldScale,
        });
        this.visibility = new VisibilitySystem({
            scene: this,
            worldObjects: this.worldObjects,
        });
        this.visibility.createOverlays();
        this.configureControls();
        this.input.mouse?.disableContextMenu();
        this.controllableUnits = new ControllableUnitSystem({
            damageEnemyTarget: (targetId, damage) =>
                this.combatPoc?.damageEnemyTarget(targetId, damage) ?? false,
            getAttackableEnemyTarget: (targetId) =>
                this.combatPoc?.getAttackableEnemyTarget(targetId) ?? null,
            getDynamicBlockedRects: () =>
                this.combatPoc?.getDynamicBlockedRects() ?? [],
            getElapsedSec: () => this.elapsedSec,
            recordPerformance: (label, elapsedMs) =>
                this.performanceProfiler.record(label, elapsedMs),
            scene: this,
            terrainBlocker: this.terrainBlocker,
            worldObjects: this.worldObjects,
            worldSize: this.worldSize,
        });
        this.playerControl = new PlayerControlSystem({
            camera: this.worldCamera,
            keys: this.keys,
            onPlayerStartChanged: (start) => this.handlePlayerStartChanged(start),
            playerStarts: this.playerStarts,
            scene: this,
            worldObjects: this.worldObjects,
        });
        this.playerControl.createAtConfiguredStart();
        this.cameraControl = new CameraControlSystem({
            camera: this.worldCamera,
            cursors: this.cursors,
            keys: this.keys,
            speedPxPerSec: CHICKEN_FARM_TILEMAP_POC_01.defaultCameraSpeedPxPerSec,
            worldSize: this.worldSize,
        });
        const hud = createFarmHud({ scene: this, uiObjects: this.uiObjects });
        this.debugText = hud.debugText;
        this.minimapGraphics = hud.minimapGraphics;
        this.configureCameras(map);
        this.configurePointerSelection();
        this.combatPoc = new CombatPocSystem({
            damageControllableUnit: (unitId, damage) =>
                this.controllableUnits.damageUnit(unitId, damage),
            getElapsedSec: () => this.elapsedSec,
            getWolfTargetableUnits: () =>
                this.controllableUnits.getWolfTargetableUnits(),
            recordPerformance: (label, elapsedMs) =>
                this.performanceProfiler.record(label, elapsedMs),
            scene: this,
            terrainBlocker: this.terrainBlocker,
            worldObjects: this.worldObjects,
            worldSize: this.worldSize,
        });
        this.createCombatPoc();
        this.terrainPathingPoc = new TerrainPathingPocSystem({
            scene: this,
            terrainBlocker: this.terrainBlocker,
            worldObjects: this.worldObjects,
        });
        this.terrainPathingPoc.create();
        this.visibility.updateLightingOverlay(this.worldSize);
        this.visibility.updateFogOfWar(this.getVisionAnchor(), this.worldSize);
        this.updateMinimap();
    }

    update(_time: number, delta: number) {
        this.performanceProfiler.beginFrame(delta);
        this.elapsedSec += delta / 1000;
        this.performanceProfiler.measure('update.hotkeys', () => {
            this.playerControl.updateSlotHotkeys();
            this.updateBuildGridHotkey();
            this.updateTerrainOverlayHotkey();
            this.updateMicroPathingFocusHotkey();
            this.updateTelemetryHotkey();
            this.updateStopHotkey();
        });
        this.performanceProfiler.measure('update.camera', () =>
            this.cameraControl.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.units', () =>
            this.controllableUnits.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.combat', () =>
            this.combatPoc?.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.terrainPathPoc', () =>
            this.terrainPathingPoc?.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.fog', () =>
            this.visibility.updateFogOfWar(this.getVisionAnchor(), this.worldSize),
        );
        this.performanceProfiler.measure('update.minimap', () => this.updateMinimap());
        this.performanceProfiler.measure('update.telemetrySample', () =>
            this.updateTelemetrySample(),
        );
        this.performanceProfiler.measure('update.debugText', () =>
            this.updateDebugText(),
        );
        this.performanceProfiler.endFrame(this.elapsedSec);
    }

    private renderTilemapObjects(map: Phaser.Tilemaps.Tilemap, layerName: string) {
        renderObjectLayer({
            layerName,
            map,
            playerStarts: this.playerStarts,
            scene: this,
            worldMarkers: this.worldMarkers,
            worldObjects: this.worldObjects,
            worldScale: this.worldScale,
        });
    }

    private createCombatPoc() {
        const player = this.playerControl.player;
        if (!player || !this.combatPoc) return;

        const layout = COMBAT_POC_LAYOUT;
        const anchor = this.getPlayerStartById(layout.anchorSlotId) ?? {
            id: layout.anchorSlotId,
            label: `P${layout.anchorSlotId}`,
            x: player.x,
            y: player.y,
        };
        this.telemetry.record('combat_poc_created', {
            anchorSlotId: layout.anchorSlotId,
            layout: layout.label,
            player: this.playerControl.playerStartLabel,
        });
        this.combatPoc.create(anchor);
    }

    private getPlayerStartById(id: number) {
        return this.playerStarts.find((start) => start.id === id) ?? null;
    }

    private handlePlayerStartChanged(start: PlayerStart) {
        this.telemetry?.record('player_start_selected', {
            player: start.label,
            x: Number(start.x.toFixed(1)),
            y: Number(start.y.toFixed(1)),
        });
        if (start.id > 0) {
            this.controllableUnits?.createForStart(start);
        }
        this.visibility.revealAroundPlayer(this.getVisionAnchor(), this.worldSize);
    }

    private updateBuildGridHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.grid)) return;

        this.buildGridVisible = !this.buildGridVisible;
        this.buildGridGraphics?.setVisible(this.buildGridVisible);
        this.telemetry.record('build_grid_toggled', {
            visible: this.buildGridVisible,
        });
    }

    private updateTerrainOverlayHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.terrainOverlay)) return;

        this.terrainOverlayVisible = !this.terrainOverlayVisible;
        this.terrainOverlayGraphics?.setVisible(this.terrainOverlayVisible);
        this.telemetry.record('terrain_overlay_toggled', {
            visible: this.terrainOverlayVisible,
        });
    }

    private updateMicroPathingFocusHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.microPathingFocus)) return;

        const focus = this.terrainPathingPoc?.getFocusPoint();
        if (!focus) return;

        this.playerControl.moveToDebugPoint('PATH', focus.x, focus.y);
        this.telemetry.record('micro_pathing_focus_selected', {
            x: Number(focus.x.toFixed(1)),
            y: Number(focus.y.toFixed(1)),
        });
    }

    private updateTelemetryHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.telemetryExport)) return;

        void this.telemetry.downloadCompressed();
    }

    private updateTelemetrySample() {
        const player = this.getVisionAnchor();
        if (!player || this.elapsedSec < this.nextTelemetrySampleSec) return;

        this.telemetry.record('player_position_sample', {
            cameraScrollX: Number(this.worldCamera.scrollX.toFixed(1)),
            cameraScrollY: Number(this.worldCamera.scrollY.toFixed(1)),
            player: this.playerControl.playerStartLabel,
            x: Number(player.x.toFixed(1)),
            y: Number(player.y.toFixed(1)),
        });
        this.nextTelemetrySampleSec = this.elapsedSec + 5;
    }

    private updateMinimap() {
        if (!this.minimapGraphics) return;

        this.visibility.updateMinimap({
            camera: this.worldCamera,
            graphics: this.minimapGraphics,
            player: this.getVisionAnchor(),
            playerStarts: this.playerStarts,
            worldMarkers: this.worldMarkers,
            worldSize: this.worldSize,
        });
    }

    private configureCameras(map: Phaser.Tilemaps.Tilemap) {
        const worldWidth = map.widthInPixels * this.worldScale;
        const worldHeight = map.heightInPixels * this.worldScale;
        this.worldSize.set(worldWidth, worldHeight);

        this.worldCamera.setBounds(0, 0, worldWidth, worldHeight);
        this.worldCamera.setZoom(CAMERA_ZOOM);

        const player = this.playerControl.player;
        if (player) {
            this.worldCamera.centerOn(player.x, player.y);
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
            microPathingFocus: Phaser.Input.Keyboard.KeyCodes.NINE,
            one: Phaser.Input.Keyboard.KeyCodes.ONE,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
            six: Phaser.Input.Keyboard.KeyCodes.SIX,
            stop: Phaser.Input.Keyboard.KeyCodes.S,
            telemetryExport: Phaser.Input.Keyboard.KeyCodes.L,
            terrainOverlay: Phaser.Input.Keyboard.KeyCodes.T,
            three: Phaser.Input.Keyboard.KeyCodes.THREE,
            two: Phaser.Input.Keyboard.KeyCodes.TWO,
            up: Phaser.Input.Keyboard.KeyCodes.W,
        }) as FarmScene['keys'];
    }

    private updateStopHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.stop)) return;

        const stoppedUnitCount = this.controllableUnits.stopSelectedUnits();
        this.telemetry.record('unit_stop_command_issued', {
            stoppedUnitCount,
        });
    }

    private configurePointerSelection() {
        this.dragSelectionInput = new DragSelectionInputSystem({
            camera: this.worldCamera,
            onClick: (worldPoint) => {
                const selected = this.controllableUnits.selectAt(
                    worldPoint.x,
                    worldPoint.y,
                );
                this.telemetry.record('unit_selection_changed', {
                    mode: 'click',
                    selectedUnitCount: selected ? 1 : 0,
                    selectedUnitId: selected?.id ?? null,
                    selectedUnitType: selected?.templateId ?? null,
                    x: Number(worldPoint.x.toFixed(1)),
                    y: Number(worldPoint.y.toFixed(1)),
                });
            },
            onDragSelect: (rect) => {
                const selectedUnits = this.controllableUnits.selectInRect(rect);
                this.telemetry.record('unit_selection_changed', {
                    height: Number(rect.height.toFixed(1)),
                    mode: 'drag',
                    selectedUnitCount: selectedUnits.length,
                    selectedUnitIds: selectedUnits.map((unit) => unit.id),
                    width: Number(rect.width.toFixed(1)),
                    x: Number(rect.x.toFixed(1)),
                    y: Number(rect.y.toFixed(1)),
                });
            },
            scene: this,
            viewportHeight: CHICKEN_FARM_TILEMAP_POC_01.defaultViewportHeight,
            worldObjects: this.worldObjects,
        });
        this.dragSelectionInput.bind();
        this.input.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer) => {
                if (!pointer.rightButtonDown()) return;
                if (pointer.y > CHICKEN_FARM_TILEMAP_POC_01.defaultViewportHeight) return;

                const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
                const enemyTarget = this.combatPoc?.hitTestEnemy(
                    worldPoint.x,
                    worldPoint.y,
                );
                const result = this.performanceProfiler.measure(
                    'command.smart.total',
                    () =>
                        this.controllableUnits.issueSmartCommandToSelected(
                            {
                                x: worldPoint.x,
                                y: worldPoint.y,
                            },
                            enemyTarget?.id,
                        ),
                );

                this.telemetry.record('unit_smart_command_issued', {
                    action: result.action,
                    affectedUnitCount: result.affectedUnitCount,
                    targetEntityId: enemyTarget?.id ?? null,
                    x: Number(worldPoint.x.toFixed(1)),
                    y: Number(worldPoint.y.toFixed(1)),
                });
            },
        );
    }

    private updateDebugText() {
        if (!this.debugText) return;

        const player = this.playerControl.player;
        const primaryUnit = this.controllableUnits.getPrimaryUnit();
        const selectedUnits = this.controllableUnits.getSelectedUnits();
        this.debugText.setText(
            `${this.playerControl.playerStartLabel} player ${Math.round(player?.x ?? 0)}, ${Math.round(
                player?.y ?? 0,
            )} | camera ${Math.round(this.worldCamera.scrollX)}, ${Math.round(
                this.worldCamera.scrollY,
            )} | zoom ${CAMERA_ZOOM}x | grid ${
                this.buildGridVisible ? 'on' : 'off'
            } | terrain ${this.terrainOverlayVisible ? 'on' : 'off'} | log ${
                this.telemetry?.getEventCount() ?? 0
            } | vision ${
                VISIBILITY_OVERLAY.revealRadiusPx
            }px | ${this.controllableUnits.getUnitSummary()} | unit speed ${
                primaryUnit?.speedPxPerSec ?? 0
            } | selected ${
                selectedUnits.map((unit) => unit.templateId).join(',') || 'none'
            } | viewport ${this.worldCamera.width}x${
                this.worldCamera.height
            }\n${this.performanceProfiler.getOverlayText()}`,
        );
    }

    private getVisionAnchor() {
        return this.controllableUnits?.getPrimaryUnitObject() ?? this.playerControl.player;
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
