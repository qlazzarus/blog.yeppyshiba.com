export type PlacementPoint = {
    readonly x: number;
    readonly y: number;
};

export type InitialPlacementRole =
    | 'ancient_wolf_stone'
    | 'central_event_npc'
    | 'central_market'
    | 'central_merchant'
    | 'neutral_spider'
    | 'wolf_stone';

export type InitialPlacement = {
    readonly id: string;
    readonly owner: string;
    readonly rawcode: string;
    readonly role: InitialPlacementRole;
    readonly sourcePosition: PlacementPoint;
    readonly tilemapPosition: PlacementPoint;
    readonly worldPosition: PlacementPoint;
};

// The trimmed tilemap's rendered world origin in the W3X coordinate frame.
export const PHASER_WORLD_ORIGIN_FROM_W3X: PlacementPoint = { x: 3008, y: 7456 };

export function w3xPositionToPhaserWorld(position: PlacementPoint): PlacementPoint {
    return {
        x: position.x + PHASER_WORLD_ORIGIN_FROM_W3X.x,
        y: position.y + PHASER_WORLD_ORIGIN_FROM_W3X.y,
    };
}

function placement(
    id: string,
    role: InitialPlacementRole,
    rawcode: string,
    owner: string,
    sourcePosition: PlacementPoint,
    tilemapPosition: PlacementPoint,
): InitialPlacement {
    return {
        id,
        owner,
        rawcode,
        role,
        sourcePosition,
        tilemapPosition,
        worldPosition: w3xPositionToPhaserWorld(tilemapPosition),
    };
}

const WOLF_STONE_OWNER = 'Player(10)';
const NEUTRAL_AGGRESSIVE_OWNER = 'Player(PLAYER_NEUTRAL_AGGRESSIVE)';
const NEUTRAL_PASSIVE_OWNER = 'Player(PLAYER_NEUTRAL_PASSIVE)';

export const INITIAL_PLACEMENT_MANIFEST: readonly InitialPlacement[] = [
    placement('wolf_stone_01', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: -1376, y: -6240 }, { x: -1376, y: -6240 }),
    placement('wolf_stone_02', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 5600, y: -5984 }, { x: 5600, y: -5984 }),
    placement('wolf_stone_03', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: -1632, y: -1760 }, { x: -1632, y: -1760 }),
    placement('wolf_stone_04', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 6688, y: -2016 }, { x: 6688, y: -2016 }),
    placement('wolf_stone_05', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 2464, y: -5984 }, { x: 2464, y: -5984 }),
    placement('wolf_stone_06', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 4384, y: -4832 }, { x: 4384, y: -4832 }),
    placement('wolf_stone_07', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 416, y: -5344 }, { x: 416, y: -5344 }),
    placement('wolf_stone_08', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 2080, y: 992 }, { x: 2080, y: 992 }),
    placement('wolf_stone_09', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: -1440, y: 1056 }, { x: -1440, y: 1056 }),
    placement('wolf_stone_10', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: -1632, y: -4192 }, { x: -1632, y: -4192 }),
    placement('wolf_stone_11', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 4128, y: -1568 }, { x: 4128, y: -1568 }),
    placement('wolf_stone_12', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 224, y: -1120 }, { x: 224, y: -1120 }),
    placement('wolf_stone_13', 'wolf_stone', 'n00D', WOLF_STONE_OWNER, { x: 4896, y: 1184 }, { x: 4896, y: 1184 }),
    placement('ancient_wolf_stone', 'ancient_wolf_stone', 'n017', WOLF_STONE_OWNER, { x: 2112, y: -704 }, { x: 2112, y: -704 }),
    placement('spider_01', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: 6868.3, y: -7342.1 }, { x: 6868, y: -7342 }),
    placement('spider_02', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: 1580.8, y: -7254 }, { x: 1582, y: -7254 }),
    placement('spider_03', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: 6768.1, y: -3275.3 }, { x: 6768, y: -3274 }),
    placement('spider_04', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: 1940.6, y: 2510.2 }, { x: 1942, y: 2510 }),
    placement('spider_05', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: 6890.9, y: 2528.6 }, { x: 6892, y: 2530 }),
    placement('spider_06', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: -2919.7, y: 2647 }, { x: -2920, y: 2648 }),
    placement('spider_07', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: -2775.5, y: -7353 }, { x: -2776, y: -7352 }),
    placement('spider_08', 'neutral_spider', 'n01D', NEUTRAL_AGGRESSIVE_OWNER, { x: -2802.2, y: -2371.2 }, { x: -2802, y: -2370 }),
    placement('central_market_n006', 'central_market', 'n006', NEUTRAL_PASSIVE_OWNER, { x: 1984, y: -2688 }, { x: 1984, y: -2688 }),
    placement('central_merchant_h01R', 'central_merchant', 'h01R', NEUTRAL_PASSIVE_OWNER, { x: 1790.1, y: -2781.4 }, { x: 1790, y: -2782 }),
    placement('central_event_npc_n01J', 'central_event_npc', 'n01J', NEUTRAL_PASSIVE_OWNER, { x: 2036.6, y: -3205.6 }, { x: 2036, y: -3206 }),
];
