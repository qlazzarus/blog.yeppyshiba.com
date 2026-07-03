import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from './game/balance';
import {
    CAMERA_ZOOM,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    CHICKEN_FARM_POC_FLAGS,
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
import {
    type CommandCardAction,
    type CommandCardSelectionKind,
    CommandCardSystem,
} from './game/systems/commandCardSystem';
import { CombatPocSystem } from './game/systems/combatPocSystem';
import { BuildingSystem } from './game/systems/buildingSystem';
import { ConstructionPlacementSystem } from './game/systems/constructionPlacementSystem';
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
import { type VisionSource, VisibilitySystem } from './game/systems/visibilitySystem';
import { CHICKEN_FARM_TILEMAP_POC_01 } from './game/tilemapAssets';
import { createFarmHud } from './game/ui/farmHud';
import './styles.css';

declare global {
    interface Window {
        __chickenFarmDebug?: {
            getPerfSnapshot: () => ReturnType<PerformanceProfiler['getSnapshot']>;
            getState: () => {
                readonly buildingCount: number;
                readonly commandPage: string;
                readonly elapsedSec: number;
                readonly placingBuildingId: string | null;
                readonly selectedBuildingId: string | null;
                readonly primaryUnit:
                    | {
                          readonly id: string;
                          readonly x: number;
                          readonly y: number;
                      }
                    | null;
                readonly selectedUnitCount: number;
                readonly worldSize: { readonly x: number; readonly y: number };
            };
            issueSmartCommand: (
                x: number,
                y: number,
                targetEntityId?: string,
            ) => { readonly action: string; readonly affectedUnitCount: number };
            selectAllUnits: () => number;
        };
    }
}

const FOG_UPDATE_INTERVAL_SEC = 0.15;
const FOG_DIRTY_DISTANCE_PX = 24;
const MINIMAP_UPDATE_INTERVAL_SEC = 0.25;
const MINIMAP_DIRTY_DISTANCE_PX = 32;

class FarmScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private debugPanel!: Phaser.GameObjects.Rectangle;
    private debugText!: Phaser.GameObjects.Text;
    private debugToggleText!: Phaser.GameObjects.Text;
    private debugOverlayVisible = true;
    private keys!: FarmInputKeys;
    private buildGridGraphics?: Phaser.GameObjects.Graphics;
    private buildGridVisible = true;
    private attackTargetingActive = false;
    private cameraControl!: CameraControlSystem;
    private buildingSystem?: BuildingSystem;
    private commandCard?: CommandCardSystem;
    private combatPoc?: CombatPocSystem;
    private constructionPlacement?: ConstructionPlacementSystem;
    private controllableUnits!: ControllableUnitSystem;
    private dragSelectionInput?: DragSelectionInputSystem;
    private elapsedSec = 0;
    private minimapGraphics?: Phaser.GameObjects.Graphics;
    private performanceProfiler = new PerformanceProfiler();
    private playerControl!: PlayerControlSystem;
    private playerStarts: PlayerStart[] = [];
    private telemetry!: TelemetryRecorder;
    private nextTelemetrySampleSec = 0;
    private nextFogUpdateSec = 0;
    private nextMinimapUpdateSec = 0;
    private resourceText!: Phaser.GameObjects.Text;
    private selectedBuildingId?: string;
    private selectionInfoBodyText!: Phaser.GameObjects.Text;
    private selectionInfoNameText!: Phaser.GameObjects.Text;
    private selectionInfoPortrait!: Phaser.GameObjects.Rectangle;
    private selectionInfoStatsText!: Phaser.GameObjects.Text;
    private selectionInfoStatusText!: Phaser.GameObjects.Text;
    private lastFogAnchor?: Phaser.Math.Vector2;
    private lastMinimapAnchor?: Phaser.Math.Vector2;
    private lastMinimapCamera?: Phaser.Math.Vector2;
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
            getAttackableEnemyTargets: () =>
                this.combatPoc?.getAttackableEnemyTargets() ?? [],
            getDynamicBlockedRects: () => this.getDynamicBlockedRects(),
            getElapsedSec: () => this.elapsedSec,
            onBuildCommandInterrupted: (unitId, siteId, reason) =>
                this.buildingSystem?.pauseConstruction(siteId, unitId, reason),
            onPendingBuildOrdersInterrupted: (unitId, reason) =>
                this.constructionPlacement?.cancelPendingBuildOrdersForBuilder(
                    unitId,
                    reason,
                ),
            recordPerformance: (label, elapsedMs) =>
                this.performanceProfiler.record(label, elapsedMs),
            recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
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
            showDebugMarker: CHICKEN_FARM_POC_FLAGS.playerDebugMarker,
            worldObjects: this.worldObjects,
        });
        this.playerControl.createAtConfiguredStart();
        this.cameraControl = new CameraControlSystem({
            camera: this.worldCamera,
            cursors: this.cursors,
            speedPxPerSec: CHICKEN_FARM_TILEMAP_POC_01.defaultCameraSpeedPxPerSec,
            worldSize: this.worldSize,
        });
        const hud = createFarmHud({ scene: this, uiObjects: this.uiObjects });
        this.debugPanel = hud.debugPanel;
        this.debugText = hud.debugText;
        this.debugToggleText = hud.debugToggleText;
        this.minimapGraphics = hud.minimapGraphics;
        this.resourceText = hud.resourceText;
        this.selectionInfoBodyText = hud.selectionInfoBodyText;
        this.selectionInfoNameText = hud.selectionInfoNameText;
        this.selectionInfoPortrait = hud.selectionInfoPortrait;
        this.selectionInfoStatsText = hud.selectionInfoStatsText;
        this.selectionInfoStatusText = hud.selectionInfoStatusText;
        hud.debugToggleButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.debugOverlayVisible = !this.debugOverlayVisible;
            this.debugPanel.setVisible(this.debugOverlayVisible);
            this.debugText.setVisible(this.debugOverlayVisible);
            this.debugToggleText.setText(this.debugOverlayVisible ? 'DBG' : 'DBG');
        });
        if (CHICKEN_FARM_POC_FLAGS.construction) {
            this.buildingSystem = new BuildingSystem({
                damageEnemyTarget: (targetId, damage) =>
                    this.combatPoc?.damageEnemyTarget(targetId, damage) ?? false,
                getElapsedSec: () => this.elapsedSec,
                getAttackableEnemyTargets: () =>
                    this.combatPoc?.getAttackableEnemyTargets() ?? [],
                isTargetVisible: (x, y) => this.visibility.isCurrentlyVisible(x, y),
                recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
                scene: this,
                worldObjects: this.worldObjects,
            });
            this.constructionPlacement = new ConstructionPlacementSystem({
                buildingSystem: this.buildingSystem,
                camera: this.worldCamera,
                clearBuilderBuildCommand: (unitId, siteId) =>
                    this.controllableUnits.clearBuildCommand(unitId, siteId),
                getSelectedUnits: () => this.controllableUnits.getSelectedUnits(),
                getUnits: () => this.controllableUnits.getUnits(),
                issueBuilderMove: (unitId, targetPoint, queueMode = 'replace') =>
                    this.controllableUnits.issueMoveCommandToUnits(
                        [unitId],
                        targetPoint,
                        queueMode,
                    ).pathFoundCount > 0,
                recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
                scene: this,
                setBuilderBuildCommand: (unitId, siteId, targetPoint) =>
                    this.controllableUnits.setUnitBuildCommand(
                        unitId,
                        siteId,
                        targetPoint,
                    ),
                terrainBlocker: this.terrainBlocker,
                worldObjects: this.worldObjects,
                worldSize: this.worldSize,
            });
            this.commandCard = new CommandCardSystem({
                buttons: hud.commandButtons,
                getSelectionKind: () => this.getCommandCardSelectionKind(),
                keys: this.keys,
                onAction: (action) => this.handleCommandCardAction(action),
                recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
            });
        }
        this.configureCameras(map);
        this.configurePointerSelection();
        if (CHICKEN_FARM_POC_FLAGS.combat || CHICKEN_FARM_POC_FLAGS.combatSmoke) {
            this.combatPoc = new CombatPocSystem({
                damageControllableUnit: (unitId, damage, attackerTargetId) =>
                    this.controllableUnits.damageUnit(
                        unitId,
                        damage,
                        attackerTargetId,
                    ),
                getDynamicBlockedRects: () =>
                    this.buildingSystem?.getDynamicBlockedRects() ?? [],
                getElapsedSec: () => this.elapsedSec,
                getWolfTargetableUnits: () =>
                    this.controllableUnits.getWolfTargetableUnits(),
                recordPerformance: (label, elapsedMs) =>
                    this.performanceProfiler.record(label, elapsedMs),
                recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
                scene: this,
                terrainBlocker: this.terrainBlocker,
                worldObjects: this.worldObjects,
                worldSize: this.worldSize,
            });
            if (CHICKEN_FARM_POC_FLAGS.combat) {
                this.createCombatPoc();
            } else {
                this.createCombatSmokePoc();
            }
        }
        if (CHICKEN_FARM_POC_FLAGS.terrainPathingDebug) {
            this.terrainPathingPoc = new TerrainPathingPocSystem({
                scene: this,
                terrainBlocker: this.terrainBlocker,
                worldObjects: this.worldObjects,
            });
            this.terrainPathingPoc.create();
        }
        this.visibility.updateLightingOverlay(this.worldSize);
        this.updateFogOfWarIfNeeded(true);
        this.updateMinimapIfNeeded(true);
        this.exposeDebugAutomation();
    }

    update(_time: number, delta: number) {
        this.performanceProfiler.beginFrame(delta);
        this.elapsedSec += delta / 1000;
        this.performanceProfiler.measure('update.hotkeys', () => {
            this.playerControl.updateSlotHotkeys();
            const commandConsumed = this.updateCommandHotkeys();
            if (commandConsumed) return;
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
        this.performanceProfiler.measure('update.buildings', () =>
            this.buildingSystem?.update(),
        );
        this.performanceProfiler.measure('update.constructionPlacement', () =>
            this.constructionPlacement?.update(),
        );
        this.performanceProfiler.measure('update.combat', () =>
            this.combatPoc?.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.terrainPathPoc', () =>
            this.terrainPathingPoc?.update(delta / 1000),
        );
        this.performanceProfiler.measure('update.fog', () =>
            this.updateFogOfWarIfNeeded(),
        );
        this.performanceProfiler.measure('update.minimap', () =>
            this.updateMinimapIfNeeded(),
        );
        this.performanceProfiler.measure('update.telemetrySample', () =>
            this.updateTelemetrySample(),
        );
        this.performanceProfiler.measure('update.debugText', () =>
            this.updateDebugText(),
        );
        this.performanceProfiler.measure('update.resources', () =>
            this.updateResourceText(),
        );
        this.performanceProfiler.measure('update.selectionInfo', () =>
            this.updateSelectionInfo(),
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

    private createCombatSmokePoc() {
        const player = this.playerControl.player;
        if (!player || !this.combatPoc) return;

        const anchor = {
            id: CHICKEN_FARM_POC_FLAGS.combat ? COMBAT_POC_LAYOUT.anchorSlotId : 0,
            label: this.playerControl.playerStartLabel,
            x: player.x,
            y: player.y,
        };
        this.telemetry.record('combat_smoke_poc_created', {
            player: this.playerControl.playerStartLabel,
            x: Number(player.x.toFixed(1)),
            y: Number(player.y.toFixed(1)),
        });
        this.combatPoc.createSmokeTarget(anchor);
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
        this.visibility.revealAroundSources(this.getVisionSources(), this.worldSize);
        this.updateFogOfWarIfNeeded(true);
        this.updateMinimapIfNeeded(true);
    }

    private updateBuildGridHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.grid)) return;

        this.buildGridVisible = !this.buildGridVisible;
        this.buildGridGraphics?.setVisible(this.buildGridVisible);
        this.telemetry.record('build_grid_toggled', {
            visible: this.buildGridVisible,
        });
    }

    private updateCommandHotkeys() {
        if (this.attackTargetingActive && Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
            this.attackTargetingActive = false;
            this.telemetry.record('attack_targeting_cancelled', { reason: 'escape' });
            return true;
        }

        if (this.constructionPlacement?.isActive()) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
                this.constructionPlacement.cancelPlacement('escape');
                return true;
            }
        }

        const consumed = this.commandCard?.update() ?? false;
        this.commandCard?.refresh();
        return consumed;
    }

    private handleCommandCardAction(action: CommandCardAction) {
        if (action.type === 'start_build_placement') {
            this.attackTargetingActive = false;
            this.constructionPlacement?.startPlacement(action.buildingId);
            return;
        }

        if (action.type === 'start_attack_targeting') {
            this.constructionPlacement?.cancelPlacement('attack_targeting');
            this.attackTargetingActive = true;
            this.telemetry.record('attack_targeting_started', {
                selectedUnitCount: this.controllableUnits.getSelectedUnits().length,
            });
            return;
        }

        if (action.type === 'stop') {
            this.updateStopHotkey(true);
            return;
        }

        if (action.type === 'cancel') {
            this.constructionPlacement?.cancelPlacement('command_card');
            return;
        }

        if (action.type === 'cancel_construction') {
            if (!this.selectedBuildingId) return;

            const cancelled = this.constructionPlacement?.cancelConstruction(
                this.selectedBuildingId,
                'command_card',
            );
            if (!cancelled) return;

            this.selectedBuildingId = undefined;
            this.commandCard?.refresh();
        }
    }

    private getCommandCardSelectionKind(): CommandCardSelectionKind {
        const selectedUnits = this.controllableUnits.getSelectedUnits();
        if (selectedUnits.some((unit) => unit.templateId === 'farmer' && unit.hp > 0)) {
            return 'builder_unit';
        }
        if (selectedUnits.some((unit) => unit.hp > 0)) {
            return 'generic_unit';
        }

        if (!this.selectedBuildingId) return 'none';

        const selectedBuilding = this.buildingSystem?.getBuilding(this.selectedBuildingId);
        if (!selectedBuilding) return 'none';

        return selectedBuilding.state === 'constructing'
            ? 'constructing_building'
            : 'complete_building';
    }

    private getDynamicBlockedRects() {
        return [
            ...(this.combatPoc?.getDynamicBlockedRects() ?? []),
            ...(this.buildingSystem?.getDynamicBlockedRects() ?? []),
        ];
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

        this.worldCamera.centerOn(focus.x, focus.y);
        this.telemetry.record('micro_pathing_focus_selected', {
            x: Number(focus.x.toFixed(1)),
            y: Number(focus.y.toFixed(1)),
        });
    }

    private updateTelemetryHotkey() {
        if (!Phaser.Input.Keyboard.JustDown(this.keys.telemetryExport)) return;

        this.combatPoc?.recordCombatResult();
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

    private updateFogOfWarIfNeeded(force = false) {
        const anchor = this.getVisionAnchor();
        if (!anchor) return;

        const visionSources = this.getVisionSources();
        const moved = this.hasMovedBeyond(
            this.lastFogAnchor,
            anchor.x,
            anchor.y,
            FOG_DIRTY_DISTANCE_PX,
        );
        if (!force && !moved && this.elapsedSec < this.nextFogUpdateSec) return;

        this.visibility.updateFogOfWarForSources(visionSources, this.worldSize);
        this.lastFogAnchor = new Phaser.Math.Vector2(anchor.x, anchor.y);
        this.nextFogUpdateSec = this.elapsedSec + FOG_UPDATE_INTERVAL_SEC;
    }

    private updateMinimapIfNeeded(force = false) {
        const anchor = this.getVisionAnchor();
        const anchorMoved = anchor
            ? this.hasMovedBeyond(
                  this.lastMinimapAnchor,
                  anchor.x,
                  anchor.y,
                  MINIMAP_DIRTY_DISTANCE_PX,
              )
            : false;
        const cameraMoved = this.hasMovedBeyond(
            this.lastMinimapCamera,
            this.worldCamera.scrollX,
            this.worldCamera.scrollY,
            MINIMAP_DIRTY_DISTANCE_PX,
        );
        if (
            !force &&
            !anchorMoved &&
            !cameraMoved &&
            this.elapsedSec < this.nextMinimapUpdateSec
        ) {
            return;
        }

        this.updateMinimap();
        if (anchor) {
            this.lastMinimapAnchor = new Phaser.Math.Vector2(anchor.x, anchor.y);
        }
        this.lastMinimapCamera = new Phaser.Math.Vector2(
            this.worldCamera.scrollX,
            this.worldCamera.scrollY,
        );
        this.nextMinimapUpdateSec = this.elapsedSec + MINIMAP_UPDATE_INTERVAL_SEC;
    }

    private hasMovedBeyond(
        lastPosition: Phaser.Math.Vector2 | undefined,
        x: number,
        y: number,
        distancePx: number,
    ) {
        if (!lastPosition) return true;

        return Phaser.Math.Distance.Between(lastPosition.x, lastPosition.y, x, y) >= distancePx;
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
            a: Phaser.Input.Keyboard.KeyCodes.A,
            b: Phaser.Input.Keyboard.KeyCodes.B,
            c: Phaser.Input.Keyboard.KeyCodes.C,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
            escape: Phaser.Input.Keyboard.KeyCodes.ESC,
            f: Phaser.Input.Keyboard.KeyCodes.F,
            five: Phaser.Input.Keyboard.KeyCodes.FIVE,
            four: Phaser.Input.Keyboard.KeyCodes.FOUR,
            grid: Phaser.Input.Keyboard.KeyCodes.G,
            h: Phaser.Input.Keyboard.KeyCodes.H,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            microPathingFocus: Phaser.Input.Keyboard.KeyCodes.NINE,
            one: Phaser.Input.Keyboard.KeyCodes.ONE,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            six: Phaser.Input.Keyboard.KeyCodes.SIX,
            stop: Phaser.Input.Keyboard.KeyCodes.S,
            t: Phaser.Input.Keyboard.KeyCodes.T,
            telemetryExport: Phaser.Input.Keyboard.KeyCodes.L,
            terrainOverlay: Phaser.Input.Keyboard.KeyCodes.T,
            three: Phaser.Input.Keyboard.KeyCodes.THREE,
            two: Phaser.Input.Keyboard.KeyCodes.TWO,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            x: Phaser.Input.Keyboard.KeyCodes.X,
        }) as FarmScene['keys'];
    }

    private updateStopHotkey(force = false) {
        if (!force && !Phaser.Input.Keyboard.JustDown(this.keys.stop)) return;

        const stoppedUnitCount = this.controllableUnits.stopSelectedUnits();
        this.telemetry.record('unit_stop_command_issued', {
            stoppedUnitCount,
        });
    }

    private configurePointerSelection() {
        this.dragSelectionInput = new DragSelectionInputSystem({
            camera: this.worldCamera,
            onClick: (worldPoint) => {
                if (this.attackTargetingActive) {
                    this.issueAttackTargetingCommand(worldPoint);
                    return;
                }

                if (
                    this.constructionPlacement?.handlePrimaryClick(
                        worldPoint.x,
                        worldPoint.y,
                        { keepPlacementActive: this.isQueueCommandMode() },
                    )
                ) {
                    return;
                }

                const selected = this.controllableUnits.selectAt(
                    worldPoint.x,
                    worldPoint.y,
                );
                if (selected) {
                    this.selectedBuildingId = undefined;
                } else {
                    const selectedBuilding = this.buildingSystem?.hitTestBuilding(
                        worldPoint.x,
                        worldPoint.y,
                    );
                    this.selectedBuildingId = selectedBuilding?.id;
                    if (selectedBuilding) this.controllableUnits.clearSelection();
                }
                this.commandCard?.refresh();
                const nearestUnit = this.controllableUnits.getNearestUnitSummary(
                    worldPoint.x,
                    worldPoint.y,
                );
                this.telemetry.record('unit_selection_changed', {
                    mode: 'click',
                    nearestUnitDistance: nearestUnit?.distance ?? null,
                    nearestUnitId: nearestUnit?.id ?? null,
                    nearestUnitType: nearestUnit?.templateId ?? null,
                    nearestUnitX: nearestUnit?.x ?? null,
                    nearestUnitY: nearestUnit?.y ?? null,
                    selectedBuildingId: this.selectedBuildingId ?? null,
                    selectedUnitCount: selected ? 1 : 0,
                    selectedUnitId: selected?.id ?? null,
                    selectedUnitType: selected?.templateId ?? null,
                    x: Number(worldPoint.x.toFixed(1)),
                    y: Number(worldPoint.y.toFixed(1)),
                });
            },
            onDragSelect: (rect) => {
                if (this.constructionPlacement?.isActive()) return;

                const selectedUnits = this.controllableUnits.selectInRect(rect);
                this.selectedBuildingId = undefined;
                this.commandCard?.refresh();
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
            viewportWidth: CHICKEN_FARM_TILEMAP_POC_01.defaultViewportWidth,
            worldObjects: this.worldObjects,
        });
        this.dragSelectionInput.bind();
        this.input.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer) => {
                if (!pointer.rightButtonDown()) return;
                if (pointer.x > CHICKEN_FARM_TILEMAP_POC_01.defaultViewportWidth) return;
                if (pointer.y > CHICKEN_FARM_TILEMAP_POC_01.defaultViewportHeight) return;

                if (this.constructionPlacement?.cancelPlacement('right_click')) {
                    return;
                }
                if (this.attackTargetingActive) {
                    this.attackTargetingActive = false;
                    this.telemetry.record('attack_targeting_cancelled', {
                        reason: 'right_click',
                    });
                    return;
                }

                const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
                const targetBuilding = this.buildingSystem?.hitTestBuilding(
                    worldPoint.x,
                    worldPoint.y,
                );
                const selectedBuilder = this.controllableUnits
                    .getSelectedUnits()
                    .find((unit) => unit.templateId === 'farmer' && unit.hp > 0);
                if (
                    targetBuilding?.state === 'constructing' &&
                    selectedBuilder &&
                    this.constructionPlacement?.resumeConstructionWithBuilder(
                        targetBuilding.id,
                        selectedBuilder.id,
                        this.isQueueCommandMode() ? 'append' : 'replace',
                    )
                ) {
                    this.telemetry.record('building_resume_command_issued', {
                        buildingId: targetBuilding.id,
                        builderUnitId: selectedBuilder.id,
                    });
                    return;
                }

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
                            this.isQueueCommandMode() ? 'append' : 'replace',
                        ),
                );

                this.telemetry.record('unit_smart_command_issued', {
                    action: result.action,
                    affectedUnitCount: result.affectedUnitCount,
                    selectedUnitIds: this.controllableUnits
                        .getSelectedUnits()
                        .map((unit) => unit.id),
                    targetEntityId: enemyTarget?.id ?? null,
                    x: Number(worldPoint.x.toFixed(1)),
                    y: Number(worldPoint.y.toFixed(1)),
                });
            },
        );
    }

    private issueAttackTargetingCommand(worldPoint: Phaser.Math.Vector2) {
        const enemyTarget = this.combatPoc?.hitTestEnemy(worldPoint.x, worldPoint.y);
        const result = this.performanceProfiler.measure('command.attack.total', () =>
            this.controllableUnits.issueAttackCommandToSelected(
                {
                    x: worldPoint.x,
                    y: worldPoint.y,
                },
                enemyTarget?.id,
                this.isQueueCommandMode() ? 'append' : 'replace',
            ),
        );

        this.attackTargetingActive = false;
        this.telemetry.record('unit_attack_command_issued', {
            action: result.action,
            affectedUnitCount: result.affectedUnitCount,
            queued: this.isQueueCommandMode(),
            selectedUnitIds: this.controllableUnits
                .getSelectedUnits()
                .map((unit) => unit.id),
            targetEntityId: enemyTarget?.id ?? null,
            x: Number(worldPoint.x.toFixed(1)),
            y: Number(worldPoint.y.toFixed(1)),
        });
    }

    private exposeDebugAutomation() {
        window.__chickenFarmDebug = {
            getPerfSnapshot: () => this.performanceProfiler.getSnapshot(),
            getState: () => {
                const primaryUnit = this.controllableUnits.getPrimaryUnit();
                return {
                    buildingCount: this.buildingSystem?.getBuildingCount() ?? 0,
                    commandPage: this.commandCard?.getPage() ?? 'off',
                    elapsedSec: this.elapsedSec,
                    placingBuildingId:
                        this.constructionPlacement?.getActiveBuildingId() ?? null,
                    primaryUnit: primaryUnit
                        ? {
                              id: primaryUnit.id,
                              x: primaryUnit.position.x,
                              y: primaryUnit.position.y,
                          }
                        : null,
                    selectedBuildingId: this.selectedBuildingId ?? null,
                    selectedUnitCount: this.controllableUnits.getSelectedUnits().length,
                    worldSize: {
                        x: this.worldSize.x,
                        y: this.worldSize.y,
                    },
                };
            },
            issueSmartCommand: (x, y, targetEntityId) =>
                this.performanceProfiler.measure('command.smart.total', () =>
                    this.controllableUnits.issueSmartCommandToSelected(
                        { x, y },
                        targetEntityId,
                    ),
                ),
            selectAllUnits: () =>
                this.controllableUnits.selectInRect(
                    new Phaser.Geom.Rectangle(
                        0,
                        0,
                        this.worldSize.x,
                        this.worldSize.y,
                    ),
                ).length,
        };
    }

    private updateDebugText() {
        if (!this.debugText) return;

        const player = this.playerControl.player;
        const primaryUnit = this.controllableUnits.getPrimaryUnit();
        const selectedUnits = this.controllableUnits.getSelectedUnits();
        const economy = this.buildingSystem?.economy;
        const selectedBuilding = this.selectedBuildingId
            ? this.buildingSystem?.getBuildingSelectionSummary(this.selectedBuildingId)
            : null;
        if (this.selectedBuildingId && !selectedBuilding) {
            this.selectedBuildingId = undefined;
        }
        const buildingSelectionText = selectedBuilding
            ? `building ${selectedBuilding.displayName} ${selectedBuilding.state} ${Math.round(
                  selectedBuilding.progress * 100,
              )}% worker ${selectedBuilding.activeWorkerUnitId ?? 'paused'}`
            : 'building none';
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
            } | buildings ${this.buildingSystem?.getBuildingCount() ?? 0} | ${
                economy
                    ? `gold ${economy.gold} lumber ${economy.lumber} supply ${economy.supplyUsed}/${economy.supplyCap} eggs ${economy.eggs}`
                    : 'economy off'
            } | card ${this.commandCard?.getPage() ?? 'off'} | placing ${
                this.constructionPlacement?.getActiveBuildingId() ?? 'none'
            } | ${buildingSelectionText} | viewport ${this.worldCamera.width}x${
                this.worldCamera.height
            }\n${this.performanceProfiler.getOverlayText()}`,
        );
    }

    private updateResourceText() {
        if (!this.resourceText) return;

        const economy = this.buildingSystem?.economy;
        if (!economy) {
            this.resourceText.setText('Gold - | Lumber - | Supply - | Eggs -');
            return;
        }

        this.resourceText.setText(
            `Gold ${economy.gold}  Lumber ${economy.lumber}  Supply ${economy.supplyUsed}/${economy.supplyCap}  Eggs ${economy.eggs}`,
        );
    }

    private updateSelectionInfo() {
        if (!this.selectionInfoNameText) return;

        const selectedBuilding = this.selectedBuildingId
            ? this.buildingSystem?.getBuildingSelectionSummary(this.selectedBuildingId)
            : null;
        if (this.selectedBuildingId && !selectedBuilding) {
            this.selectedBuildingId = undefined;
        }
        if (selectedBuilding) {
            const template = CHICKEN_FARM_BALANCE.buildingTemplates[selectedBuilding.templateId];
            const buildPercent = Math.round(selectedBuilding.progress * 100);
            const workerText =
                selectedBuilding.state === 'complete'
                    ? 'Complete'
                    : selectedBuilding.activeWorkerUnitId
                      ? `Building: ${selectedBuilding.activeWorkerUnitId}`
                      : 'Construction paused';
            const attackText = template.attack
                ? ` | Attack ${template.attack.damage} / ${template.attack.cooldownSec}s / ${template.attack.rangePx}px`
                : '';

            this.selectionInfoPortrait.setFillStyle(
                selectedBuilding.state === 'complete' ? 0x3b4b2f : 0x4b3f25,
                1,
            );
            this.selectionInfoNameText.setText(
                `${selectedBuilding.displayName} (${template.source.rawcode ?? '----'})`,
            );
            this.selectionInfoStatsText.setText(
                `HP ${selectedBuilding.hp}/${selectedBuilding.maxHp} | Armor ${template.armor} | Footprint ${selectedBuilding.footprintCells.w}x${selectedBuilding.footprintCells.h}${attackText}`,
            );
            this.selectionInfoStatusText.setText(
                `Status ${selectedBuilding.state} | Build ${buildPercent}% | Remaining ${selectedBuilding.remainingSec.toFixed(
                    1,
                )}s`,
            );
            this.selectionInfoBodyText.setText(
                `${workerText} | Cost ${template.originalCost?.gold ?? template.costCoins}g${
                    template.originalCost?.lumber ? ` ${template.originalCost.lumber}l` : ''
                } | W3X bldtm ${template.buildTimeSec}s | PathTex footprint source`,
            );
            return;
        }

        const selectedUnits = this.controllableUnits.getSelectedUnits();
        const primaryUnit = selectedUnits[0];
        if (primaryUnit) {
            const stats = CHICKEN_FARM_BALANCE.defenders[primaryUnit.templateId];
            const command = primaryUnit.currentCommand?.type ?? 'idle';

            this.selectionInfoPortrait.setFillStyle(
                primaryUnit.templateId === 'farmer' ? 0x4b3b24 : 0x31455c,
                1,
            );
            this.selectionInfoNameText.setText(
                `${primaryUnit.templateId === 'farmer' ? '농부' : '개'} (${stats.source.rawcode ?? primaryUnit.templateId})`,
            );
            this.selectionInfoStatsText.setText(
                `HP ${Math.ceil(primaryUnit.hp)}/${primaryUnit.maxHp} | Armor ${
                    primaryUnit.armor
                } | Damage ${stats.damage} | Cooldown ${stats.attackCooldownSec}s`,
            );
            this.selectionInfoStatusText.setText(
                `Command ${command} | Speed ${Math.round(
                    primaryUnit.speedPxPerSec,
                )}px/s | Range ${stats.attackRangePx ?? 0}px | Queued ${
                    primaryUnit.commandQueue.length
                }`,
            );
            this.selectionInfoBodyText.setText(
                selectedUnits.length > 1
                    ? `${selectedUnits.length} units selected`
                    : 'Worker command card follows Warcraft III-style build/stop/resume flow.',
            );
            return;
        }

        this.selectionInfoPortrait.setFillStyle(0x25291f, 1);
        this.selectionInfoNameText.setText('No Selection');
        this.selectionInfoStatsText.setText('Select a farmer, dog, or building.');
        this.selectionInfoStatusText.setText('');
        this.selectionInfoBodyText.setText('');
    }

    private isQueueCommandMode() {
        return Boolean(this.keys.shift?.isDown);
    }

    private getVisionAnchor() {
        return this.controllableUnits?.getPrimaryUnitObject() ?? this.playerControl.player;
    }

    private getVisionSources(): readonly VisionSource[] {
        const anchor = this.getVisionAnchor();
        const unitSources: VisionSource[] = anchor
            ? [
                  {
                      radiusPx: VISIBILITY_OVERLAY.revealRadiusPx,
                      x: anchor.x,
                      y: anchor.y,
                  },
              ]
            : [];

        return [...unitSources, ...(this.buildingSystem?.getVisionSources() ?? [])];
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
