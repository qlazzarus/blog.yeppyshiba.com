import Phaser from 'phaser';

import { CHICKEN_FARM_BALANCE } from '../balance';
import type {
    CombatBuilding,
    CombatBuildingKind,
    CombatWolf,
    PlayerStart,
} from '../ecs/components';
import {
    COMBAT_POC_LAYOUT,
    POC_TOWER_FOCUS_LOCK_SEC,
    POC_TOWER_ID,
    POC_WOLF_COUNT,
    POC_WOLF_ID,
    POC_WOLF_SPAWN_SPACING_PX,
} from '../poc/combatPocLayout';
import {
    createCombatLayoutPlan,
    type CombatBuildingSpec,
} from './combat/combatLayoutFactory';
import {
    canWolfOccupyPoint,
    getWolfUnitPathGoalCandidates as getWolfUnitPathGoalCandidatesFromAdapter,
    moveWolfAlongPath as moveWolfAlongPathAdapter,
    moveWolfToward as moveWolfTowardAdapter,
    refreshWolfPath,
    sortCandidatesByWolfDistance,
} from './combat/wolfMovementPathAdapter';
import { updateTowerCombat as updateTowerCombatAdapter } from './combat/towerCombatAdapter';
import { type GridPathPoint } from './pathing';
import type {
    AttackableEnemyTarget,
    ControllableUnitCombatTarget,
} from './playerCommandTypes';
import { TerrainBlocker } from './terrainBlocker';
import { decideWolfAiBehavior } from './wolfAiStateMachine';

type CombatPocSystemConfig = {
    readonly scene: Phaser.Scene;
    readonly terrainBlocker: TerrainBlocker;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldSize: Phaser.Math.Vector2;
    readonly damageControllableUnit?: (unitId: string, damage: number) => boolean;
    readonly getElapsedSec: () => number;
    readonly getWolfTargetableUnits?: () => readonly ControllableUnitCombatTarget[];
    readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    readonly recordTelemetry?: (type: string, payload?: Record<string, unknown>) => void;
};

type WolfDirectTarget =
    | {
          readonly kind: 'building';
          readonly value: CombatBuilding;
      }
    | {
          readonly kind: 'unit';
          readonly value: ControllableUnitCombatTarget;
      };

type TowerHitMarker = {
    readonly damage: number;
    readonly expiresAtSec: number;
    readonly targetId: string;
    readonly targetX: number;
    readonly targetY: number;
    readonly towerId: string;
    readonly towerX: number;
    readonly towerY: number;
};

type WolfBuildingHitMarker = {
    readonly buildingId: string;
    readonly damage: number;
    readonly expiresAtSec: number;
    readonly targetX: number;
    readonly targetY: number;
    readonly wolfId: string;
    readonly wolfX: number;
    readonly wolfY: number;
};

const MAX_WOLF_MOVEMENT_DELTA_SEC = 1 / 60;
const COMBAT_DEBUG_DRAW_INTERVAL_SEC = 0.15;
const TOWER_HIT_MARKER_DURATION_SEC = 0.35;
const WOLF_BUILDING_HIT_MARKER_DURATION_SEC = 0.42;
const WOLF_HP_BAR_WIDTH_PX = 48;
const COMBAT_TELEMETRY_SNAPSHOT_INTERVAL_SEC = 1;

export class CombatPocSystem {
    private readonly scene: Phaser.Scene;
    private readonly terrainBlocker: TerrainBlocker;
    private readonly worldObjects: Phaser.GameObjects.GameObject[];
    private readonly worldSize: Phaser.Math.Vector2;
    private readonly damageControllableUnit?: (unitId: string, damage: number) => boolean;
    private readonly getElapsedSec: () => number;
    private readonly getWolfTargetableUnits: () => readonly ControllableUnitCombatTarget[];
    private readonly recordPerformance?: (label: string, elapsedMs: number) => void;
    private readonly recordTelemetry?: (
        type: string,
        payload?: Record<string, unknown>,
    ) => void;
    private combatBuildings: CombatBuilding[] = [];
    private combatGraphics?: Phaser.GameObjects.Graphics;
    private combatLabel?: Phaser.GameObjects.Text;
    private combatWolves: CombatWolf[] = [];
    private nextCombatDebugDrawAtSec = 0;
    private nextCombatTelemetrySnapshotAtSec = 0;
    private towerHitMarkers: TowerHitMarker[] = [];
    private wolfBuildingHitMarkers: WolfBuildingHitMarker[] = [];

    constructor(config: CombatPocSystemConfig) {
        this.scene = config.scene;
        this.terrainBlocker = config.terrainBlocker;
        this.worldObjects = config.worldObjects;
        this.worldSize = config.worldSize;
        this.damageControllableUnit = config.damageControllableUnit;
        this.getElapsedSec = config.getElapsedSec;
        this.getWolfTargetableUnits = config.getWolfTargetableUnits ?? (() => []);
        this.recordPerformance = config.recordPerformance;
        this.recordTelemetry = config.recordTelemetry;
    }

    private get elapsedSec() {
        return this.getElapsedSec();
    }

    create(anchor: PlayerStart) {
        this.combatBuildings.forEach((building) => {
            building.body.destroy();
            building.hpBack.destroy();
            building.hpFill.destroy();
        });
        this.combatWolves.forEach((wolf) => wolf.body.destroy());
        this.combatGraphics?.destroy();
        this.combatLabel?.destroy();

        this.combatBuildings = [];
        this.combatWolves = [];
        this.towerHitMarkers = [];
        this.wolfBuildingHitMarkers = [];
        this.nextCombatTelemetrySnapshotAtSec = 0;
        const layoutPlan = createCombatLayoutPlan({
            anchor,
            worldSize: this.worldSize,
        });

        this.combatGraphics = this.scene.add.graphics().setDepth(29);
        this.worldObjects.push(this.combatGraphics);

        layoutPlan.buildings.forEach((building) => this.addCombatBuilding(building));
        const farmCore = this.combatBuildings.find(
            (building) => building.id === layoutPlan.wolf.defaultTargetBuildingId,
        );
        const towerB = this.combatBuildings.find((building) => building.id === 'tower_b');
        if (towerB) towerB.nextAttackAtSec = this.elapsedSec + 0.58;

        this.createCombatWolves({
            defaultTargetBuildingId:
                farmCore?.id ?? layoutPlan.wolf.defaultTargetBuildingId,
            targetX: layoutPlan.wolf.targetX,
            targetY: layoutPlan.wolf.targetY,
            x: layoutPlan.wolf.x,
            y: layoutPlan.wolf.y,
        });

        this.combatLabel = this.scene.add
            .text(12, 12, layoutPlan.label, {
                backgroundColor: 'rgba(16,16,16,0.72)',
                color: '#f5e6ae',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '20px',
                padding: { bottom: 9, left: 12, right: 12, top: 9 },
            })
            .setDepth(1000)
            .setScrollFactor(0);
        this.scene.cameras.main.ignore(this.combatLabel);
        this.combatBuildings.forEach((building) =>
            this.updateCombatBuildingHealth(building),
        );
        this.recordCombatTelemetrySnapshot('created');
    }

    private addCombatBuilding(config: CombatBuildingSpec): CombatBuilding {
        const body = this.scene.add
            .rectangle(config.x, config.y, config.width, config.height, config.color, 1)
            .setStrokeStyle(2, 0x17120d, 0.9)
            .setDepth(24);
        const hpBack = this.scene.add
            .rectangle(
                config.x,
                config.y - config.height / 2 - 12,
                config.width,
                5,
                0x111111,
                0.9,
            )
            .setDepth(25);
        const hpFill = this.scene.add
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
        const label = this.scene.add
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
    private createCombatWolves(config: {
        readonly defaultTargetBuildingId: string;
        readonly targetX: number;
        readonly targetY: number;
        readonly x: number;
        readonly y: number;
    }) {
        for (let index = 0; index < POC_WOLF_COUNT; index += 1) {
            const row = index - (POC_WOLF_COUNT - 1) / 2;
            this.createCombatWolf({
                defaultTargetBuildingId: config.defaultTargetBuildingId,
                id: `combat-wolf-${index + 1}`,
                label: `wolf ${index + 1}`,
                targetX: config.targetX,
                targetY: config.targetY,
                x: config.x + (index % 2) * POC_WOLF_SPAWN_SPACING_PX,
                y: config.y + row * POC_WOLF_SPAWN_SPACING_PX,
            });
        }
    }

    private createCombatWolf(config: {
        readonly defaultTargetBuildingId: string;
        readonly id: string;
        readonly label: string;
        readonly targetX: number;
        readonly targetY: number;
        readonly x: number;
        readonly y: number;
    }) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const maxHp = enemy.hp;
        const shadow = this.scene.add
            .ellipse(0, 14, 44, 18, 0x070807, 0.52)
            .setDepth(24);
        const body = this.scene.add.ellipse(0, 0, 40, 28, 0x714f42, 1).setDepth(25);
        const head = this.scene.add
            .triangle(24, -2, 0, -10, 20, 0, 0, 10, 0x8a6758, 1)
            .setDepth(26);
        const hpBack = this.scene.add
            .rectangle(0, -31, WOLF_HP_BAR_WIDTH_PX, 5, 0x111111, 0.9)
            .setDepth(27);
        const hpFill = this.scene.add
            .rectangle(-WOLF_HP_BAR_WIDTH_PX / 2, -31, WOLF_HP_BAR_WIDTH_PX, 3, 0xff5d52, 1)
            .setOrigin(0, 0.5)
            .setDepth(28);
        const label = this.scene.add
            .text(0, 25, config.label, {
                color: '#f5d0b8',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '11px',
            })
            .setDepth(28)
            .setOrigin(0.5);
        const container = this.scene.add.container(config.x, config.y, [
            shadow,
            body,
            head,
            hpBack,
            hpFill,
            label,
        ]);
        container.setDepth(28);

        const wolf: CombatWolf = {
            body: container,
            defaultTargetBuildingId: config.defaultTargetBuildingId,
            focusLockedUntilSec: 0,
            hp: maxHp,
            hpFill,
            id: config.id,
            maxHp,
            nextAttackAtSec: 0,
            nextRepathAtSec: 0,
            path: [],
            pathIndex: 0,
            state: 'move',
            targetPoint: new Phaser.Math.Vector2(config.targetX, config.targetY),
        };
        this.combatWolves.push(wolf);
        this.worldObjects.push(container);
    }

    update(deltaSec: number) {
        if (!this.getAliveWolves().length) return;

        this.updateTowerCombat();
        this.getAliveWolves().forEach((wolf) => this.updateWolfCombat(wolf, deltaSec));
        this.getAliveWolves().forEach((wolf) =>
            this.separateWolfFromControllableUnits(wolf),
        );
        this.separateWolvesFromEachOther();
        this.recordCombatTelemetrySnapshot();
        this.drawCombatDebug();
    }

    recordCombatResult() {
        const farmCore = this.combatBuildings.find(
            (building) => building.kind === 'farm_core',
        );
        const aliveWolves = this.getAliveWolves();
        this.recordTelemetry?.('combat_poc_result', {
            aliveWolfCount: aliveWolves.length,
            deadWolfCount: this.combatWolves.length - aliveWolves.length,
            elapsedSec: Number(this.elapsedSec.toFixed(3)),
            farmHp: farmCore ? Math.ceil(farmCore.hp) : null,
            farmMaxHp: farmCore?.maxHp ?? null,
            result:
                farmCore && farmCore.hp <= 0
                    ? 'farm_destroyed'
                    : aliveWolves.length === 0
                      ? 'wolves_defeated'
                      : 'in_progress',
        });
    }

    getAttackableEnemyTarget(targetId: string): AttackableEnemyTarget | null {
        const wolf = this.getTargetWolf(targetId);
        if (!wolf) return null;

        return {
            hp: wolf.hp,
            id: wolf.id,
            radius: 17,
            x: wolf.body.x,
            y: wolf.body.y,
        };
    }

    hitTestEnemy(worldX: number, worldY: number) {
        const radius = 24;
        const wolf = this.getAliveWolves()
            .map((candidate) => ({
                distance: Phaser.Math.Distance.Between(
                    worldX,
                    worldY,
                    candidate.body.x,
                    candidate.body.y,
                ),
                wolf: candidate,
            }))
            .filter((candidate) => candidate.distance <= radius)
            .sort((a, b) => a.distance - b.distance)[0]?.wolf;
        if (!wolf) return null;

        return this.getAttackableEnemyTarget(wolf.id);
    }

    damageEnemyTarget(targetId: string, damage: number) {
        const wolf = this.getTargetWolf(targetId);
        if (!wolf) return false;

        const appliedDamage = Math.max(1, damage);
        wolf.hp = Math.max(0, wolf.hp - appliedDamage);
        wolf.hpFill.width = WOLF_HP_BAR_WIDTH_PX * (wolf.hp / wolf.maxHp);

        if (wolf.hp <= 0) {
            this.markWolfDead(wolf);
            this.recordWolfDied(wolf, 'controllable_unit');
        }

        return true;
    }

    getDynamicBlockedRects() {
        return this.combatBuildings
            .filter((building) => building.blocksPath && building.hp > 0)
            .map((building) => ({
                height: building.footprint.height,
                width: building.footprint.width,
                x: building.footprint.x,
                y: building.footprint.y,
            }));
    }

    private updateTowerCombat() {
        const wolves = this.getAliveWolves();
        if (!wolves.length) return;

        updateTowerCombatAdapter({
            combatBuildings: this.combatBuildings,
            elapsedSec: this.elapsedSec,
            focusWolfOnBuilding: (wolf, building) =>
                this.focusWolfOnBuilding(wolf, building),
            onTowerHit: ({ damage, target, tower }) => {
                this.recordTelemetry?.('tower_attack_landed', {
                    damage,
                    towerHp: Math.ceil(tower.hp),
                    towerId: tower.id,
                    targetHpAfter: Math.ceil(target.hp),
                    targetWolfId: target.id,
                    targetX: Number(target.body.x.toFixed(1)),
                    targetY: Number(target.body.y.toFixed(1)),
                    towerX: Number(tower.body.x.toFixed(1)),
                    towerY: Number(tower.body.y.toFixed(1)),
                });
                this.towerHitMarkers.push({
                    damage,
                    expiresAtSec: this.elapsedSec + TOWER_HIT_MARKER_DURATION_SEC,
                    targetId: target.id,
                    targetX: target.body.x,
                    targetY: target.body.y,
                    towerId: tower.id,
                    towerX: tower.body.x,
                    towerY: tower.body.y,
                });
                if (target.hp <= 0) {
                    this.markWolfDead(target);
                    this.recordWolfDied(target, tower.id);
                }
            },
            wolves,
        });
    }

    private updateWolfCombat(wolf: CombatWolf, deltaSec: number) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const movementDeltaSec = Math.min(deltaSec, MAX_WOLF_MOVEMENT_DELTA_SEC);
        this.updateWolfUnitFocus(wolf);
        this.syncWolfTargetPoint(wolf);
        const directTarget = this.getCurrentWolfTarget(wolf);
        this.refreshWolfPathIfNeeded(wolf);
        if (
            !directTarget &&
            wolf.path.length <= wolf.pathIndex &&
            wolf.pathFailedSinceSec === undefined
        ) {
            wolf.pathFailedSinceSec = this.elapsedSec;
        }
        const blockingTarget = this.getWolfBlockingTarget(wolf);
        const decision = decideWolfAiBehavior({
            blockedToBlockerDelaySec:
                CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire
                    .blockedToBlockerDelaySec,
            elapsedSec: this.elapsedSec,
            hasBlockingTarget: Boolean(blockingTarget),
            hasDirectTarget: Boolean(directTarget),
            hasLivePathWaypoint:
                wolf.path.length > 0 && wolf.pathIndex < wolf.path.length,
            isBlockingTargetInAttackRange: blockingTarget
                ? this.isWolfInAttackRange(wolf, blockingTarget)
                : false,
            pathFailedSinceSec: wolf.pathFailedSinceSec,
        });

        this.recordWolfStateChange(wolf, decision.state, decision.action, decision.reason);
        wolf.state = decision.state;
        wolf.stateAction = decision.action;
        wolf.stateReason = decision.reason;

        const focusedGoal = wolf.focusBuildingId
            ? this.getWolfGoalBuilding(wolf)
            : null;
        if (
            decision.action === 'wait_for_repath' &&
            focusedGoal &&
            focusedGoal.kind !== 'fence' &&
            !directTarget &&
            !blockingTarget
        ) {
            wolf.targetBuildingId = focusedGoal.id;
            const targetPoint = this.getClosestPointOnBuildingFootprint(
                wolf.body.x,
                wolf.body.y,
                focusedGoal,
            );
            moveWolfTowardAdapter({
                deltaSec: movementDeltaSec,
                dynamicBlockedRects: this.getCombatBlockedRects(),
                separateWolfFromControllableUnits: () =>
                    this.separateWolfFromControllableUnits(wolf),
                speedPxPerSec: enemy.speedPxPerSec,
                targetX: targetPoint.x,
                targetY: targetPoint.y,
                terrainBlocker: this.terrainBlocker,
                wolf,
                worldSize: this.worldSize,
            });
            return;
        }

        if (decision.action === 'attack_direct_target' && directTarget) {
            wolf.targetBuildingId =
                directTarget.kind === 'building' ? directTarget.value.id : undefined;
            if (directTarget.kind === 'unit') {
                wolf.focusUnitId = directTarget.value.id;
            }
            this.attackWolfDirectTarget(wolf, directTarget, enemy.damage);
            return;
        }

        if (decision.action === 'follow_path') {
            wolf.targetBuildingId = undefined;
            wolf.pathFailedSinceSec = undefined;
            const beforeX = wolf.body.x;
            const beforeY = wolf.body.y;
            moveWolfAlongPathAdapter({
                deltaSec: movementDeltaSec,
                dynamicBlockedRects: this.getCombatBlockedRects(),
                separateWolfFromControllableUnits: () =>
                    this.separateWolfFromControllableUnits(wolf),
                speedPxPerSec: enemy.speedPxPerSec,
                terrainBlocker: this.terrainBlocker,
                wolf,
                worldSize: this.worldSize,
            });
            const movedDistance = Phaser.Math.Distance.Between(
                beforeX,
                beforeY,
                wolf.body.x,
                wolf.body.y,
            );
            if (
                movedDistance < 0.5 &&
                wolf.path.length > 0 &&
                wolf.pathIndex < wolf.path.length
            ) {
                wolf.path = [];
                wolf.pathIndex = 0;
                wolf.pathFailedSinceSec = this.elapsedSec;
            }
            return;
        }

        wolf.pathFailedSinceSec ??= this.elapsedSec;

        if (decision.action === 'attack_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            this.attackCombatBuilding(wolf, blockingTarget, enemy.damage);
            return;
        }

        if (decision.action === 'approach_blocker' && blockingTarget) {
            wolf.targetBuildingId = blockingTarget.id;
            moveWolfTowardAdapter({
                deltaSec: movementDeltaSec,
                dynamicBlockedRects: this.getCombatBlockedRects(),
                separateWolfFromControllableUnits: () =>
                    this.separateWolfFromControllableUnits(wolf),
                speedPxPerSec: enemy.speedPxPerSec,
                targetX: blockingTarget.body.x,
                targetY: blockingTarget.body.y,
                terrainBlocker: this.terrainBlocker,
                wolf,
                worldSize: this.worldSize,
            });
            return;
        }

        wolf.targetBuildingId = undefined;
    }

    private focusWolfOnBuilding(wolf: CombatWolf, building: CombatBuilding) {
        if (building.hp <= 0 || !building.targetableByWolves) return;
        if (wolf.focusUnitId && this.getWolfFocusedUnit(wolf)) return;
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

    private syncWolfTargetPoint(wolf: CombatWolf) {
        const focusedUnit = this.getWolfFocusedUnit(wolf);
        if (focusedUnit) {
            const [candidate] = this.getWolfUnitPathGoalCandidates(wolf, focusedUnit);
            wolf.targetPoint.set(
                candidate?.x ?? focusedUnit.x,
                candidate?.y ?? focusedUnit.y,
            );
            return;
        }

        const goal = this.getWolfGoalBuilding(wolf);
        if (!goal) return;

        const [candidate] = this.getWolfPathGoalCandidates(wolf, goal);
        wolf.targetPoint.set(candidate?.x ?? goal.body.x, candidate?.y ?? goal.body.y);
    }

    private refreshWolfPathIfNeeded(wolf: CombatWolf, force = false) {
        const focusedUnit = this.getWolfFocusedUnit(wolf);
        refreshWolfPath({
            combatBuildings: this.combatBuildings,
            dynamicBlockedRects: this.getCombatBlockedRects(),
            elapsedSec: this.elapsedSec,
            focusedUnit,
            force,
            getGoalBuilding: () => this.getWolfGoalBuilding(wolf),
            getPathGoalCandidates: (building) =>
                this.getWolfPathGoalCandidates(wolf, building),
            getUnitPathGoalCandidates: (unit) =>
                this.getWolfUnitPathGoalCandidates(wolf, unit),
            recordPerformance: this.recordPerformance,
            terrainBlocker: this.terrainBlocker,
            wolf,
            worldSize: this.worldSize,
        });
    }

    private getWolfPathGoalCandidates(
        wolf: CombatWolf,
        building: CombatBuilding,
    ): GridPathPoint[] {
        const attackRange =
            CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID].attackRangePx ?? 34;
        const baseMargin = Math.max(12, attackRange - 10);
        const margins = [baseMargin, baseMargin + 32, baseMargin + 64];
        const left = building.footprint.left;
        const right = building.footprint.right;
        const top = building.footprint.top;
        const bottom = building.footprint.bottom;
        const centerX = building.body.x;
        const centerY = building.body.y;
        const edgeXs = [centerX, left, right];
        const edgeYs = [centerY, top, bottom];
        const candidates: GridPathPoint[] = [];

        margins.forEach((margin) => {
            edgeXs.forEach((x) => {
                candidates.push({ x, y: top - margin });
                candidates.push({ x, y: bottom + margin });
            });
            edgeYs.forEach((y) => {
                candidates.push({ x: left - margin, y });
                candidates.push({ x: right + margin, y });
            });
        });

        const unblockedCandidates = candidates.filter(
            (candidate) => !this.isCombatPathPointBlocked(candidate),
        );
        const attackLineCandidates = unblockedCandidates.filter(
            (candidate) => !this.isAttackCandidateLineBlocked(candidate, building),
        );

        return sortCandidatesByWolfDistance(
            this.dedupePathGoalCandidates(
                attackLineCandidates.length > 0
                    ? attackLineCandidates
                    : unblockedCandidates,
            ),
            wolf,
        );
    }

    private dedupePathGoalCandidates(candidates: readonly GridPathPoint[]) {
        const seen = new Set<string>();
        return candidates.filter((candidate) => {
            const key = `${Math.round(candidate.x)}:${Math.round(candidate.y)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    private isAttackCandidateLineBlocked(
        candidate: GridPathPoint,
        targetBuilding: CombatBuilding,
    ) {
        const targetPoint = this.getClosestPointOnBuildingFootprint(
            candidate.x,
            candidate.y,
            targetBuilding,
        );
        const attackLine = new Phaser.Geom.Line(
            candidate.x,
            candidate.y,
            targetPoint.x,
            targetPoint.y,
        );

        return this.combatBuildings.some((building) => {
            if (building.id === targetBuilding.id) return false;
            if (!building.blocksPath || building.hp <= 0) return false;

            return Phaser.Geom.Intersects.LineToRectangle(
                attackLine,
                building.footprint,
            );
        });
    }

    private isCombatPathPointBlocked(point: GridPathPoint) {
        return !this.canWolfOccupyPoint(point.x, point.y);
    }

    private getCurrentWolfTarget(wolf: CombatWolf) {
        const focusedGoal = this.getWolfGoalBuilding(wolf);

        if (
            focusedGoal &&
            wolf.focusBuildingId &&
            focusedGoal.kind !== 'fence'
        ) {
            if (this.isWolfInAttackRange(wolf, focusedGoal)) {
                return { kind: 'building', value: focusedGoal };
            }

            return null;
        }

        const unitTarget = this.getWolfUnitTargetInAttackRange(wolf);
        if (unitTarget) return unitTarget;

        if (
            focusedGoal &&
            focusedGoal.kind !== 'fence' &&
            this.isWolfInAttackRange(wolf, focusedGoal) &&
            !this.isWolfAttackLineBlocked(wolf, focusedGoal)
        ) {
            return { kind: 'building', value: focusedGoal };
        }

        const buildingTarget =
            this.combatBuildings.find((building) => {
                if (!building.targetableByWolves || building.hp <= 0) return false;

                if (!this.isWolfInAttackRange(wolf, building)) return false;
                if (building.kind === 'fence') return false;
                if (this.isWolfAttackLineBlocked(wolf, building)) return false;
                if (building.kind === 'tower') return true;
                return true;
            }) ?? null;

        return buildingTarget ? { kind: 'building', value: buildingTarget } : null;
    }

    private updateWolfUnitFocus(wolf: CombatWolf) {
        if (wolf.focusBuildingId && this.getWolfGoalBuilding(wolf)) return;

        const focusedUnit = this.getWolfFocusedUnit(wolf);
        if (focusedUnit) {
            const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
            const distance = Phaser.Math.Distance.Between(
                wolf.body.x,
                wolf.body.y,
                focusedUnit.x,
                focusedUnit.y,
            );
            const leashRange =
                (enemy.acquireRangePx ?? 176) +
                (enemy.rangeLeashPx ?? 16) +
                focusedUnit.radius;
            if (distance <= leashRange) return;
        }

        wolf.focusUnitId = undefined;
        const target = this.getWolfUnitTargetInAcquireRange(wolf);
        if (!target) return;

        wolf.focusUnitId = target.id;
        wolf.focusBuildingId = undefined;
        wolf.path = [];
        wolf.pathIndex = 0;
        wolf.nextRepathAtSec = 0;
        wolf.pathFailedSinceSec = undefined;
    }

    private getWolfFocusedUnit(wolf: CombatWolf) {
        if (!wolf.focusUnitId) return null;

        const focusedUnit =
            this.getWolfTargetableUnits().find(
                (unit) =>
                    unit.id === wolf.focusUnitId &&
                    unit.hp > 0 &&
                    unit.targetableByWolves,
            ) ?? null;
        if (!focusedUnit) {
            wolf.focusUnitId = undefined;
        }

        return focusedUnit;
    }

    private getWolfUnitTargetInAcquireRange(wolf: CombatWolf) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const acquireRange = enemy.acquireRangePx ?? 176;
        const units = this.getWolfTargetableUnits()
            .filter((unit) => {
                if (!unit.targetableByWolves || unit.hp <= 0) return false;
                return (
                    Phaser.Math.Distance.Between(
                        wolf.body.x,
                        wolf.body.y,
                        unit.x,
                        unit.y,
                    ) <=
                    acquireRange + unit.radius
                );
            })
            .sort(
                (a, b) =>
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y),
            );

        return units[0] ?? null;
    }

    private getWolfUnitPathGoalCandidates(
        wolf: CombatWolf,
        unit: ControllableUnitCombatTarget,
    ): GridPathPoint[] {
        return getWolfUnitPathGoalCandidatesFromAdapter({
            isBlocked: (point) => this.isCombatPathPointBlocked(point),
            unit,
            wolf,
        });
    }

    private isWolfAttackLineBlocked(wolf: CombatWolf, target: CombatBuilding) {
        const targetPoint = this.getClosestPointOnBuildingFootprint(
            wolf.body.x,
            wolf.body.y,
            target,
        );
        const line = new Phaser.Geom.Line(
            wolf.body.x,
            wolf.body.y,
            targetPoint.x,
            targetPoint.y,
        );

        return this.combatBuildings.some((building) => {
            if (building.id === target.id || building.hp <= 0 || !building.blocksPath) {
                return false;
            }

            return Phaser.Geom.Intersects.LineToRectangle(line, building.footprint);
        });
    }

    private getClosestPointOnBuildingFootprint(
        x: number,
        y: number,
        building: CombatBuilding,
    ) {
        return {
            x: Phaser.Math.Clamp(x, building.footprint.left, building.footprint.right),
            y: Phaser.Math.Clamp(y, building.footprint.top, building.footprint.bottom),
        };
    }

    private getWolfUnitTargetInAttackRange(wolf: CombatWolf): WolfDirectTarget | null {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const acquireRange = enemy.acquireRangePx ?? 176;
        const attackRange = enemy.attackRangePx ?? 34;
        const units = this.getWolfTargetableUnits()
            .filter((unit) => {
                if (!unit.targetableByWolves || unit.hp <= 0) return false;
                const distance = Phaser.Math.Distance.Between(
                    wolf.body.x,
                    wolf.body.y,
                    unit.x,
                    unit.y,
                );
                if (distance > acquireRange) return false;
                if (distance > attackRange + unit.radius) return false;
                return !this.isWolfLineToPointBlocked(wolf, unit.x, unit.y);
            })
            .sort(
                (a, b) =>
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(wolf.body.x, wolf.body.y, b.x, b.y),
            );

        return units[0] ? { kind: 'unit', value: units[0] } : null;
    }

    private isWolfLineToPointBlocked(
        wolf: CombatWolf,
        targetX: number,
        targetY: number,
    ) {
        const line = new Phaser.Geom.Line(wolf.body.x, wolf.body.y, targetX, targetY);
        return this.combatBuildings.some((building) => {
            if (building.hp <= 0 || !building.blocksPath) return false;
            return Phaser.Geom.Intersects.LineToRectangle(line, building.footprint);
        });
    }

    private getWolfGoalBuilding(wolf: CombatWolf) {
        const focused = wolf.focusBuildingId
            ? this.combatBuildings.find(
                  (building) =>
                      building.id === wolf.focusBuildingId &&
                      building.hp > 0 &&
                      building.targetableByWolves,
              )
            : undefined;
        if (
            focused &&
            focused.kind === 'tower' &&
            this.elapsedSec >= wolf.focusLockedUntilSec
        ) {
            wolf.focusBuildingId = undefined;
            wolf.targetBuildingId = undefined;
        } else if (focused) {
            return focused;
        }

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

    private getWolfBlockingTarget(wolf: CombatWolf) {
        const pathLine = this.getWolfTargetLine(wolf);
        const searchRadius =
            CHICKEN_FARM_BALANCE.pathing.blockerAttackAcquire.searchRadiusPx;
        const targetableBlockers = this.combatBuildings.filter((building) => {
            return (
                building.blocksPath &&
                building.targetableByWolves &&
                building.hp > 0
            );
        });
        const byDistanceFromWolf = (a: CombatBuilding, b: CombatBuilding) =>
            this.getDistanceFromWolfToBuildingFootprint(wolf, a) -
            this.getDistanceFromWolfToBuildingFootprint(wolf, b);
        const lineBlockers = targetableBlockers
            .filter((building) =>
                Phaser.Geom.Intersects.LineToRectangle(pathLine, building.footprint),
            )
            .sort(byDistanceFromWolf);
        if (lineBlockers[0]) return lineBlockers[0];

        const closeBlockers = targetableBlockers
            .filter((building) => {
                if (this.getDistanceFromWolfToBuildingFootprint(wolf, building) > searchRadius) {
                    return false;
                }

                return true;
            })
            .sort(byDistanceFromWolf);

        if (closeBlockers[0]) return closeBlockers[0];

        if (
            wolf.pathFailedSinceSec !== undefined &&
            wolf.path.length <= wolf.pathIndex
        ) {
            const goal = this.getWolfGoalBuilding(wolf);
            if (goal && goal.targetableByWolves && goal.hp > 0) return goal;

            return [...targetableBlockers].sort(byDistanceFromWolf)[0] ?? null;
        }

        return null;
    }

    private getDistanceFromWolfToBuildingFootprint(
        wolf: CombatWolf,
        building: CombatBuilding,
    ) {
        const closest = this.getClosestPointOnBuildingFootprint(
            wolf.body.x,
            wolf.body.y,
            building,
        );

        return Phaser.Math.Distance.Between(
            wolf.body.x,
            wolf.body.y,
            closest.x,
            closest.y,
        );
    }

    private isWolfInAttackRange(wolf: CombatWolf, building: CombatBuilding) {
        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const attackRange =
            (enemy.attackRangePx ?? 34) + (enemy.rangeLeashPx ?? 0);
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

    private attackCombatBuilding(
        wolf: CombatWolf,
        building: CombatBuilding,
        damage: number,
    ) {
        if (this.elapsedSec < wolf.nextAttackAtSec) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const appliedDamage = Math.max(1, damage - building.armor);
        building.hp = Math.max(0, building.hp - appliedDamage);
        wolf.nextAttackAtSec = this.elapsedSec + enemy.attackCooldownSec;
        this.updateCombatBuildingHealth(building);
        const targetPoint = this.getClosestPointOnBuildingFootprint(
            wolf.body.x,
            wolf.body.y,
            building,
        );
        this.wolfBuildingHitMarkers.push({
            buildingId: building.id,
            damage: appliedDamage,
            expiresAtSec:
                this.elapsedSec + WOLF_BUILDING_HIT_MARKER_DURATION_SEC,
            targetX: targetPoint.x,
            targetY: targetPoint.y,
            wolfId: wolf.id,
            wolfX: wolf.body.x,
            wolfY: wolf.body.y,
        });
        this.recordTelemetry?.('wolf_attack_landed', {
            buildingHpAfter: Math.ceil(building.hp),
            buildingId: building.id,
            buildingKind: building.kind,
            damage: appliedDamage,
            targetX: Number(targetPoint.x.toFixed(1)),
            targetY: Number(targetPoint.y.toFixed(1)),
            wolfId: wolf.id,
            wolfX: Number(wolf.body.x.toFixed(1)),
            wolfY: Number(wolf.body.y.toFixed(1)),
        });

        if (building.hp <= 0) {
            building.body.setAlpha(0.22);
            building.hpBack.setVisible(false);
            building.hpFill.setVisible(false);
            if (wolf.focusBuildingId === building.id) {
                wolf.focusBuildingId = undefined;
            }
            this.recordTelemetry?.('building_destroyed', {
                buildingId: building.id,
                buildingKind: building.kind,
                destroyedByWolfId: wolf.id,
            });
            this.getAliveWolves().forEach((aliveWolf) =>
                this.refreshWolfPathIfNeeded(aliveWolf, true),
            );
        }
    }

    private attackWolfDirectTarget(
        wolf: CombatWolf,
        target: WolfDirectTarget,
        damage: number,
    ) {
        if (target.kind === 'building') {
            this.attackCombatBuilding(wolf, target.value, damage);
            return;
        }

        if (this.elapsedSec < wolf.nextAttackAtSec) return;

        const enemy = CHICKEN_FARM_BALANCE.enemies[POC_WOLF_ID];
        const damaged = this.damageControllableUnit?.(target.value.id, damage) ?? false;
        wolf.nextAttackAtSec = this.elapsedSec + enemy.attackCooldownSec;
        this.recordTelemetry?.('wolf_attack_landed', {
            damage,
            targetHpAfter: Math.max(0, target.value.hp - damage),
            targetId: target.value.id,
            targetKind: 'unit',
            targetType: target.value.templateId,
            wolfId: wolf.id,
            wolfX: Number(wolf.body.x.toFixed(1)),
            wolfY: Number(wolf.body.y.toFixed(1)),
            wasApplied: damaged,
        });
    }

    private recordCombatTelemetrySnapshot(reason = 'interval') {
        if (!this.recordTelemetry) return;
        if (reason === 'interval' && this.elapsedSec < this.nextCombatTelemetrySnapshotAtSec) {
            return;
        }

        this.nextCombatTelemetrySnapshotAtSec =
            this.elapsedSec + COMBAT_TELEMETRY_SNAPSHOT_INTERVAL_SEC;
        this.recordTelemetry('combat_poc_snapshot', {
            buildings: this.combatBuildings.map((building) => ({
                hp: Math.ceil(building.hp),
                id: building.id,
                kind: building.kind,
                maxHp: building.maxHp,
                x: Number(building.body.x.toFixed(1)),
                y: Number(building.body.y.toFixed(1)),
            })),
            reason,
            units: this.getWolfTargetableUnits().map((unit) => ({
                hp: Math.ceil(unit.hp),
                id: unit.id,
                maxHp: unit.maxHp,
                templateId: unit.templateId,
                x: Number(unit.x.toFixed(1)),
                y: Number(unit.y.toFixed(1)),
            })),
            wolves: this.combatWolves.map((wolf) => ({
                focusBuildingId: wolf.focusBuildingId ?? null,
                focusUnitId: wolf.focusUnitId ?? null,
                hp: Math.ceil(wolf.hp),
                id: wolf.id,
                maxHp: wolf.maxHp,
                pathRemaining: Math.max(0, wolf.path.length - wolf.pathIndex),
                state: wolf.state,
                stateAction: wolf.stateAction ?? null,
                stateReason: wolf.stateReason ?? null,
                targetBuildingId: wolf.targetBuildingId ?? null,
                targetPointX: Number(wolf.targetPoint.x.toFixed(1)),
                targetPointY: Number(wolf.targetPoint.y.toFixed(1)),
                x: Number(wolf.body.x.toFixed(1)),
                y: Number(wolf.body.y.toFixed(1)),
            })),
        });
    }

    private recordWolfStateChange(
        wolf: CombatWolf,
        nextState: CombatWolf['state'],
        nextAction: CombatWolf['stateAction'],
        nextReason: CombatWolf['stateReason'],
    ) {
        if (
            wolf.state === nextState &&
            wolf.stateAction === nextAction &&
            wolf.stateReason === nextReason
        ) {
            return;
        }

        this.recordTelemetry?.('wolf_state_changed', {
            focusBuildingId: wolf.focusBuildingId ?? null,
            focusUnitId: wolf.focusUnitId ?? null,
            fromAction: wolf.stateAction ?? null,
            fromReason: wolf.stateReason ?? null,
            fromState: wolf.state,
            pathRemaining: Math.max(0, wolf.path.length - wolf.pathIndex),
            targetBuildingId: wolf.targetBuildingId ?? null,
            toAction: nextAction ?? null,
            toReason: nextReason ?? null,
            toState: nextState,
            wolfId: wolf.id,
            x: Number(wolf.body.x.toFixed(1)),
            y: Number(wolf.body.y.toFixed(1)),
        });
    }

    private recordWolfDied(wolf: CombatWolf, killedBy: string) {
        this.recordTelemetry?.('wolf_died', {
            killedBy,
            wolfId: wolf.id,
            x: Number(wolf.body.x.toFixed(1)),
            y: Number(wolf.body.y.toFixed(1)),
        });
    }

    private markWolfDead(wolf: CombatWolf) {
        wolf.state = 'dead';
        wolf.stateAction = undefined;
        wolf.stateReason = undefined;
        wolf.focusBuildingId = undefined;
        wolf.focusUnitId = undefined;
        wolf.targetBuildingId = undefined;
        wolf.path = [];
        wolf.pathIndex = 0;
        wolf.pathFailedSinceSec = undefined;
        wolf.body.setAlpha(0.35);
    }

    private separateWolfFromControllableUnits(wolf: CombatWolf) {
        const wolfRadius = 17;
        this.getWolfTargetableUnits().forEach((unit) => {
            if (unit.hp <= 0) return;

            const minDistance = wolfRadius + unit.radius;
            const delta = new Phaser.Math.Vector2(
                wolf.body.x - unit.x,
                wolf.body.y - unit.y,
            );
            const distance = delta.length();
            if (distance >= minDistance) return;

            if (distance <= 0.001) {
                const nextX = unit.x + minDistance;
                const nextY = unit.y;
                if (this.canWolfOccupyPoint(nextX, nextY)) {
                    wolf.body.setPosition(nextX, nextY);
                }
                return;
            }

            delta.normalize().scale(minDistance - distance);
            const nextX = wolf.body.x + delta.x;
            const nextY = wolf.body.y + delta.y;
            if (this.canWolfOccupyPoint(nextX, nextY)) {
                wolf.body.setPosition(nextX, nextY);
            }
        });
    }

    private separateWolvesFromEachOther() {
        const wolves = this.getAliveWolves();
        const wolfRadius = 17;
        for (let a = 0; a < wolves.length; a += 1) {
            for (let b = a + 1; b < wolves.length; b += 1) {
                const wolfA = wolves[a];
                const wolfB = wolves[b];
                const minDistance = wolfRadius * 2;
                const delta = new Phaser.Math.Vector2(
                    wolfB.body.x - wolfA.body.x,
                    wolfB.body.y - wolfA.body.y,
                );
                const distance = delta.length();
                if (distance >= minDistance) continue;

                const push = (minDistance - Math.max(distance, 0.001)) / 2;
                if (distance <= 0.001) {
                    delta.set(1, 0);
                } else {
                    delta.normalize();
                }
                const nextA = {
                    x: wolfA.body.x - delta.x * push,
                    y: wolfA.body.y - delta.y * push,
                };
                const nextB = {
                    x: wolfB.body.x + delta.x * push,
                    y: wolfB.body.y + delta.y * push,
                };
                if (this.canWolfOccupyPoint(nextA.x, nextA.y)) {
                    wolfA.body.setPosition(nextA.x, nextA.y);
                }
                if (this.canWolfOccupyPoint(nextB.x, nextB.y)) {
                    wolfB.body.setPosition(nextB.x, nextB.y);
                }
            }
        }
    }

    private canWolfOccupyPoint(x: number, y: number) {
        return canWolfOccupyPoint({
            dynamicBlockedRects: this.getCombatBlockedRects(),
            terrainBlocker: this.terrainBlocker,
            worldSize: this.worldSize,
            x,
            y,
        });
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

    private updateCombatBuildingHealth(building: CombatBuilding) {
        building.hpFill.width = Math.max(
            0,
            building.body.width * (building.hp / building.maxHp),
        );
    }

    private getWolfTargetLine(wolf: CombatWolf) {
        return new Phaser.Geom.Line(
            wolf.body.x,
            wolf.body.y,
            wolf.targetPoint.x,
            wolf.targetPoint.y,
        );
    }

    private getAliveWolves() {
        return this.combatWolves.filter((wolf) => wolf.hp > 0 && wolf.state !== 'dead');
    }

    private getTargetWolf(targetId: string) {
        return (
            this.combatWolves.find((wolf) => wolf.id === targetId && wolf.hp > 0) ??
            null
        );
    }

    private drawCombatDebug() {
        const wolf = this.getAliveWolves()[0];
        if (!this.combatGraphics || !wolf) return;
        if (this.elapsedSec < this.nextCombatDebugDrawAtSec) return;
        this.nextCombatDebugDrawAtSec =
            this.elapsedSec + COMBAT_DEBUG_DRAW_INTERVAL_SEC;

        const graphics = this.combatGraphics;
        const towers = this.combatBuildings.filter(
            (building) => building.kind === 'tower' && building.hp > 0,
        );
        const goal = this.getWolfGoalBuilding(wolf);
        const blockingTarget = this.getWolfBlockingTarget(wolf);
        const target = this.getCurrentWolfTarget(wolf);
        const targetName =
            target?.value.name ?? blockingTarget?.name ?? goal?.name ?? undefined;
        const wolfStatus = this.getAliveWolves()
            .map(
                (aliveWolf) =>
                    `${aliveWolf.id.replace('combat-wolf-', 'w')}:${aliveWolf.stateAction ?? aliveWolf.state}/${aliveWolf.stateReason ?? 'none'} f=${aliveWolf.focusBuildingId ?? '-'} t=${aliveWolf.targetBuildingId ?? '-'} p=${aliveWolf.path.length - aliveWolf.pathIndex}`,
            )
            .join('\n');

        graphics.clear();
        const towerAttack = CHICKEN_FARM_BALANCE.buildingTemplates[POC_TOWER_ID].attack;
        if (towerAttack) {
            towers.forEach((tower) => {
                graphics.fillStyle(0xffd35a, 0.025);
                graphics.fillCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.lineStyle(3, 0xffd35a, 0.86);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx);
                graphics.lineStyle(1, 0x2b1b08, 0.75);
                graphics.strokeCircle(tower.body.x, tower.body.y, towerAttack.rangePx - 2);
            });
        }

        this.towerHitMarkers = this.towerHitMarkers.filter(
            (marker) => marker.expiresAtSec > this.elapsedSec,
        );
        this.towerHitMarkers.forEach((marker) => {
            const progress =
                (marker.expiresAtSec - this.elapsedSec) / TOWER_HIT_MARKER_DURATION_SEC;
            const alpha = Phaser.Math.Clamp(progress, 0, 1);
            graphics.lineStyle(4, 0xfff27a, 0.75 * alpha);
            graphics.lineBetween(
                marker.towerX,
                marker.towerY,
                marker.targetX,
                marker.targetY,
            );
            graphics.fillStyle(0xfff27a, 0.28 * alpha);
            graphics.fillCircle(marker.targetX, marker.targetY, 18);
            graphics.lineStyle(3, 0xfff27a, 0.95 * alpha);
            graphics.strokeCircle(marker.targetX, marker.targetY, 18);
        });

        this.wolfBuildingHitMarkers = this.wolfBuildingHitMarkers.filter(
            (marker) => marker.expiresAtSec > this.elapsedSec,
        );
        this.wolfBuildingHitMarkers.forEach((marker) => {
            const progress =
                (marker.expiresAtSec - this.elapsedSec) /
                WOLF_BUILDING_HIT_MARKER_DURATION_SEC;
            const alpha = Phaser.Math.Clamp(progress, 0, 1);
            graphics.lineStyle(4, 0xff6a3d, 0.78 * alpha);
            graphics.lineBetween(
                marker.wolfX,
                marker.wolfY,
                marker.targetX,
                marker.targetY,
            );
            graphics.fillStyle(0xff6a3d, 0.32 * alpha);
            graphics.fillCircle(marker.targetX, marker.targetY, 20);
            graphics.lineStyle(3, 0xffd08a, 0.95 * alpha);
            graphics.strokeCircle(marker.targetX, marker.targetY, 20);
        });

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

        this.combatLabel?.setText(
            `Combat PoC | wolf ${wolf.state}${targetName ? ` -> ${targetName}` : ''}\n` +
                `Wolves ${this.getAliveWolves().length}/${POC_WOLF_COUNT} | sample ${wolf.id} ${wolf.state} HP ${Math.ceil(wolf.hp)}/${wolf.maxHp}\n` +
                `${this.getTowerHealthDebugText()}\n` +
                `AI ${wolf.stateAction ?? 'none'} / ${wolf.stateReason ?? 'none'}\n` +
                `Focus ${wolf.focusBuildingId ?? 'none'} | target ${wolf.targetBuildingId ?? 'none'} | blocker ${blockingTarget?.id ?? 'none'}\n` +
                `A* ${wolf.path.length > 0 ? `path ${wolf.path.length}` : 'no path'} | blocker attack only after sealed path.\n` +
                wolfStatus,
        );
    }

    private getTowerHealthDebugText() {
        const towerA = this.combatBuildings.find((building) => building.id === 'tower_a');
        const towerB = this.combatBuildings.find((building) => building.id === 'tower_b');
        const format = (building: CombatBuilding | undefined) =>
            building
                ? `${Math.ceil(building.hp)}/${building.maxHp}`
                : 'missing';

        return `Towers A ${format(towerA)} | B ${format(towerB)}`;
    }
}
