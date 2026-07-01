import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    allowReview: false,
    atlasDir: 'assets/vehicles/approved/atlases',
    score: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-128/sheet-128.score.json',
    spriteDir: 'assets/vehicles/approved/sprites',
    vehicleName: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--score' && next) {
        config.score = next;
        index += 1;
    } else if (arg === '--sprite-dir' && next) {
        config.spriteDir = next;
        index += 1;
    } else if (arg === '--atlas-dir' && next) {
        config.atlasDir = next;
        index += 1;
    } else if (arg === '--vehicle-name' && next) {
        config.vehicleName = next;
        index += 1;
    } else if (arg === '--allow-review') {
        config.allowReview = true;
    }
}

const scorePath = resolveProjectPath(config.score, '--score');
const score = JSON.parse(await readFile(scorePath, 'utf8'));

if (score.decision !== 'pass' && !(config.allowReview && score.decision === 'review')) {
    throw new Error(`Score decision must be pass before export. Got "${score.decision}" from ${config.score}.`);
}

if (!score.input) {
    throw new Error(`Score file must include input QA path: ${config.score}`);
}

if (!score.outputCandidate) {
    throw new Error(`Score file must include outputCandidate: ${config.score}`);
}

const qaPath = resolveProjectPath(score.input, 'score.input');
const spriteSourcePath = resolveProjectPath(score.outputCandidate, 'score.outputCandidate');
const qa = JSON.parse(await readFile(qaPath, 'utf8'));
const targetCellSize = requirePositiveInteger(qa.targetCellSize, 'qa.targetCellSize');
const columns = requirePositiveInteger(qa.columns, 'qa.columns');
const rows = requirePositiveInteger(qa.rows, 'qa.rows');
const vehicleName = sanitizeName(config.vehicleName ?? score.vehicleId ?? qa.vehicleId ?? 'vehicle');
const exportName = `${vehicleName}-${targetCellSize}`;
const spriteDir = resolveProjectPath(config.spriteDir, '--sprite-dir');
const atlasDir = resolveProjectPath(config.atlasDir, '--atlas-dir');
const spriteOutputPath = path.join(spriteDir, `${exportName}.png`);
const atlasOutputPath = path.join(atlasDir, `${exportName}.json`);
const imageFileName = path.basename(spriteOutputPath);
const frames = {};

for (const pose of qa.poses ?? []) {
    if (!pose.id) continue;

    const column = requirePositiveInteger(pose.cell?.column + 1, `${pose.id}.cell.column + 1`) - 1;
    const row = requirePositiveInteger(pose.cell?.row + 1, `${pose.id}.cell.row + 1`) - 1;
    const anchor = pose.anchor ?? {
        x: targetCellSize / 2,
        y: targetCellSize,
    };

    frames[pose.id] = {
        anchor,
        baselineY: pose.baselineY ?? null,
        frame: {
            h: targetCellSize,
            w: targetCellSize,
            x: column * targetCellSize,
            y: row * targetCellSize,
        },
        origin: {
            x: anchor.x / targetCellSize,
            y: anchor.y / targetCellSize,
        },
        pose: {
            modelPitchDeg: pose.modelPitchDeg ?? null,
            modelRollDeg: pose.modelRollDeg ?? null,
            modelYawDeg: pose.modelYawDeg ?? null,
            referenceRole: pose.referenceRole ?? null,
        },
        rotated: false,
        sourceSize: {
            h: targetCellSize,
            w: targetCellSize,
        },
        spriteSourceSize: {
            h: targetCellSize,
            w: targetCellSize,
            x: 0,
            y: 0,
        },
        trimmed: false,
    };
}

const atlas = {
    apex: {
        anchorPolicy: 'Use per-frame origin for draw offset. Left steering frames reuse right steering art with flipX.',
        approvedFrom: {
            qa: path.relative(projectRoot, qaPath),
            score: path.relative(projectRoot, scorePath),
            source: score.outputCandidate,
        },
        decision: score.decision,
        score: score.score,
        steeringStates: {
            'steer-left-2': {
                flipX: true,
                frame: 'steer-right-2',
            },
            'steer-left-1': {
                flipX: true,
                frame: 'steer-right-1',
            },
            center: {
                flipX: false,
                frame: 'center',
            },
            'steer-right-1': {
                flipX: false,
                frame: 'steer-right-1',
            },
            'steer-right-2': {
                flipX: false,
                frame: 'steer-right-2',
            },
        },
        targetCellSize,
        vehicleId: score.vehicleId ?? qa.vehicleId ?? null,
    },
    frames,
    meta: {
        app: 'apex-seoul vehicle atlas exporter',
        format: 'RGBA8888',
        image: imageFileName,
        scale: '1',
        size: {
            h: rows * targetCellSize,
            w: columns * targetCellSize,
        },
    },
};

await mkdir(spriteDir, { recursive: true });
await mkdir(atlasDir, { recursive: true });
await copyFile(spriteSourcePath, spriteOutputPath);
await writeFile(atlasOutputPath, `${JSON.stringify(atlas, null, 2)}\n`);

console.log(`Approved sprite wrote ${path.relative(projectRoot, spriteOutputPath)}`);
console.log(`Approved atlas wrote ${path.relative(projectRoot, atlasOutputPath)}`);

function sanitizeName(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'vehicle';
}

function resolveProjectPath(rawPath, option) {
    const absolutePath = path.isAbsolute(rawPath)
        ? path.resolve(rawPath)
        : path.resolve(projectRoot, rawPath);

    if (!absolutePath.startsWith(projectRoot)) {
        throw new Error(`${option} must point inside ${projectRoot}`);
    }

    return absolutePath;
}

function requirePositiveInteger(value, label) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${label} must be a positive integer. Got: ${value}`);
    }

    return value;
}
