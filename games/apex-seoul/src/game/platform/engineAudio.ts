import type { EngineInduction } from '../engineProfile';
import type { PowertrainSnapshot } from '../powertrainFeedback';

// Waveforms and cylinder pulse ratios originate in engine-sound-lab.
const designs = {
    na: { engine: 'sawtooth', exhaust: 'triangle', divisor: 30, exhaustGain: 0.24, spoolGain: 0 },
    'single-turbo': { engine: 'square', exhaust: 'sawtooth', divisor: 30, exhaustGain: 0.28, spoolGain: 0.22 },
    'twin-turbo': { engine: 'triangle', exhaust: 'sawtooth', divisor: 20, exhaustGain: 0.19, spoolGain: 0.16 },
} as const;
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export function engineAudioTargets(snapshot: Readonly<PowertrainSnapshot>) {
    const design = designs[snapshot.induction];
    const load = unit(snapshot.throttle) * (1 - unit(snapshot.shiftCutRatio)) * (snapshot.fuelCutActive ? 0 : 1);
    const fundamental = Math.max(28, Math.min(16000, Number.isFinite(snapshot.rpm) ? snapshot.rpm : 0) / design.divisor);
    const boosts = snapshot.induction === 'na' ? [] : snapshot.induction === 'single-turbo'
        ? [unit(snapshot.totalBoostRatio)]
        : [unit(snapshot.primaryBoostRatio), unit(snapshot.secondaryBoostRatio)];
    return {
        fundamental,
        engineGain: 0.045 + load * 0.12,
        exhaustGain: design.exhaustGain * (0.3 + load * 0.7),
        spools: boosts.map((boost, index) => ({
            frequency: 900 + index * 650 + boost * 1900,
            gain: design.spoolGain * boost * (0.25 + load * 0.75),
        })),
    };
}

type Voice = { source: OscillatorNode; gain: GainNode };
type Spool = { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode };

/** Continuous synthesis driven exclusively by a detached drivetrain snapshot. */
export class EngineAudio {
    private readonly filter: BiquadFilterNode;
    private readonly voices: Voice[] = [];
    private readonly spools: Spool[] = [];
    private stopped = false;

    constructor(private readonly context: BaseAudioContext, destination: AudioNode, readonly induction: EngineInduction) {
        const design = designs[induction];
        this.filter = context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2200;
        this.filter.Q.value = 0.5;
        this.filter.connect(destination);
        for (const type of [design.engine, design.exhaust]) {
            const source = context.createOscillator();
            const gain = context.createGain();
            gain.gain.value = 0;
            source.type = type;
            source.connect(gain).connect(this.filter);
            source.start();
            this.voices.push({ source, gain });
        }
        const count = induction === 'na' ? 0 : induction === 'single-turbo' ? 1 : 2;
        for (let index = 0; index < count; index++) {
            const source = context.createBufferSource();
            const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
            const samples = buffer.getChannelData(0);
            // Fixed noise permits reproducible listening candidates and offline QA.
            let seed = 17 + index;
            for (let i = 0; i < samples.length; i++) {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                samples[i] = seed / 2147483648 - 1;
            }
            source.buffer = buffer;
            source.loop = true;
            const filter = context.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 1.3;
            const gain = context.createGain();
            gain.gain.value = 0;
            source.connect(filter).connect(gain).connect(destination);
            source.start();
            this.spools.push({ source, filter, gain });
        }
    }

    update(snapshot: Readonly<PowertrainSnapshot>, time = this.context.currentTime) {
        if (this.stopped) return;
        const targets = engineAudioTargets(snapshot);
        this.voices[0].source.frequency.setTargetAtTime(targets.fundamental, time, 0.025);
        this.voices[1].source.frequency.setTargetAtTime(targets.fundamental * 2.01, time, 0.025);
        this.voices[0].gain.gain.setTargetAtTime(targets.engineGain, time, 0.03);
        this.voices[1].gain.gain.setTargetAtTime(targets.exhaustGain, time, 0.03);
        this.spools.forEach((spool, index) => {
            spool.filter.frequency.setTargetAtTime(targets.spools[index].frequency, time, 0.04);
            spool.gain.gain.setTargetAtTime(targets.spools[index].gain, time, 0.04);
        });
    }

    destroy() {
        if (this.stopped) return;
        this.stopped = true;
        for (const voice of [...this.voices, ...this.spools]) {
            voice.source.stop();
            voice.source.disconnect();
            voice.gain.disconnect();
        }
        for (const spool of this.spools) spool.filter.disconnect();
        this.filter.disconnect();
    }
}
