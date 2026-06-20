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
    readonly pathSmoothingEnabled?: boolean;
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
            const rawPath = reconstructPath(
                current,
                best,
                options.bounds,
                options.cellSize,
            );
            if (options.pathSmoothingEnabled === false) return rawPath;
            return smoothPath(options.start, rawPath, options);
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
        return isPointInsideExpandedRect(center, rect, clearance);
    });
}

function smoothPath(
    start: GridPathPoint,
    path: readonly GridPathPoint[],
    options: FindGridPathOptions,
): readonly GridPathPoint[] {
    if (path.length <= 2) return path;

    const points = [start, ...path];
    const smoothed: GridPathPoint[] = [];
    let anchorIndex = 0;

    while (anchorIndex < points.length - 1) {
        let nextIndex = points.length - 1;

        while (
            nextIndex > anchorIndex + 1 &&
            !hasLineOfSight(points[anchorIndex], points[nextIndex], options)
        ) {
            nextIndex -= 1;
        }

        smoothed.push(points[nextIndex]);
        anchorIndex = nextIndex;
    }

    return smoothed;
}

function hasLineOfSight(
    from: GridPathPoint,
    to: GridPathPoint,
    options: FindGridPathOptions,
) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const sampleStep = options.cellSize / 2;
    const steps = Math.max(1, Math.ceil(distance / sampleStep));

    for (let step = 1; step < steps; step += 1) {
        const ratio = step / steps;
        const point = {
            x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio,
        };

        if (isBlockedPoint(point, options)) return false;
    }

    return true;
}

function isBlockedPoint(point: GridPathPoint, options: FindGridPathOptions) {
    const clearance = options.clearancePx ?? 0;

    return options.blockedRects.some((rect) =>
        isPointInsideExpandedRect(point, rect, clearance),
    );
}

function isPointInsideExpandedRect(
    point: GridPathPoint,
    rect: GridPathRect,
    clearance: number,
) {
    const minX = rect.x - clearance;
    const minY = rect.y - clearance;
    const maxX = rect.x + rect.width + clearance;
    const maxY = rect.y + rect.height + clearance;

    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
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
