import Phaser from 'phaser';

import type { GridPathPoint } from '../systems/pathing';
import type {
    WolfAiBehaviorState,
    WolfAiDecisionAction,
} from '../systems/wolfAiStateMachine';

export type CombatBuildingKind = 'farm_core' | 'fence' | 'tower';

export type CombatBuilding = {
    readonly armor: number;
    readonly attackDamageScale: number;
    readonly blocksPath: boolean;
    readonly body: Phaser.GameObjects.Rectangle;
    readonly footprint: Phaser.Geom.Rectangle;
    readonly hpBack: Phaser.GameObjects.Rectangle;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    hp: number;
    readonly id: string;
    readonly kind: CombatBuildingKind;
    readonly maxHp: number;
    readonly name: string;
    nextAttackAtSec: number;
    readonly targetableByWolves: boolean;
};

export type CombatWolf = {
    readonly body: Phaser.GameObjects.Container;
    readonly defaultTargetBuildingId: string;
    focusBuildingId?: string;
    focusLockedUntilSec: number;
    focusUnitId?: string;
    readonly hpFill: Phaser.GameObjects.Rectangle;
    hp: number;
    readonly maxHp: number;
    nextAttackAtSec: number;
    nextRepathAtSec: number;
    path: readonly GridPathPoint[];
    pathFailedSinceSec?: number;
    pathIndex: number;
    state: WolfAiBehaviorState;
    stateAction?: WolfAiDecisionAction;
    stateReason?: string;
    targetBuildingId?: string;
    targetPoint: Phaser.Math.Vector2;
};

export type PlayerStart = {
    readonly id: number;
    readonly label: string;
    readonly x: number;
    readonly y: number;
};

export type WorldMarker = {
    readonly color: number;
    readonly type: string;
    readonly x: number;
    readonly y: number;
};
