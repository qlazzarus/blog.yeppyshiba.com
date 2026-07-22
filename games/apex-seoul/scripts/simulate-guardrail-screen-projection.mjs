import {
    GUARDRAIL_COLLISION_CONFIG,
    getGuardrailCollisionGeometry,
} from '../src/game/guardrailCollision.ts';
import { projectGuardrailCollisionToScreen } from '../src/game/guardrailScreenProjection.ts';

const roadSpan = { leftX: 200, rightX: 1000 };
const geometry = getGuardrailCollisionGeometry({
    pavedHalfWidth: 960,
    railContactLimit: 1180,
    vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
});
const offsets = [
    -geometry.railCenterLimit,
    -geometry.railCenterLimit * 0.5,
    0,
    geometry.railCenterLimit * 0.5,
    geometry.railCenterLimit,
];
const widths = [100, 120, 150];
const samples = widths.flatMap((contactWidthPx) => offsets.map((lateralOffset) => ({
    contactWidthPx,
    lateralOffset,
    projection: projectGuardrailCollisionToScreen(
        roadSpan,
        geometry,
        lateralOffset,
        contactWidthPx,
    ),
})));
const leftContact = samples.find((sample) => (
    sample.contactWidthPx === 120 && sample.lateralOffset === -geometry.railCenterLimit
));
const rightContact = samples.find((sample) => (
    sample.contactWidthPx === 120 && sample.lateralOffset === geometry.railCenterLimit
));
const center = samples.find((sample) => sample.contactWidthPx === 120 && sample.lateralOffset === 0);
const checks = [
    checkNear('leftContactGap', leftContact.projection.leftGapPx, 0, 0.001),
    checkNear('rightContactGap', rightContact.projection.rightGapPx, 0, 0.001),
    checkNear('centerAlignment', center.projection.centerX, 600, 0.001),
    check('monotonicCenters', isStrictlyIncreasing(samples
        .filter((sample) => sample.contactWidthPx === 120)
        .map((sample) => sample.projection.centerX)), true, true),
    check('allContactWidthsCloseExactly', samples
        .filter((sample) => Math.abs(sample.lateralOffset) === geometry.railCenterLimit)
        .every((sample) => Math.abs(sample.projection.activeGapPx) <= 0.001), true, true),
    checkNear('normalizedLeft', leftContact.projection.normalizedOffset, -1, 0.001),
    checkNear('normalizedRight', rightContact.projection.normalizedOffset, 1, 0.001),
];
const report = {
    checks,
    geometry,
    pass: checks.every((check) => check.pass),
    reference: {
        center: round(center.projection.centerX),
        leftRail: round(leftContact.projection.leftRailX),
        rightRail: round(rightContact.projection.rightRailX),
        roadScalePxPerUnit: round(center.projection.roadScalePxPerUnit),
    },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function isStrictlyIncreasing(values) {
    return values.every((value, index) => index === 0 || value > values[index - 1]);
}

function checkNear(id, value, target, tolerance) {
    return check(id, Math.abs(value - target) <= tolerance, target, round(value));
}

function check(id, pass, target, value) {
    return { id, pass, target, value };
}

function round(value) {
    return Number(value.toFixed(4));
}
