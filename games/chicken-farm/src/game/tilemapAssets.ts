export type ChickenFarmTilemapAsset = {
    readonly defaultCameraSpeedPxPerSec: number;
    readonly defaultScale: number;
    readonly defaultViewportHeight: number;
    readonly defaultViewportWidth: number;
    readonly key: string;
    readonly license: 'CC0';
    readonly mapPath: string;
    readonly sourceName: string;
    readonly sourceUrl: string;
    readonly tileHeight: number;
    readonly tilesetImagePath: string;
    readonly tileWidth: number;
    readonly wpmPathingGridPath: string;
};

const gameAssetBasePath = import.meta.env.BASE_URL;

export const CHICKEN_FARM_TILEMAP_POC_01: ChickenFarmTilemapAsset = {
    defaultCameraSpeedPxPerSec: 440,
    defaultScale: 2,
    defaultViewportHeight: 540,
    defaultViewportWidth: 960,
    key: 'chicken-farm-poc-01',
    license: 'CC0',
    mapPath: `${gameAssetBasePath}tilemaps/chicken_farm_poc_01.json`,
    sourceName: 'Kenney Tiny Town',
    sourceUrl: 'https://kenney.nl/assets/tiny-town',
    tileHeight: 16,
    tilesetImagePath: `${gameAssetBasePath}tilesets/kenney-tiny-town/tilemap_packed.png`,
    tileWidth: 16,
    wpmPathingGridPath: `${gameAssetBasePath}data/wpm_pathing_grid.json`,
};
