import {
    applyRuntimeQaOverridesToState,
    serializeRuntimeQaCamera,
    serializeRuntimeQaPhysicsRoad,
    serializeRuntimeQaPlayer,
    serializeRuntimeQaRun,
} from '../src/game/runtimeQaState';

const camera = {
    fovDegrees: 70,
    height: 980,
    horizonRatio: 0.38,
    lateralOffset: 12,
    pitch: -0.04,
    z: 42,
};
const player = { lateralOffset: 0, speed: 0, steering: 0, steeringVelocity: 7 };

applyRuntimeQaOverridesToState({
    camera,
    normalizeZ: (z) => z % 1000,
    overrides: {
        enabled: true,
        freeze: false,
        initialSpeed: null,
        initialZ: null,
        lateralOffset: 14.5,
        speed: 321.25,
        steering: -0.4,
        timeScale: 1,
        z: 1042,
    },
    player,
});

const results = [
    check('qa-overrides-mutate-only-approved-fields',
        camera.z === 42 && player.speed === 321.25 && player.steering === -0.4 &&
        player.steeringVelocity === 0 && player.lateralOffset === 14.5),
    check('camera-schema-and-rounding', JSON.stringify(serializeRuntimeQaCamera({
        camera,
        fovCueDegrees: 1.23456,
        manualPitch: 0.125,
        shake: { x: 0.12394, y: -0.98764 },
        terrainPitch: -0.25,
    })) === JSON.stringify({
        fovDegrees: 70,
        fovCueDegrees: 1.2346,
        height: 980,
        horizonRatio: 0.38,
        lateralOffset: 12,
        manualPitch: 0.125,
        pitch: -0.04,
        terrainPitch: -0.25,
        shake: { x: 0.124, y: -0.988 },
        z: 42,
    })),
    check('road-schema-and-rounding', JSON.stringify(serializeRuntimeQaPhysicsRoad({
        baseRenderCurve: 0.123456,
        cameraZ: 12.3456,
        contactZ: 9.8765,
        currentCurve: -0.123456,
        pavedHalfWidth: 456.7896,
        railCenterLimit: 567.8916,
    })) === JSON.stringify({
        baseRenderCurve: 0.1235,
        cameraZ: 12.346,
        contactZ: 9.877,
        currentCurve: -0.1235,
        pavedHalfWidth: 456.79,
        railCenterLimit: 567.892,
    })),
    check('run-null-and-rounding-contract', JSON.stringify(serializeRuntimeQaRun({
        checkpointIndex: 1,
        countdownRemainingSec: 0,
        elapsedSec: 4.56789,
        finishTimeSec: null,
        progressRatio: 0.123456,
        started: true,
    })) === JSON.stringify({
        checkpointIndex: 1,
        countdownRemainingSec: 0,
        elapsedSec: 4.568,
        finishTimeSec: null,
        progressRatio: 0.1235,
        started: true,
    })),
    check('player-contract-is-a-detached-snapshot', (() => {
        const source = {
            cornerDemand: { targetSpeed: 450 },
            cornerSpeedLoss: { totalForce: 3 },
            speedHandling: { lateralAuthority: 0.7 },
            speed: 123,
        };
        const snapshot = serializeRuntimeQaPlayer(source);
        source.cornerDemand.targetSpeed = 999;
        return snapshot !== source && snapshot.cornerDemand.targetSpeed === 450;
    })()),
];
const failures = results.filter((result) => !result.pass);

console.log(JSON.stringify({ pass: failures.length === 0, results }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function check(id: string, pass: boolean) {
    return { id, pass };
}
