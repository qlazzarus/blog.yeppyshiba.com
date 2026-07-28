import type { LaunchControlConfig, LaunchControlState } from './launchControl';
import type { RuntimeTuning } from './runtimeConfig';
import {
    getContactTerrainRatio,
    getScreenContactVehicleY,
    selectContactTerrainCue,
    selectPlayerVehicleFrame,
    selectVehicleTerrainCue,
    type PlayerDriftState,
    type VehicleAnchor,
    type VehicleAtlas,
    type VehicleTerrainCue,
} from './vehicle';
import {
    getRoadRelativeVehicleTargetSize,
    getVehicleScaleRoadWidth,
    updateRoadRelativeVehicleSize,
    type VehicleRoadScaleConfig,
} from './vehicleRoadScale';

export type PlayerPresentationAnchor = { x: number; y: number };

export type PlayerPosePresentation = {
    flipX: boolean;
    frameId: string;
    rotationRadians: number;
};

export function getPlayerPosePresentation(input: {
    atlas: VehicleAtlas;
    driftState: PlayerDriftState;
    terrainCue: VehicleTerrainCue;
    tuning: Pick<RuntimeTuning, 'vehicleRotationDeg'>;
    visualSteering: { rotationValue: number; threshold: number; value: number };
}) : PlayerPosePresentation {
    const frame = selectPlayerVehicleFrame(
        input.atlas,
        input.tuning as RuntimeTuning,
        input.visualSteering.value,
        input.terrainCue,
        input.visualSteering.threshold,
        input.driftState !== 'grip',
    );

    return {
        flipX: frame.flipX,
        frameId: frame.frame,
        rotationRadians: input.visualSteering.rotationValue * input.tuning.vehicleRotationDeg * Math.PI / 180,
    };
}

export type LaunchBurnoutPresentation = {
    dust: Array<{ alpha: number; radius: number; x: number; y: number }>;
    skidAlpha: number;
    skidLength: number;
    tireXs: [number, number];
    y: number;
};

export function getPlayerShadowPresentation(input: {
    anchorScale: number;
    bodyYawValue: number;
    chassisCenter: { x: number; y: number };
    displaySize: number;
    driftRatio: number;
    shadowAlpha: { max: number; silhouette: number; soft: number };
    silhouetteScale: { x: number; y: number };
    slipAngle: number;
    vehicleRotationDeg: number;
    visualRotationValue: number;
    shake: { x: number; y: number };
}) {
    const intensity = clamp(input.anchorScale * 13, 0, 1.08);
    const steeringOffset = input.bodyYawValue * input.displaySize * 0.018;
    const driftScale = 1 + input.driftRatio * 0.18;
    const rotation = input.visualRotationValue * input.vehicleRotationDeg;

    return {
        contactPatch: {
            alpha: input.shadowAlpha.max * clamp(input.anchorScale * 13, 0.7, 1) * 0.16,
            height: input.displaySize * 0.34,
            width: input.displaySize * 0.72,
            x: input.chassisCenter.x + steeringOffset,
            y: input.chassisCenter.y - input.displaySize * 0.018,
        },
        silhouette: {
            alpha: input.shadowAlpha.silhouette * clamp(intensity, 0.76, 1.08),
            height: input.displaySize * input.silhouetteScale.y,
            rotationRadians: (rotation * 0.35 + input.slipAngle * 0.45) * Math.PI / 180,
            width: input.displaySize * input.silhouetteScale.x * driftScale,
            x: input.chassisCenter.x + steeringOffset + input.shake.x,
            y: input.chassisCenter.y - input.displaySize * 0.032 + input.shake.y,
        },
        soft: {
            alpha: input.shadowAlpha.soft * clamp(intensity, 0.66, 1),
            height: input.displaySize * input.silhouetteScale.y * 1.26,
            rotationRadians: (rotation * 0.22 + input.slipAngle * 0.32) * Math.PI / 180,
            width: input.displaySize * input.silhouetteScale.x * 1.16 * driftScale,
            x: input.chassisCenter.x + steeringOffset * 0.65 + input.shake.x,
            y: input.chassisCenter.y - input.displaySize * 0.022 + input.shake.y,
        },
    };
}

export function getRoadRelativeSizePresentation(input: {
    baseSize: number;
    currentSize: number | null;
    defaultRoadHalfWidth: number;
    elapsedSec: number;
    lastSampleElapsedSec: number | null;
    roadHalfWidth: number;
    roadWidthAtVehicleY: number | null;
    scaleConfig: VehicleRoadScaleConfig;
}) {
    const roadWidthForScale = getVehicleScaleRoadWidth(
        input.roadWidthAtVehicleY,
        input.roadHalfWidth,
        input.defaultRoadHalfWidth,
    );
    const targetSize = getRoadRelativeVehicleTargetSize(
        input.baseSize,
        roadWidthForScale,
        input.scaleConfig,
    );
    const seconds = input.lastSampleElapsedSec === null
        ? 0
        : input.elapsedSec - input.lastSampleElapsedSec;
    const size = updateRoadRelativeVehicleSize(
        input.currentSize ?? input.baseSize,
        targetSize,
        input.baseSize,
        seconds,
        input.scaleConfig,
    );

    return { size, targetSize };
}

export function getPlayerAnchorPresentation(input: {
    contactElevationDelta: number;
    contactRoadCenterOffset: number;
    curveScreenBias: number;
    elevationDelta: number;
    maxTerrainScreenYShift: number;
    projection: { scale: number; visible: boolean; x: number };
    tuning: RuntimeTuning;
    viewport: { height: number; width: number };
}): VehicleAnchor {
    const contactTerrainRatio = getContactTerrainRatio(input.tuning, input.contactElevationDelta);
    const fixedY = input.viewport.height * input.tuning.playerScreenAnchorRatio;
    const visible = input.projection.visible;

    return {
        contactElevationDelta: input.contactElevationDelta,
        contactTerrainRatio,
        contactTerrainCue: selectContactTerrainCue(input.tuning, input.contactElevationDelta),
        elevationDelta: input.elevationDelta,
        roadCenterOffset: input.contactRoadCenterOffset,
        scale: input.projection.scale,
        terrainCue: selectVehicleTerrainCue(input.tuning, input.elevationDelta),
        x: visible ? input.projection.x + input.curveScreenBias : input.viewport.width / 2,
        y: visible ? clamp(
            getScreenContactVehicleY(
                fixedY,
                input.contactElevationDelta,
                contactTerrainRatio,
                input.maxTerrainScreenYShift,
            ),
            input.viewport.height * 0.8,
            input.viewport.height * 0.95,
        ) : fixedY,
    };
}

export type UndersteerTireCueLine = {
    alpha: number;
    color: number;
    endX: number;
    endY: number;
    startX: number;
    startY: number;
    width: number;
};

export function getUndersteerTireCuePresentation(input: {
    anchor: PlayerPresentationAnchor;
    cue: number;
    curveDirection: number;
    displaySize: number;
    driftState: PlayerDriftState;
    elapsedSec: number;
    shake: { x: number; y: number };
}): UndersteerTireCueLine[] {
    if (input.driftState !== 'grip' || input.cue < 0.02 || input.curveDirection === 0) return [];

    const outward = -Math.sign(input.curveDirection);
    const centerX = input.anchor.x + input.shake.x;
    const y = input.anchor.y + input.shake.y + input.displaySize * 0.015;
    const length = input.displaySize * lerp(0.035, 0.075, input.cue);
    const skew = outward * input.displaySize * lerp(0.012, 0.03, input.cue);
    const pulse = 0.82 + Math.sin(input.elapsedSec * 42) * 0.08;

    return ([-1, 1] as const).flatMap((side) => {
        const outer = side === outward;
        const alpha = input.cue * pulse * (outer ? 0.64 : 0.38);
        const x = centerX + side * input.displaySize * 0.18;
        return [
            { alpha, color: outer ? 0xa9c7d8 : 0x7893a3, endX: x + skew, endY: y + length, startX: x, startY: y, width: Math.max(1, input.displaySize * 0.006) },
            { alpha: alpha * 0.52, color: 0xd1e3ea, endX: x + skew * 0.72, endY: y + length * 0.72, startX: x - outward * input.displaySize * 0.012, startY: y + input.displaySize * 0.012, width: Math.max(1, input.displaySize * 0.004) },
        ];
    });
}

/** Pure geometry for the launch cue; Phaser only draws this returned contract. */
export function getLaunchBurnoutPresentation(input: {
    anchor: PlayerPresentationAnchor;
    config: Pick<LaunchControlConfig, 'burnoutDurationSec'>;
    displaySize: number;
    elapsedSec: number;
    launch: Pick<LaunchControlState, 'burnoutRemainingSec' | 'quality'>;
    shake: { x: number; y: number };
}): LaunchBurnoutPresentation | null {
    const { launch } = input;
    const duration = launch.quality === 'hooked'
        ? input.config.burnoutDurationSec.hooked
        : launch.quality === 'overrev' ? input.config.burnoutDurationSec.overrev : 0;
    if (launch.burnoutRemainingSec <= 0 || duration <= 0) return null;

    const elapsedRatio = clamp(1 - launch.burnoutRemainingSec / duration, 0, 1);
    const fadeRatio = 1 - elapsedRatio;
    const centerX = input.anchor.x + input.shake.x;
    const y = input.anchor.y + input.shake.y + input.displaySize * 0.105;
    // Keep the smoke readable after the tire has bitten, then clear it in the
    // final 35% rather than fading from the first frame.
    const dustFadeRatio = 1 - clamp((elapsedRatio - 0.65) / 0.35, 0, 1);
    const dustAlpha = dustFadeRatio * (launch.quality === 'overrev' ? 0.42 : 0.34);
    const dustDistance = input.displaySize * lerp(0.04, 0.28, elapsedRatio);
    const dustRadius = input.displaySize * lerp(0.022, 0.052, elapsedRatio);
    const offsets = [-0.3, -0.13, 0.12, 0.29];

    return {
        dust: offsets.map((offset, index) => ({
            alpha: dustAlpha * lerp(0.75, 1, index / (offsets.length - 1)),
            radius: dustRadius * lerp(0.72, 1.12, index / (offsets.length - 1)),
            x: centerX + offset * input.displaySize * lerp(0.35, 0.9, elapsedRatio),
            y: y - dustDistance + Math.sin(elapsedRatio * 5.5 + index * 1.7) * input.displaySize * 0.008,
        })),
        skidAlpha: fadeRatio * (launch.quality === 'overrev' ? 0.7 : 0.58),
        skidLength: input.displaySize * lerp(0.045, 0.115, elapsedRatio),
        tireXs: [centerX - input.displaySize * 0.18, centerX + input.displaySize * 0.18],
        y,
    };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function lerp(start: number, end: number, ratio: number) { return start + (end - start) * ratio; }
