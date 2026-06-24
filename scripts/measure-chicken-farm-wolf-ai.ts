import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHICKEN_FARM_BALANCE } from '../games/chicken-farm/src/game/balance';
import { POC_TOWER_FOCUS_LOCK_SEC } from '../games/chicken-farm/src/game/poc/combatPocLayout';
import {
    type WolfAiDecision,
    type WolfAiDecisionAction,
    type WolfAiDecisionInput,
    decideWolfAiBehavior,
} from '../games/chicken-farm/src/game/systems/wolfAiStateMachine';

type WolfAiCase = {
    readonly expectedAction: WolfAiDecisionAction;
    readonly id: string;
    readonly input: WolfAiDecisionInput;
    readonly note: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs/chicken_farm/chicken_farm_w3x_artifacts');
const outputPath = path.join(outputDir, 'wolf_ai_state_machine_metrics.json');

const pathing = CHICKEN_FARM_BALANCE.pathing;
const blockedDelay = pathing.blockerAttackAcquire.blockedToBlockerDelaySec;

const cases: readonly WolfAiCase[] = [
    {
        expectedAction: 'attack_direct_target',
        id: 'direct_target_has_priority',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: true,
            hasDirectTarget: true,
            hasLivePathWaypoint: true,
            isBlockingTargetInAttackRange: true,
            pathFailedSinceSec: 9,
        },
        note: 'Attackable direct target should override path following and blocker handling.',
    },
    {
        expectedAction: 'follow_path',
        id: 'path_available_prefers_move',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: true,
            hasDirectTarget: false,
            hasLivePathWaypoint: true,
            isBlockingTargetInAttackRange: true,
            pathFailedSinceSec: 8,
        },
        note: 'A live path should prevent premature blocker attacks.',
    },
    {
        expectedAction: 'wait_for_repath',
        id: 'path_missing_waits_before_blocker_delay',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: true,
            hasDirectTarget: false,
            hasLivePathWaypoint: false,
            isBlockingTargetInAttackRange: true,
            pathFailedSinceSec: 10 - blockedDelay + 0.01,
        },
        note: 'Path failure should not immediately become blocker attack.',
    },
    {
        expectedAction: 'approach_blocker',
        id: 'blocked_delay_elapsed_approaches_blocker',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: true,
            hasDirectTarget: false,
            hasLivePathWaypoint: false,
            isBlockingTargetInAttackRange: false,
            pathFailedSinceSec: 10 - blockedDelay,
        },
        note: 'After the blocked delay, an out-of-range blocker should be approached.',
    },
    {
        expectedAction: 'attack_blocker',
        id: 'blocked_delay_elapsed_attacks_blocker_in_range',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: true,
            hasDirectTarget: false,
            hasLivePathWaypoint: false,
            isBlockingTargetInAttackRange: true,
            pathFailedSinceSec: 10 - blockedDelay,
        },
        note: 'After the blocked delay, an in-range blocker should be attacked.',
    },
    {
        expectedAction: 'wait_for_repath',
        id: 'no_blocker_waits_for_repath',
        input: {
            blockedToBlockerDelaySec: blockedDelay,
            elapsedSec: 10,
            hasBlockingTarget: false,
            hasDirectTarget: false,
            hasLivePathWaypoint: false,
            isBlockingTargetInAttackRange: false,
            pathFailedSinceSec: 5,
        },
        note: 'Without a blocking target, the wolf should stay in repath/wait behavior.',
    },
];

async function main() {
    const measuredCases = cases.map((testCase) => {
        const actual = decideWolfAiBehavior(testCase.input);
        return {
            ...testCase,
            actual,
            pass: actual.action === testCase.expectedAction,
        };
    });
    const failedCases = measuredCases.filter((testCase) => !testCase.pass);
    const blockerSearchRadiusCells =
        pathing.blockerAttackAcquire.searchRadiusPx / pathing.cellSize;
    const warsmashFitChecks = [
        {
            id: 'blocked_to_blocker_delay_range',
            expected: '0.6 <= delay <= 1.0',
            actual: blockedDelay,
            pass: blockedDelay >= 0.6 && blockedDelay <= 1,
        },
        {
            id: 'repath_interval',
            expected: 0.5,
            actual: pathing.repath.intervalSec,
            pass: pathing.repath.intervalSec === 0.5,
        },
        {
            id: 'blocker_search_radius_cells',
            expected: '2 <= cells <= 3',
            actual: blockerSearchRadiusCells,
            pass: blockerSearchRadiusCells >= 2 && blockerSearchRadiusCells <= 3,
        },
        {
            id: 'path_available_does_not_attack_blocker',
            expected: 'follow_path',
            actual: getCaseDecision('path_available_prefers_move', measuredCases)
                ?.actual.action,
            pass:
                getCaseDecision('path_available_prefers_move', measuredCases)?.actual
                    .action === 'follow_path',
        },
        {
            id: 'blocked_delay_guards_attack_blocker',
            expected: 'wait_for_repath',
            actual: getCaseDecision(
                'path_missing_waits_before_blocker_delay',
                measuredCases,
            )?.actual.action,
            pass:
                getCaseDecision(
                    'path_missing_waits_before_blocker_delay',
                    measuredCases,
                )?.actual.action === 'wait_for_repath',
        },
        {
            id: 'tower_focus_lock_supports_retaliation',
            expected: '>= timber wolf attack cooldown',
            actual: POC_TOWER_FOCUS_LOCK_SEC,
            pass:
                POC_TOWER_FOCUS_LOCK_SEC >=
                CHICKEN_FARM_BALANCE.enemies.timber_wolf.attackCooldownSec,
        },
        {
            id: 'aggro_assist_enabled_for_tower_hits',
            expected: 'enabled, 256 <= radius <= 512, max assists 2..4',
            actual: CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist,
            pass:
                CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist.enabled &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist.radiusPx >= 256 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist.radiusPx <= 512 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist.maxAssistWolvesPerHit >=
                    2 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.aggroAssist.maxAssistWolvesPerHit <=
                    4,
        },
        {
            id: 'attack_move_refresh_enabled',
            expected: 'attackMove enabled, spawn refresh, 60s periodic refresh',
            actual: {
                attackMoveEnabled:
                    CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveEnabled,
                periodic:
                    CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel
                        .periodicAttackRefresh,
                spawn: CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel
                    .spawnEntryAttackRefresh,
                stuckRefresh: CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveRefresh,
            },
            pass:
                CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveEnabled &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel
                    .spawnEntryAttackRefresh.enabled &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel.periodicAttackRefresh
                    .enabled &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.jassOrderModel.periodicAttackRefresh
                    .intervalSec === 60 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveRefresh
                    .localRectPaddingPx >= 256 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveRefresh
                    .localRectPaddingPx <= 512 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveRefresh.stuckSec >= 3 &&
                CHICKEN_FARM_BALANCE.pathing.wolfAi.attackMoveRefresh.stuckSec <= 8,
        },
        {
            id: 'post_objective_cleanup_is_not_primary_ai',
            expected:
                'disabled; blocker destruction comes from attack-move/path failure',
            actual: CHICKEN_FARM_BALANCE.pathing.wolfAi.postObjectiveCleanup,
            pass: !CHICKEN_FARM_BALANCE.pathing.wolfAi.postObjectiveCleanup.enabled,
        },
    ];
    const failedFitChecks = warsmashFitChecks.filter((check) => !check.pass);
    const payload = {
        generatedAt: new Date().toISOString(),
        parameters: {
            blockedToBlockerDelaySec: blockedDelay,
            blockerSearchRadiusCells,
            blockerSearchRadiusPx: pathing.blockerAttackAcquire.searchRadiusPx,
            cellSize: pathing.cellSize,
            repathIntervalSec: pathing.repath.intervalSec,
            towerFocusLockSec: POC_TOWER_FOCUS_LOCK_SEC,
            wolfAggroAssist: pathing.wolfAi.aggroAssist,
            wolfAttackMoveRefresh: pathing.wolfAi.attackMoveRefresh,
            wolfPostObjectiveCleanup: pathing.wolfAi.postObjectiveCleanup,
        },
        warsmashReference: {
            blockedToBlockerDelayRangeSec: [0.6, 1.0],
            blockerSearchRadiusCells: [2, 3],
            blockerTargeting: 'movement_failure_result',
            attackMoveRefresh:
                'Spawn and 60s global attack refresh issue attack orders to random points; concrete targets are acquired while moving.',
            notesSource: 'docs/chicken_farm/chicken_farm_warsmash_behavior_notes.md',
            repathIntervalSec: 0.5,
        },
        cases: measuredCases,
        warsmashFitChecks,
        summary: {
            failed: failedCases.length,
            passed: measuredCases.length - failedCases.length,
            total: measuredCases.length,
            warsmashFit:
                failedCases.length === 0 && failedFitChecks.length === 0
                    ? 'pass'
                    : 'fail',
            warsmashFitFailed: failedFitChecks.length,
            warsmashFitPassed: warsmashFitChecks.length - failedFitChecks.length,
            warsmashFitTotal: warsmashFitChecks.length,
        },
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

    console.table(
        measuredCases.map((testCase) => ({
            id: testCase.id,
            expected: testCase.expectedAction,
            actual: testCase.actual.action,
            state: testCase.actual.state,
            pass: testCase.pass,
        })),
    );
    console.table(
        warsmashFitChecks.map((check) => ({
            id: check.id,
            expected: check.expected,
            actual: check.actual,
            pass: check.pass,
        })),
    );
    console.log(`Wrote ${outputPath}`);
}

function getCaseDecision(
    id: string,
    measuredCases: readonly (WolfAiCase & {
        readonly actual: WolfAiDecision;
        readonly pass: boolean;
    })[],
) {
    return measuredCases.find((testCase) => testCase.id === id);
}

await main();
