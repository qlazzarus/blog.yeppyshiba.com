import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
    composeVehicleHeadlightAim,
    composeVehicleHeadlightCurveIntent,
    getVehicleHeadlightCornerFillGuide,
    getVehicleHeadlightEmitterState,
    getVehicleHeadlightFootprintCrossSection,
    getVehicleHeadlightFootprintDimensions,
    getVehicleHeadlightFootprintGuide,
    getVehicleHeadlightOpticalState,
    getVehicleHeadlightScreenPose,
    HEADLIGHT_CORNER_FILL_DEAD_ZONE,
    HEADLIGHT_CORNER_FILL_FULL_WEIGHT_INTENT,
    HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO,
    HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO,
    HEADLIGHT_CURVE_INTENT_ATTACK_SECONDS,
    HEADLIGHT_CURVE_INTENT_RETURN_SECONDS,
    HEADLIGHT_EMITTER_CORE_FAR_FADE_START_RATIO,
    HEADLIGHT_EMITTER_OVERLAP_GAIN,
    HEADLIGHT_EMITTER_TOE_IN_RATIO,
    HEADLIGHT_FAR_FADE_START_RATIO,
    HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO,
    HEADLIGHT_MAIN_SWIVEL_MAX_DEG,
    HEADLIGHT_SWIVEL_START_PROGRESS,
    updateVehicleHeadlightCurveIntent,
} from '../src/game/vehicleHeadlight';
import type { VehicleAtlas } from '../src/game/vehicle';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const vehicleAssets = [
    {
        atlasPath: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json',
        spritePath: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha.png',
    },
    {
        atlasPath: 'assets/vehicles/approved/atlases/genesis-g70-poc-128.json',
        spritePath: 'assets/vehicles/approved/sprites/genesis-g70-poc-128.png',
    },
];
const transform = {
    displaySize: 320,
    rotationRadians: 0,
    x: 600,
    y: 620,
};
const QA_VIEWPORT_HEIGHT = 760;
let checkedProfiles = 0;
let checkedSpriteAnchors = 0;

for (const { atlasPath, spritePath } of vehicleAssets) {
    const atlas = JSON.parse(
        await readFile(path.join(projectDirectory, atlasPath), 'utf8'),
    ) as VehicleAtlas;
    assertOpticalProfileContract(atlasPath, atlas);
    checkedSpriteAnchors += await assertLampAnchorsMatchSprite(
        atlasPath,
        spritePath,
        atlas,
    );
    assertTerrainFootprintOrdering(atlasPath, atlas);

    for (const frameId of Object.keys(atlas.apex.headlightProfiles)) {
        if (!frameId.includes('right-')) continue;

        const curveMagnitude = frameId.endsWith('right-1') ? 0.5 : 1;
        const rightOptical = getVehicleHeadlightOpticalState(atlas, curveMagnitude);
        const leftOptical = getVehicleHeadlightOpticalState(atlas, -curveMagnitude);
        const rightPose = getVehicleHeadlightScreenPose(atlas, frameId, {
            ...transform,
            flipX: false,
            mainSwivelDeg: rightOptical.mainSwivelDeg,
        });
        const leftPose = getVehicleHeadlightScreenPose(atlas, frameId, {
            ...transform,
            flipX: true,
            mainSwivelDeg: leftOptical.mainSwivelDeg,
        });
        const rightEmitter = getVehicleHeadlightEmitterState(rightPose);
        const leftEmitter = getVehicleHeadlightEmitterState(leftPose);
        const footprintGuideConfig = getFootprintGuideConfig(rightPose);
        const rightGuide = getVehicleHeadlightFootprintGuide(rightPose, footprintGuideConfig);
        const leftGuide = getVehicleHeadlightFootprintGuide(leftPose, footprintGuideConfig);
        const rightCornerGuide = getVehicleHeadlightCornerFillGuide(
            rightPose,
            rightOptical,
            footprintGuideConfig,
        );
        const leftCornerGuide = getVehicleHeadlightCornerFillGuide(
            leftPose,
            leftOptical,
            footprintGuideConfig,
        );
        const anchoredSection = getVehicleHeadlightFootprintCrossSection(
            rightPose,
            footprintGuideConfig,
            HEADLIGHT_SWIVEL_START_PROGRESS,
        );
        const farSection = getVehicleHeadlightFootprintCrossSection(
            rightPose,
            footprintGuideConfig,
            1,
        );
        const cornerFarVector = subtract(rightCornerGuide.farCenter, rightPose.beamCenter);
        const cornerMainProgress = dot(
            cornerFarVector,
            rightPose.beamForwardAxis,
        ) / footprintGuideConfig.reach;
        const mainAtCornerFar = getVehicleHeadlightFootprintCrossSection(
            rightPose,
            footprintGuideConfig,
            cornerMainProgress,
        );

        assert(rightPose.poseAimX > 0, `${atlasPath}:${frameId} right aim must be positive`);
        assert(leftPose.poseAimX < 0, `${atlasPath}:${frameId} left aim must be negative`);
        assert(rightPose.beamYawDeg > 0,
            `${atlasPath}:${frameId} right beam yaw must be positive`);
        assertNear(
            rightPose.beamYawDeg - rightPose.baseBeamYawDeg,
            rightOptical.mainSwivelDeg,
            `${atlasPath}:${frameId} main swivel must remain relative to the frame axis`,
        );
        assertNear(
            leftPose.beamYawDeg,
            -rightPose.beamYawDeg,
            `${atlasPath}:${frameId} beam yaw mirror`,
        );
        assertNear(
            rightPose.baseBeamYawDeg,
            rightPose.frameForwardYawDeg,
            `${atlasPath}:${frameId} right frame base yaw`,
        );
        assertNear(
            leftPose.baseBeamYawDeg,
            leftPose.frameForwardYawDeg,
            `${atlasPath}:${frameId} left frame base yaw`,
        );
        assert(Math.abs(rightPose.beamYawDeg - rightPose.baseBeamYawDeg) <= 8,
            `${atlasPath}:${frameId} relative main swivel must stay within 8 degrees`);
        assert(Math.abs(rightOptical.cornerFillYawDeg) <= 12,
            `${atlasPath}:${frameId} corner-fill preview yaw must stay within 12 degrees`);
        assert(rightOptical.cornerFillReachScale < 1,
            `${atlasPath}:${frameId} corner-fill reach must remain shorter than main`);
        assert(rightOptical.cornerFillIntensity <= 0.3,
            `${atlasPath}:${frameId} corner-fill intensity must remain at or below 30%`);
        assert(rightOptical.cornerFillWeight > 0,
            `${atlasPath}:${frameId} corner-fill must be active beyond the dead-zone`);
        assertNear(
            Math.hypot(cornerFarVector.x, cornerFarVector.y),
            footprintGuideConfig.reach * rightOptical.cornerFillReachScale,
            `${atlasPath}:${frameId} corner-fill reach`,
        );
        assertNear(
            Math.atan2(
                dot(cornerFarVector, rightPose.beamLateralAxis),
                dot(cornerFarVector, rightPose.beamForwardAxis),
            ) * 180 / Math.PI,
            rightOptical.cornerFillYawDeg,
            `${atlasPath}:${frameId} corner-fill optical axis`,
        );
        assert(
            dot(
                subtract(rightCornerGuide.farRight, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ) > dot(
                subtract(mainAtCornerFar.right, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ),
            `${atlasPath}:${frameId} corner-fill must extend the inside edge`,
        );
        assert(
            dot(
                subtract(rightCornerGuide.farLeft, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ) > dot(
                subtract(mainAtCornerFar.left, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ),
            `${atlasPath}:${frameId} corner-fill must stay inside the main outside edge`,
        );
        assertNear(
            getForwardYawDeg(rightPose.beamForwardAxis),
            rightPose.baseBeamYawDeg,
            `${atlasPath}:${frameId} right base forward axis yaw`,
        );
        assertNear(
            getForwardYawDeg(leftPose.beamForwardAxis),
            leftPose.baseBeamYawDeg,
            `${atlasPath}:${frameId} left base forward axis yaw`,
        );
        assertNear(
            getForwardYawDeg(rightPose.mainForwardAxis),
            rightPose.beamYawDeg,
            `${atlasPath}:${frameId} right main optical axis yaw`,
        );
        assertNear(
            getForwardYawDeg(leftPose.mainForwardAxis),
            leftPose.beamYawDeg,
            `${atlasPath}:${frameId} left main optical axis yaw`,
        );
        assert(rightPose.lampLeft.x < rightPose.lampRight.x,
            `${atlasPath}:${frameId} right lamps must remain screen ordered`);
        assert(leftPose.lampLeft.x < leftPose.lampRight.x,
            `${atlasPath}:${frameId} mirrored lamps must remain screen ordered`);
        assert(rightPose.lampLeft.x > transform.x,
            `${atlasPath}:${frameId} right emitters must attach to the right front third`);
        assert(leftPose.lampRight.x < transform.x,
            `${atlasPath}:${frameId} left emitters must attach to the left front third`);
        assertNear(
            rightPose.beamCenter.x,
            (rightPose.lampLeft.x + rightPose.lampRight.x) * 0.5,
            `${atlasPath}:${frameId} right beam center X`,
        );
        assertNear(
            rightPose.beamCenter.y,
            (rightPose.lampLeft.y + rightPose.lampRight.y) * 0.5,
            `${atlasPath}:${frameId} right beam center Y`,
        );
        assertNear(
            dot(rightPose.beamLateralAxis, rightPose.beamForwardAxis),
            0,
            `${atlasPath}:${frameId} right beam axes must be perpendicular`,
        );
        assertNear(
            Math.hypot(rightPose.beamLateralAxis.x, rightPose.beamLateralAxis.y),
            1,
            `${atlasPath}:${frameId} right lateral axis length`,
        );
        assertNear(
            Math.hypot(rightPose.beamForwardAxis.x, rightPose.beamForwardAxis.y),
            1,
            `${atlasPath}:${frameId} right forward axis length`,
        );
        assertNear(
            dot(rightPose.mainLateralAxis, rightPose.mainForwardAxis),
            0,
            `${atlasPath}:${frameId} right main axes must be perpendicular`,
        );
        assert(rightPose.beamForwardAxis.y < 0,
            `${atlasPath}:${frameId} right beam must face screen upward`);
        if (frameId.endsWith('right-1')) {
            assertNear(rightPose.frameForwardYawDeg, 42,
                `${atlasPath}:${frameId} medium frame forward yaw`);
        } else {
            assertNear(rightPose.frameForwardYawDeg, 78,
                `${atlasPath}:${frameId} strong frame forward yaw`);
            assert(
                rightGuide.farCenter.x > rightPose.beamCenter.x,
                `${atlasPath}:${frameId} strong footprint must leave the nose laterally`,
            );
        }
        assert(rightPose.lampHalfSpan > 0,
            `${atlasPath}:${frameId} right lamp span must be positive`);
        assert(rightPose.footprint.nearPaddingPx > 0,
            `${atlasPath}:${frameId} near padding must be positive`);
        assert(rightPose.footprint.reachRatio >= 0.11 &&
            rightPose.footprint.reachRatio <= 0.15,
        `${atlasPath}:${frameId} reach ratio must remain in the HL-REV-1 road range`);
        const minimumFarHalfWidth = frameId.endsWith('right-2') ? 0.055 : 0.08;
        const maximumFarHalfWidth = frameId.endsWith('right-2') ? 0.075 : 0.1;

        assert(rightPose.footprint.farHalfWidthRatio >= minimumFarHalfWidth &&
            rightPose.footprint.farHalfWidthRatio <= maximumFarHalfWidth,
        `${atlasPath}:${frameId} far width ratio must remain in the pose-projected range`);
        assertNear(rightEmitter.rightIntensity, 1,
            `${atlasPath}:${frameId} right pose near lamp intensity`);
        assertNear(rightEmitter.rightReachScale, 1,
            `${atlasPath}:${frameId} right pose near lamp reach`);
        assertNear(leftEmitter.leftIntensity, 1,
            `${atlasPath}:${frameId} left pose near lamp intensity`);
        assertNear(leftEmitter.leftReachScale, 1,
            `${atlasPath}:${frameId} left pose near lamp reach`);
        assertNear(leftEmitter.rightIntensity, rightEmitter.leftIntensity,
            `${atlasPath}:${frameId} far lamp intensity mirror`);
        assertNear(leftEmitter.rightReachScale, rightEmitter.leftReachScale,
            `${atlasPath}:${frameId} far lamp reach mirror`);
        assertNear(
            dot(
                subtract(rightGuide.farCenter, rightPose.beamCenter),
                rightPose.beamForwardAxis,
            ),
            footprintGuideConfig.reach,
            `${atlasPath}:${frameId} far center longitudinal reach`,
        );
        assertNear(
            dot(
                subtract(rightGuide.farCenter, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ),
            farSection.swivelOffset,
            `${atlasPath}:${frameId} far center progressive swivel`,
        );
        assertNear(
            dot(
                subtract(rightGuide.farLeft, rightGuide.farCenter),
                rightPose.beamLateralAxis,
            ),
            -farSection.leftHalfWidth,
            `${atlasPath}:${frameId} far left lateral offset`,
        );
        assertNear(
            dot(
                subtract(rightGuide.farRight, rightGuide.farCenter),
                rightPose.beamLateralAxis,
            ),
            farSection.rightHalfWidth,
            `${atlasPath}:${frameId} far right lateral offset`,
        );
        assertNear(
            dot(
                subtract(rightGuide.farLeft, rightPose.beamCenter),
                rightPose.beamLateralAxis,
            ),
            -footprintGuideConfig.farHalfWidth,
            `${atlasPath}:${frameId} outside edge must preserve forward coverage`,
        );
        assertNear(anchoredSection.swivelOffset, 0,
            `${atlasPath}:${frameId} first 30 percent swivel offset`);
        assertNear(anchoredSection.insideExpansion, 0,
            `${atlasPath}:${frameId} first 30 percent inside expansion`);
        assertNear(
            leftPose.lampLeft.x,
            transform.x * 2 - rightPose.lampRight.x,
            `${atlasPath}:${frameId} left lamp mirror`,
        );
        assertNear(
            leftPose.lampRight.x,
            transform.x * 2 - rightPose.lampLeft.x,
            `${atlasPath}:${frameId} right lamp mirror`,
        );
        assertNear(
            leftPose.beamCenter.x,
            transform.x * 2 - rightPose.beamCenter.x,
            `${atlasPath}:${frameId} beam center mirror`,
        );
        assertNear(
            leftPose.beamCenter.y,
            rightPose.beamCenter.y,
            `${atlasPath}:${frameId} beam center Y mirror`,
        );
        assertNear(
            leftPose.beamForwardAxis.x,
            -rightPose.beamForwardAxis.x,
            `${atlasPath}:${frameId} forward X mirror`,
        );
        assertNear(
            leftPose.beamForwardAxis.y,
            rightPose.beamForwardAxis.y,
            `${atlasPath}:${frameId} forward Y mirror`,
        );
        assertNear(
            leftPose.mainForwardAxis.x,
            -rightPose.mainForwardAxis.x,
            `${atlasPath}:${frameId} main forward X mirror`,
        );
        assertNear(
            leftPose.mainForwardAxis.y,
            rightPose.mainForwardAxis.y,
            `${atlasPath}:${frameId} main forward Y mirror`,
        );
        assertNear(
            leftPose.lampHalfSpan,
            rightPose.lampHalfSpan,
            `${atlasPath}:${frameId} lamp span mirror`,
        );
        assertNear(
            leftGuide.farCenter.x,
            transform.x * 2 - rightGuide.farCenter.x,
            `${atlasPath}:${frameId} far center X mirror`,
        );
        assertNear(
            leftGuide.farCenter.y,
            rightGuide.farCenter.y,
            `${atlasPath}:${frameId} far center Y mirror`,
        );
        assertNear(
            leftGuide.midCenter.x,
            transform.x * 2 - rightGuide.midCenter.x,
            `${atlasPath}:${frameId} mid center X mirror`,
        );
        assertNear(
            leftGuide.midCenter.y,
            rightGuide.midCenter.y,
            `${atlasPath}:${frameId} mid center Y mirror`,
        );
        assertNear(
            leftCornerGuide.farCenter.x,
            transform.x * 2 - rightCornerGuide.farCenter.x,
            `${atlasPath}:${frameId} corner-fill center X mirror`,
        );
        assertNear(
            leftCornerGuide.farCenter.y,
            rightCornerGuide.farCenter.y,
            `${atlasPath}:${frameId} corner-fill center Y mirror`,
        );
        assertNear(
            leftCornerGuide.farLeft.x,
            transform.x * 2 - rightCornerGuide.farRight.x,
            `${atlasPath}:${frameId} corner-fill inside edge X mirror`,
        );
        assertNear(
            leftCornerGuide.farLeft.y,
            rightCornerGuide.farRight.y,
            `${atlasPath}:${frameId} corner-fill inside edge Y mirror`,
        );
        assertNear(
            leftCornerGuide.farRight.x,
            transform.x * 2 - rightCornerGuide.farLeft.x,
            `${atlasPath}:${frameId} corner-fill outside edge X mirror`,
        );
        assertNear(
            leftCornerGuide.farRight.y,
            rightCornerGuide.farLeft.y,
            `${atlasPath}:${frameId} corner-fill outside edge Y mirror`,
        );
        checkedProfiles += 1;
    }

    const spriteRotationDeg = 3.5;
    const rotatedPose = getVehicleHeadlightScreenPose(atlas, 'steer-right-2', {
        ...transform,
        flipX: false,
        mainSwivelDeg: 8,
        rotationRadians: degreesToRadians(spriteRotationDeg),
    });
    assertNear(
        rotatedPose.beamYawDeg,
        78 + spriteRotationDeg + 8,
        `${atlasPath}:steer-right-2 final yaw must compose frame, sprite, and optical yaw`,
    );
    assertNear(rotatedPose.spriteRotationDeg, spriteRotationDeg,
        `${atlasPath}:steer-right-2 sprite rotation telemetry`);
    assertNear(rotatedPose.spriteTransformYawDeg, spriteRotationDeg,
        `${atlasPath}:steer-right-2 sprite transform yaw`);
    assertNear(
        getForwardYawDeg(rotatedPose.beamForwardAxis),
        78 + spriteRotationDeg,
        `${atlasPath}:steer-right-2 base axis must include frame and sprite yaw`,
    );
    assertNear(
        getForwardYawDeg(rotatedPose.mainForwardAxis),
        rotatedPose.beamYawDeg,
        `${atlasPath}:steer-right-2 main optical axis yaw`,
    );
}

assert(composeVehicleHeadlightAim(42, 4, -80, 72) >= 0,
    'right pose must not be reversed by road assist');
assert(composeVehicleHeadlightAim(-42, -4, 80, 72) <= 0,
    'left pose must not be reversed by road assist');
assert(composeVehicleHeadlightAim(0, 0, -18, 72) === -18,
    'center pose must remain free to follow the road tangent');
assertNear(composeVehicleHeadlightCurveIntent(1, -1, 0.55), -0.1,
    'grip curve intent must give the road tangent a majority weight');
assertNear(composeVehicleHeadlightCurveIntent(-1, 1, 0.3), -0.4,
    'drift curve intent must retain the vehicle-direction majority');
assertNear(HEADLIGHT_FAR_FADE_START_RATIO, 0.63,
    'HL-REV-1 far fade must begin at 63% of beam reach');
assertNear(HEADLIGHT_SWIVEL_START_PROGRESS, 0.3,
    'HL-REV-3 progressive swivel must keep the first 30% anchored');
assertNear(HEADLIGHT_MAIN_SWIVEL_MAX_DEG, 8,
    'HL-REV-3 main swivel normalization');
assertNear(HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO, 0.12,
    'HL-REV-3 inside edge expansion ratio');
assertNear(HEADLIGHT_CORNER_FILL_DEAD_ZONE, 0.12,
    'HL-REV-4 corner-fill dead-zone');
assertNear(HEADLIGHT_CORNER_FILL_FULL_WEIGHT_INTENT, 0.5,
    'HL-REV-4 corner-fill full-weight intent');
assertNear(HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO, 0.75,
    'HL-REV-4 corner-fill outside width ratio');
assertNear(HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO, 0.95,
    'HL-REV-4 corner-fill inside width ratio');
assertNear(HEADLIGHT_CURVE_INTENT_ATTACK_SECONDS, 0.1,
    'HL-REV-5 curve-intent attack response');
assertNear(HEADLIGHT_CURVE_INTENT_RETURN_SECONDS, 0.18,
    'HL-REV-5 curve-intent return response');
assertNear(HEADLIGHT_EMITTER_CORE_FAR_FADE_START_RATIO, 0.68,
    'HL-REV-7 emitter core far fade start');
assertNear(HEADLIGHT_EMITTER_OVERLAP_GAIN, 0.32,
    'HL-REV-7 bounded emitter overlap');
assertNear(HEADLIGHT_EMITTER_TOE_IN_RATIO, 0.28,
    'HL-REV-7 dual emitter toe-in');
assertHeadlightTransitionSequence('center to right', 0, 1, 0.6, 1);
assertHeadlightTransitionSequence('right to center', 1, 0, 0.9, -1);
assertHeadlightTransitionSequence('right to left', 1, -1, 0.8, -1);
assertHeadlightTransitionSequence('left to right', -1, 1, 0.8, 1);

process.stdout.write(
    `Headlight profile QA passed: ${checkedProfiles} directional profiles and ` +
    `${checkedSpriteAnchors} sprite anchors across ${vehicleAssets.length} atlases.\n`,
);

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function assertNear(actual: number, expected: number, label: string) {
    if (Math.abs(actual - expected) > 0.001) {
        throw new Error(`${label}: expected ${expected}, received ${actual}`);
    }
}

function assertHeadlightTransitionSequence(
    label: string,
    initial: number,
    target: number,
    durationSeconds: number,
    direction: -1 | 1,
) {
    const deltaSeconds = 1 / 60;
    const sampleCount = Math.ceil(durationSeconds / deltaSeconds);
    let current = initial;
    let previousDistance = Math.abs(target - current);
    let previousOpticalYaw = current * HEADLIGHT_MAIN_SWIVEL_MAX_DEG;
    let signCrossings = 0;
    let previousSign = Math.sign(current);

    for (let index = 0; index < sampleCount; index += 1) {
        const next = updateVehicleHeadlightCurveIntent(current, target, deltaSeconds);
        const distance = Math.abs(target - next);
        const opticalYaw = next * HEADLIGHT_MAIN_SWIVEL_MAX_DEG;
        const nextSign = Math.sign(next);

        assert(distance <= previousDistance + 1e-9,
            `${label} distance must decrease monotonically`);
        assert(direction * (next - current) >= -1e-9,
            `${label} intent must move monotonically toward target`);
        assert(direction * (opticalYaw - previousOpticalYaw) >= -1e-9,
            `${label} optical yaw must move monotonically`);
        assert(next >= -1 && next <= 1, `${label} intent must not overshoot bounds`);

        if (previousSign !== 0 && nextSign !== 0 && nextSign !== previousSign) {
            signCrossings += 1;
        }

        current = next;
        previousDistance = distance;
        previousOpticalYaw = opticalYaw;
        previousSign = nextSign;
    }

    assert(signCrossings <= 1, `${label} must cross center at most once`);
    assert(Math.abs(target - current) < 0.02,
        `${label} must settle within 0.02 of target`);
}

function dot(
    first: { x: number; y: number },
    second: { x: number; y: number },
) {
    return first.x * second.x + first.y * second.y;
}

function subtract(
    first: { x: number; y: number },
    second: { x: number; y: number },
) {
    return { x: first.x - second.x, y: first.y - second.y };
}

function degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
}

function getForwardYawDeg(axis: { x: number; y: number }) {
    return Math.atan2(axis.x, -axis.y) * 180 / Math.PI;
}

function getFootprintGuideConfig(pose: ReturnType<typeof getVehicleHeadlightScreenPose>) {
    const footprint = getVehicleHeadlightFootprintDimensions(
        pose.footprint,
        QA_VIEWPORT_HEIGHT,
    );

    return {
        farHalfWidth: footprint.farHalfWidth,
        nearPadding: footprint.nearPadding,
        reach: footprint.reach,
    };
}

function assertTerrainFootprintOrdering(atlasPath: string, atlas: VehicleAtlas) {
    const profiles = atlas.apex.headlightProfiles;
    const level = profiles.center.footprint;
    const downhill = profiles['downhill-center'].footprint;
    const uphill = profiles['uphill-center'].footprint;

    assert(downhill.reachRatio > level.reachRatio,
        `${atlasPath} downhill reach must exceed level reach`);
    assert(uphill.reachRatio < level.reachRatio,
        `${atlasPath} uphill reach must be shorter than level reach`);
    assert(downhill.farHalfWidthRatio > level.farHalfWidthRatio,
        `${atlasPath} downhill width must exceed level width`);
    assert(uphill.farHalfWidthRatio < level.farHalfWidthRatio,
        `${atlasPath} uphill width must be narrower than level width`);
    assertNear(level.reachRatio, 0.14,
        `${atlasPath} HL-REV-1 level center reach`);
    assertNear(downhill.reachRatio, 0.15,
        `${atlasPath} HL-REV-1 downhill center reach`);
    assertNear(uphill.reachRatio, 0.12,
        `${atlasPath} HL-REV-1 uphill center reach`);
    assertNear(level.farHalfWidthRatio, 0.125,
        `${atlasPath} HL-REV-1 level center width`);
    assertNear(downhill.farHalfWidthRatio, 0.14,
        `${atlasPath} HL-REV-1 downhill center width`);
    assertNear(uphill.farHalfWidthRatio, 0.115,
        `${atlasPath} HL-REV-1 uphill center width`);

    const levelReachPixels = getVehicleHeadlightFootprintDimensions(
        level,
        QA_VIEWPORT_HEIGHT,
    ).reach;

    assert(levelReachPixels >= 99 && levelReachPixels <= 110,
        `${atlasPath} level center reach must end within 99..110px at 760px viewport`);

    const terrainProfiles = [
        ['center', 'steer-right-1', 'steer-right-2'],
        ['downhill-center', 'downhill-right-1', 'downhill-right-2'],
        ['uphill-center', 'uphill-right-1', 'uphill-right-2'],
    ];

    for (const [centerId, rightOneId, rightTwoId] of terrainProfiles) {
        const centerFootprint = profiles[centerId].footprint;
        const rightOneFootprint = profiles[rightOneId].footprint;
        const rightTwoFootprint = profiles[rightTwoId].footprint;

        assert(centerFootprint.reachRatio > rightOneFootprint.reachRatio,
            `${atlasPath}:${rightOneId} reach must be shorter than center`);
        assert(rightOneFootprint.reachRatio > rightTwoFootprint.reachRatio,
            `${atlasPath}:${rightTwoId} reach must be shorter than right-1`);
        assert(centerFootprint.farHalfWidthRatio > rightOneFootprint.farHalfWidthRatio,
            `${atlasPath}:${rightOneId} width must be narrower than center`);
        assert(rightOneFootprint.farHalfWidthRatio > rightTwoFootprint.farHalfWidthRatio,
            `${atlasPath}:${rightTwoId} width must be narrower than right-1`);
    }
}

function assertOpticalProfileContract(atlasPath: string, atlas: VehicleAtlas) {
    const profiles = atlas.apex.headlightProfiles;
    const terrainPrefixes = ['', 'downhill-', 'uphill-'];

    assertEmitterProfileNear(
        profiles.center.emitter,
        { farLampIntensity: 1, farLampReachScale: 1, lobeWidthScale: 0.6,
            mergeStartRatio: 0.58 },
        `${atlasPath}:center canonical emitter profile`,
    );
    assertEmitterProfileNear(
        profiles['steer-right-1'].emitter,
        { farLampIntensity: 0.65, farLampReachScale: 0.9, lobeWidthScale: 0.56,
            mergeStartRatio: 0.52 },
        `${atlasPath}:medium canonical emitter profile`,
    );
    assertEmitterProfileNear(
        profiles['steer-right-2'].emitter,
        { farLampIntensity: 0.35, farLampReachScale: 0.82, lobeWidthScale: 0.52,
            mergeStartRatio: 0.42 },
        `${atlasPath}:strong canonical emitter profile`,
    );

    for (const prefix of terrainPrefixes) {
        const centerId = prefix ? `${prefix}center` : 'center';
        const rightOneId = prefix ? `${prefix}right-1` : 'steer-right-1';
        const rightTwoId = prefix ? `${prefix}right-2` : 'steer-right-2';
        const centerProfile = profiles[centerId];
        const rightOneProfile = profiles[rightOneId];
        const rightTwoProfile = profiles[rightTwoId];
        const center = centerProfile.optical;
        const rightOne = rightOneProfile.optical;
        const rightTwo = rightTwoProfile.optical;

        assertNear(centerProfile.emitterForwardYawDeg, 0,
            `${atlasPath}:${centerId} center emitter forward yaw`);
        assertNear(rightOneProfile.emitterForwardYawDeg, 42,
            `${atlasPath}:${rightOneId} medium emitter forward yaw`);
        assertNear(rightTwoProfile.emitterForwardYawDeg, 78,
            `${atlasPath}:${rightTwoId} strong emitter forward yaw`);

        assertOpticalProfileNear(
            center,
            profiles.center.optical,
            `${atlasPath}:${centerId} center optical profile`,
        );
        assertEmitterProfileNear(
            centerProfile.emitter,
            profiles.center.emitter,
            `${atlasPath}:${centerId} center emitter profile`,
        );
        assertEmitterProfileNear(
            rightOneProfile.emitter,
            profiles['steer-right-1'].emitter,
            `${atlasPath}:${rightOneId} terrain-independent medium emitter profile`,
        );
        assertEmitterProfileNear(
            rightTwoProfile.emitter,
            profiles['steer-right-2'].emitter,
            `${atlasPath}:${rightTwoId} terrain-independent strong emitter profile`,
        );
        assertOpticalProfileNear(
            rightOne,
            profiles['steer-right-1'].optical,
            `${atlasPath}:${rightOneId} terrain-independent medium optical profile`,
        );
        assertOpticalProfileNear(
            rightTwo,
            profiles['steer-right-2'].optical,
            `${atlasPath}:${rightTwoId} terrain-independent strong optical profile`,
        );
    }

    const qaSamples = [
        { cornerWeight: 1, cornerYaw: -12, intent: -1, mainYaw: -8 },
        { cornerWeight: 1, cornerYaw: -7, intent: -0.5, mainYaw: -4 },
        { cornerWeight: 0, cornerYaw: 0, intent: 0, mainYaw: 0 },
        { cornerWeight: 1, cornerYaw: 7, intent: 0.5, mainYaw: 4 },
        { cornerWeight: 1, cornerYaw: 12, intent: 1, mainYaw: 8 },
    ];

    for (const sample of qaSamples) {
        const optical = getVehicleHeadlightOpticalState(atlas, sample.intent);

        assertNear(optical.mainSwivelDeg, sample.mainYaw,
            `${atlasPath}:curve ${sample.intent} main optical yaw`);
        assertNear(optical.cornerFillYawDeg, sample.cornerYaw,
            `${atlasPath}:curve ${sample.intent} corner-fill preview yaw`);
        assertNear(optical.cornerFillWeight, sample.cornerWeight,
            `${atlasPath}:curve ${sample.intent} corner-fill weight`);
    }

    assertNear(
        getVehicleHeadlightOpticalState(atlas, HEADLIGHT_CORNER_FILL_DEAD_ZONE).cornerFillWeight,
        0,
        `${atlasPath}:corner-fill dead-zone activation`,
    );
    const partialWeight = getVehicleHeadlightOpticalState(atlas, 0.25).cornerFillWeight;
    assert(partialWeight > 0 && partialWeight < 1,
        `${atlasPath}:corner-fill must fade continuously after the dead-zone`);
}

function assertEmitterProfileNear(
    actual: VehicleAtlas['apex']['headlightProfiles'][string]['emitter'],
    expected: VehicleAtlas['apex']['headlightProfiles'][string]['emitter'],
    label: string,
) {
    assertNear(actual.farLampIntensity, expected.farLampIntensity,
        `${label} far lamp intensity`);
    assertNear(actual.farLampReachScale, expected.farLampReachScale,
        `${label} far lamp reach`);
    assertNear(actual.lobeWidthScale, expected.lobeWidthScale,
        `${label} lobe width`);
    assertNear(actual.mergeStartRatio, expected.mergeStartRatio,
        `${label} merge start`);
}

function assertOpticalProfileNear(
    actual: VehicleAtlas['apex']['headlightProfiles'][string]['optical'],
    expected: VehicleAtlas['apex']['headlightProfiles'][string]['optical'],
    label: string,
) {
    assertNear(actual.mainSwivelDeg, expected.mainSwivelDeg, `${label} main swivel`);
    assertNear(actual.cornerFillYawDeg, expected.cornerFillYawDeg, `${label} corner yaw`);
    assertNear(actual.cornerFillReachScale, expected.cornerFillReachScale,
        `${label} corner reach`);
    assertNear(actual.cornerFillIntensity, expected.cornerFillIntensity,
        `${label} corner intensity`);
}

async function assertLampAnchorsMatchSprite(
    atlasPath: string,
    spritePath: string,
    atlas: VehicleAtlas,
) {
    const { data, info } = await sharp(path.join(projectDirectory, spritePath))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let checked = 0;

    for (const [frameId, profile] of Object.entries(atlas.apex.headlightProfiles)) {
        const frame = atlas.frames[frameId]?.frame;

        assert(Boolean(frame), `${atlasPath}:${frameId} must have a sprite frame`);

        const bounds = getOpaqueFrameBounds(data, info.width, info.channels, frame);
        const lampLeft = {
            x: profile.lampLeft.x * frame.w,
            y: profile.lampLeft.y * frame.h,
        };
        const lampRight = {
            x: profile.lampRight.x * frame.w,
            y: profile.lampRight.y * frame.h,
        };
        const beamCenter = {
            x: (lampLeft.x + lampRight.x) * 0.5,
            y: (lampLeft.y + lampRight.y) * 0.5,
        };
        // Rear-view sprites hide the physical front lamps. Allow the road
        // projection anchor to sit just ahead of the alpha silhouette, but no
        // farther than 3% of one atlas cell.
        const margin = Math.max(2, frame.w * 0.03);

        assertPointWithinBounds(lampLeft, bounds, margin,
            `${atlasPath}:${frameId} lamp left must overlap the vehicle bounds`);
        assertPointWithinBounds(lampRight, bounds, margin,
            `${atlasPath}:${frameId} lamp right must overlap the vehicle bounds`);

        if (frameId.includes('right-')) {
            const frontThreshold = bounds.minX + bounds.width * 0.60;

            assert(beamCenter.x >= frontThreshold,
                `${atlasPath}:${frameId} beam anchor must stay in the right-facing nose zone`);
        } else {
            const frontThreshold = bounds.minY + bounds.height * 0.50;

            assert(beamCenter.y <= frontThreshold,
                `${atlasPath}:${frameId} center beam anchor must stay in the forward half`);
        }

        checked += 1;
    }

    return checked;
}

function getOpaqueFrameBounds(
    data: Buffer,
    imageWidth: number,
    channels: number,
    frame: { h: number; w: number; x: number; y: number },
) {
    let minX = frame.w;
    let minY = frame.h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < frame.h; y += 1) {
        for (let x = 0; x < frame.w; x += 1) {
            const imageX = frame.x + x;
            const imageY = frame.y + y;
            const alphaIndex = (imageY * imageWidth + imageX) * channels + 3;

            if (data[alphaIndex] === 0) continue;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    assert(maxX >= minX && maxY >= minY, 'vehicle sprite frame must contain opaque pixels');

    return {
        height: maxY - minY + 1,
        maxX,
        maxY,
        minX,
        minY,
        width: maxX - minX + 1,
    };
}

function assertPointWithinBounds(
    point: { x: number; y: number },
    bounds: ReturnType<typeof getOpaqueFrameBounds>,
    margin: number,
    label: string,
) {
    assert(
        point.x >= bounds.minX - margin &&
        point.x <= bounds.maxX + margin &&
        point.y >= bounds.minY - margin &&
        point.y <= bounds.maxY + margin,
        `${label}: point (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) vs ` +
        `bounds (${bounds.minX}, ${bounds.minY})-(${bounds.maxX}, ${bounds.maxY})`,
    );
}
