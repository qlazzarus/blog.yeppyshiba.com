import assert from 'node:assert/strict';
import { GAME_SETTINGS_KEY, GameSettingsStore } from '../src/game/gameSettings';

class MemoryStorage {
    private values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
const store = new GameSettingsStore(() => storage, true);
assert.equal(store.getSettings().debugMode, false);
assert.equal(store.update({ controlScheme: 'motion', debugMode: true, steeringSensitivity: 73 }), 'saved');
assert.deepEqual(new GameSettingsStore(() => storage, true).getSettings(), {
    controlScheme: 'motion', crtEffect: true, debugMode: true, masterVolume: 80, musicVolume: 65,
    reducedMotion: false, sfxVolume: 85, steeringSensitivity: 73,
});
storage.setItem(GAME_SETTINGS_KEY, JSON.stringify({ schemaVersion: 2 }));
assert.equal(new GameSettingsStore(() => storage, true).update({ debugMode: true }), 'unsupported-version');
const legacy = new MemoryStorage();
legacy.setItem('apex-seoul:vhs', 'off');
legacy.setItem(GAME_SETTINGS_KEY, JSON.stringify({ schemaVersion: 1, masterVolume: 55 }));
const migrated = new GameSettingsStore(() => legacy, true);
assert.equal(migrated.getSettings().crtEffect, false);
assert.equal(migrated.getSettings().masterVolume, 55);
assert.equal(migrated.update({ crtEffect: true }), 'saved');
assert.equal(new GameSettingsStore(() => legacy, true).getSettings().crtEffect, true);
assert.equal(migrated.update({ crtEffect: false }), 'saved');
assert.equal(new GameSettingsStore(() => legacy, true).getSettings().crtEffect, false);
const productionStorage = new MemoryStorage();
productionStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify({ schemaVersion: 1, debugMode: true }));
const production = new GameSettingsStore(() => productionStorage, false);
assert.equal(production.getSettings().debugMode, false);
assert.equal(production.update({ debugMode: true }), 'saved');
assert.equal(production.getSettings().debugMode, false);
console.log('PASS: game settings isolate internal debug mode and retain safe defaults');
