import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const config = {
    anchorJitterThreshold: 1,
    baselineJitterThreshold: 1,
    input: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-128/sheet-128.qa.json',
    maxPaletteColors: 16,
    minSteerWidthDelta: 8,
    output: null,
    passScore: 80,
    requiredPoses: ['center', 'steer-right-1', 'steer-right-2'],
    reviewScore: 65,
    semiTransparentThreshold: 512,
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--output' && next) {
        config.output = next;
        index += 1;
    } else if (arg === '--required-poses' && next) {
        config.requiredPoses = next.split(',').map((pose) => pose.trim()).filter(Boolean);
        index += 1;
    } else if (arg === '--pass-score' && next) {
        config.passScore = parseIntegerInRange(arg, next, 0, 100);
        index += 1;
    } else if (arg === '--review-score' && next) {
        config.reviewScore = parseIntegerInRange(arg, next, 0, 100);
        index += 1;
    } else if (arg === '--baseline-jitter-threshold' && next) {
        config.baselineJitterThreshold = parseNonNegativeNumber(arg, next);
        index += 1;
    } else if (arg === '--anchor-jitter-threshold' && next) {
        config.anchorJitterThreshold = parseNonNegativeNumber(arg, next);
        index += 1;
    } else if (arg === '--max-palette-colors' && next) {
        config.maxPaletteColors = parseIntegerInRange(arg, next, 1, 256);
        index += 1;
    } else if (arg === '--min-steer-width-delta' && next) {
        config.minSteerWidthDelta = parseNonNegativeNumber(arg, next);
        index += 1;
    } else if (arg === '--semi-transparent-threshold' && next) {
        config.semiTransparentThreshold = parseIntegerInRange(arg, next, 0, Number.MAX_SAFE_INTEGER);
        index += 1;
    }
}

const inputPath = resolveProjectPath(config.input, '--input');
const outputPath = resolveProjectPath(config.output ?? defaultOutputPath(config.input), '--output');
const qa = JSON.parse(await readFile(inputPath, 'utf8'));
const report = scoreSheet(qa);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Vehicle sprite score: ${report.score} (${report.decision})`);
console.log(`Score report wrote ${path.relative(projectRoot, outputPath)}`);

function scoreSheet(qa) {
    const deductions = [];
    const warnings = [];
    const poseById = new Map((qa.poses ?? []).map((pose) => [pose.id, pose]));
    const required = config.requiredPoses.map((id) => poseById.get(id)).filter(Boolean);
    const missingRequiredPoses = config.requiredPoses.filter((id) => !poseById.has(id));

    if (!Array.isArray(qa.poses) || qa.poses.length === 0) {
        deductions.push(makeDeduction(100, 'qa_has_no_poses', 'QA file does not include any poses.'));
    }

    if (missingRequiredPoses.length > 0) {
        deductions.push(makeDeduction(
            20,
            'missing_required_pose',
            `Missing required pose(s): ${missingRequiredPoses.join(', ')}.`,
        ));
    }

    const emptyRequiredPoses = required.filter((pose) => !pose.bbox || !pose.anchor || pose.opaquePixels <= 0);

    if (emptyRequiredPoses.length > 0) {
        deductions.push(makeDeduction(
            20,
            'empty_required_pose',
            `Required pose(s) are empty: ${emptyRequiredPoses.map((pose) => pose.id).join(', ')}.`,
        ));
    }

    const baselineJitter = calculateSpread(required.map((pose) => pose.baselineY).filter(Number.isFinite));

    if (baselineJitter > config.baselineJitterThreshold) {
        deductions.push(makeDeduction(
            15,
            'required_baseline_jitter',
            `Required driving baseline jitter is ${formatNumber(baselineJitter)}px.`,
        ));
    }

    const anchorXJitter = calculateSpread(required.map((pose) => pose.anchor?.x).filter(Number.isFinite));

    if (anchorXJitter > config.anchorJitterThreshold) {
        deductions.push(makeDeduction(
            15,
            'required_anchor_x_jitter',
            `Required driving anchor x jitter is ${formatNumber(anchorXJitter)}px.`,
        ));
    }

    const center = poseById.get('center');
    const steerRight1 = poseById.get('steer-right-1');
    const steerRight2 = poseById.get('steer-right-2');
    const steerWidthDeltas = [
        widthDelta(center, steerRight1),
        widthDelta(steerRight1, steerRight2),
    ].filter(Number.isFinite);
    const minSteerWidthDelta = steerWidthDeltas.length > 0 ? Math.min(...steerWidthDeltas) : null;

    if (minSteerWidthDelta !== null && minSteerWidthDelta < config.minSteerWidthDelta) {
        deductions.push(makeDeduction(
            15,
            'steering_silhouette_difference_too_small',
            `Smallest steering bbox width delta is ${formatNumber(minSteerWidthDelta)}px.`,
        ));
    }

    const maxSemiTransparentPixels = maxPoseValue(qa.poses, 'semiTransparentPixels');

    if (maxSemiTransparentPixels > config.semiTransparentThreshold) {
        deductions.push(makeDeduction(
            10,
            'semi_transparent_pixels_exceed_threshold',
            `Max pre-harden semi-transparent pixels is ${maxSemiTransparentPixels}.`,
        ));
    } else if (maxSemiTransparentPixels > 0) {
        warnings.push({
            code: 'semi_transparent_pixels_were_hardened',
            message: `Max pre-harden semi-transparent pixels is ${maxSemiTransparentPixels}; pixel-pass hardens alpha in output.`,
        });
    }

    const maxPaletteColorCount = maxPoseValue(qa.poses, 'paletteColorCount');

    if (maxPaletteColorCount > config.maxPaletteColors) {
        deductions.push(makeDeduction(
            10,
            'palette_color_count_exceeds_target',
            `Max palette color count is ${maxPaletteColorCount}.`,
        ));
    }

    for (const pose of qa.poses ?? []) {
        if (!pose.bbox || !Number.isFinite(pose.outlinePixels) || !Number.isFinite(pose.opaquePixels)) continue;

        const outlineRatio = pose.outlinePixels / Math.max(1, pose.opaquePixels);

        if (outlineRatio > 0.22) {
            warnings.push({
                code: 'high_outline_ratio',
                message: `${pose.id} outline ratio is ${formatNumber(outlineRatio)}.`,
                poseId: pose.id,
            });
        }
    }

    const score = Math.max(0, 100 - deductions.reduce((total, deduction) => total + deduction.points, 0));
    const decision = score >= config.passScore
        ? 'pass'
        : score >= config.reviewScore
            ? 'review'
            : 'fail';

    return {
        anchorJitterThreshold: config.anchorJitterThreshold,
        baselineJitterThreshold: config.baselineJitterThreshold,
        decision,
        deductions,
        input: path.relative(projectRoot, inputPath),
        maxPaletteColors: config.maxPaletteColors,
        minSteerWidthDelta: config.minSteerWidthDelta,
        metrics: {
            anchorXJitter,
            baselineJitter,
            maxPaletteColorCount,
            maxSemiTransparentPixels,
            minSteerWidthDelta,
            poseCount: Array.isArray(qa.poses) ? qa.poses.length : 0,
        },
        missingRequiredPoses,
        outputCandidate: qa.output ?? null,
        passScore: config.passScore,
        posePlanId: qa.posePlanId ?? null,
        requiredPoses: config.requiredPoses,
        reviewScore: config.reviewScore,
        score,
        semiTransparentThreshold: config.semiTransparentThreshold,
        targetCellSize: qa.targetCellSize ?? null,
        vehicleId: qa.vehicleId ?? null,
        warnings,
    };
}

function widthDelta(a, b) {
    if (!a?.bbox || !b?.bbox) return null;
    return Math.abs(a.bbox.width - b.bbox.width);
}

function maxPoseValue(poses, key) {
    return Math.max(0, ...(poses ?? []).map((pose) => pose[key]).filter(Number.isFinite));
}

function calculateSpread(values) {
    if (values.length <= 1) return 0;
    return Math.max(...values) - Math.min(...values);
}

function makeDeduction(points, code, message) {
    return { code, message, points };
}

function defaultOutputPath(input) {
    if (input.endsWith('.qa.json')) {
        return input.replace(/\.qa\.json$/, '.score.json');
    }

    return path.join(path.dirname(input), 'score.json');
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

function parseIntegerInRange(option, rawValue, min, max) {
    const parsed = Number(rawValue);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}

function parseNonNegativeNumber(option, rawValue) {
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid ${option} value: ${rawValue}`);
    }

    return parsed;
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
