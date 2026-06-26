export type Point = {
    readonly x: number;
    readonly y: number;
};

export type ControllableUnitTemplateId = 'dog' | 'farmer';

export type UnitCommand =
    | {
          readonly targetPoint: Point;
          readonly type: 'move';
          readonly unitIds: readonly string[];
      }
    | {
          readonly targetEntityId?: string;
          readonly targetPoint?: Point;
          readonly type: 'smart';
          readonly unitIds: readonly string[];
      }
    | {
          readonly targetEntityId: string;
          readonly type: 'attack';
          readonly unitIds: readonly string[];
      }
    | {
          readonly siteId: string;
          readonly targetPoint: Point;
          readonly type: 'build';
          readonly unitIds: readonly string[];
      }
    | {
          readonly type: 'stop';
          readonly unitIds: readonly string[];
      };

export type ControllableUnitState = {
    armor: number;
    currentCommand?: UnitCommand;
    hp: number;
    readonly id: string;
    maxHp: number;
    nextAttackAtSec: number;
    ownerPlayerId: number;
    path: readonly Point[];
    pathIndex: number;
    position: Point;
    selected: boolean;
    speedPxPerSec: number;
    readonly templateId: ControllableUnitTemplateId;
};

export type AttackableEnemyTarget = {
    readonly hp: number;
    readonly id: string;
    readonly radius: number;
    readonly x: number;
    readonly y: number;
};

export type ControllableUnitCombatTarget = {
    readonly armor: number;
    readonly hp: number;
    readonly id: string;
    readonly maxHp: number;
    readonly name: string;
    readonly radius: number;
    readonly targetableByWolves: boolean;
    readonly templateId: ControllableUnitTemplateId;
    readonly x: number;
    readonly y: number;
};
