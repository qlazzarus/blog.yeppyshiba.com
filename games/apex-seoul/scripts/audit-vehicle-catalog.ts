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
    genesis: {
        atlas: {} as VehicleCatalogAssets['genesis']['atlas'],
        engineProfile: APEX_S_ENGINE_PROFILE,
        shadowSpriteUrl: 'genesis-shadow.png',
        spriteUrl: 'genesis.png',
    },
};

const blueFallback = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=ft86-retro&vehicleColor=purple'), assets);
const blackFt86 = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=ft86-retro&vehicleColor=black'), assets);
const genesis = selectRuntimeVehicleAsset(new URLSearchParams('vehicle=anything-else'), assets);
const results = [
    check('ft86-invalid-color-falls-back-to-blue', blueFallback.id === 'ft86-retro' && blueFallback.color === 'blue' && blueFallback.spriteUrl === 'ft86-blue.png'),
    check('ft86-valid-color-preserves-engine-and-texture-key', blackFt86.color === 'black' && blackFt86.engineProfile.id === RAVEN_COUPE_ENGINE_PROFILE.id && blackFt86.textureKey === 'player-vehicle-ft86-retro-black'),
    check('unknown-vehicle-falls-back-to-genesis', genesis.id === 'genesis-g70-poc' && genesis.color === 'silver' && genesis.engineProfile.id === APEX_S_ENGINE_PROFILE.id && genesis.textureKey === 'player-vehicle-genesis-g70-poc'),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function check(id: string, pass: boolean) { return { id, pass }; }
