import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GUARDRAIL_COLLISION_CONFIG,
    applyGuardrailCollision,
    getGuardrailCollisionGeometry,
} from '../src/game/guardrailCollision.ts';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import { getLongitudinalWorldTravelSpeed } from '../src/game/longitudinalProgression.ts';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    createBugakRidgeDownhillTrack,
    getRoadCurveAt,
    getRoadElevationAt,
    getRoadHalfWidthAt,
    getRoadHeadingPreview,
} from '../src/game/road.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const CONTACT_DISTANCE = 260;
const FRONT_DISTANCE = GUARDRAIL_COLLISION_CONFIG.physicalVehicleFrontLength;
const LONGITUDINAL_SCALE = 2;
const CORNER_THRESHOLD = 0.08;
const STRONG_CURVE_THRESHOLD = 0.4;
const DISCOVERY_STEP = 60;
const APPROACH_DISTANCE = 0;
const EXIT_DISTANCE = 1_200;
const SLOPE_SAMPLE_DISTANCE = 720;
const GRAVITY_ACCELERATION = 360;
const MAX_SLOPE_ACCELERATION = 115;
const MAX_SCENARIO_SECONDS = 30;
const MAX_POST_IMPACT_INWARD_RAIL_RATIO = 0.25;
const MAX_SAME_RAIL_IMPACTS = 2;
const SPEEDS_KMH = [120, 160, 185];
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/neutral-production-corners',
);

const track = createBugakRidgeDownhillTrack();
const corners = discoverStrongCorners();
const scenarios = corners.flatMap((corner) => (
    SPEEDS_KMH.map((speedKmh) => runNeutralFork(corner, speedKmh))
));
const highSpeedScenarios = scenarios.filter((scenario) => scenario.speedKmh === 185);
const checks = [
    check(
        'production-strong-corners-discovered',
        corners.length >= 6,
        { count: corners.length },
    ),
    check(
        'every-corner-has-all-speed-forks',
        corners.every((corner) => (
            SPEEDS_KMH.every((speedKmh) => scenarios.some((scenario) => (
                scenario.cornerId === corner.id && scenario.speedKmh === speedKmh
            )))
        )),
        { cornerCount: corners.length, scenarioCount: scenarios.length },
    ),
    check(
        'all-forks-keep-steering-neutral',
        scenarios.every((scenario) => scenario.maxAbsSteerAxis === 0),
        {
            maxAbsSteerAxis: Math.max(...scenarios.map((scenario) => (
                scenario.maxAbsSteerAxis
            ))),
        },
    ),
    check(
        'neutral-first-motion-is-outward',
        scenarios.every((scenario) => scenario.firstMotionDirection === -scenario.direction),
        scenarios.map((scenario) => ({
            cornerId: scenario.cornerId,
            direction: scenario.direction,
            firstMotionDirection: scenario.firstMotionDirection,
            speedKmh: scenario.speedKmh,
        })),
    ),
    check(
        'every-strong-corner-threatens-edge-at-185',
        highSpeedScenarios.every((scenario) => (
            scenario.timeToPavedEdgeSec !== null ||
            scenario.maxShoulderRatio > 0 ||
            scenario.impactCount > 0
        )),
        highSpeedScenarios.map(summarizeThreat),
    ),
    check(
        'selected-strong-corners-hit-rail-at-185',
        highSpeedScenarios.filter((scenario) => scenario.impactCount > 0).length >=
            Math.ceil(highSpeedScenarios.length * 0.75),
        {
            cornerCount: highSpeedScenarios.length,
            railImpactCornerCount: highSpeedScenarios.filter((scenario) => (
                scenario.impactCount > 0
            )).length,
        },
    ),
    check(
        'first-impact-stays-on-expected-outside-rail-at-185',
        highSpeedScenarios.every((scenario) => (
            scenario.firstImpactSide === -scenario.direction &&
            scenario.oppositeRailImpactCount === 0
        )),
        highSpeedScenarios.map(summarizeCollisionTrajectory),
    ),
    check(
        'post-impact-inward-travel-remains-local-at-185',
        highSpeedScenarios.every((scenario) => (
            scenario.maxPostImpactInwardRailRatio <= MAX_POST_IMPACT_INWARD_RAIL_RATIO
        )),
        {
            limit: MAX_POST_IMPACT_INWARD_RAIL_RATIO,
            scenarios: highSpeedScenarios.map(summarizeCollisionTrajectory),
        },
    ),
    check(
        'same-rail-contact-does-not-loop-as-new-impacts-at-185',
        highSpeedScenarios.every((scenario) => (
            scenario.sameRailImpactCount <= MAX_SAME_RAIL_IMPACTS
        )),
        {
            limit: MAX_SAME_RAIL_IMPACTS,
            scenarios: highSpeedScenarios.map(summarizeCollisionTrajectory),
        },
    ),
    check(
        'automatic-corner-loss-remains-below-brake',
        scenarios.every((scenario) => scenario.maxAutomaticCornerLossForce <= 66.001),
        {
            fullBrakeForce: 330,
            maxAutomaticCornerLossForce: Math.max(...scenarios.map((scenario) => (
                scenario.maxAutomaticCornerLossForce
            ))),
        },
    ),
];
const report = {
    checks,
    config: {
        approachDistance: APPROACH_DISTANCE,
        contactDistance: CONTACT_DISTANCE,
        cornerThreshold: CORNER_THRESHOLD,
        discoveryStep: DISCOVERY_STEP,
        exitDistance: EXIT_DISTANCE,
        longitudinalScale: LONGITUDINAL_SCALE,
        maxPostImpactInwardRailRatio: MAX_POST_IMPACT_INWARD_RAIL_RATIO,
        maxSameRailImpacts: MAX_SAME_RAIL_IMPACTS,
        speedsKmh: SPEEDS_KMH,
        strongCurveThreshold: STRONG_CURVE_THRESHOLD,
    },
    corners,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    purpose: 'Measure every production strong corner with throttle and zero steering input',
    scenarios,
    schemaVersion: 1,
    track: {
        id: track.id,
        length: track.length,
        name: track.name,
    },
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
    path.join(OUTPUT_DIR, 'neutral-production-corners.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(OUTPUT_DIR, 'neutral-production-corners.md'),
    buildMarkdown(report),
);

console.log(`Neutral production corner audit: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`Corners: ${corners.length}, forks: ${scenarios.length}`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
for (const scenario of highSpeedScenarios) {
    console.log(
        `${scenario.cornerId} 185km/h ` +
        `edge=${formatTime(scenario.timeToPavedEdgeSec)} ` +
        `rail=${formatTime(scenario.timeToRailSec)} ` +
        `impacts=${scenario.impactCount} ` +
        `outward=${scenario.maxOutwardRoadRatio}`,
    );
}
if (!report.pass) process.exitCode = 1;

function discoverStrongCorners() {
    const windows = [];
    let active = null;
    const lastCameraZ = track.length - CONTACT_DISTANCE;

    for (let cameraZ = 0; cameraZ <= lastCameraZ; cameraZ += DISCOVERY_STEP) {
        const contactZ = cameraZ + CONTACT_DISTANCE;
        const curve = getRoadCurveAt(track, contactZ);
        const direction = Math.sign(curve);
        const isCorner = Math.abs(curve) >= CORNER_THRESHOLD;
        const continues = active && isCorner && direction === active.direction;

        if (active && !continues) {
            windows.push(finishDiscoveredCorner(active, windows.length));
            active = null;
        }
        if (!active && isCorner) {
            active = {
                direction,
                samples: [],
            };
        }
        if (active) active.samples.push({ cameraZ, contactZ, curve });
    }
    if (active) windows.push(finishDiscoveredCorner(active, windows.length));

    return windows
        .filter((corner) => corner.peakAbsCurve >= STRONG_CURVE_THRESHOLD)
        .map((corner, index) => ({
            ...corner,
            id: `production-corner-${index + 1}-${corner.direction > 0 ? 'right' : 'left'}`,
        }));
}

function finishDiscoveredCorner(active, index) {
    const first = active.samples[0];
    const last = active.samples.at(-1);
    const apex = active.samples.reduce((best, sample) => (
        Math.abs(sample.curve) > Math.abs(best.curve) ? sample : best
    ), first);
    return {
        apexCameraZ: round(apex.cameraZ),
        apexContactZ: round(apex.contactZ),
        direction: active.direction,
        endCameraZ: round(last.cameraZ),
        id: `candidate-${index + 1}`,
        peakAbsCurve: round(Math.abs(apex.curve)),
        startCameraZ: round(first.cameraZ),
    };
}

function runNeutralFork(corner, speedKmh) {
    const initialSpeed = rawSpeedForDisplayKmh(speedKmh);
    const player = createDefaultPlayerVehicleState(
        initialSpeed,
        RAVEN_COUPE_ENGINE_PROFILE,
        760,
    );
    let cameraZ = Math.max(0, corner.startCameraZ - APPROACH_DISTANCE);
    const endCameraZ = Math.min(
        track.length - CONTACT_DISTANCE,
        corner.endCameraZ + EXIT_DISTANCE,
    );
    let elapsedSec = 0;
    let firstMotionDirection = 0;
    let firstImpactOffset = null;
    let firstImpactRailLimit = null;
    let firstImpactSide = 0;
    let impactCountAtStart = 0;
    const impactEvents = [];
    let offsetAtCornerEntry = 0;
    let maxAbsSteerAxis = 0;
    let maxAutomaticCornerLossForce = 0;
    let maxOutwardRoadRatio = 0;
    let maxPostImpactInwardRailRatio = 0;
    let maxShoulderRatio = 0;
    let minSpeedKmh = speedKmh;
    let speedAtCornerEntryKmh = null;
    let speedAtCornerExitKmh = null;
    let timeAtCornerEntry = null;
    let timeToPavedEdgeSec = null;
    let timeToRailSec = null;

    while (cameraZ < endCameraZ && elapsedSec <= MAX_SCENARIO_SECONDS) {
        const contactZ = cameraZ + CONTACT_DISTANCE;
        const currentCurve = getRoadCurveAt(track, contactZ);
        const previewRoadCurve = getRoadHeadingPreview(track, contactZ).demandCurve;
        const pavedHalfWidth = getRoadHalfWidthAt(track, contactZ);
        const frontPavedHalfWidth = getRoadHalfWidthAt(
            track,
            contactZ + FRONT_DISTANCE,
        );
        const guardrailContext = {
            frontRoad: {
                distance: FRONT_DISTANCE,
                pavedHalfWidth: frontPavedHalfWidth,
                railContactLimit:
                    frontPavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            },
            pavedHalfWidth,
            railContactLimit:
                pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
        };
        const geometry = getGuardrailCollisionGeometry(guardrailContext);
        const controllerConfig = createPlayerControllerBaselineConfig({
            maxRoadOffset: geometry.railCenterLimit,
        });
        const input = {
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        };
        const impactCountBeforeFrame = player.guardrailImpactCount;

        updatePlayerVehicle(
            player,
            input,
            {
                currentCurve,
                longitudinalScale: LONGITUDINAL_SCALE,
                previewRoadCurve,
                slopeAcceleration: getSlopeAcceleration(cameraZ),
            },
            controllerConfig,
            FRAME_SECONDS,
        );
        const collisionEntryState = {
            heading: player.vehicleHeadingError,
            lateralOffset: player.lateralOffset,
            steeringVelocity: player.steeringVelocity,
        };
        applyGuardrailCollision(player, guardrailContext, FRAME_SECONDS);
        if (player.guardrailImpactCount > impactCountBeforeFrame) {
            const impactSide = player.guardrailContactDirection;
            impactEvents.push({
                bounceVelocity: round(player.guardrailBounceVelocity),
                headingAfter: round(player.vehicleHeadingError),
                headingBefore: round(collisionEntryState.heading),
                lateralOffsetAfter: round(player.lateralOffset),
                lateralOffsetBefore: round(collisionEntryState.lateralOffset),
                progressRatio: round(cameraZ / track.length),
                railSide: impactSide,
                steeringVelocityAfter: round(player.steeringVelocity),
                steeringVelocityBefore: round(collisionEntryState.steeringVelocity),
                timeSec: round(elapsedSec),
            });
            if (firstImpactSide === 0) {
                firstImpactSide = impactSide;
                firstImpactOffset = player.lateralOffset;
                firstImpactRailLimit = geometry.railCenterLimit;
            }
        }

        const speedNowKmh = displaySpeed(player.speed);
        const outwardOffset = -corner.direction * player.lateralOffset;
        const outwardRoadRatio = outwardOffset / geometry.railCenterLimit;
        if (
            firstMotionDirection === 0 &&
            cameraZ >= corner.startCameraZ &&
            Math.abs(player.lateralOffset - offsetAtCornerEntry) >= 0.5
        ) {
            firstMotionDirection = Math.sign(
                player.lateralOffset - offsetAtCornerEntry,
            );
        }
        if (timeAtCornerEntry === null && cameraZ >= corner.startCameraZ) {
            timeAtCornerEntry = elapsedSec;
            speedAtCornerEntryKmh = speedNowKmh;
            impactCountAtStart = player.guardrailImpactCount;
            offsetAtCornerEntry = player.lateralOffset;
        }
        if (
            timeAtCornerEntry !== null &&
            timeToPavedEdgeSec === null &&
            outwardOffset >= geometry.pavedCenterLimit
        ) {
            timeToPavedEdgeSec = elapsedSec - timeAtCornerEntry;
        }
        if (
            timeAtCornerEntry !== null &&
            timeToRailSec === null &&
            player.guardrailImpactCount > impactCountAtStart
        ) {
            timeToRailSec = elapsedSec - timeAtCornerEntry;
        }

        maxAbsSteerAxis = Math.max(maxAbsSteerAxis, Math.abs(input.steerAxis));
        maxAutomaticCornerLossForce = Math.max(
            maxAutomaticCornerLossForce,
            player.cornerSpeedLoss.totalForce,
        );
        if (
            firstImpactSide !== 0 &&
            firstImpactOffset !== null &&
            firstImpactRailLimit !== null
        ) {
            const inwardTravel = firstImpactSide *
                (firstImpactOffset - player.lateralOffset);
            maxPostImpactInwardRailRatio = Math.max(
                maxPostImpactInwardRailRatio,
                inwardTravel / Math.max(1, firstImpactRailLimit),
            );
        }
        maxOutwardRoadRatio = Math.max(maxOutwardRoadRatio, outwardRoadRatio);
        maxShoulderRatio = Math.max(maxShoulderRatio, player.guardrailShoulderRatio);
        minSpeedKmh = Math.min(minSpeedKmh, speedNowKmh);
        if (cameraZ <= corner.endCameraZ) speedAtCornerExitKmh = speedNowKmh;

        const worldTravelSpeed = getLongitudinalWorldTravelSpeed(
            player.speed,
            LONGITUDINAL_SCALE,
        );
        cameraZ += worldTravelSpeed * FRAME_SECONDS;
        elapsedSec += FRAME_SECONDS;
    }

    return {
        cornerId: corner.id,
        direction: corner.direction,
        firstImpactSide,
        firstMotionDirection,
        impactCount: Math.max(0, player.guardrailImpactCount - impactCountAtStart),
        impactEvents,
        maxAbsSteerAxis: round(maxAbsSteerAxis),
        maxAutomaticCornerLossForce: round(maxAutomaticCornerLossForce),
        maxOutwardRoadRatio: round(maxOutwardRoadRatio),
        maxPostImpactInwardRailRatio: round(maxPostImpactInwardRailRatio),
        maxShoulderRatio: round(maxShoulderRatio),
        minSpeedKmh: round(minSpeedKmh),
        oppositeRailImpactCount: impactEvents.filter((event) => (
            firstImpactSide !== 0 && event.railSide === -firstImpactSide
        )).length,
        peakAbsCurve: corner.peakAbsCurve,
        sameRailImpactCount: impactEvents.filter((event) => (
            firstImpactSide !== 0 && event.railSide === firstImpactSide
        )).length,
        speedAtCornerEntryKmh: round(speedAtCornerEntryKmh ?? speedKmh),
        speedAtCornerExitKmh: round(speedAtCornerExitKmh ?? speedNowFallback(player)),
        speedKmh,
        timeToPavedEdgeSec: roundNullable(timeToPavedEdgeSec),
        timeToRailSec: roundNullable(timeToRailSec),
    };
}

function getSlopeAcceleration(worldZ) {
    const currentElevation = getRoadElevationAt(track, worldZ);
    const aheadElevation = getRoadElevationAt(track, worldZ + SLOPE_SAMPLE_DISTANCE);
    const downhillRatio = (currentElevation - aheadElevation) / SLOPE_SAMPLE_DISTANCE;
    return clamp(
        downhillRatio * GRAVITY_ACCELERATION,
        -MAX_SLOPE_ACCELERATION,
        MAX_SLOPE_ACCELERATION,
    );
}

function buildMarkdown(value) {
    const rows = value.scenarios.map((scenario) => (
        `| ${scenario.cornerId} | ${scenario.direction > 0 ? 'right' : 'left'} | ` +
        `${scenario.speedKmh} | ${scenario.speedAtCornerEntryKmh} | ` +
        `${scenario.speedAtCornerExitKmh} | ${formatTime(scenario.timeToPavedEdgeSec)} | ` +
        `${formatTime(scenario.timeToRailSec)} | ${scenario.impactCount} | ` +
        `${formatRailSide(scenario.firstImpactSide)} | ${scenario.sameRailImpactCount} / ` +
        `${scenario.oppositeRailImpactCount} | ${scenario.maxPostImpactInwardRailRatio} | ` +
        `${scenario.maxOutwardRoadRatio} | ${scenario.maxAutomaticCornerLossForce} |`
    ));
    const checkRows = value.checks.map((entry) => (
        `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | \`${JSON.stringify(entry.evidence)}\` |`
    ));
    return [
        '# Apex Seoul Neutral Production Corner Audit',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        'Every row is an independent production-course fork with throttle held and steering fixed at zero.',
        '',
        '## Checks',
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...checkRows,
        '',
        '## Measurements',
        '',
        '| Corner | Direction | Start km/h | Entry km/h | Exit km/h | Paved edge | Rail | Impacts | First rail | Same / opposite impacts | Max inward/rail | Max outward/rail | Max auto loss |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |',
        ...rows,
    ].join('\n') + '\n';
}

function summarizeThreat(scenario) {
    return {
        cornerId: scenario.cornerId,
        impactCount: scenario.impactCount,
        maxShoulderRatio: scenario.maxShoulderRatio,
        timeToPavedEdgeSec: scenario.timeToPavedEdgeSec,
        timeToRailSec: scenario.timeToRailSec,
    };
}

function summarizeCollisionTrajectory(scenario) {
    return {
        cornerId: scenario.cornerId,
        firstImpactSide: scenario.firstImpactSide,
        injectedSteeringVelocity: scenario.impactEvents[0]?.steeringVelocityAfter ?? 0,
        maxPostImpactInwardRailRatio: scenario.maxPostImpactInwardRailRatio,
        oppositeRailImpactCount: scenario.oppositeRailImpactCount,
        sameRailImpactCount: scenario.sameRailImpactCount,
    };
}

function formatRailSide(side) {
    return side < 0 ? 'left' : side > 0 ? 'right' : '—';
}

function rawSpeedForDisplayKmh(speedKmh) {
    return 760 * speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh;
}

function displaySpeed(speed) {
    return getDisplaySpeedKmh(
        speed,
        760,
        RAVEN_COUPE_ENGINE_PROFILE,
    );
}

function speedNowFallback(player) {
    return displaySpeed(player.speed);
}

function formatTime(value) {
    return value === null ? '—' : `${value.toFixed(3)}s`;
}

function roundNullable(value) {
    return value === null ? null : round(value);
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function round(value) {
    return Number(value.toFixed(4));
}
