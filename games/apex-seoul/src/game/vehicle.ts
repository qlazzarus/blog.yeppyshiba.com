import Phaser from 'phaser';
import type { Viewport } from './pseudo3dCamera';
import type { RuntimeTuning } from './runtimeConfig';

export type PlayerSteeringStateId =
    | 'center'
    | 'steer-left-1'
    | 'steer-left-2'
    | 'steer-right-1'
    | 'steer-right-2';

export type VehicleAtlasFrame = {
    frame: {
        h: number;
        w: number;
        x: number;
        y: number;
    };
    origin: {
        x: number;
        y: number;
    };
};

export type VehicleShadowElement = {
    alpha: number;
    h: number;
    w: number;
    x: number;
    y: number;
};

export type VehicleShadowProfile = {
    chassis: VehicleShadowElement;
    tireContacts: VehicleShadowElement[];
};

export type VehicleHeadlightFootprintProfile = {
    farHalfWidthRatio: number;
    nearPaddingPx: number;
    reachRatio: number;
};

export type VehicleHeadlightOpticalProfile = {
    cornerFillIntensity: number;
    cornerFillReachScale: number;
    cornerFillYawDeg: number;
    mainSwivelDeg: number;
};

export type VehicleHeadlightEmitterProfile = {
    farLampIntensity: number;
    farLampReachScale: number;
    lobeWidthScale: number;
    mergeStartRatio: number;
};

export type VehicleHeadlightProfile = {
    emitter: VehicleHeadlightEmitterProfile;
    emitterForwardYawDeg: number;
    footprint: VehicleHeadlightFootprintProfile;
    lampLeft: {
        x: number;
        y: number;
    };
    lampRight: {
        x: number;
        y: number;
    };
    optical: VehicleHeadlightOpticalProfile;
    poseAimX: number;
};

export type VehicleAtlas = {
    apex: {
        headlightProfiles: Record<string, VehicleHeadlightProfile>;
        shadowProfiles: Record<string, VehicleShadowProfile>;
        steeringStates: Record<PlayerSteeringStateId, {
            flipX: boolean;
            frame: string;
        }>;
        targetCellSize: number;
    };
    frames: Record<string, VehicleAtlasFrame>;
};

export type VehicleTerrainCue = 'downhill' | 'level' | 'uphill';

export type PlayerDriftState = 'grip' | 'setup' | 'drift' | 'recovery';
export type PlayerDriftEntryMode = 'none' | 'brake' | 'lift';
export type PlayerCornerGrade = 'straight' | 'easy' | 'medium' | 'sharp';
export type PlayerCornerSpeedLossZone = 'within-budget' | 'overspeed' | 'severe-overspeed';

export type PlayerCornerDemandSample = {
    baseTargetSpeed: number;
    cornerIntensity: number;
    downhillCarryRatio: number;
    grade: PlayerCornerGrade;
    lateralDemand: number;
    lineQuality: number;
    lineSpeedAdjustment: number;
    overspeedRatio: number;
    safetyMarginRatio: number;
    severeOverspeedRatio: number;
    speedOverBudget: number;
    speedLossZone: PlayerCornerSpeedLossZone;
    speedRatioToBudget: number;
    targetSpeed: number;
};

export type PlayerCornerSpeedLossSample = {
    counterRoadScrubForce: number;
    downhillScrubForce: number;
    lineSafetyScrubForce: number;
    overspeedTireScrubForce: number;
    severeOverspeedScrubForce: number;
    steeringScrubForce: number;
    totalForce: number;
    zone: PlayerCornerSpeedLossZone;
};

export type PlayerSpeedHandlingState = {
    centeringScale: number;
    gripAngleCap: number;
    inputResponseScale: number;
    lateralAuthority: number;
    lateralVelocityCap: number;
    neutralReturnVelocityCap: number;
    speedRatio: number;
    steeringForceScale: number;
    steeringSlewRate: number;
    visualAuthority: number;
    visualYawScale: number;
};

export type PlayerVehicleState = {
    brakePressure: number;
    boostRatio: number;
    cornerDemand: PlayerCornerDemandSample;
    cornerSpeedLoss: PlayerCornerSpeedLossSample;
    counterSteerTimer: number;
    counterSteerLateralVelocity: number;
    counterSteerEntryDriftVelocity: number;
    counterTrimRatio: number;
    engineTorqueScale: number;
    driftDirection: -1 | 0 | 1;
    driftBaseLateralVelocity: number;
    driftEntryLateralTarget: number;
    driftEntryMode: PlayerDriftEntryMode;
    driftExitThrottleDelay: number;
    driftLateralVelocity: number;
    driftRatio: number;
    driftState: PlayerDriftState;
    driftStateTimer: number;
    driftThrottleLiftTimer: number;
    driftTransitionArmed: boolean;
    driftTransitionDirection: -1 | 0 | 1;
    driftTransitionAwaitingCounter: boolean;
    driftTransitionLiftTimer: number;
    fuelCutActive: boolean;
    fuelCutTimer: number;
    gearIndex: number;
    guardrailBounceVelocity: number;
    guardrailContactInset: number;
    guardrailContactDirection: -1 | 0 | 1;
    guardrailContactTimer: number;
    guardrailImpactCount: number;
    guardrailImpactCue: number;
    guardrailShoulderRatio: number;
    gripCounterRoadLateralVelocity: number;
    gripCounterRoadRatio: number;
    gripSteerAngleLimit: number;
    lateralOffset: number;
    lowSpeedLateralAuthority: number;
    lowSpeedVisualSteeringAuthority: number;
    centeringCounterHoldTimer: number;
    centeringForce: number;
    centeringReleaseStartScale: number;
    centeringReleaseTimer: number;
    lateralCenteringScale: number;
    lateralCenteringTargetScale: number;
    overspeedUndersteerRatio: number;
    overspeedUndersteerTargetRatio: number;
    overspeedUndersteerLateralVelocity: number;
    rpm: number;
    shiftCutRatio: number;
    shiftDirection: -1 | 0 | 1;
    shiftTimer: number;
    speed: number;
    speedHandling: PlayerSpeedHandlingState;
    slipAngle: number;
    steering: number;
    steeringVelocity: number;
    torqueScale: number;
    traction: number;
    throttleWasPressed: boolean;
};

export type VehicleAnchor = {
    contactElevationDelta: number;
    contactTerrainRatio: number;
    contactTerrainCue: VehicleTerrainCue;
    elevationDelta: number;
    roadCenterOffset: number;
    scale: number;
    terrainCue: VehicleTerrainCue;
    x: number;
    y: number;
};

export type RuntimeVehicleQaState = {
    anchor: VehicleAnchor;
    displaySize: number;
    flipX: boolean;
    frame: string;
    rotationDeg: number;
    roadWidthAtVehicleY: number | null;
    roadRelativeScale: number;
    roadRelativeTargetSize: number;
    sizeDeltaPerSec: number;
    terrainScale: number;
    vehicleBodyWidth: number;
    vehicleRoadRatio: number | null;
    physicalSteering: number;
    lowSpeedVisualSteeringAuthority: number;
    visualSteering: number;
    visualSteeringThreshold: number;
};

export function selectPlayerVehicleFrame(
    atlas: VehicleAtlas,
    tuning: RuntimeTuning,
    steering: number,
    terrainCue: VehicleTerrainCue,
    steeringThreshold = tuning.steerWeakThreshold,
) {
    const steeringState = selectPlayerSteeringState(steering, steeringThreshold);
    const fallback = atlas.apex.steeringStates[steeringState];

    if (terrainCue === 'level') return fallback;

    const frameId = getTerrainFrameId(steeringState, terrainCue);

    if (!frameId || !atlas.frames[frameId]) return fallback;

    return {
        flipX: steeringState.startsWith('steer-left'),
        frame: frameId,
    };
}

export function selectVehicleTerrainCue(tuning: RuntimeTuning, elevationDelta: number): VehicleTerrainCue {
    if (elevationDelta <= -tuning.terrainCueThreshold) return 'downhill';
    if (elevationDelta >= tuning.terrainCueThreshold) return 'uphill';

    return 'level';
}

export function selectContactTerrainCue(tuning: RuntimeTuning, elevationDelta: number): VehicleTerrainCue {
    const threshold = tuning.playerContactTerrainCueThreshold;

    if (elevationDelta <= -threshold) return 'downhill';
    if (elevationDelta >= threshold) return 'uphill';

    return 'level';
}

export function getContactTerrainRatio(tuning: RuntimeTuning, elevationDelta: number) {
    return Phaser.Math.Clamp(
        elevationDelta / tuning.playerContactTerrainCueThreshold,
        -1,
        1,
    );
}

export function getScreenContactVehicleY(
    fixedAnchorY: number,
    elevationDelta: number,
    contactTerrainRatio: number,
    maxTerrainScreenYShift: number,
) {
    const cueIntensity = getContactTerrainCueIntensity(contactTerrainRatio);
    const elevationIntensity = Phaser.Math.Clamp(Math.abs(elevationDelta) / 72, 0, 1);
    const intensity = Math.max(cueIntensity, elevationIntensity * 0.7);
    const smoothIntensity = intensity * intensity * (3 - 2 * intensity);
    const direction = contactTerrainRatio < 0
        ? 1
        : contactTerrainRatio > 0
            ? -0.65
            : 0;

    return fixedAnchorY + direction * maxTerrainScreenYShift * smoothIntensity;
}

export function getContactTerrainCueIntensity(contactTerrainRatio: number) {
    const deadZone = 0.25;
    const rawIntensity = Phaser.Math.Clamp(
        (Math.abs(contactTerrainRatio) - deadZone) / (1 - deadZone),
        0,
        1,
    );

    return rawIntensity * rawIntensity * (3 - 2 * rawIntensity);
}

export function getVehicleShadowProfile(atlas: VehicleAtlas, frameId: string) {
    return atlas.apex.shadowProfiles[frameId] ??
        atlas.apex.shadowProfiles.default;
}

export function getShadowElementCenter(
    element: VehicleShadowElement,
    frame: VehicleAtlasFrame,
    anchor: VehicleAnchor,
    displaySize: number,
    flipX: boolean,
    terrainIntensity: number,
) {
    const xOffset = (element.x - frame.origin.x) * displaySize;
    const yOffset = (element.y - frame.origin.y) * displaySize;
    const terrainY = displaySize * Phaser.Math.Linear(0.002, 0.008, terrainIntensity);

    return {
        x: anchor.x + (flipX ? -xOffset : xOffset),
        y: anchor.y + yOffset + terrainY,
    };
}

export function getSilhouetteShadowScale(contactTerrainRatio: number, speedRatio: number) {
    const terrainIntensity = getContactTerrainCueIntensity(contactTerrainRatio);
    const speedStretch = Phaser.Math.Linear(1.02, 1.1, speedRatio);
    const downhillStretch = contactTerrainRatio < 0
        ? Phaser.Math.Linear(1, 1.08, terrainIntensity)
        : 1;
    const uphillStretch = contactTerrainRatio > 0
        ? Phaser.Math.Linear(1, 0.96, terrainIntensity)
        : 1;
    const squash = contactTerrainRatio < 0
        ? Phaser.Math.Linear(0.42, 0.34, terrainIntensity)
        : Phaser.Math.Linear(0.42, 0.46, terrainIntensity);

    return {
        x: speedStretch * downhillStretch * uphillStretch,
        y: squash,
    };
}

export function drawShadowContactPatch(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
) {
    const clampedHeight = Math.max(2, height);

    graphics.fillRoundedRect(
        centerX - width / 2,
        centerY - clampedHeight / 2,
        width,
        clampedHeight,
        Math.min(clampedHeight / 2, width * 0.18),
    );
}

export function getPlayerVehicleSpriteSize(viewport: Viewport, tuning: RuntimeTuning) {
    return Phaser.Math.Clamp(
        viewport.width * tuning.vehicleViewportRatio,
        tuning.vehicleMinSize,
        tuning.vehicleMaxSize,
    );
}

export function getTerrainScaledSpriteSize(baseSize: number, anchor: VehicleAnchor, tuning: RuntimeTuning) {
    return baseSize * getTerrainScaleMultiplier(anchor, tuning);
}

export function getTerrainScaleMultiplier(anchor: VehicleAnchor, tuning: RuntimeTuning) {
    const intensity = tuning.terrainScaleIntensity;
    const elevationRatio = Phaser.Math.Clamp(Math.abs(anchor.elevationDelta) / 260, 0, 1);
    const smoothRatio = elevationRatio * elevationRatio * (3 - 2 * elevationRatio);

    if (anchor.terrainCue === 'downhill') return 1 - intensity * smoothRatio;
    if (anchor.terrainCue === 'uphill') return 1 + intensity * 0.8 * smoothRatio;

    return 1;
}

export function getVehicleFrameIndex(atlas: VehicleAtlas, frameId: string) {
    const frame = atlas.frames[frameId]?.frame;
    const cellSize = atlas.apex.targetCellSize;

    if (!frame) {
        throw new Error(`Unknown player vehicle frame: ${frameId}`);
    }

    return (frame.y / cellSize) * 3 + frame.x / cellSize;
}

function selectPlayerSteeringState(steering: number, threshold: number): PlayerSteeringStateId {
    const strongThreshold = threshold + (1 - threshold) * 0.62;

    if (steering <= -strongThreshold) return 'steer-left-2';
    if (steering >= strongThreshold) return 'steer-right-2';
    if (steering <= -threshold) return 'steer-left-1';
    if (steering >= threshold) return 'steer-right-1';

    return 'center';
}

function getTerrainFrameId(steeringState: PlayerSteeringStateId, terrainCue: Exclude<VehicleTerrainCue, 'level'>) {
    if (steeringState === 'center') return `${terrainCue}-center`;
    if (steeringState.endsWith('-1')) return `${terrainCue}-right-1`;
    if (steeringState.endsWith('-2')) return `${terrainCue}-right-2`;

    return null;
}
