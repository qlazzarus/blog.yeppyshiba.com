import assert from 'node:assert/strict';

import {
    DEBUG_STARTING_RESOURCE,
    SINGLE_PLAYER_OWNER_ID,
    resolveStartSession,
} from '../games/chicken-farm/src/game/startSessionConfig';

const normal = resolveStartSession();
assert.deepEqual(normal, {
    debugEconomy: false,
    difficulty: 'normal',
    ownerPlayerId: SINGLE_PLAYER_OWNER_ID,
    startId: 3,
    startingGold: 1500,
    startingLumber: 0,
    startingSupplyCap: 3,
    startingSupplyUsed: 0,
});

const easy = resolveStartSession({ difficulty: 'easy', startId: 7 });
assert.equal(easy.startId, 7);
assert.equal(easy.ownerPlayerId, SINGLE_PLAYER_OWNER_ID);
assert.equal(easy.startingGold, 1700);
assert.equal(easy.startingLumber, 0);
assert.equal(easy.startingSupplyCap, 3);

const debug = resolveStartSession({ debugEconomy: true, difficulty: 'easy' });
assert.equal(debug.difficulty, 'easy');
assert.equal(debug.startingGold, DEBUG_STARTING_RESOURCE);
assert.equal(debug.startingLumber, DEBUG_STARTING_RESOURCE);
assert.equal(debug.startingSupplyCap, DEBUG_STARTING_RESOURCE);
assert.equal(debug.startingSupplyUsed, 0);

assert.throws(() => resolveStartSession({ startId: 0 }), /startId must be a positive integer/);
assert.throws(
    () => resolveStartSession({ difficulty: 'missing' as never }),
    /Unsupported difficulty/,
);

console.log(
    JSON.stringify({
        assertions: 13,
        defaultStart: normal.startId,
        ownerPlayerId: normal.ownerPlayerId,
        pass: true,
    }),
);
