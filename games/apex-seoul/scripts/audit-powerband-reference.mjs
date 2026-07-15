import {
    APEX_S_ENGINE_PROFILE,
    getBoostRatio,
    getGearRpm,
    getInitialGearIndex,
    getTorqueScale,
    RAVEN_COUPE_ENGINE_PROFILE,
    VORTEX_GT_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';

const ACCEL_SPEED = 760;
const BOOST_TORQUE_LIFT = 0.12;
const TORQUE_SCALE_MAX = 1.14;
const TORQUE_SCALE_MIN = 0.7;
const COMMON_SPEEDS_KMH = [60, 90, 120, 150, 180, 210, 230];
const REFERENCE_PROFILES = [
    RAVEN_COUPE_ENGINE_PROFILE,
    VORTEX_GT_ENGINE_PROFILE,
    APEX_S_ENGINE_PROFILE,
];

const rowsByVehicle = REFERENCE_PROFILES.map((profile) => ({
    profile,
    rows: getReferenceRows(profile),
}));

console.log('# Apex Seoul Powerband Reference');
console.log('');
console.log('Display speed is converted back through the runtime display-speed curve, so the table compares vehicle character at player-facing km/h rather than raw physics units.');

for (const { profile, rows } of rowsByVehicle) {
    console.log('');
    console.log(`## ${profile.displayName}`);
    console.log('');
    console.log('| km/h | raw ratio | gear | rpm | torque | boost | engine torque | note |');
    console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');

    for (const row of rows) {
        console.log(
            `| ${row.speedKmh} | ${row.speedRatio.toFixed(3)} | ${row.gear} | ` +
            `${Math.round(row.rpm)} | ${row.torqueScale.toFixed(3)} | ${row.boostRatio.toFixed(3)} | ` +
            `${row.engineTorqueScale.toFixed(3)} | ${row.note} |`,
        );
    }
}

function getReferenceRows(profile) {
    const speeds = [...COMMON_SPEEDS_KMH, profile.displayTopSpeedKmh]
        .filter((speed, index, values) => speed <= profile.displayTopSpeedKmh && values.indexOf(speed) === index)
        .sort((a, b) => a - b);

    return speeds.map((speedKmh) => {
        const displayRatio = speedKmh / profile.displayTopSpeedKmh;
        const speedRatio = inverseSmoothstep(displayRatio);
        const gearIndex = getInitialGearIndex(profile, speedRatio);
        const rpm = getGearRpm(profile, gearIndex, speedRatio);
        const torqueScale = getTorqueScale(profile, rpm);
        const boostRatio = getBoostRatio(profile, rpm, 1, 0, 0, speedRatio);
        const engineTorqueScale = getEngineTorqueScale(torqueScale) + boostRatio * BOOST_TORQUE_LIFT;

        return {
            boostRatio,
            engineTorqueScale,
            gear: gearIndex + 1,
            note: getNote(profile, rpm, torqueScale, boostRatio),
            rpm,
            speedKmh,
            speedRatio,
            torqueScale,
        };
    });
}

function getNote(profile, rpm, torqueScale, boostRatio) {
    if (rpm >= profile.redlineStartRpm) return 'redline edge';
    if (boostRatio >= 0.95) return 'boost plateau';
    if (boostRatio >= 0.45) return 'spooling pull';
    if (torqueScale >= 0.96) return 'power peak';
    if (torqueScale >= 0.86) return 'strong pull';

    return 'build-up';
}

function getEngineTorqueScale(torqueScale) {
    return lerp(TORQUE_SCALE_MIN, TORQUE_SCALE_MAX, clamp(torqueScale, 0, 1));
}

function inverseSmoothstep(target) {
    const clampedTarget = clamp(target, 0, 1);
    let low = 0;
    let high = 1;

    for (let index = 0; index < 32; index += 1) {
        const mid = (low + high) / 2;
        if (smoothstep(mid) < clampedTarget) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return (low + high) / 2;
}

function smoothstep(value) {
    return value * value * (3 - 2 * value);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
