import type {
    VehicleAtlas,
    VehicleHeadlightEmitterProfile,
    VehicleHeadlightFootprintProfile,
    VehicleHeadlightOpticalProfile,
} from './vehicle';

export const HEADLIGHT_FAR_FADE_START_RATIO = 0.63;
export const HEADLIGHT_EMITTER_CORE_FAR_FADE_START_RATIO = 0.68;
export const HEADLIGHT_EMITTER_OVERLAP_GAIN = 0.32;
export const HEADLIGHT_EMITTER_TOE_IN_RATIO = 0.28;
export const HEADLIGHT_CORNER_FILL_DEAD_ZONE = 0.12;
export const HEADLIGHT_CORNER_FILL_FAR_FADE_START_RATIO = 0.68;
export const HEADLIGHT_CORNER_FILL_FULL_WEIGHT_INTENT = 0.5;
export const HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO = 0.95;
export const HEADLIGHT_CORNER_FILL_NEAR_WIDTH_RATIO = 0.72;
export const HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO = 0.75;
export const HEADLIGHT_CORNER_FILL_WIDTH_EXPONENT = 0.78;
export const HEADLIGHT_CURVE_INTENT_ATTACK_SECONDS = 0.1;
export const HEADLIGHT_CURVE_INTENT_RETURN_SECONDS = 0.18;
export const HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO = 0.12;
export const HEADLIGHT_MAIN_SWIVEL_MAX_DEG = 8;
export const HEADLIGHT_SWIVEL_EXPONENT = 1.2;
export const HEADLIGHT_SWIVEL_START_PROGRESS = 0.3;
export const HEADLIGHT_WIDTH_EXPONENT = 0.72;

export type VehicleHeadlightOpticalState = VehicleHeadlightOpticalProfile & {
    cornerFillWeight: number;
    curveIntent: number;
};

export type VehicleHeadlightEmitterState = {
    leftIntensity: number;
    leftReachScale: number;
    lobeWidthScale: number;
    mergeStartRatio: number;
    rightIntensity: number;
    rightReachScale: number;
};

export type VehicleHeadlightScreenPose = {
    baseBeamYawDeg: number;
    beamCenter: {
        x: number;
        y: number;
    };
    beamForwardAxis: {
        x: number;
        y: number;
    };
    beamLateralAxis: {
        x: number;
        y: number;
    };
    beamYawDeg: number;
    emitter: VehicleHeadlightEmitterProfile;
    frameForwardYawDeg: number;
    frameId: string;
    footprint: VehicleHeadlightFootprintProfile;
    lampLeft: {
        x: number;
        y: number;
    };
    lampRight: {
        x: number;
        y: number;
    };
    lampHalfSpan: number;
    mainForwardAxis: {
        x: number;
        y: number;
    };
    mainLateralAxis: {
        x: number;
        y: number;
    };
    mainSwivelDeg: number;
    poseAimX: number;
    profileId: string;
    spriteRotationDeg: number;
    spriteTransformYawDeg: number;
};

export function getVehicleHeadlightEmitterState(
    pose: VehicleHeadlightScreenPose,
): VehicleHeadlightEmitterState {
    const turnsRight = pose.frameForwardYawDeg > 0;
    const turnsLeft = pose.frameForwardYawDeg < 0;

    return {
        leftIntensity: turnsRight ? pose.emitter.farLampIntensity : 1,
        leftReachScale: turnsRight ? pose.emitter.farLampReachScale : 1,
        lobeWidthScale: pose.emitter.lobeWidthScale,
        mergeStartRatio: pose.emitter.mergeStartRatio,
        rightIntensity: turnsLeft ? pose.emitter.farLampIntensity : 1,
        rightReachScale: turnsLeft ? pose.emitter.farLampReachScale : 1,
    };
}

export type VehicleHeadlightFootprintGuide = {
    farCenter: { x: number; y: number };
    farLeft: { x: number; y: number };
    farRight: { x: number; y: number };
    midCenter: { x: number; y: number };
    midLeft: { x: number; y: number };
    midRight: { x: number; y: number };
    nearLeft: { x: number; y: number };
    nearRight: { x: number; y: number };
};

export type VehicleHeadlightCornerFillGuide = {
    farCenter: { x: number; y: number };
    farLeft: { x: number; y: number };
    farRight: { x: number; y: number };
    nearCenter: { x: number; y: number };
    nearLeft: { x: number; y: number };
    nearRight: { x: number; y: number };
    reach: number;
};

export type VehicleHeadlightCornerFillCrossSection = {
    center: { x: number; y: number };
    left: { x: number; y: number };
    leftHalfWidth: number;
    progress: number;
    right: { x: number; y: number };
    rightHalfWidth: number;
};

export type VehicleHeadlightFootprintGuideConfig = {
    farHalfWidth: number;
    nearPadding: number;
    reach: number;
};

export type VehicleHeadlightFootprintCrossSection = {
    center: { x: number; y: number };
    insideExpansion: number;
    left: { x: number; y: number };
    leftHalfWidth: number;
    progress: number;
    right: { x: number; y: number };
    rightHalfWidth: number;
    swivelBlend: number;
    swivelOffset: number;
};

export type VehicleHeadlightFootprintDimensions = {
    farHalfWidth: number;
    farHalfWidthRatio: number;
    nearPadding: number;
    reach: number;
    reachRatio: number;
};

export function composeVehicleHeadlightAim(
    framePoseAimX: number,
    fineAimX: number,
    roadAssistAimX: number,
    maxAimX: number,
) {
    const poseSign = Math.sign(framePoseAimX);
    const combinedAimX = framePoseAimX + fineAimX + roadAssistAimX;
    const poseSafeAimX = poseSign !== 0
        ? poseSign * Math.max(0, poseSign * combinedAimX)
        : combinedAimX;

    return Math.min(maxAimX, Math.max(-maxAimX, poseSafeAimX));
}

export function composeVehicleHeadlightCurveIntent(
    vehicleIntent: number,
    roadIntent: number,
    roadWeight: number,
) {
    const safeRoadWeight = clamp(roadWeight, 0, 1);

    return clamp(
        vehicleIntent * (1 - safeRoadWeight) + roadIntent * safeRoadWeight,
        -1,
        1,
    );
}

export function updateVehicleHeadlightCurveIntent(
    currentIntent: number,
    targetIntent: number,
    deltaSeconds: number,
) {
    const safeCurrent = clamp(currentIntent, -1, 1);
    const safeTarget = clamp(targetIntent, -1, 1);
    const changesDirection = Math.sign(safeTarget) !== Math.sign(safeCurrent);
    const movesAway = Math.abs(safeTarget) > Math.abs(safeCurrent);
    const responseSeconds = changesDirection || movesAway
        ? HEADLIGHT_CURVE_INTENT_ATTACK_SECONDS
        : HEADLIGHT_CURVE_INTENT_RETURN_SECONDS;
    const blend = 1 - Math.exp(-Math.max(0, deltaSeconds) / responseSeconds);

    return lerp(safeCurrent, safeTarget, blend);
}

export function getVehicleHeadlightOpticalState(
    atlas: VehicleAtlas,
    curveIntent: number,
): VehicleHeadlightOpticalState {
    const safeCurveIntent = clamp(curveIntent, -1, 1);
    const magnitude = Math.abs(safeCurveIntent);
    const center = atlas.apex.headlightProfiles.center.optical;
    const medium = atlas.apex.headlightProfiles['steer-right-1'].optical;
    const strong = atlas.apex.headlightProfiles['steer-right-2'].optical;
    const [from, to, blend] = magnitude <= 0.5
        ? [center, medium, magnitude * 2]
        : [medium, strong, (magnitude - 0.5) * 2];
    const sign = Math.sign(safeCurveIntent);

    return {
        cornerFillIntensity: lerp(
            from.cornerFillIntensity,
            to.cornerFillIntensity,
            blend,
        ),
        cornerFillReachScale: lerp(
            from.cornerFillReachScale,
            to.cornerFillReachScale,
            blend,
        ),
        cornerFillWeight: smoothstep(
            HEADLIGHT_CORNER_FILL_DEAD_ZONE,
            HEADLIGHT_CORNER_FILL_FULL_WEIGHT_INTENT,
            magnitude,
        ),
        cornerFillYawDeg: sign * lerp(
            from.cornerFillYawDeg,
            to.cornerFillYawDeg,
            blend,
        ),
        curveIntent: safeCurveIntent,
        mainSwivelDeg: sign * lerp(
            from.mainSwivelDeg,
            to.mainSwivelDeg,
            blend,
        ),
    };
}

export function getVehicleHeadlightCornerFillGuide(
    pose: VehicleHeadlightScreenPose,
    optical: VehicleHeadlightOpticalState,
    config: VehicleHeadlightFootprintGuideConfig,
): VehicleHeadlightCornerFillGuide {
    const near = getVehicleHeadlightCornerFillCrossSection(pose, optical, config, 0);
    const far = getVehicleHeadlightCornerFillCrossSection(pose, optical, config, 1);

    return {
        farCenter: far.center,
        farLeft: far.left,
        farRight: far.right,
        nearCenter: near.center,
        nearLeft: near.left,
        nearRight: near.right,
        reach: config.reach * optical.cornerFillReachScale,
    };
}

export function getVehicleHeadlightCornerFillCrossSection(
    pose: VehicleHeadlightScreenPose,
    optical: VehicleHeadlightOpticalState,
    config: VehicleHeadlightFootprintGuideConfig,
    progress: number,
): VehicleHeadlightCornerFillCrossSection {
    const safeProgress = clamp(progress, 0, 1);
    const reach = config.reach * optical.cornerFillReachScale;
    const localY = reach * safeProgress;
    const yawRadians = degreesToRadians(optical.cornerFillYawDeg);
    const sine = Math.sin(yawRadians);
    const cosine = Math.cos(yawRadians);
    const forwardAxis = {
        x: pose.beamForwardAxis.x * cosine + pose.beamLateralAxis.x * sine,
        y: pose.beamForwardAxis.y * cosine + pose.beamLateralAxis.y * sine,
    };
    const lateralAxis = {
        x: pose.beamLateralAxis.x * cosine - pose.beamForwardAxis.x * sine,
        y: pose.beamLateralAxis.y * cosine - pose.beamForwardAxis.y * sine,
    };
    const nearHalfWidth = (pose.lampHalfSpan + config.nearPadding) *
        HEADLIGHT_CORNER_FILL_NEAR_WIDTH_RATIO;
    const widthBlend = Math.pow(safeProgress, HEADLIGHT_CORNER_FILL_WIDTH_EXPONENT);
    const outsideHalfWidth = lerp(
        nearHalfWidth,
        config.farHalfWidth * HEADLIGHT_CORNER_FILL_OUTSIDE_WIDTH_RATIO,
        widthBlend,
    );
    const insideHalfWidth = lerp(
        nearHalfWidth,
        config.farHalfWidth * HEADLIGHT_CORNER_FILL_INSIDE_WIDTH_RATIO,
        widthBlend,
    );
    const turnsRight = optical.cornerFillYawDeg > 0;
    const turnsLeft = optical.cornerFillYawDeg < 0;
    const leftHalfWidth = turnsRight ? outsideHalfWidth : insideHalfWidth;
    const rightHalfWidth = turnsLeft ? outsideHalfWidth : insideHalfWidth;
    const center = offsetPoint(pose.beamCenter, forwardAxis, localY);

    return {
        center,
        left: offsetPoint(center, lateralAxis, -leftHalfWidth),
        leftHalfWidth,
        progress: safeProgress,
        right: offsetPoint(center, lateralAxis, rightHalfWidth),
        rightHalfWidth,
    };
}

export function getVehicleHeadlightFootprintDimensions(
    footprint: VehicleHeadlightFootprintProfile,
    viewportHeight: number,
): VehicleHeadlightFootprintDimensions {
    return {
        farHalfWidth: viewportHeight * footprint.farHalfWidthRatio,
        farHalfWidthRatio: footprint.farHalfWidthRatio,
        nearPadding: footprint.nearPaddingPx,
        reach: viewportHeight * footprint.reachRatio,
        reachRatio: footprint.reachRatio,
    };
}

export function getVehicleHeadlightFootprintGuide(
    pose: VehicleHeadlightScreenPose,
    config: VehicleHeadlightFootprintGuideConfig,
): VehicleHeadlightFootprintGuide {
    const near = getVehicleHeadlightFootprintCrossSection(pose, config, 0);
    const mid = getVehicleHeadlightFootprintCrossSection(pose, config, 0.65);
    const far = getVehicleHeadlightFootprintCrossSection(pose, config, 1);

    return {
        farCenter: far.center,
        farLeft: far.left,
        farRight: far.right,
        midCenter: mid.center,
        midLeft: mid.left,
        midRight: mid.right,
        nearLeft: near.left,
        nearRight: near.right,
    };
}

export function getVehicleHeadlightFootprintCrossSection(
    pose: VehicleHeadlightScreenPose,
    config: VehicleHeadlightFootprintGuideConfig,
    progress: number,
): VehicleHeadlightFootprintCrossSection {
    const safeProgress = clamp(progress, 0, 1);
    const localY = config.reach * safeProgress;
    const nearHalfWidth = pose.lampHalfSpan + config.nearPadding;
    const halfWidth = lerp(
        nearHalfWidth,
        config.farHalfWidth,
        Math.pow(safeProgress, HEADLIGHT_WIDTH_EXPONENT),
    );
    const swivelBlend = Math.pow(
        smoothstep(HEADLIGHT_SWIVEL_START_PROGRESS, 1, safeProgress),
        HEADLIGHT_SWIVEL_EXPONENT,
    );
    const swivelOffset = Math.tan(degreesToRadians(pose.mainSwivelDeg)) *
        localY * swivelBlend;
    const turnMagnitude = clamp(
        Math.abs(pose.mainSwivelDeg) / HEADLIGHT_MAIN_SWIVEL_MAX_DEG,
        0,
        1,
    );
    const insideExpansion = config.farHalfWidth *
        HEADLIGHT_INSIDE_EDGE_EXPANSION_RATIO * turnMagnitude * swivelBlend;
    const outsideCompensation = Math.abs(swivelOffset);
    const turnsRight = pose.mainSwivelDeg > 0;
    const turnsLeft = pose.mainSwivelDeg < 0;
    const leftHalfWidth = halfWidth + (turnsRight
        ? outsideCompensation
        : turnsLeft ? insideExpansion : 0);
    const rightHalfWidth = halfWidth + (turnsLeft
        ? outsideCompensation
        : turnsRight ? insideExpansion : 0);
    const center = offsetPoint(
        offsetPoint(pose.beamCenter, pose.beamForwardAxis, localY),
        pose.beamLateralAxis,
        swivelOffset,
    );

    return {
        center,
        insideExpansion,
        left: offsetPoint(center, pose.beamLateralAxis, -leftHalfWidth),
        leftHalfWidth,
        progress: safeProgress,
        right: offsetPoint(center, pose.beamLateralAxis, rightHalfWidth),
        rightHalfWidth,
        swivelBlend,
        swivelOffset,
    };
}

type VehicleHeadlightTransform = {
    displaySize: number;
    flipX: boolean;
    mainSwivelDeg: number;
    rotationRadians: number;
    x: number;
    y: number;
};

export function getVehicleHeadlightScreenPose(
    atlas: VehicleAtlas,
    frameId: string,
    transform: VehicleHeadlightTransform,
): VehicleHeadlightScreenPose {
    const frame = atlas.frames[frameId];
    const profileId = getVehicleHeadlightProfileId(atlas, frameId);
    const profile = atlas.apex.headlightProfiles[profileId];

    if (!frame || !profile) {
        throw new Error(`Missing vehicle headlight data for frame: ${frameId}`);
    }

    const lamps = transform.flipX
        ? [profile.lampRight, profile.lampLeft]
        : [profile.lampLeft, profile.lampRight];

    const lampLeft = transformProfilePoint(lamps[0], frame.origin, transform);
    const lampRight = transformProfilePoint(lamps[1], frame.origin, transform);
    const spriteRotationDeg = radiansToDegrees(transform.rotationRadians);
    const frameForwardYawDeg = profile.emitterForwardYawDeg *
        (transform.flipX ? -1 : 1);
    // The large pose yaw is painted into the atlas frame. The small runtime
    // sprite rotation is then applied to both the lamp points and this axis so
    // the emitter and footprint share the exact rendered transform.
    const spriteTransformYawDeg = spriteRotationDeg;
    const baseBeamYawDeg = frameForwardYawDeg + spriteTransformYawDeg;
    const beamYawDeg = baseBeamYawDeg + transform.mainSwivelDeg;
    const beamBasis = getBeamBasis(
        lampLeft,
        lampRight,
        degreesToRadians(baseBeamYawDeg),
    );
    const mainBasis = getBeamBasis(
        lampLeft,
        lampRight,
        degreesToRadians(beamYawDeg),
    );

    return {
        baseBeamYawDeg,
        beamCenter: beamBasis.center,
        beamForwardAxis: beamBasis.forwardAxis,
        beamLateralAxis: beamBasis.lateralAxis,
        beamYawDeg,
        emitter: profile.emitter,
        frameForwardYawDeg,
        frameId,
        footprint: profile.footprint,
        lampLeft,
        lampRight,
        lampHalfSpan: beamBasis.halfSpan,
        mainForwardAxis: mainBasis.forwardAxis,
        mainLateralAxis: mainBasis.lateralAxis,
        mainSwivelDeg: transform.mainSwivelDeg,
        poseAimX: profile.poseAimX * transform.displaySize * (transform.flipX ? -1 : 1),
        profileId,
        spriteRotationDeg,
        spriteTransformYawDeg,
    };
}

function getBeamBasis(
    lampLeft: { x: number; y: number },
    lampRight: { x: number; y: number },
    beamYawRadians: number,
) {
    const spanX = lampRight.x - lampLeft.x;
    const spanY = lampRight.y - lampLeft.y;
    const sine = Math.sin(beamYawRadians);
    const cosine = Math.cos(beamYawRadians);
    const lateralAxis = { x: cosine, y: sine };
    const projectedSpan = Math.abs(spanX * lateralAxis.x + spanY * lateralAxis.y);

    // Screen Y grows downward. HL-REV-6 rotates this entire local basis to the
    // forward direction painted into the atlas frame. HL-REV-3's small optical
    // swivel remains a progressive deformation relative to this base basis.
    return {
        center: {
            x: (lampLeft.x + lampRight.x) * 0.5,
            y: (lampLeft.y + lampRight.y) * 0.5,
        },
        forwardAxis: {
            x: sine,
            y: -cosine,
        },
        halfSpan: projectedSpan * 0.5,
        lateralAxis,
    };
}

function degreesToRadians(degrees: number) {
    return degrees * Math.PI / 180;
}

function radiansToDegrees(radians: number) {
    return radians * 180 / Math.PI;
}

function offsetPoint(
    point: { x: number; y: number },
    axis: { x: number; y: number },
    distance: number,
) {
    return {
        x: point.x + axis.x * distance,
        y: point.y + axis.y * distance,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
    return from + (to - from) * amount;
}

function smoothstep(edge0: number, edge1: number, value: number) {
    const ratio = clamp((value - edge0) / (edge1 - edge0), 0, 1);

    return ratio * ratio * (3 - 2 * ratio);
}

function getVehicleHeadlightProfileId(atlas: VehicleAtlas, frameId: string) {
    if (atlas.apex.headlightProfiles[frameId]) return frameId;
    if (frameId.endsWith('right-1')) return 'steer-right-1';
    if (frameId.endsWith('right-2')) return 'steer-right-2';

    return 'center';
}

function transformProfilePoint(
    point: { x: number; y: number },
    origin: { x: number; y: number },
    transform: VehicleHeadlightTransform,
) {
    const localX = (point.x - origin.x) * transform.displaySize *
        (transform.flipX ? -1 : 1);
    const localY = (point.y - origin.y) * transform.displaySize;
    const cosine = Math.cos(transform.rotationRadians);
    const sine = Math.sin(transform.rotationRadians);

    return {
        x: transform.x + localX * cosine - localY * sine,
        y: transform.y + localX * sine + localY * cosine,
    };
}
