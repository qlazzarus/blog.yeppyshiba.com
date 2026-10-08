import type { OrdinaryWavePhase } from './balanceTypes';
import { getWaveOrdinaryEnemyTier } from './waveEnemyTiers';

export function validateOrdinaryWavePhases(
    phases: readonly OrdinaryWavePhase[],
): void {
    let previousAtSec = -1;
    for (const phase of phases) {
        if (!Number.isFinite(phase.atSec) || phase.atSec <= previousAtSec) {
            throw new Error(`Wave phase atSec must be strictly increasing: ${phase.atSec}`);
        }
        previousAtSec = phase.atSec;
        if (phase.activeTiers.length === 0) {
            throw new Error(`Wave phase ${phase.atSec} has no active tiers`);
        }
        validateTierList(phase.atSec, phase.activeTiers, 'active');
        validateTierDeltas(phase.atSec, phase.phaseEntryTargetDeltas);
        if (phase.replenishIntervalSec <= 0 || phase.targetIncrementIntervalSec <= 0) {
            throw new Error(`Wave phase ${phase.atSec} has a non-positive interval`);
        }
        if (phase.periodicTargetDeltas !== null) {
            throw new Error(`Wave phase ${phase.atSec} has unapproved periodic target deltas`);
        }
    }
}

function validateTierList(atSec: number, tiers: readonly number[], label: string): void {
    const seen = new Set<number>();
    for (const tier of tiers) {
        if (!getWaveOrdinaryEnemyTier(tier)) {
            throw new Error(`Wave phase ${atSec} ${label} tier is unknown: ${tier}`);
        }
        if (seen.has(tier)) {
            throw new Error(`Wave phase ${atSec} has duplicate ${label} tier: ${tier}`);
        }
        seen.add(tier);
    }
}

function validateTierDeltas(
    atSec: number,
    deltas: OrdinaryWavePhase['phaseEntryTargetDeltas'],
): void {
    const seen = new Set<number>();
    for (const delta of deltas) {
        if (!Number.isFinite(delta.amount) || delta.amount < 0) {
            throw new Error(`Wave phase ${atSec} has negative target delta for tier ${delta.tier}`);
        }
        if (!getWaveOrdinaryEnemyTier(delta.tier)) {
            throw new Error(`Wave phase ${atSec} target delta tier is unknown: ${delta.tier}`);
        }
        if (seen.has(delta.tier)) {
            throw new Error(`Wave phase ${atSec} has duplicate target delta tier: ${delta.tier}`);
        }
        seen.add(delta.tier);
    }
}
