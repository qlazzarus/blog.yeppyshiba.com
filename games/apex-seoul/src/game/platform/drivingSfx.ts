import type { PowertrainEvent, PowertrainEventType } from '../powertrainFeedback';

export type DrivingSfxSnapshot = {
    runId: string;
    sequence: number;
    events: readonly PowertrainEvent[];
    speed: number;
    slipAngle: number;
    tireContact: boolean;
    guardrailContactActive: boolean;
    guardrailContactPhase: 'clear' | 'enter' | 'stay' | 'exit';
    guardrailImpactCount: number;
    guardrailImpactCue: number;
};
export type DrivingSfxFrame = {
    oneShots: { type: PowertrainEventType | 'guardrail-impact'; gain: number }[];
    tireGain: number;
};
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Consumes events even while inaudible, so unlock/resume never replays them. */
export class DrivingSfxConsumer {
    private runId: string | null = null;
    private sequence = 0;
    private impacts = 0;

    reset() { this.runId = null; }

    consume(snapshot: Readonly<DrivingSfxSnapshot>, audible: boolean): DrivingSfxFrame {
        const oneShots: DrivingSfxFrame['oneShots'] = [];
        const initial = this.runId !== snapshot.runId;
        if (!initial && audible) {
            const seen = new Set<number>();
            for (const event of snapshot.events) {
                if (event.sequence > this.sequence && event.sequence <= snapshot.sequence && !seen.has(event.sequence)) {
                    oneShots.push({ type: event.type, gain: 1 });
                    seen.add(event.sequence);
                }
            }
            if (snapshot.guardrailContactActive && snapshot.guardrailContactPhase === 'enter' &&
                snapshot.guardrailImpactCount > this.impacts && snapshot.speed > 0) {
                const gain = unit(snapshot.guardrailImpactCue);
                if (gain > 0) oneShots.push({ type: 'guardrail-impact', gain });
            }
        }
        this.runId = snapshot.runId;
        this.sequence = initial ? snapshot.sequence : Math.max(this.sequence, snapshot.sequence);
        this.impacts = initial ? snapshot.guardrailImpactCount : Math.max(this.impacts, snapshot.guardrailImpactCount);
        // These scales affect only presentation gain. Road-bound simulation supplies contact.
        const tireGain = audible && snapshot.tireContact && snapshot.speed > 0
            ? unit(Math.abs(snapshot.slipAngle)) * unit(snapshot.speed / 100) : 0;
        return { oneShots, tireGain };
    }
}
