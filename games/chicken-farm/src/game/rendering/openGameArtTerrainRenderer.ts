import Phaser from 'phaser';

const DIRT_SOURCE_FRAME = { x: 8, y: 8 } as const;
const GRASS_SOURCE_FRAME = { x: 8, y: 8 } as const;
const SOURCE_TILE_SIZE = 8;
const TERRAIN_TEXTURE_KEY = 'opengameart-theness-terrain-tiles';

type OpenGameArtTerrainConfig = {
    readonly dirtTextureKey: string;
    readonly map: Phaser.Tilemaps.Tilemap;
    readonly scene: Phaser.Scene;
    readonly worldObjects: Phaser.GameObjects.GameObject[];
    readonly worldScale: number;
    readonly grassTextureKey: string;
};

/**
 * Renders only the visual ground from TheNess' CC0 grass/dirt set.
 *
 * The original Tiled map stays authoritative for object locations and pathing.
 * It was authored against a different atlas, so its two ground GIDs are mapped
 * to this small dedicated atlas instead of replacing the Kenney PNG in-place.
 */
export function createOpenGameArtTerrainLayer(config: OpenGameArtTerrainConfig) {
    const sourceGroundLayer = config.map.getLayer('ground')?.tilemapLayer;
    if (!sourceGroundLayer) {
        throw new Error('Missing ground tile layer');
    }

    const terrainMap = config.scene.make.tilemap({
        data: sourceGroundLayer.data.map((row) =>
            row.map((tile) => (tile.index === 24 ? 1 : 0)),
        ),
        tileHeight: SOURCE_TILE_SIZE,
        tileWidth: SOURCE_TILE_SIZE,
    });
    const terrainTexture = createTerrainTexture(config);
    const terrainTileset = terrainMap.addTilesetImage(
        TERRAIN_TEXTURE_KEY,
        TERRAIN_TEXTURE_KEY,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
    );

    if (!terrainTileset) {
        throw new Error('Missing OpenGameArt terrain tileset');
    }

    const terrainLayer = terrainMap.createLayer(0, terrainTileset, 0, 0);
    if (!terrainLayer) {
        throw new Error('Failed to create OpenGameArt terrain layer');
    }

    terrainLayer
        .setDepth(0)
        .setScale(config.worldScale * (config.map.tileWidth / SOURCE_TILE_SIZE));
    config.worldObjects.push(terrainLayer);

    return terrainLayer;
}

function createTerrainTexture(config: OpenGameArtTerrainConfig) {
    const existing = config.scene.textures.get(TERRAIN_TEXTURE_KEY);
    if (existing.key !== '__MISSING') return existing;

    const texture = config.scene.textures.createCanvas(
        TERRAIN_TEXTURE_KEY,
        SOURCE_TILE_SIZE * 2,
        SOURCE_TILE_SIZE,
    );
    const context = texture.context;
    context.imageSmoothingEnabled = false;
    drawSourceFrame(
        context,
        config.scene.textures.get(config.grassTextureKey).getSourceImage(),
        GRASS_SOURCE_FRAME,
        0,
    );
    drawSourceFrame(
        context,
        config.scene.textures.get(config.dirtTextureKey).getSourceImage(),
        DIRT_SOURCE_FRAME,
        SOURCE_TILE_SIZE,
    );
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();

    return texture;
}

function drawSourceFrame(
    context: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceFrame: { readonly x: number; readonly y: number },
    destinationX: number,
) {
    context.drawImage(
        source,
        sourceFrame.x,
        sourceFrame.y,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        destinationX,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
    );
}
