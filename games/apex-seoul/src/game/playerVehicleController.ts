import {
    getBoostRatio,
    getGearRpm,
    getInitialGearIndex,
    getPhysicalDownshiftRpm,
    getTorqueScale,
    type VehicleEngineProfile,
} from './engineProfile.ts';
import type {
    PlayerCornerDemandSample,
    PlayerCornerGrade,
    PlayerCornerSpeedLossSample,
    PlayerDriftEntryMode,
    PlayerDriftState,
    PlayerSpeedHandlingState,
    PlayerVehicleState,
} from './vehicle';

const SHIFT_CUT_DECAY_POWER = 0.9;
const SHIFT_DOWN_CUT_RATIO = 0.16;
const SHIFT_DOWN_DURATION_SECONDS = 0.1;
const SHIFT_UP_CUT_RATIO = 0.42;
const SHIFT_UP_DURATION_SECONDS = 0.22;
const LOW_SPEED_DRIFT_LOCK_RATIO = 0.33;
const LOW_SPEED_DRIFT_VELOCITY_DECAY = 18;
const VEHICLE_HEADING_SOFT_ALIGN_START = 0.72;
const VEHICLE_HEADING_SOFT_ALIGN_RATE = 2.4;
const VEHICLE_HEADING_ROAD_RESPONSE = 0.78;
const VEHICLE_HEADING_STEER_RESPONSE = 1.15;
const GRIP_HEADING_COMMIT_DURATION = 0.32;
const GRIP_HEADING_INSIDE_ALLOWANCE = 0.06;
const DRIFT_HEADING_INSIDE_ALLOWANCE = 0.18;
const CORNER_HEADING_LIMIT_MIN_CURVE = 0.08;
const GRIP_TIRE_LOSS_BRAKE_RATIO = 0.2;
const DRIFT_TIRE_LOSS_BRAKE_RATIO = 0.32;

type SpeedHandlingKnot = PlayerSpeedHandlingState;

// Raven uses a linear physical-speed mapping: these ratios correspond to
// 0 / 5 / 10 / 30 / 60 / 110 / 145 / 170 / 185 km/h over a 225km/h envelope.
const SPEED_HANDLING_KNOTS: SpeedHandlingKnot[] = [
    {
        centeringScale: 0,
        gripAngleCap: 1,
        inputResponseScale: 0.75,
        lateralAuthority: 0,
        lateralVelocityCap: 0,
        neutralReturnVelocityCap: 0,
        speedRatio: 0,
        steeringForceScale: 0.75,
        steeringSlewRate: 12,
        visualAuthority: 0,
        visualYawScale: 1,
    },
    {
        centeringScale: 0,
        gripAngleCap: 1,
        inputResponseScale: 0.78,
        lateralAuthority: 0,
        lateralVelocityCap: 0,
        neutralReturnVelocityCap: 0,
        speedRatio: 0.022222,
        steeringForceScale: 0.78,
        steeringSlewRate: 14,
        visualAuthority: 0,
        visualYawScale: 1,
    },
    {
        centeringScale: 1.08,
        gripAngleCap: 1,
        inputResponseScale: 0.84,
        lateralAuthority: 0.025,
        lateralVelocityCap: 28,
        neutralReturnVelocityCap: 8,
        speedRatio: 0.044444,
        steeringForceScale: 0.84,
        steeringSlewRate: 16,
        visualAuthority: 0.08,
        visualYawScale: 1,
    },
    {
        centeringScale: 1.08,
        gripAngleCap: 1,
        inputResponseScale: 0.95,
        lateralAuthority: 0.36,
        lateralVelocityCap: 110,
        neutralReturnVelocityCap: 18,
        speedRatio: 0.133333,
        steeringForceScale: 0.94,
        steeringSlewRate: 19,
        visualAuthority: 0.55,
        visualYawScale: 1,
    },
    {
        centeringScale: 1,
        gripAngleCap: 1,
        inputResponseScale: 1,
        lateralAuthority: 1,
        lateralVelocityCap: 220,
        neutralReturnVelocityCap: 20,
        speedRatio: 0.266667,
        steeringForceScale: 1,
        steeringSlewRate: 20,
        visualAuthority: 1,
        visualYawScale: 1,
    },
    {
        centeringScale: 1,
        gripAngleCap: 1,
        inputResponseScale: 1,
        lateralAuthority: 1,
        lateralVelocityCap: 205,
        neutralReturnVelocityCap: 20,
        speedRatio: 0.488889,
        steeringForceScale: 0.96,
        steeringSlewRate: 18,
        visualAuthority: 1,
        visualYawScale: 1,
    },
    {
        centeringScale: 0.9,
        gripAngleCap: 0.88,
        inputResponseScale: 0.98,
        lateralAuthority: 1,
        lateralVelocityCap: 170,
        neutralReturnVelocityCap: 18,
        speedRatio: 0.644444,
        steeringForceScale: 0.88,
        steeringSlewRate: 14,
        visualAuthority: 1,
        visualYawScale: 0.96,
    },
    {
        centeringScale: 0.8,
        gripAngleCap: 0.78,
        inputResponseScale: 0.95,
        lateralAuthority: 1,
        lateralVelocityCap: 125,
        neutralReturnVelocityCap: 15,
        speedRatio: 0.755556,
        steeringForceScale: 0.78,
        steeringSlewRate: 10,
        visualAuthority: 1,
        visualYawScale: 0.9,
    },
    {
        centeringScale: 0.7,
        gripAngleCap: 0.72,
        inputResponseScale: 0.92,
        lateralAuthority: 1,
        lateralVelocityCap: 90,
        neutralReturnVelocityCap: 12,
        speedRatio: 0.822222,
        steeringForceScale: 0.68,
        steeringSlewRate: 7.5,
        visualAuthority: 1,
        visualYawScale: 0.86,
    },
];

export type PlayerVehicleControllerConfig = {
    accelSpeed: number;
    aeroDrag: number;
    brakeSpeed: number;
    braking: number;
    brakeReleaseResponse: number;
    brakeResponse: number;
    centeringResponse: number;
    centeringCounterHoldDuration: number;
    centeringCounterStartScale: number;
    centeringInputHoldScale: number;
    centeringNeutralInwardVelocityCap: number;
    centeringReleaseDelay: number;
    centeringReleaseScaleResponse: number;
    centeringReleaseScale: number;
    centeringScaleResponse: number;
    cornerEasyIntensityThreshold: number;
    cornerEasySpeedLossScale: number;
    cornerLineSpeedBonus: number;
    cornerLineTargetOffset: number;
    cornerSevereLineScrubScale: number;
    cornerSevereOverspeedFullRatio: number;
    cornerSevereOverspeedScrub: number;
    cornerSevereOverspeedStartRatio: number;
    cornerSharpIntensityThreshold: number;
    cornerSharpLineRewardScale: number;
    cornerSharpSpeedLossScale: number;
    cornerSpeedPull: number;
    cornerInertiaBuildRate: number;
    cornerInertiaMaxLateralSpeed: number;
    cornerInertiaRecoveryRate: number;
    curveSteeringHighSpeedDrop: number;
    curveSteeringCue: number;
    driftBuildRate: number;
    driftDecayRate: number;
    driftEntrySpeedLoss: number;
    driftEntryLateralKick: number;
    driftBreakawayDuration: number;
    driftBrakeEntryPressure: number;
    driftBrakeEntrySpeedLoss: number;
    driftEasyEntrySpeedLossScale: number;
    driftExitReaccelDelay: number;
    driftLiftEntrySpeedLoss: number;
    driftOutsideLineOverspeedPull: number;
    driftOutsideLineScrubScale: number;
    driftSharpEntrySpeedLossScale: number;
    driftThrottleGraceDuration: number;
    driftThrottleLiftRatio: number;
    driftCounterNeutralDuration: number;
    driftLateralDamping: number;
    driftLateralMaxSpeed: number;
    driftCounterSteerLateralScale: number;
    driftCounterSteerLateralSustainScale: number;
    driftCounterSteerLateralVelocityCap: number;
    driftCounterTrimDuration: number;
    driftCounterTrimMaxRatio: number;
    driftCounterTrimResponse: number;
    driftCounterTrimReleaseResponse: number;
    driftTransitionArmDuration: number;
    driftTransitionInputWindow: number;
    driftTransitionKick: number;
    driftSustainAcceleration: number;
    downhillCornerBudgetMaxReduction: number;
    downhillCornerBudgetSlopeAcceleration: number;
    downhillCornerLateralScale: number;
    downhillCornerOverspeedScrub: number;
    driftMaxSlipAngle: number;
    driftMinCornerIntensity: number;
    driftMinSpeedRatio: number;
    driftMinSteerInput: number;
    driftRecoveryRate: number;
    engineAcceleration: number;
    engineBrakeDeceleration: number;
    engineProfile: VehicleEngineProfile;
    gripCounterRoadCenteringScale: number;
    gripCounterRoadLateralBuildRate: number;
    gripCounterRoadLateralMaxSpeed: number;
    gripCounterRoadLateralRecoveryRate: number;
    gripCounterRoadSpeedScrub: number;
    highSpeedInputResponseDrop: number;
    highSpeedLateralVelocityCap: number;
    highSpeedSteeringSlewRate: number;
    highSpeedSteerForceDrop: number;
    highSpeedSteerVisualDrop: number;
    gripSteerAngleHighSpeedCap: number;
    gripSteerAngleHighSpeedStartRatio: number;
    inputResponse: number;
    launchThrottleFullSpeedRatio: number;
    launchThrottleMinRatio: number;
    maxRoadOffset: number;
    overspeedUndersteerMax: number;
    overspeedEasyUndersteerFullRatio: number;
    overspeedEasyUndersteerScale: number;
    overspeedMediumUndersteerScale: number;
    overspeedUndersteerMinSteerInput: number;
    overspeedUndersteerSteerInputFull: number;
    overspeedUndersteerLiftTargetScale: number;
    overspeedUndersteerBrakeTargetScale: number;
    overspeedSafetyMarginStartRatio: number;
    overspeedSafetyMarginFullRatio: number;
    overspeedSafetyMarginScrub: number;
    overspeedSharpLateralScale: number;
    overspeedSharpSpeedScrubScale: number;
    overspeedSharpUndersteerScale: number;
    overspeedEasyLateralScale: number;
    overspeedEasyRoadMaxRatio: number;
    overspeedMediumLateralScale: number;
    overspeedMediumRoadMaxRatio: number;
    overspeedUndersteerRoadBuildRate: number;
    overspeedUndersteerRoadMaxRatio: number;
    overspeedUndersteerRoadRecoveryRate: number;
    overspeedUndersteerRoadSpeedRate: number;
    overspeedUndersteerRatioBuildRate: number;
    overspeedUndersteerRatioRecoveryRate: number;
    overspeedUndersteerSpeedScrub: number;
    overspeedUndersteerSpeedWindow: number;
    rollingResistance: number;
    rpmIdle: number;
    rpmRedline: number;
    rpmResponse: number;
    steerAcceleration: number;
    steerDamping: number;
    steeringSpeedScrub: number;
    steeringSpeedScrubThreshold: number;
    steeringVelocityCue: number;
};

export type PlayerVehicleInput = {
    accelPressed: boolean;
    brakePressed: boolean;
    steerAxis: number;
};

export type PlayerVehicleUpdateContext = {
    currentCurve: number;
    longitudinalScale?: number;
    previewRoadCurve?: number;
    slopeAcceleration: number;
};

export function createDefaultPlayerVehicleState(
    cruiseSpeed: number,
    engineProfile: VehicleEngineProfile,
    accelSpeed: number,
): PlayerVehicleState {
    const speedRatio = clamp(cruiseSpeed / accelSpeed, 0, 1);
    const speedHandling = getSpeedHandlingSample(speedRatio);
    const gearIndex = getInitialGearIndex(engineProfile, speedRatio);
    const rpm = getGearRpm(engineProfile, gearIndex, speedRatio);
    const torqueScale = getTorqueScale(engineProfile, rpm);

    return {
        brakePressure: 0,
        boostRatio: 0,
        cornerInsideHeadingAllowance: 0,
        cornerInsideHeadingLimited: false,
        cornerDemand: createDefaultCornerDemandSample(cruiseSpeed, accelSpeed),
        cornerInertiaLateralVelocity: 0,
        cornerSpeedLoss: createDefaultCornerSpeedLossSample(),
        counterSteerTimer: 0,
        counterSteerLateralVelocity: 0,
        counterSteerEntryDriftVelocity: 0,
        counterTrimRatio: 0,
        engineTorqueScale: getEngineTorqueScale(torqueScale, false),
        driftDirection: 0,
        driftBaseLateralVelocity: 0,
        driftEntryLateralTarget: 0,
        driftEntryMode: 'none',
        driftExitThrottleDelay: 0,
        driftLateralVelocity: 0,
        driftRatio: 0,
        driftState: 'grip',
        driftStateTimer: 0,
        driftThrottleLiftTimer: 0,
        driftTransitionArmed: false,
        driftTransitionDirection: 0,
        driftTransitionAwaitingCounter: false,
        driftTransitionLiftTimer: 0,
        fuelCutActive: false,
        fuelCutTimer: 0,
        gearIndex,
        guardrailBounceVelocity: 0,
        guardrailContactActive: false,
        guardrailContactAnchorOffset: 0,
        guardrailContactClearTimer: 0,
        guardrailContactInset: 0,
        guardrailContactDirection: 0,
        guardrailContactPhase: 'clear',
        guardrailContactTimer: 0,
        guardrailImpactCount: 0,
        guardrailImpactCue: 0,
        guardrailShoulderRatio: 0,
        gripCounterRoadLateralVelocity: 0,
        gripCounterRoadRatio: 0,
        gripFollowAuthority: 1,
        gripHeadingCommitTimer: 0,
        gripSteerAngleLimit: 1,
        lateralOffset: 0,
        lowSpeedLateralAuthority: speedHandling.lateralAuthority,
        lowSpeedVisualSteeringAuthority: speedHandling.visualAuthority,
        centeringCounterHoldTimer: 0,
        centeringForce: 0,
        centeringReleaseStartScale: 0.45,
        centeringReleaseTimer: 0,
        lateralCenteringScale: 0.45,
        lateralCenteringTargetScale: 0.45,
        longitudinalForce: {
            aeroDrag: 0,
            brakeForce: 0,
            cornerLossForce: 0,
            engineBrakeForce: 0,
            engineForce: 0,
            engineTorqueScale: getEngineTorqueScale(torqueScale, false),
            gearIndex,
            netAcceleration: 0,
            rollingResistance: 0,
            rpm,
            slopeAcceleration: 0,
            speed: cruiseSpeed,
            speedRatio,
        },
        overspeedUndersteerRatio: 0,
        overspeedUndersteerTargetRatio: 0,
        overspeedUndersteerSteerDemandRatio: 0,
        overspeedUndersteerLoadTransferScale: 1,
        overspeedUndersteerLateralVelocity: 0,
        passiveGripYawRate: 0,
        physicalSteeringCommand: 0,
        requiredRoadYawRate: 0,
        residualRoadYawRate: 0,
        rpm,
        shiftCutRatio: 0,
        shiftDirection: 0,
        shiftTimer: 0,
        speed: cruiseSpeed,
        speedHandling,
        slipAngle: 0,
        steering: 0,
        steeringVelocity: 0,
        torqueScale,
        traction: 1,
        throttleWasPressed: false,
        vehicleHeadingError: 0,
    };
}

export function updatePlayerVehicle(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    context: PlayerVehicleUpdateContext,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    updateBrakePressure(player, input, config, seconds);
    updatePlayerSpeed(player, input, context, config, seconds);
    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const speedHandling = getSpeedHandlingSample(speedRatio);
    const lowSpeedLateralAuthority = speedHandling.lateralAuthority;
    player.speedHandling = speedHandling;
    player.lowSpeedLateralAuthority = speedHandling.lateralAuthority;
    player.lowSpeedVisualSteeringAuthority = speedHandling.visualAuthority;
    updatePhysicalSteeringCommand(player, input, config, speedHandling, seconds);
    updateDriftState(player, input, context, config, seconds);
    if (speedRatio < LOW_SPEED_DRIFT_LOCK_RATIO && player.driftState !== 'grip') {
        setDriftState(player, 'recovery', config);
    }
    updateDriftLateralMotion(player, input, config, seconds);

    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const overspeedBandDemand = getOverspeedUndersteerDemand(
        player.cornerDemand.grade,
        player.cornerDemand.overspeedRatio,
        config,
    );
    // Steering demand is a smooth confirmation of tire load, not an on/off
    // switch. Lifting or braking restores front authority through load transfer,
    // while current corner overspeed remains the single source of demand.
    player.overspeedUndersteerSteerDemandRatio = getOverspeedSteerDemandRatio(
        input.steerAxis,
        config,
    );
    player.overspeedUndersteerLoadTransferScale = input.brakePressed
        ? lerp(1, config.overspeedUndersteerBrakeTargetScale, player.brakePressure)
        : input.accelPressed
            ? 1
            : config.overspeedUndersteerLiftTargetScale;
    const overspeedUndersteerActive = player.driftState === 'grip';
    player.overspeedUndersteerTargetRatio = overspeedUndersteerActive
        ? overspeedBandDemand *
            player.overspeedUndersteerSteerDemandRatio *
            player.overspeedUndersteerLoadTransferScale
        : 0;
    player.overspeedUndersteerRatio = approach(
        player.overspeedUndersteerRatio,
        player.overspeedUndersteerTargetRatio,
        player.overspeedUndersteerTargetRatio > player.overspeedUndersteerRatio
            ? config.overspeedUndersteerRatioBuildRate
            : config.overspeedUndersteerRatioRecoveryRate,
        seconds,
    );
    const overspeedSteerScale = 1 - player.overspeedUndersteerRatio * config.overspeedUndersteerMax;
    const longitudinalScale = Math.max(0.1, context.longitudinalScale ?? 1);
    // Overspeed already reduces steering yaw authority and therefore increases
    // heading debt. A second full-strength outward translation made one tire
    // load appear twice and produced 400~530u/s launch spikes at corner exit.
    // Keep this state as a decaying telemetry/compatibility channel only.
    const overspeedOutwardTarget = 0;
    player.overspeedUndersteerLateralVelocity = approach(
        player.overspeedUndersteerLateralVelocity,
        overspeedOutwardTarget,
        Math.abs(overspeedOutwardTarget) >
            Math.abs(player.overspeedUndersteerLateralVelocity)
            ? config.maxRoadOffset * config.overspeedUndersteerRoadBuildRate
            : config.maxRoadOffset * config.overspeedUndersteerRoadRecoveryRate,
        seconds,
    );
    player.gripSteerAngleLimit = player.driftState === 'grip'
        ? speedHandling.gripAngleCap * overspeedSteerScale
        : 1;
    const gripSteerAxis = player.physicalSteeringCommand * player.gripSteerAngleLimit;
    // Physics uses the road frame at the vehicle contact point. Preview curve
    // is intentionally excluded: it can warn the driver about the next bend,
    // but it must not rotate or translate the car before reaching that bend.
    const requiredRoadYawRate = -context.currentCurve *
        VEHICLE_HEADING_ROAD_RESPONSE *
        longitudinalScale *
        speedRatio;
    const driftCounterHeadingRecovery = player.driftState === 'drift' &&
        player.driftDirection !== 0 &&
        getDirection(input.steerAxis) === -player.driftDirection;
    const headingSteerAxis = driftCounterHeadingRecovery
        ? player.driftDirection * Math.abs(gripSteerAxis) * 0.75
        : gripSteerAxis;
    const steeringHeadingRate = headingSteerAxis *
        VEHICLE_HEADING_STEER_RESPONSE *
        lowSpeedLateralAuthority *
        speedRatio;
    const steeringOpposesRoadYaw = requiredRoadYawRate !== 0 &&
        getDirection(steeringHeadingRate) === -getDirection(requiredRoadYawRate);
    const gripFollowAuthority = steeringOpposesRoadYaw
        ? clamp(
            Math.abs(steeringHeadingRate) / Math.abs(requiredRoadYawRate),
            0,
            1,
        )
        : 0;
    // A neutral wheel has no knowledge of road geometry. All road-frame yaw
    // becomes relative heading debt until the player supplies steering yaw.
    const passiveGripYawRate = 0;
    const residualRoadYawRate = requiredRoadYawRate;
    player.requiredRoadYawRate = requiredRoadYawRate;
    player.passiveGripYawRate = passiveGripYawRate;
    player.residualRoadYawRate = residualRoadYawRate;
    player.gripFollowAuthority = gripFollowAuthority;
    const headingSoftAlignRate = getDirection(player.vehicleHeadingError) *
        Math.max(
            0,
            Math.abs(player.vehicleHeadingError) - VEHICLE_HEADING_SOFT_ALIGN_START,
        ) *
        VEHICLE_HEADING_SOFT_ALIGN_RATE;
    const headingBeforeSteering = player.vehicleHeadingError;
    player.vehicleHeadingError += (
        residualRoadYawRate +
        steeringHeadingRate -
        headingSoftAlignRate
    ) * seconds;
    const inputSteerDirection = getDirection(input.steerAxis);
    const roadSteerDirection = getDirection(context.currentCurve);
    const correctingOutwardHeading = player.driftState === 'grip' &&
        roadSteerDirection !== 0 &&
        inputSteerDirection === roadSteerDirection &&
        getDirection(headingBeforeSteering) === -roadSteerDirection;
    const sameDirectionGripCommit = player.driftState === 'grip' &&
        roadSteerDirection !== 0 &&
        inputSteerDirection === roadSteerDirection;
    const reachedRoadAlignedHeading = sameDirectionGripCommit &&
        roadSteerDirection * player.vehicleHeadingError >= 0;
    const continuingDebtCommit = correctingOutwardHeading ||
        player.gripHeadingCommitTimer > 0;
    player.gripHeadingCommitTimer = reachedRoadAlignedHeading &&
        continuingDebtCommit
        ? Math.min(
            GRIP_HEADING_COMMIT_DURATION,
            player.gripHeadingCommitTimer + seconds,
        )
        : 0;
    if (sameDirectionGripCommit && continuingDebtCommit) {
        const commitRatio = smoothstep(clamp(
            player.gripHeadingCommitTimer / GRIP_HEADING_COMMIT_DURATION,
            0,
            1,
        ));
        const insideHeadingLimit = GRIP_HEADING_INSIDE_ALLOWANCE * commitRatio;
        player.vehicleHeadingError = roadSteerDirection > 0
            ? Math.min(player.vehicleHeadingError, insideHeadingLimit)
            : Math.max(player.vehicleHeadingError, -insideHeadingLimit);
    }
    const sameDirectionCornerSteer =
        Math.abs(context.currentCurve) >= CORNER_HEADING_LIMIT_MIN_CURVE &&
        roadSteerDirection !== 0 &&
        inputSteerDirection === roadSteerDirection;
    const insideHeadingAllowance = lerp(
        GRIP_HEADING_INSIDE_ALLOWANCE,
        DRIFT_HEADING_INSIDE_ALLOWANCE,
        smoothstep(clamp(player.driftRatio, 0, 1)),
    );
    player.cornerInsideHeadingAllowance = sameDirectionCornerSteer
        ? insideHeadingAllowance
        : 0;
    player.cornerInsideHeadingLimited = false;
    if (sameDirectionCornerSteer) {
        const insideHeadingBefore = roadSteerDirection * headingBeforeSteering;
        const insideHeadingAfter = roadSteerDirection * player.vehicleHeadingError;
        // This is an input growth limit, not road auto-alignment. If the
        // vehicle already carries a larger inside heading, preserve it and
        // only prevent the held corner-direction steer from increasing it.
        const insideGrowthLimit = Math.max(
            insideHeadingBefore,
            insideHeadingAllowance,
        );
        if (insideHeadingAfter > insideGrowthLimit) {
            player.vehicleHeadingError = roadSteerDirection * insideGrowthLimit;
            player.cornerInsideHeadingLimited = true;
        }
    }
    // Road-relative movement is the geometric projection of world travel.
    // It is not a second curve force layered on top of heading.
    const cornerInertiaTarget = Math.sin(clamp(
        player.vehicleHeadingError,
        -1.2,
        1.2,
    )) * player.speed * longitudinalScale;
    player.cornerInertiaLateralVelocity = cornerInertiaTarget;
    const gripCounterRoadActive = player.driftState === 'grip' &&
        roadSteerDirection !== 0 &&
        inputSteerDirection !== 0 &&
        inputSteerDirection !== roadSteerDirection;
    player.gripCounterRoadRatio = gripCounterRoadActive
        ? smoothstep(clamp(Math.abs(input.steerAxis), 0, 1)) * cornerIntensity
        : 0;
    const gripCounterRoadTarget = 0;
    player.gripCounterRoadLateralVelocity = approach(
        player.gripCounterRoadLateralVelocity,
        gripCounterRoadTarget,
        gripCounterRoadActive
            ? config.gripCounterRoadLateralBuildRate
            : config.gripCounterRoadLateralRecoveryRate,
        seconds,
    );
    const counterSteering = player.driftState === 'drift' &&
        player.driftDirection !== 0 &&
        getDirection(input.steerAxis) === -player.driftDirection;
    const counterProgress = smoothstep(clamp(player.counterSteerTimer / 0.45, 0, 1));
    const counterAuthority = lerp(
        config.driftCounterSteerLateralScale,
        config.driftCounterSteerLateralSustainScale,
        counterProgress,
    );
    const counterSteerScale = counterSteering
        ? lerp(1, counterAuthority, player.driftRatio)
        : 1;
    const lateralOffsetDirection = getDirection(player.lateralOffset);
    const counteringOffset = inputSteerDirection !== 0 &&
        lateralOffsetDirection !== 0 &&
        inputSteerDirection !== lateralOffsetDirection;
    player.centeringCounterHoldTimer = counteringOffset
        ? Math.min(
            config.centeringCounterHoldDuration,
            player.centeringCounterHoldTimer + seconds,
        )
        : 0;
    const counterHasCommitted = counteringOffset &&
        player.centeringCounterHoldTimer >= config.centeringCounterHoldDuration;
    const neutralRelease = inputSteerDirection === 0;
    if (neutralRelease) {
        if (player.centeringReleaseTimer === 0) {
            player.centeringReleaseStartScale = player.lateralCenteringScale;
        }
        player.centeringReleaseTimer += seconds;
    } else {
        player.centeringReleaseTimer = 0;
    }
    const centeringTargetScale = gripCounterRoadActive
        ? config.gripCounterRoadCenteringScale
        : neutralRelease
            ? 0
            : inputSteerDirection === lateralOffsetDirection
                ? config.centeringInputHoldScale
                : counterHasCommitted
                    ? 1
                    : config.centeringCounterStartScale;
    player.lateralCenteringTargetScale = centeringTargetScale;
    player.lateralCenteringScale = approach(
        player.lateralCenteringScale,
        centeringTargetScale,
        neutralRelease && player.centeringReleaseTimer >= config.centeringReleaseDelay
            ? config.centeringReleaseScaleResponse
            : config.centeringScaleResponse,
        seconds,
    );
    // Releasing the wheel damps steering velocity, but it must not use lateral
    // position as a hidden command to drive the car back to road center.
    const centeringForce = 0;
    player.centeringForce = centeringForce;
    const steeringForce = player.driftState === 'grip'
        ? 0
        : gripSteerAxis *
            config.steerAcceleration *
            speedHandling.steeringForceScale *
            counterSteerScale *
            lowSpeedLateralAuthority;
    const dampingForce = -player.steeringVelocity * config.steerDamping * (1 - player.driftRatio * 0.2);

    player.steeringVelocity += (
        steeringForce +
        centeringForce +
        dampingForce
    ) * seconds;
    const baseLateralVelocityLimit = speedHandling.lateralVelocityCap;
    const lateralVelocityLimit = counterSteering
        ? Math.min(
            baseLateralVelocityLimit,
            lerp(
                config.driftCounterSteerLateralVelocityCap * 0.65,
                config.driftCounterSteerLateralVelocityCap,
                counterProgress,
            ),
        )
        : baseLateralVelocityLimit;
    player.steeringVelocity = clamp(
        player.steeringVelocity,
        -lateralVelocityLimit,
        lateralVelocityLimit,
    );
    player.counterSteerLateralVelocity = counterSteering ? player.steeringVelocity : 0;
    if (lowSpeedLateralAuthority <= 0) {
        player.physicalSteeringCommand = 0;
        player.steeringVelocity = 0;
        player.counterSteerLateralVelocity = 0;
        player.cornerInertiaLateralVelocity = 0;
        player.vehicleHeadingError = 0;
        player.gripHeadingCommitTimer = 0;
        player.gripCounterRoadLateralVelocity = 0;
        player.overspeedUndersteerLateralVelocity = 0;
        player.driftLateralVelocity = approach(
            player.driftLateralVelocity,
            0,
            LOW_SPEED_DRIFT_VELOCITY_DECAY,
            seconds,
        );
    }
    player.lateralOffset += (
        player.steeringVelocity +
        player.cornerInertiaLateralVelocity +
        player.driftLateralVelocity +
        player.gripCounterRoadLateralVelocity +
        player.overspeedUndersteerLateralVelocity
    ) * seconds;
    player.lateralOffset = clamp(
        player.lateralOffset,
        -config.maxRoadOffset,
        config.maxRoadOffset,
    );

    if (
        (player.lateralOffset <= -config.maxRoadOffset && player.steeringVelocity < 0) ||
        (player.lateralOffset >= config.maxRoadOffset && player.steeringVelocity > 0)
    ) {
        player.steeringVelocity = 0;
    }

    const visualGripAngleLimit = player.driftState === 'grip'
        ? speedHandling.gripAngleCap
        : 1;
    const visualSteerAxis = input.steerAxis *
        visualGripAngleLimit *
        speedHandling.visualAuthority *
        speedHandling.visualYawScale;
    const targetSteering = clamp(
        visualSteerAxis +
            (player.steeringVelocity / config.steerAcceleration) * config.steeringVelocityCue -
            context.currentCurve * speedRatio * speedHandling.visualYawScale * config.curveSteeringCue,
        -1,
        1,
    );
    const steeringBlend = 1 - Math.exp(
        -config.inputResponse * speedHandling.inputResponseScale * seconds,
    );
    const nextSteering = lerp(player.steering, targetSteering, steeringBlend);
    const maxSteeringDelta = speedHandling.steeringSlewRate * seconds;

    player.steering = clamp(
        nextSteering,
        player.steering - maxSteeringDelta,
        player.steering + maxSteeringDelta,
    );
}

function updatePhysicalSteeringCommand(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    config: PlayerVehicleControllerConfig,
    speedHandling: PlayerSpeedHandlingState,
    seconds: number,
) {
    const responseBlend = 1 - Math.exp(
        -config.inputResponse * speedHandling.inputResponseScale * seconds,
    );
    const blendedCommand = lerp(
        player.physicalSteeringCommand,
        input.steerAxis,
        responseBlend,
    );
    const maxDelta = speedHandling.steeringSlewRate * seconds;

    player.physicalSteeringCommand = clamp(
        blendedCommand,
        player.physicalSteeringCommand - maxDelta,
        player.physicalSteeringCommand + maxDelta,
    );
}

function updateDriftState(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    context: PlayerVehicleUpdateContext,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const steerDirection = getDirection(input.steerAxis);
    player.driftStateTimer += seconds;
    const brakeEntry = player.brakePressure >= config.driftBrakeEntryPressure;
    const liftEntry = player.throttleWasPressed && !input.accelPressed;
    const entryIntent = speedRatio >= config.driftMinSpeedRatio &&
        cornerIntensity >= config.driftMinCornerIntensity &&
        Math.abs(input.steerAxis) >= config.driftMinSteerInput &&
        (brakeEntry || liftEntry);
    const counterSteering = player.driftDirection !== 0 && steerDirection === -player.driftDirection;
    const throttleLiftActive = player.driftState === 'drift' && !input.accelPressed;

    if (player.driftState === 'drift') {
        player.driftThrottleLiftTimer = throttleLiftActive
            ? player.driftThrottleLiftTimer + seconds
            : 0;
    } else {
        player.driftThrottleLiftTimer = 0;
    }

    if (player.driftState === 'drift' && counterSteering) {
        if (player.counterSteerTimer <= 0) {
            player.counterSteerEntryDriftVelocity = player.driftLateralVelocity;
        }
        player.counterSteerTimer += seconds;
        const trimProgress = smoothstep(clamp(
            (player.counterSteerTimer - config.driftCounterNeutralDuration) /
                config.driftCounterTrimDuration,
            0,
            1,
        ));
        player.counterTrimRatio = config.driftCounterTrimMaxRatio * trimProgress;
    } else if (player.driftState === 'drift' && !player.driftTransitionArmed) {
        player.counterSteerTimer = 0;
        player.counterSteerEntryDriftVelocity = 0;
        player.counterTrimRatio = approach(
            player.counterTrimRatio,
            0,
            config.driftCounterTrimReleaseResponse,
            seconds,
        );
    } else if (player.driftState !== 'drift' || !player.driftTransitionArmed) {
        player.counterSteerTimer = 0;
        player.counterSteerEntryDriftVelocity = 0;
        player.counterTrimRatio = 0;
    }

    switch (player.driftState) {
        case 'grip':
            player.driftRatio = approach(player.driftRatio, 0, config.driftDecayRate, seconds);
            player.traction = approach(player.traction, 1, config.driftRecoveryRate, seconds);
            if (entryIntent && steerDirection !== 0) {
                setDriftState(player, 'setup');
                player.driftDirection = steerDirection;
                player.driftEntryLateralTarget = steerDirection *
                    config.driftEntryLateralKick *
                    speedRatio;
                player.driftEntryMode = getDriftEntryMode(brakeEntry, liftEntry);
                player.driftBaseLateralVelocity = 0;
                player.driftLateralVelocity = 0;
                const entrySpeedLoss = getDriftEntrySpeedLoss(player, speedRatio, config);
                player.speed = Math.max(config.brakeSpeed, player.speed - entrySpeedLoss);
            }
            break;
        case 'setup':
            player.driftRatio = approach(player.driftRatio, 0.46, config.driftBuildRate, seconds);
            player.traction = approach(player.traction, 0.72, config.driftBuildRate, seconds);
            if (
                speedRatio < config.driftMinSpeedRatio * 0.78 ||
                cornerIntensity < config.driftMinCornerIntensity * 0.55 ||
                steerDirection !== player.driftDirection
            ) {
                setDriftState(player, 'recovery', config);
            } else if (player.driftStateTimer >= 0.18 && player.driftRatio >= 0.38) {
                setDriftState(player, 'drift');
                player.driftBaseLateralVelocity = player.driftLateralVelocity;
            }
            break;
        case 'drift':
            if (
                speedRatio < config.driftMinSpeedRatio * 0.78 ||
                cornerIntensity < config.driftMinCornerIntensity * 0.55
            ) {
                setDriftState(player, 'recovery', config);
            } else if (player.driftTransitionArmed) {
                if (
                    steerDirection === player.driftTransitionDirection &&
                    input.accelPressed
                ) {
                    player.driftDirection = player.driftTransitionDirection;
                    player.driftLateralVelocity = player.driftDirection * config.driftTransitionKick;
                    player.driftBaseLateralVelocity = player.driftLateralVelocity;
                    player.driftRatio = Math.max(player.driftRatio, 0.52);
                    player.driftTransitionArmed = false;
                    player.driftTransitionDirection = 0;
                    player.counterSteerTimer = 0;
                    player.driftStateTimer = 0;
                } else if (input.accelPressed) {
                    setDriftState(player, 'recovery', config);
                }
            } else if (player.driftTransitionAwaitingCounter) {
                player.driftTransitionLiftTimer = player.driftThrottleLiftTimer;
                if (
                    input.accelPressed &&
                    player.driftThrottleLiftTimer <= config.driftThrottleGraceDuration
                ) {
                    // A short neutral throttle blip is angle control, not an
                    // automatic S-transition or drift cancellation.
                    player.driftTransitionAwaitingCounter = false;
                    player.driftTransitionLiftTimer = 0;
                } else if (
                    input.accelPressed ||
                    player.driftTransitionLiftTimer >= config.driftTransitionInputWindow
                ) {
                    setDriftState(player, 'recovery', config);
                } else if (
                    counterSteering &&
                    player.counterSteerTimer >= config.driftTransitionArmDuration
                ) {
                    player.driftTransitionAwaitingCounter = false;
                    player.driftTransitionArmed = true;
                    player.driftTransitionDirection = steerDirection;
                }
            } else if (!input.accelPressed && player.throttleWasPressed) {
                // Direction changes require a neutral lift followed by a fresh
                // counter input. Any lift first enters a short modulation window
                // so an off/on throttle blip can keep the current drift alive.
                if (steerDirection === 0 && player.brakePressure < 0.2) {
                    player.driftTransitionAwaitingCounter = true;
                    player.driftTransitionLiftTimer = 0;
                }
            } else if (
                !input.accelPressed &&
                player.driftThrottleLiftTimer >= config.driftThrottleGraceDuration
            ) {
                setDriftState(player, 'recovery', config);
            } else {
                const targetRatio = throttleLiftActive
                    ? config.driftThrottleLiftRatio
                    : steerDirection === player.driftDirection
                    ? 0.82
                    : counterSteering
                        ? 0.48
                        : 0.68;
                player.driftRatio = approach(player.driftRatio, targetRatio, config.driftBuildRate, seconds);
                player.traction = approach(
                    player.traction,
                    throttleLiftActive ? 0.54 : 0.42,
                    config.driftBuildRate,
                    seconds,
                );
            }
            break;
        case 'recovery':
            player.driftRatio = approach(player.driftRatio, 0, config.driftRecoveryRate, seconds);
            player.traction = approach(player.traction, 1, config.driftRecoveryRate, seconds);
            if (player.driftRatio <= 0.025) {
                player.driftRatio = 0;
                player.driftDirection = 0;
                player.driftEntryMode = 'none';
                player.driftBaseLateralVelocity = 0;
                player.driftEntryLateralTarget = 0;
                setDriftState(player, 'grip');
            }
            break;
    }

    player.slipAngle = player.driftDirection * player.driftRatio * config.driftMaxSlipAngle;
    player.throttleWasPressed = input.accelPressed;
}

function updateDriftLateralMotion(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    const steerDirection = getDirection(input.steerAxis);

    if (player.driftState === 'setup') {
        const buildRate = Math.abs(player.driftEntryLateralTarget) / config.driftBreakawayDuration;
        player.driftLateralVelocity = approach(
            player.driftLateralVelocity,
            player.driftEntryLateralTarget,
            buildRate,
            seconds,
        );
    } else if (player.driftState === 'drift' && steerDirection === -player.driftDirection) {
        if (!player.driftTransitionArmed && player.counterSteerTimer >= config.driftCounterNeutralDuration) {
            const targetVelocity = player.driftBaseLateralVelocity * (1 - player.counterTrimRatio);
            const trimBlend = 1 - Math.exp(-config.driftCounterTrimResponse * seconds);

            player.driftLateralVelocity = lerp(
                player.driftLateralVelocity,
                targetVelocity,
                trimBlend,
            );
        }
    } else if (player.driftState === 'drift' && steerDirection === player.driftDirection) {
        player.counterSteerTimer = 0;
        player.driftTransitionArmed = false;
        player.driftTransitionDirection = 0;
        player.driftBaseLateralVelocity += steerDirection * config.driftSustainAcceleration * seconds;
        player.driftBaseLateralVelocity = clamp(
            player.driftBaseLateralVelocity,
            -config.driftLateralMaxSpeed,
            config.driftLateralMaxSpeed,
        );
        player.driftLateralVelocity = approach(
            player.driftLateralVelocity,
            player.driftBaseLateralVelocity,
            config.driftSustainAcceleration,
            seconds,
        );
    } else if (player.driftState === 'drift') {
        const targetVelocity = player.driftBaseLateralVelocity * (1 - player.counterTrimRatio);
        const releaseBlend = 1 - Math.exp(-config.driftCounterTrimReleaseResponse * seconds);

        player.driftLateralVelocity = lerp(
            player.driftLateralVelocity,
            targetVelocity,
            releaseBlend,
        );
    } else {
        player.counterSteerTimer = 0;
    }

    const damping = player.driftState === 'grip'
        ? config.driftLateralDamping * 2.8
        : player.driftState === 'recovery'
            ? config.driftLateralDamping * 2
            : config.driftLateralDamping;
    const dampingBlend = 1 - Math.exp(-damping * seconds);

    player.driftLateralVelocity = lerp(player.driftLateralVelocity, 0, dampingBlend);

    player.driftLateralVelocity = clamp(
        player.driftLateralVelocity,
        -config.driftLateralMaxSpeed,
        config.driftLateralMaxSpeed,
    );
    player.slipAngle = player.driftDirection * player.driftRatio * config.driftMaxSlipAngle;
}

function setDriftState(
    player: PlayerVehicleState,
    state: PlayerDriftState,
    config?: PlayerVehicleControllerConfig,
) {
    player.driftState = state;
    player.driftStateTimer = 0;

    if (state === 'recovery' && config) {
        const lineMissRatio = smoothstep(clamp((0.6 - player.cornerDemand.lineQuality) / 0.6, 0, 1));
        const momentumRatio = clamp(
            Math.abs(player.driftLateralVelocity) / config.driftLateralMaxSpeed,
            0,
            1,
        );
        player.driftExitThrottleDelay = Math.max(
            player.driftExitThrottleDelay,
            config.driftExitReaccelDelay * lineMissRatio * lerp(0.45, 1, momentumRatio),
        );
    }

    if (state !== 'drift') {
        player.driftTransitionArmed = false;
        player.driftTransitionDirection = 0;
        player.driftTransitionAwaitingCounter = false;
        player.driftTransitionLiftTimer = 0;
    }
}

function getDriftEntrySpeedLoss(
    player: PlayerVehicleState,
    speedRatio: number,
    config: Pick<
        PlayerVehicleControllerConfig,
        | 'driftBrakeEntrySpeedLoss'
        | 'driftEasyEntrySpeedLossScale'
        | 'driftEntrySpeedLoss'
        | 'driftLiftEntrySpeedLoss'
        | 'driftSharpEntrySpeedLossScale'
    >,
) {
    const gradeScale = player.cornerDemand.grade === 'easy'
        ? config.driftEasyEntrySpeedLossScale
        : player.cornerDemand.grade === 'sharp'
            ? config.driftSharpEntrySpeedLossScale
            : 1;
    const baseLoss = config.driftEntrySpeedLoss +
        (player.driftEntryMode === 'lift' ? config.driftLiftEntrySpeedLoss : 0);
    const brakeLoss = player.driftEntryMode === 'brake'
        ? config.driftBrakeEntrySpeedLoss * player.brakePressure * lerp(0.7, 1.2, speedRatio)
        : 0;

    return (baseLoss + brakeLoss) * gradeScale;
}

export function getCornerIntensity(curve: number) {
    return clamp(Math.abs(curve) / 0.72, 0, 1);
}

export function getCornerGrade(
    cornerIntensity: number,
    config: Pick<
        PlayerVehicleControllerConfig,
        'cornerEasyIntensityThreshold' | 'cornerSharpIntensityThreshold'
    >,
): PlayerCornerGrade {
    if (cornerIntensity <= 0.08) return 'straight';
    if (cornerIntensity < config.cornerEasyIntensityThreshold) return 'easy';
    if (cornerIntensity < config.cornerSharpIntensityThreshold) return 'medium';

    return 'sharp';
}

export function getCornerSpeedBudget(
    grade: PlayerCornerGrade,
    config: Pick<
        PlayerVehicleControllerConfig,
        'accelSpeed' | 'downhillCornerBudgetMaxReduction' | 'downhillCornerBudgetSlopeAcceleration'
    >,
    slopeAcceleration = 0,
) {
    // Raven maps raw speed linearly to its 225km/h physical-speed envelope.
    // These ratios are the grade baselines before line-quality adjustment.
    if (grade === 'easy') return config.accelSpeed * 0.866;

    const downhillCarryRatio = getDownhillCornerCarryRatio(slopeAcceleration, config);
    const reduction = downhillCarryRatio * config.downhillCornerBudgetMaxReduction;
    if (grade === 'medium') return config.accelSpeed * 0.697 * (1 - reduction);
    if (grade === 'sharp') return config.accelSpeed * 0.59 * (1 - reduction);

    return config.accelSpeed;
}

export function getCornerDemandSample(
    speed: number,
    lateralOffset: number,
    context: PlayerVehicleUpdateContext,
    config: PlayerVehicleControllerConfig,
): PlayerCornerDemandSample {
    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const grade = getCornerGrade(cornerIntensity, config);
    const downhillCarryRatio = getDownhillCornerCarryRatio(context.slopeAcceleration, config);
    const lineQuality = getCornerLineQuality(
        lateralOffset,
        context.currentCurve,
        config.cornerLineTargetOffset,
    );
    const downhillReduction = downhillCarryRatio * config.downhillCornerBudgetMaxReduction;
    const baseTargetSpeed = getCornerSpeedBudget(grade, config, context.slopeAcceleration);
    const lineSpeedAdjustment = (lineQuality - 0.5) * 2 *
        config.cornerLineSpeedBonus *
        cornerIntensity *
        getCornerLineRewardScale(grade, config) *
        (1 - downhillReduction);
    const targetSpeed = clamp(baseTargetSpeed + lineSpeedAdjustment, 1, config.accelSpeed);
    const speedOverBudget = Math.max(0, speed - targetSpeed);
    const speedRatioToBudget = speed / targetSpeed;
    const lateralDemand = grade === 'straight'
        ? 0
        : cornerIntensity * speedRatioToBudget * speedRatioToBudget;
    const overspeedRatio = grade === 'straight'
        ? 0
        : smoothstep(clamp(
            speedOverBudget / config.overspeedUndersteerSpeedWindow,
            0,
            1,
        ));
    const severeOverspeedRatio = grade === 'straight'
        ? 0
        : smoothstep(clamp(
            (speedRatioToBudget - config.cornerSevereOverspeedStartRatio) /
                Math.max(
                    0.01,
                    config.cornerSevereOverspeedFullRatio -
                        config.cornerSevereOverspeedStartRatio,
                ),
            0,
            1,
        ));
    const speedLossZone = speedOverBudget <= 0
        ? 'within-budget'
        : severeOverspeedRatio > 0
            ? 'severe-overspeed'
            : 'overspeed';
    const safetyMarginRatio = smoothstep(clamp(
        (Math.abs(lateralOffset / config.maxRoadOffset) - config.overspeedSafetyMarginStartRatio) /
            Math.max(0.01, config.overspeedSafetyMarginFullRatio - config.overspeedSafetyMarginStartRatio),
        0,
        1,
    ));

    return {
        baseTargetSpeed,
        cornerIntensity,
        downhillCarryRatio,
        grade,
        lateralDemand,
        lineQuality,
        lineSpeedAdjustment,
        overspeedRatio,
        safetyMarginRatio,
        severeOverspeedRatio,
        speedOverBudget,
        speedLossZone,
        speedRatioToBudget,
        targetSpeed,
    };
}

function getDownhillCornerCarryRatio(
    slopeAcceleration: number,
    config: Pick<PlayerVehicleControllerConfig, 'downhillCornerBudgetSlopeAcceleration'>,
) {
    return smoothstep(clamp(
        slopeAcceleration / Math.max(1, config.downhillCornerBudgetSlopeAcceleration),
        0,
        1,
    ));
}

function getOverspeedUndersteerDemand(
    grade: PlayerCornerGrade,
    overspeedRatio: number,
    config: Pick<
        PlayerVehicleControllerConfig,
        'overspeedEasyUndersteerFullRatio' |
        'overspeedEasyUndersteerScale' |
        'overspeedMediumUndersteerScale' |
        'overspeedSharpUndersteerScale'
    >,
) {
    if (grade === 'easy') {
        const easyDemand = smoothstep(clamp(
            overspeedRatio / Math.max(0.01, config.overspeedEasyUndersteerFullRatio),
            0,
            1,
        ));
        return easyDemand * config.overspeedEasyUndersteerScale;
    }
    if (grade === 'medium') return overspeedRatio * config.overspeedMediumUndersteerScale;
    if (grade === 'sharp') return overspeedRatio * config.overspeedSharpUndersteerScale;

    return 0;
}

function getOverspeedSteerDemandRatio(
    steerAxis: number,
    config: Pick<
        PlayerVehicleControllerConfig,
        'overspeedUndersteerMinSteerInput' | 'overspeedUndersteerSteerInputFull'
    >,
) {
    const range = Math.max(
        0.01,
        config.overspeedUndersteerSteerInputFull - config.overspeedUndersteerMinSteerInput,
    );
    return smoothstep(clamp(
        (Math.abs(steerAxis) - config.overspeedUndersteerMinSteerInput) / range,
        0,
        1,
    ));
}

function getDriftEntryMode(brakeEntry: boolean, liftEntry: boolean): PlayerDriftEntryMode {
    return brakeEntry ? 'brake' : liftEntry ? 'lift' : 'none';
}

export function getLowSpeedLateralAuthority(displaySpeedKmh: number) {
    return getSpeedHandlingSample(getReferenceSpeedRatio(displaySpeedKmh)).lateralAuthority;
}

export function getLowSpeedVisualSteeringAuthority(displaySpeedKmh: number) {
    return getSpeedHandlingSample(getReferenceSpeedRatio(displaySpeedKmh)).visualAuthority;
}

export function getSpeedHandlingSample(speedRatio: number): PlayerSpeedHandlingState {
    const ratio = clamp(speedRatio, 0, 1);
    const upperIndex = SPEED_HANDLING_KNOTS.findIndex((knot) => knot.speedRatio >= ratio);

    if (upperIndex < 0) {
        return {
            ...SPEED_HANDLING_KNOTS[SPEED_HANDLING_KNOTS.length - 1],
            speedRatio: ratio,
        };
    }
    if (upperIndex === 0) return { ...SPEED_HANDLING_KNOTS[0], speedRatio: ratio };

    const lower = SPEED_HANDLING_KNOTS[upperIndex - 1];
    const upper = SPEED_HANDLING_KNOTS[upperIndex];
    const progress = smoothstep(clamp(
        (ratio - lower.speedRatio) / Math.max(0.000001, upper.speedRatio - lower.speedRatio),
        0,
        1,
    ));

    return {
        centeringScale: lerp(lower.centeringScale, upper.centeringScale, progress),
        gripAngleCap: lerp(lower.gripAngleCap, upper.gripAngleCap, progress),
        inputResponseScale: lerp(lower.inputResponseScale, upper.inputResponseScale, progress),
        lateralAuthority: lerp(lower.lateralAuthority, upper.lateralAuthority, progress),
        lateralVelocityCap: lerp(lower.lateralVelocityCap, upper.lateralVelocityCap, progress),
        neutralReturnVelocityCap: lerp(
            lower.neutralReturnVelocityCap,
            upper.neutralReturnVelocityCap,
            progress,
        ),
        speedRatio: ratio,
        steeringForceScale: lerp(lower.steeringForceScale, upper.steeringForceScale, progress),
        steeringSlewRate: lerp(lower.steeringSlewRate, upper.steeringSlewRate, progress),
        visualAuthority: lerp(lower.visualAuthority, upper.visualAuthority, progress),
        visualYawScale: lerp(lower.visualYawScale, upper.visualYawScale, progress),
    };
}

function getReferenceSpeedRatio(displaySpeedKmh: number) {
    return clamp(displaySpeedKmh / 225, 0, 1);
}

function getSmoothSpeedRatio(speedRatio: number) {
    return speedRatio * speedRatio * (3 - 2 * speedRatio);
}

function updatePlayerSpeed(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    context: PlayerVehicleUpdateContext,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    player.driftExitThrottleDelay = Math.max(0, player.driftExitThrottleDelay - seconds);
    const cornerDemand = getCornerDemandSample(player.speed, player.lateralOffset, context, config);
    const cornerIntensity = cornerDemand.cornerIntensity;
    const cornerGrade = cornerDemand.grade;
    const cornerSpeedLossScale = getCornerSpeedLossScale(cornerGrade, config);
    player.cornerDemand = cornerDemand;
    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const throttle = input.accelPressed ? 1 : 0;
    const brake = player.brakePressure;
    updateEngineState(player, throttle, brake, cornerIntensity, speedRatio, config, seconds);
    const launchRatio = config.launchThrottleFullSpeedRatio <= 0
        ? 1
        : smoothstep(clamp(speedRatio / config.launchThrottleFullSpeedRatio, 0, 1));
    const launchThrottleRatio = lerp(config.launchThrottleMinRatio, 1, launchRatio);
    const exitThrottleRatio = player.driftState === 'recovery' && player.driftExitThrottleDelay > 0
        ? 0
        : 1;
    const engineForce = throttle *
        config.engineAcceleration *
        config.engineProfile.accelerationScale *
        getDrivetrainForceScale(config.engineProfile, player.gearIndex) *
        launchThrottleRatio *
        exitThrottleRatio *
        player.engineTorqueScale *
        (1 - speedRatio * 0.45);
    const brakeForce = brake * config.braking;
    const engineBrakeForce = throttle > 0 || brake > 0 ? 0 : config.engineBrakeDeceleration;
    const rollingResistance = config.rollingResistance;
    const aeroDrag = player.speed * player.speed * config.aeroDrag;
    const outsideLineRatio = player.driftState === 'drift'
        ? smoothstep(clamp((0.5 - cornerDemand.lineQuality) / 0.5, 0, 1))
        : 0;
    const driftOverspeedScale = 1 +
        config.driftOutsideLineOverspeedPull * cornerIntensity * outsideLineRatio;
    const roadDirection = getDirection(context.currentCurve);
    const outwardRoadRatio = roadDirection === 0
        ? 0
        : Math.max(0, -roadDirection * player.lateralOffset / config.maxRoadOffset);
    const trajectoryScrubRatio = smoothstep(clamp(
        (outwardRoadRatio - config.overspeedSafetyMarginStartRatio) /
            Math.max(
                0.01,
                config.overspeedSafetyMarginFullRatio -
                    config.overspeedSafetyMarginStartRatio,
            ),
        0,
        1,
    ));
    const rawCornerLimitForce = cornerDemand.speedOverBudget > 0
        ? Math.min(
            config.cornerSpeedPull *
                cornerIntensity *
                cornerSpeedLossScale *
                driftOverspeedScale *
                cornerDemand.overspeedRatio,
            cornerDemand.speedOverBudget,
        )
        : 0;
    const cornerLimitForce = rawCornerLimitForce * trajectoryScrubRatio;
    const steeringScrubRatio = smoothstep(
        clamp(
            (Math.abs(player.steering) - config.steeringSpeedScrubThreshold) /
                (1 - config.steeringSpeedScrubThreshold),
            0,
            1,
        ),
    );
    const steeringCommandScrubRatio = smoothstep(clamp(
        (Math.abs(input.steerAxis) - config.steeringSpeedScrubThreshold) /
            (1 - config.steeringSpeedScrubThreshold),
        0,
        1,
    ));
    // Easy sweepers use a gentler steering command than medium/sharp corners.
    // Read that command directly so the within-budget band still has a small,
    // deterministic tire cost before the smoothed visual steering catches up.
    const effectiveSteeringScrubRatio = cornerGrade === 'easy'
        ? Math.max(steeringScrubRatio, steeringCommandScrubRatio * 0.65)
        : steeringScrubRatio;
    const steeringSpeedScrubForce = config.steeringSpeedScrub *
        speedRatio *
        Math.max(cornerIntensity, 0.18) *
        cornerSpeedLossScale *
        (1 + config.driftOutsideLineScrubScale * cornerIntensity * outsideLineRatio) *
        effectiveSteeringScrubRatio;
    const overspeedScrubGradeScale = cornerGrade === 'sharp'
        ? config.overspeedSharpSpeedScrubScale
        : 1;
    const overspeedUndersteerScrubForce = config.overspeedUndersteerSpeedScrub *
        cornerIntensity *
        cornerDemand.overspeedRatio *
        overspeedScrubGradeScale *
        trajectoryScrubRatio;
    const severeLineMissRatio = smoothstep(clamp(
        (0.5 - cornerDemand.lineQuality) / 0.5,
        0,
        1,
    ));
    const severeOverspeedScrubForce = config.cornerSevereOverspeedScrub *
        cornerIntensity *
        cornerDemand.severeOverspeedRatio *
        (1 + config.cornerSevereLineScrubScale * severeLineMissRatio) *
        trajectoryScrubRatio;
    // A downhill does not reduce grip by itself: production keeps this optional
    // term at zero and lets the carried speed raise the shared corner demand.
    // If tuned for a variant, it can only act on an already-over-budget corner.
    const downhillCornerOverspeedScrubForce = config.downhillCornerOverspeedScrub *
        cornerDemand.downhillCarryRatio *
        cornerIntensity *
        cornerDemand.overspeedRatio *
        trajectoryScrubRatio;
    const overspeedSafetyMarginScrubForce = config.overspeedSafetyMarginScrub *
        cornerIntensity *
        cornerDemand.severeOverspeedRatio *
        cornerDemand.safetyMarginRatio;
    const gripCounterRoadScrubForce = config.gripCounterRoadSpeedScrub *
        cornerIntensity *
        player.gripCounterRoadRatio;
    const overspeedTireScrubForce = cornerLimitForce + overspeedUndersteerScrubForce;
    const lineSafetyScrubForce = overspeedSafetyMarginScrubForce;
    const rawTotalCornerSpeedLossForce =
        steeringSpeedScrubForce +
        overspeedTireScrubForce +
        downhillCornerOverspeedScrubForce +
        severeOverspeedScrubForce +
        lineSafetyScrubForce +
        gripCounterRoadScrubForce;
    const tireLossBrakeRatio = player.driftState === 'grip'
        ? GRIP_TIRE_LOSS_BRAKE_RATIO
        : DRIFT_TIRE_LOSS_BRAKE_RATIO;
    const tireLossBudget = config.braking * tireLossBrakeRatio;
    const tireLossScale = rawTotalCornerSpeedLossForce > 0
        ? Math.min(1, tireLossBudget / rawTotalCornerSpeedLossForce)
        : 1;
    const totalCornerSpeedLossForce = rawTotalCornerSpeedLossForce * tireLossScale;
    player.cornerSpeedLoss = {
        counterRoadScrubForce: gripCounterRoadScrubForce * tireLossScale,
        downhillScrubForce: downhillCornerOverspeedScrubForce * tireLossScale,
        lineSafetyScrubForce: lineSafetyScrubForce * tireLossScale,
        overspeedTireScrubForce: overspeedTireScrubForce * tireLossScale,
        severeOverspeedScrubForce: severeOverspeedScrubForce * tireLossScale,
        steeringScrubForce: steeringSpeedScrubForce * tireLossScale,
        totalForce: totalCornerSpeedLossForce,
        trajectoryScrubRatio,
        zone: cornerDemand.speedLossZone,
    };
    const acceleration =
        engineForce +
        context.slopeAcceleration -
        brakeForce -
        engineBrakeForce -
        rollingResistance -
        aeroDrag -
        totalCornerSpeedLossForce;

    player.longitudinalForce = {
        aeroDrag,
        brakeForce,
        cornerLossForce: totalCornerSpeedLossForce,
        engineBrakeForce,
        engineForce,
        engineTorqueScale: player.engineTorqueScale,
        gearIndex: player.gearIndex,
        netAcceleration: acceleration,
        rollingResistance,
        rpm: player.rpm,
        slopeAcceleration: context.slopeAcceleration,
        speed: player.speed,
        speedRatio,
    };

    player.speed = clamp(
        player.speed + acceleration * seconds,
        config.brakeSpeed,
        config.accelSpeed,
    );

    if (input.brakePressed && player.speed < 2) {
        player.speed = 0;
    }

    updateEngineState(
        player,
        throttle,
        brake,
        cornerIntensity,
        clamp(player.speed / config.accelSpeed, 0, 1),
        config,
        seconds,
    );
}

function getDrivetrainForceScale(profile: VehicleEngineProfile, gearIndex: number) {
    if (
        profile.drivetrainModel !== 'physical' ||
        !profile.gearRatios?.length ||
        !profile.finalDriveRatio ||
        !profile.drivetrainEfficiency
    ) {
        return 1;
    }

    const ratio = profile.gearRatios[clamp(Math.round(gearIndex), 0, profile.gearRatios.length - 1)];
    const referenceRatio = profile.gearRatios[Math.min(3, profile.gearRatios.length - 1)];
    const calibration = profile.drivetrainForceScale ?? 1;

    return ratio / referenceRatio * profile.drivetrainEfficiency * calibration;
}

function getCornerSpeedLossScale(
    grade: PlayerCornerGrade,
    config: Pick<
        PlayerVehicleControllerConfig,
        'cornerEasySpeedLossScale' | 'cornerSharpSpeedLossScale'
    >,
) {
    if (grade === 'easy') return config.cornerEasySpeedLossScale;
    if (grade === 'sharp') return config.cornerSharpSpeedLossScale;

    return 1;
}

function getCornerLineRewardScale(
    grade: PlayerCornerGrade,
    config: Pick<PlayerVehicleControllerConfig, 'cornerSharpLineRewardScale'>,
) {
    if (grade === 'easy') return 0.35;
    if (grade === 'sharp') return config.cornerSharpLineRewardScale;

    return grade === 'medium' ? 1 : 0;
}

function createDefaultCornerDemandSample(speed: number, accelSpeed: number): PlayerCornerDemandSample {
    return {
        baseTargetSpeed: accelSpeed,
        cornerIntensity: 0,
        downhillCarryRatio: 0,
        grade: 'straight',
        lateralDemand: 0,
        lineQuality: 0.5,
        lineSpeedAdjustment: 0,
        overspeedRatio: 0,
        safetyMarginRatio: 0,
        severeOverspeedRatio: 0,
        speedOverBudget: 0,
        speedLossZone: 'within-budget',
        speedRatioToBudget: speed / accelSpeed,
        targetSpeed: accelSpeed,
    };
}

function createDefaultCornerSpeedLossSample(): PlayerCornerSpeedLossSample {
    return {
        counterRoadScrubForce: 0,
        downhillScrubForce: 0,
        lineSafetyScrubForce: 0,
        overspeedTireScrubForce: 0,
        severeOverspeedScrubForce: 0,
        steeringScrubForce: 0,
        totalForce: 0,
        trajectoryScrubRatio: 0,
        zone: 'within-budget',
    };
}

function getCornerLineQuality(lateralOffset: number, curve: number, targetOffset: number) {
    const curveIntensity = getCornerIntensity(curve);

    if (curveIntensity <= 0.08 || targetOffset <= 0) return 0.5;

    const insideRatio = clamp((lateralOffset * Math.sign(curve)) / targetOffset, -1, 1);

    return clamp(0.5 + insideRatio * 0.5, 0, 1);
}

function updateBrakePressure(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    const response = input.brakePressed ? config.brakeResponse : config.brakeReleaseResponse;
    const target = input.brakePressed ? 1 : 0;
    const blend = 1 - Math.exp(-response * seconds);

    player.brakePressure = lerp(player.brakePressure, target, blend);
}

function updateEngineState(
    player: PlayerVehicleState,
    throttle: number,
    brake: number,
    cornerIntensity: number,
    speedRatio: number,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    const profile = config.engineProfile;
    let gearIndex = clamp(Math.round(player.gearIndex), 0, profile.gears.length - 1);
    const previousGearIndex = gearIndex;
    let gear = profile.gears[gearIndex];
    const downshiftMargin = 0.025;
    const upshiftMargin = 0.005;
    const usesPhysicalShiftSchedule = profile.drivetrainModel === 'physical';

    // Physical profiles use mechanical RPM as the single powered shift
    // boundary. Arcade profiles retain their authored speed envelope and RPM
    // target because those gear ranges are presentation data rather than real
    // ratios.
    while (
        gearIndex < profile.gears.length - 1 &&
        throttle > 0 &&
        (usesPhysicalShiftSchedule || speedRatio > gear.speedRatioMax - upshiftMargin) &&
        getGearRpm(profile, gearIndex, speedRatio) >= profile.shiftUpRpm
    ) {
        gearIndex += 1;
        gear = profile.gears[gearIndex];
    }

    while (
        gearIndex > 0 &&
        (usesPhysicalShiftSchedule
            ? getGearRpm(profile, gearIndex, speedRatio) < getPhysicalDownshiftRpm(profile, gearIndex)
            : speedRatio < gear.speedRatioMin - downshiftMargin)
    ) {
        gearIndex -= 1;
        gear = profile.gears[gearIndex];
    }

    const shiftDirection = getDirection(gearIndex - previousGearIndex);
    if (shiftDirection !== 0) {
        player.shiftDirection = shiftDirection;
        player.shiftTimer = shiftDirection > 0 ? SHIFT_UP_DURATION_SECONDS : SHIFT_DOWN_DURATION_SECONDS;
    } else if (player.shiftTimer > 0) {
        player.shiftTimer = Math.max(0, player.shiftTimer - seconds);
        if (player.shiftTimer <= 0) {
            player.shiftDirection = 0;
        }
    } else {
        player.shiftDirection = 0;
    }

    const baseRpm = getGearRpm(profile, gearIndex, speedRatio);
    const throttleLift = throttle > 0 ? getThrottleRpmLift(profile.induction) : 0;
    const brakeDrop = brake > 0 ? 360 : 0;
    const baseTargetRpm = baseRpm + throttleLift - brakeDrop;
    const shouldEnterFuelCut = player.rpm >= profile.fuelCutStartRpm && throttle > 0;

    if (shouldEnterFuelCut) {
        player.fuelCutActive = true;
        player.fuelCutTimer = 0.12;
    }

    const shiftedTargetRpm = shiftDirection > 0 && profile.drivetrainModel !== 'physical'
        ? Math.max(baseTargetRpm, profile.shiftDropRpm)
        : baseTargetRpm;
    const targetRpm = clamp(
        player.fuelCutActive ? Math.min(shiftedTargetRpm, profile.fuelCutReturnRpm) : shiftedTargetRpm,
        profile.idleRpm,
        profile.maxRpm,
    );
    const rpmBlend = 1 - Math.exp(-config.rpmResponse * seconds);

    player.gearIndex = gearIndex;
    player.rpm = lerp(player.rpm, targetRpm, rpmBlend);

    if (player.fuelCutTimer > 0) {
        player.fuelCutTimer = Math.max(0, player.fuelCutTimer - seconds);
    }

    if (player.rpm <= profile.fuelCutReturnRpm || player.fuelCutTimer <= 0) {
        player.fuelCutActive = false;
    }

    player.torqueScale = getTorqueScale(profile, player.rpm);
    player.boostRatio = player.fuelCutActive
        ? 0
        : getBoostRatio(profile, player.rpm, throttle, brake, cornerIntensity, speedRatio);
    player.shiftCutRatio = player.fuelCutActive ? 0 : getShiftCutRatio(player);
    player.engineTorqueScale = (
        getEngineTorqueScale(player.torqueScale, player.fuelCutActive) +
        player.boostRatio * 0.12
    ) * (1 - player.shiftCutRatio);
}

function getThrottleRpmLift(induction: VehicleEngineProfile['induction']) {
    if (induction === 'na') return 240;
    if (induction === 'single-turbo') return 150;

    return 110;
}

function getEngineTorqueScale(torqueScale: number, fuelCutActive: boolean) {
    const torqueMultiplier = lerp(0.7, 1.14, clamp(torqueScale, 0, 1));

    return fuelCutActive ? torqueMultiplier * 0.45 : torqueMultiplier;
}

function getShiftCutRatio(player: PlayerVehicleState) {
    if (player.shiftTimer <= 0 || player.shiftDirection === 0) return 0;

    const duration = player.shiftDirection > 0 ? SHIFT_UP_DURATION_SECONDS : SHIFT_DOWN_DURATION_SECONDS;
    const peakCut = player.shiftDirection > 0 ? SHIFT_UP_CUT_RATIO : SHIFT_DOWN_CUT_RATIO;
    const timerRatio = clamp(player.shiftTimer / duration, 0, 1);

    return peakCut * Math.pow(timerRatio, SHIFT_CUT_DECAY_POWER);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number) {
    return start + (end - start) * amount;
}

function smoothstep(value: number) {
    return value * value * (3 - 2 * value);
}

function approach(current: number, target: number, rate: number, seconds: number) {
    const delta = rate * seconds;

    if (current < target) return Math.min(target, current + delta);

    return Math.max(target, current - delta);
}

function getDirection(value: number): -1 | 0 | 1 {
    if (value < 0) return -1;
    if (value > 0) return 1;

    return 0;
}
