export const GAME_SETTINGS_KEY = 'apex-seoul:settings:v1';

export type GameSettings = {
    debugMode: boolean;
    masterVolume: number;
    musicVolume: number;
    reducedMotion: boolean;
    sfxVolume: number;
    steeringSensitivity: number;
    touchControls: boolean;
    vibration: boolean;
};

export type GameSettingsSaveStatus = 'saved' | 'memory-only' | 'unsupported-version';

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type SettingsDocument = GameSettings & { schemaVersion: 1 };

const defaults = (): GameSettings => ({
    debugMode: false,
    masterVolume: 80,
    musicVolume: 65,
    reducedMotion: false,
    sfxVolume: 85,
    steeringSensitivity: 70,
    touchControls: true,
    vibration: true,
});

const range = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
        ? Math.round(Math.min(100, Math.max(0, value)))
        : fallback;

const bool = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;

function normalize(value: unknown): GameSettings {
    const fallback = defaults();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    const source = value as Record<string, unknown>;
    return {
        debugMode: bool(source.debugMode, fallback.debugMode),
        masterVolume: range(source.masterVolume, fallback.masterVolume),
        musicVolume: range(source.musicVolume, fallback.musicVolume),
        reducedMotion: bool(source.reducedMotion, fallback.reducedMotion),
        sfxVolume: range(source.sfxVolume, fallback.sfxVolume),
        steeringSensitivity: range(source.steeringSensitivity, fallback.steeringSensitivity),
        touchControls: bool(source.touchControls, fallback.touchControls),
        vibration: bool(source.vibration, fallback.vibration),
    };
}

/** Browser settings are independent from run records and always have safe defaults. */
export class GameSettingsStore {
    private loaded = false;
    private settings = defaults();
    private status: GameSettingsSaveStatus | null = null;

    constructor(private readonly storage: () => StoragePort = () => window.localStorage) {}

    private ensureLoaded() {
        if (this.loaded) return;
        this.loaded = true;
        try {
            const raw = this.storage().getItem(GAME_SETTINGS_KEY);
            if (!raw) return;
            const document: unknown = JSON.parse(raw);
            if (!document || typeof document !== 'object' || Array.isArray(document)) return;
            if ((document as Record<string, unknown>).schemaVersion !== 1) {
                this.status = 'unsupported-version';
                return;
            }
            this.settings = normalize(document);
        } catch { /* Defaults remain usable when browser storage is unavailable. */ }
    }

    getSettings() {
        this.ensureLoaded();
        return { ...this.settings };
    }

    update(value: Partial<GameSettings>): GameSettingsSaveStatus {
        this.ensureLoaded();
        this.settings = normalize({ ...this.settings, ...value });
        if (this.status === 'unsupported-version') return this.status;
        try {
            const document: SettingsDocument = { schemaVersion: 1, ...this.settings };
            this.storage().setItem(GAME_SETTINGS_KEY, JSON.stringify(document));
            return 'saved';
        } catch {
            return 'memory-only';
        }
    }
}

export const gameSettingsStore = new GameSettingsStore();
