import type { OrdinaryWavePhase } from './balanceTypes';
import type { WavePhaseStartedEvent } from './waveScheduler';

export type WaveTargetPopulationTier = {
    readonly confirmedPhaseEntryDeltaTotal: number;
    readonly targetQuantity: number | null;
    readonly tier: number;
};

export type WavePopulationTargetsSnapshot = {
    readonly activeTierTargets: readonly WaveTargetPopulationTier[];
    readonly currentPhaseAtSec: number | null;
    readonly lastTickSec: number;
    readonly nextPeriodicIncrementAtSec: number | null;
};

export type WavePopulationTargetEvent =
    | {
        readonly atSec: number;
        readonly phaseAtSec: number;
        readonly type: 'phase_entry_targets_applied';
    }
    | {
        readonly atSec: number;
        readonly phaseAtSec: number;
        readonly type: 'periodic_target_increment_unresolved';
    };

export type WavePopulationTargets = {
    getSnapshot(): WavePopulationTargetsSnapshot;
    tick(
        elapsedSec: number,
        phaseStarts: readonly WavePhaseStartedEvent[],
    ): readonly WavePopulationTargetEvent[];
};

/**
 * Stores only target facts supported by the extracted source. Initial target
 * values and periodic increment amounts remain null until their source is
 * recovered; consequently this module never fabricates a spawn quantity.
 */
export function createWavePopulationTargets(): WavePopulationTargets {
    const confirmedDeltasByTier = new Map<number, number>();
    let currentPhase: OrdinaryWavePhase | null = null;
    let lastTickSec = 0;
    let nextPeriodicIncrementAtSec: number | null = null;
    let lastPhaseIndex = -1;

    return {
        getSnapshot() {
            return {
                activeTierTargets: (currentPhase?.activeTiers ?? []).map((tier) => ({
                    confirmedPhaseEntryDeltaTotal: confirmedDeltasByTier.get(tier) ?? 0,
                    targetQuantity: null,
                    tier,
                })),
                currentPhaseAtSec: currentPhase?.atSec ?? null,
                lastTickSec,
                nextPeriodicIncrementAtSec,
            };
        },
        tick(elapsedSec, phaseStarts) {
            assertElapsedTime(elapsedSec, lastTickSec);
            const events: WavePopulationTargetEvent[] = [];
            for (const phaseStart of phaseStarts) {
                if (phaseStart.atSec > elapsedSec || phaseStart.atSec < lastTickSec) {
                    throw new Error(`Wave population phase event is outside tick range: ${phaseStart.atSec}`);
                }
                if (phaseStart.phaseIndex <= lastPhaseIndex) {
                    throw new Error(`Wave population phase event repeated: ${phaseStart.phaseIndex}`);
                }
                appendPeriodicDueBefore(phaseStart.atSec, events);
                currentPhase = phaseStart.phase;
                lastPhaseIndex = phaseStart.phaseIndex;
                for (const delta of currentPhase.phaseEntryTargetDeltas) {
                    confirmedDeltasByTier.set(
                        delta.tier,
                        (confirmedDeltasByTier.get(delta.tier) ?? 0) + delta.amount,
                    );
                }
                nextPeriodicIncrementAtSec =
                    currentPhase.atSec + currentPhase.targetIncrementIntervalSec;
                events.push({
                    atSec: phaseStart.atSec,
                    phaseAtSec: currentPhase.atSec,
                    type: 'phase_entry_targets_applied',
                });
            }
            appendPeriodicDueThrough(elapsedSec, events);
            lastTickSec = elapsedSec;
            return events;
        },
    };

    function appendPeriodicDueBefore(
        exclusiveSec: number,
        events: WavePopulationTargetEvent[],
    ): void {
        while (
            currentPhase &&
            nextPeriodicIncrementAtSec !== null &&
            nextPeriodicIncrementAtSec < exclusiveSec
        ) {
            events.push({
                atSec: nextPeriodicIncrementAtSec,
                phaseAtSec: currentPhase.atSec,
                type: 'periodic_target_increment_unresolved',
            });
            nextPeriodicIncrementAtSec += currentPhase.targetIncrementIntervalSec;
        }
    }

    function appendPeriodicDueThrough(
        inclusiveSec: number,
        events: WavePopulationTargetEvent[],
    ): void {
        while (
            currentPhase &&
            nextPeriodicIncrementAtSec !== null &&
            nextPeriodicIncrementAtSec <= inclusiveSec
        ) {
            events.push({
                atSec: nextPeriodicIncrementAtSec,
                phaseAtSec: currentPhase.atSec,
                type: 'periodic_target_increment_unresolved',
            });
            nextPeriodicIncrementAtSec += currentPhase.targetIncrementIntervalSec;
        }
    }
}

function assertElapsedTime(elapsedSec: number, lastTickSec: number): void {
    if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
        throw new Error(`Wave population elapsedSec must be a non-negative finite number: ${elapsedSec}`);
    }
    if (elapsedSec < lastTickSec) {
        throw new Error(`Wave population time cannot move backward: ${elapsedSec} < ${lastTickSec}`);
    }
}
