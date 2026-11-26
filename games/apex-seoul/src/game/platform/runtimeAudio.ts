import { DrivingSfxConsumer, type DrivingSfxFrame, type DrivingSfxSnapshot } from './drivingSfx';
import { EngineAudio } from './engineAudio';
import type { PowertrainSnapshot } from '../powertrainFeedback';
import { type GameSettings, type GameSettingsStore } from './gameSettings';

export type AudioBus = 'master' | 'sfx' | 'music';
export interface AudioBackend {
    setGain(bus: AudioBus, value: number): void;
    updateEngine?(snapshot: Readonly<PowertrainSnapshot>): void;
    // Optional until approved SFX recordings are available. Calls are never queued.
    updateEffects?(frame: DrivingSfxFrame): void;
    unlock(): Promise<void>;
    close(): Promise<void>;
}

/** Runtime gain graph and continuous drivetrain voices. */
export class WebAudioBackend implements AudioBackend {
    private engine: EngineAudio | null = null;
    readonly context = new AudioContext();
    readonly buses = {
        master: this.context.createGain(),
        sfx: this.context.createGain(),
        music: this.context.createGain(),
    };

    constructor() {
        this.buses.master.gain.value = 0;
        this.buses.sfx.connect(this.buses.master);
        this.buses.music.connect(this.buses.master);
        this.buses.master.connect(this.context.destination);
    }

    setGain(bus: AudioBus, value: number) { this.buses[bus].gain.value = value; }
    updateEngine(snapshot: Readonly<PowertrainSnapshot>) {
        if (this.engine?.induction !== snapshot.induction) {
            this.engine?.destroy();
            this.engine = new EngineAudio(this.context, this.buses.sfx, snapshot.induction);
        }
        this.engine.update(snapshot);
    }
    unlock() { return this.context.resume(); }
    async close() {
        this.engine?.destroy();
        this.engine = null;
        for (const node of Object.values(this.buses)) node.disconnect();
        await this.context.close();
    }
}

export type AudioEnvironment = {
    gestures: EventTarget;
    visibility: EventTarget;
    hidden: () => boolean;
};

/** A scene owns one adapter. Every async completion is scoped to its backend. */
export class RuntimeAudio {
    private backend: AudioBackend | null = null;
    private readonly effects = new DrivingSfxConsumer();
    private engineSnapshot: PowertrainSnapshot | null = null;
    private pending: Promise<boolean> | null = null;
    private unlocked = false;
    private destroyed = false;
    private finished = false;
    private muted = false;
    private readonly pauses = new Set<string>();
    private settings: GameSettings;
    private readonly unsubscribe: () => void;
    private readonly onGesture = () => { void this.unlock(); };
    private readonly onVisibility = () => this.setPaused('hidden', this.environment.hidden());
    private readonly onBlur = () => this.setPaused('focus', true);
    private readonly onFocus = () => this.setPaused('focus', false);

    constructor(
        store: GameSettingsStore,
        private readonly createBackend: () => AudioBackend = () => new WebAudioBackend(),
        private readonly environment: AudioEnvironment = {
            gestures: window, visibility: document, hidden: () => document.hidden,
        },
    ) {
        this.settings = store.getSettings();
        this.unsubscribe = store.subscribe(settings => {
            this.settings = settings;
            this.applyGains();
        });
        environment.gestures.addEventListener('pointerdown', this.onGesture);
        environment.gestures.addEventListener('keydown', this.onGesture);
        environment.gestures.addEventListener('blur', this.onBlur);
        environment.gestures.addEventListener('focus', this.onFocus);
        environment.visibility.addEventListener('visibilitychange', this.onVisibility);
        this.onVisibility();
    }

    unlock(): Promise<boolean> {
        if (this.destroyed || this.finished) return Promise.resolve(false);
        if (this.pending) return this.pending;
        if (this.unlocked) return Promise.resolve(true);
        try {
            this.backend ??= this.createBackend();
            const backend = this.backend;
            this.applyGains();
            if (this.engineSnapshot) this.updateEngine(this.engineSnapshot);
            // Call resume synchronously inside the user gesture.
            const pending = backend.unlock().then(() => {
                if (this.backend !== backend || this.destroyed) return false;
                this.unlocked = true;
                this.applyGains();
                return true;
            }).catch(() => false).finally(() => {
                if (this.pending === pending) this.pending = null;
            });
            this.pending = pending;
            return pending;
        } catch {
            return Promise.resolve(false);
        }
    }

    updateEngine(snapshot: Readonly<PowertrainSnapshot>) {
        if (this.destroyed || this.finished) return;
        this.engineSnapshot = { ...snapshot };
        try { this.backend?.updateEngine?.(this.engineSnapshot); }
        catch { /* Synthesis failure leaves the simulation running. */ }
    }

    updateEffects(snapshot: Readonly<DrivingSfxSnapshot>) {
        if (this.destroyed || this.finished) return;
        const audible = this.unlocked && !this.muted && this.pauses.size === 0 &&
            this.settings.masterVolume > 0 && this.settings.sfxVolume > 0;
        const frame = this.effects.consume(snapshot, audible);
        try { this.backend?.updateEffects?.(frame); }
        catch { /* Missing or failed effects must not interrupt driving. */ }
    }

    resetEffects() {
        this.effects.reset();
        try { this.backend?.updateEffects?.({ oneShots: [], tireGain: 0 }); }
        catch { /* Keep recovery usable when an effects backend fails. */ }
    }

    setMuted(muted: boolean) { this.muted = muted; this.applyGains(); }
    setPaused(reason: string, paused: boolean) {
        if (paused) this.pauses.add(reason);
        else this.pauses.delete(reason);
        this.applyGains();
    }
    finish() { this.finished = true; this.releaseBackend(); }
    retry() {
        if (this.destroyed) return;
        this.releaseBackend();
        this.finished = false;
    }
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.unsubscribe();
        this.environment.gestures.removeEventListener('pointerdown', this.onGesture);
        this.environment.gestures.removeEventListener('keydown', this.onGesture);
        this.environment.gestures.removeEventListener('blur', this.onBlur);
        this.environment.gestures.removeEventListener('focus', this.onFocus);
        this.environment.visibility.removeEventListener('visibilitychange', this.onVisibility);
        this.releaseBackend();
    }

    private applyGains() {
        if (!this.backend) return;
        try {
            const silent = !this.unlocked || this.muted || this.finished || this.destroyed || this.pauses.size > 0;
            this.backend.setGain('master', silent ? 0 : this.settings.masterVolume / 100);
            this.backend.setGain('sfx', this.settings.sfxVolume / 100);
            this.backend.setGain('music', this.settings.musicVolume / 100);
            if (silent || this.settings.masterVolume === 0 || this.settings.sfxVolume === 0) {
                this.backend.updateEffects?.({ oneShots: [], tireGain: 0 });
            }
        } catch { /* Audio failure must not interrupt the driving loop. */ }
    }

    private releaseBackend() {
        const backend = this.backend;
        this.unlocked = false;
        this.applyGains();
        this.backend = null;
        this.engineSnapshot = null;
        this.effects.reset();
        this.pending = null;
        try { void backend?.close().catch(() => {}); }
        catch { /* Unsupported or closed audio contexts remain silent. */ }
    }
}
