import { APEX_S_ENGINE_PROFILE, RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile';
import { selectRuntimeVehicleAsset } from '../src/game/vehicleCatalog';
import type { VehicleCatalogAssets } from '../src/game/vehicleCatalog';

const assets: VehicleCatalogAssets = {
    ft86: {
        atlas: {} as VehicleCatalogAssets['ft86']['atlas'],
        colors: { black: 'ft86-black.png', blue: 'ft86-blue.png' },
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: 'ft86-shadow.png',
    },
    ravenCoupe: {
        atlas: {} as VehicleCatalogAssets['ft86']['atlas'],
        colors: { black: 'raven-black.png', blue: 'raven-blue.png', red: 'raven-red.png', silver: 'raven-silver.png' },
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: 'raven-shadow.png',
    },
    ravenCoupePreview256: {
        atlas: {} as VehicleCatalogAssets['ft86']['atlas'],
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: 'raven-preview-shadow.png',
        spriteUrl: 'raven-preview.png',
    },
    ravenCoupePreview192: {
        atlas: {} as VehicleCatalogAssets['ft86']['atlas'],
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: 'raven-preview-192-shadow.png',
        spriteUrl: 'raven-preview-192.png',
    },
    genesis: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        engineProfile: APEX_S_ENGINE_PROFILE,
        shadowSpriteUrl: 'genesis-shadow.png',
        spriteUrl: 'genesis.png',
    },
};

const blueFallback = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=ft86-retro&vehicleColor=purple'), assets);
const blackFt86 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=ft86-retro&vehicleColor=black'), assets);
const blueRaven = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe&vehicleColor=blue'), assets);
const fallbackRaven = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe&vehicleColor=yellow'), assets);
const ravenPreview256 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe-256-preview'), assets);
const ravenPreview192 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe-192-preview'), assets);
const genesis = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=anything-else'), assets);
const results = [
    check('ft86-invalid-color-falls-back-to-blue', blueFallback.id === 'ft86-retro' && blueFallback.color === 'blue' && blueFallback.spriteUrl === 'ft86-blue.png'),
    check('ft86-valid-color-preserves-engine-and-texture-key', blackFt86.color === 'black' && blackFt86.engineProfile.id === RAVEN_COUPE_ENGINE_PROFILE.id && blackFt86.textureKey === 'player-vehicle-ft86-retro-black'),
    check('raven-coupe-selects-its-own-128px-sprite-and-shadow', blueRaven.id === 'raven-coupe' && blueRaven.color === 'blue' && blueRaven.spriteUrl === 'raven-blue.png' && blueRaven.shadowSpriteUrl === 'raven-shadow.png' && blueRaven.textureKey === 'player-vehicle-raven-coupe-blue'),
    check('raven-invalid-color-falls-back-to-blue', fallbackRaven.color === 'blue' && fallbackRaven.spriteUrl === 'raven-blue.png'),
    check('raven-256-preview-selects-a-single-temporary-beauty-sheet', ravenPreview256.id === 'raven-coupe-256-preview' && ravenPreview256.color === 'beauty-preview' && ravenPreview256.spriteUrl === 'raven-preview.png' && ravenPreview256.shadowSpriteUrl === 'raven-preview-shadow.png'),
    check('raven-192-preview-selects-the-intermediate-beauty-sheet', ravenPreview192.id === 'raven-coupe-192-preview' && ravenPreview192.spriteUrl === 'raven-preview-192.png' && ravenPreview192.shadowSpriteUrl === 'raven-preview-192-shadow.png'),
    check('unknown-vehicle-falls-back-to-genesis', genesis.id === 'genesis-g70-poc' && genesis.color === 'silver' && genesis.engineProfile.id === APEX_S_ENGINE_PROFILE.id && genesis.textureKey === 'player-vehicle-genesis-g70-poc'),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function check(id: string, pass: boolean) { return { id, pass }; }
