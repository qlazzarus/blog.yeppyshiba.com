import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from './game/balance';
import {
    CAMERA_ZOOM,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    CHICKEN_FARM_POC_FLAGS,
    MAJOR_TILE_PX,
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
import {
    BuildingSystem,
    getBuildingFootprint,
    snapBuildingTopLeft,
} from './game/systems/buildingSystem';
import { ConstructionPlacementSystem } from './game/systems/constructionPlacementSystem';
import { ControllableUnitSystem } from './game/systems/controllableUnitSystem';
import { DragSelectionInputSystem } from './game/systems/dragSelectionInputSystem';
import { canOccupyPoint } from './game/systems/movementGuards';
import {
    addEconomyChicken,
    addEconomyCoop,
    addEconomyFieldEgg,
    addEconomyWell,
    countInventoryItem,
    createChickenFarmEconomyState,
    depositEggStackToCoop,
    dropInventoryEggToField,
    ensureEconomyInventory,
    feedNearestEconomyChicken,
    getEconomyInventory,
    herdEconomyChickens,
    pickupFieldEgg,
    startCoopHatch,
    updateChickenFarmEconomy,
} from './game/systems/economySystem';
import type {
    ChickenFarmEconomyState,
    EconomyChickenState,
    EconomyCoopState,
    EconomyEvent,
    EconomyInventoryState,
    EconomyPoint,
    EconomyWellState,
    FieldEggItemState,
} from './game/systems/economyTypes';
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
import { createFarmHud, type InventorySlotView } from './game/ui/farmHud';
import './styles.css';

declare global {
    interface Window {
        __chickenFarmDebug?: {
            getPerfSnapshot: () => ReturnType<PerformanceProfiler['getSnapshot']>;
            getState: () => {
                readonly buildingCount: number;
                readonly commandPage: string;
                readonly economyPoc:
                    | {
                          readonly chickens: number;
                          readonly coops: number;
                          readonly fieldEggs: number;
                          readonly hatchJobs: number;
                          readonly wells: number;
                      }
                    | null;
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
const ECONOMY_INTERACTION_RADIUS_PX = 54;
const ECONOMY_POC_COOP_TEMPLATE_ID = 'coop_basic';
const ECONOMY_POC_WELL_TEMPLATE_ID = 'well_basic';
const FARMER_FEED_MANA_COST = 3;
const FARMER_HERD_MANA_COST = 4;
const ECONOMY_BUILDING_NAMEPLATE_OFFSET_PX = 86;
const ECONOMY_CHICKEN_COLLISION_RADIUS_PX = 20;
const ECONOMY_POC_STARTING_EGG_OFFSETS: readonly EconomyPoint[] = [
    { x: -52, y: -26 },
    { x: -18, y: 46 },
    { x: 28, y: -48 },
    { x: 58, y: 30 },
];

type EconomyWorkerTask =
    | {
          readonly sourceSlotIndex: number;
          readonly targetPoint: EconomyPoint;
          readonly type: 'drop_to_field';
          readonly unitId: string;
      }
    | {
          readonly eggId: string;
          readonly type: 'pickup_egg';
          readonly unitId: string;
      }
    | {
          readonly coopId: string;
          readonly sourceSlotIndex: number;
          readonly type: 'deposit_to_coop';
          readonly unitId: string;
      };

type EconomyHitTarget =
    | { readonly id: string; readonly type: 'chicken' }
    | { readonly id: string; readonly type: 'coop' }
    | { readonly id: string; readonly type: 'egg' }
    | { readonly id: string; readonly type: 'well' };

type InventoryDragState = {
    readonly ghost: Phaser.GameObjects.Text;
    readonly inventoryId: string;
    readonly itemRawcode: string;
    readonly slotIndex: number;
};

class FarmScene extends Phaser.Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private debugPanel!: Phaser.GameObjects.Rectangle;
    private debugText!: Phaser.GameObjects.Text;
    private debugToggleText!: Phaser.GameObjects.Text;
    private debugOverlayVisible = true;
    private keys!: FarmInputKeys;
    private buildGridGraphics?: Phaser.GameObjects.Graphics;
    private buildGridVisible = true;
    private inventoryDrag?: InventoryDragState;
    private inventorySlots: readonly InventorySlotView[] = [];
    private renderedInventoryId?: string;
    private attackTargetingActive = false;
    private farmerFeedAutocast = false;
    private herdTargetingActive = false;
    private cameraControl!: CameraControlSystem;
    private buildingSystem?: BuildingSystem;
    private commandCard?: CommandCardSystem;
    private combatPoc?: CombatPocSystem;
    private constructionPlacement?: ConstructionPlacementSystem;
    private controllableUnits!: ControllableUnitSystem;
    private dragSelectionInput?: DragSelectionInputSystem;
    private elapsedSec = 0;
    private economyEventLog: string[] = [];
    private economyLabels = new Map<string, Phaser.GameObjects.Text>();
    private economyChickenHpFills = new Map<string, Phaser.GameObjects.Rectangle>();
    private economyViewPositions = new Map<string, EconomyPoint>();
    private economyPocCoopId?: string;
    private economyState?: ChickenFarmEconomyState;
    private economyViewObjects = new Map<string, Phaser.GameObjects.GameObject[]>();
    private economyWorkerTasks = new Map<string, EconomyWorkerTask>();
    private minimapGraphics?: Phaser.GameObjects.Graphics;
    private performanceProfiler = new PerformanceProfiler();
    private playerControl!: PlayerControlSystem;
    private playerStarts: PlayerStart[] = [];
    private telemetry!: TelemetryRecorder;
    private nextFarmerFeedAtSec = 0;
    private nextTelemetrySampleSec = 0;
    private nextFogUpdateSec = 0;
    private nextMinimapUpdateSec = 0;
    private resourceText!: Phaser.GameObjects.Text;
    private selectedBuildingId?: string;
    private selectedEconomyEntity?: EconomyHitTarget;
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
        this.inventorySlots = hud.inventorySlots;
        this.bindInventorySlotInput();
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
                isActionEnabled: (action) => {
                    const farmer = this.controllableUnits
                        .getSelectedUnits()
                        .find((unit) => unit.templateId === 'farmer' && unit.hp > 0);
                    if (!farmer) return true;
                    if (action.type === 'feed_nearby_chicken') {
                        return this.controllableUnits.hasMana(
                            farmer.id,
                            FARMER_FEED_MANA_COST,
                        );
                    }
                    if (action.type === 'start_herd_targeting') {
                        return this.controllableUnits.hasMana(
                            farmer.id,
                            FARMER_HERD_MANA_COST,
                        );
                    }
                    return true;
                },
                isAutocastActive: (autocastId) =>
                    autocastId === 'farmer_feed' && this.farmerFeedAutocast,
                keys: this.keys,
                onAction: (action) => this.handleCommandCardAction(action),
                onToggleAutocast: (autocastId) => {
                    if (autocastId !== 'farmer_feed') return;
                    this.farmerFeedAutocast = !this.farmerFeedAutocast;
                    this.nextFarmerFeedAtSec = this.elapsedSec;
                    this.telemetry.record('ability_autocast_toggled', {
                        abilityRawcode: 'A001',
                        active: this.farmerFeedAutocast,
                    });
                },
                recordTelemetry: (type, payload) => this.telemetry.record(type, payload),
            });
        }
        this.createEconomyPoc();
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
        this.performanceProfiler.measure('update.economyPoc', () =>
            this.updateEconomyPoc(),
        );
        this.updateFarmerFeedAutocast();
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

    private createEconomyPoc() {
        const player = this.playerControl.player;
        if (!player) return;

        this.economyState = createChickenFarmEconomyState({
            players: [{ carriedEggs: 0, coins: 120, id: 3 }],
        });
        this.ensureFarmerInventories();

        const wellPosition = this.getEconomyBuildingCenter(
            ECONOMY_POC_WELL_TEMPLATE_ID,
            player.x + MAJOR_TILE_PX,
            player.y - MAJOR_TILE_PX,
        );
        const coopPosition = this.getEconomyBuildingCenter(
            ECONOMY_POC_COOP_TEMPLATE_ID,
            wellPosition.x + MAJOR_TILE_PX,
            wellPosition.y,
        );
        const chickenPosition = {
            x: wellPosition.x + MAJOR_TILE_PX / 2,
            y: wellPosition.y + MAJOR_TILE_PX,
        };
        const coop = addEconomyCoop(this.economyState, {
            kind: 'basic',
            ownerPlayerId: 3,
            position: coopPosition,
        });
        const well = addEconomyWell(this.economyState, {
            ownerPlayerId: 3,
            position: wellPosition,
        });
        const chicken = addEconomyChicken(this.economyState, {
            elapsedSec: this.elapsedSec,
            kind: 'basic',
            ownerPlayerId: 3,
            position: chickenPosition,
        });
        const farmer =
            this.controllableUnits
                .getUnits()
                .find((unit) => unit.templateId === 'farmer' && unit.hp > 0) ?? null;
        const startingEggOrigin = farmer?.position ?? { x: player.x, y: player.y };
        const startingEggs = ECONOMY_POC_STARTING_EGG_OFFSETS.map((offset) =>
            addEconomyFieldEgg(this.economyState!, {
                droppedAtSec: this.elapsedSec,
                ownerPlayerId: 3,
                position: {
                    x: startingEggOrigin.x + offset.x,
                    y: startingEggOrigin.y + offset.y,
                },
                sourceChickenId: 'poc-starting-eggs',
                stackCount: 1,
                wellBuffed: false,
            }),
        );

        this.economyPocCoopId = coop.id;
        this.createWellView(well);
        this.createCoopView(coop);
        this.createChickenView(chicken);
        startingEggs.forEach((egg) => this.createEggView(egg));
        this.refreshEconomyLabels();
        this.recordEconomyEvent('economy_poc_created', {
            chickenId: chicken.id,
            coopId: coop.id,
            firstEggAtSec: Number(chicken.nextEggAtSec.toFixed(2)),
            footprintPx: MAJOR_TILE_PX,
            startingEggCount: startingEggs.length,
            wellId: well.id,
        });
    }

    private getEconomyBuildingCenter(
        templateId: typeof ECONOMY_POC_COOP_TEMPLATE_ID | typeof ECONOMY_POC_WELL_TEMPLATE_ID,
        worldX: number,
        worldY: number,
    ): EconomyPoint {
        const topLeft = snapBuildingTopLeft(templateId, worldX, worldY);
        const footprint = getBuildingFootprint(templateId, topLeft.x, topLeft.y);

        return {
            x: footprint.x + footprint.width / 2,
            y: footprint.y + footprint.height / 2,
        };
    }

    private getEconomyBuildingFootprint(
        templateId: typeof ECONOMY_POC_COOP_TEMPLATE_ID | typeof ECONOMY_POC_WELL_TEMPLATE_ID,
        position: EconomyPoint,
    ) {
        const topLeft = snapBuildingTopLeft(templateId, position.x, position.y);
        return getBuildingFootprint(templateId, topLeft.x, topLeft.y);
    }

    private isPointInsideEconomyBuildingFootprint(
        templateId: typeof ECONOMY_POC_COOP_TEMPLATE_ID | typeof ECONOMY_POC_WELL_TEMPLATE_ID,
        position: EconomyPoint,
        worldX: number,
        worldY: number,
    ) {
        const footprint = this.getEconomyBuildingFootprint(templateId, position);
        return new Phaser.Geom.Rectangle(
            footprint.x,
            footprint.y,
            footprint.width,
            footprint.height,
        ).contains(worldX, worldY);
    }

    private createEconomyFootprintPlate(
        templateId: typeof ECONOMY_POC_COOP_TEMPLATE_ID | typeof ECONOMY_POC_WELL_TEMPLATE_ID,
        position: EconomyPoint,
        color: number,
    ) {
        const footprint = this.getEconomyBuildingFootprint(templateId, position);
        const plate = this.add.graphics().setDepth(29);
        plate.fillStyle(color, 0.12);
        plate.fillRect(footprint.x, footprint.y, footprint.width, footprint.height);
        plate.lineStyle(2, 0xfff1b8, 0.72);
        plate.strokeRect(footprint.x, footprint.y, footprint.width, footprint.height);
        plate.lineStyle(1, 0x1b160d, 0.72);
        plate.strokeRect(
            footprint.x + 3,
            footprint.y + 3,
            footprint.width - 6,
            footprint.height - 6,
        );
        return plate;
    }

    private createEconomyNameplate(
        x: number,
        y: number,
        palette: {
            readonly backgroundColor: string;
            readonly color: string;
            readonly stroke: string;
        },
    ) {
        return this.add
            .text(x, y, '', {
                align: 'center',
                backgroundColor: palette.backgroundColor,
                color: palette.color,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                fontStyle: '800',
                padding: { bottom: 5, left: 10, right: 10, top: 5 },
                stroke: palette.stroke,
                strokeThickness: 6,
            })
            .setDepth(60)
            .setOrigin(0.5, 0.5)
            .setShadow(0, 3, '#000000', 5, true, true);
    }

    private updateEconomyPoc() {
        if (!this.economyState) return;

        const events = updateChickenFarmEconomy(this.economyState, this.elapsedSec, {
            canChickenOccupyPoint: (point) => this.canChickenOccupyPoint(point),
        });
        events.forEach((event) => this.handleEconomyEvent(event));

        this.resolveChickenPush();
        this.controllableUnits.resolveExternalUnitPush(
            this.economyState.chickens
                .filter((chicken) => chicken.aiState !== 'dead')
                .map((chicken) => ({
                    id: chicken.id,
                    position: chicken.position,
                    radius: ECONOMY_CHICKEN_COLLISION_RADIUS_PX,
                })),
        );
        this.syncChickenViews();
        this.updateEconomyWorkerTasks();
        this.refreshEconomyLabels();
    }

    private resolveChickenPush() {
        const chickens =
            this.economyState?.chickens.filter(
                (chicken) => chicken.aiState !== 'dead',
            ) ?? [];
        const minDistance = ECONOMY_CHICKEN_COLLISION_RADIUS_PX * 1.56;

        for (let i = 0; i < chickens.length; i += 1) {
            for (let j = i + 1; j < chickens.length; j += 1) {
                const chickenA = chickens[i];
                const chickenB = chickens[j];
                let dx = chickenB.position.x - chickenA.position.x;
                let dy = chickenB.position.y - chickenA.position.y;
                let distance = Math.hypot(dx, dy);
                if (distance >= minDistance) continue;
                if (distance <= 0.001) {
                    const angle = ((i + j + 1) * Math.PI) / 3;
                    dx = Math.cos(angle);
                    dy = Math.sin(angle);
                    distance = 1;
                }

                const pushDistance = Math.min((minDistance - distance) / 2, 8);
                const unitX = dx / distance;
                const unitY = dy / distance;
                const nextA = {
                    x: chickenA.position.x - unitX * pushDistance,
                    y: chickenA.position.y - unitY * pushDistance,
                };
                const nextB = {
                    x: chickenB.position.x + unitX * pushDistance,
                    y: chickenB.position.y + unitY * pushDistance,
                };
                if (this.canChickenOccupyPoint(nextA)) chickenA.position = nextA;
                if (this.canChickenOccupyPoint(nextB)) chickenB.position = nextB;
            }
        }
    }

    private canChickenOccupyPoint(point: EconomyPoint) {
        const economyBuildingRects = [
            ...(this.economyState?.wells.map((well) =>
                this.getEconomyBuildingFootprint(
                    ECONOMY_POC_WELL_TEMPLATE_ID,
                    well.position,
                ),
            ) ?? []),
            ...(this.economyState?.coops.map((coop) =>
                this.getEconomyBuildingFootprint(
                    ECONOMY_POC_COOP_TEMPLATE_ID,
                    coop.position,
                ),
            ) ?? []),
        ];
        return canOccupyPoint(point, {
            dynamicBlockedRects: [
                ...(this.buildingSystem?.getDynamicBlockedRects() ?? []),
                ...economyBuildingRects,
            ],
            terrainBlocker: this.terrainBlocker,
            worldSize: this.worldSize,
        });
    }

    private handleEconomyEvent(event: EconomyEvent) {
        if (event.type === 'egg_dropped' || event.type === 'egg_dropped_from_inventory') {
            const egg = this.economyState?.fieldEggs.find(
                (candidate) => candidate.id === event.eggId,
            );
            if (egg) this.createEggView(egg);
        }
        if (event.type === 'hatch_completed') {
            const chicken = this.economyState?.chickens.find(
                (candidate) => candidate.id === event.chickenId,
            );
            if (chicken) this.createChickenView(chicken);
        }
        if (event.type === 'chicken_died') {
            this.destroyEconomyView(event.chickenId);
        }

        this.recordEconomyEvent(`economy_${event.type}`, event);
    }

    private startCoopHatchById(coopId: string) {
        const state = this.economyState;
        if (!state) return;

        const hatchStarted = startCoopHatch(state, {
            coopId,
            elapsedSec: this.elapsedSec,
        });
        if (!hatchStarted) return;
        this.handleEconomyEvent(hatchStarted);
        this.refreshEconomyLabels();
        this.updateSelectionInfo();
    }

    private createWellView(well: EconomyWellState) {
        if (!this.economyState) return;

        const plate = this.createEconomyFootprintPlate(
            ECONOMY_POC_WELL_TEMPLATE_ID,
            well.position,
            0x3b95bd,
        );
        const aura = this.add
            .circle(
                well.position.x,
                well.position.y,
                this.economyState.config.wellRules[well.kind].attractRadiusPx,
                0x4aa3df,
                0.08,
            )
            .setStrokeStyle(2, 0x78c7ff, 0.25)
            .setDepth(18);
        const stones = this.add
            .circle(well.position.x, well.position.y + 6, 46, 0x52625f, 1)
            .setStrokeStyle(5, 0x202b2d, 1)
            .setDepth(30);
        const basin = this.add
            .circle(well.position.x, well.position.y + 6, 34, 0x3a6d87, 1)
            .setStrokeStyle(4, 0x1d3746, 1)
            .setDepth(31);
        const water = this.add
            .circle(well.position.x, well.position.y + 4, 22, 0x7fd4ff, 0.85)
            .setDepth(32);
        const label = this.createEconomyNameplate(
            well.position.x,
            well.position.y - ECONOMY_BUILDING_NAMEPLATE_OFFSET_PX,
            {
                backgroundColor: 'rgba(3, 15, 22, 0.98)',
                color: '#f1fbff',
                stroke: '#02070a',
            },
        );

        this.registerEconomyView(well.id, [plate, aura, stones, basin, water, label], label);
    }

    private createCoopView(coop: EconomyCoopState) {
        const plate = this.createEconomyFootprintPlate(
            ECONOMY_POC_COOP_TEMPLATE_ID,
            coop.position,
            0x9f6a31,
        );
        const base = this.add
            .rectangle(coop.position.x, coop.position.y + 12, 112, 82, 0x8b6238, 1)
            .setStrokeStyle(4, 0x3b2414, 1)
            .setDepth(31);
        const roof = this.add
            .triangle(
                coop.position.x,
                coop.position.y - 40,
                0,
                46,
                58,
                0,
                116,
                46,
                0xb4513d,
                1,
            )
            .setStrokeStyle(3, 0x4f1f17, 1)
            .setDepth(32);
        const door = this.add
            .rectangle(coop.position.x, coop.position.y + 28, 34, 50, 0x4b2d1b, 1)
            .setDepth(33);
        const label = this.createEconomyNameplate(
            coop.position.x,
            coop.position.y - ECONOMY_BUILDING_NAMEPLATE_OFFSET_PX,
            {
                backgroundColor: 'rgba(24, 10, 3, 0.98)',
                color: '#fff6db',
                stroke: '#120601',
            },
        );

        this.registerEconomyView(coop.id, [plate, base, roof, door, label], label);
    }

    private createChickenView(chicken: EconomyChickenState) {
        const hpBack = this.add
            .rectangle(chicken.position.x, chicken.position.y - 34, 44, 7, 0x080808, 1)
            .setStrokeStyle(1, 0x080808, 1)
            .setDepth(38);
        const hpFill = this.add
            .rectangle(chicken.position.x - 21, chicken.position.y - 34, 42, 5, 0x49d45d, 1)
            .setDepth(39)
            .setOrigin(0, 0.5);
        const body = this.add
            .ellipse(chicken.position.x, chicken.position.y, 44, 32, 0xf5f0d0, 1)
            .setStrokeStyle(3, 0x665b38, 1)
            .setDepth(34);
        const head = this.add
            .circle(chicken.position.x + 24, chicken.position.y - 12, 14, 0xf5f0d0, 1)
            .setStrokeStyle(2, 0x665b38, 1)
            .setDepth(35);
        const beak = this.add
            .triangle(
                chicken.position.x + 42,
                chicken.position.y - 10,
                0,
                0,
                14,
                6,
                0,
                12,
                0xf2b13b,
                1,
            )
            .setDepth(35);
        const label = this.createEconomyNameplate(chicken.position.x, chicken.position.y - 52, {
            backgroundColor: 'rgba(18, 17, 9, 0.98)',
            color: '#fffbe6',
            stroke: '#0a0803',
        });

        this.registerEconomyView(
            chicken.id,
            [body, head, beak, hpBack, hpFill, label],
            label,
        );
        this.economyChickenHpFills.set(chicken.id, hpFill);
        this.economyViewPositions.set(chicken.id, { ...chicken.position });
    }

    private createEggView(egg: FieldEggItemState) {
        const shell = this.add
            .ellipse(egg.position.x, egg.position.y - 18, 18, 24, 0xfff2bd, 1)
            .setStrokeStyle(2, 0x8f7842, 1)
            .setDepth(36);
        const shine = this.add
            .ellipse(egg.position.x - 4, egg.position.y - 23, 5, 8, 0xffffff, 0.55)
            .setDepth(37);
        const label = this.add
            .text(egg.position.x, egg.position.y - 48, '알', {
                align: 'center',
                backgroundColor: 'rgba(35, 28, 12, 0.92)',
                color: '#fff3ba',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
                fontStyle: '700',
                padding: { bottom: 3, left: 7, right: 7, top: 3 },
                stroke: '#171104',
                strokeThickness: 4,
            })
            .setDepth(38)
            .setOrigin(0.5);

        this.registerEconomyView(egg.id, [shell, shine, label]);
    }

    private updateEconomyWorkerTasks() {
        const state = this.economyState;
        if (!state) return;

        this.economyWorkerTasks.forEach((task, unitId) => {
            const unit = this.controllableUnits
                .getUnits()
                .find((candidate) => candidate.id === unitId);
            if (!unit || unit.hp <= 0 || unit.templateId !== 'farmer') {
                this.economyWorkerTasks.delete(unitId);
                return;
            }

            if (task.type === 'pickup_egg') {
                const egg = state.fieldEggs.find((candidate) => candidate.id === task.eggId);
                if (!egg) {
                    this.economyWorkerTasks.delete(unitId);
                    return;
                }
                const distance = Phaser.Math.Distance.Between(
                    unit.position.x,
                    unit.position.y,
                    egg.position.x,
                    egg.position.y,
                );
                if (distance > ECONOMY_INTERACTION_RADIUS_PX) return;

                const pickedUp = pickupFieldEgg(state, {
                    eggId: egg.id,
                    ownerPlayerId: unit.ownerPlayerId,
                    targetInventoryId: unit.id,
                });
                if (pickedUp) {
                    this.destroyEconomyView(egg.id);
                    this.handleEconomyEvent(pickedUp);
                    this.controllableUnits.clearUnitCommand(unit.id);
                }
                this.economyWorkerTasks.delete(unitId);
                return;
            }

            if (task.type === 'drop_to_field') {
                const distance = Phaser.Math.Distance.Between(
                    unit.position.x,
                    unit.position.y,
                    task.targetPoint.x,
                    task.targetPoint.y,
                );
                if (distance > ECONOMY_INTERACTION_RADIUS_PX) return;

                const dropped = dropInventoryEggToField(state, {
                    droppedAtSec: this.elapsedSec,
                    ownerPlayerId: unit.ownerPlayerId,
                    position: task.targetPoint,
                    sourceInventoryId: unit.id,
                    sourceSlotIndex: task.sourceSlotIndex,
                });
                if (dropped) {
                    this.handleEconomyEvent(dropped);
                    this.controllableUnits.clearUnitCommand(unit.id);
                }
                this.economyWorkerTasks.delete(unitId);
                return;
            }

            const coop = state.coops.find((candidate) => candidate.id === task.coopId);
            if (!coop) {
                this.economyWorkerTasks.delete(unitId);
                return;
            }
            const distance = Phaser.Math.Distance.Between(
                unit.position.x,
                unit.position.y,
                coop.position.x,
                coop.position.y,
            );
            if (distance > ECONOMY_INTERACTION_RADIUS_PX + 22) return;

            const inventory = getEconomyInventory(state, unit.id);
            const sourceSlot = inventory?.slots[task.sourceSlotIndex] ?? null;
            if (!sourceSlot || sourceSlot.itemRawcode !== 'I006') {
                this.economyWorkerTasks.delete(unitId);
                return;
            }

            const deposited = depositEggStackToCoop(state, {
                coopId: coop.id,
                ownerPlayerId: unit.ownerPlayerId,
                sourceInventoryId: unit.id,
                sourceSlotIndex: task.sourceSlotIndex,
            });
            if (deposited) {
                this.handleEconomyEvent(deposited);
                this.controllableUnits.clearUnitCommand(unit.id);
            }
            this.economyWorkerTasks.delete(unitId);
        });
    }

    private issueEconomySmartCommand(worldPoint: Phaser.Math.Vector2) {
        const state = this.economyState;
        if (!state) return false;

        const selectedFarmer = this.controllableUnits
            .getSelectedUnits()
            .find((unit) => unit.templateId === 'farmer' && unit.hp > 0);
        if (!selectedFarmer) return false;

        const target = this.hitTestEconomyEntity(worldPoint.x, worldPoint.y);
        if (!target) return false;

        if (target.type === 'egg') {
            const egg = state.fieldEggs.find((candidate) => candidate.id === target.id);
            if (!egg) return false;

            this.controllableUnits.issueMoveCommandToUnits(
                [selectedFarmer.id],
                egg.position,
                this.isQueueCommandMode() ? 'append' : 'replace',
            );
            this.economyWorkerTasks.set(selectedFarmer.id, {
                eggId: egg.id,
                type: 'pickup_egg',
                unitId: selectedFarmer.id,
            });
            this.recordEconomyEvent('economy_farmer_pickup_ordered', {
                eggId: egg.id,
                farmerId: selectedFarmer.id,
            });
            return true;
        }

        return false;
    }

    private hitTestEconomyEntity(worldX: number, worldY: number): EconomyHitTarget | null {
        const state = this.economyState;
        if (!state) return null;

        const egg = state.fieldEggs.find(
            (candidate) =>
                Phaser.Math.Distance.Between(
                    worldX,
                    worldY,
                    candidate.position.x,
                    candidate.position.y - 18,
                ) <= 28,
        );
        if (egg) return { id: egg.id, type: 'egg' };

        const coop = state.coops.find((candidate) =>
            this.isPointInsideEconomyBuildingFootprint(
                ECONOMY_POC_COOP_TEMPLATE_ID,
                candidate.position,
                worldX,
                worldY,
            ),
        );
        if (coop) return { id: coop.id, type: 'coop' };

        const chicken = state.chickens.find(
            (candidate) =>
                Phaser.Math.Distance.Between(
                    worldX,
                    worldY,
                    candidate.position.x,
                    candidate.position.y,
                ) <= 34,
        );
        if (chicken) return { id: chicken.id, type: 'chicken' };

        const well = state.wells.find((candidate) =>
            this.isPointInsideEconomyBuildingFootprint(
                ECONOMY_POC_WELL_TEMPLATE_ID,
                candidate.position,
                worldX,
                worldY,
            ),
        );
        if (well) return { id: well.id, type: 'well' };

        return null;
    }

    private getFarmerEggInventory(unitId: string) {
        if (!this.economyState) return 0;
        return countInventoryItem(this.economyState, unitId, 'I006');
    }

    private getTotalFarmerEggInventory() {
        if (!this.economyState) return 0;
        return this.controllableUnits
            .getUnits()
            .filter((unit) => unit.templateId === 'farmer')
            .reduce(
                (total, unit) =>
                    total + countInventoryItem(this.economyState!, unit.id, 'I006'),
                0,
            );
    }

    private bindInventorySlotInput() {
        this.inventorySlots.forEach((slotView) => {
            slotView.background.on(
                Phaser.Input.Events.POINTER_DOWN,
                (
                    pointer: Phaser.Input.Pointer,
                    _localX: number,
                    _localY: number,
                    event: Phaser.Types.Input.EventData,
                ) => {
                    event.stopPropagation();
                    this.beginInventoryDrag(slotView.index, pointer);
                },
            );
        });
        this.input.on(
            Phaser.Input.Events.POINTER_MOVE,
            (pointer: Phaser.Input.Pointer) => this.updateInventoryDrag(pointer),
        );
        this.input.on(
            Phaser.Input.Events.POINTER_UP,
            (pointer: Phaser.Input.Pointer) => this.completeInventoryDrag(pointer),
        );
    }

    private beginInventoryDrag(slotIndex: number, pointer: Phaser.Input.Pointer) {
        const state = this.economyState;
        const inventoryId = this.renderedInventoryId;
        const inventory = state && inventoryId ? getEconomyInventory(state, inventoryId) : null;
        const slot = inventory?.slots[slotIndex];
        if (!state || !inventory || !slot) return;

        this.destroyInventoryDrag();
        const ghost = this.add
            .text(pointer.x + 10, pointer.y + 10, this.getInventoryIconText(slot.itemRawcode), {
                align: 'center',
                backgroundColor: 'rgba(24, 21, 14, 0.94)',
                color: '#fff0bd',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '18px',
                fontStyle: '700',
                padding: { bottom: 5, left: 8, right: 8, top: 5 },
                stroke: '#141009',
                strokeThickness: 4,
            })
            .setDepth(220)
            .setOrigin(0.5);
        this.uiObjects.push(ghost);
        this.worldCamera.ignore(ghost);
        this.inventoryDrag = {
            ghost,
            inventoryId: inventory.id,
            itemRawcode: slot.itemRawcode,
            slotIndex,
        };
        this.recordEconomyEvent('economy_inventory_item_drag_started', {
            inventoryId: inventory.id,
            itemRawcode: slot.itemRawcode,
            slotIndex,
        });
    }

    private updateInventoryDrag(pointer: Phaser.Input.Pointer) {
        if (!this.inventoryDrag) return;

        this.inventoryDrag.ghost.setPosition(pointer.x + 10, pointer.y + 10);
    }

    private completeInventoryDrag(pointer: Phaser.Input.Pointer) {
        const drag = this.inventoryDrag;
        if (!drag) return;

        if (
            pointer.x <= CHICKEN_FARM_TILEMAP_POC_01.defaultViewportWidth &&
            pointer.y <= CHICKEN_FARM_TILEMAP_POC_01.defaultViewportHeight
        ) {
            const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
            const target = this.hitTestEconomyEntity(worldPoint.x, worldPoint.y);
            if (target?.type === 'coop') {
                this.depositDraggedInventoryItemToCoop(drag, target.id);
            } else {
                this.dropDraggedInventoryItemToField(drag, {
                    x: worldPoint.x,
                    y: worldPoint.y,
                });
            }
        }

        this.destroyInventoryDrag();
    }

    private dropDraggedInventoryItemToField(
        drag: InventoryDragState,
        targetPoint: EconomyPoint,
    ) {
        const state = this.economyState;
        const sourceInventory = state
            ? getEconomyInventory(state, drag.inventoryId)
            : null;
        if (!state || !sourceInventory || drag.itemRawcode !== 'I006') return;

        const sourceUnit = this.controllableUnits
            .getUnits()
            .find((unit) => unit.id === drag.inventoryId && unit.hp > 0);
        if (sourceUnit?.templateId === 'farmer') {
            this.controllableUnits.issueMoveCommandToUnits(
                [sourceUnit.id],
                targetPoint,
                this.isQueueCommandMode() ? 'append' : 'replace',
            );
            this.economyWorkerTasks.set(sourceUnit.id, {
                sourceSlotIndex: drag.slotIndex,
                targetPoint,
                type: 'drop_to_field',
                unitId: sourceUnit.id,
            });
            this.recordEconomyEvent('economy_inventory_item_drop_point_ordered', {
                inventoryId: drag.inventoryId,
                itemRawcode: drag.itemRawcode,
                sourceSlotIndex: drag.slotIndex,
                x: Number(targetPoint.x.toFixed(1)),
                y: Number(targetPoint.y.toFixed(1)),
            });
            return;
        }

        const dropped = dropInventoryEggToField(state, {
            droppedAtSec: this.elapsedSec,
            ownerPlayerId: sourceInventory.ownerPlayerId,
            position: targetPoint,
            sourceInventoryId: drag.inventoryId,
            sourceSlotIndex: drag.slotIndex,
        });
        if (!dropped) return;

        this.handleEconomyEvent(dropped);
        this.refreshEconomyLabels();
        this.updateSelectionInfo();
    }

    private depositDraggedInventoryItemToCoop(drag: InventoryDragState, coopId: string) {
        const state = this.economyState;
        const sourceInventory = state
            ? getEconomyInventory(state, drag.inventoryId)
            : null;
        if (!state || !sourceInventory || drag.itemRawcode !== 'I006') return;

        const coop = state.coops.find((candidate) => candidate.id === coopId);
        const sourceUnit = this.controllableUnits
            .getUnits()
            .find((unit) => unit.id === drag.inventoryId && unit.hp > 0);
        if (coop && sourceUnit?.templateId === 'farmer') {
            this.controllableUnits.issueMoveCommandToUnits(
                [sourceUnit.id],
                coop.position,
                this.isQueueCommandMode() ? 'append' : 'replace',
            );
            this.economyWorkerTasks.set(sourceUnit.id, {
                coopId,
                sourceSlotIndex: drag.slotIndex,
                type: 'deposit_to_coop',
                unitId: sourceUnit.id,
            });
            this.recordEconomyEvent('economy_inventory_item_drop_ordered', {
                coopId,
                inventoryId: drag.inventoryId,
                itemRawcode: drag.itemRawcode,
                sourceSlotIndex: drag.slotIndex,
            });
            return;
        }

        const deposited = depositEggStackToCoop(state, {
            coopId,
            ownerPlayerId: sourceInventory.ownerPlayerId,
            sourceInventoryId: drag.inventoryId,
            sourceSlotIndex: drag.slotIndex,
        });
        if (deposited) {
            this.handleEconomyEvent(deposited);
            this.refreshEconomyLabels();
            this.updateSelectionInfo();
        }
    }

    private destroyInventoryDrag() {
        this.inventoryDrag?.ghost.destroy();
        this.inventoryDrag = undefined;
    }

    private registerEconomyView(
        id: string,
        objects: Phaser.GameObjects.GameObject[],
        label?: Phaser.GameObjects.Text,
    ) {
        this.economyViewObjects.set(id, objects);
        if (label) this.economyLabels.set(id, label);
        this.worldObjects.push(...objects);
        this.cameras.getCamera('ui')?.ignore(objects);
    }

    private destroyEconomyView(id: string) {
        this.economyViewObjects.get(id)?.forEach((object) => object.destroy());
        this.economyViewObjects.delete(id);
        this.economyLabels.delete(id);
        this.economyChickenHpFills.delete(id);
        this.economyViewPositions.delete(id);
    }

    private syncChickenViews() {
        const state = this.economyState;
        if (!state) return;

        state.chickens.forEach((chicken) => {
            if (chicken.aiState === 'dead') return;
            const previous = this.economyViewPositions.get(chicken.id);
            if (!previous) return;
            const deltaX = chicken.position.x - previous.x;
            const deltaY = chicken.position.y - previous.y;
            if (deltaX !== 0 || deltaY !== 0) {
                this.economyViewObjects.get(chicken.id)?.forEach((object) => {
                    const movable = object as Phaser.GameObjects.GameObject & {
                        x: number;
                        y: number;
                        setPosition: (x: number, y: number) => unknown;
                    };
                    if (typeof movable.setPosition === 'function') {
                        movable.setPosition(movable.x + deltaX, movable.y + deltaY);
                    }
                });
                previous.x = chicken.position.x;
                previous.y = chicken.position.y;
            }

            const hpRatio = Phaser.Math.Clamp(chicken.hp / chicken.maxHp, 0, 1);
            const hpFill = this.economyChickenHpFills.get(chicken.id);
            if (hpFill) {
                hpFill.displayWidth = 42 * hpRatio;
                hpFill.setFillStyle(
                    hpRatio > 0.5 ? 0x49d45d : hpRatio > 0.25 ? 0xe5b844 : 0xdd4b43,
                    1,
                );
            }
        });
    }

    private refreshEconomyLabels() {
        const state = this.economyState;
        if (!state) return;

        state.wells.forEach((well) => {
            const feedingCount = state.chickens.filter(
                (chicken) =>
                    chicken.targetWellId === well.id &&
                    chicken.aiState !== 'dead',
            ).length;
            this.economyLabels
                .get(well.id)
                ?.setText(
                    `${well.kind === 'windmill' ? '풍차' : '우물'}\n급식 ${feedingCount}/${
                        state.config.wellRules[well.kind].feedCapacity
                    }`,
                );
        });
        state.coops.forEach((coop) => {
            const hatchJobs = state.hatchJobs.filter((job) => job.coopId === coop.id);
            const nextDone = hatchJobs[0]
                ? Math.max(0, hatchJobs[0].completeAtSec - this.elapsedSec)
                : null;
            this.economyLabels
                .get(coop.id)
                ?.setText(
                    nextDone === null
                        ? `닭장\n알 ${coop.storedEggs}`
                        : `닭장\n부화 ${nextDone.toFixed(0)}s`,
                );
        });
        state.chickens.forEach((chicken) => {
            const nextEggSec = Math.max(0, chicken.nextEggAtSec - this.elapsedSec);
            this.economyLabels
                .get(chicken.id)
                ?.setText(
                    `닭 ${Math.ceil(chicken.hp)}/${chicken.maxHp}\n${
                        chicken.aiState === 'recover'
                            ? '급식'
                            : chicken.aiState === 'herded'
                              ? '몰이 이동'
                            : chicken.aiState === 'seek_well'
                              ? '우물 이동'
                              : `알 ${nextEggSec.toFixed(0)}s`
                    }`,
                );
        });
    }

    private recordEconomyEvent(type: string, payload: object) {
        this.telemetry.record(type, payload as Record<string, unknown>);
        this.economyEventLog.unshift(type.replace('economy_', ''));
        this.economyEventLog = this.economyEventLog.slice(0, 4);
    }

    private getPlayerStartById(id: number) {
        return this.playerStarts.find((start) => start.id === id) ?? null;
    }

    private ensureFarmerInventories() {
        if (!this.economyState) return;

        this.controllableUnits
            .getUnits()
            .filter((unit) => unit.templateId === 'farmer')
            .forEach((unit) => {
                ensureEconomyInventory(this.economyState!, {
                    capacity: this.economyState!.config.inventorySlotCount,
                    id: unit.id,
                    ownerPlayerId: unit.ownerPlayerId,
                });
            });
    }

    private handlePlayerStartChanged(start: PlayerStart) {
        this.telemetry?.record('player_start_selected', {
            player: start.label,
            x: Number(start.x.toFixed(1)),
            y: Number(start.y.toFixed(1)),
        });
        if (start.id > 0) {
            this.controllableUnits?.createForStart(start);
            this.ensureFarmerInventories();
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
        if (this.herdTargetingActive && Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
            this.herdTargetingActive = false;
            this.telemetry.record('herd_targeting_cancelled', { reason: 'escape' });
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
            this.herdTargetingActive = false;
            this.attackTargetingActive = true;
            this.telemetry.record('attack_targeting_started', {
                selectedUnitCount: this.controllableUnits.getSelectedUnits().length,
            });
            return;
        }

        if (action.type === 'start_herd_targeting') {
            this.constructionPlacement?.cancelPlacement('herd_targeting');
            this.attackTargetingActive = false;
            this.herdTargetingActive = true;
            this.telemetry.record('herd_targeting_started');
            return;
        }

        if (action.type === 'feed_nearby_chicken') {
            this.feedChickenFromFarmer('manual');
            return;
        }

        if (action.type === 'stop') {
            this.updateStopHotkey(true);
            return;
        }

        if (action.type === 'start_coop_hatch') {
            if (this.selectedEconomyEntity?.type !== 'coop') return;
            this.startCoopHatchById(this.selectedEconomyEntity.id);
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
        if (this.selectedEconomyEntity?.type === 'coop') return 'economy_coop';

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
            d: Phaser.Input.Keyboard.KeyCodes.D,
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

        this.controllableUnits
            .getSelectedUnits()
            .forEach((unit) => this.economyWorkerTasks.delete(unit.id));
        const stoppedUnitCount = this.controllableUnits.stopSelectedUnits();
        this.telemetry.record('unit_stop_command_issued', {
            stoppedUnitCount,
        });
    }

    private configurePointerSelection() {
        this.dragSelectionInput = new DragSelectionInputSystem({
            camera: this.worldCamera,
            onClick: (worldPoint) => {
                if (this.herdTargetingActive) {
                    this.issueHerdTargetingCommand(worldPoint);
                    return;
                }
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
                    this.selectedEconomyEntity = undefined;
                } else {
                    const selectedEconomyEntity = this.hitTestEconomyEntity(
                        worldPoint.x,
                        worldPoint.y,
                    );
                    const selectedBuilding = this.buildingSystem?.hitTestBuilding(
                        worldPoint.x,
                        worldPoint.y,
                    );
                    this.selectedEconomyEntity = selectedEconomyEntity ?? undefined;
                    this.selectedBuildingId = selectedEconomyEntity
                        ? undefined
                        : selectedBuilding?.id;
                    if (selectedEconomyEntity || selectedBuilding) {
                        this.controllableUnits.clearSelection();
                    }
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
                    selectedEconomyEntityId: this.selectedEconomyEntity?.id ?? null,
                    selectedEconomyEntityType: this.selectedEconomyEntity?.type ?? null,
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
                this.selectedEconomyEntity = undefined;
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
                if (this.herdTargetingActive) {
                    this.herdTargetingActive = false;
                    this.telemetry.record('herd_targeting_cancelled', {
                        reason: 'right_click',
                    });
                    return;
                }

                const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
                if (this.issueEconomySmartCommand(worldPoint)) {
                    return;
                }
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
                    () => {
                        this.controllableUnits
                            .getSelectedUnits()
                            .forEach((unit) => this.economyWorkerTasks.delete(unit.id));
                        return this.controllableUnits.issueSmartCommandToSelected(
                            {
                                x: worldPoint.x,
                                y: worldPoint.y,
                            },
                            enemyTarget?.id,
                            this.isQueueCommandMode() ? 'append' : 'replace',
                        );
                    },
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

    private issueHerdTargetingCommand(worldPoint: Phaser.Math.Vector2) {
        const state = this.economyState;
        const farmer = this.controllableUnits
            .getSelectedUnits()
            .find((unit) => unit.templateId === 'farmer' && unit.hp > 0);
        this.herdTargetingActive = false;
        if (!state || !farmer) return;
        if (
            !this.controllableUnits.spendMana(
                farmer.id,
                FARMER_HERD_MANA_COST,
            )
        ) {
            return;
        }

        const chickenIds = herdEconomyChickens(state, {
            casterPosition: farmer.position,
            elapsedSec: this.elapsedSec,
            ownerPlayerId: farmer.ownerPlayerId,
            targetPosition: { x: worldPoint.x, y: worldPoint.y },
        });
        this.telemetry.record('farmer_herd_command_issued', {
            abilityRawcode: 'A002',
            affectedChickenCount: chickenIds.length,
            affectedChickenIds: chickenIds,
            farmerId: farmer.id,
            manaCost: FARMER_HERD_MANA_COST,
            x: Number(worldPoint.x.toFixed(1)),
            y: Number(worldPoint.y.toFixed(1)),
        });
        this.refreshEconomyLabels();
    }

    private updateFarmerFeedAutocast() {
        if (
            !this.farmerFeedAutocast ||
            this.elapsedSec < this.nextFarmerFeedAtSec
        ) {
            return;
        }

        this.nextFarmerFeedAtSec = this.elapsedSec + 0.75;
        this.feedChickenFromFarmer('autocast', true);
    }

    private feedChickenFromFarmer(
        mode: 'autocast' | 'manual',
        allowUnselectedFarmer = false,
    ) {
        const state = this.economyState;
        const units = allowUnselectedFarmer
            ? this.controllableUnits.getUnits()
            : this.controllableUnits.getSelectedUnits();
        const farmer = units.find(
            (unit) => unit.templateId === 'farmer' && unit.hp > 0,
        );
        if (!state || !farmer) return false;
        if (
            !this.controllableUnits.hasMana(
                farmer.id,
                FARMER_FEED_MANA_COST,
            )
        ) {
            return false;
        }

        const result = feedNearestEconomyChicken(state, {
            casterPosition: farmer.position,
            ownerPlayerId: farmer.ownerPlayerId,
        });
        if (!result) return false;
        if (
            !this.controllableUnits.spendMana(
                farmer.id,
                FARMER_FEED_MANA_COST,
            )
        ) {
            return false;
        }

        this.telemetry.record('farmer_feed_cast', {
            abilityRawcode: 'A001',
            farmerId: farmer.id,
            manaCost: FARMER_FEED_MANA_COST,
            mode,
            ...result,
        });
        this.refreshEconomyLabels();
        return true;
    }

    private exposeDebugAutomation() {
        window.__chickenFarmDebug = {
            getPerfSnapshot: () => this.performanceProfiler.getSnapshot(),
            getState: () => {
                const primaryUnit = this.controllableUnits.getPrimaryUnit();
                return {
                    buildingCount: this.buildingSystem?.getBuildingCount() ?? 0,
                    commandPage: this.commandCard?.getPage() ?? 'off',
                    economyPoc: this.economyState
                        ? {
                              chickens: this.economyState.chickens.length,
                              coops: this.economyState.coops.length,
                              fieldEggs: this.economyState.fieldEggs.length,
                              hatchJobs: this.economyState.hatchJobs.length,
                              wells: this.economyState.wells.length,
                          }
                        : null,
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
        const economyPoc = this.economyState
            ? `farm c:${this.economyState.chickens.length} egg:${this.economyState.fieldEggs.length} hatch:${this.economyState.hatchJobs.length} inv:${this.getTotalFarmerEggInventory()}`
            : 'farm off';
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
            `${this.playerControl.playerStartLabel} ${Math.round(player?.x ?? 0)}, ${Math.round(
                player?.y ?? 0,
            )} | camera ${Math.round(this.worldCamera.scrollX)}, ${Math.round(
                this.worldCamera.scrollY,
            )} | zoom ${CAMERA_ZOOM}x | grid ${
                this.buildGridVisible ? 'on' : 'off'
            } | terrain ${this.terrainOverlayVisible ? 'on' : 'off'} | log ${
                this.telemetry?.getEventCount() ?? 0
            }\n${economyPoc} | ${this.controllableUnits.getUnitSummary()} | speed ${
                primaryUnit?.speedPxPerSec ?? 0
            } | selected ${
                selectedUnits.map((unit) => unit.templateId).join(',') || 'none'
            } | buildings ${this.buildingSystem?.getBuildingCount() ?? 0} | ${
                economy
                    ? `gold ${economy.gold} lumber ${economy.lumber} supply ${economy.supplyUsed}/${economy.supplyCap} eggs ${economy.eggs}`
                    : 'economy off'
            } | card ${this.commandCard?.getPage() ?? 'off'} | placing ${
                this.constructionPlacement?.getActiveBuildingId() ?? 'none'
            }\n${buildingSelectionText} | viewport ${this.worldCamera.width}x${
                this.worldCamera.height
            } | vision ${VISIBILITY_OVERLAY.revealRadiusPx}px\n${this.performanceProfiler.getOverlayText()}`,
        );
    }

    private updateResourceText() {
        if (!this.resourceText) return;

        const economy = this.buildingSystem?.economy;
        const economyPoc = this.economyState
            ? `  Farm C:${this.economyState.chickens.length} Egg:${this.economyState.fieldEggs.length} Inv:${this.getTotalFarmerEggInventory()} Hatch:${this.economyState.hatchJobs.length}`
            : '';
        if (!economy) {
            this.resourceText.setText(`Gold - | Lumber - | Supply - | Eggs -${economyPoc}`);
            return;
        }

        this.resourceText.setText(
            `Gold ${economy.gold}  Lumber ${economy.lumber}  Supply ${economy.supplyUsed}/${economy.supplyCap}  Eggs ${economy.eggs}${economyPoc}`,
        );
    }

    private updateSelectionInfo() {
        if (!this.selectionInfoNameText) return;

        if (this.selectedEconomyEntity) {
            const handled = this.updateEconomySelectionInfo(this.selectedEconomyEntity);
            if (handled) return;
            this.selectedEconomyEntity = undefined;
        }

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
            this.clearInventorySlots();
            return;
        }

        const selectedUnits = this.controllableUnits.getSelectedUnits();
        const primaryUnit = selectedUnits[0];
        if (primaryUnit) {
            const stats = CHICKEN_FARM_BALANCE.defenders[primaryUnit.templateId];
            const command = primaryUnit.currentCommand?.type ?? 'idle';
            const carriedEggs =
                primaryUnit.templateId === 'farmer'
                    ? this.getFarmerEggInventory(primaryUnit.id)
                    : 0;
            const task = this.economyWorkerTasks.get(primaryUnit.id);

            this.selectionInfoPortrait.setFillStyle(
                primaryUnit.templateId === 'farmer' ? 0x4b3b24 : 0x31455c,
                1,
            );
            this.selectionInfoNameText.setText(
                `${primaryUnit.templateId === 'farmer' ? '농부' : '개'} (${stats.source.rawcode ?? primaryUnit.templateId})`,
            );
            this.selectionInfoStatsText.setText(
                `HP ${Math.ceil(primaryUnit.hp)}/${primaryUnit.maxHp} | MP ${Math.floor(
                    primaryUnit.mana,
                )}/${primaryUnit.maxMana} | Armor ${
                    primaryUnit.armor
                } | Damage ${stats.damage} | Cooldown ${stats.attackCooldownSec}s`,
            );
            this.selectionInfoStatusText.setText(
                `Command ${command} | Speed ${Math.round(
                    primaryUnit.speedPxPerSec,
                )}px/s | Range ${stats.attackRangePx ?? 0}px | Queue ${primaryUnit.commandQueue.length}`,
            );
            this.selectionInfoBodyText.setText(
                selectedUnits.length > 1
                    ? `${selectedUnits.length} units selected`
                    : primaryUnit.templateId === 'farmer'
                      ? `Inventory: egg x${carriedEggs} | Task: ${task?.type ?? 'none'}`
                      : 'Combat helper unit.',
            );
            this.renderInventorySlots(
                primaryUnit.templateId === 'farmer' && this.economyState
                    ? getEconomyInventory(this.economyState, primaryUnit.id)
                    : null,
            );
            return;
        }

        this.selectionInfoPortrait.setFillStyle(0x25291f, 1);
        this.selectionInfoNameText.setText('No Selection');
        this.selectionInfoStatsText.setText('Select a farmer, dog, or building.');
        this.selectionInfoStatusText.setText('');
        this.selectionInfoBodyText.setText('');
        this.clearInventorySlots();
    }

    private updateEconomySelectionInfo(target: EconomyHitTarget) {
        const state = this.economyState;
        if (!state) return false;

        if (target.type === 'coop') {
            const coop = state.coops.find((candidate) => candidate.id === target.id);
            if (!coop) return false;
            const inventory = getEconomyInventory(state, coop.id);
            const hatchJobs = state.hatchJobs.filter((job) => job.coopId === coop.id);
            const hatchText = hatchJobs[0]
                ? `${Math.max(0, hatchJobs[0].completeAtSec - this.elapsedSec).toFixed(1)}s`
                : 'none';
            this.selectionInfoPortrait.setFillStyle(0x6f4a28, 1);
            this.selectionInfoNameText.setText('닭장');
            this.selectionInfoStatsText.setText(
                `Inventory egg x${coop.storedEggs} | Hatch slots ${hatchJobs.length}/${
                    state.config.coopRules[coop.kind].hatchCapacity
                }`,
            );
            this.selectionInfoStatusText.setText(`Hatch ${hatchText}`);
            this.selectionInfoBodyText.setText(
                '농부가 든 알을 닭장에 넣으면 닭장 인벤토리에 들어가고 부화가 시작됩니다.',
            );
            this.renderInventorySlots(inventory);
            return true;
        }

        if (target.type === 'egg') {
            const egg = state.fieldEggs.find((candidate) => candidate.id === target.id);
            if (!egg) return false;
            this.selectionInfoPortrait.setFillStyle(0x8f7842, 1);
            this.selectionInfoNameText.setText('알');
            this.selectionInfoStatsText.setText(
                `Stack x${egg.stackCount} | Source ${egg.sourceChickenId}`,
            );
            this.selectionInfoStatusText.setText(
                `Dropped ${Math.max(0, this.elapsedSec - egg.droppedAtSec).toFixed(1)}s ago`,
            );
            this.selectionInfoBodyText.setText('농부를 선택한 뒤 알을 우클릭하면 농부 인벤토리에 들어갑니다.');
            this.clearInventorySlots();
            return true;
        }

        if (target.type === 'chicken') {
            const chicken = state.chickens.find((candidate) => candidate.id === target.id);
            if (!chicken) return false;
            this.selectionInfoPortrait.setFillStyle(0xded39b, 1);
            this.selectionInfoNameText.setText('닭');
            this.selectionInfoStatsText.setText(`Kind ${chicken.kind}`);
            this.selectionInfoStatusText.setText(
                `Next egg ${Math.max(0, chicken.nextEggAtSec - this.elapsedSec).toFixed(1)}s`,
            );
            this.selectionInfoBodyText.setText('우물 반경 안에서는 산란 시간이 짧아집니다.');
            this.clearInventorySlots();
            return true;
        }

        const well = state.wells.find((candidate) => candidate.id === target.id);
        if (!well) return false;
        this.selectionInfoPortrait.setFillStyle(0x3a6d87, 1);
        this.selectionInfoNameText.setText(well.kind === 'windmill' ? '풍차' : '우물');
        this.selectionInfoStatsText.setText(
            `Feed ${state.config.wellRules[well.kind].feedCapacity} | Attract ${
                state.config.wellRules[well.kind].attractRadiusPx
            }px`,
        );
        this.selectionInfoStatusText.setText(
            well.kind === 'windmill'
                ? `촉진제 x${state.config.wellRules.windmill.eggIntervalMultiplier}`
                : '먹이 유혹 / 모이 뿌리기',
        );
        this.selectionInfoBodyText.setText(
            well.kind === 'windmill'
                ? '최대 16마리를 급식하며 주변 닭의 산란 주기를 줄입니다.'
                : '최대 8마리를 지속적으로 유인해 급식합니다.',
        );
        this.clearInventorySlots();
        return true;
    }

    private renderInventorySlots(inventory: EconomyInventoryState | null) {
        this.renderedInventoryId = inventory?.id;
        this.inventorySlots.forEach((slotView, index) => {
            const slot = inventory?.slots[index] ?? null;
            slotView.background.setFillStyle(slot ? 0x3d3320 : 0x27291f, 1);
            slotView.background.setStrokeStyle(
                slot ? 2 : 1,
                slot ? 0xd4b263 : 0x756b4e,
                0.95,
            );
            slotView.iconText.setText(slot ? this.getInventoryIconText(slot.itemRawcode) : '');
            slotView.quantityText.setText(
                slot && slot.quantity > 1 ? String(slot.quantity) : '',
            );
        });
    }

    private clearInventorySlots() {
        this.renderInventorySlots(null);
    }

    private getInventoryIconText(itemRawcode: string) {
        if (itemRawcode === 'I006') return '알';
        return itemRawcode;
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
