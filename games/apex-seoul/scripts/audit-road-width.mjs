import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
    createBugakRidgeDownhillTrack,
    DEFAULT_ROAD_HALF_WIDTH,
    getRoadElevationAt,
    getRoadHalfWidthAt,
} from '../src/game/road.ts';
import {
    createDefaultCamera,
    projectGroundPoint,
} from '../src/game/pseudo3dCamera.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const atlasPath = path.join(projectRoot, 'assets/vehicles/approved/atlases/genesis-g70-poc-128.json');
const spritePath = path.join(projectRoot, 'assets/vehicles/approved/sprites/genesis-g70-poc-128.png');
const ALPHA_THRESHOLD = 12;
const CANDIDATE_HALF_WIDTHS = [845, 820, 780, 760];
const VIEWPORT = { height: 760, width: 1200 };
const VEHICLE_SCREEN_Y = VIEWPORT.height * 0.88;
const VEHICLE_BASE_SIZE = 360;
const VEHICLE_ROAD_RATIO = 0.54;
const VEHICLE_MIN_SCALE = 0.92;
const VEHICLE_MAX_SCALE = 1.08;

const alphaBounds = await extractAlphaBounds(atlasPath, spritePath);
const track = createBugakRidgeDownhillTrack();
const samples = track.segments.map((segment) => measureSegment(segment.index));
const byProfile = Object.fromEntries(
    ['open-view', 'recovery', 'wall-run', 'commitment'].map((profile) => [
        profile,
        summarize(samples.filter((sample) => sample.profile === profile)),
    ]),
);
const commitmentSamples = samples.filter((sample) => sample.profile === 'commitment');
const candidateComparison = CANDIDATE_HALF_WIDTHS.map((halfWidth) => {
    const candidate = commitmentSamples.map((sample) => {
        const roadWidth = sample.roadWidth * halfWidth / sample.roadHalfWidth;
        const carBodyWidth = getVehicleDisplaySize(sample.virtualRoadWidth) * alphaBounds.normalDrivingWidthRatio;

        return carBodyWidth / (roadWidth / 2);
    });

    return {
        halfWidth,
        maxCarToLaneRatio: round(Math.max(...candidate)),
        medianCarToLaneRatio: round(median(candidate)),
        minCarToLaneRatio: round(Math.min(...candidate)),
        roadWidthRatio: round(halfWidth / DEFAULT_ROAD_HALF_WIDTH),
    };
});
const recommended = candidateComparison.filter(
    (candidate) => candidate.medianCarToLaneRatio >= 0.6 && candidate.maxCarToLaneRatio <= 0.75,
).at(-1) ?? null;

console.log(JSON.stringify({
    alphaBounds,
    candidates: candidateComparison,
    recommendation: recommended,
    samples: byProfile,
    thresholds: {
        commitmentCarToLaneRatio: [0.6, 0.75],
        alphaThreshold: ALPHA_THRESHOLD,
    },
}, null, 2));

function measureSegment(segmentIndex) {
    const camera = createDefaultCamera();
    const cameraZ = segmentIndex * track.segmentLength + track.segmentLength * 0.5;

    camera.fovDegrees = 69;
    camera.z = cameraZ;
    const currentElevation = getRoadElevationAt(track, cameraZ);
    let closest = null;

    for (let distance = 240; distance <= 4200; distance += 8) {
        const worldZ = cameraZ + distance;
        const elevation = getRoadElevationAt(track, worldZ);
        const center = projectGroundPoint({
            x: 0,
            y: (elevation - currentElevation) * 4.2,
            z: worldZ,
        }, camera, VIEWPORT);
        const error = Math.abs(center.y - VEHICLE_SCREEN_Y);

        if (!closest || error < closest.error) {
            closest = { error, worldZ };
        }
    }

    const roadHalfWidth = getRoadHalfWidthAt(track, closest.worldZ);
    const elevation = getRoadElevationAt(track, closest.worldZ);
    const left = projectGroundPoint({
        x: -roadHalfWidth,
        y: (elevation - currentElevation) * 4.2,
        z: closest.worldZ,
    }, camera, VIEWPORT);
    const right = projectGroundPoint({
        x: roadHalfWidth,
        y: (elevation - currentElevation) * 4.2,
        z: closest.worldZ,
    }, camera, VIEWPORT);
    const roadWidth = Math.abs(right.x - left.x);
    const virtualRoadWidth = roadWidth * DEFAULT_ROAD_HALF_WIDTH / roadHalfWidth;
    const carBodyWidth = getVehicleDisplaySize(virtualRoadWidth) * alphaBounds.normalDrivingWidthRatio;
    const curve = track.segments[segmentIndex].curve;

    return {
        carToLaneRatio: carBodyWidth / (roadWidth / 2),
        profile: getProfile(curve),
        roadHalfWidth,
        roadWidth,
        virtualRoadWidth,
    };
}

function getVehicleDisplaySize(virtualRoadWidth) {
    const target = virtualRoadWidth * VEHICLE_ROAD_RATIO;

    return clamp(target, VEHICLE_BASE_SIZE * VEHICLE_MIN_SCALE, VEHICLE_BASE_SIZE * VEHICLE_MAX_SCALE);
}

function getProfile(curve) {
    const intensity = Math.abs(curve);

    if (intensity >= 0.55) return 'commitment';
    if (intensity <= 0.16) return 'recovery';

    return 'wall-run';
}

async function extractAlphaBounds(jsonPath, pngPath) {
    const atlas = await loadJson(jsonPath);
    const image = sharp(pngPath);
    const normalFrames = [
        'center',
        'steer-right-1',
        'steer-right-2',
        'downhill-center',
        'downhill-right-1',
        'downhill-right-2',
        'uphill-center',
        'uphill-right-1',
        'uphill-right-2',
    ];
    const bounds = [];

    for (const frameId of normalFrames) {
        const frame = atlas.frames[frameId].frame;
        const { data, info } = await image.clone()
            .extract({ height: frame.h, left: frame.x, top: frame.y, width: frame.w })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        let minX = info.width;
        let maxX = -1;

        for (let y = 0; y < info.height; y += 1) {
            for (let x = 0; x < info.width; x += 1) {
                const alpha = data[(y * info.width + x) * info.channels + 3];

                if (alpha <= ALPHA_THRESHOLD) continue;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        }

        if (maxX < minX) throw new Error(`No opaque pixels found in ${frameId}`);
        bounds.push({ frameId, width: maxX - minX + 1 });
    }

    const widths = bounds.map((bound) => bound.width);

    return {
        frames: bounds,
        normalDrivingWidthRatio: round(median(widths) / atlas.apex.targetCellSize),
    };
}

async function loadJson(filePath) {
    return JSON.parse(await (await import('node:fs/promises')).readFile(filePath, 'utf8'));
}

function summarize(values) {
    if (values.length === 0) return null;

    return {
        count: values.length,
        maxCarToLaneRatio: round(Math.max(...values.map((value) => value.carToLaneRatio))),
        medianCarToLaneRatio: round(median(values.map((value) => value.carToLaneRatio))),
        minCarToLaneRatio: round(Math.min(...values.map((value) => value.carToLaneRatio))),
    };
}

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function round(value) {
    return Number(value.toFixed(4));
}
