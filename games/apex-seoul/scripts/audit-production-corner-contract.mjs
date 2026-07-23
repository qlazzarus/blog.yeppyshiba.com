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
    getRoadSegment,
} from '../src/game/road.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const FRAME_SECONDS = 1 / 60;
const TIMELINE_SAMPLE_INTERVAL = 0.1;
const PLAYER_ROAD_CONTACT_DISTANCE = 260;
const SLOPE_SAMPLE_DISTANCE = 720;
const GRAVITY_ACCELERATION = 360;
const MAX_SLOPE_ACCELERATION = 115;
const CORNER_ACTIVE_CURVE = 0.08;
const STRONG_CURVE = 0.4;
const FIXED_SPEED_KMH = 185;
const FIXED_LOW_SPEED_KMH = 120;
const FIXED_START_Z = 16 * 240;
const FIXED_END_Z = 40 * 240;
const LAUNCH_END_Z = 30_000;
const HR_S_CURVE_START_Z = 83_520 * 0.16;
const HR_S_CURVE_END_Z = 83_520 * 0.36;
const MAX_RUN_SECONDS = 70;

const cli = {
    cornerInertiaMax: null,
    outputDir: 'assets/telemetry/generated/corner-production',
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--output-dir' && next) {
        cli.outputDir = next;
        index += 1;
    } else if (arg === '--corner-inertia-max' && next) {
        cli.cornerInertiaMax = Number(next);
        index += 1;
    }
}

const track = createBugakRidgeDownhillTrack();
const scenarios = [
    runProductionScenario({
        endZ: LAUNCH_END_Z,
        id: 'bugak-launch-u2-no-input',
        initialSpeedKmh: 0,
        longitudinalScale: 2,
        maintainSpeed: false,
        startZ: 0,
    }),
    runProductionScenario({
        endZ: FIXED_END_Z,
        id: 'bugak-first-corner-185-u1-no-input',
        initialSpeedKmh: FIXED_SPEED_KMH,
        longitudinalScale: 1,
        maintainSpeed: true,
        startZ: FIXED_START_Z,
    }),
    runProductionScenario({
        endZ: FIXED_END_Z,
        id: 'bugak-first-corner-185-u2-no-input',
        initialSpeedKmh: FIXED_SPEED_KMH,
        longitudinalScale: 2,
        maintainSpeed: true,
        startZ: FIXED_START_Z,
    }),
    runProductionScenario({
        endZ: FIXED_END_Z,
        id: 'bugak-first-corner-120-u2-no-input',
        initialSpeedKmh: FIXED_LOW_SPEED_KMH,
        longitudinalScale: 2,
        maintainSpeed: true,
        startZ: FIXED_START_Z,
    }),
    runProductionScenario({
        endZ: FIXED_END_Z,
        id: 'bugak-first-corner-185-u2-free-no-input',
        initialSpeedKmh: FIXED_SPEED_KMH,
        longitudinalScale: 2,
        maintainSpeed: false,
        startZ: FIXED_START_Z,
    }),
    runProductionScenario({
        endZ: FIXED_END_Z,
        id: 'bugak-first-corner-185-u2-prepared-grip',
        initialSpeedKmh: FIXED_SPEED_KMH,
        inputAt: ({ contactZ, physicsCurve, player }) => {
            const liftPreparing = contactZ < 4_500;
            const cornerActive = Math.abs(physicsCurve) >= CORNER_ACTIVE_CURVE;
            const targetHeadingError = cornerActive
                ? Math.sign(physicsCurve) * 0.15
                : 0;
            const headingCorrection = clamp(
                (targetHeadingError - player.vehicleHeadingError) * 1.35,
                -0.58,
                0.58,
            );
            const steerAxis = cornerActive || Math.abs(player.vehicleHeadingError) >= 0.02
                ? headingCorrection
                : 0;

            return {
                accelPressed: !liftPreparing,
                brakePressed: false,
                steerAxis,
            };
        },
        longitudinalScale: 2,
        maintainSpeed: false,
        startZ: FIXED_START_Z,
    }),
];

const launchU2 = findScenario('bugak-launch-u2-no-input');
const fixedU1 = findScenario('bugak-first-corner-185-u1-no-input');
const fixedU2 = findScenario('bugak-first-corner-185-u2-no-input');
const fixedLowU2 = findScenario('bugak-first-corner-120-u2-no-input');
const freeNoInputU2 = findScenario('bugak-first-corner-185-u2-free-no-input');
const preparedGripU2 = findScenario('bugak-first-corner-185-u2-prepared-grip');
const fixedU1Corner = getOnlyStrongCorner(fixedU1);
const fixedU2Corner = getOnlyStrongCorner(fixedU2);
const fixedLowU2Corner = getOnlyStrongCorner(fixedLowU2);
const freeNoInputU2Corner = getOnlyStrongCorner(freeNoInputU2);
const preparedGripU2Corner = getOnlyStrongCorner(preparedGripU2);
const durationRatio = fixedU2Corner.durationSec / fixedU1Corner.durationSec;
const outwardRatio = fixedU2Corner.maxOutwardDelta /
    Math.max(0.001, fixedU1Corner.maxOutwardDelta);
const highLowInertiaRatio = fixedU2Corner.maxAbsCornerInertia /
    Math.max(0.001, fixedLowU2Corner.maxAbsCornerInertia);
const preparedOutwardRatio = preparedGripU2Corner.maxOutwardRoadRatio /
    Math.max(0.001, freeNoInputU2Corner.maxOutwardRoadRatio);
const preparedExitSpeedAdvantage =
    preparedGripU2.endSpeedKmh -
    freeNoInputU2.endSpeedKmh;
const autoScrubCorner = launchU2.corners.find((corner) => (
    corner.speedLossKmh >= 15 &&
    corner.maxCornerLossForce >= 100
));

const diagnosisChecks = [
    check(
        'bugak-production-track-loaded',
        track.id === 'bugak-ridge-downhill' &&
            track.segments.length === 348 &&
            track.length === 83_520,
        {
            id: track.id,
            length: track.length,
            segments: track.segments.length,
        },
    ),
    check(
        'launch-u2-observes-multiple-strong-corners',
        launchU2.corners.length >= 3,
        { strongCornerCount: launchU2.corners.length },
    ),
    check(
        'corner-inertia-executes-in-production-replay',
        launchU2.maxAbsCornerInertia >= 30,
        { maxAbsCornerInertia: launchU2.maxAbsCornerInertia },
    ),
    check(
        'neutral-input-does-not-apply-position-centering',
        launchU2.maxAbsNeutralCenteringForce <= 0.0001,
        {
            maxAbsNeutralCenteringForce: launchU2.maxAbsNeutralCenteringForce,
            neutralSampleCount: launchU2.neutralSampleCount,
        },
    ),
    check(
        'persistent-heading-creates-absolute-threat',
        launchU2.maxAbsOffsetPavedRatio >= 0.9 &&
            launchU2.maxShoulderRatio > 0 &&
            launchU2.guardrailImpactCount > 0,
        {
            guardrailImpactCount: launchU2.guardrailImpactCount,
            maxAbsOffsetRoadRatio: launchU2.maxAbsOffsetRoadRatio,
            maxShoulderRatio: launchU2.maxShoulderRatio,
            maxRelativeOutwardRoadRatio: Math.max(
                ...launchU2.corners.map((corner) => corner.maxOutwardRoadRatio),
            ),
        },
    ),
    check(
        'u2-halves-first-corner-time-window',
        durationRatio >= 0.45 && durationRatio <= 0.55,
        {
            durationRatio: round(durationRatio),
            u1DurationSec: fixedU1Corner.durationSec,
            u2DurationSec: fixedU2Corner.durationSec,
        },
    ),
    check(
        'u1-u2-spatial-risk-is-stable',
        outwardRatio >= 0.9 && outwardRatio <= 1.1,
        {
            outwardRatio: round(outwardRatio),
            u1MaxOutwardDelta: fixedU1Corner.maxOutwardDelta,
            u2MaxOutwardDelta: fixedU2Corner.maxOutwardDelta,
        },
    ),
    check(
        'production-corner-risk-scales-nonlinearly-with-speed',
        highLowInertiaRatio >= 1.35,
        {
            highLowInertiaRatio: round(highLowInertiaRatio),
            highSpeedKmh: FIXED_SPEED_KMH,
            highSpeedMaxAbsCornerInertia: fixedU2Corner.maxAbsCornerInertia,
            lowSpeedKmh: FIXED_LOW_SPEED_KMH,
            lowSpeedMaxAbsCornerInertia: fixedLowU2Corner.maxAbsCornerInertia,
        },
    ),
    check(
        'trajectory-precedes-automatic-scrub',
        Boolean(launchU2.firstTrajectoryScrub) &&
            launchU2.firstTrajectoryScrub.outwardRoadRatio >= 0.16,
        launchU2.firstTrajectoryScrub ?? { outwardRoadRatio: null },
    ),
    check(
        's-curve-no-input-reaches-absolute-threat',
        launchU2.sCurveWindow.strongCurveDirections.length === 2 &&
            launchU2.sCurveWindow.lateralSpan >= 500 &&
            launchU2.sCurveWindow.maxAbsOffsetPavedRatio >= 0.9 &&
            launchU2.sCurveWindow.maxShoulderRatio > 0 &&
            launchU2.sCurveWindow.guardrailImpactCountDelta > 0,
        launchU2.sCurveWindow,
    ),
    check(
        'base-and-contact-curve-mismatch-is-measurable',
        launchU2.maxAbsContactCurveDelta >= 0.03,
        { maxAbsContactCurveDelta: launchU2.maxAbsContactCurveDelta },
    ),
    check(
        'preview-demand-is-spatial-not-point-curve',
        launchU2.maxAbsPreviewCurveDelta >= 0.03,
        { maxAbsPreviewCurveDelta: launchU2.maxAbsPreviewCurveDelta },
    ),
    check(
        'road-yaw-demand-is-conserved',
        launchU2.maxYawDecompositionError <= 0.0001 &&
            launchU2.minGripFollowAuthority < 0.9 &&
            launchU2.maxGripFollowAuthority <= 0.98,
        {
            maxGripFollowAuthority: launchU2.maxGripFollowAuthority,
            maxYawDecompositionError: launchU2.maxYawDecompositionError,
            minGripFollowAuthority: launchU2.minGripFollowAuthority,
        },
    ),
    check(
        'soft-heading-response-avoids-safety-clamp',
        scenarios.every((scenario) => scenario.maxAbsVehicleHeadingError < 1.1),
        {
            maxHeadingByScenario: scenarios.map((scenario) => ({
                id: scenario.id,
                maxAbsVehicleHeadingError: scenario.maxAbsVehicleHeadingError,
            })),
        },
    ),
];

const approvalChecks = [
    check(
        'selected-sharp-no-input-threatens-shoulder',
        launchU2.corners.some((corner) => (
            corner.peakAbsCurve >= 0.6 &&
            (
                corner.maxAbsOffsetPavedRatio >= 0.9 ||
                corner.maxShoulderRatio > 0 ||
                corner.railImpactCountDelta > 0
            )
        )),
        {
            sharpCorners: launchU2.corners
                .filter((corner) => corner.peakAbsCurve >= 0.6)
                .map(({
                    id,
                    maxAbsOffsetPavedRatio,
                    maxAbsOffsetRoadRatio,
                    maxOutwardRoadRatio,
                    maxShoulderRatio,
                    railImpactCountDelta,
                }) => ({
                    id,
                    maxAbsOffsetPavedRatio,
                    maxAbsOffsetRoadRatio,
                    maxOutwardRoadRatio,
                    maxShoulderRatio,
                    railImpactCountDelta,
                })),
        },
    ),
    check(
        'u1-u2-risk-relationship-is-preserved',
        outwardRatio >= 0.9 && outwardRatio <= 1.1,
        { outwardRatio: round(outwardRatio) },
    ),
    check(
        'physics-curve-matches-contact-curve',
        launchU2.maxAbsPhysicsCurveDelta <= 0.0001,
        { maxAbsPhysicsCurveDelta: launchU2.maxAbsPhysicsCurveDelta },
    ),
    check(
        'automatic-scrub-does-not-create-a-safe-line',
        launchU2.maxAbsOffsetPavedRatio >= 0.9 ||
            launchU2.maxShoulderRatio > 0 ||
            launchU2.guardrailImpactCount > 0,
        autoScrubCorner
            ? {
                cornerId: autoScrubCorner.id,
                maxAbsOffsetPavedRatio: autoScrubCorner.maxAbsOffsetPavedRatio,
                maxOutwardRoadRatio: autoScrubCorner.maxOutwardRoadRatio,
                maxShoulderRatio: autoScrubCorner.maxShoulderRatio,
                speedLossKmh: autoScrubCorner.speedLossKmh,
            }
            : {
                cornerId: null,
                maxAbsOffsetPavedRatio: launchU2.maxAbsOffsetPavedRatio,
                maxShoulderRatio: launchU2.maxShoulderRatio,
            },
    ),
    check(
        'prepared-grip-reduces-outward-trajectory',
        preparedOutwardRatio <= 0.95 &&
            preparedGripU2.maxShoulderRatio === 0 &&
            preparedGripU2.guardrailImpactCount === 0,
        {
            noInputOutwardRoadRatio: freeNoInputU2Corner.maxOutwardRoadRatio,
            preparedOutwardRatio: round(preparedOutwardRatio),
            preparedOutwardRoadRatio: preparedGripU2Corner.maxOutwardRoadRatio,
        },
    ),
    check(
        'prepared-grip-earns-higher-exit-speed',
        preparedExitSpeedAdvantage >= 1,
        {
            exitSpeedAdvantageKmh: round(preparedExitSpeedAdvantage),
            noInputSectionEndSpeedKmh: freeNoInputU2.endSpeedKmh,
            preparedSectionEndSpeedKmh: preparedGripU2.endSpeedKmh,
        },
    ),
];

const diagnosisPass = diagnosisChecks.every((entry) => entry.pass);
const contractReady = approvalChecks.every((entry) => entry.pass);
const report = {
    approvalChecks,
    config: {
        activeCurveThreshold: CORNER_ACTIVE_CURVE,
        contactDistance: PLAYER_ROAD_CONTACT_DISTANCE,
        fixedEndZ: FIXED_END_Z,
        fixedLowSpeedKmh: FIXED_LOW_SPEED_KMH,
        fixedSpeedKmh: FIXED_SPEED_KMH,
        fixedStartZ: FIXED_START_Z,
        frameSeconds: FRAME_SECONDS,
        cornerInertiaMaxLateralSpeed:
            cli.cornerInertiaMax ?? createPlayerControllerBaselineConfig().cornerInertiaMaxLateralSpeed,
        launchEndZ: LAUNCH_END_Z,
        lateralDebtContract: 'preview road-yaw demand minus passive grip yaw drives persistent soft-slip debt',
        physicsCurveSource: 'near/far preview rooted at interpolated player road contact',
        sCurveEndZ: HR_S_CURVE_END_Z,
        sCurveStartZ: HR_S_CURVE_START_Z,
        strongCurveThreshold: STRONG_CURVE,
    },
    contractReady,
    diagnosisChecks,
    diagnosisPass,
    generatedAt: new Date().toISOString(),
    purpose: 'HR-3 production corner contract; verify preview demand, passive grip yaw, residual soft-slip debt, and prepared grip advantage.',
    scenarios,
    schemaVersion: 4,
    status: diagnosisPass
        ? contractReady
            ? 'HR3_GAMEPLAY_CONTRACT_READY'
            : 'HR3_PRODUCTION_TUNING_BLOCKED'
        : 'INVALID_BASELINE',
    track: {
        id: track.id,
        length: track.length,
        name: track.name,
        segmentLength: track.segmentLength,
        segments: track.segments.length,
    },
};

const outputDir = resolveProjectPath(cli.outputDir);
const jsonPath = path.join(outputDir, 'production-corner-contract.json');
const markdownPath = path.join(outputDir, 'production-corner-contract.md');

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdownReport(report));

console.log(`HR-3 production corner contract: ${report.status}`);
console.log(`Diagnosis checks: ${countPasses(diagnosisChecks)}/${diagnosisChecks.length} PASS`);
console.log(`Approval checks: ${countPasses(approvalChecks)}/${approvalChecks.length} PASS`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Report: ${path.relative(projectRoot, markdownPath)}`);

if (!diagnosisPass) process.exitCode = 1;

function runProductionScenario({
    endZ,
    id,
    initialSpeedKmh,
    inputAt,
    longitudinalScale,
    maintainSpeed,
    startZ,
}) {
    const initialSpeed = rawSpeedForDisplayKmh(initialSpeedKmh);
    const player = createDefaultPlayerVehicleState(
        initialSpeed,
        RAVEN_COUPE_ENGINE_PROFILE,
        760,
    );
    const samples = [];
    const timeline = [];
    let cameraZ = startZ;
    let elapsedSec = 0;
    let nextTimelineSec = 0;

    while (cameraZ < endZ && elapsedSec <= MAX_RUN_SECONDS) {
        if (maintainSpeed) player.speed = initialSpeed;

        const contactZ = cameraZ + PLAYER_ROAD_CONTACT_DISTANCE;
        const baseSegment = Math.floor(cameraZ / track.segmentLength);
        const baseCurve = getRoadSegment(track, baseSegment).curve;
        const contactCurve = getRoadCurveAt(track, contactZ);
        const headingPreview = getRoadHeadingPreview(track, contactZ);
        const physicsCurve = contactCurve;
        const pavedHalfWidth = getRoadHalfWidthAt(track, contactZ);
        const guardrailContext = {
            pavedHalfWidth,
            railContactLimit: pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
            vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
        };
        const guardrailGeometry = getGuardrailCollisionGeometry(guardrailContext);
        const pavedCenterLimit = guardrailGeometry.pavedCenterLimit;
        const railCenterLimit = guardrailGeometry.railCenterLimit;
        const controllerConfig = createPlayerControllerBaselineConfig({
            ...(Number.isFinite(cli.cornerInertiaMax)
                ? { cornerInertiaMaxLateralSpeed: cli.cornerInertiaMax }
                : {}),
            maxRoadOffset: railCenterLimit,
        });
        const speedBefore = player.speed;

        const input = inputAt?.({
            contactZ,
            elapsedSec,
            physicsCurve,
            player,
        }) ?? { accelPressed: true, brakePressed: false, steerAxis: 0 };

        updatePlayerVehicle(
            player,
            input,
            {
                currentCurve: physicsCurve,
                longitudinalScale,
                previewRoadCurve: headingPreview.demandCurve,
                slopeAcceleration: getSlopeAcceleration(cameraZ),
            },
            controllerConfig,
            FRAME_SECONDS,
        );
        applyGuardrailCollision(player, guardrailContext, FRAME_SECONDS);

        const controllerSpeedAfter = player.speed;
        if (maintainSpeed) player.speed = initialSpeed;
        const worldTravelSpeed = getLongitudinalWorldTravelSpeed(
            player.speed,
            longitudinalScale,
        );
        const sample = {
            baseCurve,
            baseSegment,
            cameraZ,
            contactCurve,
            contactCurveDelta: contactCurve - baseCurve,
            contactZ,
            cornerInertia: player.cornerInertiaLateralVelocity,
            cornerLossForce: player.cornerSpeedLoss.totalForce,
            centeringForce: player.centeringForce,
            guardrailImpactCount: player.guardrailImpactCount,
            lateralOffset: player.lateralOffset,
            lineQuality: player.cornerDemand.lineQuality,
            outwardRoadRatio: Math.max(
                0,
                -Math.sign(physicsCurve) * player.lateralOffset / railCenterLimit,
            ),
            physicalSpeedAfterKmh: displaySpeed(controllerSpeedAfter),
            physicalSpeedBeforeKmh: displaySpeed(speedBefore),
            pavedCenterLimit,
            passiveGripYawRate: player.passiveGripYawRate,
            gripFollowAuthority: player.gripFollowAuthority,
            physicsCurve,
            physicsCurveDelta: physicsCurve - contactCurve,
            railCenterLimit,
            requiredRoadYawRate: player.requiredRoadYawRate,
            residualRoadYawRate: player.residualRoadYawRate,
            previewRoadCurve: headingPreview.demandCurve,
            shoulderRatio: player.guardrailShoulderRatio,
            steerAxis: input.steerAxis,
            t: elapsedSec,
            trajectoryScrubRatio: player.cornerSpeedLoss.trajectoryScrubRatio,
            vehicleHeadingError: player.vehicleHeadingError,
            worldTravelSpeed,
        };
        samples.push(sample);

        if (elapsedSec + 1e-9 >= nextTimelineSec) {
            timeline.push(roundSample(sample));
            nextTimelineSec += TIMELINE_SAMPLE_INTERVAL;
        }

        cameraZ += worldTravelSpeed * FRAME_SECONDS;
        elapsedSec += FRAME_SECONDS;
    }

    const corners = collectCornerWindows(samples);

    return {
        corners,
        durationSec: round(elapsedSec),
        endSpeedKmh: round(displaySpeed(player.speed)),
        endZ: round(cameraZ),
        firstTrajectoryScrub: summarizeTrajectoryScrub(
            samples.find((sample) => sample.trajectoryScrubRatio >= 0.01),
        ),
        guardrailImpactCount: Math.max(...samples.map((sample) => sample.guardrailImpactCount)),
        id,
        initialSpeedKmh,
        longitudinalScale,
        maintainSpeed,
        maxAbsContactCurveDelta: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.contactCurveDelta)),
        )),
        maxAbsPhysicsCurveDelta: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.physicsCurveDelta)),
        )),
        maxAbsPreviewCurveDelta: round(Math.max(
            ...samples.map((sample) => (
                Math.abs(sample.previewRoadCurve - sample.physicsCurve)
            )),
        )),
        maxAbsCornerInertia: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.cornerInertia)),
        )),
        maxAbsNeutralCenteringForce: round(Math.max(
            ...samples
                .filter((sample) => Math.abs(sample.steerAxis) <= 0.001)
                .map((sample) => Math.abs(sample.centeringForce)),
        )),
        maxAbsVehicleHeadingError: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.vehicleHeadingError)),
        )),
        maxGripFollowAuthority: round(Math.max(
            ...samples.map((sample) => sample.gripFollowAuthority),
        )),
        maxYawDecompositionError: round(Math.max(
            ...samples.map((sample) => Math.abs(
                sample.requiredRoadYawRate -
                sample.passiveGripYawRate -
                sample.residualRoadYawRate
            )),
        )),
        minGripFollowAuthority: round(Math.min(
            ...samples.map((sample) => sample.gripFollowAuthority),
        )),
        maxAbsOffset: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.lateralOffset)),
        )),
        maxAbsOffsetPavedRatio: round(Math.max(
            ...samples.map((sample) => (
                Math.abs(sample.lateralOffset) / sample.pavedCenterLimit
            )),
        )),
        maxAbsOffsetRoadRatio: round(Math.max(
            ...samples.map((sample) => (
                Math.abs(sample.lateralOffset) / sample.railCenterLimit
            )),
        )),
        maxShoulderRatio: round(Math.max(
            ...samples.map((sample) => sample.shoulderRatio),
        )),
        neutralSampleCount: samples.filter((sample) => (
            Math.abs(sample.steerAxis) <= 0.001
        )).length,
        maxTrajectoryScrubRatio: round(Math.max(
            ...samples.map((sample) => sample.trajectoryScrubRatio),
        )),
        sampleCount: samples.length,
        sCurveWindow: summarizeSWindow(samples),
        startZ,
        timeline,
    };
}

function collectCornerWindows(samples) {
    const windows = [];
    let active = null;

    for (const sample of samples) {
        const direction = Math.sign(sample.baseCurve);
        const isCorner = Math.abs(sample.baseCurve) > CORNER_ACTIVE_CURVE;
        const continues = active &&
            isCorner &&
            direction === active.direction;

        if (active && !continues) {
            windows.push(finishCornerWindow(active, windows.length));
            active = null;
        }

        if (!active && isCorner) {
            active = {
                direction,
                samples: [],
            };
        }

        if (active) active.samples.push(sample);
    }

    if (active) windows.push(finishCornerWindow(active, windows.length));

    return windows.filter((corner) => corner.peakAbsCurve >= STRONG_CURVE);
}

function finishCornerWindow(window, index) {
    const samples = window.samples;
    const entry = samples[0];
    const exit = samples.at(-1);
    const apex = samples.reduce((best, sample) => (
        Math.abs(sample.baseCurve) > Math.abs(best.baseCurve) ? sample : best
    ), entry);
    const strongSamples = samples.filter((sample) => (
        Math.abs(sample.baseCurve) >= STRONG_CURVE
    ));
    const outwardDeltas = samples.map((sample) => (
        -window.direction * (sample.lateralOffset - entry.lateralOffset)
    ));
    const maxOutwardDelta = Math.max(0, ...outwardDeltas);
    const maxOutwardRoadRatio = Math.max(
        0,
        ...samples.map((sample) => (
            -window.direction * (sample.lateralOffset - entry.lateralOffset) /
                sample.railCenterLimit
        )),
    );

    return {
        apex: summarizePoint(apex),
        direction: window.direction,
        durationSec: round(exit.t - entry.t + FRAME_SECONDS),
        entry: summarizePoint(entry),
        exit: summarizePoint(exit),
        id: `corner-${index + 1}-${window.direction > 0 ? 'right' : 'left'}`,
        maxAbsContactCurveDelta: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.contactCurveDelta)),
        )),
        maxAbsPhysicsCurveDelta: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.physicsCurveDelta)),
        )),
        maxAbsCornerInertia: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.cornerInertia)),
        )),
        maxAbsVehicleHeadingError: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.vehicleHeadingError)),
        )),
        maxAbsOffsetPavedRatio: round(Math.max(
            ...samples.map((sample) => (
                Math.abs(sample.lateralOffset) / sample.pavedCenterLimit
            )),
        )),
        maxAbsOffsetRoadRatio: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.lateralOffset) / sample.railCenterLimit),
        )),
        maxCornerLossForce: round(Math.max(
            ...samples.map((sample) => sample.cornerLossForce),
        )),
        maxOutwardDelta: round(maxOutwardDelta),
        maxOutwardRoadRatio: round(maxOutwardRoadRatio),
        maxShoulderRatio: round(Math.max(
            ...samples.map((sample) => sample.shoulderRatio),
        )),
        minLineQuality: round(Math.min(
            ...samples.map((sample) => sample.lineQuality),
        )),
        peakAbsCurve: round(Math.abs(apex.baseCurve)),
        railImpactCountDelta:
            exit.guardrailImpactCount - entry.guardrailImpactCount,
        speedLossKmh: round(Math.max(
            0,
            entry.physicalSpeedBeforeKmh - exit.physicalSpeedAfterKmh,
        )),
        strongDurationSec: strongSamples.length > 0
            ? round(strongSamples.at(-1).t - strongSamples[0].t + FRAME_SECONDS)
            : 0,
    };
}

function summarizePoint(sample) {
    return {
        baseCurve: round(sample.baseCurve),
        cameraZ: round(sample.cameraZ),
        contactCurve: round(sample.contactCurve),
        contactZ: round(sample.contactZ),
        lateralOffset: round(sample.lateralOffset),
        physicalSpeedKmh: round(sample.physicalSpeedAfterKmh),
        pavedCenterLimit: round(sample.pavedCenterLimit),
        physicsCurve: round(sample.physicsCurve),
        railCenterLimit: round(sample.railCenterLimit),
        t: round(sample.t),
    };
}

function roundSample(sample) {
    return {
        baseCurve: round(sample.baseCurve),
        baseSegment: sample.baseSegment,
        cameraZ: round(sample.cameraZ),
        contactCurve: round(sample.contactCurve),
        contactCurveDelta: round(sample.contactCurveDelta),
        contactZ: round(sample.contactZ),
        cornerInertia: round(sample.cornerInertia),
        cornerLossForce: round(sample.cornerLossForce),
        centeringForce: round(sample.centeringForce),
        lateralOffset: round(sample.lateralOffset),
        physicalSpeedKmh: round(sample.physicalSpeedAfterKmh),
        pavedCenterLimit: round(sample.pavedCenterLimit),
        physicsCurve: round(sample.physicsCurve),
        physicsCurveDelta: round(sample.physicsCurveDelta),
        railCenterLimit: round(sample.railCenterLimit),
        shoulderRatio: round(sample.shoulderRatio),
        steerAxis: round(sample.steerAxis),
        t: round(sample.t),
        trajectoryScrubRatio: round(sample.trajectoryScrubRatio),
        vehicleHeadingError: round(sample.vehicleHeadingError),
        worldTravelSpeed: round(sample.worldTravelSpeed),
    };
}

function summarizeTrajectoryScrub(sample) {
    if (!sample) return null;

    return {
        cameraZ: round(sample.cameraZ),
        outwardRoadRatio: round(sample.outwardRoadRatio),
        physicalSpeedKmh: round(sample.physicalSpeedAfterKmh),
        t: round(sample.t),
        trajectoryScrubRatio: round(sample.trajectoryScrubRatio),
    };
}

function summarizeSWindow(samples) {
    const windowSamples = samples.filter((sample) => (
        sample.cameraZ >= HR_S_CURVE_START_Z &&
        sample.cameraZ <= HR_S_CURVE_END_Z
    ));
    if (windowSamples.length === 0) return null;

    const entry = windowSamples[0];
    const exit = windowSamples.at(-1);
    const strongCurveDirections = [...new Set(
        windowSamples
            .filter((sample) => Math.abs(sample.physicsCurve) >= STRONG_CURVE)
            .map((sample) => Math.sign(sample.physicsCurve)),
    )].sort((left, right) => left - right);

    return {
        endProgressRatio: round(exit.cameraZ / track.length),
        guardrailImpactCountDelta:
            exit.guardrailImpactCount - entry.guardrailImpactCount,
        lateralOffsetEnd: round(exit.lateralOffset),
        lateralOffsetStart: round(entry.lateralOffset),
        lateralSpan: round(
            Math.max(...windowSamples.map((sample) => sample.lateralOffset)) -
            Math.min(...windowSamples.map((sample) => sample.lateralOffset)),
        ),
        maxAbsOffsetPavedRatio: round(Math.max(
            ...windowSamples.map((sample) => (
                Math.abs(sample.lateralOffset) / sample.pavedCenterLimit
            )),
        )),
        maxAbsOffsetRoadRatio: round(Math.max(
            ...windowSamples.map((sample) => (
                Math.abs(sample.lateralOffset) / sample.railCenterLimit
            )),
        )),
        maxShoulderRatio: round(Math.max(
            ...windowSamples.map((sample) => sample.shoulderRatio),
        )),
        vehicleHeadingErrorEnd: round(exit.vehicleHeadingError),
        vehicleHeadingErrorStart: round(entry.vehicleHeadingError),
        startProgressRatio: round(entry.cameraZ / track.length),
        strongCurveDirections,
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

function findScenario(id) {
    const scenario = scenarios.find((entry) => entry.id === id);
    if (!scenario) throw new Error(`Missing scenario ${id}`);
    return scenario;
}

function getOnlyStrongCorner(scenario) {
    if (scenario.corners.length !== 1) {
        throw new Error(
            `${scenario.id} expected one strong corner, got ${scenario.corners.length}`,
        );
    }
    return scenario.corners[0];
}

function buildMarkdownReport(value) {
    const lines = [
        '# Apex Seoul HR-3 Preview Grip / Residual Slip Contract',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.status}**`,
        '',
        'HR-3 samples near/far road demand, assigns normal tire yaw without lateral-position centering, and turns only the unmet yaw into persistent soft slip.',
        '',
        '## Diagnosis',
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...value.diagnosisChecks.map(formatCheckRow),
        '',
        '## Gameplay approval contract',
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...value.approvalChecks.map(formatCheckRow),
        '',
        '## Scenario summary',
        '',
        '| Scenario | Scale | Fixed speed | Duration | Max offset/paved | Max offset/rail | Max heading | Max inertia | Shoulder | Impacts |',
        '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.scenarios.map((scenario) => (
            `| ${scenario.id} | ${format(scenario.longitudinalScale)} | ` +
            `${scenario.maintainSpeed ? `${scenario.initialSpeedKmh}km/h` : 'launch'} | ` +
            `${format(scenario.durationSec)}s | ${format(scenario.maxAbsOffsetPavedRatio)} | ` +
            `${format(scenario.maxAbsOffsetRoadRatio)} | ` +
            `${format(scenario.maxAbsVehicleHeadingError)}rad | ` +
            `${format(scenario.maxAbsCornerInertia)}u/s | ` +
            `${format(scenario.maxShoulderRatio)} | ${scenario.guardrailImpactCount} |`
        )),
        '',
        '## Strong corner windows',
        '',
        '| Scenario | Corner | Peak | Duration | Strong | Speed loss | Outward | Outward/road | Shoulder |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.scenarios.flatMap((scenario) => scenario.corners.map((corner) => (
            `| ${scenario.id} | ${corner.id} | ${format(corner.peakAbsCurve)} | ` +
            `${format(corner.durationSec)}s | ${format(corner.strongDurationSec)}s | ` +
            `${format(corner.speedLossKmh)}km/h | ${format(corner.maxOutwardDelta)}u | ` +
            `${format(corner.maxOutwardRoadRatio)} | ${format(corner.maxShoulderRatio)} |`
        ))),
        '',
        '## Interpretation',
        '',
        '- Near/far road preview starts corner demand before the point curve reaches its peak and smooths curve exit.',
        '- Passive grip yaw consumes speed- and grade-dependent road demand without pulling lateral position toward road center.',
        '- Only residual road yaw and steering update persistent heading debt; lateral speed uses a soft tanh response instead of the old ±0.62rad clamp.',
        '- Neutral steering applies exactly zero lateral-position centering force; velocity damping can settle motion without seeking road center.',
        '- Selected overspeed sharp corners still threaten shoulder/rail when ignored.',
        '- Prepared lift and heading-aware turn-in avoid shoulder/rail and retain more speed by the end of the same section.',
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function formatCheckRow(entry) {
    return `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | \`${escapeTable(
        JSON.stringify(entry.evidence),
    )}\` |`;
}

function escapeTable(value) {
    return value.replaceAll('|', '\\|');
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function countPasses(checks) {
    return checks.filter((entry) => entry.pass).length;
}

function format(value) {
    return typeof value === 'number' ? String(round(value)) : String(value);
}

function resolveProjectPath(value) {
    return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
