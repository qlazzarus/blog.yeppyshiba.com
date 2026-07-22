import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/handling-relations');
const grades = ['easy', 'medium', 'sharp'];
const slopes = ['level', 'downhill'];
const speedKmh = 225;

const sourceRuns = [
    runSource('corner-demand', 'simulate-corner-demand-sweep.mjs'),
    runSource('understeer-visual', 'simulate-understeer-visual.mjs'),
];
const corner = await readJson(
    'assets/telemetry/generated/corner-demand/corner-demand-baseline.json',
);
const visual = await readJson(
    'assets/telemetry/generated/understeer-visual/understeer-visual-hnd5-baseline.json',
);
const hnd1 = await readJson(
    'assets/telemetry/generated/corner-demand/corner-demand-hnd1-baseline.json',
);
const hnd3 = await readJson(
    'assets/telemetry/generated/corner-demand/corner-demand-hnd3-baseline.json',
);
const tse2 = await readJson(
    'assets/telemetry/generated/corner-demand/corner-demand-tse2-baseline.json',
);
const tse6 = await readJson(
    'assets/telemetry/generated/corner-demand/corner-demand-tse6-baseline.json',
);

const preparationRows = slopes.flatMap((slopeId) => grades.map((grade) => {
    const full = findSynthetic(corner, grade, slopeId, 'full-throttle');
    const prepared = findSynthetic(corner, grade, slopeId, 'brake-prepared');

    return summarizePreparation(grade, slopeId, full, prepared);
}));
const trackPreparationRows = grades.map((grade) => {
    const full = findTrack(corner, grade, 'full-throttle');
    const prepared = findTrack(corner, grade, 'brake-prepared');

    return summarizePreparation(grade, 'bugak-fixed', full, prepared);
});
const gradeLossRows = slopes.map((slopeId) => ({
    easy: findSynthetic(corner, 'easy', slopeId, 'full-throttle').cornerSpeedLossPercent,
    medium: findSynthetic(corner, 'medium', slopeId, 'full-throttle').cornerSpeedLossPercent,
    sharp: findSynthetic(corner, 'sharp', slopeId, 'full-throttle').cornerSpeedLossPercent,
    slopeId,
}));
const levelSharpLoss = gradeLossRows.find((row) => row.slopeId === 'level').sharp;
const downhillSharpLoss = gradeLossRows.find((row) => row.slopeId === 'downhill').sharp;
const currentStraightComparison = compareStraightControls(corner, tse6);
const tse2MigrationComparison = compareStraightControls(tse2, hnd3);
const zeroTo100DeltaSec = Math.abs(corner.controls.zeroTo100Sec - hnd1.controls.zeroTo100Sec);
const sixtyKmhDeltaSec = Math.abs(
    corner.controls.sixtyKmh.timeSec - tse6.controls.sixtyKmh.timeSec,
);
const accidentalDriftRatioMax = Math.max(
    ...corner.syntheticRows.map((row) => row.accidentalDriftRatio),
    ...corner.track.rows.map((row) => row.accidentalDriftRatio),
);
const checks = [
    check(
        'source.cornerDemandPass',
        corner.pass === true,
        true,
        corner.pass,
    ),
    check(
        'source.understeerVisualPass',
        visual.pass === true,
        true,
        visual.pass,
    ),
    check(
        'relation.preparedUndersteerBelowFull',
        preparationRows.every((row) => row.understeerRelief > 0),
        'brake-prepared mean understeer relief > 0 for every grade/slope',
        preparationRows.map(({ grade, slopeId, understeerRelief }) => ({
            grade,
            slopeId,
            understeerRelief,
        })),
    ),
    check(
        'relation.levelPreparedUndersteerRelief',
        preparationRows
            .filter((row) => row.slopeId === 'level')
            .every((row) => row.understeerRelief >= 0.08),
        'level brake-prepared mean understeer relief >= 0.08 for every grade',
        preparationRows
            .filter((row) => row.slopeId === 'level')
            .map(({ grade, understeerRelief }) => ({ grade, understeerRelief })),
    ),
    check(
        'relation.preparedLineQualityAboveFull',
        preparationRows.every((row) => row.lineRetentionGain > 0),
        'brake-prepared road-normalized line retention gain > 0 for every grade/slope',
        preparationRows.map(({ grade, lineRetentionGain, slopeId }) => ({
            grade,
            lineRetentionGain,
            slopeId,
        })),
    ),
    check(
        'relation.levelPreparedLineQualityGain',
        preparationRows
            .filter((row) => row.slopeId === 'level')
            .every((row) => row.lineRetentionGain >= 0.08),
        'level brake-prepared road-normalized line retention gain >= 0.08',
        preparationRows
            .filter((row) => row.slopeId === 'level')
            .map(({ grade, lineRetentionGain }) => ({ grade, lineRetentionGain })),
    ),
    check(
        'relation.fixedBugakPreparedUndersteerBelowFull',
        trackPreparationRows.every((row) => row.understeerRelief >= 0.02),
        'fixed Bugak segments mean understeer relief >= 0.02',
        trackPreparationRows.map(({ grade, understeerRelief }) => ({
            grade,
            understeerRelief,
        })),
    ),
    check(
        'relation.fixedBugakPreparedLineQualityAboveFull',
        trackPreparationRows.every((row) => row.lineRetentionGain >= 0.005),
        'fixed Bugak segments road-normalized line retention gain >= 0.005',
        trackPreparationRows.map(({ grade, lineRetentionGain }) => ({
            grade,
            lineRetentionGain,
        })),
    ),
    check(
        'relation.cornerLossGradeOrdering',
        gradeLossRows.every((row) => row.sharp > row.medium && row.medium > row.easy),
        'sharp > medium > easy for level and downhill',
        gradeLossRows,
    ),
    check(
        'relation.levelSharpLossAboveDownhill',
        levelSharpLoss - downhillSharpLoss >= 5,
        'level sharp corner-only loss exceeds safety-cap downhill by >= 5 percentage points',
        round(levelSharpLoss - downhillSharpLoss),
    ),
    check(
        'control.straightExitSpeedStable',
        currentStraightComparison.maxExitSpeedDeltaKmh <= 0.05,
        '<= 0.05km/h versus TSE-6 calibrated straight controls',
        currentStraightComparison,
    ),
    check(
        'control.zeroTo100Stable',
        zeroTo100DeltaSec <= 0.05 &&
            corner.controls.zeroTo100Sec >= corner.controls.zeroTo100TargetSec[0] &&
            corner.controls.zeroTo100Sec <= corner.controls.zeroTo100TargetSec[1],
        '<= 0.05s versus HND-1 and within 7.8~8.3s',
        {
            currentSec: corner.controls.zeroTo100Sec,
            deltaSec: round(zeroTo100DeltaSec),
            hnd1Sec: hnd1.controls.zeroTo100Sec,
        },
    ),
    check(
        'control.sixtyKmhStable',
        sixtyKmhDeltaSec <= 0.05 &&
            corner.controls.sixtyKmh.gear === tse6.controls.sixtyKmh.gear &&
            corner.controls.sixtyKmh.timeSec >= 3.5 &&
            corner.controls.sixtyKmh.timeSec <= 5,
        '<= 0.05s versus TSE-6, same gear, and within 3.5~5.0s',
        {
            current: corner.controls.sixtyKmh,
            deltaSec: round(sixtyKmhDeltaSec),
            tse6: tse6.controls.sixtyKmh,
        },
    ),
    check(
        'control.drivetrainIdentityStable',
        sameDrivetrain(corner.controls, hnd1.controls),
        'gear ratios/final drive/tire circumference unchanged from HND-1',
        {
            finalDrive: corner.controls.finalDrive,
            gearRatios: corner.controls.gearRatios,
            tireCircumferenceM: corner.controls.tireCircumferenceM,
        },
    ),
    check(
        'relation.gripAccidentalDriftNearZero',
        accidentalDriftRatioMax <= 0.01,
        '<= 0.01 across synthetic and fixed Bugak grip scenarios',
        accidentalDriftRatioMax,
    ),
];
const report = {
    checks,
    controls: {
        current: corner.controls,
        hnd1: hnd1.controls,
        straightComparison: currentStraightComparison,
        tse2MigrationComparison,
    },
    generatedAt: new Date().toISOString(),
    gradeLossRows,
    manualApproval: {
        requiredRuns: ['level/left', 'downhill/right', 'sharp S-bend'],
        status: 'deferred-by-user',
    },
    pass: checks.every((entry) => entry.pass),
    preparationRows,
    schemaVersion: 2,
    sourceRuns,
    stageStatus: 'automated-relational-qa-complete-manual-approval-deferred',
    trackPreparationRows,
};

await mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, 'handling-relations-hnd6-baseline.json');
const markdownPath = path.join(outputDir, 'handling-relations-hnd6-baseline.md');
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));

console.log(`HND-6 handling relations: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
console.log(`Manual driving approval: ${report.manualApproval.status}`);
for (const checkResult of checks) {
    console.log(`- ${checkResult.pass ? 'PASS' : 'FAIL'} ${checkResult.id}`);
}

if (!report.pass) process.exitCode = 1;

function runSource(id, scriptName) {
    const result = spawnSync(process.execPath, [path.join(__dirname, scriptName)], {
        cwd: projectRoot,
        encoding: 'utf8',
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
        throw new Error(`${scriptName} failed with exit code ${result.status}`);
    }

    return { id, script: `scripts/${scriptName}`, status: 'pass' };
}

async function readJson(relativePath) {
    return JSON.parse(await readFile(path.join(projectRoot, relativePath), 'utf8'));
}

function findSynthetic(report, grade, slopeId, preparationMode) {
    const row = report.syntheticRows.find((candidate) => (
        candidate.grade === grade &&
        candidate.slopeId === slopeId &&
        candidate.initialSpeedKmh === speedKmh &&
        candidate.preparationMode === preparationMode
    ));
    if (!row) throw new Error(`Missing synthetic row ${grade}/${slopeId}/${preparationMode}`);
    return row;
}

function findTrack(report, grade, preparationMode) {
    const row = report.track.rows.find((candidate) => (
        candidate.grade === grade && candidate.preparationMode === preparationMode
    ));
    if (!row) throw new Error(`Missing fixed Bugak row ${grade}/${preparationMode}`);
    return row;
}

function summarizePreparation(grade, slopeId, full, prepared) {
    return {
        fullLineRetention: round(1 - full.outwardExcursionRoadRatio),
        fullUndersteerMean: full.overspeedUndersteerMean,
        grade,
        lineRetentionGain: round(
            full.outwardExcursionRoadRatio - prepared.outwardExcursionRoadRatio,
        ),
        preparedLineRetention: round(1 - prepared.outwardExcursionRoadRatio),
        preparedUndersteerMean: prepared.overspeedUndersteerMean,
        slopeId,
        understeerRelief: round(
            full.overspeedUndersteerMean - prepared.overspeedUndersteerMean,
        ),
    };
}

function compareStraightControls(current, baseline) {
    const deltas = current.straightControlRows.map((row) => {
        const previous = baseline.straightControlRows.find((candidate) => (
            candidate.initialSpeedKmh === row.initialSpeedKmh &&
            candidate.slopeId === row.slopeId &&
            candidate.preparationMode === row.preparationMode
        ));
        if (!previous) throw new Error(`Missing HND-3 straight control ${row.id}`);

        return Math.abs(row.exitSpeedKmh - previous.exitSpeedKmh);
    });

    return {
        comparedRows: deltas.length,
        maxExitSpeedDeltaKmh: round(Math.max(...deltas)),
    };
}

function sameDrivetrain(current, baseline) {
    return current.finalDrive === baseline.finalDrive &&
        current.tireCircumferenceM === baseline.tireCircumferenceM &&
        JSON.stringify(current.gearRatios) === JSON.stringify(baseline.gearRatios);
}

function buildMarkdown(result) {
    const lines = [
        '# Apex Seoul HND-6 Handling Relationship QA',
        '',
        `Generated: ${result.generatedAt}`,
        '',
        `Automated relationship status: **${result.pass ? 'PASS' : 'FAIL'}**`,
        '',
        `Manual driving approval: **${result.manualApproval.status}**`,
        '',
        '> This report approves the deterministic relationship gates only. It does not approve final driving feel.',
        '',
        '## Relationship checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | --- |',
        ...result.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${formatValue(entry.target)} | ` +
            `${formatValue(entry.value)} |`
        )),
        '',
        '## Prepared versus full-throttle',
        '',
        '| slope | grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.preparationRows.map((row) => formatPreparationRow(row)),
        '',
        'Line retention is `1 - outward excursion / available road width`. Higher is better.',
        '',
        '## Corner-only loss ordering',
        '',
        '| slope | easy | medium | sharp |',
        '| --- | ---: | ---: | ---: |',
        ...result.gradeLossRows.map((row) => (
            `| ${row.slopeId} | ${format(row.easy)}% | ${format(row.medium)}% | ${format(row.sharp)}% |`
        )),
        '',
        '## Fixed Bugak segment relationships',
        '',
        '| grade | full US mean | prepared US mean | US relief | full line retention | prepared line retention | line gain |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...result.trackPreparationRows.map((row) => formatPreparationRow(row, false)),
        '',
        '## Deferred manual approval',
        '',
        ...result.manualApproval.requiredRuns.map((run) => `- [ ] ${run}`),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function formatPreparationRow(row, includeSlope = true) {
    const cells = [
        ...(includeSlope ? [row.slopeId] : []),
        row.grade,
        format(row.fullUndersteerMean),
        format(row.preparedUndersteerMean),
        format(row.understeerRelief),
        format(row.fullLineRetention),
        format(row.preparedLineRetention),
        format(row.lineRetentionGain),
    ];
    return `| ${cells.join(' | ')} |`;
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}

function format(value) {
    return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '-';
}

function formatValue(value) {
    if (typeof value === 'number') return format(value);
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value).replaceAll('|', '\\|');
}
