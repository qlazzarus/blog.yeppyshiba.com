import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createCameraEffectsState,
    DEFAULT_CAMERA_EFFECTS_CONFIG,
    getSpeedFovBonus,
    updateCameraEffects,
} from '../src/game/cameraEffects.js';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import {
    createDefaultPlayerVehicleState,
    getSpeedHandlingSample,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import { SEGMENT_LENGTH } from '../src/game/road.ts';
import {
    getSpeedEffectIntensity,
    SPEED_PRESENTATION_WORLD_CONFIG,
} from '../src/game/speedPresentationConfig.ts';
import {
    createSpeedCueState,
    getSpeedCueRatio,
    SPEED_CUE_CONFIG,
    updateSpeedCue,
} from '../src/game/speedCue.js';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/speed-presentation');
const frameSeconds = 1 / 60;
const accelSpeed = 760;
const sampleSpeedsKmh = [0, 30, 60, 90, 110, 130, 150, 170, 185, 200, 210, 225];
const snapshotId = parseSnapshotId(process.argv.slice(2));
const handlingConfig = createPlayerControllerBaselineConfig({
    aeroDrag: 0,
    cornerSpeedPull: 0,
    engineAcceleration: 0,
    engineBrakeDeceleration: 0,
    rollingResistance: 0,
    steeringSpeedScrub: 0,
});

const rows = sampleSpeedsKmh.map(buildRow);
const inverseIdentityErrorMax = Math.max(...rows.map((row) => row.inverseIdentityErrorKmh));
const cadenceIdentityErrorMax = Math.max(...rows.flatMap((row) => [
    Math.abs(row.cadence.laneDashPassesPerSec - row.worldUnitsPerSec / row.cadence.laneDashSpacingUnits),
    Math.abs(row.cadence.cornerLaneDashPassesPerSec - row.worldUnitsPerSec / row.cadence.cornerLaneDashSpacingUnits),
    Math.abs(row.cadence.cornerReflectorPassesPerSec - row.worldUnitsPerSec / row.cadence.cornerReflectorSpacingUnits),
    Math.abs(row.cadence.reflectorMaxPassesPerSec - row.worldUnitsPerSec / row.cadence.reflectorSpacingUnits),
    Math.abs(row.cadence.leftPostPassesPerSec - row.worldUnitsPerSec / row.cadence.leftPostSpacingUnits),
    Math.abs(row.cadence.rightPostPassesPerSec - row.worldUnitsPerSec / row.cadence.rightPostSpacingUnits),
]));
const fovIdentityErrorMax = Math.max(...rows.map((row) => Math.abs(
    row.camera.speedFovBonusDegrees -
        getSpeedFovBonus(row.speedKmh, DEFAULT_CAMERA_EFFECTS_CONFIG),
)));
const row60 = findRow(60);
const row110 = findRow(110);
const row150 = findRow(150);
const row185 = findRow(185);
const row210 = findRow(210);
const row225 = findRow(225);
const checks = [
    check('sampleCount', rows.length === sampleSpeedsKmh.length, sampleSpeedsKmh.length, rows.length),
    checkBetween('inverseIdentityErrorKmhMax', inverseIdentityErrorMax, 0, 0.000001),
    checkBetween('cadenceIdentityErrorMax', cadenceIdentityErrorMax, 0, 0.000001),
    checkBetween('cssCornerLaneCadenceAt150Kmh', row150.cadence.cornerLaneDashPassesPerSec, 4, 6),
    checkBetween('cssCornerReflectorCadenceAt185Kmh', row185.cadence.cornerReflectorPassesPerSec, 4, 6),
    // Rows are serialized to six decimals before cross-channel identities are
    // checked, so allow the corresponding rounding envelope here.
    checkBetween('fovIdentityErrorMax', fovIdentityErrorMax, 0, 0.00001),
    checkBetween('sh4SteadyShaderMax', row225.shader.steadyIntensity, 0, 0.12),
    checkBetween(
        'sh4EventShaderMax',
        Math.max(...rows.map((row) => row.shader.maximumCombinedIntensity)),
        0,
        SPEED_PRESENTATION_WORLD_CONFIG.speedEffectMaxIntensity,
    ),
    checkBetween('sh4SpeedFovBonusMax', row225.camera.speedFovBonusDegrees, 4, 5.5),
    checkBetween(
        'sh4TopBandFovDelta',
        row225.camera.speedFovBonusDegrees - row185.camera.speedFovBonusDegrees,
        1.2,
        1.5,
    ),
    checkBetween(
        'sh4ThrottleImpulseMax',
        Math.max(...rows.map((row) => row.camera.throttleFovCuePeakDegrees)),
        0,
        0.8,
    ),
    checkBetween(
        'sh4DriftExitImpulseMax',
        Math.max(...rows.map((row) => row.camera.driftExitFovCuePeakDegrees)),
        0,
        1.2,
    ),
    checkBetween(
        'sh4TopBandShaderHoldDelta',
        Math.abs(row225.shader.steadyIntensity - row210.shader.steadyIntensity),
        0,
        0.000001,
    ),
    check(
        'worldUnitProgression',
        strictlyIncreasing(rows.slice(1).map((row) => row.worldUnitsPerSec)),
        'strictly increasing above 0km/h',
        rows.map((row) => row.worldUnitsPerSec),
    ),
    check(
        'speedCueEnvelopeBounds',
        rows.every((row) => (
            row.speedCue.base <= SPEED_CUE_CONFIG.baseMaxIntensity + 0.000001 &&
            row.speedCue.downhill <= SPEED_CUE_CONFIG.downhillMaxIntensity + 0.000001 &&
            row.speedCue.throttleBurstPeak <= SPEED_CUE_CONFIG.throttleBurstMaxIntensity + 0.000001 &&
            row.speedCue.driftExitBurstPeak <= SPEED_CUE_CONFIG.driftExitBurstMaxIntensity + 0.000001
        )),
        'all cue channels remain within runtime maxima',
        true,
    ),
    check(
        'sh2SpeedBandsExplicitKmh',
        SPEED_CUE_CONFIG.baseSpeedBands.map((band) => band.speedKmh).join(',') ===
            '70,110,150,185,210,225',
        [70, 110, 150, 185, 210, 225],
        SPEED_CUE_CONFIG.baseSpeedBands.map((band) => band.speedKmh),
    ),
    checkBetween('sh2BelowStartBase', row60.speedCue.base, 0, 0.000001),
    check(
        'sh2BandProgression',
        row110.speedCue.base < row150.speedCue.base &&
            row150.speedCue.base < row185.speedCue.base &&
            row185.speedCue.base < row210.speedCue.base,
        '110 < 150 < 185 < 210km/h base cue',
        [row110, row150, row185, row210].map((row) => row.speedCue.base),
    ),
    check(
        'sh2CueBandIdentity',
        rows.every((row) => Math.abs(
            row.speedCue.base -
                getSpeedCueRatio(row.speedKmh) * SPEED_CUE_CONFIG.baseMaxIntensity,
        ) <= 0.000001),
        'runtime km/h envelope',
        'all sampled rows match',
    ),
    checkBetween(
        'sh2TopSpeedHoldDelta',
        Math.abs(row225.speedCue.base - row210.speedCue.base),
        0,
        0.000001,
    ),
    check(
        'laneDashRatiosValid',
        SPEED_PRESENTATION_WORLD_CONFIG.laneDashStartRatio >= 0 &&
            SPEED_PRESENTATION_WORLD_CONFIG.laneDashLengthRatio > 0 &&
            SPEED_PRESENTATION_WORLD_CONFIG.laneDashStartRatio +
                SPEED_PRESENTATION_WORLD_CONFIG.laneDashLengthRatio <= 1,
        '0 <= start, 0 < length, start + length <= 1',
        {
            length: SPEED_PRESENTATION_WORLD_CONFIG.laneDashLengthRatio,
            start: SPEED_PRESENTATION_WORLD_CONFIG.laneDashStartRatio,
        },
    ),
    checkBetween(
        'sh3LaneCadence210',
        row210.cadence.laneDashPassesPerSec,
        2.9,
        4,
    ),
    checkBetween(
        'sh3LaneCadence225',
        row225.cadence.laneDashPassesPerSec,
        3,
        4,
    ),
    checkBetween(
        'sh3ReflectorCadence225',
        row225.cadence.reflectorMaxPassesPerSec,
        3,
        4,
    ),
    checkBetween('stationaryHoldOffset', rows[0].handling.hold.offsetAbs, 0, 0.001),
    checkBetween('stationaryHoldPose', rows[0].handling.hold.poseMaxAbs, 0, 0.001),
    check(
        'handlingSamplesFinite',
        rows.every((row) => allFinite([
            row.handling.profile.gripAngleCap,
            row.handling.profile.lateralVelocityCap,
            row.handling.profile.steeringForceScale,
            row.handling.hold.offsetAbs,
            row.handling.hold.velocityAbs,
            row.handling.hold.poseMaxAbs,
            row.handling.release.offsetAfterOneSecAbs,
        ])),
        true,
        true,
    ),
];
const findings = [
    {
        id: 'nearFieldCadenceBelowTarget',
        status: row225.cadence.laneDashPassesPerSec < 3 ? 'observed' : 'resolved',
        targetPassesPerSec: [3, 4],
        value: row225.cadence.laneDashPassesPerSec,
    },
    {
        baseCueDelta: round(row225.speedCue.base - row210.speedCue.base),
        fromKmh: 210,
        id: 'topBandSpeedCueSaturation',
        status: Math.abs(row225.speedCue.base - row210.speedCue.base) <= 0.000001
            ? 'resolved'
            : 'observed',
        toKmh: 225,
    },
    {
        deltaDegrees: round(row225.camera.speedFovBonusDegrees - row185.camera.speedFovBonusDegrees),
        fromKmh: 185,
        id: 'topBandFovCompression',
        status: row225.camera.speedFovBonusDegrees - row185.camera.speedFovBonusDegrees < 1 ? 'observed' : 'resolved',
        toKmh: 225,
    },
    {
        id: 'shaderEventOverlapCap',
        maxIntensity: Math.max(...rows.map((row) => row.shader.maximumCombinedIntensity)),
        status: Math.max(...rows.map((row) => row.shader.maximumCombinedIntensity)) <=
            SPEED_PRESENTATION_WORLD_CONFIG.speedEffectMaxIntensity
            ? 'resolved'
            : 'observed',
    },
    {
        id: 'topBandHandlingPlateau',
        profileDelta: getHandlingProfileDelta(row185.handling.profile, row225.handling.profile),
        status: getHandlingProfileDelta(row185.handling.profile, row225.handling.profile) <= 0.000001
            ? 'observed'
            : 'resolved',
    },
];
const report = {
    checks,
    config: {
        accelSpeed,
        camera: DEFAULT_CAMERA_EFFECTS_CONFIG,
        cadence: SPEED_PRESENTATION_WORLD_CONFIG,
        displayTopSpeedKmh: RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh,
        roadSegmentLength: SEGMENT_LENGTH,
        sampleSpeedsKmh,
        speedCue: SPEED_CUE_CONFIG,
    },
    findings,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    rows,
    schemaVersion: 3,
    snapshotId,
};

await mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, 'speed-presentation-baseline.json');
const markdownPath = path.join(outputDir, 'speed-presentation-baseline.md');
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));
if (snapshotId) {
    await writeFile(
        path.join(outputDir, `speed-presentation-${snapshotId}-baseline.json`),
        `${JSON.stringify(report, null, 2)}\n`,
    );
    await writeFile(
        path.join(outputDir, `speed-presentation-${snapshotId}-baseline.md`),
        buildMarkdown(report),
    );
}

console.log(`Speed presentation sweep: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
if (snapshotId) console.log(`Snapshot: speed-presentation-${snapshotId}-baseline.*`);
console.log(`Inverse identity error: ${format(inverseIdentityErrorMax, 6)}km/h`);
console.log(`225km/h lane cadence: ${format(row225.cadence.laneDashPassesPerSec)} pass/s`);
console.log(`185→225km/h FOV delta: ${format(
    row225.camera.speedFovBonusDegrees - row185.camera.speedFovBonusDegrees,
)}°`);

if (!report.pass) process.exitCode = 1;

function buildRow(speedKmh) {
    const speedRatio = speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
    const worldUnitsPerSec = speedRatio * accelSpeed;
    const speedCue = measureSpeedCue(speedKmh);
    const camera = measureCamera(speedKmh, speedCue);

    return roundObject({
        cadence: {
            cornerLaneDashPassesPerSec: worldUnitsPerSec *
                SPEED_PRESENTATION_WORLD_CONFIG.cornerLaneDashSubdivisions / SEGMENT_LENGTH,
            cornerLaneDashSpacingUnits: SEGMENT_LENGTH /
                SPEED_PRESENTATION_WORLD_CONFIG.cornerLaneDashSubdivisions,
            cornerReflectorPassesPerSec: worldUnitsPerSec *
                SPEED_PRESENTATION_WORLD_CONFIG.cornerReflectorSubdivisions / SEGMENT_LENGTH,
            cornerReflectorSpacingUnits: SEGMENT_LENGTH /
                SPEED_PRESENTATION_WORLD_CONFIG.cornerReflectorSubdivisions,
            laneDashPassesPerSec: passRate(worldUnitsPerSec, SPEED_PRESENTATION_WORLD_CONFIG.laneDashSegmentInterval),
            laneDashSpacingUnits: SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.laneDashSegmentInterval,
            leftPostPassesPerSec: passRate(worldUnitsPerSec, SPEED_PRESENTATION_WORLD_CONFIG.leftGuardrailPostSegmentInterval),
            leftPostSpacingUnits: SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.leftGuardrailPostSegmentInterval,
            reflectorMaxPassesPerSec: passRate(worldUnitsPerSec, SPEED_PRESENTATION_WORLD_CONFIG.reflectorSegmentInterval),
            reflectorSpacingUnits: SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.reflectorSegmentInterval,
            rightPostPassesPerSec: passRate(worldUnitsPerSec, SPEED_PRESENTATION_WORLD_CONFIG.rightGuardrailPostSegmentInterval),
            rightPostSpacingUnits: SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.rightGuardrailPostSegmentInterval,
            segmentPassesPerSec: worldUnitsPerSec / SEGMENT_LENGTH,
        },
        camera,
        handling: measureHandling(worldUnitsPerSec, speedRatio),
        inverseIdentityErrorKmh: Math.abs(
            getDisplaySpeedKmh(worldUnitsPerSec, accelSpeed, RAVEN_COUPE_ENGINE_PROFILE) - speedKmh,
        ),
        shader: {
            downhillIntensity: getSpeedEffectIntensity(speedCue.base + speedCue.downhill),
            driftExitEventIntensity: speedCue.driftExitBurstPeak,
            driftExitCombinedIntensity: getSpeedEffectIntensity(
                speedCue.base + speedCue.driftExitBurstPeak,
            ),
            maximumCombinedIntensity: getSpeedEffectIntensity(
                speedCue.base +
                    speedCue.downhill +
                    speedCue.throttleBurstPeak +
                    speedCue.driftExitBurstPeak,
            ),
            speedEffectTimeScale: lerp(
                SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMin,
                SPEED_PRESENTATION_WORLD_CONFIG.speedEffectTimeScaleMax,
                speedRatio,
            ),
            steadyIntensity: getSpeedEffectIntensity(speedCue.base),
            throttleEventIntensity: speedCue.throttleBurstPeak,
            throttleCombinedIntensity: getSpeedEffectIntensity(
                speedCue.base + speedCue.throttleBurstPeak,
            ),
        },
        speedKmh,
        speedRatio,
        speedCue,
        worldUnitsPerSec,
    });
}

function measureSpeedCue(speedKmh) {
    const steady = runCueScenario(speedKmh, 2, () => ({
        accelPressed: false,
        downhillRatio: 0,
        driftState: 'grip',
    }));
    const downhill = runCueScenario(speedKmh, 2, () => ({
        accelPressed: false,
        downhillRatio: 1,
        driftState: 'grip',
    }));
    const throttle = runCueScenario(speedKmh, 1.2, (time) => ({
        accelPressed: time >= 0.6,
        downhillRatio: 0,
        driftState: 'grip',
    }));
    const driftExit = runCueScenario(speedKmh, 1.2, (time) => ({
        accelPressed: true,
        downhillRatio: 0,
        driftState: time < 0.6 ? 'recovery' : 'grip',
    }));

    return {
        base: steady.at(-1).base,
        downhill: downhill.at(-1).downhill,
        driftExitBurstPeak: peak(driftExit, 'driftExitBurst'),
        intensitySteady: steady.at(-1).intensity,
        throttleBurstPeak: peak(throttle, 'throttleBurst'),
    };
}

function runCueScenario(speedKmh, durationSec, getInput) {
    const state = createSpeedCueState();
    const samples = [];

    for (let time = 0; time <= durationSec; time += frameSeconds) {
        samples.push(updateSpeedCue(state, {
            ...getInput(time),
            seconds: frameSeconds,
            speedKmh,
        }));
    }

    return samples;
}

function measureCamera(speedKmh, cue) {
    const speedFovBonusDegrees = getSpeedFovBonus(speedKmh, DEFAULT_CAMERA_EFFECTS_CONFIG);
    const steadyFovDegrees = DEFAULT_CAMERA_EFFECTS_CONFIG.baseFov + speedFovBonusDegrees;

    return {
        downhillFovCuePeakDegrees: measureCameraCuePeak(speedKmh, {
            downhill: cue.downhill,
            driftExitBurst: 0,
            throttleBurst: 0,
        }),
        driftExitFovCuePeakDegrees: measureCameraCuePeak(speedKmh, {
            downhill: 0,
            driftExitBurst: cue.driftExitBurstPeak,
            throttleBurst: 0,
        }),
        speedFovBonusDegrees,
        steadyFovDegrees,
        throttleFovCuePeakDegrees: measureCameraCuePeak(speedKmh, {
            downhill: 0,
            driftExitBurst: 0,
            throttleBurst: cue.throttleBurstPeak,
        }),
    };
}

function measureCameraCuePeak(speedKmh, cue) {
    let state = createCameraEffectsState(DEFAULT_CAMERA_EFFECTS_CONFIG);
    const zeroCue = { downhill: 0, driftExitBurst: 0, throttleBurst: 0 };

    for (let frame = 0; frame < 60 * 8; frame += 1) {
        state = updateCameraEffects(state, {
            cue: zeroCue,
            cueLimits: SPEED_CUE_CONFIG,
            railImpact: 0,
            seconds: frameSeconds,
            speedKmh,
        }, DEFAULT_CAMERA_EFFECTS_CONFIG);
    }

    let peakDegrees = 0;
    for (let frame = 0; frame < 60; frame += 1) {
        state = updateCameraEffects(state, {
            cue,
            cueLimits: SPEED_CUE_CONFIG,
            railImpact: 0,
            seconds: frameSeconds,
            speedKmh,
        }, DEFAULT_CAMERA_EFFECTS_CONFIG);
        peakDegrees = Math.max(peakDegrees, state.fovCueDegrees);
    }

    return peakDegrees;
}

function measureHandling(speed, speedRatio) {
    return {
        hold: simulateSteeringCase(speed, 1, () => 1),
        profile: getSpeedHandlingSample(speedRatio),
        release: simulateRelease(speed),
        tap: simulateSteeringCase(speed, 1, (time) => time < 0.15 ? 1 : 0),
    };
}

function simulateRelease(speed) {
    const player = createPlayer(speed);
    simulateFrames(player, speed, 1, () => 1);
    const releaseStartOffset = player.lateralOffset;
    const samples = simulateFrames(player, speed, 1, () => 0);

    return {
        offsetAfterOneSecAbs: Math.abs(samples.at(-1).offset),
        poseAfterOneSecAbs: Math.abs(samples.at(-1).pose),
        releaseStartOffsetAbs: Math.abs(releaseStartOffset),
        velocityAfterOneSecAbs: Math.abs(samples.at(-1).velocity),
    };
}

function simulateSteeringCase(speed, durationSec, getSteerAxis) {
    const samples = simulateFrames(createPlayer(speed), speed, durationSec, getSteerAxis);
    const last = samples.at(-1);

    return {
        offsetAbs: Math.abs(last.offset),
        offsetMaxAbs: maxAbs(samples, 'offset'),
        poseMaxAbs: maxAbs(samples, 'pose'),
        velocityAbs: Math.abs(last.velocity),
        velocityMaxAbs: maxAbs(samples, 'velocity'),
    };
}

function simulateFrames(player, speed, durationSec, getSteerAxis) {
    const samples = [];
    const frames = Math.round(durationSec / frameSeconds);

    for (let frame = 0; frame < frames; frame += 1) {
        const time = frame * frameSeconds;
        player.speed = speed;
        updatePlayerVehicle(
            player,
            { accelPressed: false, brakePressed: false, steerAxis: getSteerAxis(time) },
            { currentCurve: 0, slopeAcceleration: 0 },
            handlingConfig,
            frameSeconds,
        );
        player.speed = speed;
        samples.push({
            offset: player.lateralOffset,
            pose: player.steering,
            velocity: player.steeringVelocity,
        });
    }

    return samples;
}

function createPlayer(speed) {
    const player = createDefaultPlayerVehicleState(
        speed,
        RAVEN_COUPE_ENGINE_PROFILE,
        accelSpeed,
    );
    player.speed = speed;
    return player;
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul Speed Presentation Baseline',
        '',
        `Generated: ${result.generatedAt}`,
        '',
        `Status: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        `Snapshot: **${result.snapshotId ?? 'current'}**`,
        '',
        'This report records the current `km/h → world unit → screen cue` relationships and their automated gates.',
        '',
        '## Presentation sweep',
        '',
        '| km/h | unit/s | segment/s | straight lane/s | corner lane/s | corner reflector/s | right post/s | FOV bonus | base cue | downhill cue | throttle peak | time scale |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.rows.map((row) => (
            `| ${row.speedKmh} | ${format(row.worldUnitsPerSec)} | ` +
            `${format(row.cadence.segmentPassesPerSec)} | ${format(row.cadence.laneDashPassesPerSec)} | ` +
            `${format(row.cadence.cornerLaneDashPassesPerSec)} | ` +
            `${format(row.cadence.cornerReflectorPassesPerSec)} | ${format(row.cadence.rightPostPassesPerSec)} | ` +
            `${format(row.camera.speedFovBonusDegrees)}° | ${format(row.speedCue.base)} | ` +
            `${format(row.speedCue.downhill)} | ${format(row.speedCue.throttleBurstPeak)} | ` +
            `${format(row.shader.speedEffectTimeScale)} |`
        )),
        '',
        '## Straight steering response',
        '',
        '| km/h | force | grip cap | lateral cap | yaw scale | tap offset | hold offset | hold velocity | hold pose | release offset 1s |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.rows.map((row) => (
            `| ${row.speedKmh} | ${format(row.handling.profile.steeringForceScale)} | ` +
            `${format(row.handling.profile.gripAngleCap)} | ${format(row.handling.profile.lateralVelocityCap)} | ` +
            `${format(row.handling.profile.visualYawScale)} | ${format(row.handling.tap.offsetMaxAbs)} | ` +
            `${format(row.handling.hold.offsetAbs)} | ${format(row.handling.hold.velocityAbs)} | ` +
            `${format(row.handling.hold.poseMaxAbs)} | ${format(row.handling.release.offsetAfterOneSecAbs)} |`
        )),
        '',
        '## Findings retained for the next stages',
        '',
        ...result.findings.map((finding) => `- ${finding.id}: **${finding.status}** — ${formatValue(finding)}`),
        '',
        '## Invariant checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ${formatValue(entry.value)} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function findRow(speedKmh) {
    const row = rows.find((entry) => entry.speedKmh === speedKmh);
    if (!row) throw new Error(`Missing speed row ${speedKmh}km/h`);
    return row;
}

function parseSnapshotId(args) {
    const index = args.indexOf('--snapshot-id');

    if (index < 0) return null;

    const value = args[index + 1];

    if (!value || !/^[a-z0-9-]+$/.test(value)) {
        throw new Error('--snapshot-id requires a lowercase alphanumeric id');
    }

    return value;
}

function passRate(worldUnitsPerSec, segmentInterval) {
    return worldUnitsPerSec / (SEGMENT_LENGTH * segmentInterval);
}

function getHandlingProfileDelta(left, right) {
    const keys = [
        'centeringScale',
        'gripAngleCap',
        'inputResponseScale',
        'lateralAuthority',
        'lateralVelocityCap',
        'neutralReturnVelocityCap',
        'steeringForceScale',
        'steeringSlewRate',
        'visualAuthority',
        'visualYawScale',
    ];
    return round(Math.max(...keys.map((key) => Math.abs(left[key] - right[key]))), 6);
}

function peak(samples, key) {
    return Math.max(...samples.map((sample) => sample[key]));
}

function maxAbs(samples, key) {
    return Math.max(...samples.map((sample) => Math.abs(sample[key])));
}

function strictlyIncreasing(values) {
    return values.every((value, index) => index === 0 || value > values[index - 1]);
}

function allFinite(values) {
    return values.every(Number.isFinite);
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function checkBetween(id, value, min, max) {
    return check(id, value >= min && value <= max, [min, max], round(value, 8));
}

function roundObject(value) {
    if (Array.isArray(value)) return value.map(roundObject);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundObject(entry)]));
    }
    return typeof value === 'number' ? round(value, 6) : value;
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function format(value, digits = 3) {
    return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (typeof value === 'number') return format(value, 6);
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value).replaceAll('|', '\\|');
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
