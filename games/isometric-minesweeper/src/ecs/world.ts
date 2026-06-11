export type TilePoint = {
    x: number;
    y: number;
};

export type EntityId = number;

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
    hoveredTile: TilePoint | null;
};

export type World = {
    nextEntityId: EntityId;
    positions: Map<EntityId, PositionComponent>;
    renders: Map<EntityId, RenderComponent>;
    resources: WorldResources;
    tiles: Map<EntityId, TileComponent>;
};

export function createWorld(): World {
    return {
        nextEntityId: 1,
        positions: new Map(),
        renders: new Map(),
        resources: {
            hoveredTile: null,
        },
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
    world.tiles.set(entityId, { revealed: false });
    world.renders.set(entityId, render);

    return entityId;
}

export function getEntityAtTile(world: World, tile: TilePoint) {
    for (const [entityId, position] of world.positions) {
        if (sameTile(position, tile)) return entityId;
    }

    return null;
}

export function getRenderableEntities(world: World) {
    return [...world.renders.entries()]
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([entityId]) => entityId);
}

export function sameTile(a: TilePoint | null, b: TilePoint | null) {
    return a?.x === b?.x && a?.y === b?.y;
}
