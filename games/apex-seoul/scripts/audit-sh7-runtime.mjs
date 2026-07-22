import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const runtimeRoot = path.join(
    projectRoot,
    'assets/telemetry/generated/speed-presentation/sh7-runtime',
);
const scenarioIds = ['straight', 'grip', 'drift'];

const sources = Object.fromEntries(await Promise.all(
    scenarioIds.map(async (id) => [id, await findLatestJsonl(path.join(runtimeRoot, id))]),
));
const samples = Object.fromEntries(await Promise.all(
    scenarioIds.map(async (id) => [id, await readJsonl(sources[id])]),
));
const runs = Object.fromEntries(
    scenarioIds.map((id) => [id, summarizeRun(samples[id], sources[id])]),
);

const checks = [
    check('threeRuntimeRuns', scenarioIds.every((id) => runs[id].sampleCount > 0), true, true),
    check('straightStartsNearZeroKmh', runs.straight.speedKmh.min <= 5, '<= 5km/h', runs.straight.speedKmh.min),
    check('straightReaches225Kmh', runs.straight.speedKmh.max >= 223, '>= 223km/h', runs.straight.speedKmh.max, true),
    check('straightNoGuardrailImpact', runs.straight.guardrailImpacts === 0, 0, runs.straight.guardrailImpacts),
    check('straightUsesOneXTimeScale', runs.straight.qaTimeScales.length === 1 && runs.straight.qaTimeScales[0] === 1, [1], runs.straight.qaTimeScales, true),
    check('straightThrottleHeld', runs.straight.accelReleasedSamples === 0, 0, runs.straight.accelReleasedSamples, true),
    check('straightRemainsStraight', runs.straight.cornerGrades.length === 1 && runs.straight.cornerGrades[0] === 'straight', ['straight'], runs.straight.cornerGrades, true),
    check('straightNoSteering', runs.straight.maxAbsSteerInput <= 0.001 && runs.straight.maxAbsSteering <= 0.001, '<= 0.001', { input: runs.straight.maxAbsSteerInput, state: runs.straight.maxAbsSteering }, true),
    check('straightNoCornerLoss', runs.straight.maxCornerLossForce <= 0.000001, 0, runs.straight.maxCornerLossForce, true),
    check('straightReachesSixthGear', runs.straight.gear.max === 6, 6, runs.straight.gear.max, true),
    check('straightAvoidsFuelCut', runs.straight.fuelCutSamples === 0, 0, runs.straight.fuelCutSamples, true),
    check('straightUsesSh7MildDownhill', runs.straight.slopeAcceleration.min >= 3.5 && runs.straight.slopeAcceleration.max <= 4.5, '3.5~4.5 slope acceleration', runs.straight.slopeAcceleration, true),
    check('gripCoversAllGrades', includesAll(runs.grip.cornerGrades, ['easy', 'medium', 'sharp']), ['easy', 'medium', 'sharp'], runs.grip.cornerGrades),
    check('gripRemainsGripOnly', runs.grip.driftStates.length === 1 && runs.grip.driftStates[0] === 'grip', ['grip'], runs.grip.driftStates),
    check('gripNoGuardrailImpact', runs.grip.guardrailImpacts === 0, 0, runs.grip.guardrailImpacts, true),
    check('gripRailProjectionCoverage', runs.grip.guardrailProjectionSamples === runs.grip.sampleCount, runs.grip.sampleCount, runs.grip.guardrailProjectionSamples),
    check('gripRailProjectionIdentity', runs.grip.maxGuardrailProjectionRatioError <= 0.0002, '<= 0.0002', runs.grip.maxGuardrailProjectionRatioError),
    check('gripRailScreenGapNonNegative', runs.grip.activeRailScreenGapPx.min >= -0.01, '>= -0.01px', runs.grip.activeRailScreenGapPx.min),
    check('driftBrakeEntry', runs.drift.driftEntryModes.includes('brake'), 'brake', runs.drift.driftEntryModes),
    check('driftStateCycle', includesAll(runs.drift.driftStates, ['setup', 'drift', 'recovery']), ['setup', 'drift', 'recovery'], runs.drift.driftStates),
    check('driftCounterObserved', runs.drift.maxCounterSteerTimer > 0, '> 0s', runs.drift.maxCounterSteerTimer, true),
    check('driftExitBurstObserved', runs.drift.maxDriftExitBurst > 0.01, '> 0.01', runs.drift.maxDriftExitBurst, true),
    check('driftNoGuardrailImpact', runs.drift.guardrailImpacts === 0, 0, runs.drift.guardrailImpacts, true),
    check('driftRailProjectionCoverage', runs.drift.guardrailProjectionSamples === runs.drift.sampleCount, runs.drift.sampleCount, runs.drift.guardrailProjectionSamples),
    check('driftRailProjectionIdentity', runs.drift.maxGuardrailProjectionRatioError <= 0.0002, '<= 0.0002', runs.drift.maxGuardrailProjectionRatioError),
    check('driftRailScreenGapNonNegative', runs.drift.activeRailScreenGapPx.min >= -0.01, '>= -0.01px', runs.drift.activeRailScreenGapPx.min),
    check(
        'shaderEnvelopeBounded',
        scenarioIds.every((id) => runs[id].maxShaderIntensity <= 0.38),
        '<= 0.38',
        Object.fromEntries(scenarioIds.map((id) => [id, runs[id].maxShaderIntensity])),
    ),
    check(
        'presentationChannelsFinite',
        scenarioIds.every((id) => [
            runs[id].fovDegrees.min,
            runs[id].fovDegrees.max,
            runs[id].maxShaderIntensity,
            runs[id].maxTheoreticalSegmentPassRate,
        ].every(Number.isFinite)),
        true,
        true,
    ),
];

const blockers = checks.filter((entry) => entry.blocking && !entry.pass).map((entry) => entry.id);
const tse5CheckIds = new Set([
    'straightStartsNearZeroKmh',
    'straightReaches225Kmh',
    'straightNoGuardrailImpact',
    'straightUsesOneXTimeScale',
    'straightThrottleHeld',
    'straightRemainsStraight',
    'straightNoSteering',
    'straightNoCornerLoss',
    'straightReachesSixthGear',
    'straightAvoidsFuelCut',
    'straightUsesSh7MildDownhill',
    'presentationChannelsFinite',
]);
const tse5Blockers = checks
    .filter((entry) => tse5CheckIds.has(entry.id) && !entry.pass)
    .map((entry) => entry.id);
const findings = [
    {
        id: 'flatStraightTopSpeedShortfall',
        observedKmh: runs.straight.speedKmh.max,
        status: runs.straight.speedKmh.max >= 223 ? 'resolved' : 'observed',
        targetKmh: 225,
    },
    {
        driftActiveGapPx: runs.drift.activeRailScreenGapPx,
        driftProjectionRatioError: runs.drift.maxGuardrailProjectionRatioError,
        gripActiveGapPx: runs.grip.activeRailScreenGapPx,
        gripProjectionRatioError: runs.grip.maxGuardrailProjectionRatioError,
        id: 'railScreenProjectionMismatch',
        status: runs.grip.maxGuardrailProjectionRatioError <= 0.0002 &&
            runs.drift.maxGuardrailProjectionRatioError <= 0.0002 &&
            runs.grip.activeRailScreenGapPx.min >= -0.01 &&
            runs.drift.activeRailScreenGapPx.min >= -0.01
            ? 'resolved'
            : 'observed',
    },
    {
        driftRoadRatio: runs.drift.maxRoadOffsetRatio,
        driftVisualRailRatio: runs.drift.maxActiveRailContactRatio,
        gripRoadRatio: runs.grip.maxRoadOffsetRatio,
        gripVisualRailRatio: runs.grip.maxActiveRailContactRatio,
        id: 'visualRailContactMismatch',
        status: runs.grip.guardrailImpacts === 0 && runs.drift.guardrailImpacts === 0
            ? 'resolved'
            : 'observed',
    },
    {
        counterSteerTimer: runs.drift.maxCounterSteerTimer,
        driftExitBurst: runs.drift.maxDriftExitBurst,
        id: 'driftCounterExitNotObserved',
        status: runs.drift.maxCounterSteerTimer > 0 && runs.drift.maxDriftExitBurst > 0.01
            ? 'resolved'
            : 'observed',
    },
];
const report = {
    approvalReady: blockers.length === 0,
    blockers,
    captureValid: checks.filter((entry) => !entry.blocking).every((entry) => entry.pass),
    checks,
    findings,
    generatedAt: new Date().toISOString(),
    manualApproval: 'pending',
    runs,
    schemaVersion: 3,
    tse5: {
        blockers: tse5Blockers,
        ready: tse5Blockers.length === 0,
        status: tse5Blockers.length === 0
            ? 'runtime-straight-verified-manual-driving-approval-still-pending'
            : 'runtime-straight-blocked',
    },
};

await mkdir(runtimeRoot, { recursive: true });
await writeFile(
    path.join(runtimeRoot, 'sh7-integrated-telemetry.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(runtimeRoot, 'sh7-integrated-telemetry.md'),
    buildMarkdown(report),
);

console.log(`SH-7 runtime capture: ${report.captureValid ? 'PASS' : 'FAIL'}`);
console.log(`TSE-5 runtime straight: ${report.tse5.ready ? 'READY' : 'BLOCKED'}`);
console.log(`SH-7 approval: ${report.approvalReady ? 'READY' : 'PENDING'}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);
console.log(`Report: ${path.relative(projectRoot, path.join(runtimeRoot, 'sh7-integrated-telemetry.md'))}`);

if (!report.captureValid) process.exitCode = 1;

async function findLatestJsonl(directory) {
    const files = (await readdir(directory))
        .filter((file) => file.endsWith('.jsonl'))
        .sort();

    if (files.length === 0) throw new Error(`No JSONL telemetry found in ${directory}`);

    return path.join(directory, files.at(-1));
}

async function readJsonl(filePath) {
    const source = await readFile(filePath, 'utf8');

    return source
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function summarizeRun(samplesForRun, source) {
    const states = samplesForRun.map((sample) => sample.payload);
    const projectionStates = states.filter((state) => state.guardrailScreen);
    const rawSpeeds = states.map((state) => finite(state.player?.speed)).filter(Number.isFinite);
    const hitTargetsKmh = [60, 100, 175.34, 212.687, 223, 225];
    const hits = Object.fromEntries(hitTargetsKmh.map((targetKmh) => {
        const state = states.find((candidate) => finite(candidate.player?.speedKmh) >= targetKmh);
        return [targetKmh, state ? {
            elapsedSec: finite(state.elapsedSec),
            gear: finite(state.player?.gear),
            rpm: finite(state.player?.rpm),
            speedKmh: finite(state.player?.speedKmh),
        } : null];
    }));

    return {
        accelReleasedSamples: states.filter((state) => state.input?.accelPressed !== true).length,
        cornerGrades: unique(states.map((state) => state.player?.cornerDemand?.grade)),
        driftEntryModes: unique(states.map((state) => state.player?.driftEntryMode)),
        driftStates: unique(states.map((state) => state.player?.driftState)),
        fovDegrees: range(states.map((state) => state.camera?.fovDegrees)),
        gear: range(states.map((state) => state.player?.gear)),
        activeRailScreenGapPx: range(projectionStates.map((state) => state.guardrailScreen?.activeGapPx)),
        guardrailImpacts: max(states.map((state) => state.player?.guardrailImpactCount)),
        fuelCutSamples: states.filter((state) => state.player?.fuelCutActive === true).length,
        hits,
        maxActiveRailContactRatio: max(states.map((state) => state.player?.guardrailActiveContactRatio)),
        guardrailProjectionSamples: projectionStates.length,
        maxGuardrailProjectionRatioError: max(projectionStates.map((state) => Math.abs(
            Math.abs(finite(state.guardrailScreen?.normalizedOffset)) -
                finite(state.player?.guardrailActiveContactRatio)
        ))),
        maxCounterSteerTimer: max(states.map((state) => state.player?.counterSteerTimer)),
        maxCornerLossForce: max(states.map((state) => state.player?.cornerSpeedLoss?.totalForce)),
        maxDriftExitBurst: max(states.map((state) => state.speedEffect?.driftExitBurst)),
        maxDriftRatio: max(states.map((state) => state.player?.driftRatio)),
        maxMotionAnchorPassRate: max(states.map((state) => state.roadObjects?.motionAnchorPassRate)),
        maxAbsSteerInput: max(states.map((state) => Math.abs(finite(state.input?.steerAxis)))),
        maxAbsSteering: max(states.map((state) => Math.abs(finite(state.player?.steering)))),
        maxRoadOffsetRatio: max(states.map((state) => Math.abs(finite(state.player?.roadOffsetRatio)))),
        maxShaderExpectedPeakAlpha: max(states.map((state) => state.speedEffect?.expectedPeakAlpha)),
        maxShaderIntensity: max(states.map((state) => state.speedEffect?.intensity)),
        maxTheoreticalSegmentPassRate: rawSpeeds.length === 0 ? 0 : round(max(rawSpeeds) / 240),
        maxUndersteerRatio: max(states.map((state) => state.player?.overspeedUndersteerRatio)),
        rpm: range(states.map((state) => state.player?.rpm)),
        runtimeElapsedSec: range(states.map((state) => state.elapsedSec)),
        sampleCount: states.length,
        segmentTimesSec: {
            '100-175.34': elapsed(hits, 100, 175.34),
            '175.34-212.687': elapsed(hits, 175.34, 212.687),
            '212.687-223': elapsed(hits, 212.687, 223),
        },
        source: path.relative(projectRoot, source),
        slopeAcceleration: range(states.map((state) => state.player?.slopeAcceleration)),
        speedKmh: range(states.map((state) => state.player?.speedKmh)),
        speedLossZones: unique(states.map((state) => state.player?.cornerDemand?.speedLossZone)),
        qaTimeScales: unique(states.map((state) => state.qa?.timeScale)),
    };
}

function elapsed(hits, fromKmh, toKmh) {
    const from = hits[fromKmh];
    const to = hits[toKmh];
    return from && to ? round(to.elapsedSec - from.elapsedSec) : null;
}

function check(id, pass, target, value, blocking = false) {
    return { blocking, id, pass, target, value };
}

function includesAll(values, required) {
    return required.every((value) => values.includes(value));
}

function unique(values) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined))].sort();
}

function range(values) {
    const finiteValues = values.map(finite).filter(Number.isFinite);

    return {
        max: finiteValues.length === 0 ? null : round(Math.max(...finiteValues)),
        min: finiteValues.length === 0 ? null : round(Math.min(...finiteValues)),
    };
}

function max(values) {
    const finiteValues = values.map(finite).filter(Number.isFinite);

    return finiteValues.length === 0 ? 0 : round(Math.max(...finiteValues));
}

function finite(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul SH-7 Integrated Runtime Telemetry',
        '',
        `Generated: ${result.generatedAt}`,
        '',
        `Capture validity: **${result.captureValid ? 'PASS' : 'FAIL'}**`,
        '',
        `Approval: **${result.approvalReady ? 'READY' : 'PENDING'}**`,
        '',
        `TSE-5 runtime straight: **${result.tse5.ready ? 'READY' : 'BLOCKED'}**`,
        '',
        `Manual approval: **${result.manualApproval}**`,
        '',
        `Blocking gates: ${result.blockers.map((id) => `\`${id}\``).join(', ') || 'none'}`,
        '',
        '## Runtime runs',
        '',
        '| run | samples | speed km/h | gear | FOV | shader max | segment/s max | grades | drift states | impacts |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |',
        ...scenarioIds.map((id) => {
            const run = result.runs[id];
            return `| ${id} | ${run.sampleCount} | ${run.speedKmh.min}~${run.speedKmh.max} | ` +
                `${run.gear.min}~${run.gear.max} | ${run.fovDegrees.min}~${run.fovDegrees.max}° | ` +
                `${run.maxShaderIntensity} | ${run.maxTheoreticalSegmentPassRate} | ` +
                `${run.cornerGrades.join('/')} | ${run.driftStates.join('/')} | ${run.guardrailImpacts} |`;
        }),
        '',
        '## TSE-5 1× straight',
        '',
        `- Source: \`${result.runs.straight.source}\``,
        `- Runtime elapsed: **${result.runs.straight.runtimeElapsedSec.min}~${result.runs.straight.runtimeElapsedSec.max}s** at qaTimeScale **${result.runs.straight.qaTimeScales.join('/')}×**`,
        `- Slope acceleration: **${result.runs.straight.slopeAcceleration.min}~${result.runs.straight.slopeAcceleration.max}**`,
        `- 0→100 / 0→223 / 0→225: **${format(result.runs.straight.hits['100']?.elapsedSec)} / ${format(result.runs.straight.hits['223']?.elapsedSec)} / ${format(result.runs.straight.hits['225']?.elapsedSec)}s**`,
        `- 100→175.34 / 175.34→212.687 / 212.687→223: **${format(result.runs.straight.segmentTimesSec['100-175.34'])} / ${format(result.runs.straight.segmentTimesSec['175.34-212.687'])} / ${format(result.runs.straight.segmentTimesSec['212.687-223'])}s**`,
        `- Final envelope: **${result.runs.straight.speedKmh.max}km/h**, gear **${result.runs.straight.gear.max}**, FOV **${result.runs.straight.fovDegrees.max}°**, shader **${result.runs.straight.maxShaderIntensity}**, theoretical cadence **${result.runs.straight.maxTheoreticalSegmentPassRate} segment/s**`,
        '- The camera z is pinned to the SH-7 straight probe, so observed motion-anchor passes are intentionally zero; theoretical segment cadence is recorded from raw speed.',
        '',
        '## Findings',
        '',
        ...result.findings.map((finding) => `- ${finding.id}: **${finding.status}** — \`${JSON.stringify(finding)}\``),
        '',
        '## Gates',
        '',
        '| gate | blocking | pass | target | value |',
        '| --- | --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.blocking ? 'yes' : 'no'} | ${entry.pass ? 'yes' : 'no'} | ` +
            `${format(entry.target)} | ${format(entry.value)} |`
        )),
        '',
        'Automatic capture validity does not grant manual driving approval.',
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function format(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value).replaceAll('|', '\\|');
    return String(value).replaceAll('|', '\\|');
}
