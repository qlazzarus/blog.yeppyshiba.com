import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(
    projectRoot,
    'assets/telemetry/generated/speed-presentation/rail-projection',
);
const files = (await readdir(outputDir))
    .filter((file) => file.endsWith('.jsonl'))
    .sort();
const contacts = [];

for (const file of files) {
    const source = await readFile(path.join(outputDir, file), 'utf8');
    const samples = source.split('\n').filter(Boolean).map((line) => JSON.parse(line).payload);
    const state = samples.find((sample) => (
        Math.abs(sample.guardrailScreen?.normalizedOffset ?? 0) >= 0.9999
    ));

    if (!state) continue;
    const side = Math.sign(state.guardrailScreen.normalizedOffset);
    contacts.push({
        activeGapPx: state.guardrailScreen.activeGapPx,
        activeLimit: state.player.guardrailActiveRailContactLimit,
        impactCount: state.player.guardrailImpactCount,
        lateralOffset: state.player.lateralOffset,
        normalizedOffset: state.guardrailScreen.normalizedOffset,
        railX: side < 0 ? state.guardrailScreen.leftRailX : state.guardrailScreen.rightRailX,
        side,
        source: path.relative(projectRoot, path.join(outputDir, file)),
        vehicleEdgeX: side < 0
            ? state.guardrailScreen.vehicleLeftX
            : state.guardrailScreen.vehicleRightX,
    });
}

const left = contacts.find((contact) => contact.side < 0);
const right = contacts.find((contact) => contact.side > 0);
const checks = [
    check('bothSidesCaptured', Boolean(left && right), true, Boolean(left && right)),
    checkNear('leftContactGapPx', left?.activeGapPx, 0, 0.01),
    checkNear('rightContactGapPx', right?.activeGapPx, 0, 0.01),
    checkNear('leftRailEdgeIdentityPx', left ? left.railX - left.vehicleEdgeX : null, 0, 0.01),
    checkNear('rightRailEdgeIdentityPx', right ? right.railX - right.vehicleEdgeX : null, 0, 0.01),
    checkNear('leftWorldLimitIdentity', left ? left.lateralOffset + left.activeLimit : null, 0, 0.01),
    checkNear('rightWorldLimitIdentity', right ? right.lateralOffset - right.activeLimit : null, 0, 0.01),
    check('frozenContactHasNoImpact', contacts.every((contact) => contact.impactCount === 0), 0, contacts.map((contact) => contact.impactCount)),
];
const report = {
    checks,
    contacts: contacts.map(roundObject),
    generatedAt: new Date().toISOString(),
    pass: checks.every((check) => check.pass),
    schemaVersion: 1,
};
const jsonPath = path.join(outputDir, 'rail2-projection-runtime.json');
const markdownPath = path.join(outputDir, 'rail2-projection-runtime.md');

await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath, buildMarkdown(report));
console.log(`RAIL-2 projection runtime: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`JSON: ${path.relative(projectRoot, jsonPath)}`);
console.log(`Table: ${path.relative(projectRoot, markdownPath)}`);
if (!report.pass) process.exitCode = 1;

function checkNear(id, value, target, tolerance) {
    const finite = typeof value === 'number' && Number.isFinite(value);
    return check(id, finite && Math.abs(value - target) <= tolerance, target, finite ? round(value) : null);
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function roundObject(value) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'number' ? round(entry) : entry,
    ]));
}

function round(value) {
    return Number(value.toFixed(4));
}

function buildMarkdown(result) {
    return `# Apex Seoul RAIL-2 Projection Runtime\n\n` +
        `Generated: ${result.generatedAt}\n\n` +
        `Result: **${result.pass ? 'PASS' : 'FAIL'}**\n\n` +
        `| side | world offset / limit | rail x | vehicle edge x | gap px | impact |\n` +
        `| --- | ---: | ---: | ---: | ---: | ---: |\n` +
        result.contacts.map((contact) => (
            `| ${contact.side < 0 ? 'left' : 'right'} | ${contact.lateralOffset} / ${contact.activeLimit} | ` +
            `${contact.railX} | ${contact.vehicleEdgeX} | ${contact.activeGapPx} | ${contact.impactCount} |`
        )).join('\n') +
        `\n\n## Checks\n\n` +
        result.checks.map((entry) => `- ${entry.pass ? 'PASS' : 'FAIL'} ${entry.id}: ${JSON.stringify(entry.value)}`).join('\n') +
        `\n`;
}
