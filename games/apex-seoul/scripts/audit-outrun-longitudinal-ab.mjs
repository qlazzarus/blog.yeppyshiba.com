import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    DEFAULT_CAMERA_EFFECTS_CONFIG,
    getSpeedFovBonus,
} from '../src/game/cameraEffects.js';
import {
    RAVEN_COUPE_ENGINE_PROFILE,
    getDisplaySpeedKmh,
} from '../src/game/engineProfile.ts';
import {
    GUARDRAIL_COLLISION_CONFIG,
    getGuardrailCollisionGeometry,
} from '../src/game/guardrailCollision.ts';
import {
    DEFAULT_LONGITUDINAL_UNIT_SCALE,
    LONGITUDINAL_UNIT_SCALE_CANDIDATES,
    createLongitudinalProgressionConfig,
    getLongitudinalWorldTravelSpeed,
    getNextLongitudinalUnitScale,
} from '../src/game/longitudinalProgression.ts';
import { getSpeedHandlingSample } from '../src/game/playerVehicleController.ts';
import { getFocalLength } from '../src/game/pseudo3dCamera.ts';
import {
    DEFAULT_ROAD_HALF_WIDTH,
    SEGMENT_LENGTH,
    createBugakRidgeDownhillTrack,
} from '../src/game/road.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(
    projectRoot,
    'assets/telemetry/generated/outrun-longitudinal-ab',
);
const mainSourcePath = path.join(projectRoot, 'src/main.ts');
const captureSourcePath = path.join(projectRoot, 'scripts/capture-drive-telemetry.mjs');
const controllerSourcePath = path.join(
    projectRoot,
    'src/game/playerVehicleController.ts',
);
const VIEWPORT = Object.freeze({ height: 760, width: 1200 });
const SAMPLE_SPEEDS_KMH = Object.freeze([150, 185, 225]);
const COMMITMENT_THRESHOLD = 0.16;
const PEAK_THRESHOLD = 0.55;
const RUNTIME_SAFETY_SAMPLE_HZ = 30;
const CONTROL_SAMPLE_HZ = 60;

const [mainSource, controllerSource, captureSource] = await Promise.all([
    readFile(mainSourcePath, 'utf8'),
    readFile(controllerSourcePath, 'utf8'),
    readFile(captureSourcePath, 'utf8'),
]);
const playerAccelSpeed = readNumericConstant(mainSource, 'PLAYER_ACCEL_SPEED');
const playerRoadAnchorDistance = readNumericConstant(
    mainSource,
    'PLAYER_ROAD_ANCHOR_DISTANCE',
);
const track = createBugakRidgeDownhillTrack();
const commitments = collectCommitments(track.segments);
const minRoadHalfWidth = Math.min(
    ...track.segments.map((segment) => segment.roadHalfWidth),
);
const railGeometry = getGuardrailCollisionGeometry({
    pavedHalfWidth: minRoadHalfWidth,
    railContactLimit: minRoadHalfWidth + GUARDRAIL_COLLISION_CONFIG.contactClearance,
    vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
});
const candidates = LONGITUDINAL_UNIT_SCALE_CANDIDATES.map((scale, index) =>
    measureCandidate(scale, index),
);
const parsingCases = [
    { expected: 2, expectedFallback: false, raw: null },
    { expected: 1, expectedFallback: false, raw: '1' },
    { expected: 1.5, expectedFallback: false, raw: '1.5' },
    { expected: 2, expectedFallback: false, raw: '2' },
    { expected: 3, expectedFallback: false, raw: '3' },
    { expected: 2, expectedFallback: true, raw: '1.75' },
    { expected: 2, expectedFallback: true, raw: 'not-a-number' },
].map(({ expected, expectedFallback, raw }) => {
    const params = new URLSearchParams();

    if (raw !== null) params.set('longitudinalScale', raw);
    const resolved = createLongitudinalProgressionConfig(params);

    return {
        expected,
        pass: resolved.scale === expected && resolved.usedFallback === expectedFallback,
        raw,
        resolved: resolved.scale,
        usedFallback: resolved.usedFallback,
    };
});
const checks = [
    checkEqual(
        'candidateMatrix',
        LONGITUDINAL_UNIT_SCALE_CANDIDATES.join(','),
        '1,1.5,2,3',
    ),
    checkEqual('defaultCandidate', DEFAULT_LONGITUDINAL_UNIT_SCALE, 2),
    checkEqual(
        'candidateCycle',
        LONGITUDINAL_UNIT_SCALE_CANDIDATES.map(getNextLongitudinalUnitScale).join(','),
        '1.5,2,3,1',
    ),
    checkEqual(
        'candidateParsing',
        parsingCases.every((entry) => entry.pass),
        true,
    ),
    checkEqual(
        'canonicalCameraProgression',
        mainSource.includes('camera.z + this.getWorldTravelSpeed() * seconds'),
        true,
    ),
    checkEqual(
        'noLegacyDirectPhysicalProgression',
        mainSource.includes('camera.z + this.playerVehicle.speed * seconds'),
        false,
    ),
    checkEqual(
        'powertrainHasNoLongitudinalScaleDependency',
        controllerSource.includes('longitudinalScale'),
        false,
    ),
    checkEqual(
        'historicalSh7ScenariosPinnedToU0',
        captureSource.match(/query: \{ longitudinalScale: '1' \}/g)?.length ?? 0,
        4,
    ),
    checkAtMost(
        'displaySpeedIdentityErrorKmh',
        Math.max(
            ...SAMPLE_SPEEDS_KMH.flatMap((speedKmh) =>
                candidates.map(() =>
                    Math.abs(
                        getDisplaySpeedKmh(
                            rawSpeedForKmh(speedKmh),
                            playerAccelSpeed,
                            RAVEN_COUPE_ENGINE_PROFILE,
                        ) - speedKmh,
                    ),
                ),
            ),
        ),
        0.000001,
    ),
    checkAtMost(
        'maximumSegmentsPer30HzStep',
        Math.max(
            ...candidates.flatMap((candidate) =>
                Object.values(candidate.speeds).map(
                    (speed) => speed.segmentsPerRuntimeSafetyStep,
                ),
            ),
        ),
        0.5,
    ),
    checkAtLeast('commitmentRunCount', commitments.length, 6),
];
const report = {
    candidates,
    checks,
    config: {
        commitmentThreshold: COMMITMENT_THRESHOLD,
        controlSampleHz: CONTROL_SAMPLE_HZ,
        defaultFullRoadWidth: DEFAULT_ROAD_HALF_WIDTH * 2,
        peakThreshold: PEAK_THRESHOLD,
        playerAccelSpeed,
        playerRoadAnchorDistance,
        runtimeSafetySampleHz: RUNTIME_SAFETY_SAMPLE_HZ,
        segmentLength: SEGMENT_LENGTH,
        viewport: VIEWPORT,
    },
    generatedAt: new Date().toISOString(),
    methodology: {
        handlingBoundary:
            'Physical speed, engine, gear, steering and lateral constants stay unchanged. Only canonical world Z progression uses physicalSpeed * scale.',
        railExposure:
            'Rail exposure is an upper-bound ratio: shortest commitment duration divided by time from center to the narrowest rail at the physical-speed lateral velocity cap. Runtime/user review still decides handling acceptance.',
        screenFlow:
            'Flat-ground screenY 60->85% at the actual steady FOV; identical to ORS-1 with only worldTravelSpeed changed.',
    },
    parsingCases,
    pass: checks.every((entry) => entry.pass),
    recommendation: {
        productionSelection: {
            approvedAt: '2026-07-23',
            id: 'U2',
            scale: 2,
            source: 'user A/B review',
        },
        rules: [
            'Use U2 / 2.00 as the production default after user A/B review.',
            'Keep U0/U1 URL overrides for regression comparison and U3 as a diagnostic upper bound.',
            'If 2.00 or 3.00 fixes flow but makes the grip window too short, resample the course longitudinally by the selected scale before changing handling.',
        ],
    },
    schemaVersion: 1,
    track: {
        commitments,
        id: track.id,
        length: track.length,
        minRailCenterLimit: round(railGeometry.railCenterLimit),
        segments: track.segments.length,
    },
};

await mkdir(outputDir, { recursive: true });
await writeFile(
    path.join(outputDir, 'outrun-longitudinal-ab-ors2a.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(outputDir, 'outrun-longitudinal-ab-ors2a.md'),
    buildMarkdown(report),
);

console.log(`ORS-2A longitudinal A/B audit: ${report.pass ? 'PASS' : 'FAIL'}`);
for (const candidate of candidates) {
    console.log(
        `${candidate.id} x${candidate.scale.toFixed(2)}: ` +
            `185km/h ${candidate.speeds[185].segmentsPerSec} segment/s, ` +
            `${candidate.handling[185].shortestCommitmentSec}s minimum commitment`,
    );
}
if (!report.pass) process.exitCode = 1;

function measureCandidate(scale, index) {
    const speeds = Object.fromEntries(
        SAMPLE_SPEEDS_KMH.map((speedKmh) => {
            const physicalSpeed = rawSpeedForKmh(speedKmh);
            const worldTravelSpeed = getLongitudinalWorldTravelSpeed(
                physicalSpeed,
                scale,
            );
            const camera = createSteadyCamera(speedKmh);
            const focalLength = getFocalLength(camera, VIEWPORT);
            const distance60 = getFlatGroundDistance(camera, focalLength, 0.6);
            const distance85 = getFlatGroundDistance(camera, focalLength, 0.85);
            const distance95 = getFlatGroundDistance(camera, focalLength, 0.95);

            return [
                speedKmh,
                {
                    courseDurationSec: round(track.length / worldTravelSpeed),
                    defaultRoadWidthsPerSec: round(
                        worldTravelSpeed / (DEFAULT_ROAD_HALF_WIDTH * 2),
                    ),
                    displaySpeedKmh: round(
                        getDisplaySpeedKmh(
                            physicalSpeed,
                            playerAccelSpeed,
                            RAVEN_COUPE_ENGINE_PROFILE,
                        ),
                    ),
                    nearPass60To85Sec: round(
                        (distance60 - distance85) / worldTravelSpeed,
                    ),
                    nearPass60To95Sec: round(
                        (distance60 - distance95) / worldTravelSpeed,
                    ),
                    physicalSpeed: round(physicalSpeed),
                    roadAnchorPreviewSec: round(
                        playerRoadAnchorDistance / worldTravelSpeed,
                    ),
                    segmentsPerRuntimeSafetyStep: round(
                        worldTravelSpeed / SEGMENT_LENGTH / RUNTIME_SAFETY_SAMPLE_HZ,
                    ),
                    segmentsPerSec: round(worldTravelSpeed / SEGMENT_LENGTH),
                    worldTravelSpeed: round(worldTravelSpeed),
                },
            ];
        }),
    );
    const handling = Object.fromEntries(
        [185, 225].map((speedKmh) => {
            const physicalSpeed = rawSpeedForKmh(speedKmh);
            const worldTravelSpeed = getLongitudinalWorldTravelSpeed(
                physicalSpeed,
                scale,
            );
            const speedHandling = getSpeedHandlingSample(
                physicalSpeed / playerAccelSpeed,
            );
            const railTravelTimeAtLateralCap =
                railGeometry.railCenterLimit / speedHandling.lateralVelocityCap;
            const windows = commitments.map((commitment) =>
                measureCommitmentWindow(
                    commitment,
                    worldTravelSpeed,
                    railTravelTimeAtLateralCap,
                ),
            );
            const durations = windows.map((window) => window.totalSec);

            return [
                speedKmh,
                {
                    lateralVelocityCap: round(speedHandling.lateralVelocityCap),
                    longestCommitmentSec: round(Math.max(...durations)),
                    medianCommitmentSec: round(median(durations)),
                    minimumControlSamples60Hz: round(
                        Math.min(...durations) * CONTROL_SAMPLE_HZ,
                        1,
                    ),
                    railTravelTimeAtLateralCapSec: round(railTravelTimeAtLateralCap),
                    shortestCommitmentRailExposureRatio: round(
                        Math.min(...durations) / railTravelTimeAtLateralCap,
                    ),
                    shortestCommitmentSec: round(Math.min(...durations)),
                    windows,
                },
            ];
        }),
    );

    return {
        diagnosticUpperBound: index === LONGITUDINAL_UNIT_SCALE_CANDIDATES.length - 1,
        handling,
        id: `U${index}`,
        longitudinalCourseResampleToRestoreBaselineTiming: scale,
        scale,
        speeds,
    };
}

function measureCommitmentWindow(
    commitment,
    worldTravelSpeed,
    railTravelTimeAtLateralCap,
) {
    const entryZ = commitment.startSegment * SEGMENT_LENGTH;
    const apexZ = (commitment.apexSegment + 0.5) * SEGMENT_LENGTH;
    const exitZ = (commitment.endSegment + 1) * SEGMENT_LENGTH;
    const totalSec = (exitZ - entryZ) / worldTravelSpeed;

    return {
        apexSegment: commitment.apexSegment,
        apexToExitSec: round((exitZ - apexZ) / worldTravelSpeed),
        controlSamples60Hz: round(totalSec * CONTROL_SAMPLE_HZ, 1),
        endSegment: commitment.endSegment,
        entryToApexSec: round((apexZ - entryZ) / worldTravelSpeed),
        kind: commitment.kind,
        peakCurve: commitment.peakCurve,
        railExposureUpperBoundRatio: round(totalSec / railTravelTimeAtLateralCap),
        startSegment: commitment.startSegment,
        totalSec: round(totalSec),
    };
}

function collectCommitments(segments) {
    const classifications = segments.map((segment) => {
        if (Math.abs(segment.curve) < COMMITMENT_THRESHOLD) return 'recovery';
        return segment.curve > 0 ? 'right' : 'left';
    });
    const runs = [];
    let start = 0;

    for (let index = 1; index <= classifications.length; index += 1) {
        if (
            index < classifications.length &&
            classifications[index] === classifications[start]
        )
            continue;
        const members = segments.slice(start, index);
        const peakCurve = Math.max(
            ...members.map((segment) => Math.abs(segment.curve)),
        );

        if (classifications[start] !== 'recovery' && peakCurve >= PEAK_THRESHOLD) {
            const localApexIndex = members.reduce(
                (bestIndex, segment, memberIndex) =>
                    Math.abs(segment.curve) > Math.abs(members[bestIndex].curve)
                        ? memberIndex
                        : bestIndex,
                0,
            );

            runs.push({
                apexSegment: start + localApexIndex,
                endSegment: index - 1,
                kind: classifications[start],
                length: index - start,
                peakCurve: round(peakCurve),
                startSegment: start,
            });
        }
        start = index;
    }

    return runs;
}

function createSteadyCamera(speedKmh) {
    return {
        fovDegrees:
            DEFAULT_CAMERA_EFFECTS_CONFIG.baseFov +
            getSpeedFovBonus(speedKmh, DEFAULT_CAMERA_EFFECTS_CONFIG),
        height: 980,
        horizonRatio: 0.38,
        lateralOffset: 0,
        pitch: 0,
        z: 0,
    };
}

function getFlatGroundDistance(camera, focalLength, screenYRatio) {
    const horizonY = VIEWPORT.height * camera.horizonRatio;
    const targetY = VIEWPORT.height * screenYRatio;

    return (camera.height * focalLength) / (targetY - horizonY);
}

function rawSpeedForKmh(speedKmh) {
    return (
        (speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh) * playerAccelSpeed
    );
}

function readNumericConstant(source, name) {
    const match = source.match(
        new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+(?:\\.[0-9]+)?)`),
    );

    if (!match) throw new Error(`Unable to read numeric constant ${name}`);

    return Number(match[1].replaceAll('_', ''));
}

function checkAtLeast(id, value, target) {
    return { id, pass: value >= target, target: `>= ${target}`, value: round(value) };
}

function checkAtMost(id, value, target) {
    return { id, pass: value <= target, target: `<= ${target}`, value: round(value) };
}

function checkEqual(id, value, target) {
    return { id, pass: value === target, target: `= ${target}`, value };
}

function buildMarkdown(value) {
    const lines = [
        '# Apex Seoul ORS-2A Longitudinal A/B',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        'Production selection: **U2 / 2.00**. `U3 / 3.00` remains a diagnostic upper bound.',
        '',
        '## Flow matrix',
        '',
        '| candidate | scale | 150 segment/s | 185 segment/s | 225 segment/s | 185 60->85% | 225 60->85% | 225 step @30Hz |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.candidates.map(
            (candidate) =>
                `| ${candidate.id}${candidate.diagnosticUpperBound ? ' diagnostic' : ''} | ` +
                `${candidate.scale.toFixed(2)} | ${candidate.speeds[150].segmentsPerSec} | ` +
                `${candidate.speeds[185].segmentsPerSec} | ${candidate.speeds[225].segmentsPerSec} | ` +
                `${candidate.speeds[185].nearPass60To85Sec}s | ` +
                `${candidate.speeds[225].nearPass60To85Sec}s | ` +
                `${candidate.speeds[225].segmentsPerRuntimeSafetyStep} segment |`,
        ),
        '',
        '## Handling-time matrix',
        '',
        '| candidate | 185 shortest / median / longest | 185 min samples | 225 shortest | 225 min samples | 185 rail exposure upper bound | course resample if needed |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
        ...value.candidates.map(
            (candidate) =>
                `| ${candidate.id} | ${candidate.handling[185].shortestCommitmentSec}s / ` +
                `${candidate.handling[185].medianCommitmentSec}s / ` +
                `${candidate.handling[185].longestCommitmentSec}s | ` +
                `${candidate.handling[185].minimumControlSamples60Hz} | ` +
                `${candidate.handling[225].shortestCommitmentSec}s | ` +
                `${candidate.handling[225].minimumControlSamples60Hz} | ` +
                `${candidate.handling[185].shortestCommitmentRailExposureRatio} | ` +
                `x${candidate.longitudinalCourseResampleToRestoreBaselineTiming.toFixed(2)} |`,
        ),
        '',
        'The rail exposure value is an upper-bound timing ratio, not a simulated racing line. Runtime telemetry and user review remain required for approval.',
        '',
        '## 185km/h entry / apex / exit windows',
        '',
        '| candidate | turn | segments | apex | entry->apex | apex->exit | total | samples @60Hz |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
        ...value.candidates.flatMap((candidate) =>
            candidate.handling[185].windows.map(
                (window) =>
                    `| ${candidate.id} | ${window.kind} | ${window.startSegment}-${window.endSegment} | ` +
                    `${window.apexSegment} | ${window.entryToApexSec}s | ${window.apexToExitSec}s | ` +
                    `${window.totalSec}s | ${window.controlSamples60Hz} |`,
            ),
        ),
        '',
        '## Runtime A/B',
        '',
        '- Query: `?longitudinalScale=1`, `1.5`, `2`, or `3`.',
        '- In game: press `B` to cycle candidates and reload from a clean run.',
        '- HUD and telemetry report candidate, scale, physical speed and canonical worldTravelSpeed.',
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...value.checks.map(
            (entry) =>
                `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${entry.target} | ${entry.value} |`,
        ),
        '',
        '## Review order',
        '',
        ...value.recommendation.rules.map((rule) => `- ${rule}`),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}
