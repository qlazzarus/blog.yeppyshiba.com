import Phaser from 'phaser';
import farCityParallaxUrl from '../../assets/environment/approved/parallax-v1/city-far-blueblack.png';
import farCityLightsUrl from '../../assets/environment/approved/parallax-v1/city-far-lights-bluewhite.png';
import cloudDarkBlueUrl from '../../assets/environment/approved/parallax-v1/cloud-dark-blue.png';
import moonCoolBlueUrl from '../../assets/environment/approved/parallax-v1/moon-cool-blue.png';
import nearRidgeParallaxUrl from '../../assets/environment/approved/parallax-v1/ridge-near-blueblack.png';
import burnoutPuffAUrl from '../../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-a.png';
import burnoutPuffBUrl from '../../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-b.png';
import burnoutPuffCUrl from '../../assets/effects/approved/kenney-smoke-particle-assets/burnout-puff-c.png';
import wallForestTree01Url from '../../assets/environment/approved/wall-forest-svg/tree-01-tall-pine.svg?no-inline';
import wallForestTree02Url from '../../assets/environment/approved/wall-forest-svg/tree-02-wide-pine.svg?no-inline';
import wallForestTree03Url from '../../assets/environment/approved/wall-forest-svg/tree-03-cypress.svg?no-inline';
import wallForestTree04Url from '../../assets/environment/approved/wall-forest-svg/tree-04-leaning-pine.svg?no-inline';
import wallForestTree05Url from '../../assets/environment/approved/wall-forest-svg/tree-05-broadleaf.svg?no-inline';
import genesisG70VehicleShadowSpriteUrl from '../../assets/vehicles/approved/sprites/genesis-g70-poc-128-shadow.png';
import genesisG70VehicleSpriteUrl from '../../assets/vehicles/approved/sprites/genesis-g70-poc-128.png';
import ft86RetroBlackVehicleSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-black-alpha.png';
import ft86RetroBlueVehicleSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-blue-alpha.png';
import ft86RetroRedVehicleSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-red-alpha.png';
import ft86RetroShadowSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha-shadow.png';
import ft86RetroSilverVehicleSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png';
import ft86RetroYellowVehicleSpriteUrl from '../../assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-yellow-alpha.png';
import ravenCoupePreview256ShadowSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-preview-256/shadow-256.png';
import ravenCoupePreview256SpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-preview-256/sheet-256.png';
import ravenCoupePreview192ShadowSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-192-blue/shadow-192.png';
import ravenCoupePreview192SpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-192-blue/sheet-192.png';
import ravenCoupeBlack192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/processed/black-192/sheet-192.png';
import ravenCoupeBlue192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/processed/blue-192/sheet-192.png';
import ravenCoupeRed192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/processed/red-192/sheet-192.png';
import ravenCoupeSilver192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/raven-coupe/processed/silver-192/sheet-192.png';
import seorinGtPreview192ShadowSpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/runtime-192-blue/shadow-192.png';
import seorinGtPreview192SpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/runtime-192-blue/sheet-192.png';
import miraeGtPreview192ShadowSpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/runtime-192-blue/shadow-192.png';
import miraeGtPreview192SpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/runtime-192-blue/sheet-192.png';
import miraeGtBlack192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/processed/black-192/sheet-192.png';
import miraeGtBlue192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/processed/blue-192/sheet-192.png';
import miraeGtRed192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/processed/red-192/sheet-192.png';
import miraeGtSilver192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/mirae-gt/processed/silver-192/sheet-192.png';
import seorinGtBlack192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/processed/black-192/sheet-192.png';
import seorinGtBlue192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/processed/blue-192/sheet-192.png';
import seorinGtRed192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/processed/red-192/sheet-192.png';
import seorinGtSilver192VehicleSpriteUrl from '../../assets/vehicles/generated/7way-candidates/seorin-gt/processed/silver-192/sheet-192.png';
import mainMenuHeroUrl from '../../assets/ui/main-menu/apex-seoul-night-garage-hero.webp';

export {
    ft86RetroShadowSpriteUrl,
    genesisG70VehicleShadowSpriteUrl, genesisG70VehicleSpriteUrl,
    miraeGtPreview192ShadowSpriteUrl, miraeGtPreview192SpriteUrl,
    ravenCoupePreview192ShadowSpriteUrl, ravenCoupePreview192SpriteUrl,
    ravenCoupePreview256ShadowSpriteUrl, ravenCoupePreview256SpriteUrl,
    seorinGtPreview192ShadowSpriteUrl, seorinGtPreview192SpriteUrl,
};

export const CITY_FAR_PARALLAX_KEY = 'city-far-parallax';
export const CITY_FAR_LIGHTS_KEY = 'city-far-lights';
export const CITY_RIDGE_PARALLAX_KEY = 'city-ridge-parallax';
export const CLOUD_DARK_BLUE_KEY = 'cloud-dark-blue';
export const MOON_COOL_BLUE_KEY = 'moon-cool-blue';
export const MAIN_MENU_HERO_KEY = 'main-menu-night-garage-hero';
export const BURNOUT_PUFF_KEYS = ['burnout-puff-a', 'burnout-puff-b', 'burnout-puff-c'] as const;
export const WALL_FOREST_TREE_KEYS = [
    'wall-forest-tree-01', 'wall-forest-tree-02', 'wall-forest-tree-03', 'wall-forest-tree-04', 'wall-forest-tree-05',
] as const;

export const FT86_RETRO_SPRITE_URLS: Record<string, string> = {
    black: ft86RetroBlackVehicleSpriteUrl, blue: ft86RetroBlueVehicleSpriteUrl,
    red: ft86RetroRedVehicleSpriteUrl, silver: ft86RetroSilverVehicleSpriteUrl, yellow: ft86RetroYellowVehicleSpriteUrl,
};
export const RAVEN_COUPE_SPRITE_URLS: Record<string, string> = {
    black: ravenCoupeBlack192VehicleSpriteUrl, blue: ravenCoupeBlue192VehicleSpriteUrl,
    red: ravenCoupeRed192VehicleSpriteUrl, silver: ravenCoupeSilver192VehicleSpriteUrl,
};
export const SEORIN_GT_SPRITE_URLS: Record<string, string> = {
    black: seorinGtBlack192VehicleSpriteUrl, blue: seorinGtBlue192VehicleSpriteUrl,
    red: seorinGtRed192VehicleSpriteUrl, silver: seorinGtSilver192VehicleSpriteUrl,
};
export const MIRAE_GT_SPRITE_URLS: Record<string, string> = {
    black: miraeGtBlack192VehicleSpriteUrl, blue: miraeGtBlue192VehicleSpriteUrl,
    red: miraeGtRed192VehicleSpriteUrl, silver: miraeGtSilver192VehicleSpriteUrl,
};

type StartupAsset =
    | { key: string; kind: 'image' | 'svg'; url: string }
    | { frameSize: number; key: string; kind: 'spritesheet'; url: string };

const startupAssets: readonly StartupAsset[] = [
    { kind: 'image', key: CITY_FAR_PARALLAX_KEY, url: farCityParallaxUrl },
    { kind: 'image', key: CITY_FAR_LIGHTS_KEY, url: farCityLightsUrl },
    { kind: 'image', key: CLOUD_DARK_BLUE_KEY, url: cloudDarkBlueUrl },
    { kind: 'image', key: MOON_COOL_BLUE_KEY, url: moonCoolBlueUrl },
    { kind: 'image', key: MAIN_MENU_HERO_KEY, url: mainMenuHeroUrl },
    { kind: 'image', key: CITY_RIDGE_PARALLAX_KEY, url: nearRidgeParallaxUrl },
    { kind: 'image', key: BURNOUT_PUFF_KEYS[0], url: burnoutPuffAUrl },
    { kind: 'image', key: BURNOUT_PUFF_KEYS[1], url: burnoutPuffBUrl },
    { kind: 'image', key: BURNOUT_PUFF_KEYS[2], url: burnoutPuffCUrl },
    { kind: 'svg', key: WALL_FOREST_TREE_KEYS[0], url: wallForestTree01Url },
    { kind: 'svg', key: WALL_FOREST_TREE_KEYS[1], url: wallForestTree02Url },
    { kind: 'svg', key: WALL_FOREST_TREE_KEYS[2], url: wallForestTree03Url },
    { kind: 'svg', key: WALL_FOREST_TREE_KEYS[3], url: wallForestTree04Url },
    { kind: 'svg', key: WALL_FOREST_TREE_KEYS[4], url: wallForestTree05Url },
    ...Object.entries(FT86_RETRO_SPRITE_URLS).map(([color, url]) => ({ kind: 'spritesheet' as const, key: `player-vehicle-ft86-retro-${color}`, url, frameSize: 256 })),
    { kind: 'spritesheet', key: 'player-vehicle-ft86-retro-shadow', url: ft86RetroShadowSpriteUrl, frameSize: 256 },
    ...Object.entries(RAVEN_COUPE_SPRITE_URLS).map(([color, url]) => ({ kind: 'spritesheet' as const, key: `player-vehicle-raven-coupe-${color}`, url, frameSize: 192 })),
    { kind: 'spritesheet', key: 'player-vehicle-raven-coupe-shadow', url: ravenCoupePreview192ShadowSpriteUrl, frameSize: 192 },
    ...Object.entries(SEORIN_GT_SPRITE_URLS).map(([color, url]) => ({ kind: 'spritesheet' as const, key: `player-vehicle-seorin-gt-${color}`, url, frameSize: 192 })),
    { kind: 'spritesheet', key: 'player-vehicle-seorin-gt-shadow', url: seorinGtPreview192ShadowSpriteUrl, frameSize: 192 },
    ...Object.entries(MIRAE_GT_SPRITE_URLS).map(([color, url]) => ({ kind: 'spritesheet' as const, key: `player-vehicle-mirae-gt-${color}`, url, frameSize: 192 })),
    { kind: 'spritesheet', key: 'player-vehicle-mirae-gt-shadow', url: miraeGtPreview192ShadowSpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-raven-coupe-192-preview', url: ravenCoupePreview192SpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-raven-coupe-192-preview-shadow', url: ravenCoupePreview192ShadowSpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-raven-coupe-256-preview', url: ravenCoupePreview256SpriteUrl, frameSize: 256 },
    { kind: 'spritesheet', key: 'player-vehicle-raven-coupe-256-preview-shadow', url: ravenCoupePreview256ShadowSpriteUrl, frameSize: 256 },
    { kind: 'spritesheet', key: 'player-vehicle-seorin-gt-192-preview', url: seorinGtPreview192SpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-seorin-gt-192-preview-shadow', url: seorinGtPreview192ShadowSpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-mirae-gt-192-preview', url: miraeGtPreview192SpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-mirae-gt-192-preview-shadow', url: miraeGtPreview192ShadowSpriteUrl, frameSize: 192 },
    { kind: 'spritesheet', key: 'player-vehicle-genesis-g70-poc', url: genesisG70VehicleSpriteUrl, frameSize: 128 },
    { kind: 'spritesheet', key: 'player-vehicle-genesis-g70-poc-shadow', url: genesisG70VehicleShadowSpriteUrl, frameSize: 128 },
];

export function getStartupAssetCount() { return startupAssets.length; }

export function queueStartupAssets(loader: Phaser.Loader.LoaderPlugin) {
    for (const asset of startupAssets) {
        if (asset.kind === 'spritesheet') loader.spritesheet(asset.key, asset.url, { frameWidth: asset.frameSize, frameHeight: asset.frameSize });
        else if (asset.kind === 'svg') loader.svg(asset.key, asset.url);
        else loader.image(asset.key, asset.url);
    }
}
