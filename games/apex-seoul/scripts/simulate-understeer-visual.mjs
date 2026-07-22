import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createVehicleUndersteerVisualState,
    updateVehicleUndersteerVisualState,
} from '../src/game/vehicleUndersteerVisual.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/understeer-visual');
const dt = 1 / 60;
const physicalSteering = 0.58;
const cases = [
    {
        baseGripAngleCap: 0.72,
        driftState: 'grip',
        gripSteerAngleLimit: 0.72,
        id: 'within-budget',
        lateralVelocityRoadRate: 0,
        understeerRatio: 0,
    },
    {
        baseGripAngleCap: 0.72,
        driftState: 'grip',
        gripSteerAngleLimit: 0.602,
        id: 'easy-225',
        lateralVelocityRoadRate: 0.477,
        understeerRatio: 0.265,
    },
    {
        baseGripAngleCap: 0.72,
        driftState: 'grip',
        gripSteerAngleLimit: 0.462,
        id: 'medium-225',
        lateralVelocityRoadRate: 0.421,
        understeerRatio: 0.579,
    },
    {
        baseGripAngleCap: 0.72,
        driftState: 'grip',
        gripSteerAngleLimit: 0.294,
        id: 'sharp-225',
        lateralVelocityRoadRate: 0.843,
        understeerRatio: 1,
    },
];

const rows = cases.map((fixture) => settleFixture(fixture));
const withinBudget = findRow('within-budget');
const easy = findRow('easy-225');
const medium = findRow('medium-225');
const sharp = findRow('sharp-225');
const recovery = simulateRecovery();
const driftBypass = simulateDriftBypass();
const checks = [
    checkBetween('withinBudget.bodyYawAuthority', withinBudget.bodyYawAuthority, 0.999, 1),
    checkBetween('withinBudget.poseAuthority', withinBudget.poseAuthority, 0.999, 1),
    checkBetween('withinBudget.cueIntensity', withinBudget.cueIntensity, 0, 0.001),
    check(
        'bodyAuthorityOrdering',
        easy.bodyYawAuthority > medium.bodyYawAuthority &&
            medium.bodyYawAuthority > sharp.bodyYawAuthority,
        'easy > medium > sharp',
        [easy.bodyYawAuthority, medium.bodyYawAuthority, sharp.bodyYawAuthority],
    ),
    checkBetween('easy.bodyYawAuthority', easy.bodyYawAuthority, 0.85, 1),
    checkBetween('medium.bodyYawAuthority', medium.bodyYawAuthority, 0.58, 0.82),
    checkBetween('sharp.bodyYawAuthority', sharp.bodyYawAuthority, 0.44, 0.55),
    checkBetween('easy.poseAuthority', easy.poseAuthority, 0.9, 1),
    checkBetween('medium.poseAuthority', medium.poseAuthority, 0.72, 0.9),
    checkBetween('sharp.poseAuthority', sharp.poseAuthority, 0.62, 0.75),
    check(
        'inputPoseRemainsAheadOfBodyYaw',
        [easy, medium, sharp].every((row) => (
            Math.abs(row.inputPoseValue) >= Math.abs(row.poseValue) &&
            Math.abs(row.poseValue) > Math.abs(row.bodyYawValue)
        )),
        'input pose >= frame pose > body yaw',
        [easy, medium, sharp].map((row) => ({
            body: row.bodyYawValue,
            input: row.inputPoseValue,
            pose: row.poseValue,
        })),
    ),
    check(
        'cueOrdering',
        easy.cueIntensity < medium.cueIntensity && medium.cueIntensity < sharp.cueIntensity,
        'easy < medium < sharp',
        [easy.cueIntensity, medium.cueIntensity, sharp.cueIntensity],
    ),
    checkBetween('easy.cueIntensity', easy.cueIntensity, 0.02, 0.2),
    checkBetween('medium.cueIntensity', medium.cueIntensity, 0.45, 0.8),
    checkBetween('sharp.cueIntensity', sharp.cueIntensity, 0.9, 1),
    checkBetween('sharp.authorityStepMax', sharp.authorityStepMax, 0, 0.09),
    checkBetween('sharp.cueStepMax', sharp.cueStepMax, 0, 0.22),
    checkBetween('recovery.bodyYawAuthority400ms', recovery.bodyYawAuthority, 0.9, 1),
    checkBetween('recovery.cueIntensity400ms', recovery.cueIntensity, 0, 0.08),
    checkBetween('driftBypass.bodyYawAuthority', driftBypass.bodyYawAuthority, 0.99, 1),
    checkBetween('driftBypass.cueIntensity', driftBypass.cueIntensity, 0, 0.05),
];
const report = {
    checks,
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    recovery,
    rows,
    schemaVersion: 1,
};

await mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, 'understeer-visual-hnd5-baseline.json');
const markdownPath = path.join(outputDir, 'understeer-visual-hnd5-baseline.md');
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`Understeer visual QA: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
for (const row of rows) {
    console.log(
        `- ${row.id}: body ${row.bodyYawAuthority.toFixed(3)} / ` +
        `pose ${row.poseAuthority.toFixed(3)} / cue ${row.cueIntensity.toFixed(3)}`,
    );
}

if (!report.pass) process.exitCode = 1;

function settleFixture(fixture) {
    let state = createVehicleUndersteerVisualState();
    let authorityStepMax = 0;
    let cueStepMax = 0;

    for (let frame = 0; frame < 90; frame += 1) {
        const previous = state;
        state = updateVehicleUndersteerVisualState(state, {
            ...fixture,
            physicalSteering,
        }, dt);
        authorityStepMax = Math.max(
            authorityStepMax,
            Math.abs(state.bodyYawAuthority - previous.bodyYawAuthority),
        );
        cueStepMax = Math.max(cueStepMax, Math.abs(state.cueIntensity - previous.cueIntensity));
    }

    return roundObject({
        ...state,
        authorityStepMax,
        cueStepMax,
        id: fixture.id,
    });
}

function simulateRecovery() {
    let state = createVehicleUndersteerVisualState();
    const sharpInput = {
        ...cases.find((entry) => entry.id === 'sharp-225'),
        physicalSteering,
    };

    for (let frame = 0; frame < 90; frame += 1) {
        state = updateVehicleUndersteerVisualState(state, sharpInput, dt);
    }
    for (let frame = 0; frame < 24; frame += 1) {
        state = updateVehicleUndersteerVisualState(state, {
            ...sharpInput,
            gripSteerAngleLimit: 0.66,
            lateralVelocityRoadRate: 0.04,
            understeerRatio: 0.18,
        }, dt);
    }

    return roundObject(state);
}

function simulateDriftBypass() {
    let state = createVehicleUndersteerVisualState();
    const sharpInput = {
        ...cases.find((entry) => entry.id === 'sharp-225'),
        physicalSteering,
    };

    for (let frame = 0; frame < 90; frame += 1) {
        state = updateVehicleUndersteerVisualState(state, sharpInput, dt);
    }
    for (let frame = 0; frame < 30; frame += 1) {
        state = updateVehicleUndersteerVisualState(state, {
            ...sharpInput,
            driftState: 'drift',
        }, dt);
    }

    return roundObject(state);
}

function findRow(id) {
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing row ${id}`);
    return row;
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul HND-5 Understeer Visual Authority',
        '',
        `Generated: ${result.generatedAt}`,
        '',
        `Status: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '| case | grip authority | body authority | pose authority | input pose | frame pose | body yaw | scrub cue |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.rows.map((row) => (
            `| ${row.id} | ${format(row.gripAuthorityRatio)} | ` +
            `${format(row.bodyYawAuthority)} | ${format(row.poseAuthority)} | ` +
            `${format(row.inputPoseValue)} | ${format(row.poseValue)} | ` +
            `${format(row.bodyYawValue)} | ${format(row.cueIntensity)} |`
        )),
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ` +
            `${formatValue(entry.target)} | ${formatValue(entry.value)} |`
        )),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function checkBetween(id, value, min, max) {
    return check(id, value >= min && value <= max, [min, max], value);
}

function roundObject(value) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'number' ? Number(entry.toFixed(4)) : entry,
    ]));
}

function format(value) {
    return Number.isFinite(value) ? Number(value).toFixed(3).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
