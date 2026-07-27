import {
    beginLaunch,
    createLaunchControlState,
    updateLaunchControl,
    updatePreLaunchRev,
    type LaunchControlConfig,
} from '../src/game/launchControl';
import { getLaunchRuntimeQaState } from '../src/game/launchRuntimeQa';

const FRAME_SECONDS = 1 / 60;
const CONFIG: LaunchControlConfig = {
    burnoutDurationSec: { hooked: 0.28, overrev: 0.35 },
    forceDurationSec: 0.55,
    forceMaxSpeedKmh: 45,
    hookedForceBonus: 0.1,
    hookedRpm: [5800, 6600],
    idleRpm: 1100,
    limiterRpm: 6400,
    overrevForceBonus: 0.02,
    overrevRpm: 6800,
    revReleaseResponse: 8,
    revResponse: 9,
};

const results = [
    auditNoThrottle(),
    auditHeldLimiter(),
    auditReleaseBeforeGo(),
    auditOverrev(),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function auditNoThrottle() {
    const state = createLaunchControlState();
    updatePreLaunchRev(state, false, 3, CONFIG);
    beginLaunch(state, false, CONFIG);
    const snapshot = getLaunchRuntimeQaState(state);

    return check('no-throttle-cold', state.quality === 'cold' && state.forceRatio === 0 &&
        state.burnoutRemainingSec === 0 && snapshot.startRpm === CONFIG.idleRpm, snapshot);
}

function auditHeldLimiter() {
    const state = createLaunchControlState();
    for (let frame = 0; frame < 180; frame += 1) {
        updatePreLaunchRev(state, true, FRAME_SECONDS, CONFIG);
    }
    beginLaunch(state, true, CONFIG);
    const startSnapshot = getLaunchRuntimeQaState(state);
    const firstMultiplier = updateLaunchControl(state, true, 0, FRAME_SECONDS, CONFIG);
    const highSpeedMultiplier = updateLaunchControl(state, true, 50, FRAME_SECONDS, CONFIG);

    return check('held-limiter-hooked', state.quality === 'hooked' &&
        startSnapshot.startRpm !== null &&
        startSnapshot.startRpm >= CONFIG.hookedRpm[0] &&
        startSnapshot.startRpm <= CONFIG.hookedRpm[1] &&
        firstMultiplier > 1 &&
        highSpeedMultiplier === 1,
    { firstMultiplier, highSpeedMultiplier, startSnapshot });
}

function auditReleaseBeforeGo() {
    const state = createLaunchControlState();
    for (let frame = 0; frame < 180; frame += 1) {
        updatePreLaunchRev(state, true, FRAME_SECONDS, CONFIG);
    }
    beginLaunch(state, false, CONFIG);

    return check('release-before-go-cold', state.quality === 'cold' &&
        state.forceRatio === 0 && state.burnoutRemainingSec === 0, getLaunchRuntimeQaState(state));
}

function auditOverrev() {
    const state = createLaunchControlState();
    state.startRpm = 7000;
    beginLaunch(state, true, CONFIG);
    const multiplier = updateLaunchControl(state, true, 0, FRAME_SECONDS, CONFIG);

    return check('overrev-flashy-not-faster', state.quality === 'overrev' &&
        state.burnoutRemainingSec > CONFIG.burnoutDurationSec.hooked &&
        multiplier > 1 && multiplier < 1 + CONFIG.hookedForceBonus,
    { multiplier, snapshot: getLaunchRuntimeQaState(state) });
}

function check(id: string, pass: boolean, detail: unknown) {
    return { detail, id, pass };
}
