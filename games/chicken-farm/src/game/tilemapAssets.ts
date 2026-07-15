export type ChickenFarmTilemapAsset = {
    readonly defaultCameraSpeedPxPerSec: number;
    readonly defaultScale: number;
    readonly defaultViewportHeight: number;
    readonly defaultViewportWidth: number;
    readonly key: string;
    readonly license: 'CC0';
    readonly mapPath: string;
    readonly groundSource: {
        readonly dirtImagePath: string;
        readonly grassImagePath: string;
        readonly license: 'CC0';
        readonly name: string;
        readonly url: string;
    };
    readonly mapSource: {
        readonly name: string;
        readonly url: string;
    };
    readonly tileHeight: number;
    readonly tilesetImagePath: string;
    readonly tileWidth: number;
    readonly wpmPathingGridPath: string;
};

const gameAssetBasePath = import.meta.env.BASE_URL;

export const CHICKEN_FARM_TILEMAP_POC_01: ChickenFarmTilemapAsset = {
    //defaultCameraSpeedPxPerSec: 440,
    defaultCameraSpeedPxPerSec: 440 * 3,
    defaultScale: 2,
    defaultViewportHeight: 540,
    defaultViewportWidth: 960,
    key: 'chicken-farm-poc-01',
    license: 'CC0',
    mapPath: `${gameAssetBasePath}tilemaps/chicken_farm_poc_01.json`,
    groundSource: {
        dirtImagePath: `${gameAssetBasePath}tilesets/opengameart-theness/dirt.png`,
        grassImagePath: `${gameAssetBasePath}tilesets/opengameart-theness/forest.png`,
        license: 'CC0',
        name: 'Grass and dirt tileset (Warcraft II style) by TheNess',
        url: 'https://opengameart.org/content/grass-and-dirt-tileset-warcraft-ii-style',
    },
    mapSource: {
        name: 'Kenney Tiny Town',
        url: 'https://kenney.nl/assets/tiny-town',
    },
    tileHeight: 16,
    tilesetImagePath: `${gameAssetBasePath}tilesets/kenney-tiny-town/tilemap_packed.png`,
    tileWidth: 16,
    wpmPathingGridPath: `${gameAssetBasePath}data/wpm_pathing_grid.json`,
};
