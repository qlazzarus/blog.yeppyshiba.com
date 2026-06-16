import type { TilePoint, World } from '../ecs/world';
import type { BoardLayout } from '../game/config';
import { getEntityAtTile, sameTile } from '../ecs/world';

export type GameActionResult = {
    changed: boolean;
    statusChanged: boolean;
};

export function revealTileSystem(
    world: World,
    tile: TilePoint,
    layout: BoardLayout,
    random: () => number = Math.random,
): GameActionResult {
    if (world.resources.gameStatus === 'lost' || world.resources.gameStatus === 'won') {
        return unchanged();
    }

    const entityId = getEntityAtTile(world, tile);
    if (!entityId || world.flags.has(entityId)) return unchanged();

    const tileState = world.tiles.get(entityId);
    if (!tileState || tileState.revealed) return unchanged();

    if (!world.resources.minefieldReady) {
        placeMinesAfterFirstClickSystem(world, layout, tile, random);
        calculateAdjacentMineCountsSystem(world, layout);
        world.resources.minefieldReady = true;
        world.resources.gameStatus = 'playing';
    }

    if (world.mines.has(entityId)) {
        tileState.revealed = true;
        world.resources.gameStatus = 'lost';
        revealAllMines(world);
        return { changed: true, statusChanged: true };
    }

    const adjacentMineCount = world.adjacentMineCounts.get(entityId) ?? 0;

    if (adjacentMineCount === 0) {
        revealConnectedSafeTiles(world, tile, layout);
    } else {
        tileState.revealed = true;
    }

    if (hasWon(world)) {
        world.resources.gameStatus = 'won';
        return { changed: true, statusChanged: true };
    }

    return { changed: true, statusChanged: false };
}

export function getMinesLeft(world: World, layout: BoardLayout) {
    return Math.max(0, layout.mineCount - world.flags.size);
}

export function toggleFlagSystem(world: World, tile: TilePoint): GameActionResult {
    if (world.resources.gameStatus === 'lost' || world.resources.gameStatus === 'won') {
        return unchanged();
    }

    const entityId = getEntityAtTile(world, tile);
    if (!entityId) return unchanged();

    const tileState = world.tiles.get(entityId);
    if (!tileState || tileState.revealed) return unchanged();

    if (world.flags.has(entityId)) {
        world.flags.delete(entityId);
    } else {
        world.flags.add(entityId);
    }

    return { changed: true, statusChanged: false };
}

function placeMinesAfterFirstClickSystem(
    world: World,
    layout: BoardLayout,
    firstClick: TilePoint,
    random: () => number,
) {
    const safeTiles = new Set(
        [firstClick, ...getNeighborTiles(firstClick, layout)].map((tile) => `${tile.x},${tile.y}`),
    );
    const candidates = [...world.positions.entries()]
        .filter(([, position]) => !safeTiles.has(`${position.x},${position.y}`))
        .map(([entityId]) => entityId);

    shuffle(candidates, random);

    world.mines.clear();
    candidates.slice(0, layout.mineCount).forEach((entityId) => {
        world.mines.add(entityId);
    });
}

function calculateAdjacentMineCountsSystem(world: World, layout: BoardLayout) {
    world.adjacentMineCounts.clear();

    for (const [entityId, position] of world.positions) {
        if (world.mines.has(entityId)) continue;

        const count = getNeighborTiles(position, layout).filter((neighbor) => {
            const neighborEntityId = getEntityAtTile(world, neighbor);

            return neighborEntityId ? world.mines.has(neighborEntityId) : false;
        }).length;

        world.adjacentMineCounts.set(entityId, count);
    }
}

function getNeighborTiles(tile: TilePoint, layout: BoardLayout) {
    const neighbors: TilePoint[] = [];

    for (let y = tile.y - 1; y <= tile.y + 1; y += 1) {
        for (let x = tile.x - 1; x <= tile.x + 1; x += 1) {
            if (sameTile(tile, { x, y })) continue;
            if (x < 0 || y < 0 || x >= layout.boardWidth || y >= layout.boardHeight) continue;

            neighbors.push({ x, y });
        }
    }

    return neighbors;
}

function revealConnectedSafeTiles(world: World, startTile: TilePoint, layout: BoardLayout) {
    const queue = [startTile];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const tile = queue.shift();
        if (!tile) continue;

        const tileKey = `${tile.x},${tile.y}`;
        if (visited.has(tileKey)) continue;
        visited.add(tileKey);

        const entityId = getEntityAtTile(world, tile);
        if (!entityId || world.flags.has(entityId) || world.mines.has(entityId)) continue;

        const tileState = world.tiles.get(entityId);
        if (!tileState || tileState.revealed) continue;

        tileState.revealed = true;

        const adjacentMineCount = world.adjacentMineCounts.get(entityId) ?? 0;
        if (adjacentMineCount > 0) continue;

        getNeighborTiles(tile, layout).forEach((neighbor) => {
            queue.push(neighbor);
        });
    }
}

function revealAllMines(world: World) {
    for (const entityId of world.mines) {
        const tileState = world.tiles.get(entityId);
        if (tileState) tileState.revealed = true;
    }
}

function hasWon(world: World) {
    for (const [entityId, tileState] of world.tiles) {
        if (!world.mines.has(entityId) && !tileState.revealed) return false;
    }

    return true;
}

function shuffle<T>(items: T[], random: () => number) {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        const current = items[index];

        items[index] = items[swapIndex];
        items[swapIndex] = current;
    }
}

function unchanged(): GameActionResult {
    return {
        changed: false,
        statusChanged: false,
    };
}
