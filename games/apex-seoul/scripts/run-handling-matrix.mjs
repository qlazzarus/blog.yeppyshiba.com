import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const defaultScenarios = [
    'straight-accel-20s',
    'left-hold-3s-release',
    'curve-no-input',
];
const candidates = [
    {
        id: 'baseline',
        query: '',
    },
    {
        id: 'less-curve-force',
        query: 'curveDrift=160&curveSteeringCue=0.06&curveCarBias=8',
    },
    {
        id: 'less-corner-pull',
        query: 'cornerPull=120',
    },
    {
        id: 'stronger-engine',
        query: 'engineAccel=170',
    },
    {
        id: 'previous-grip-angle',
        query: 'curveCueDrop=0&steerVisualDrop=0.25',
    },
    {
        id: 'extra-grip-angle-damping',
        query: 'curveCueDrop=0.45&steerVisualDrop=0.45',
    },
    {
        id: 'combined-first-pass',
        query: [
            'curveDrift=160',
            'curveCueDrop=0.38',
            'curveSteeringCue=0.06',
            'cornerPull=120',
            'engineAccel=170',
            'steeringCue=0.20',
            'steerVisualDrop=0.38',
            'steerWeak=0.14',
        ].join('&'),
    },
];

const config = {
    baseUrl: 'http://localhost:5173/game-assets/apex-seoul/',
    browser: null,
    outputDir: 'assets/telemetry/generated/drive-logs',
    sampleHz: 10,
    scenarios: defaultScenarios,
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
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--scenario' && next) {
        config.scenarios = next.split(',').map((scenario) => scenario.trim()).filter(Boolean);
        index += 1;
    }
}

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, '-');
const outputDir = resolveProjectPath(path.join(config.outputDir, `handling-matrix-${runId}`));
await mkdir(outputDir, { recursive: true });

const report = {
    baseUrl: config.baseUrl,
    candidates: [],
    generatedAt: startedAt.toISOString(),
    outputDir: path.relative(projectRoot, outputDir),
    sampleHz: config.sampleHz,
    scenarios: config.scenarios,
};

for (const candidate of candidates) {
    const candidateReport = {
        id: candidate.id,
        query: candidate.query,
        results: [],
        totalScore: 0,
    };

    for (const scenario of config.scenarios) {
        const scenarioDir = path.join(outputDir, candidate.id, scenario);
        await mkdir(scenarioDir, { recursive: true });

        const capture = await runNodeScript('capture-drive-telemetry.mjs', [
            '--base-url',
            config.baseUrl,
            '--output-dir',
            scenarioDir,
            '--sample-hz',
            String(config.sampleHz),
            '--scenario',
            scenario,
            ...(candidate.query ? ['--query', candidate.query] : []),
            ...(config.browser ? ['--browser', config.browser] : []),
        ]);
        const jsonl = parseWrittenPath(capture.stdout, /Drive telemetry wrote (.+)$/m);

        if (!jsonl) {
            candidateReport.results.push({
                error: 'capture did not report a jsonl output path',
                scenario,
                status: 'capture-failed',
                stderr: capture.stderr,
                stdout: capture.stdout,
            });
            continue;
        }

        const analyze = await runNodeScript('analyze-drive-telemetry.mjs', [
            '--input',
            jsonl,
        ]);
        const scorePath = parseWrittenPath(analyze.stdout, /Drive telemetry score wrote (.+)$/m);
        const score = scorePath
            ? JSON.parse(await readFile(resolveProjectPath(scorePath), 'utf8'))
            : null;

        candidateReport.results.push({
            jsonl,
            scenario,
            score,
            scorePath,
            status: score ? 'scored' : 'score-missing',
        });
    }

    const scored = candidateReport.results
        .map((result) => result.score?.totalScore)
        .filter((score) => typeof score === 'number');
    candidateReport.totalScore = scored.length > 0
        ? Number((scored.reduce((total, score) => total + score, 0) / scored.length).toFixed(1))
        : 0;
    report.candidates.push(candidateReport);
}

report.candidates.sort((left, right) => right.totalScore - left.totalScore);

const reportPath = path.join(outputDir, 'handling-matrix.report.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Handling matrix candidates: ${report.candidates.length}`);
console.log(`Handling matrix report wrote ${path.relative(projectRoot, reportPath)}`);
console.log('Handling matrix ranking:');
for (const candidate of report.candidates) {
    console.log(`- ${candidate.id}: ${candidate.totalScore}`);
}

function runNodeScript(scriptName, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(__dirname, scriptName), ...args], {
            cwd: projectRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stderr, stdout });
                return;
            }

            reject(new Error(`${scriptName} exited with code ${code}\n${stdout}\n${stderr}`));
        });
    });
}

function parseWrittenPath(stdout, pattern) {
    const match = stdout.match(pattern);

    return match?.[1]?.trim() ?? null;
}

function parsePositiveNumber(option, value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${option} must be a positive number`);
    }

    return parsed;
}

function resolveProjectPath(rawPath) {
    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}
