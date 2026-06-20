export type WolfAiBehaviorState =
    | 'attack'
    | 'attack_blocker'
    | 'blocked'
    | 'dead'
    | 'move'
    | 'repath';

export type WolfAiDecisionAction =
    | 'approach_blocker'
    | 'attack_blocker'
    | 'attack_direct_target'
    | 'follow_path'
    | 'wait_for_repath';

export type WolfAiDecision = {
    readonly action: WolfAiDecisionAction;
    readonly reason:
        | 'attackable_target_in_range'
        | 'blocker_attack_range_reached'
        | 'blocker_found_after_path_failure'
        | 'path_available'
        | 'path_missing_waiting_for_blocker_delay';
    readonly state: WolfAiBehaviorState;
};

export type WolfAiDecisionInput = {
    readonly blockedToBlockerDelaySec: number;
    readonly elapsedSec: number;
    readonly hasDirectTarget: boolean;
    readonly hasLivePathWaypoint: boolean;
    readonly hasBlockingTarget: boolean;
    readonly isBlockingTargetInAttackRange: boolean;
    readonly pathFailedSinceSec?: number;
};

export function decideWolfAiBehavior(
    input: WolfAiDecisionInput,
): WolfAiDecision {
    if (input.hasDirectTarget) {
        return {
            action: 'attack_direct_target',
            reason: 'attackable_target_in_range',
            state: 'attack',
        };
    }

    if (input.hasLivePathWaypoint) {
        return {
            action: 'follow_path',
            reason: 'path_available',
            state: 'move',
        };
    }

    const blockedElapsedSec =
        input.pathFailedSinceSec === undefined
            ? 0
            : input.elapsedSec - input.pathFailedSinceSec;
    const blockedLongEnough =
        blockedElapsedSec >= input.blockedToBlockerDelaySec;

    if (input.hasBlockingTarget && blockedLongEnough) {
        if (input.isBlockingTargetInAttackRange) {
            return {
                action: 'attack_blocker',
                reason: 'blocker_attack_range_reached',
                state: 'attack_blocker',
            };
        }

        return {
            action: 'approach_blocker',
            reason: 'blocker_found_after_path_failure',
            state: 'blocked',
        };
    }

    return {
        action: 'wait_for_repath',
        reason: 'path_missing_waiting_for_blocker_delay',
        state: 'repath',
    };
}
