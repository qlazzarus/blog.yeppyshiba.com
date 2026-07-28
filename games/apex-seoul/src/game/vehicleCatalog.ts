import type { VehicleEngineProfile } from './engineProfile';
import type { VehicleAtlas } from './vehicle';

export type RuntimeVehicleAsset = {
    atlas: VehicleAtlas;
    color: string;
    engineProfile: VehicleEngineProfile;
    id: string;
    shadowSpriteUrl: string;
    shadowTextureKey: string;
    spriteUrl: string;
    textureKey: string;
};

export type VehicleCatalogAssets = {
    ft86: {
        atlas: VehicleAtlas;
        colors: Record<string, string>;
        engineProfile: VehicleEngineProfile;
        shadowSpriteUrl: string;
    };
    genesis: {
        atlas: VehicleAtlas;
        engineProfile: VehicleEngineProfile;
        shadowSpriteUrl: string;
        spriteUrl: string;
    };
};

export function selectRuntimeVehicleAsset(
    params: URLSearchParams,
    assets: VehicleCatalogAssets,
): RuntimeVehicleAsset {
    if ((params.get('vehicle') ?? 'ft86-retro') === 'ft86-retro') {
        const requestedColor = params.get('vehicleColor') ?? 'blue';
        const color = assets.ft86.colors[requestedColor] ? requestedColor : 'blue';

        return {
            atlas: assets.ft86.atlas, color, engineProfile: assets.ft86.engineProfile,
            id: 'ft86-retro', shadowSpriteUrl: assets.ft86.shadowSpriteUrl,
            shadowTextureKey: 'player-vehicle-ft86-retro-shadow',
            spriteUrl: assets.ft86.colors[color], textureKey: `player-vehicle-ft86-retro-${color}`,
        };
    }
    return {
        atlas: assets.genesis.atlas, color: 'silver', engineProfile: assets.genesis.engineProfile,
        id: 'genesis-g70-poc', shadowSpriteUrl: assets.genesis.shadowSpriteUrl,
        shadowTextureKey: 'player-vehicle-genesis-g70-poc-shadow', spriteUrl: assets.genesis.spriteUrl,
        textureKey: 'player-vehicle-genesis-g70-poc',
    };
}
