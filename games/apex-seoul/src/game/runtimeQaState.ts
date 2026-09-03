import type { VehicleEngineProfile } from './engineProfile';
import type { GuardrailScreenProjection } from './guardrailScreenProjection';
import type { LaunchControlState } from './launchControl';
import { getLaunchRuntimeQaState } from './launchRuntimeQa';
import type { Pseudo3dCamera } from './pseudo3dCamera';
import type { CourseRunState } from './courseRun';
import type { RoadTrack } from './road';
import type { RuntimeQaOverrides } from './runtimeConfig';
import type { PlayerVehicleState } from './vehicle';
import type { VehicleHeadlightEmitterState, VehicleHeadlightOpticalState, VehicleHeadlightScreenPose } from './vehicleHeadlight';

export function roundRuntimeQaValue(value: number, digits: number) {
    return Number(value.toFixed(digits));
}

export function serializeRuntimeQaCamera(input: {
    camera: Pseudo3dCamera;
    fovCueDegrees: number;
    manualPitch: number;
    shake: { x: number; y: number };
    terrainPitch: number;
}) {
    const { camera } = input;

    return {
        fovDegrees: camera.fovDegrees,
        fovCueDegrees: roundRuntimeQaValue(input.fovCueDegrees, 4),
        height: camera.height,
        horizonRatio: camera.horizonRatio,
        lateralOffset: camera.lateralOffset,
        manualPitch: input.manualPitch,
        pitch: camera.pitch,
        terrainPitch: input.terrainPitch,
        shake: {
            x: roundRuntimeQaValue(input.shake.x, 3),
            y: roundRuntimeQaValue(input.shake.y, 3),
        },
        z: camera.z,
    };
}

export function serializeRuntimeQaHeadlight(input: {
    aimTargetX: number;
    aimX: number;
    curveIntent: number;
    curveIntentTarget: number;
    emitterState: VehicleHeadlightEmitterState | null;
    fineAimX: number;
    frameId: string;
    framePoseAimX: number;
    lampPose: VehicleHeadlightScreenPose | null;
    opticalState: VehicleHeadlightOpticalState;
    profileId: string;
    rawRoadAimX: number;
    roadAssistAimX: number;
    roadTangent: unknown | null;
}) {
    return {
        aimTargetX: roundRuntimeQaValue(input.aimTargetX, 3),
        aimX: roundRuntimeQaValue(input.aimX, 3),
        cornerFillIntensity: roundRuntimeQaValue(input.opticalState.cornerFillIntensity, 4),
        cornerFillReachScale: roundRuntimeQaValue(input.opticalState.cornerFillReachScale, 4),
        cornerFillWeight: roundRuntimeQaValue(input.opticalState.cornerFillWeight, 4),
        cornerFillYawDeg: roundRuntimeQaValue(input.opticalState.cornerFillYawDeg, 3),
        curveIntent: roundRuntimeQaValue(input.curveIntent, 4),
        curveIntentTarget: roundRuntimeQaValue(input.curveIntentTarget, 4),
        fineAimX: roundRuntimeQaValue(input.fineAimX, 3),
        frameId: input.frameId,
        framePoseAimX: roundRuntimeQaValue(input.framePoseAimX, 3),
        emitterState: input.emitterState,
        lampPose: input.lampPose,
        mainSwivelDeg: roundRuntimeQaValue(input.opticalState.mainSwivelDeg, 3),
        profileId: input.profileId,
        rawRoadAimX: roundRuntimeQaValue(input.rawRoadAimX, 3),
        roadAssistAimX: roundRuntimeQaValue(input.roadAssistAimX, 3),
        roadTangent: input.roadTangent,
    };
}

export function serializeRuntimeQaGuardrailScreen(
    projection: GuardrailScreenProjection | null,
) {
    return projection
        ? Object.fromEntries(Object.entries(projection).map(([key, value]) => [
            key,
            roundRuntimeQaValue(value, 4),
        ]))
        : null;
}

export function serializeRuntimeQaLaunch(state: LaunchControlState) {
    return getLaunchRuntimeQaState(state);
}

export function serializeRuntimeQaLongitudinal(input: {
    config: Record<string, unknown>;
    defaultRoadHalfWidth: number;
    physicalSpeed: number;
    roadSegmentLength: number;
    worldTravelSpeed: number;
}) {
    return {
        ...input.config,
        defaultRoadWidthsPerSec: roundRuntimeQaValue(
            input.worldTravelSpeed / (input.defaultRoadHalfWidth * 2),
            4,
        ),
        physicalSpeed: roundRuntimeQaValue(input.physicalSpeed, 4),
        segmentsPerSec: roundRuntimeQaValue(input.worldTravelSpeed / input.roadSegmentLength, 4),
        worldTravelSpeed: roundRuntimeQaValue(input.worldTravelSpeed, 4),
    };
}

export function serializeRuntimeQaPhysicsRoad(input: {
    baseRenderCurve: number;
    cameraZ: number;
    contactZ: number;
    currentCurve: number;
    pavedHalfWidth: number;
    railCenterLimit: number;
}) {
    return {
        baseRenderCurve: roundRuntimeQaValue(input.baseRenderCurve, 4),
        cameraZ: roundRuntimeQaValue(input.cameraZ, 3),
        contactZ: roundRuntimeQaValue(input.contactZ, 3),
        currentCurve: roundRuntimeQaValue(input.currentCurve, 4),
        pavedHalfWidth: roundRuntimeQaValue(input.pavedHalfWidth, 3),
        railCenterLimit: roundRuntimeQaValue(input.railCenterLimit, 3),
    };
}

export function serializeRuntimeQaRun(state: CourseRunState) {
    return {
        ...state,
        finishTimeSec: state.finishTimeSec === null ? null : roundRuntimeQaValue(state.finishTimeSec, 3),
        elapsedSec: roundRuntimeQaValue(state.elapsedSec, 3),
        progressRatio: roundRuntimeQaValue(state.progressRatio, 4),
    };
}

export function serializeRuntimeQaSpeedEffect(input: {
    base: number;
    downhill: number;
    driftExitBurst: number;
    driftFlow: number;
    expectedPeakAlpha: number;
    intensity: number;
    throttleBurst: number;
    time: number;
}) {
    return {
        base: roundRuntimeQaValue(input.base, 4),
        downhill: roundRuntimeQaValue(input.downhill, 4),
        driftExitBurst: roundRuntimeQaValue(input.driftExitBurst, 4),
        driftFlow: roundRuntimeQaValue(input.driftFlow, 4),
        expectedPeakAlpha: roundRuntimeQaValue(input.expectedPeakAlpha, 4),
        intensity: roundRuntimeQaValue(input.intensity, 4),
        throttleBurst: roundRuntimeQaValue(input.throttleBurst, 4),
        time: roundRuntimeQaValue(input.time, 3),
    };
}

export function serializeRuntimeQaTrack(track: RoadTrack) {
    return {
        id: track.id,
        length: track.length,
        name: track.name,
        segments: track.segments.length,
    };
}

export function serializeRuntimeQaVehicle(input: {
    asset: string;
    color: string;
    engineProfile: VehicleEngineProfile;
    state: Record<string, unknown>;
}) {
    const { engineProfile } = input;

    return {
        ...input.state,
        asset: input.asset,
        color: input.color,
        engine: {
            accelerationScale: engineProfile.accelerationScale,
            displayName: engineProfile.displayName,
            displayTopSpeedKmh: engineProfile.displayTopSpeedKmh,
            fuelCutStartRpm: engineProfile.fuelCutStartRpm,
            id: engineProfile.id,
            induction: engineProfile.induction,
            maxRpm: engineProfile.maxRpm,
            redlineStartRpm: engineProfile.redlineStartRpm,
        },
    };
}

export function serializeRuntimeQaPlayerCornerDemand(
    demand: PlayerVehicleState['cornerDemand'],
    targetSpeedKmh: number,
) {
    return {
        baseTargetSpeed: roundRuntimeQaValue(demand.baseTargetSpeed, 3),
        cornerIntensity: roundRuntimeQaValue(demand.cornerIntensity, 4),
        downhillCarryRatio: roundRuntimeQaValue(demand.downhillCarryRatio, 4),
        grade: demand.grade,
        lateralDemand: roundRuntimeQaValue(demand.lateralDemand, 4),
        lineQuality: roundRuntimeQaValue(demand.lineQuality, 4),
        lineSpeedAdjustment: roundRuntimeQaValue(demand.lineSpeedAdjustment, 3),
        overspeedRatio: roundRuntimeQaValue(demand.overspeedRatio, 4),
        safetyMarginRatio: roundRuntimeQaValue(demand.safetyMarginRatio, 4),
        severeOverspeedRatio: roundRuntimeQaValue(demand.severeOverspeedRatio, 4),
        speedOverBudget: roundRuntimeQaValue(demand.speedOverBudget, 3),
        speedLossZone: demand.speedLossZone,
        speedRatioToBudget: roundRuntimeQaValue(demand.speedRatioToBudget, 4),
        targetSpeed: roundRuntimeQaValue(demand.targetSpeed, 3),
        targetSpeedKmh: roundRuntimeQaValue(targetSpeedKmh, 1),
    };
}

export function serializeRuntimeQaPlayerCornerSpeedLoss(
    loss: PlayerVehicleState['cornerSpeedLoss'],
) {
    return {
        counterRoadScrubForce: roundRuntimeQaValue(loss.counterRoadScrubForce, 3),
        downhillScrubForce: roundRuntimeQaValue(loss.downhillScrubForce, 3),
        lineSafetyScrubForce: roundRuntimeQaValue(loss.lineSafetyScrubForce, 3),
        overspeedTireScrubForce: roundRuntimeQaValue(loss.overspeedTireScrubForce, 3),
        severeOverspeedScrubForce: roundRuntimeQaValue(loss.severeOverspeedScrubForce, 3),
        steeringScrubForce: roundRuntimeQaValue(loss.steeringScrubForce, 3),
        totalForce: roundRuntimeQaValue(loss.totalForce, 3),
        trajectoryScrubRatio: roundRuntimeQaValue(loss.trajectoryScrubRatio, 4),
        zone: loss.zone,
    };
}

export function serializeRuntimeQaPlayerSpeedHandling(
    handling: PlayerVehicleState['speedHandling'],
) {
    return {
        centeringScale: roundRuntimeQaValue(handling.centeringScale, 4),
        gripAngleCap: roundRuntimeQaValue(handling.gripAngleCap, 4),
        inputResponseScale: roundRuntimeQaValue(handling.inputResponseScale, 4),
        lateralAuthority: roundRuntimeQaValue(handling.lateralAuthority, 4),
        lateralVelocityCap: roundRuntimeQaValue(handling.lateralVelocityCap, 3),
        neutralReturnVelocityCap: roundRuntimeQaValue(handling.neutralReturnVelocityCap, 3),
        steeringForceScale: roundRuntimeQaValue(handling.steeringForceScale, 4),
        steeringSlewRate: roundRuntimeQaValue(handling.steeringSlewRate, 3),
        visualAuthority: roundRuntimeQaValue(handling.visualAuthority, 4),
        visualYawScale: roundRuntimeQaValue(handling.visualYawScale, 4),
    };
}

/**
 * Scene-specific samples (road limits, slope and display speed) are calculated
 * at the Phaser boundary. The emitted player contract is owned here so callers
 * cannot accidentally expose the mutable vehicle state object as telemetry.
 */
export function serializeRuntimeQaPlayer<T extends Record<string, unknown>>(snapshot: T): T {
    return {
        ...snapshot,
        cornerDemand: snapshot.cornerDemand && typeof snapshot.cornerDemand === 'object'
            ? { ...(snapshot.cornerDemand as Record<string, unknown>) }
            : snapshot.cornerDemand,
        cornerSpeedLoss: snapshot.cornerSpeedLoss && typeof snapshot.cornerSpeedLoss === 'object'
            ? { ...(snapshot.cornerSpeedLoss as Record<string, unknown>) }
            : snapshot.cornerSpeedLoss,
        speedHandling: snapshot.speedHandling && typeof snapshot.speedHandling === 'object'
            ? { ...(snapshot.speedHandling as Record<string, unknown>) }
            : snapshot.speedHandling,
    } as T;
}

/**
 * The URL is parsed and range-checked by runtimeConfig.ts. This adapter owns
 * only the state mutation, so browser/fixture callers share the same contract.
 */
export function applyRuntimeQaOverridesToState(input: {
    camera: Pick<Pseudo3dCamera, 'z'>;
    normalizeZ: (z: number) => number;
    overrides: RuntimeQaOverrides;
    player: Pick<PlayerVehicleState, 'lateralOffset' | 'physicalSteeringCommand' | 'speed' | 'steering' | 'steeringVelocity'>;
}) {
    const { overrides, player } = input;
    if (!overrides.enabled) return;

    if (overrides.z !== null) input.camera.z = input.normalizeZ(overrides.z);
    if (overrides.speed !== null) player.speed = overrides.speed;
    if (overrides.steering !== null) {
        player.steering = overrides.steering;
        player.steeringVelocity = 0;
        // The visual pose and headlight selector use the controller command,
        // not the integrated wheel angle. Keep deterministic frozen QA in the
        // same state that a live input frame would have produced.
        player.physicalSteeringCommand = overrides.steering;
    }
    if (overrides.lateralOffset !== null) player.lateralOffset = overrides.lateralOffset;
}
