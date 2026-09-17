import type { EngineInduction } from './engineProfile.ts';

export type PowertrainEventType = 'fuel-cut' | 'shift' | 'single-kick' | 'twin-stage' | 'lift';

export type PowertrainSnapshot = {
    fuelCutActive: boolean;
    gearIndex: number;
    induction: EngineInduction;
    primaryBoostRatio: number;
    rpm: number;
    secondaryBoostRatio: number;
    shiftCutRatio: number;
    throttle: number;
    totalBoostRatio: number;
};

export type PowertrainEvent = {
    sequence: number;
    type: PowertrainEventType;
};

export type PowertrainFeedbackState = {
    activeEvent: PowertrainEvent | null;
    activeEventRemainingSec: number;
    events: readonly PowertrainEvent[];
    liftArmed: boolean;
    previous: PowertrainSnapshot | null;
    sequence: number;
    singleKickArmed: boolean;
    singleKickCooldownSec: number;
    twinSecondaryActive: boolean;
};

const KICK_THRESHOLD = 0.65;
const KICK_REARM_THRESHOLD = 0.45;
const SECONDARY_ENTER_THRESHOLD = 0.1;
const SECONDARY_EXIT_THRESHOLD = 0.05;
const LIFT_MIN_BOOST = 0.25;
const EVENT_HOLD_SECONDS = 0.28;

export function createPowertrainFeedbackState(): PowertrainFeedbackState {
    return {
        activeEvent: null,
        activeEventRemainingSec: 0,
        events: [],
        liftArmed: true,
        previous: null,
        sequence: 0,
        singleKickArmed: true,
        singleKickCooldownSec: 0,
        twinSecondaryActive: false,
    };
}

/**
 * Converts controller outputs into one-shot feedback events. It never adjusts
 * boost or torque: the snapshot is read-only evidence of the drivetrain.
 */
export function derivePowertrainFeedback(
    state: PowertrainFeedbackState,
    snapshot: PowertrainSnapshot,
    seconds: number,
): PowertrainFeedbackState {
    const previous = state.previous;
    const cooldown = Math.max(0, state.singleKickCooldownSec - Math.max(0, seconds));
    const activeEventRemainingSec = Math.max(0, state.activeEventRemainingSec - Math.max(0, seconds));
    const singleKickArmed = snapshot.induction === 'single-turbo' && snapshot.totalBoostRatio <= KICK_REARM_THRESHOLD
        ? true
        : state.singleKickArmed;
    const liftArmed = snapshot.throttle >= 0.25 ? true : state.liftArmed;
    const twinSecondaryActive = snapshot.induction === 'twin-turbo'
        ? state.twinSecondaryActive
            ? snapshot.secondaryBoostRatio >= SECONDARY_EXIT_THRESHOLD
            : snapshot.secondaryBoostRatio >= SECONDARY_ENTER_THRESHOLD
        : false;

    // Initial state establishes thresholds without manufacturing an event at spawn.
    if (!previous) {
        return {
            ...state,
            activeEvent: null,
            activeEventRemainingSec: 0,
            events: [],
            liftArmed,
            previous: snapshot,
            singleKickArmed,
            singleKickCooldownSec: cooldown,
            twinSecondaryActive,
        };
    }

    const eventTypes: PowertrainEventType[] = [];
    if (!previous.fuelCutActive && snapshot.fuelCutActive) eventTypes.push('fuel-cut');
    if (previous.gearIndex !== snapshot.gearIndex) eventTypes.push('shift');
    if (snapshot.induction === 'single-turbo' && singleKickArmed && cooldown === 0 &&
        previous.totalBoostRatio < KICK_THRESHOLD && snapshot.totalBoostRatio >= KICK_THRESHOLD &&
        snapshot.totalBoostRatio > previous.totalBoostRatio && snapshot.throttle >= 0.25 && snapshot.shiftCutRatio <= 0.001) {
        eventTypes.push('single-kick');
    }
    if (snapshot.induction === 'twin-turbo' && !state.twinSecondaryActive && twinSecondaryActive) {
        eventTypes.push('twin-stage');
    }
    if (liftArmed && previous.totalBoostRatio >= LIFT_MIN_BOOST && previous.throttle >= 0.25 &&
        snapshot.throttle < 0.1 && snapshot.shiftCutRatio <= 0.001) {
        eventTypes.push('lift');
    }

    const events = eventTypes.map((type, index) => ({ sequence: state.sequence + index + 1, type }));
    const activeEvent = events[0] ?? (activeEventRemainingSec > 0 ? state.activeEvent : null);
    const eventStarted = events.length > 0;
    return {
        ...state,
        activeEvent,
        activeEventRemainingSec: eventStarted ? EVENT_HOLD_SECONDS : activeEventRemainingSec,
        events,
        liftArmed: eventTypes.includes('lift') ? false : liftArmed,
        previous: snapshot,
        sequence: state.sequence + events.length,
        singleKickArmed: eventTypes.includes('single-kick') ? false : singleKickArmed,
        singleKickCooldownSec: eventTypes.includes('single-kick') ? 0.5 : cooldown,
        twinSecondaryActive,
    };
}

export function createPowertrainSnapshot(
    induction: EngineInduction,
    player: {
        boostRatio: number;
        fuelCutActive: boolean;
        gearIndex: number;
        primaryBoostRatio: number;
        rpm: number;
        secondaryBoostRatio: number;
        shiftCutRatio: number;
    },
    throttle: number,
): PowertrainSnapshot {
    return {
        fuelCutActive: player.fuelCutActive,
        gearIndex: player.gearIndex,
        induction,
        primaryBoostRatio: player.primaryBoostRatio,
        rpm: player.rpm,
        secondaryBoostRatio: player.secondaryBoostRatio,
        shiftCutRatio: player.shiftCutRatio,
        throttle: Math.max(0, Math.min(1, throttle)),
        totalBoostRatio: player.boostRatio,
    };
}
