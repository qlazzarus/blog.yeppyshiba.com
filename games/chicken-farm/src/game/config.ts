export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 720;
export const UI_HEIGHT = 180;
export const WORLD_VIEW_HEIGHT = CANVAS_HEIGHT - UI_HEIGHT;
export const TILESET_KEY = 'kenney-tiny-town-tiles';
export const TILEMAP_KEY = 'chicken-farm-poc-01-map';
export const WPM_PATHING_GRID_KEY = 'chicken-farm-wpm-pathing-grid';
export const CAMERA_ZOOM = 0.85;
export const MINIMAP_HEIGHT = 124;
export const MINIMAP_WIDTH = 132;
export const MINIMAP_X = 24;
export const MINIMAP_Y = WORLD_VIEW_HEIGHT + 20;
export const PLAYER_SPEED_PX_PER_SEC = 240 * 2;
export const BUILD_GRID_MAJOR_EVERY = 4;
export const POC_FIXED_PLAYER_SLOT_ID: number | null = 3;

export type VisibilityOverlayConfig = {
    readonly cellSize: number;
    readonly exploredAlpha: number;
    readonly fogColor: number;
    readonly nightAlpha: number;
    readonly nightColor: number;
    readonly revealRadiusPx: number;
    readonly unexploredAlpha: number;
};

export type MarkerStyle = {
    readonly color: number;
    readonly label: string;
    readonly radius: number;
};

export const MARKER_STYLES: Record<string, MarkerStyle> = {
    ancient_wolf_stone: { color: 0x7ed7ff, label: 'AST', radius: 9 },
    boss_spawn: { color: 0xd4b15f, label: 'B', radius: 8 },
    central_event_npc: { color: 0x68d46d, label: 'EV', radius: 7 },
    central_market: { color: 0xf0c65a, label: 'MKT', radius: 9 },
    central_merchant: { color: 0xe6c08a, label: 'SHOP', radius: 7 },
    neutral_spider: { color: 0x8e66d8, label: 'SP', radius: 7 },
    wolf_spawn: { color: 0xd45846, label: 'WF', radius: 7 },
    wolf_spawn_rect: { color: 0xd45846, label: 'WF', radius: 6 },
    wolf_stone: { color: 0x6cc7d8, label: 'STONE', radius: 8 },
};

export const VISIBILITY_OVERLAY: VisibilityOverlayConfig = {
    cellSize: 48,
    exploredAlpha: 0.2,
    fogColor: 0x071107,
    nightAlpha: 0,
    nightColor: 0x0b1530,
    revealRadiusPx: 260,
    unexploredAlpha: 0.62,
};
