import type { OrdinaryWavePhase } from './balanceTypes';
import { validateOrdinaryWavePhases } from './wavePhaseConfig';

export type WavePhaseStartedEvent = {
    readonly atSec: number;
    readonly phase: OrdinaryWavePhase;
    readonly phaseIndex: number;
    readonly type: 'phase_started';
};

export type WaveSchedulerSnapshot = {
    readonly currentPhase: OrdinaryWavePhase | null;
    readonly lastTickSec: number;
    readonly nextPhaseAtSec: number | null;
};

export type WaveScheduler = {
    getSnapshot(): WaveSchedulerSnapshot;
    tick(elapsedSec: number): readonly WavePhaseStartedEvent[];
};

/**
 * Pure simulation-time clock. Population, replenish, and runtime spawning are
 * intentionally deferred to later SP-08 tasks.
 */
export function createWaveScheduler(
    phases: readonly OrdinaryWavePhase[],
): WaveScheduler {
    validateOrdinaryWavePhases(phases);

    let lastTickSec = 0;
    let nextPhaseIndex = 0;

    return {
        getSnapshot() {
            const currentPhase = phases[nextPhaseIndex - 1] ?? null;
            return {
                currentPhase,
                lastTickSec,
                nextPhaseAtSec: phases[nextPhaseIndex]?.atSec ?? null,
            };
        },
        tick(elapsedSec) {
            if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
                throw new Error(`Wave scheduler elapsedSec must be a non-negative finite number: ${elapsedSec}`);
            }
            if (elapsedSec < lastTickSec) {
                throw new Error(`Wave scheduler time cannot move backward: ${elapsedSec} < ${lastTickSec}`);
            }

            const events: WavePhaseStartedEvent[] = [];
            while (phases[nextPhaseIndex]?.atSec <= elapsedSec) {
                const phase = phases[nextPhaseIndex];
                events.push({
                    atSec: phase.atSec,
                    phase,
                    phaseIndex: nextPhaseIndex,
                    type: 'phase_started',
                });
                nextPhaseIndex += 1;
            }
            lastTickSec = elapsedSec;
            return events;
        },
    };
}
