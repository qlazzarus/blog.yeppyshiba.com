import { CHICKEN_FARM_BALANCE } from '../balance';
import type { WolfFocusRule, WorldRect } from '../balanceTypes';

export type Point = {
    readonly x: number;
    readonly y: number;
};

export type WolfOrderRefreshReason =
    | 'periodic_global_attack_refresh'
    | 'spawn_rect_enter_attack';

export type WolfAttackMoveOrder = {
    readonly reason: WolfOrderRefreshReason;
    readonly target: Point;
};

export function getRandomPointInRect(
    rect: WorldRect,
    random: () => number = Math.random,
): Point {
    return {
        x: rect.minX + (rect.maxX - rect.minX) * random(),
        y: rect.minY + (rect.maxY - rect.minY) * random(),
    };
}

export function createWolfAttackMoveOrder(
    reason: WolfOrderRefreshReason,
    random?: () => number,
): WolfAttackMoveOrder {
    const { globalAttackRect } = CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel;

    return {
        reason,
        target: getRandomPointInRect(globalAttackRect, random),
    };
}

export function shouldRefreshWolfAttackMove(
    reason: WolfOrderRefreshReason,
    elapsedSinceLastRefreshSec: number,
): boolean {
    const model = CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel;

    if (reason === 'spawn_rect_enter_attack') {
        return model.spawnEntryAttackRefresh.enabled;
    }

    const { intervalSec } = model.periodicAttackRefresh;
    return (
        model.periodicAttackRefresh.enabled &&
        intervalSec !== undefined &&
        elapsedSinceLastRefreshSec >= intervalSec
    );
}

export function getEnabledWolfFocusRules(): readonly WolfFocusRule[] {
    return CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel.optionalFocusRules.filter(
        (rule) => rule.enabledByDefault,
    );
}
