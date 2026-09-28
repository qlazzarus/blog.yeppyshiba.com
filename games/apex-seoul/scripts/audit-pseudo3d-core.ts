import { readFileSync } from 'node:fs';
import {
    createDefaultCamera,
    projectGroundPoint,
} from '../src/game/core/pseudo3dCamera';
import {
    createRoadTrack,
    getRoadElevationAt,
    getRoadHalfWidthAt,
} from '../src/game/core/road';
import {
    GUARDRAIL_COLLISION_CONFIG,
    getGuardrailCollisionGeometry,
} from '../src/game/core/guardrailGeometry';
import { projectGuardrailCollisionToScreen } from '../src/game/core/guardrailScreenProjection';

const viewport = { height: 760, width: 1200 };
const camera = createDefaultCamera();
const projected = projectGroundPoint({ x: 0, z: 1920 }, camera, viewport);
const hidden = projectGroundPoint({ x: 0, z: 1 }, camera, viewport);
const track = createRoadTrack('bugak-ridge-downhill');
const geometry = getGuardrailCollisionGeometry({
    pavedHalfWidth: 960,
    railContactLimit: 1180,
    vehicleHalfWidth: GUARDRAIL_COLLISION_CONFIG.physicalVehicleHalfWidth,
});
const screenProjection = projectGuardrailCollisionToScreen(
    { leftX: 200, rightX: 1000 },
    geometry,
    geometry.railCenterLimit,
    120,
);
const coreFiles = [
    'src/game/core/pseudo3dCamera.ts',
    'src/game/core/road.ts',
    'src/game/core/guardrailGeometry.ts',
    'src/game/core/guardrailScreenProjection.ts',
];
const forbiddenImports = coreFiles.filter((file) => {
    const source = readFileSync(file, 'utf8');

    return source.includes("from 'phaser'") || source.includes('from "phaser"') ||
        ['window', 'document', 'localStorage'].some((platformGlobal) => source.includes(platformGlobal));
});
const checks = [
    check('camera-projects-centered-ground-point', projected.visible && projected.x === viewport.width / 2),
    check('camera-clips-near-ground-point', !hidden.visible && hidden.scale === 0),
    check('road-track-has-finite-geometry', track.length > track.finishZ && getRoadHalfWidthAt(track, 0) === 960 && Number.isFinite(getRoadElevationAt(track, track.finishZ))),
    check('guardrail-geometry-contract', geometry.pavedCenterLimit === 720 && geometry.railCenterLimit === 940 && geometry.shoulderWidth === 220),
    check('guardrail-screen-contact-contract', Math.abs(screenProjection.rightGapPx) <= 0.001 && screenProjection.normalizedOffset === 1),
    check('core-does-not-import-renderer-or-platform', forbiddenImports.length === 0),
];
const failures = checks.filter((check) => !check.pass);

console.log(JSON.stringify({ checks, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;

function check(id: string, pass: boolean) {
    return { id, pass };
}
