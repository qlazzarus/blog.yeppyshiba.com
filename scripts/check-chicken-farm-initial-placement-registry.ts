import assert from 'node:assert/strict';

import { INITIAL_PLACEMENT_MANIFEST } from '../games/chicken-farm/src/game/initialPlacementManifest';
import { InitialPlacementRegistry } from '../games/chicken-farm/src/game/systems/initialPlacementRegistry';

const registry = new InitialPlacementRegistry();

assert.equal(registry.size, 0);
assert.equal(registry.initialize(INITIAL_PLACEMENT_MANIFEST), 25);
assert.equal(registry.size, 25);
assert.equal(registry.initialize(INITIAL_PLACEMENT_MANIFEST), 0);
assert.equal(registry.size, 25);

const market = registry.get('central_market_n006');
assert.deepEqual(market, {
    id: 'central_market_n006',
    owner: 'Player(PLAYER_NEUTRAL_PASSIVE)',
    rawcode: 'n006',
    role: 'central_market',
    sourcePosition: { x: 1984, y: -2688 },
    worldPosition: { x: 4992, y: 4768 },
});
assert.equal(registry.list().length, 25);

const removed = registry.remove('spider_01');
assert.equal(removed?.rawcode, 'n01D');
assert.equal(registry.get('spider_01'), null);
assert.equal(registry.size, 24);
assert.equal(registry.remove('missing'), null);
assert.equal(registry.clear(), 24);
assert.equal(registry.clear(), 0);
assert.equal(registry.size, 0);
assert.equal(registry.initialize(INITIAL_PLACEMENT_MANIFEST), 25);

assert.throws(
    () => registry.initialize([INITIAL_PLACEMENT_MANIFEST[0], INITIAL_PLACEMENT_MANIFEST[0]]),
    /Duplicate initial placement ID/,
);

console.log(
    JSON.stringify({
        assertions: 16,
        pass: true,
        recreatedCount: registry.size,
    }),
);
