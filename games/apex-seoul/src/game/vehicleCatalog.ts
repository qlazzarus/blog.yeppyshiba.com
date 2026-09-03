import type { VehicleEngineProfile } from './engineProfile';
import type { VehicleAtlas } from './vehicle';

export type RuntimeVehicleAsset = {
    atlas: VehicleAtlas;
    color: string;
    engineProfile: VehicleEngineProfile;
    id: string;
    presentationScale: number;
    shadowSpriteUrl: string;
    shadowTextureKey: string;
    spriteUrl: string;
    textureKey: string;
};

export type VehicleCatalogAssets = {
    ft86: PaletteVehicleCatalogAsset;
    ravenCoupe?: PaletteVehicleCatalogAsset;
    ravenCoupePreview192?: StaticVehicleCatalogAsset;
    ravenCoupePreview256?: StaticVehicleCatalogAsset;
    seorinGtPreview192?: StaticVehicleCatalogAsset;
    miraeGtPreview192?: StaticVehicleCatalogAsset;
    genesis: StaticVehicleCatalogAsset;
};

type StaticVehicleCatalogAsset = {
    atlas: VehicleAtlas;
    engineProfile: VehicleEngineProfile;
    presentationScale?: number;
    shadowSpriteUrl: string;
    spriteUrl: string;
};

type PaletteVehicleCatalogAsset = {
    atlas: VehicleAtlas;
    colors: Record<string, string>;
    engineProfile: VehicleEngineProfile;
    presentationScale?: number;
    shadowSpriteUrl: string;
};

function selectPaletteVehicle(
    id: string,
    textureKeyPrefix: string,
    requestedColor: string | null,
    asset: PaletteVehicleCatalogAsset,
): RuntimeVehicleAsset {
    const color = asset.colors[requestedColor ?? 'blue'] ? requestedColor ?? 'blue' : 'blue';
    return {
        atlas: asset.atlas,
        color,
        engineProfile: asset.engineProfile,
        id,
        presentationScale: asset.presentationScale ?? 1,
        shadowSpriteUrl: asset.shadowSpriteUrl,
        shadowTextureKey: `player-vehicle-${textureKeyPrefix}-shadow`,
        spriteUrl: asset.colors[color],
        textureKey: `player-vehicle-${textureKeyPrefix}-${color}`,
    };
}

export function selectRuntimeVehicleAsset(
    params: URLSearchParams,
    assets: VehicleCatalogAssets,
): RuntimeVehicleAsset {
    const vehicleId = params.get('vehicle') ?? 'raven-coupe';
    const requestedColor = params.get('vehicleColor');

    // Keep the legacy FT86 route available for comparison and rollback. Raven Coupe is the default.
    if (vehicleId === 'ft86-retro') {
        return selectPaletteVehicle('ft86-retro', 'ft86-retro', requestedColor, assets.ft86);
    }
    if (vehicleId === 'raven-coupe' && assets.ravenCoupe) {
        return selectPaletteVehicle('raven-coupe', 'raven-coupe', requestedColor, assets.ravenCoupe);
    }
    if (vehicleId === 'raven-coupe-192-preview' && assets.ravenCoupePreview192) {
        return selectStaticVehicle('raven-coupe-192-preview', 'raven-coupe-192-preview', assets.ravenCoupePreview192);
    }
    if (vehicleId === 'raven-coupe-256-preview' && assets.ravenCoupePreview256) {
        return selectStaticVehicle('raven-coupe-256-preview', 'raven-coupe-256-preview', assets.ravenCoupePreview256);
    }
    if (vehicleId === 'seorin-gt-192-preview' && assets.seorinGtPreview192) {
        return selectStaticVehicle('seorin-gt-192-preview', 'seorin-gt-192-preview', assets.seorinGtPreview192);
    }
    if (vehicleId === 'mirae-gt-192-preview' && assets.miraeGtPreview192) {
        return selectStaticVehicle('mirae-gt-192-preview', 'mirae-gt-192-preview', assets.miraeGtPreview192);
    }
    return {
        atlas: assets.genesis.atlas, color: 'silver', engineProfile: assets.genesis.engineProfile,
        id: 'genesis-g70-poc', shadowSpriteUrl: assets.genesis.shadowSpriteUrl,
        presentationScale: assets.genesis.presentationScale ?? 1,
        shadowTextureKey: 'player-vehicle-genesis-g70-poc-shadow', spriteUrl: assets.genesis.spriteUrl,
        textureKey: 'player-vehicle-genesis-g70-poc',
    };
}

function selectStaticVehicle(
    id: string,
    textureKeyPrefix: string,
    asset: StaticVehicleCatalogAsset,
): RuntimeVehicleAsset {
    return {
        atlas: asset.atlas,
        color: 'beauty-preview',
        engineProfile: asset.engineProfile,
        id,
        presentationScale: asset.presentationScale ?? 1,
        shadowSpriteUrl: asset.shadowSpriteUrl,
        shadowTextureKey: `player-vehicle-${textureKeyPrefix}-shadow`,
        spriteUrl: asset.spriteUrl,
        textureKey: `player-vehicle-${textureKeyPrefix}`,
    };
}
