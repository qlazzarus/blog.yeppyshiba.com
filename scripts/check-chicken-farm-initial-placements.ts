import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    INITIAL_PLACEMENT_MANIFEST,
    PHASER_WORLD_ORIGIN_FROM_W3X,
    w3xPositionToPhaserWorld,
} from '../games/chicken-farm/src/game/initialPlacementManifest';

type SourceRow = {
    readonly category: string;
    readonly owner: string;
    readonly rawcode: string;
    readonly x: number;
    readonly y: number;
};

type TilemapObject = {
    readonly height: number;
    readonly name: string;
    readonly type: string;
    readonly width: number;
    readonly x: number;
    readonly y: number;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(
    rootDir,
    'docs/chicken_farm/chicken_farm_w3x_artifacts/key_unit_placement_reference.tsv',
);
const tilemapPath = path.join(
    rootDir,
    'games/chicken-farm/assets/tilemaps/chicken_farm_poc_01.json',
);
const SOURCE_CATEGORY_BY_ROLE = {
    ancient_wolf_stone: 'ancient_wolf_stone',
    central_event_npc: 'central_event_npc',
    central_market: 'central_market',
    central_merchant: 'central_merchant',
    neutral_spider: 'neutral_spider',
    wolf_stone: 'wolf_stone',
} as const;

async function main() {
    const [sourceText, tilemapText] = await Promise.all([
        readFile(sourcePath, 'utf8'),
        readFile(tilemapPath, 'utf8'),
    ]);
    const sourceRows = parseSourceRows(sourceText);
    const tilemapObjects = parseTilemapObjects(tilemapText);

    assert.equal(INITIAL_PLACEMENT_MANIFEST.length, 25);
    assert.equal(new Set(INITIAL_PLACEMENT_MANIFEST.map((placement) => placement.id)).size, 25);

    const expectedCounts = {
        ancient_wolf_stone: 1,
        central_event_npc: 1,
        central_market: 1,
        central_merchant: 1,
        neutral_spider: 8,
        wolf_stone: 13,
    } as const;
    for (const [role, expected] of Object.entries(expectedCounts)) {
        assert.equal(
            INITIAL_PLACEMENT_MANIFEST.filter((placement) => placement.role === role).length,
            expected,
            `Unexpected ${role} count`,
        );
    }

    const sourceByCategory = new Map<string, SourceRow[]>();
    for (const row of sourceRows) {
        const rows = sourceByCategory.get(row.category) ?? [];
        rows.push(row);
        sourceByCategory.set(row.category, rows);
    }
    const tilemapByName = new Map(tilemapObjects.map((object) => [object.name, object]));

    const sourceIndexByCategory = new Map<string, number>();
    for (const placement of INITIAL_PLACEMENT_MANIFEST) {
        const category = SOURCE_CATEGORY_BY_ROLE[placement.role];
        const sourceIndex = sourceIndexByCategory.get(category) ?? 0;
        const source = sourceByCategory.get(category)?.[sourceIndex];
        assert.ok(source, `Missing source row for ${placement.id}`);
        sourceIndexByCategory.set(category, sourceIndex + 1);
        assert.equal(source.rawcode, placement.rawcode, `${placement.id} rawcode`);
        assert.equal(source.owner, placement.owner, `${placement.id} owner`);
        assert.deepEqual(
            { x: source.x, y: source.y },
            placement.sourcePosition,
            `${placement.id} source position`,
        );

        const object = tilemapByName.get(placement.id);
        assert.ok(object, `Missing tilemap object for ${placement.id}`);
        assert.equal(object.type, placement.role, `${placement.id} tilemap role`);
        const worldPosition = {
            x: object.x * 2 + object.width,
            y: object.y * 2 + object.height,
        };
        assert.deepEqual(worldPosition, placement.worldPosition, `${placement.id} world position`);
        assert.deepEqual(
            {
                x: worldPosition.x - PHASER_WORLD_ORIGIN_FROM_W3X.x,
                y: worldPosition.y - PHASER_WORLD_ORIGIN_FROM_W3X.y,
            },
            placement.tilemapPosition,
            `${placement.id} tilemap position`,
        );
        assert.deepEqual(
            w3xPositionToPhaserWorld(placement.tilemapPosition),
            placement.worldPosition,
            `${placement.id} W3X to world conversion`,
        );
        assert.ok(
            Math.abs(placement.sourcePosition.x - placement.tilemapPosition.x) <= 1.5 &&
                Math.abs(placement.sourcePosition.y - placement.tilemapPosition.y) <= 1.5,
            `${placement.id} exceeds tilemap rounding tolerance`,
        );
    }

    const market = INITIAL_PLACEMENT_MANIFEST.find(
        (placement) => placement.id === 'central_market_n006',
    );
    assert.deepEqual(market?.sourcePosition, { x: 1984, y: -2688 });
    assert.deepEqual(market?.worldPosition, { x: 4992, y: 4768 });

    console.log(
        JSON.stringify({
            assertions: 260,
            marketWorldPosition: market?.worldPosition,
            pass: true,
            placements: INITIAL_PLACEMENT_MANIFEST.length,
        }),
    );
}

function parseSourceRows(text: string): SourceRow[] {
    return text
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => line.split('\t'))
        .map(([category, rawcode, _name, owner, x, y]) => ({
            category,
            owner,
            rawcode,
            x: Number(x),
            y: Number(y),
        }));
}

function parseTilemapObjects(text: string): TilemapObject[] {
    const tilemap = JSON.parse(text) as {
        layers: readonly { readonly name?: string; readonly objects?: TilemapObject[] }[];
    };
    return tilemap.layers.find((layer) => layer.name === 'spawns')?.objects ?? [];
}

void main();
