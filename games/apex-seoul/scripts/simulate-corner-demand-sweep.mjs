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
import {
    createDefaultPlayerVehicleState,
    getCornerGrade,
    getCornerIntensity,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    createBugakRidgeDownhillTrack,
    getRoadElevationAt,
} from '../src/game/road.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const ACCEL_SPEED = 760;
const CORNER_START_SEC = 1;
const CORNER_END_SEC = 3.5;
const APEX_SEC = (CORNER_START_SEC + CORNER_END_SEC) / 2;
const DURATION_SEC = 4.5;
const GRAVITY_ACCELERATION = 360;
const MAX_SLOPE_ACCELERATION = 115;
const SLOPE_SAMPLE_DISTANCE = 720;
const SPEEDS_KMH = [130, 160, 195, 225];
const PREPARATION_MODES = ['full-throttle', 'lift', 'brake-prepared'];
const SYNTHETIC_SLOPES = [
    { id: 'level', slopeAcceleration: 0 },
    { id: 'downhill', slopeAcceleration: 65 },
];
const GRADE_FIXTURES = [
    { curve: 0.2, id: 'easy', pavedHalfWidth: 960, steerAxis: 0.45 },
    { curve: 0.4, id: 'medium', pavedHalfWidth: 870, steerAxis: 0.58 },
    { curve: 0.62, id: 'sharp', pavedHalfWidth: 820, steerAxis: 0.58 },
];
const TRACK_SEGMENT_FIXTURES = [
    { expectedGrade: 'easy', id: 'bugak-easy-21', segmentIndex: 21 },
    { expectedGrade: 'medium', id: 'bugak-medium-26', segmentIndex: 26 },
    { expectedGrade: 'sharp', id: 'bugak-sharp-31', segmentIndex: 31 },
];
const RECOVERY_SPEEDS_KMH = [195, 225];
const RECOVERY_MODES = ['lift-recovery', 'brake-recovery'];
const RECOVERY_START_SEC = 2;
const config = {
    outputDir: 'assets/telemetry/generated/corner-demand',
    sampleHz: 60,
    snapshotId: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--snapshot-id' && next) {
        if (!/^[a-z0-9-]+$/.test(next)) {
            throw new Error('--snapshot-id requires a lowercase alphanumeric id');
        }
        config.snapshotId = next;
        index += 1;
    }
}

const track = createBugakRidgeDownhillTrack();
const controllerDefaults = createPlayerControllerBaselineConfig();
const syntheticDefinitions = buildSyntheticDefinitions();
const recoveryDefinitions = buildRecoveryDefinitions();
const trackDefinitions = buildTrackDefinitions();
const straightControlDefinitions = buildStraightControlDefinitions();
const straightControlRows = straightControlDefinitions.map(runScenario);
const syntheticRows = syntheticDefinitions
    .map(runScenario)
    .map((row) => attachStraightControlComparison(row, straightControlRows));
const recoveryRows = recoveryDefinitions.map(runScenario);
const trackRows = trackDefinitions.map(runScenario);
const controls = simulateStandingStartControl();
const checks = buildChecks({
    controls,
    recoveryRows,
    straightControlRows,
    syntheticRows,
    trackRows,
});
const observations = buildObservations(syntheticRows, trackRows);
const generatedAt = new Date().toISOString();
const report = {
    checks,
    config: {
        apexSec: APEX_SEC,
        cornerEndSec: CORNER_END_SEC,
        cornerStartSec: CORNER_START_SEC,
        cornerSpeedLoss: {
            easyScale: controllerDefaults.cornerEasySpeedLossScale,
            pull: controllerDefaults.cornerSpeedPull,
            severeFullRatio: controllerDefaults.cornerSevereOverspeedFullRatio,
            severeLineScale: controllerDefaults.cornerSevereLineScrubScale,
            severeScrub: controllerDefaults.cornerSevereOverspeedScrub,
            severeStartRatio: controllerDefaults.cornerSevereOverspeedStartRatio,
        },
        understeerTrajectory: {
            brakeTargetScale: controllerDefaults.overspeedUndersteerBrakeTargetScale,
            easyRoadMaxRatio: controllerDefaults.overspeedEasyRoadMaxRatio,
            liftTargetScale: controllerDefaults.overspeedUndersteerLiftTargetScale,
            mediumRoadMaxRatio: controllerDefaults.overspeedMediumRoadMaxRatio,
            roadBuildRate: controllerDefaults.overspeedUndersteerRoadBuildRate,
            roadMaxRatio: controllerDefaults.overspeedUndersteerRoadMaxRatio,
            roadRecoveryRate: controllerDefaults.overspeedUndersteerRoadRecoveryRate,
            roadSpeedRate: controllerDefaults.overspeedUndersteerRoadSpeedRate,
            steerInputFull: controllerDefaults.overspeedUndersteerSteerInputFull,
            steerInputStart: controllerDefaults.overspeedUndersteerMinSteerInput,
        },
        durationSec: DURATION_SEC,
        grades: GRADE_FIXTURES.map(({ curve, id, pavedHalfWidth, steerAxis }) => ({
            curve,
            id,
            pavedHalfWidth,
            railContactLimit: getPhysicalRoadOffsetLimit(pavedHalfWidth),
            railOffset: getPhysicalRailOffset(pavedHalfWidth),
            steerAxis,
        })),
        preparationModes: PREPARATION_MODES,
        recoveryModes: RECOVERY_MODES,
        sampleHz: config.sampleHz,
        slopes: SYNTHETIC_SLOPES,
        speedsKmh: SPEEDS_KMH,
    },
    controls,
    generatedAt,
    observations,
    pass: checks.every((check) => check.pass),
    recoveryRows,
    schemaVersion: 5,
    straightControlRows,
    syntheticRows,
    track: {
        id: track.id,
        name: track.name,
        rows: trackRows,
        segmentFixtures: trackDefinitions.map((definition) => definition.metadata),
    },
};
const outputDir = resolveProjectPath(config.outputDir);
const jsonPath = path.join(outputDir, 'corner-demand-baseline.json');
const markdownPath = path.join(outputDir, 'corner-demand-baseline.md');

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdownReport(report));

if (config.snapshotId) {
    const snapshotJsonPath = path.join(
        outputDir,
        `corner-demand-${config.snapshotId}-baseline.json`,
    );
    const snapshotMarkdownPath = path.join(
        outputDir,
        `corner-demand-${config.snapshotId}-baseline.md`,
    );

    await writeFile(snapshotJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(snapshotMarkdownPath, buildMarkdownReport(report));
    console.log(`Snapshot JSON: ${path.relative(projectRoot, snapshotJsonPath)}`);
    console.log(`Snapshot table: ${path.relative(projectRoot, snapshotMarkdownPath)}`);
}

console.log(`Corner demand sweep: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`Synthetic scenarios: ${syntheticRows.length}`);
console.log(`Recovery scenarios: ${recoveryRows.length}`);
console.log(`Straight controls: ${straightControlRows.length}`);
console.log(`Bugak segment scenarios: ${trackRows.length}`);
console.log(`0-100 control: ${format(controls.zeroTo100Sec, 3)}s`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
for (const observation of observations) console.log(`- ${observation}`);

if (!report.pass) process.exitCode = 1;

function buildSyntheticDefinitions() {
    return SPEEDS_KMH.flatMap((speedKmh) =>
        GRADE_FIXTURES.flatMap((grade) =>
            SYNTHETIC_SLOPES.flatMap((slope) =>
                PREPARATION_MODES.map((preparationMode) => createScenarioDefinition({
                    grade,
                    id: `synthetic-${grade.id}-${slope.id}-${speedKmh}-${preparationMode}`,
                    kind: 'synthetic',
                    preparationMode,
                    slopeAcceleration: slope.slopeAcceleration,
                    slopeId: slope.id,
                    speedKmh,
                })),
            ),
        ),
    );
}

function buildStraightControlDefinitions() {
    const straight = {
        curve: 0,
        id: 'straight',
        pavedHalfWidth: 960,
        steerAxis: 0,
    };

    return SPEEDS_KMH.flatMap((speedKmh) =>
        SYNTHETIC_SLOPES.flatMap((slope) =>
            PREPARATION_MODES.map((preparationMode) => createScenarioDefinition({
                grade: straight,
                id: `control-straight-${slope.id}-${speedKmh}-${preparationMode}`,
                kind: 'straight-control',
                preparationMode,
                slopeAcceleration: slope.slopeAcceleration,
                slopeId: slope.id,
                speedKmh,
            })),
        ),
    );
}

function buildRecoveryDefinitions() {
    return RECOVERY_SPEEDS_KMH.flatMap((speedKmh) =>
        GRADE_FIXTURES.filter((grade) => grade.id !== 'easy').flatMap((grade) =>
            SYNTHETIC_SLOPES.flatMap((slope) =>
                RECOVERY_MODES.map((preparationMode) => createScenarioDefinition({
                    grade,
                    id: `recovery-${grade.id}-${slope.id}-${speedKmh}-${preparationMode}`,
                    kind: 'recovery',
                    preparationMode,
                    recoveryStartSec: RECOVERY_START_SEC,
                    slopeAcceleration: slope.slopeAcceleration,
                    slopeId: slope.id,
                    speedKmh,
                })),
            ),
        ),
    );
}

function buildTrackDefinitions() {
    return TRACK_SEGMENT_FIXTURES.flatMap((fixture) => {
        const segment = track.segments[fixture.segmentIndex];
        if (!segment) throw new Error(`Missing Bugak segment ${fixture.segmentIndex}`);
        const grade = getGradeFixture(segment.curve, segment.roadHalfWidth);
        const slopeAcceleration = getTrackSlopeAcceleration(fixture.segmentIndex);
        const actualGrade = getCornerGrade(getCornerIntensity(segment.curve), createPlayerControllerBaselineConfig());

        return PREPARATION_MODES.map((preparationMode) => createScenarioDefinition({
            grade,
            id: `${fixture.id}-225-${preparationMode}`,
            kind: 'track',
            metadata: {
                actualGrade,
                curve: round(segment.curve),
                expectedGrade: fixture.expectedGrade,
                id: fixture.id,
                pavedHalfWidth: round(segment.roadHalfWidth),
                railContactLimit: round(getPhysicalRoadOffsetLimit(segment.roadHalfWidth)),
                railOffset: round(getPhysicalRailOffset(segment.roadHalfWidth)),
                segmentIndex: fixture.segmentIndex,
                slopeAcceleration: round(slopeAcceleration),
            },
            preparationMode,
            slopeAcceleration,
            slopeId: 'track',
            speedKmh: 225,
        }));
    });
}

function getGradeFixture(curve, pavedHalfWidth) {
    const gradeId = getCornerGrade(getCornerIntensity(curve), createPlayerControllerBaselineConfig());
    const reference = GRADE_FIXTURES.find((grade) => grade.id === gradeId);

    if (!reference) throw new Error(`Unsupported track grade ${gradeId}`);

    return {
        ...reference,
        curve,
        pavedHalfWidth,
        steerAxis: Math.sign(curve || 1) * reference.steerAxis,
    };
}

function createScenarioDefinition({
    grade,
    id,
    kind,
    metadata = null,
    preparationMode,
    recoveryStartSec = null,
    slopeAcceleration,
    slopeId,
    speedKmh,
}) {
    return {
        curve: grade.curve,
        grade: grade.id,
        id,
        initialSpeed: kmhToRaw(speedKmh),
        kind,
        maxRoadOffset: getPhysicalRoadOffsetLimit(grade.pavedHalfWidth),
        metadata,
        pavedHalfWidth: grade.pavedHalfWidth,
        preparationMode,
        recoveryStartSec,
        slopeAcceleration,
        slopeId,
        speedKmh,
        steerAxis: Math.sign(grade.curve || 1) * Math.abs(grade.steerAxis),
    };
}

function runScenario(definition) {
    const controllerConfig = createPlayerControllerBaselineConfig({
        maxRoadOffset: definition.maxRoadOffset,
    });
    const player = createDefaultPlayerVehicleState(
        definition.initialSpeed,
        controllerConfig.engineProfile,
        controllerConfig.accelSpeed,
    );
    const samples = [];
    const dt = 1 / config.sampleHz;
    const steps = Math.round(DURATION_SEC * config.sampleHz);

    for (let step = 0; step <= steps; step += 1) {
        const t = step * dt;
        const cornerActive = t >= CORNER_START_SEC && t < CORNER_END_SEC;
        const input = getScenarioInput(definition, t, cornerActive);
        const road = {
            currentCurve: cornerActive ? definition.curve : 0,
            slopeAcceleration: definition.slopeAcceleration,
        };
        const speedBeforeUpdate = player.speed;

        updatePlayerVehicle(player, input, road, controllerConfig, dt);
        applyGuardrailCollision(player, {
            pavedHalfWidth: definition.pavedHalfWidth,
            railContactLimit: getPhysicalRailOffset(definition.pavedHalfWidth),
            vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
        }, dt);
        samples.push({
            brakePressure: player.brakePressure,
            cornerGrade: player.cornerDemand.grade,
            cornerIntensity: player.cornerDemand.cornerIntensity,
            cornerLineQuality: player.cornerDemand.lineQuality,
            cornerLateralDemand: player.cornerDemand.lateralDemand,
            cornerOverspeedRatio: player.cornerDemand.overspeedRatio,
            cornerSafetyMarginRatio: player.cornerDemand.safetyMarginRatio,
            cornerSevereOverspeedRatio: player.cornerDemand.severeOverspeedRatio,
            cornerSpeedBudget: player.cornerDemand.targetSpeed,
            cornerSpeedLossZone: player.cornerDemand.speedLossZone,
            cornerSpeedOverBudget: player.cornerDemand.speedOverBudget,
            cornerSpeedRatioToBudget: player.cornerDemand.speedRatioToBudget,
            counterRoadScrubForce: player.cornerSpeedLoss.counterRoadScrubForce,
            downhillScrubForce: player.cornerSpeedLoss.downhillScrubForce,
            driftRatio: player.driftRatio,
            driftState: player.driftState,
            gripSteerAngleLimit: player.gripSteerAngleLimit,
            guardrailImpactCount: player.guardrailImpactCount,
            guardrailShoulderRatio: player.guardrailShoulderRatio,
            inputSteerAxis: input.steerAxis,
            inputAccelPressed: input.accelPressed,
            inputBrakePressed: input.brakePressed,
            lateralOffset: player.lateralOffset,
            lineSafetyScrubForce: player.cornerSpeedLoss.lineSafetyScrubForce,
            overspeedTireScrubForce: player.cornerSpeedLoss.overspeedTireScrubForce,
            overspeedUndersteerLateralVelocity: player.overspeedUndersteerLateralVelocity,
            overspeedUndersteerLoadTransferScale: player.overspeedUndersteerLoadTransferScale,
            overspeedUndersteerRatio: player.overspeedUndersteerRatio,
            overspeedUndersteerSteerDemandRatio: player.overspeedUndersteerSteerDemandRatio,
            overspeedUndersteerTargetRatio: player.overspeedUndersteerTargetRatio,
            severeOverspeedScrubForce: player.cornerSpeedLoss.severeOverspeedScrubForce,
            speed: player.speed,
            speedBeforeUpdate,
            steeringScrubForce: player.cornerSpeedLoss.steeringScrubForce,
            t,
            totalCornerSpeedLossForce: player.cornerSpeedLoss.totalForce,
        });
    }

    return collectScenarioMetrics(definition, samples, controllerConfig);
}

function getScenarioInput(definition, t, cornerActive) {
    const mode = definition.preparationMode;
    let accelPressed = true;
    let brakePressed = false;

    if (mode === 'lift') {
        accelPressed = t < 0.35 || t >= 0.95;
    } else if (mode === 'brake-prepared') {
        accelPressed = t < 0.35 || t >= 0.85;
        brakePressed = t >= 0.35 && t < 0.75;
    } else if (mode === 'lift-recovery') {
        accelPressed = t < RECOVERY_START_SEC || t >= RECOVERY_START_SEC + 0.8;
    } else if (mode === 'brake-recovery') {
        accelPressed = t < RECOVERY_START_SEC || t >= RECOVERY_START_SEC + 0.5;
        brakePressed = t >= RECOVERY_START_SEC && t < RECOVERY_START_SEC + 0.35;
    }

    return {
        accelPressed,
        brakePressed,
        steerAxis: cornerActive ? definition.steerAxis : 0,
    };
}

function collectScenarioMetrics(definition, samples, controllerConfig) {
    const cornerSamples = samples.filter((sample) => (
        sample.t >= CORNER_START_SEC && sample.t < CORNER_END_SEC
    ));
    const entry = findAtOrAfter(samples, CORNER_START_SEC);
    const apex = findAtOrAfter(samples, APEX_SEC);
    const exit = [...samples].reverse().find((sample) => sample.t < CORNER_END_SEC);
    const outwardDirection = -Math.sign(definition.curve);
    const outwardExcursion = Math.max(0, ...cornerSamples.map((sample) => (
        outwardDirection * (sample.lateralOffset - entry.lateralOffset)
    )));
    const maxAbsOffset = Math.max(...cornerSamples.map((sample) => Math.abs(sample.lateralOffset)));
    const speedLossRatio = entry.speed <= 0 ? 0 : (entry.speed - exit.speed) / entry.speed;
    const speedToBudgetRatio = entry.cornerSpeedRatioToBudget;
    const cornerIntensity = getCornerIntensity(definition.curve);
    const recoveryMs = measureUndersteerRecoveryMs(samples, definition.recoveryStartSec);
    const recoveryRelief400ms = measureUndersteerRecoveryRelief(
        samples,
        definition.recoveryStartSec,
        0.4,
    );
    const demandIdentityErrorMax = Math.max(...cornerSamples.map((sample) => {
        const expectedSpeedRatio = sample.speedBeforeUpdate / sample.cornerSpeedBudget;
        const expectedDemand = sample.cornerGrade === 'straight'
            ? 0
            : sample.cornerIntensity * expectedSpeedRatio * expectedSpeedRatio;
        return Math.abs(sample.cornerLateralDemand - expectedDemand);
    }));
    const speedRatioIdentityErrorMax = Math.max(...cornerSamples.map((sample) => (
        Math.abs(
            sample.cornerSpeedRatioToBudget -
            sample.speedBeforeUpdate / sample.cornerSpeedBudget,
        )
    )));
    const understeerDemandAlignmentErrorMax = Math.max(...cornerSamples.map((sample) => {
        const bandDemand = getExpectedUndersteerBandDemand(sample, controllerConfig);
        const steerDemand = getExpectedUndersteerSteerDemand(sample, controllerConfig);
        const loadTransferScale = sample.inputBrakePressed
            ? lerp(
                1,
                controllerConfig.overspeedUndersteerBrakeTargetScale,
                sample.brakePressure,
            )
            : sample.inputAccelPressed
                ? 1
                : controllerConfig.overspeedUndersteerLiftTargetScale;
        const expectedTarget = sample.driftState === 'grip'
            ? bandDemand * steerDemand * loadTransferScale
            : 0;
        return Math.abs(sample.overspeedUndersteerTargetRatio - expectedTarget);
    }));

    return {
        accidentalDriftRatio: round(
            cornerSamples.filter((sample) => sample.driftState !== 'grip').length / cornerSamples.length,
        ),
        apexSpeedKmh: rawToKmh(apex.speed, controllerConfig),
        cornerIntensity: round(cornerIntensity),
        cornerSpeedBudgetKmh: rawToKmh(entry.cornerSpeedBudget, controllerConfig),
        demandIdentityErrorMax: round(demandIdentityErrorMax, 6),
        entryLineQuality: round(entry.cornerLineQuality),
        entrySpeedKmh: rawToKmh(entry.speed, controllerConfig),
        exitLineQuality: round(exit.cornerLineQuality),
        exitSpeedKmh: rawToKmh(exit.speed, controllerConfig),
        grade: definition.grade,
        gripSteerAuthorityMean: average(cornerSamples.map((sample) => sample.gripSteerAngleLimit)),
        gripSteerAuthorityMin: round(Math.min(...cornerSamples.map((sample) => sample.gripSteerAngleLimit))),
        guardrailImpactCount: Math.max(...cornerSamples.map((sample) => sample.guardrailImpactCount)),
        id: definition.id,
        initialSpeedKmh: definition.speedKmh,
        kind: definition.kind,
        lateralDemandAtEntry: round(entry.cornerLateralDemand),
        lineQualityMin: round(Math.min(...cornerSamples.map((sample) => sample.cornerLineQuality))),
        maxAbsOffset: round(maxAbsOffset),
        maxAbsOffsetRoadRatio: round(maxAbsOffset / definition.maxRoadOffset),
        maxRoadOffset: round(definition.maxRoadOffset),
        metadata: definition.metadata,
        outwardExcursion: round(outwardExcursion),
        outwardExcursionRoadRatio: round(outwardExcursion / definition.maxRoadOffset),
        overspeedAtEntryKmh: rawToKmh(entry.cornerSpeedOverBudget, controllerConfig),
        overspeedRatioAtEntry: round(entry.cornerOverspeedRatio),
        overspeedUndersteerLateralVelocityMaxAbs: round(Math.max(
            ...cornerSamples.map((sample) => Math.abs(sample.overspeedUndersteerLateralVelocity)),
        )),
        overspeedUndersteerLateralVelocityRoadRateMaxAbs: round(Math.max(
            ...cornerSamples.map((sample) => (
                Math.abs(sample.overspeedUndersteerLateralVelocity) / definition.maxRoadOffset
            )),
        )),
        overspeedUndersteerLoadTransferScaleMin: round(Math.min(
            ...cornerSamples.map((sample) => sample.overspeedUndersteerLoadTransferScale),
        )),
        overspeedUndersteerMean: average(
            cornerSamples.map((sample) => sample.overspeedUndersteerRatio),
        ),
        overspeedUndersteerMax: round(Math.max(
            ...cornerSamples.map((sample) => sample.overspeedUndersteerRatio),
        )),
        overspeedUndersteerTargetMax: round(Math.max(
            ...cornerSamples.map((sample) => sample.overspeedUndersteerTargetRatio),
        )),
        overspeedUndersteerSteerDemandMax: round(Math.max(
            ...cornerSamples.map((sample) => sample.overspeedUndersteerSteerDemandRatio),
        )),
        pavedHalfWidth: round(definition.pavedHalfWidth),
        preparationMode: definition.preparationMode,
        recoveryMs,
        recoveryRelief400ms,
        safetyMarginMax: round(Math.max(
            ...cornerSamples.map((sample) => sample.cornerSafetyMarginRatio),
        )),
        severeOverspeedRatioAtEntry: round(entry.cornerSevereOverspeedRatio),
        speedLossForcesMean: {
            counterRoad: average(cornerSamples.map((sample) => sample.counterRoadScrubForce)),
            downhill: average(cornerSamples.map((sample) => sample.downhillScrubForce)),
            lineSafety: average(cornerSamples.map((sample) => sample.lineSafetyScrubForce)),
            overspeedTire: average(cornerSamples.map((sample) => sample.overspeedTireScrubForce)),
            severeOverspeed: average(cornerSamples.map((sample) => sample.severeOverspeedScrubForce)),
            steering: average(cornerSamples.map((sample) => sample.steeringScrubForce)),
            total: average(cornerSamples.map((sample) => sample.totalCornerSpeedLossForce)),
        },
        speedLossZoneAtEntry: entry.cornerSpeedLossZone,
        speedLossZoneRatios: {
            overspeed: ratioMatching(
                cornerSamples,
                (sample) => sample.cornerSpeedLossZone === 'overspeed',
            ),
            severeOverspeed: ratioMatching(
                cornerSamples,
                (sample) => sample.cornerSpeedLossZone === 'severe-overspeed',
            ),
            withinBudget: ratioMatching(
                cornerSamples,
                (sample) => sample.cornerSpeedLossZone === 'within-budget',
            ),
        },
        shoulderRatioMax: round(Math.max(
            ...cornerSamples.map((sample) => sample.guardrailShoulderRatio),
        )),
        slopeAcceleration: round(definition.slopeAcceleration),
        slopeId: definition.slopeId,
        speedLossPercent: round(speedLossRatio * 100),
        speedRatioIdentityErrorMax: round(speedRatioIdentityErrorMax, 6),
        speedToBudgetRatio: round(speedToBudgetRatio),
        understeerDemandAlignmentErrorMax: round(understeerDemandAlignmentErrorMax, 6),
    };
}

function attachStraightControlComparison(row, straightControlRows) {
    const control = straightControlRows.find((candidate) => (
        candidate.initialSpeedKmh === row.initialSpeedKmh &&
        candidate.slopeId === row.slopeId &&
        candidate.preparationMode === row.preparationMode
    ));
    if (!control) throw new Error(`Missing straight control for ${row.id}`);

    return {
        ...row,
        cornerExitDeficitKmh: round(control.exitSpeedKmh - row.exitSpeedKmh),
        cornerSpeedLossPercent: round(
            (control.exitSpeedKmh - row.exitSpeedKmh) / Math.max(1, row.entrySpeedKmh) * 100,
        ),
        straightControlExitSpeedKmh: control.exitSpeedKmh,
        straightControlLossPercent: control.speedLossPercent,
    };
}

function measureUndersteerRecoveryMs(samples, recoveryStartSec) {
    if (typeof recoveryStartSec !== 'number') return null;

    const beforeRecovery = samples.filter((sample) => (
        sample.t >= CORNER_START_SEC && sample.t <= recoveryStartSec
    ));
    const peak = Math.max(...beforeRecovery.map((sample) => sample.overspeedUndersteerRatio));
    if (peak < 0.05) return null;

    const threshold = Math.max(0.05, peak * 0.2);
    const recovered = samples.find((sample) => (
        sample.t >= recoveryStartSec &&
        sample.t < CORNER_END_SEC &&
        sample.overspeedUndersteerRatio <= threshold
    ));

    return recovered ? Math.round((recovered.t - recoveryStartSec) * 1000) : null;
}

function measureUndersteerRecoveryRelief(samples, recoveryStartSec, windowSec) {
    if (typeof recoveryStartSec !== 'number') return null;

    const before = findAtOrAfter(samples, recoveryStartSec - 1 / config.sampleHz);
    const after = findAtOrAfter(samples, recoveryStartSec + windowSec);
    if (!before || !after || before.overspeedUndersteerRatio < 0.05) return null;

    return round(clamp(
        (before.overspeedUndersteerRatio - after.overspeedUndersteerRatio) /
            before.overspeedUndersteerRatio,
        0,
        1,
    ));
}

function getExpectedUndersteerBandDemand(sample, controllerConfig) {
    if (sample.cornerGrade === 'easy') {
        return smoothstep(clamp(
            sample.cornerOverspeedRatio /
                Math.max(0.01, controllerConfig.overspeedEasyUndersteerFullRatio),
            0,
            1,
        )) * controllerConfig.overspeedEasyUndersteerScale;
    }
    if (sample.cornerGrade === 'medium') {
        return sample.cornerOverspeedRatio * controllerConfig.overspeedMediumUndersteerScale;
    }
    if (sample.cornerGrade === 'sharp') {
        return sample.cornerOverspeedRatio * controllerConfig.overspeedSharpUndersteerScale;
    }
    return 0;
}

function getExpectedUndersteerSteerDemand(sample, controllerConfig) {
    const range = Math.max(
        0.01,
        controllerConfig.overspeedUndersteerSteerInputFull -
            controllerConfig.overspeedUndersteerMinSteerInput,
    );
    return smoothstep(clamp(
        (Math.abs(sample.inputSteerAxis) - controllerConfig.overspeedUndersteerMinSteerInput) /
            range,
        0,
        1,
    ));
}

function simulateStandingStartControl() {
    const controllerConfig = createPlayerControllerBaselineConfig({
        maxRoadOffset: getPhysicalRoadOffsetLimit(960),
    });
    const player = createDefaultPlayerVehicleState(
        0,
        controllerConfig.engineProfile,
        controllerConfig.accelSpeed,
    );
    const hits = {};
    const dt = 1 / 60;

    for (let frame = 0; frame <= 60 * 15; frame += 1) {
        const timeSec = frame * dt;
        const speedKmh = getDisplaySpeedKmh(
            player.speed,
            controllerConfig.accelSpeed,
            controllerConfig.engineProfile,
        );

        for (const threshold of [60, 100]) {
            if (!hits[threshold] && speedKmh >= threshold) {
                hits[threshold] = {
                    gear: player.gearIndex + 1,
                    rpm: Math.round(player.rpm),
                    timeSec: round(timeSec),
                };
            }
        }

        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: 0, slopeAcceleration: 0 },
            controllerConfig,
            dt,
        );
    }

    return {
        drivetrainModel: RAVEN_COUPE_ENGINE_PROFILE.drivetrainModel,
        finalDrive: RAVEN_COUPE_ENGINE_PROFILE.finalDriveRatio,
        gearRatios: RAVEN_COUPE_ENGINE_PROFILE.gearRatios,
        sixtyKmh: hits[60],
        tireCircumferenceM: RAVEN_COUPE_ENGINE_PROFILE.tireCircumferenceM,
        topSpeedEnvelopeKmh: RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh,
        zeroTo100Sec: hits[100]?.timeSec ?? null,
        zeroTo100TargetSec: [7.8, 8.3],
    };
}

function buildChecks({ controls, recoveryRows, straightControlRows, syntheticRows, trackRows }) {
    const trackGrades = new Set(trackRows.map((row) => row.metadata?.actualGrade));
    const allRows = [...syntheticRows, ...recoveryRows, ...trackRows];
    const easy195 = findRow(syntheticRows, 'easy', 'level', 195, 'full-throttle');
    const easy225 = findRow(syntheticRows, 'easy', 'level', 225, 'full-throttle');
    const easy225Lift = findRow(syntheticRows, 'easy', 'level', 225, 'lift');
    const easy225Brake = findRow(syntheticRows, 'easy', 'level', 225, 'brake-prepared');
    const medium225 = findRow(syntheticRows, 'medium', 'level', 225, 'full-throttle');
    const medium225Lift = findRow(syntheticRows, 'medium', 'level', 225, 'lift');
    const medium225Brake = findRow(syntheticRows, 'medium', 'level', 225, 'brake-prepared');
    const sharp225 = findRow(syntheticRows, 'sharp', 'level', 225, 'full-throttle');
    const sharp225Lift = findRow(syntheticRows, 'sharp', 'level', 225, 'lift');
    const sharp225Brake = findRow(syntheticRows, 'sharp', 'level', 225, 'brake-prepared');
    const easy225Downhill = findRow(syntheticRows, 'easy', 'downhill', 225, 'full-throttle');
    const medium225Downhill = findRow(syntheticRows, 'medium', 'downhill', 225, 'full-throttle');
    const sharp225Downhill = findRow(syntheticRows, 'sharp', 'downhill', 225, 'full-throttle');
    const liftRecovery225 = recoveryRows.filter((row) => (
        row.initialSpeedKmh === 225 && row.preparationMode === 'lift-recovery'
    ));
    const brakeRecovery225 = recoveryRows.filter((row) => (
        row.initialSpeedKmh === 225 && row.preparationMode === 'brake-recovery'
    ));
    const demandIdentityErrorMax = Math.max(...allRows.map((row) => row.demandIdentityErrorMax));
    const speedRatioIdentityErrorMax = Math.max(
        ...allRows.map((row) => row.speedRatioIdentityErrorMax),
    );
    const understeerDemandAlignmentErrorMax = Math.max(
        ...allRows.map((row) => row.understeerDemandAlignmentErrorMax),
    );

    return [
        check('syntheticScenarioCount', syntheticRows.length === 72, 72, syntheticRows.length),
        check('recoveryScenarioCount', recoveryRows.length === 16, 16, recoveryRows.length),
        check('straightControlScenarioCount', straightControlRows.length === 24, 24, straightControlRows.length),
        check('trackScenarioCount', trackRows.length === 9, 9, trackRows.length),
        check(
            'trackGradeCoverage',
            ['easy', 'medium', 'sharp'].every((grade) => trackGrades.has(grade)),
            ['easy', 'medium', 'sharp'],
            [...trackGrades].sort(),
        ),
        check(
            'requiredMetricsPresent',
            allRows.every((row) => (
                Number.isFinite(row.entrySpeedKmh) &&
                Number.isFinite(row.exitSpeedKmh) &&
                Number.isFinite(row.lateralDemandAtEntry) &&
                Number.isFinite(row.maxAbsOffsetRoadRatio) &&
                Number.isFinite(row.overspeedRatioAtEntry) &&
                Number.isFinite(row.overspeedUndersteerMax)
            )),
            true,
            true,
        ),
        checkBetween('ch3LevelEasy225DelayedCornerLoss', easy225.cornerSpeedLossPercent, 2, 3),
        checkBetween('tse6LevelMedium225CornerLoss', medium225.cornerSpeedLossPercent, 26, 31),
        checkBetween('tse6LevelSharp225CornerLoss', sharp225.cornerSpeedLossPercent, 45, 51),
        checkBetween('tse6DownhillEasy225RawLoss', easy225Downhill.speedLossPercent, -0.1, 0.1),
        checkBetween('tse6DownhillMedium225RawLoss', medium225Downhill.speedLossPercent, 18, 25),
        checkBetween('tse6DownhillSharp225RawLoss', sharp225Downhill.speedLossPercent, 39, 46),
        check(
            'ch3LevelLossAboveDownhillByGrade',
            easy225.cornerSpeedLossPercent - easy225Downhill.cornerSpeedLossPercent >= 2 &&
                medium225.cornerSpeedLossPercent - medium225Downhill.cornerSpeedLossPercent >= 2 &&
                sharp225.cornerSpeedLossPercent - sharp225Downhill.cornerSpeedLossPercent >= 2,
            'level corner-only loss exceeds downhill by >= 2 percentage points for every grade',
            {
                easy: round(easy225.cornerSpeedLossPercent - easy225Downhill.cornerSpeedLossPercent),
                medium: round(medium225.cornerSpeedLossPercent - medium225Downhill.cornerSpeedLossPercent),
                sharp: round(sharp225.cornerSpeedLossPercent - sharp225Downhill.cornerSpeedLossPercent),
            },
        ),
        check(
            'hnd3CornerLossGradeOrdering',
            sharp225.cornerSpeedLossPercent > medium225.cornerSpeedLossPercent &&
                medium225.cornerSpeedLossPercent > easy225.cornerSpeedLossPercent,
            'sharp > medium > easy',
            `${sharp225.cornerSpeedLossPercent} > ${medium225.cornerSpeedLossPercent} > ${easy225.cornerSpeedLossPercent}`,
        ),
        check(
            'hnd3PreparedLossRelief',
            easy225.cornerSpeedLossPercent > easy225Lift.cornerSpeedLossPercent &&
                easy225Lift.cornerSpeedLossPercent > easy225Brake.cornerSpeedLossPercent &&
                medium225.cornerSpeedLossPercent > medium225Lift.cornerSpeedLossPercent &&
                medium225Lift.cornerSpeedLossPercent > medium225Brake.cornerSpeedLossPercent &&
                sharp225.cornerSpeedLossPercent > sharp225Lift.cornerSpeedLossPercent &&
                sharp225Lift.cornerSpeedLossPercent > sharp225Brake.cornerSpeedLossPercent,
            'full-throttle > lift > brake-prepared',
            {
                easy: [
                    easy225.cornerSpeedLossPercent,
                    easy225Lift.cornerSpeedLossPercent,
                    easy225Brake.cornerSpeedLossPercent,
                ],
                medium: [
                    medium225.cornerSpeedLossPercent,
                    medium225Lift.cornerSpeedLossPercent,
                    medium225Brake.cornerSpeedLossPercent,
                ],
                sharp: [
                    sharp225.cornerSpeedLossPercent,
                    sharp225Lift.cornerSpeedLossPercent,
                    sharp225Brake.cornerSpeedLossPercent,
                ],
            },
        ),
        check(
            'hnd3SpeedLossZoneProgression',
            easy225.speedLossZoneAtEntry === 'overspeed' &&
                medium225.speedLossZoneAtEntry === 'severe-overspeed' &&
                sharp225.speedLossZoneAtEntry === 'severe-overspeed' &&
                easy225.severeOverspeedRatioAtEntry < medium225.severeOverspeedRatioAtEntry &&
                medium225.severeOverspeedRatioAtEntry < sharp225.severeOverspeedRatioAtEntry,
            'easy overspeed < medium severe < sharp severe',
            `${easy225.speedLossZoneAtEntry}/${easy225.severeOverspeedRatioAtEntry}, ` +
                `${medium225.speedLossZoneAtEntry}/${medium225.severeOverspeedRatioAtEntry}, ` +
                `${sharp225.speedLossZoneAtEntry}/${sharp225.severeOverspeedRatioAtEntry}`,
        ),
        check(
            'hnd3SevereScrubProgression',
            easy225.speedLossForcesMean.severeOverspeed === 0 &&
                medium225.speedLossForcesMean.severeOverspeed > 0 &&
                sharp225.speedLossForcesMean.severeOverspeed >
                    medium225.speedLossForcesMean.severeOverspeed,
            'easy = 0 < medium < sharp',
            [
                easy225.speedLossForcesMean.severeOverspeed,
                medium225.speedLossForcesMean.severeOverspeed,
                sharp225.speedLossForcesMean.severeOverspeed,
            ],
        ),
        check(
            'singleTargetSpeedRatioIdentity',
            speedRatioIdentityErrorMax <= 0.000001,
            0,
            speedRatioIdentityErrorMax,
        ),
        check(
            'singleTargetLateralDemandIdentity',
            demandIdentityErrorMax <= 0.000001,
            0,
            demandIdentityErrorMax,
        ),
        check(
            'understeerUsesCornerDemandOverspeed',
            understeerDemandAlignmentErrorMax <= 0.000001,
            0,
            understeerDemandAlignmentErrorMax,
        ),
        checkBetween('ch3Easy195OutwardRoadRatio', easy195.outwardExcursionRoadRatio, 0.15, 0.22),
        checkBetween('hnd4Easy195Understeer', easy195.overspeedUndersteerMax, 0, 0.15),
        checkBetween('hnd4Easy225OutwardRoadRatio', easy225.outwardExcursionRoadRatio, 0.1, 0.22),
        checkBetween('hnd4Easy225Understeer', easy225.overspeedUndersteerMax, 0.15, 0.35),
        checkBetween('ch3Medium225OutwardRoadRatio', medium225.outwardExcursionRoadRatio, 0.35, 0.44),
        checkBetween('hnd4Medium225Understeer', medium225.overspeedUndersteerMax, 0.4, 0.7),
        checkBetween('hnd4Sharp225OutwardRoadRatio', sharp225.outwardExcursionRoadRatio, 0.35, 0.55),
        checkBetween('hnd4Sharp225Understeer', sharp225.overspeedUndersteerMax, 0.7, 1),
        check(
            'hnd4OutwardTrajectoryOrdering',
            sharp225.outwardExcursionRoadRatio > medium225.outwardExcursionRoadRatio &&
                medium225.outwardExcursionRoadRatio > easy225.outwardExcursionRoadRatio,
            'sharp > medium > easy',
            [
                sharp225.outwardExcursionRoadRatio,
                medium225.outwardExcursionRoadRatio,
                easy225.outwardExcursionRoadRatio,
            ],
        ),
        check(
            'ch3RoadWidthCaps',
            easy225Downhill.outwardExcursionRoadRatio <= 0.26 &&
                medium225Downhill.outwardExcursionRoadRatio <= 0.54 &&
                sharp225Downhill.outwardExcursionRoadRatio <= 0.66,
            { easy: 0.26, medium: 0.54, sharp: 0.66 },
            {
                easy: easy225Downhill.outwardExcursionRoadRatio,
                medium: medium225Downhill.outwardExcursionRoadRatio,
                sharp: sharp225Downhill.outwardExcursionRoadRatio,
            },
        ),
        check(
            'hnd4LiftRecoveryRelief',
            liftRecovery225.every((row) => row.recoveryRelief400ms >= 0.35),
            '>= 0.35 at 400ms',
            liftRecovery225.map((row) => row.recoveryRelief400ms),
        ),
        check(
            'hnd4BrakeRecoveryRelief',
            brakeRecovery225.every((row) => row.recoveryRelief400ms >= 0.55),
            '>= 0.55 at 400ms',
            brakeRecovery225.map((row) => row.recoveryRelief400ms),
        ),
        check(
            'hnd4NoForcedGuardrailImpact',
            [easy225, medium225, sharp225, easy225Downhill, medium225Downhill, sharp225Downhill]
                .every((row) => row.guardrailImpactCount === 0),
            0,
            [easy225, medium225, sharp225, easy225Downhill, medium225Downhill, sharp225Downhill]
                .map((row) => row.guardrailImpactCount),
        ),
        check(
            'zeroTo100Control',
            controls.zeroTo100Sec >= controls.zeroTo100TargetSec[0] &&
                controls.zeroTo100Sec <= controls.zeroTo100TargetSec[1],
            controls.zeroTo100TargetSec,
            controls.zeroTo100Sec,
        ),
        check('sixtyKmhSecondGear', controls.sixtyKmh?.gear === 2, 2, controls.sixtyKmh?.gear ?? null),
    ];
}

function buildObservations(syntheticRows, trackRows) {
    const easy225 = findRow(syntheticRows, 'easy', 'level', 225, 'full-throttle');
    const medium225 = findRow(syntheticRows, 'medium', 'level', 225, 'full-throttle');
    const sharp225 = findRow(syntheticRows, 'sharp', 'level', 225, 'full-throttle');
    const actualSharp = trackRows.find((row) => (
        row.metadata?.actualGrade === 'sharp' && row.preparationMode === 'full-throttle'
    ));

    return [
        `easy 225 full-throttle raw loss ${format(easy225.speedLossPercent)}% / corner-only ${format(easy225.cornerSpeedLossPercent)}% / zone ${easy225.speedLossZoneAtEntry}`,
        `medium 225 full-throttle raw loss ${format(medium225.speedLossPercent)}% / corner-only ${format(medium225.cornerSpeedLossPercent)}% / severe ${format(medium225.severeOverspeedRatioAtEntry)}`,
        `sharp 225 full-throttle raw loss ${format(sharp225.speedLossPercent)}% / corner-only ${format(sharp225.cornerSpeedLossPercent)}% / severe ${format(sharp225.severeOverspeedRatioAtEntry)}`,
        `HND-4 outward/road easy ${format(easy225.outwardExcursionRoadRatio)} / medium ${format(medium225.outwardExcursionRoadRatio)} / sharp ${format(sharp225.outwardExcursionRoadRatio)}`,
        `Bugak sharp segment ${actualSharp.metadata.segmentIndex} uses maxRoadOffset ${format(actualSharp.maxRoadOffset)} and reaches outward road ratio ${format(actualSharp.outwardExcursionRoadRatio)}`,
        `single target alignment error: demand ${format(sharp225.demandIdentityErrorMax, 6)} / understeer ${format(sharp225.understeerDemandAlignmentErrorMax, 6)}`,
    ];
}

function buildMarkdownReport(report) {
    const lines = [
        '# Apex Seoul TSE-6 Corner Demand Regression',
        '',
        `Generated: ${report.generatedAt}`,
        '',
        `Status: **${report.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '## Control variables',
        '',
        `- Raven 0-100km/h: ${format(report.controls.zeroTo100Sec, 3)}s (target 7.8~8.3s)`,
        `- 60km/h: gear ${report.controls.sixtyKmh.gear}, ${report.controls.sixtyKmh.rpm}rpm`,
        `- drivetrain: ${report.controls.drivetrainModel}, final drive ${report.controls.finalDrive}`,
        `- gear ratios: ${report.controls.gearRatios.join(' / ')}`,
        '- HND-2 invariant: speed scrub and understeer read the same corner-demand target',
        '- TSE-6 comparison: corner-only loss uses the calibrated production straight control with the same speed, slope and pedal preparation',
        '- A positive downhill force can hold the 225km/h safety cap, so level loss is expected to exceed downhill loss after TSE-4',
        '- HND-4 trajectory: outward motion is normalized by available road width and capped per corner grade',
        '- HND-4 recovery: lift/brake load transfer reduces understeer demand continuously',
        '',
        '## Baseline observations',
        '',
        ...report.observations.map((observation) => `- ${observation}`),
        '',
        '## Synthetic matrix',
        '',
        '| grade | slope | km/h | preparation | entry | exit | raw loss % | straight exit | corner loss % | zone | severe | budget | demand | US max | outward/road | drift |',
        '| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...report.syntheticRows.map(formatMarkdownRow),
        '',
        '## Understeer recovery',
        '',
        '| grade | slope | km/h | action | entry | exit | US max | relief 400ms | recovery ms | outward/road | drift |',
        '| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...report.recoveryRows.map((row) => (
            `| ${row.grade} | ${row.slopeId} | ${row.initialSpeedKmh} | ${row.preparationMode} | ` +
            `${format(row.entrySpeedKmh)} | ${format(row.exitSpeedKmh)} | ` +
            `${format(row.overspeedUndersteerMax)} | ${format(row.recoveryRelief400ms)} | ` +
            `${row.recoveryMs ?? '-'} | ` +
            `${format(row.outwardExcursionRoadRatio)} | ${format(row.accidentalDriftRatio)} |`
        )),
        '',
        '## Fixed Bugak Ridge segments',
        '',
        '| segment | grade | curve | slope accel | road half | max offset | preparation | entry | exit | loss % | US max | outward/road |',
        '| ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
        ...report.track.rows.map((row) => (
            `| ${row.metadata.segmentIndex} | ${row.metadata.actualGrade} | ${format(row.metadata.curve)} | ` +
            `${format(row.metadata.slopeAcceleration)} | ${format(row.pavedHalfWidth)} | ${format(row.maxRoadOffset)} | ` +
            `${row.preparationMode} | ${format(row.entrySpeedKmh)} | ${format(row.exitSpeedKmh)} | ` +
            `${format(row.speedLossPercent)} | ${format(row.overspeedUndersteerMax)} | ` +
            `${format(row.outwardExcursionRoadRatio)} |`
        )),
        '',
        '## Invariant checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...report.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ${formatValue(entry.value)} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function formatMarkdownRow(row) {
    return `| ${row.grade} | ${row.slopeId} | ${row.initialSpeedKmh} | ${row.preparationMode} | ` +
        `${format(row.entrySpeedKmh)} | ${format(row.exitSpeedKmh)} | ${format(row.speedLossPercent)} | ` +
        `${format(row.straightControlExitSpeedKmh)} | ${format(row.cornerSpeedLossPercent)} | ` +
        `${row.speedLossZoneAtEntry} | ${format(row.severeOverspeedRatioAtEntry)} | ` +
        `${format(row.cornerSpeedBudgetKmh)} | ${format(row.lateralDemandAtEntry)} | ` +
        `${format(row.overspeedUndersteerMax)} | ${format(row.outwardExcursionRoadRatio)} | ` +
        `${format(row.accidentalDriftRatio)} |`;
}

function getTrackSlopeAcceleration(segmentIndex) {
    const z = (segmentIndex + 0.5) * track.segmentLength;
    const currentElevation = getRoadElevationAt(track, z);
    const aheadElevation = getRoadElevationAt(track, z + SLOPE_SAMPLE_DISTANCE);
    const downhillRatio = (currentElevation - aheadElevation) / SLOPE_SAMPLE_DISTANCE;

    return clamp(
        downhillRatio * GRAVITY_ACCELERATION,
        -MAX_SLOPE_ACCELERATION,
        MAX_SLOPE_ACCELERATION,
    );
}

function findRow(rows, grade, slopeId, speedKmh, preparationMode) {
    const row = rows.find((candidate) => (
        candidate.grade === grade &&
        candidate.slopeId === slopeId &&
        candidate.initialSpeedKmh === speedKmh &&
        candidate.preparationMode === preparationMode
    ));
    if (!row) throw new Error(`Missing row ${grade}/${slopeId}/${speedKmh}/${preparationMode}`);
    return row;
}

function findAtOrAfter(samples, timeSec) {
    return samples.find((sample) => sample.t >= timeSec) ?? samples.at(-1);
}

function kmhToRaw(speedKmh) {
    return speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh * ACCEL_SPEED;
}

function getPhysicalRailOffset(pavedHalfWidth) {
    return pavedHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance;
}

function getPhysicalRoadOffsetLimit(pavedHalfWidth) {
    return getGuardrailCollisionGeometry({
        pavedHalfWidth,
        railContactLimit: getPhysicalRailOffset(pavedHalfWidth),
        vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
    }).railCenterLimit;
}

function rawToKmh(speed, controllerConfig) {
    return round(getDisplaySpeedKmh(
        speed,
        controllerConfig.accelSpeed,
        controllerConfig.engineProfile,
    ));
}

function resolveProjectPath(value) {
    return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function parsePositiveNumber(flag, value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${flag} requires a positive number`);
    return number;
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function checkBetween(id, value, min, max) {
    return check(id, value >= min && value <= max, [min, max], value);
}

function average(values) {
    return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function ratioMatching(values, predicate) {
    return round(values.filter(predicate).length / values.length);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function smoothstep(value) {
    return value * value * (3 - 2 * value);
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function format(value, digits = 3) {
    return Number.isFinite(value) ? Number(value).toFixed(digits).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
