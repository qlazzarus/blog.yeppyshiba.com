import {
    getRoadRelativeVehicleTargetSize,
    getVehicleScaleRoadWidth,
    updateRoadRelativeVehicleSize,
} from '../src/game/vehicleRoadScale.ts';

const baseSize = 360;
const config = {
    deadZoneRatio: 0.02,
    maxScale: 1.08,
    minScale: 0.92,
    responseSeconds: 0.7,
    targetRoadRatio: 0.54,
};
const roadWidths = [556.4, 620, 740.8, 620, 556.4];
const secondsPerWidth = 2.5;
const dt = 1 / 60;
let size = baseSize;
let maxSizeDeltaPerSec = 0;
const steadySamples = [];

for (const roadWidth of roadWidths) {
    const targetSize = getRoadRelativeVehicleTargetSize(baseSize, roadWidth, config);
    const steps = Math.round(secondsPerWidth / dt);

    for (let step = 0; step < steps; step += 1) {
        const nextSize = updateRoadRelativeVehicleSize(size, targetSize, baseSize, dt, config);

        maxSizeDeltaPerSec = Math.max(maxSizeDeltaPerSec, Math.abs(nextSize - size) / dt);
        size = nextSize;
    }

    steadySamples.push({
        roadWidth,
        size,
        ratio: size / roadWidth,
        targetSize,
    });
}

const ratios = steadySamples.map((sample) => sample.ratio);
const minRatio = Math.min(...ratios);
const maxRatio = Math.max(...ratios);
const targetSizes = steadySamples.map((sample) => sample.targetSize);
const minTargetSize = Math.min(...targetSizes);
const maxTargetSize = Math.max(...targetSizes);
const fullRoadHalfWidth = 960;
const narrowRoadHalfWidth = 820;
const fullRoadWidth = 704;
const narrowRoadWidth = fullRoadWidth * narrowRoadHalfWidth / fullRoadHalfWidth;
const fullWidthTarget = getRoadRelativeVehicleTargetSize(baseSize, fullRoadWidth, config);
const narrowWidthTarget = getRoadRelativeVehicleTargetSize(
    baseSize,
    getVehicleScaleRoadWidth(narrowRoadWidth, narrowRoadHalfWidth, fullRoadHalfWidth),
    config,
);

const checks = [
    {
        label: 'target size remains within ±8% base clamp',
        pass: minTargetSize >= baseSize * 0.92 && maxTargetSize <= baseSize * 1.08,
    },
    {
        label: 'smoothed vehicle/road ratio remains within 51%–61%',
        pass: minRatio >= 0.51 && maxRatio <= 0.61,
    },
    {
        label: 'size response remains below 80px/s',
        pass: maxSizeDeltaPerSec <= 80,
    },
    {
        label: 'R3 narrowed road does not shrink the vehicle target size',
        pass: Math.abs(fullWidthTarget - narrowWidthTarget) <= 0.001,
    },
];

for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.label}`);
}
console.log(JSON.stringify({
    maxSizeDeltaPerSec: round(maxSizeDeltaPerSec),
    r3NarrowRoad: {
        actualRatio: round(fullWidthTarget / narrowRoadWidth),
        fullWidthTarget: round(fullWidthTarget),
        narrowWidthTarget: round(narrowWidthTarget),
    },
    ratioRange: [round(minRatio), round(maxRatio)],
    samples: steadySamples.map((sample) => ({
        roadWidth: round(sample.roadWidth),
        ratio: round(sample.ratio),
        size: round(sample.size),
        targetSize: round(sample.targetSize),
    })),
}, null, 2));

if (checks.some((check) => !check.pass)) process.exitCode = 1;

function round(value) {
    return Number(value.toFixed(3));
}
