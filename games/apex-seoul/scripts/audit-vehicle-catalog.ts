import { MIRAE_GT_ENGINE_PROFILE, RAVEN_COUPE_ENGINE_PROFILE } from '../src/game/engineProfile';
import { selectRuntimeVehicleAsset } from '../src/game/vehicleCatalog';
import type { VehicleCatalogAssets } from '../src/game/vehicleCatalog';

const assets: VehicleCatalogAssets = {
    ravenCoupe: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        colors: { black: 'raven-black.png', blue: 'raven-blue.png', red: 'raven-red.png', silver: 'raven-silver.png' },
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        presentationScale: 0.97,
        shadowSpriteUrl: 'raven-shadow.png',
    },
    ravenCoupePreview256: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        shadowSpriteUrl: 'raven-preview-shadow.png',
        spriteUrl: 'raven-preview.png',
    },
    ravenCoupePreview192: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        presentationScale: 0.97,
        shadowSpriteUrl: 'raven-preview-192-shadow.png',
        spriteUrl: 'raven-preview-192.png',
    },
    seorinGtPreview192: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'], engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
        presentationScale: 0.97,
        shadowSpriteUrl: 'seorin-preview-192-shadow.png', spriteUrl: 'seorin-preview-192.png',
    },
    miraeGtPreview192: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'], engineProfile: MIRAE_GT_ENGINE_PROFILE,
        presentationScale: 0.97,
        shadowSpriteUrl: 'mirae-preview-192-shadow.png', spriteUrl: 'mirae-preview-192.png',
    },
    genesis: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        engineProfile: MIRAE_GT_ENGINE_PROFILE,
        shadowSpriteUrl: 'genesis-shadow.png',
        spriteUrl: 'genesis.png',
    },
};

const retiredVehicle = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=ft86-retro'), assets);
const blackRaven = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe&vehicleColor=black'), assets);
const defaultRaven = selectRuntimeVehicleAsset(new URLSearchParams(), assets);
const blueRaven = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe&vehicleColor=blue'), assets);
const fallbackRaven = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe&vehicleColor=yellow'), assets);
const ravenPreview256 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe-256-preview'), assets);
const ravenPreview192 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=raven-coupe-192-preview'), assets);
const seorinPreview192 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=seorin-gt-192-preview'), assets);
const miraePreview192 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=mirae-gt-192-preview'), assets);
const genesis = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=anything-else'), assets);
const results = [
    check('retired-vehicle-uses-unknown-vehicle-fallback', retiredVehicle.id === 'genesis-g70-poc'),
    check('raven-valid-color-preserves-engine-and-texture-key', blackRaven.color === 'black' && blackRaven.engineProfile.id === RAVEN_COUPE_ENGINE_PROFILE.id && blackRaven.textureKey === 'player-vehicle-raven-coupe-black'),
    check('default-vehicle-promotes-raven-coupe-with-its-own-7way-asset-key', defaultRaven.id === 'raven-coupe' && defaultRaven.color === 'blue' && defaultRaven.presentationScale === 0.97 && defaultRaven.textureKey === 'player-vehicle-raven-coupe-blue'),
    check('raven-coupe-selects-its-own-192px-sprite-and-shadow', blueRaven.id === 'raven-coupe' && blueRaven.color === 'blue' && blueRaven.spriteUrl === 'raven-blue.png' && blueRaven.shadowSpriteUrl === 'raven-shadow.png' && blueRaven.textureKey === 'player-vehicle-raven-coupe-blue'),
    check('raven-invalid-color-falls-back-to-blue', fallbackRaven.color === 'blue' && fallbackRaven.spriteUrl === 'raven-blue.png'),
    check('raven-256-preview-selects-a-single-temporary-beauty-sheet', ravenPreview256.id === 'raven-coupe-256-preview' && ravenPreview256.color === 'beauty-preview' && ravenPreview256.spriteUrl === 'raven-preview.png' && ravenPreview256.shadowSpriteUrl === 'raven-preview-shadow.png'),
    check('raven-192-preview-selects-the-intermediate-beauty-sheet', ravenPreview192.id === 'raven-coupe-192-preview' && ravenPreview192.presentationScale === 0.97 && ravenPreview192.spriteUrl === 'raven-preview-192.png' && ravenPreview192.shadowSpriteUrl === 'raven-preview-192-shadow.png'),
    check('seorin-192-preview-selects-its-own-sheet', seorinPreview192.id === 'seorin-gt-192-preview' && seorinPreview192.presentationScale === 0.97 && seorinPreview192.spriteUrl === 'seorin-preview-192.png'),
    check('mirae-192-preview-selects-its-own-sheet', miraePreview192.id === 'mirae-gt-192-preview' && miraePreview192.presentationScale === 0.97 && miraePreview192.spriteUrl === 'mirae-preview-192.png'),
    check('unknown-vehicle-falls-back-to-genesis', genesis.id === 'genesis-g70-poc' && genesis.color === 'silver' && genesis.engineProfile.id === MIRAE_GT_ENGINE_PROFILE.id && genesis.textureKey === 'player-vehicle-genesis-g70-poc'),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function check(id: string, pass: boolean) { return { id, pass }; }
