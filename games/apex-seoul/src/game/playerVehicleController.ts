import {
    getBoostRatio,
    getDisplaySpeedKmh,
    getGearRpm,
    getInitialGearIndex,
    getTorqueScale,
    type VehicleEngineProfile,
} from './engineProfile.ts';
import type {
    PlayerCornerGrade,
    PlayerDriftEntryMode,
    PlayerDriftState,
    PlayerVehicleState,
} from './vehicle';

const SHIFT_CUT_DECAY_POWER = 0.9;
const SHIFT_DOWN_CUT_RATIO = 0.16;
const SHIFT_DOWN_DURATION_SECONDS = 0.1;
const SHIFT_UP_CUT_RATIO = 0.42;
const SHIFT_UP_DURATION_SECONDS = 0.22;
const LOW_SPEED_LATERAL_LOCK_KMH = 5;
const LOW_SPEED_LATERAL_FULL_KMH = 60;
const LOW_SPEED_DRIFT_LOCK_KMH = 45;
const LOW_SPEED_DRIFT_VELOCITY_DECAY = 18;
const LOW_SPEED_VISUAL_STEERING_LOCK_KMH = 5;
const LOW_SPEED_VISUAL_STEERING_FULL_KMH = 60;

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
    cornerAccelSpeedDrop: number;
    cornerEasyIntensityThreshold: number;
    cornerEasySpeedLossScale: number;
    cornerLineSpeedBonus: number;
    cornerLineTargetOffset: number;
    cornerSharpIntensityThreshold: number;
    cornerSharpLineRewardScale: number;
    cornerSharpSpeedLossScale: number;
    cornerSpeedPull: number;
    curveDriftAcceleration: number;
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
    overspeedMediumUndersteerScale: number;
    overspeedUndersteerMinSteerInput: number;
    overspeedSafetyMarginStartRatio: number;
    overspeedSafetyMarginFullRatio: number;
    overspeedSafetyMarginScrub: number;
    overspeedSharpLateralScale: number;
    overspeedSharpSpeedScrubScale: number;
    overspeedSharpUndersteerScale: number;
    overspeedUndersteerLateralBuildRate: number;
    overspeedUndersteerLateralMaxSpeed: number;
    overspeedUndersteerLateralRecoveryRate: number;
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
    slopeAcceleration: number;
};

export function createDefaultPlayerVehicleState(
    cruiseSpeed: number,
    engineProfile: VehicleEngineProfile,
    accelSpeed: number,
): PlayerVehicleState {
    const speedRatio = clamp(cruiseSpeed / accelSpeed, 0, 1);
    const gearIndex = getInitialGearIndex(engineProfile, speedRatio);
    const rpm = getGearRpm(engineProfile, gearIndex, speedRatio);
    const torqueScale = getTorqueScale(engineProfile, rpm);

    return {
        brakePressure: 0,
        boostRatio: 0,
        cornerGrade: 'straight',
        cornerLineQuality: 0.5,
        cornerSafetyMarginRatio: 0,
        cornerSpeedBudget: accelSpeed,
        cornerSpeedOverBudget: 0,
        counterSteerTimer: 0,
        counterSteerLateralVelocity: 0,
        counterSteerEntryDriftVelocity: 0,
        counterTrimRatio: 0,
        downhillCornerCarryRatio: 0,
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
        guardrailContactInset: 0,
        guardrailContactDirection: 0,
        guardrailContactTimer: 0,
        guardrailImpactCount: 0,
        guardrailImpactCue: 0,
        guardrailShoulderRatio: 0,
        gripCounterRoadLateralVelocity: 0,
        gripCounterRoadRatio: 0,
        gripSteerAngleLimit: 1,
        lateralOffset: 0,
        lowSpeedLateralAuthority: getLowSpeedLateralAuthority(
            getDisplaySpeedKmh(cruiseSpeed, accelSpeed, engineProfile),
        ),
        lowSpeedVisualSteeringAuthority: getLowSpeedVisualSteeringAuthority(
            getDisplaySpeedKmh(cruiseSpeed, accelSpeed, engineProfile),
        ),
        centeringCounterHoldTimer: 0,
        centeringForce: 0,
        centeringReleaseStartScale: 0.45,
        centeringReleaseTimer: 0,
        lateralCenteringScale: 0.45,
        lateralCenteringTargetScale: 0.45,
        overspeedUndersteerRatio: 0,
        overspeedUndersteerTargetRatio: 0,
        overspeedUndersteerLateralVelocity: 0,
        rpm,
        shiftCutRatio: 0,
        shiftDirection: 0,
        shiftTimer: 0,
        speed: cruiseSpeed,
        slipAngle: 0,
        steering: 0,
        steeringVelocity: 0,
        torqueScale,
        traction: 1,
        throttleWasPressed: false,
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
    const displaySpeedKmh = getDisplaySpeedKmh(
        player.speed,
        config.accelSpeed,
        config.engineProfile,
    );
    const lowSpeedLateralAuthority = getLowSpeedLateralAuthority(displaySpeedKmh);
    player.lowSpeedLateralAuthority = lowSpeedLateralAuthority;
    player.lowSpeedVisualSteeringAuthority = getLowSpeedVisualSteeringAuthority(displaySpeedKmh);
    updateDriftState(player, input, context, config, seconds);
    if (displaySpeedKmh < LOW_SPEED_DRIFT_LOCK_KMH && player.driftState !== 'grip') {
        setDriftState(player, 'recovery', config);
    }
    updateDriftLateralMotion(player, input, config, seconds);

    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const overspeedBandScale = getOverspeedUndersteerScale(player.cornerGrade, config);
    const budgetOverspeedTarget = smoothstep(clamp(
        player.cornerSpeedOverBudget / config.overspeedUndersteerSpeedWindow,
        0,
        1,
    ));
    const overspeedUndersteerActive = player.driftState === 'grip' &&
        input.accelPressed &&
        Math.abs(input.steerAxis) >= config.overspeedUndersteerMinSteerInput;
    player.overspeedUndersteerTargetRatio = overspeedUndersteerActive
        ? budgetOverspeedTarget * overspeedBandScale
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
    const overspeedLateralGradeScale = player.cornerGrade === 'sharp'
        ? config.overspeedSharpLateralScale
        : 1;
    const downhillLateralScale = 1 +
        player.downhillCornerCarryRatio * config.downhillCornerLateralScale;
    const overspeedOutwardTarget = player.overspeedUndersteerRatio > 0
        ? -getDirection(context.currentCurve) *
            config.overspeedUndersteerLateralMaxSpeed *
            speedRatio *
            overspeedLateralGradeScale *
            downhillLateralScale *
            player.overspeedUndersteerRatio
        : 0;
    player.overspeedUndersteerLateralVelocity = approach(
        player.overspeedUndersteerLateralVelocity,
        overspeedOutwardTarget,
        player.overspeedUndersteerRatio > 0
            ? config.overspeedUndersteerLateralBuildRate
            : config.overspeedUndersteerLateralRecoveryRate,
        seconds,
    );
    const steerForceRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.highSpeedSteerForceDrop,
    );
    const steerVisualRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.highSpeedSteerVisualDrop,
    );
    const curveVisualRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.curveSteeringHighSpeedDrop,
    );
    player.gripSteerAngleLimit = player.driftState === 'grip'
        ? getGripSteerAngleLimit(speedRatio, config) * overspeedSteerScale
        : 1;
    const gripSteerAxis = input.steerAxis * player.gripSteerAngleLimit;
    const inputSteerDirection = getDirection(input.steerAxis);
    const roadSteerDirection = getDirection(context.currentCurve);
    const gripCounterRoadActive = player.driftState === 'grip' &&
        roadSteerDirection !== 0 &&
        inputSteerDirection !== 0 &&
        inputSteerDirection !== roadSteerDirection;
    player.gripCounterRoadRatio = gripCounterRoadActive
        ? smoothstep(clamp(Math.abs(input.steerAxis), 0, 1)) * cornerIntensity
        : 0;
    const gripCounterRoadTarget = gripCounterRoadActive
        ? -roadSteerDirection *
            config.gripCounterRoadLateralMaxSpeed *
            speedRatio *
            lowSpeedLateralAuthority *
            player.gripCounterRoadRatio
        : 0;
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
        ? player.centeringReleaseTimer < config.centeringReleaseDelay
            ? player.centeringReleaseStartScale
            : config.centeringReleaseScale
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
    const centeringForce = -player.lateralOffset * config.centeringResponse *
        player.lateralCenteringScale * (1 - player.driftRatio * 0.34) *
        lowSpeedLateralAuthority;
    player.centeringForce = centeringForce;
    const steeringForce = gripSteerAxis *
        config.steerAcceleration *
        steerForceRatio *
        counterSteerScale *
        lowSpeedLateralAuthority;
    const curveForce = -context.currentCurve *
        speedRatio *
        config.curveDriftAcceleration *
        (1 + player.driftRatio * 0.28) *
        lowSpeedLateralAuthority;
    const dampingForce = -player.steeringVelocity * config.steerDamping * (1 - player.driftRatio * 0.2);

    player.steeringVelocity += (
        steeringForce +
        centeringForce +
        curveForce +
        dampingForce
    ) * seconds;
    const smoothSpeed = getSmoothSpeedRatio(speedRatio);
    const baseLateralVelocityLimit = lerp(
        config.steerAcceleration,
        config.highSpeedLateralVelocityCap,
        smoothSpeed,
    ) * lowSpeedLateralAuthority;
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
    if (
        neutralRelease &&
        lateralOffsetDirection !== 0 &&
        player.steeringVelocity * lateralOffsetDirection < -config.centeringNeutralInwardVelocityCap
    ) {
        player.steeringVelocity = -lateralOffsetDirection * config.centeringNeutralInwardVelocityCap;
    }
    player.counterSteerLateralVelocity = counterSteering ? player.steeringVelocity : 0;
    if (lowSpeedLateralAuthority <= 0) {
        player.steeringVelocity = 0;
        player.counterSteerLateralVelocity = 0;
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
        player.driftLateralVelocity +
        player.gripCounterRoadLateralVelocity +
        player.overspeedUndersteerLateralVelocity
    ) * lowSpeedLateralAuthority * seconds;
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

    const targetSteering = clamp(
        gripSteerAxis * steerVisualRatio +
            (player.steeringVelocity / config.steerAcceleration) * config.steeringVelocityCue -
            context.currentCurve * speedRatio * curveVisualRatio * config.curveSteeringCue,
        -1,
        1,
    );
    const inputResponseRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.highSpeedInputResponseDrop,
    );
    const steeringBlend = 1 - Math.exp(-config.inputResponse * inputResponseRatio * seconds);
    const nextSteering = lerp(player.steering, targetSteering, steeringBlend);
    const steeringSlewRate = lerp(
        24,
        config.highSpeedSteeringSlewRate,
        smoothSpeed,
    );
    const maxSteeringDelta = steeringSlewRate * seconds;

    player.steering = clamp(
        nextSteering,
        player.steering - maxSteeringDelta,
        player.steering + maxSteeringDelta,
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
        const lineMissRatio = smoothstep(clamp((0.6 - player.cornerLineQuality) / 0.6, 0, 1));
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
    const gradeScale = player.cornerGrade === 'easy'
        ? config.driftEasyEntrySpeedLossScale
        : player.cornerGrade === 'sharp'
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
    // The dashboard uses a smoothstep display curve. These internal ratios map
    // to the P0 references of approximately 195 / 160 / 130 km/h for Raven.
    if (grade === 'easy') return config.accelSpeed * 0.866;

    const downhillCarryRatio = getDownhillCornerCarryRatio(slopeAcceleration, config);
    const reduction = downhillCarryRatio * config.downhillCornerBudgetMaxReduction;
    if (grade === 'medium') return config.accelSpeed * 0.697 * (1 - reduction);
    if (grade === 'sharp') return config.accelSpeed * 0.59 * (1 - reduction);

    return config.accelSpeed;
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

function getOverspeedUndersteerScale(
    grade: PlayerCornerGrade,
    config: Pick<
        PlayerVehicleControllerConfig,
        'overspeedMediumUndersteerScale' | 'overspeedSharpUndersteerScale'
    >,
) {
    if (grade === 'medium') return config.overspeedMediumUndersteerScale;
    if (grade === 'sharp') return config.overspeedSharpUndersteerScale;

    return 0;
}

export function getGripSteerAngleLimit(
    speedRatio: number,
    config: Pick<PlayerVehicleControllerConfig, 'gripSteerAngleHighSpeedCap' | 'gripSteerAngleHighSpeedStartRatio'>,
) {
    const start = config.gripSteerAngleHighSpeedStartRatio;
    const progress = smoothstep(clamp((speedRatio - start) / Math.max(0.01, 1 - start), 0, 1));

    return lerp(1, config.gripSteerAngleHighSpeedCap, progress);
}

function getDriftEntryMode(brakeEntry: boolean, liftEntry: boolean): PlayerDriftEntryMode {
    return brakeEntry ? 'brake' : liftEntry ? 'lift' : 'none';
}

export function getHighSpeedSteeringRatio(speedRatio: number, maxDrop: number) {
    const smoothSpeed = getSmoothSpeedRatio(speedRatio);

    return clamp(1 - smoothSpeed * maxDrop, 1 - maxDrop, 1);
}

export function getLowSpeedLateralAuthority(displaySpeedKmh: number) {
    return smoothstep(clamp(
        (displaySpeedKmh - LOW_SPEED_LATERAL_LOCK_KMH) /
            (LOW_SPEED_LATERAL_FULL_KMH - LOW_SPEED_LATERAL_LOCK_KMH),
        0,
        1,
    ));
}

export function getLowSpeedVisualSteeringAuthority(displaySpeedKmh: number) {
    return smoothstep(clamp(
        (displaySpeedKmh - LOW_SPEED_VISUAL_STEERING_LOCK_KMH) /
            (LOW_SPEED_VISUAL_STEERING_FULL_KMH - LOW_SPEED_VISUAL_STEERING_LOCK_KMH),
        0,
        1,
    ));
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
    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const cornerGrade = getCornerGrade(cornerIntensity, config);
    const downhillCornerCarryRatio = getDownhillCornerCarryRatio(context.slopeAcceleration, config);
    const cornerSpeedBudget = getCornerSpeedBudget(cornerGrade, config, context.slopeAcceleration);
    const cornerSpeedLossScale = getCornerSpeedLossScale(cornerGrade, config);
    const cornerLineRewardScale = getCornerLineRewardScale(cornerGrade, config);
    const cornerLineQuality = getCornerLineQuality(
        player.lateralOffset,
        context.currentCurve,
        config.cornerLineTargetOffset,
    );
    player.cornerGrade = cornerGrade;
    player.cornerLineQuality = cornerLineQuality;
    player.downhillCornerCarryRatio = downhillCornerCarryRatio;
    player.cornerSpeedBudget = cornerSpeedBudget;
    player.cornerSpeedOverBudget = Math.max(0, player.speed - cornerSpeedBudget);
    player.cornerSafetyMarginRatio = smoothstep(clamp(
        (Math.abs(player.lateralOffset / config.maxRoadOffset) - config.overspeedSafetyMarginStartRatio) /
            Math.max(0.01, config.overspeedSafetyMarginFullRatio - config.overspeedSafetyMarginStartRatio),
        0,
        1,
    ));
    const lineSpeedAdjustment = (cornerLineQuality - 0.5) * 2 *
        config.cornerLineSpeedBonus *
        cornerIntensity *
        cornerLineRewardScale;
    const cornerBaseSpeed = getCornerBaseSpeedLimit(cornerIntensity, cornerGrade, config);
    const cornerAccelSpeed = (cornerBaseSpeed + lineSpeedAdjustment) *
        (1 - downhillCornerCarryRatio * config.downhillCornerBudgetMaxReduction);
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
        launchThrottleRatio *
        exitThrottleRatio *
        player.engineTorqueScale *
        (1 - speedRatio * 0.45);
    const brakeForce = brake * config.braking;
    const engineBrakeForce = throttle > 0 || brake > 0 ? 0 : config.engineBrakeDeceleration;
    const rollingResistance = config.rollingResistance;
    const aeroDrag = player.speed * player.speed * config.aeroDrag;
    const cornerSpeedLimit = cornerAccelSpeed;
    const outsideLineRatio = player.driftState === 'drift'
        ? smoothstep(clamp((0.5 - cornerLineQuality) / 0.5, 0, 1))
        : 0;
    const driftOverspeedScale = 1 +
        config.driftOutsideLineOverspeedPull * cornerIntensity * outsideLineRatio;
    const cornerLimitForce = player.speed > cornerSpeedLimit
        ? Math.min(
            config.cornerSpeedPull *
                cornerIntensity *
                cornerSpeedLossScale *
                driftOverspeedScale *
                lerp(1.25, 0.72, cornerLineQuality),
            player.speed - cornerSpeedLimit,
        )
        : 0;
    const steeringScrubRatio = smoothstep(
        clamp(
            (Math.abs(player.steering) - config.steeringSpeedScrubThreshold) /
                (1 - config.steeringSpeedScrubThreshold),
            0,
            1,
        ),
    );
    const steeringSpeedScrubForce = config.steeringSpeedScrub *
        speedRatio *
        Math.max(cornerIntensity, 0.18) *
        cornerSpeedLossScale *
        (1 + config.driftOutsideLineScrubScale * cornerIntensity * outsideLineRatio) *
        steeringScrubRatio;
    const overspeedScrubGradeScale = cornerGrade === 'sharp'
        ? config.overspeedSharpSpeedScrubScale
        : 1;
    const overspeedUndersteerScrubForce = config.overspeedUndersteerSpeedScrub *
        cornerIntensity *
        player.overspeedUndersteerRatio *
        overspeedScrubGradeScale;
    // A downhill does not reduce available grip by itself. It raises the speed
    // carried into the corner, so only an already-over-budget corner gets this
    // additional scrub. Straight-line downhill acceleration remains intact.
    const downhillCornerOverspeedScrubForce = config.downhillCornerOverspeedScrub *
        downhillCornerCarryRatio *
        cornerIntensity *
        player.overspeedUndersteerRatio;
    const overspeedSafetyMarginScrubForce = config.overspeedSafetyMarginScrub *
        cornerIntensity *
        player.overspeedUndersteerRatio *
        player.cornerSafetyMarginRatio;
    const gripCounterRoadScrubForce = config.gripCounterRoadSpeedScrub *
        cornerIntensity *
        player.gripCounterRoadRatio;
    const acceleration =
        engineForce +
        context.slopeAcceleration -
        brakeForce -
        engineBrakeForce -
        rollingResistance -
        aeroDrag -
        cornerLimitForce -
        steeringSpeedScrubForce -
        overspeedUndersteerScrubForce -
        downhillCornerOverspeedScrubForce -
        overspeedSafetyMarginScrubForce -
        gripCounterRoadScrubForce;

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

function getCornerBaseSpeedLimit(
    cornerIntensity: number,
    cornerGrade: PlayerCornerGrade,
    config: Pick<
        PlayerVehicleControllerConfig,
        | 'accelSpeed'
        | 'cornerAccelSpeedDrop'
        | 'cornerEasySpeedLossScale'
        | 'cornerSharpSpeedLossScale'
    >,
) {
    return config.accelSpeed -
        cornerIntensity * config.cornerAccelSpeedDrop * getCornerSpeedLossScale(cornerGrade, config);
}

function getCornerLineRewardScale(
    grade: PlayerCornerGrade,
    config: Pick<PlayerVehicleControllerConfig, 'cornerSharpLineRewardScale'>,
) {
    if (grade === 'easy') return 0.35;
    if (grade === 'sharp') return config.cornerSharpLineRewardScale;

    return grade === 'medium' ? 1 : 0;
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

    while (gearIndex < profile.gears.length - 1 && speedRatio > gear.speedRatioMax - upshiftMargin) {
        gearIndex += 1;
        gear = profile.gears[gearIndex];
    }

    while (gearIndex > 0 && speedRatio < gear.speedRatioMin - downshiftMargin) {
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

    const targetRpm = clamp(
        player.fuelCutActive ? Math.min(baseTargetRpm, profile.fuelCutReturnRpm) : baseTargetRpm,
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
