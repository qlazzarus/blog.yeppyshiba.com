import { readFile } from 'node:fs/promises';

const atlas = JSON.parse(await readFile(
    new URL('../assets/vehicles/generated/7way-candidates/raven-coupe/runtime-128/runtime-128.atlas.json', import.meta.url),
    'utf8',
));

const levelCases = [
    ['center', 0, 'center', false],
    ['right-slight', 0.15, 'steer-right-0', false],
    ['right-mild', 0.5, 'steer-right-1', false],
    ['right-strong', 1, 'steer-right-2', false],
    ['left-slight', -0.15, 'steer-right-0', true],
] ;
const results = [
    ...levelCases.map(([id, steering, frame, flipX]) => check(
        `level-${id}`,
        equal(selectPlayerVehicleFrame(atlas, steering, 'level', 0.22, true), { frame, flipX }),
    )),
    check('downhill-slight-falls-back-to-centered-art', equal(
        selectPlayerVehicleFrame(atlas, 0.15, 'downhill', 0.22, true),
        { frame: 'downhill-center', flipX: false },
    )),
    check('downhill-left-slight-fallback-does-not-mirror-center', equal(
        selectPlayerVehicleFrame(atlas, -0.15, 'downhill', 0.22, true),
        { frame: 'downhill-center', flipX: false },
    )),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function equal(actual, expected) {
    return actual.frame === expected.frame && actual.flipX === expected.flipX;
}

function check(id, pass) { return { id, pass }; }

function selectPlayerVehicleFrame(atlas, steering, terrainCue, threshold, allowStrongSteering) {
    const state = selectSteeringState(steering, threshold, allowStrongSteering);
    const fallback = atlas.apex.steeringStates[state] ?? atlas.apex.steeringStates.center;
    if (terrainCue === 'level') return fallback;
    const frame = state === 'center' || state.endsWith('-0')
        ? `${terrainCue}-center`
        : state.endsWith('-1') ? `${terrainCue}-right-1` : `${terrainCue}-right-2`;
    if (!atlas.frames[frame]) return fallback;
    return { frame, flipX: !frame.endsWith('-center') && state.startsWith('steer-left') };
}

function selectSteeringState(steering, threshold, allowStrongSteering) {
    const strongThreshold = threshold + (1 - threshold) * 0.62;
    const slightThreshold = threshold * 0.55;
    if (allowStrongSteering && steering <= -strongThreshold) return 'steer-left-2';
    if (allowStrongSteering && steering >= strongThreshold) return 'steer-right-2';
    if (steering <= -threshold) return 'steer-left-1';
    if (steering >= threshold) return 'steer-right-1';
    if (steering <= -slightThreshold) return 'steer-left-0';
    if (steering >= slightThreshold) return 'steer-right-0';
    return 'center';
}
