export type TilePoint = {
    x: number;
    y: number;
};

export type EntityId = number;

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export type PositionComponent = TilePoint;

export type TileComponent = {
    revealed: boolean;
};

export type RenderComponent = {
    order: number;
    screenX: number;
    screenY: number;
};

export type WorldResources = {
    gameStatus: GameStatus;
    hoveredTile: TilePoint | null;
    minefieldReady: boolean;
};

export type World = {
    adjacentMineCounts: Map<EntityId, number>;
    flags: Set<EntityId>;
    mines: Set<EntityId>;
    nextEntityId: EntityId;
    positions: Map<EntityId, PositionComponent>;
    renders: Map<EntityId, RenderComponent>;
    resources: WorldResources;
    tileEntities: Map<string, EntityId>;
    tiles: Map<EntityId, TileComponent>;
};

export function createWorld(): World {
    return {
        adjacentMineCounts: new Map(),
        flags: new Set(),
        mines: new Set(),
        nextEntityId: 1,
        positions: new Map(),
        renders: new Map(),
        resources: {
            gameStatus: 'ready',
            hoveredTile: null,
            minefieldReady: false,
        },
        tileEntities: new Map(),
        tiles: new Map(),
    };
}

export function createTileEntity(
    world: World,
    position: PositionComponent,
    render: RenderComponent,
) {
    const entityId = world.nextEntityId;

    world.nextEntityId += 1;
    world.positions.set(entityId, position);
    world.tileEntities.set(getTileKey(position), entityId);
    world.tiles.set(entityId, { revealed: false });
    world.renders.set(entityId, render);

    return entityId;
}

export function getTileKey(tile: TilePoint) {
    return `${tile.x},${tile.y}`;
}

export function getEntityAtTile(world: World, tile: TilePoint) {
    return world.tileEntities.get(getTileKey(tile)) ?? null;
}

export function getRenderableEntities(world: World) {
    return [...world.renders.entries()]
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([entityId]) => entityId);
}

export function sameTile(a: TilePoint | null, b: TilePoint | null) {
    return a?.x === b?.x && a?.y === b?.y;
}
