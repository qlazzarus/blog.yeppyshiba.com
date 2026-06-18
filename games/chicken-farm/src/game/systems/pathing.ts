export type GridPathPoint = {
    readonly x: number;
    readonly y: number;
};

export type GridPathRect = {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
};

export type FindGridPathOptions = {
    readonly blockedRects: readonly GridPathRect[];
    readonly bounds: GridPathRect;
    readonly cellSize: number;
    readonly clearancePx?: number;
    readonly goal: GridPathPoint;
    readonly maxIterations?: number;
    readonly start: GridPathPoint;
};

type GridCell = {
    readonly x: number;
    readonly y: number;
};

type SearchNode = GridCell & {
    readonly f: number;
    readonly g: number;
    readonly key: string;
    readonly parentKey?: string;
};

export function findGridPath(
    options: FindGridPathOptions,
): readonly GridPathPoint[] | null {
    const gridWidth = Math.max(1, Math.ceil(options.bounds.width / options.cellSize));
    const gridHeight = Math.max(1, Math.ceil(options.bounds.height / options.cellSize));
    const start = worldToCell(
        options.start,
        options.bounds,
        options.cellSize,
        gridWidth,
        gridHeight,
    );
    const goal = worldToCell(
        options.goal,
        options.bounds,
        options.cellSize,
        gridWidth,
        gridHeight,
    );
    const startKey = cellKey(start);
    const goalKey = cellKey(goal);
    const maxIterations = options.maxIterations ?? gridWidth * gridHeight;
    const open = new Map<string, SearchNode>();
    const closed = new Set<string>();
    const best = new Map<string, SearchNode>();

    const startNode: SearchNode = {
        ...start,
        f: heuristic(start, goal),
        g: 0,
        key: startKey,
    };
    open.set(startKey, startNode);
    best.set(startKey, startNode);

    let iterations = 0;

    while (open.size > 0 && iterations < maxIterations) {
        iterations += 1;
        const current = getLowestF(open);
        open.delete(current.key);
        closed.add(current.key);

        if (current.key === goalKey) {
            return reconstructPath(current, best, options.bounds, options.cellSize);
        }

        for (const neighbor of getNeighbors(current, gridWidth, gridHeight)) {
            const key = cellKey(neighbor);
            if (closed.has(key)) continue;
            if (
                key !== goalKey &&
                key !== startKey &&
                isBlockedCell(neighbor, options, gridWidth, gridHeight)
            ) {
                continue;
            }

            const g = current.g + movementCost(current, neighbor);
            const previous = best.get(key);
            if (previous && g >= previous.g) continue;

            const node: SearchNode = {
                ...neighbor,
                f: g + heuristic(neighbor, goal),
                g,
                key,
                parentKey: current.key,
            };
            best.set(key, node);
            open.set(key, node);
        }
    }

    return null;
}

function worldToCell(
    point: GridPathPoint,
    bounds: GridPathRect,
    cellSize: number,
    gridWidth: number,
    gridHeight: number,
): GridCell {
    return {
        x: clamp(Math.floor((point.x - bounds.x) / cellSize), 0, gridWidth - 1),
        y: clamp(Math.floor((point.y - bounds.y) / cellSize), 0, gridHeight - 1),
    };
}

function cellCenter(
    cell: GridCell,
    bounds: GridPathRect,
    cellSize: number,
): GridPathPoint {
    return {
        x: bounds.x + cell.x * cellSize + cellSize / 2,
        y: bounds.y + cell.y * cellSize + cellSize / 2,
    };
}

function isBlockedCell(
    cell: GridCell,
    options: FindGridPathOptions,
    _gridWidth: number,
    _gridHeight: number,
) {
    const center = cellCenter(cell, options.bounds, options.cellSize);
    const clearance = options.clearancePx ?? 0;

    return options.blockedRects.some((rect) => {
        const minX = rect.x - clearance;
        const minY = rect.y - clearance;
        const maxX = rect.x + rect.width + clearance;
        const maxY = rect.y + rect.height + clearance;

        return (
            center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY
        );
    });
}

function getNeighbors(
    cell: GridCell,
    gridWidth: number,
    gridHeight: number,
): readonly GridCell[] {
    const candidates = [
        { x: cell.x + 1, y: cell.y },
        { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x + 1, y: cell.y + 1 },
        { x: cell.x - 1, y: cell.y + 1 },
        { x: cell.x + 1, y: cell.y - 1 },
        { x: cell.x - 1, y: cell.y - 1 },
    ];

    return candidates.filter(
        (candidate) =>
            candidate.x >= 0 &&
            candidate.y >= 0 &&
            candidate.x < gridWidth &&
            candidate.y < gridHeight,
    );
}

function getLowestF(open: Map<string, SearchNode>): SearchNode {
    let best: SearchNode | undefined;

    open.forEach((node) => {
        if (!best || node.f < best.f || (node.f === best.f && node.g < best.g)) {
            best = node;
        }
    });

    if (!best) throw new Error('A* open set unexpectedly empty');
    return best;
}

function reconstructPath(
    goal: SearchNode,
    nodes: Map<string, SearchNode>,
    bounds: GridPathRect,
    cellSize: number,
): readonly GridPathPoint[] {
    const cells: GridCell[] = [];
    let current: SearchNode | undefined = goal;

    while (current) {
        cells.push(current);
        current = current.parentKey ? nodes.get(current.parentKey) : undefined;
    }

    return cells
        .reverse()
        .slice(1)
        .map((cell) => cellCenter(cell, bounds, cellSize));
}

function heuristic(a: GridCell, b: GridCell) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function movementCost(a: GridCell, b: GridCell) {
    return a.x !== b.x && a.y !== b.y ? 1.4 : 1;
}

function cellKey(cell: GridCell) {
    return `${cell.x},${cell.y}`;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
