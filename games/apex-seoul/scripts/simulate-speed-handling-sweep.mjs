import {
    createDefaultPlayerVehicleState,
    getSpeedHandlingSample,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import { HANDLING_TEST_CONFIG } from './handling-test-config.mjs';

const FRAME_SECONDS = 1 / 60;
const SAMPLE_SPEEDS_KMH = [0, 5, 10, 30, 60, 90, 110, 130, 145, 160, 170, 180, 185];
const CONFIG = {
    ...HANDLING_TEST_CONFIG,
    aeroDrag: 0,
    cornerAccelSpeedDrop: 0,
    cornerSpeedPull: 0,
    engineAcceleration: 0,
    engineBrakeDeceleration: 0,
    rollingResistance: 0,
    steeringSpeedScrub: 0,
};

const rows = SAMPLE_SPEEDS_KMH.map(runSpeedSample);
const bySpeed = new Map(rows.map((row) => [row.speedKmh, row]));
const checks = [];

checks.push(atMost('stationary.holdOffset', bySpeed.get(0).hold.offsetAbs, 0.001));
checks.push(atMost('stationary.visual', bySpeed.get(0).hold.visualMaxAbs, 0.001));
checks.push(between('crawl10.holdOffset', bySpeed.get(10).hold.offsetAbs, 1, 15));
checks.push(between('low30.holdOffset', bySpeed.get(30).hold.offsetAbs, 35, 120));
checks.push(between('grip60.holdOffset', bySpeed.get(60).hold.offsetAbs, 80, 190));
checks.push(atMost('release60.overshoot', bySpeed.get(60).release.overshootAbs, 20));

for (const speedKmh of [110, 130, 145, 160, 170, 180, 185]) {
    const row = bySpeed.get(speedKmh);
    checks.push(atMost(`tap${speedKmh}.onsetMs`, row.tap.visualOnsetMs, 200));
    checks.push(atLeast(`hold${speedKmh}.visual`, row.hold.visualMaxAbs, 0.42));
    checks.push(atMost(`release${speedKmh}.overshoot`, row.release.overshootAbs, 28));
}

checks.push(nonIncreasing(
    'highSpeed.holdOffsetTrend',
    [110, 130, 145, 160, 170, 180, 185].map((speedKmh) => bySpeed.get(speedKmh).hold.offsetAbs),
    12,
));
checks.push(nonIncreasing(
    'highSpeed.holdVelocityTrend',
    [110, 130, 145, 160, 170, 180, 185].map((speedKmh) => bySpeed.get(speedKmh).hold.velocityAbs),
    8,
));

const report = {
    checks,
    pass: checks.every((check) => check.pass),
    rows,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function runSpeedSample(speedKmh) {
    const speed = speedForDisplayKmh(speedKmh);
    const profile = getSpeedHandlingSample(speed / CONFIG.accelSpeed);

    return {
        counterTap: runCounterTap(speed),
        hold: runHold(speed),
        profile: roundObject(profile),
        release: runRelease(speed),
        speedKmh,
        speedRatio: round(speed / CONFIG.accelSpeed, 6),
        tap: runTap(speed),
    };
}

function runTap(speed) {
    const player = createPlayer(speed);
    const samples = simulate(player, speed, 1, (timeSec) => timeSec < 0.15 ? 1 : 0);

    return {
        offsetAbs: round(maxAbs(samples.map((sample) => sample.offset))),
        visualMaxAbs: round(maxAbs(samples.map((sample) => sample.steering)), 4),
        visualOnsetMs: getOnsetMs(samples, (sample) => Math.abs(sample.steering) >= 0.05),
    };
}

function runHold(speed) {
    const player = createPlayer(speed);
    const samples = simulate(player, speed, 1, () => 1);
    const last = samples.at(-1);

    return {
        offsetAbs: round(Math.abs(last.offset)),
        velocityAbs: round(Math.abs(last.velocity)),
        visualMaxAbs: round(maxAbs(samples.map((sample) => sample.steering)), 4),
        visualOnsetMs: getOnsetMs(samples, (sample) => Math.abs(sample.steering) >= 0.05),
    };
}

function runRelease(speed) {
    const player = createPlayer(speed);
    const samples = simulate(player, speed, 2.5, (timeSec) => timeSec < 1 ? 1 : 0);
    const releaseIndex = Math.round(1 / FRAME_SECONDS);
    const after350Index = Math.min(
        samples.length - 1,
        releaseIndex + Math.round(0.35 / FRAME_SECONDS),
    );
    const releaseOffset = samples[releaseIndex]?.offset ?? 0;
    const direction = Math.sign(releaseOffset);
    const postRelease = samples.slice(releaseIndex);
    const overshootAbs = maxAbs(postRelease
        .filter((sample) => Math.sign(sample.offset) === -direction)
        .map((sample) => sample.offset));

    return {
        after350MsOffsetAbs: round(Math.abs(samples[after350Index]?.offset ?? 0)),
        finalOffsetAbs: round(Math.abs(samples.at(-1)?.offset ?? 0)),
        overshootAbs: round(overshootAbs),
        releaseOffsetAbs: round(Math.abs(releaseOffset)),
    };
}

function runCounterTap(speed) {
    const player = createPlayer(speed);
    const samples = simulate(
        player,
        speed,
        1.4,
        (timeSec) => timeSec < 0.75 ? 0.45 : timeSec < 0.9 ? -0.8 : 0.45,
    );
    const start = samples[Math.round(0.75 / FRAME_SECONDS)]?.offset ?? 0;
    const end = samples[Math.round(0.9 / FRAME_SECONDS)]?.offset ?? 0;

    return {
        offsetDelta: round(end - start),
        velocityMaxAbs: round(maxAbs(samples.map((sample) => sample.velocity))),
    };
}

function simulate(player, speed, durationSec, getSteerAxis) {
    const samples = [];
    const frames = Math.round(durationSec / FRAME_SECONDS);

    for (let frame = 0; frame < frames; frame += 1) {
        const timeSec = frame * FRAME_SECONDS;
        player.speed = speed;
        updatePlayerVehicle(
            player,
            { accelPressed: false, brakePressed: false, steerAxis: getSteerAxis(timeSec) },
            { currentCurve: 0, slopeAcceleration: 0 },
            CONFIG,
            FRAME_SECONDS,
        );
        player.speed = speed;
        samples.push({
            offset: player.lateralOffset,
            steering: player.steering,
            velocity: player.steeringVelocity,
        });
    }

    return samples;
}

function createPlayer(speed) {
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        CONFIG.accelSpeed,
    );
    player.speed = speed;
    return player;
}

function speedForDisplayKmh(targetKmh) {
    let lower = 0;
    let upper = CONFIG.accelSpeed;

    for (let iteration = 0; iteration < 32; iteration += 1) {
        const midpoint = (lower + upper) * 0.5;
        const displaySpeed = getDisplaySpeedKmh(
            midpoint,
            CONFIG.accelSpeed,
            RAVEN_COUPE_ENGINE_PROFILE,
        );
        if (displaySpeed < targetKmh) lower = midpoint;
        else upper = midpoint;
    }

    return (lower + upper) * 0.5;
}

function getOnsetMs(samples, predicate) {
    const index = samples.findIndex(predicate);
    return index < 0 ? null : Math.round(index * FRAME_SECONDS * 1000);
}

function nonIncreasing(id, values, tolerance) {
    let maxIncrease = 0;
    for (let index = 1; index < values.length; index += 1) {
        maxIncrease = Math.max(maxIncrease, values[index] - values[index - 1]);
    }

    return {
        id,
        maxIncrease: round(maxIncrease),
        pass: maxIncrease <= tolerance,
        target: tolerance,
        values: values.map((value) => round(value)),
    };
}

function atLeast(id, value, target) {
    return { id, pass: value !== null && value >= target, target, value };
}

function atMost(id, value, target) {
    return { id, pass: value !== null && value <= target, target, value };
}

function between(id, value, min, max) {
    return { id, max, min, pass: value >= min && value <= max, value };
}

function maxAbs(values) {
    return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
}

function roundObject(value) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'number' ? round(entry, 4) : entry,
    ]));
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}
