import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const scenario = 'gds2b3-left-curve-outside-hold';
const config = {
    baseUrl: 'http://localhost:5174/game-assets/apex-seoul/',
    browser: '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    input: null,
    outputDir: 'assets/telemetry/generated/gds-2b3-runtime',
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--base-url' && next) {
        config.baseUrl = next;
        index += 1;
    } else if (arg === '--browser' && next) {
        config.browser = next;
        index += 1;
    } else if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    }
}

const inputPath = config.input ?? await captureRuntimeFixture();
const samples = (await readFile(inputPath, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.type === 'drive_sample')
    .map((entry) => entry.payload);

const initial = samples[0];
const impacts = samples.filter((state) => state.player.guardrailImpactCount > 0);
const firstImpact = impacts[0] ?? null;
const minRightGapPx = Math.min(...samples.map((state) => state.guardrailScreen.rightGapPx));
const maxRightRiskOffset = Math.max(...samples.map((state) => state.player.lateralOffset));
const fullRightSamples = samples.filter((state) => (
    state.input.steerAxis === 1 && state.vehicle.physicalSteering > 0.9
));
const checks = [
    check(
        'fixture-starts-on-the-left-curve-without-inherited-offset',
        initial.run.progressRatio >= 0.07 &&
            initial.run.progressRatio <= 0.08 &&
            initial.physicsRoad.currentCurve >= 0.5 &&
            Math.abs(initial.player.lateralOffset) <= 1,
        {
            curve: round(initial.physicsRoad.currentCurve),
            lateralOffset: round(initial.player.lateralOffset),
            progressRatio: round(initial.run.progressRatio),
        },
    ),
    check(
        'outside-steer-reaches-full-physical-command',
        fullRightSamples.length >= 10,
        { fullRightSamples: fullRightSamples.length },
    ),
    check(
        'left-curve-right-steer-hits-the-right-guardrail-in-runtime',
        firstImpact?.player.guardrailContactDirection === 1 &&
            firstImpact.player.guardrailImpactCount === 1,
        firstImpact
            ? {
                lateralOffset: round(firstImpact.player.lateralOffset),
                progressRatio: round(firstImpact.run.progressRatio),
                rightGapPx: round(firstImpact.guardrailScreen.rightGapPx),
            }
            : { maxRightRiskOffset: round(maxRightRiskOffset), minRightGapPx: round(minRightGapPx) },
    ),
];
const passed = checks.filter((entry) => entry.pass).length;

console.log(`Apex Seoul GDS-2B-3 runtime regression: ${passed === checks.length ? 'PASS' : 'FAIL'}`);
console.log(`Telemetry: ${path.relative(projectRoot, inputPath)}`);
for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${JSON.stringify(entry.evidence)}`);
}
console.log(`${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exitCode = 1;

async function captureRuntimeFixture() {
    const capture = await runNodeScript('capture-drive-telemetry.mjs', [
        '--base-url', config.baseUrl,
        '--browser', config.browser,
        '--output-dir', config.outputDir,
        '--sample-hz', '20',
        '--scenario', scenario,
    ]);
    const pathMatch = capture.stdout.match(/Drive telemetry wrote (.+)$/m);

    if (!pathMatch) {
        throw new Error(`GDS-2B-3 runtime capture did not produce JSONL:\n${capture.stdout}\n${capture.stderr}`);
    }

    return path.resolve(projectRoot, pathMatch[1].replaceAll('\\', '/'));
}

function runNodeScript(script, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(__dirname, script), ...args], {
            cwd: projectRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stderr = '';
        let stdout = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve({ stderr, stdout });
            else reject(new Error(`capture exited ${code}:\n${stdout}\n${stderr}`));
        });
    });
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value) {
    return Number(value.toFixed(4));
}
