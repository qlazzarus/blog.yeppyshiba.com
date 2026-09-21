import assert from 'node:assert/strict';
import { GAME_SETTINGS_KEY, GameSettingsStore } from '../src/game/gameSettings';

class MemoryStorage {
    private values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
const store = new GameSettingsStore(() => storage);
assert.equal(store.getSettings().debugMode, false);
assert.equal(store.update({ controlScheme: 'motion', debugMode: true, steeringSensitivity: 73 }), 'saved');
assert.deepEqual(new GameSettingsStore(() => storage).getSettings(), {
    controlScheme: 'motion', debugMode: true, masterVolume: 80, musicVolume: 65,
    reducedMotion: false, sfxVolume: 85, steeringSensitivity: 73,
});
storage.setItem(GAME_SETTINGS_KEY, JSON.stringify({ schemaVersion: 2 }));
assert.equal(new GameSettingsStore(() => storage).update({ debugMode: true }), 'unsupported-version');
console.log('PASS: game settings persist debug mode and retain safe defaults');
