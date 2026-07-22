import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const telemetryRoot = path.join(projectRoot, 'assets/telemetry/generated');
const outputDir = path.join(telemetryRoot, 'top-speed-equilibrium');
const jsonPath = path.join(outputDir, 'top-speed-regression-tse6.json');
const markdownPath = path.join(outputDir, 'top-speed-regression-tse6.md');

const sourceRuns = [
    runSource('standing-start', 'simulate-standing-start.mjs'),
    runSource('top-speed-calibration', 'audit-top-speed-calibration.mjs'),
    runSource('sh7-runtime', 'audit-sh7-runtime.mjs'),
    runSource('corner-demand', 'simulate-corner-demand-sweep.mjs'),
    runSource('handling-relations', 'audit-handling-relations.mjs'),
    runSource('speed-presentation', 'simulate-speed-presentation-sweep.mjs'),
];
const [tse1, tse2, tse3, tse4, tse5, corner, handling, presentation] = await Promise.all([
    readJson('top-speed-equilibrium/top-speed-equilibrium-tse1-baseline.json'),
    readJson('top-speed-equilibrium/top-speed-equilibrium-tse2-baseline.json'),
    readJson('top-speed-equilibrium/top-speed-force-budget-tse3.json'),
    readJson('top-speed-equilibrium/top-speed-calibration-tse4.json'),
    readJson('speed-presentation/sh7-runtime/sh7-integrated-telemetry.json'),
    readJson('corner-demand/corner-demand-baseline.json'),
    readJson('handling-relations/handling-relations-hnd6-baseline.json'),
    readJson('speed-presentation/speed-presentation-baseline.json'),
]);

const tse2Level = findRow(tse2.rows, 'level');
const tse4Level = findRow(tse4.rows, 'level');
const tse4Uphill = findRow(tse4.rows, 'uphill');
const tse4Downhill = findRow(tse4.rows, 'sh7-mild-downhill');
const gear4 = tse2.gearEnvelopeRows.find((row) => row.gear === 4);
const oldForce225 = tse3.forceBudgetRows.find((row) => row.speedKmh === 225);
const newForce225 = tse4.forceBracket.find((row) => row.speedKmh === 225);
const tse3Selected = tse3.candidateRows.find((row) => row.id === tse3.decision.selectedCandidate);
const runtime = tse5.runs.straight;
const cornerRows = ['easy', 'medium', 'sharp'].map((grade) => {
    const level = findCorner(corner, grade, 'level');
    const downhill = findCorner(corner, grade, 'downhill');
    return {
        downhillCornerLossPercent: downhill.cornerSpeedLossPercent,
        downhillRawLossPercent: downhill.speedLossPercent,
        grade,
        levelCornerLossPercent: level.cornerSpeedLossPercent,
        levelMinusDownhillPercentagePoints: round(
            level.cornerSpeedLossPercent - downhill.cornerSpeedLossPercent,
        ),
    };
});
const checks = [
    check('historicalTse1Pass', tse1.pass === true, true, tse1.pass),
    check('historicalTse2Pass', tse2.pass === true, true, tse2.pass),
    check('historicalTse3Pass', tse3.pass === true, true, tse3.pass),
    check('productionTse4Pass', tse4.pass === true, true, tse4.pass),
    check('runtimeTse5Ready', tse5.tse5?.ready === true, true, tse5.tse5?.ready),
    check('cornerDemandTse6Pass', corner.pass === true, true, corner.pass),
    check('handlingRelationsTse6Pass', handling.pass === true, true, handling.pass),
    check('speedPresentationPreserved', presentation.pass === true, true, presentation.pass),
    between('standingStart0to100Sec', tse4Level.hits['100'].timeSec, 7.8, 8.3),
    check('standingStartGearAt60', tse4Level.hits['60'].gear === 2, 2, tse4Level.hits['60'].gear),
    check('standingStartGearAt100', tse4Level.hits['100'].gear === 3, 3, tse4Level.hits['100'].gear),
    between('levelNaturalEquilibriumKmh', tse4Level.end.speedKmh, 223, 225),
    check('levelAvoidsClamp', tse4Level.hitHardClamp === false, false, tse4Level.hitHardClamp),
    check('runtimeReaches225', runtime.speedKmh.max === 225, 225, runtime.speedKmh.max),
    check('runtimeStraightIsClean', runtime.maxAbsSteering === 0 && runtime.maxCornerLossForce === 0 && runtime.guardrailImpacts === 0, 0, {
        cornerLoss: runtime.maxCornerLossForce,
        guardrailImpacts: runtime.guardrailImpacts,
        steering: runtime.maxAbsSteering,
    }),
    check(
        'slopeOrderingAndClassification',
        tse4Uphill.end.speedKmh < tse4Level.end.speedKmh &&
            tse4Level.end.speedKmh < tse4Downhill.end.speedKmh &&
            tse4Level.classification === 'force-equilibrium' &&
            tse4Downhill.classification === 'safety-cap',
        'uphill < level equilibrium < downhill safety-cap',
        {
            downhill: [tse4Downhill.end.speedKmh, tse4Downhill.classification],
            level: [tse4Level.end.speedKmh, tse4Level.classification],
            uphill: [tse4Uphill.end.speedKmh, tse4Uphill.classification],
        },
    ),
    check(
        'forceBracketStillNatural',
        tse4.forceBracket[0].force.netAcceleration > 0 &&
            Math.abs(tse4.forceBracket[1].force.netAcceleration) <= 0.001 &&
            tse4.forceBracket[2].force.netAcceleration < 0,
        'positive / approximately zero / negative at 223 / 224 / 225km/h',
        tse4.forceBracket.map((row) => row.force.netAcceleration),
    ),
    check(
        'cornerLossUsesCalibratedStraightReference',
        cornerRows.every((row) => row.levelMinusDownhillPercentagePoints >= 5),
        'level loss exceeds safety-cap downhill by >= 5 percentage points for each grade',
        cornerRows,
    ),
];

const report = roundObject({
    acceleration: {
        corrected: {
            zeroTo100Sec: tse4Level.hits['100'].timeSec,
            zeroTo60Sec: tse4Level.hits['60'].timeSec,
        },
        dragOnlyCandidate: {
            zeroTo100Sec: tse3Selected.hits['100'],
            zeroTo60Sec: tse3Selected.hits['60'],
        },
        splits: {
            deterministicLevel: tse4Level.segmentTimes,
            runtimeSh7: runtime.segmentTimesSec,
        },
    },
    beforeAfter: [
        {
            classification: 'historical level force equilibrium',
            gear: tse2Level.terminal.gear,
            id: 'before-level-tse2',
            speedKmh: tse2Level.terminal.speedKmh,
        },
        {
            classification: 'historical SH-7 runtime observation',
            gear: 4,
            id: 'before-sh7-runtime',
            speedKmh: tse2.findings.sh7RuntimeComparisonKmh.measured,
        },
        {
            classification: tse4Level.classification,
            gear: tse4Level.end.gear,
            id: 'after-level-tse4',
            speedKmh: tse4Level.end.speedKmh,
        },
        {
            classification: 'mild-downhill-safety-cap',
            gear: runtime.gear.max,
            id: 'after-sh7-runtime-tse5',
            speedKmh: runtime.speedKmh.max,
        },
    ],
    checks,
    cornerRows,
    forceAt225: {
        after: {
            aero: newForce225.force.aeroDrag,
            drive: newForce225.force.drive,
            netAcceleration: newForce225.force.netAcceleration,
            rolling: newForce225.force.rollingResistance,
        },
        before: {
            aero: oldForce225.aeroDrag,
            drive: oldForce225.engineForce,
            netAcceleration: oldForce225.netAcceleration,
            rolling: oldForce225.rollingResistance,
        },
    },
    gearBoundary: {
        declaredFourthMaxSpeedKmh: gear4.declaredMaxSpeedKmh,
        physicalFourthShiftSpeedKmh: gear4.physicalShiftSpeedKmh,
        shiftRpm: gear4.shiftRpm,
    },
    generatedAt: new Date().toISOString(),
    pass: checks.every((entry) => entry.pass),
    slopeRows: [
        { classification: tse4Uphill.classification, id: 'uphill', speedKmh: tse4Uphill.end.speedKmh },
        { classification: tse4Level.classification, id: 'level', speedKmh: tse4Level.end.speedKmh },
        { classification: tse4Downhill.classification, id: 'sh7-mild-downhill', speedKmh: tse4Downhill.end.speedKmh },
    ],
    sourceRuns,
    stage: 'TSE-6',
    status: 'top-speed-regression-locked-integrated-sh7-manual-approval-pending',
});

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`TSE-6 top-speed regression: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
for (const result of checks) console.log(`- ${result.pass ? 'PASS' : 'FAIL'} ${result.id}`);
if (!report.pass) process.exitCode = 1;

function runSource(id, scriptName) {
    const result = spawnSync(process.execPath, [path.join(__dirname, scriptName)], {
        cwd: projectRoot,
        encoding: 'utf8',
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) throw new Error(`${scriptName} failed with exit code ${result.status}`);
    return { id, script: `scripts/${scriptName}`, status: 'pass' };
}

async function readJson(relativePath) {
    return JSON.parse(await readFile(path.join(telemetryRoot, relativePath), 'utf8'));
}

function findRow(rows, id) {
    const row = rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`Missing row ${id}`);
    return row;
}

function findCorner(report, grade, slopeId) {
    const row = report.syntheticRows.find((entry) => entry.grade === grade && entry.slopeId === slopeId && entry.initialSpeedKmh === 225 && entry.preparationMode === 'full-throttle');
    if (!row) throw new Error(`Missing corner row ${grade}/${slopeId}`);
    return row;
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul TSE-6 최고속 회귀 묶음',
        '',
        `생성: ${result.generatedAt}`,
        '',
        `상태: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '표시 상한, 실제 기어 RPM, 종방향 힘의 평형, runtime SH-7 결과를 한 회귀 묶음으로 고정한다.',
        '',
        '## Before / after',
        '',
        '| stage | speed km/h | gear | classification |',
        '| --- | ---: | ---: | --- |',
        ...result.beforeAfter.map((row) => `| ${row.id} | ${format(row.speedKmh)} | ${row.gear} | ${row.classification} |`),
        '',
        '## The hidden fourth-gear boundary',
        '',
        `- Legacy declared boundary: **${format(result.gearBoundary.declaredFourthMaxSpeedKmh)}km/h**`,
        `- Physical ${format(result.gearBoundary.shiftRpm)}rpm boundary: **${format(result.gearBoundary.physicalFourthShiftSpeedKmh)}km/h**`,
        '',
        '## Force budget at 225km/h',
        '',
        '| stage | drive | rolling | aero | net acceleration |',
        '| --- | ---: | ---: | ---: | ---: |',
        `| before | ${format(result.forceAt225.before.drive)} | ${format(result.forceAt225.before.rolling)} | ${format(result.forceAt225.before.aero)} | ${format(result.forceAt225.before.netAcceleration)} |`,
        `| after | ${format(result.forceAt225.after.drive)} | ${format(result.forceAt225.after.rolling)} | ${format(result.forceAt225.after.aero)} | ${format(result.forceAt225.after.netAcceleration)} |`,
        '',
        '## Acceleration preservation',
        '',
        '| candidate | 0-60 | 0-100 |',
        '| --- | ---: | ---: |',
        `| drag-only intermediate | ${format(result.acceleration.dragOnlyCandidate.zeroTo60Sec)}s | ${format(result.acceleration.dragOnlyCandidate.zeroTo100Sec)}s |`,
        `| corrected production | ${format(result.acceleration.corrected.zeroTo60Sec)}s | ${format(result.acceleration.corrected.zeroTo100Sec)}s |`,
        '',
        '## Mid/high-speed splits',
        '',
        '| source | 100→175.34 | 175.34→212.687 | 212.687→223 |',
        '| --- | ---: | ---: | ---: |',
        `| deterministic level | ${format(result.acceleration.splits.deterministicLevel['100-175.34'])}s | ${format(result.acceleration.splits.deterministicLevel['175.34-212.687'])}s | ${format(result.acceleration.splits.deterministicLevel['212.687-223'])}s |`,
        `| runtime SH-7 downhill | ${format(result.acceleration.splits.runtimeSh7['100-175.34'])}s | ${format(result.acceleration.splits.runtimeSh7['175.34-212.687'])}s | ${format(result.acceleration.splits.runtimeSh7['212.687-223'])}s |`,
        '',
        '## Slope relationship',
        '',
        '| scenario | speed km/h | classification |',
        '| --- | ---: | --- |',
        ...result.slopeRows.map((row) => `| ${row.id} | ${format(row.speedKmh)} | ${row.classification} |`),
        '',
        'Level은 clamp 없는 force equilibrium이고 SH-7 mild downhill은 양의 경사 가속이 남은 safety cap이다.',
        '',
        '## TSE-6 corner-loss reference',
        '',
        '| grade | level corner-only % | downhill corner-only % | downhill raw % | level - downhill pp |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...result.cornerRows.map((row) => `| ${row.grade} | ${format(row.levelCornerLossPercent)} | ${format(row.downhillCornerLossPercent)} | ${format(row.downhillRawLossPercent)} | ${format(row.levelMinusDownhillPercentagePoints)} |`),
        '',
        '과거 HND-3 손실률은 225km/h 직선 자체가 감속하던 상태를 기준으로 했다. TSE-6은 같은 speed/slope/pedal의 calibrated straight control과 코너 출구를 비교한다.',
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ${formatValue(entry.value)} |`),
        '',
        '이 PASS는 최고속 회귀가 고정됐다는 뜻이다. Visual rail과 drift cycle의 통합 실주행 승인은 별도 blocker로 남는다.',
        '',
    ];
    return `${lines.join('\n')}\n`;
}

function check(id, pass, target, value) { return { id, pass, target, value }; }
function between(id, value, min, max) { return check(id, value >= min && value <= max, [min, max], value); }
function roundObject(value) {
    if (Array.isArray(value)) return value.map(roundObject);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundObject(entry)]));
    return typeof value === 'number' && Number.isFinite(value) ? round(value, 12) : value;
}
function round(value, digits = 3) { return Number(value.toFixed(digits)); }
function format(value, digits = 3) { return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, '') : '-'; }
function formatValue(value) {
    if (typeof value === 'number') return format(value, 9);
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value).replaceAll('|', '\\|');
    return String(value).replaceAll('|', '\\|');
}
