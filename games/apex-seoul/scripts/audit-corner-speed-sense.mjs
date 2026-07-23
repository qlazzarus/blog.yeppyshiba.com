import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import {
    createBugakRidgeDownhillTrack,
    SEGMENT_LENGTH,
} from '../src/game/road.ts';
import { SPEED_PRESENTATION_WORLD_CONFIG } from '../src/game/speedPresentationConfig.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/corner-speed-sense');
const ACCEL_SPEED = 760;
const COMMITMENT_THRESHOLD = 0.16;
const PEAK_THRESHOLD = 0.55;
const SAMPLE_SPEEDS_KMH = [110, 130, 150, 185];
const track = createBugakRidgeDownhillTrack();
const runs = collectDirectionalRuns(track.segments);
const commitments = runs
    .filter((run) => run.kind !== 'recovery' && run.peakCurve >= PEAK_THRESHOLD)
    .map((run) => ({
        ...run,
        durationSec: Object.fromEntries(SAMPLE_SPEEDS_KMH.map((speedKmh) => [
            speedKmh,
            round(run.length * SEGMENT_LENGTH / rawSpeedForKmh(speedKmh)),
        ])),
        lengthUnits: run.length * SEGMENT_LENGTH,
    }));
const recoveries = runs.filter((run) => run.kind === 'recovery');
const cadence = Object.fromEntries(SAMPLE_SPEEDS_KMH.map((speedKmh) => {
    const rawSpeed = rawSpeedForKmh(speedKmh);

    return [speedKmh, {
        cornerLaneDashPassesPerSec: round(
            rawSpeed * SPEED_PRESENTATION_WORLD_CONFIG.cornerLaneDashSubdivisions /
                SEGMENT_LENGTH,
        ),
        cornerReflectorPassesPerSec: round(
            rawSpeed * SPEED_PRESENTATION_WORLD_CONFIG.cornerReflectorSubdivisions /
                SEGMENT_LENGTH,
        ),
        straightLaneDashPassesPerSec: round(rawSpeed / SEGMENT_LENGTH),
    }];
}));
const longestCommitment = Math.max(0, ...commitments.map((run) => run.length));
const checks = [
    checkBetween('trackSegments', track.segments.length, 340, 380),
    checkBetween('commitmentRunCount', commitments.length, 6, 8),
    checkAtMost('longestCommitmentSegments', longestCommitment, 14),
    checkAtLeast(
        'shortestCommitmentSegments',
        Math.min(...commitments.map((run) => run.length)),
        8,
    ),
    checkAtMost(
        'longestCommitmentDurationAt130Kmh',
        Math.max(...commitments.map((run) => run.durationSec[130])),
        8,
    ),
    checkBetween('cornerLaneCadenceAt150Kmh', cadence[150].cornerLaneDashPassesPerSec, 4, 6),
    checkBetween('cornerReflectorCadenceAt185Kmh', cadence[185].cornerReflectorPassesPerSec, 4, 6),
    checkAtLeast(
        'recoveryRunsAtLeastEightSegments',
        recoveries.filter((run) => run.length >= 8).length,
        7,
    ),
    checkAtMost(
        'displaySpeedIdentityError',
        Math.max(...SAMPLE_SPEEDS_KMH.map((speedKmh) => Math.abs(
            getDisplaySpeedKmh(
                rawSpeedForKmh(speedKmh),
                ACCEL_SPEED,
                RAVEN_COUPE_ENGINE_PROFILE,
            ) - speedKmh
        ))),
        0.000001,
    ),
];
const report = {
    cadence,
    checks,
    commitments,
    config: {
        commitmentThreshold: COMMITMENT_THRESHOLD,
        peakThreshold: PEAK_THRESHOLD,
        presentation: SPEED_PRESENTATION_WORLD_CONFIG,
        sampleSpeedsKmh: SAMPLE_SPEEDS_KMH,
    },
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    recoveries,
    schemaVersion: 1,
    track: {
        id: track.id,
        length: track.length,
        segmentLength: track.segmentLength,
        segments: track.segments.length,
    },
};

await mkdir(outputDir, { recursive: true });
await writeFile(
    path.join(outputDir, 'corner-speed-sense-baseline.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(outputDir, 'corner-speed-sense-baseline.md'),
    buildMarkdown(report),
);

console.log(`Corner speed sense: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`Track: ${track.segments.length} segments / ${track.length} units`);
console.log(`Commitments: ${commitments.map((run) => run.length).join(' / ')} segments`);
console.log(`150km/h corner lane cadence: ${cadence[150].cornerLaneDashPassesPerSec}/s`);
if (!report.pass) process.exitCode = 1;

function collectDirectionalRuns(segments) {
    const classifications = segments.map((segment) => {
        if (Math.abs(segment.curve) < COMMITMENT_THRESHOLD) return 'recovery';
        return segment.curve > 0 ? 'right' : 'left';
    });
    const collected = [];
    let start = 0;

    for (let index = 1; index <= classifications.length; index += 1) {
        if (index < classifications.length && classifications[index] === classifications[start]) continue;
        const members = segments.slice(start, index);

        collected.push({
            endSegment: index - 1,
            kind: classifications[start],
            length: index - start,
            peakCurve: round(Math.max(...members.map((segment) => Math.abs(segment.curve)))),
            startSegment: start,
        });
        start = index;
    }

    return collected;
}

function rawSpeedForKmh(speedKmh) {
    return speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh * ACCEL_SPEED;
}

function checkAtLeast(id, value, target) {
    return { id, pass: value >= target, target: `>= ${target}`, value: round(value) };
}

function checkAtMost(id, value, target) {
    return { id, pass: value <= target, target: `<= ${target}`, value: round(value) };
}

function checkBetween(id, value, min, max) {
    return { id, pass: value >= min && value <= max, target: `${min}..${max}`, value: round(value) };
}

function buildMarkdown(value) {
    const lines = [
        '# Apex Seoul Corner Speed Sense Baseline',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        `Track: ${value.track.segments} segments / ${value.track.length} units`,
        '',
        '## Commitment runs',
        '',
        '| direction | segments | start | end | peak | 130km/h | 150km/h | 185km/h |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.commitments.map((run) => (
            `| ${run.kind} | ${run.length} | ${run.startSegment} | ${run.endSegment} | ` +
            `${run.peakCurve} | ${run.durationSec[130]}s | ${run.durationSec[150]}s | ` +
            `${run.durationSec[185]}s |`
        )),
        '',
        '## Near-field cadence',
        '',
        '| km/h | straight lane/s | corner lane/s | corner reflector/s |',
        '| ---: | ---: | ---: | ---: |',
        ...SAMPLE_SPEEDS_KMH.map((speedKmh) => (
            `| ${speedKmh} | ${value.cadence[speedKmh].straightLaneDashPassesPerSec} | ` +
            `${value.cadence[speedKmh].cornerLaneDashPassesPerSec} | ` +
            `${value.cadence[speedKmh].cornerReflectorPassesPerSec} |`
        )),
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | ---: |',
        ...value.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${entry.target} | ${entry.value} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}
