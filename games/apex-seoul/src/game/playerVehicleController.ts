import {
    getBoostRatio,
    getGearRpm,
    getInitialGearIndex,
    getTorqueScale,
    type VehicleEngineProfile,
} from './engineProfile.ts';
import type { PlayerDriftEntryMode, PlayerDriftState, PlayerVehicleState } from './vehicle';

export type PlayerVehicleControllerConfig = {
    accelSpeed: number;
    aeroDrag: number;
    brakeSpeed: number;
    braking: number;
    brakeReleaseResponse: number;
    brakeResponse: number;
    centeringResponse: number;
    cornerAccelSpeedDrop: number;
    cornerLineSpeedBonus: number;
    cornerLineTargetOffset: number;
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
    driftLiftEntrySpeedLoss: number;
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
    driftMaxSlipAngle: number;
    driftMinCornerIntensity: number;
    driftMinSpeedRatio: number;
    driftMinSteerInput: number;
    driftRecoveryRate: number;
    engineAcceleration: number;
    engineBrakeDeceleration: number;
    engineProfile: VehicleEngineProfile;
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
        cornerLineQuality: 0.5,
        counterSteerTimer: 0,
        counterSteerLateralVelocity: 0,
        counterSteerEntryDriftVelocity: 0,
        counterTrimRatio: 0,
        engineTorqueScale: getEngineTorqueScale(torqueScale, false),
        driftDirection: 0,
        driftBaseLateralVelocity: 0,
        driftEntryLateralTarget: 0,
        driftEntryMode: 'none',
        driftLateralVelocity: 0,
        driftRatio: 0,
        driftState: 'grip',
        driftStateTimer: 0,
        driftTransitionArmed: false,
        driftTransitionDirection: 0,
        driftTransitionAwaitingCounter: false,
        driftTransitionLiftTimer: 0,
        fuelCutActive: false,
        fuelCutTimer: 0,
        gearIndex,
        gripSteerAngleLimit: 1,
        lateralOffset: 0,
        rpm,
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
    updateDriftState(player, input, context, config, seconds);
    updateDriftLateralMotion(player, input, config, seconds);

    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
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
        ? getGripSteerAngleLimit(speedRatio, config)
        : 1;
    const gripSteerAxis = input.steerAxis * player.gripSteerAngleLimit;
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
    const centeringForce = -player.lateralOffset * config.centeringResponse * (1 - player.driftRatio * 0.34);
    const steeringForce = gripSteerAxis * config.steerAcceleration * steerForceRatio * counterSteerScale;
    const curveForce = -context.currentCurve * speedRatio * config.curveDriftAcceleration * (1 + player.driftRatio * 0.28);
    const dampingForce = -player.steeringVelocity * config.steerDamping * (1 - player.driftRatio * 0.2);

    player.steeringVelocity += (steeringForce + centeringForce + curveForce + dampingForce) * seconds;
    const smoothSpeed = getSmoothSpeedRatio(speedRatio);
    const baseLateralVelocityLimit = lerp(
        config.steerAcceleration,
        config.highSpeedLateralVelocityCap,
        smoothSpeed,
    );
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
    player.lateralOffset += (player.steeringVelocity + player.driftLateralVelocity) * seconds;
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
                const entrySpeedLoss = config.driftEntrySpeedLoss +
                    (player.driftEntryMode === 'lift' ? config.driftLiftEntrySpeedLoss : 0);
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
                setDriftState(player, 'recovery');
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
                setDriftState(player, 'recovery');
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
                    setDriftState(player, 'recovery');
                }
            } else if (player.driftTransitionAwaitingCounter) {
                player.driftTransitionLiftTimer += seconds;
                if (input.accelPressed || player.driftTransitionLiftTimer >= config.driftTransitionInputWindow) {
                    setDriftState(player, 'recovery');
                } else if (
                    counterSteering &&
                    player.counterSteerTimer >= config.driftTransitionArmDuration
                ) {
                    player.driftTransitionAwaitingCounter = false;
                    player.driftTransitionArmed = true;
                    player.driftTransitionDirection = steerDirection;
                }
            } else if (!input.accelPressed && player.throttleWasPressed) {
                // A lift while already counter-steering is a reliable drift exit.
                // Direction changes require a neutral lift followed by a fresh counter input.
                if (counterSteering || steerDirection !== 0 || player.brakePressure >= 0.2) {
                    setDriftState(player, 'recovery');
                } else {
                    player.driftTransitionAwaitingCounter = true;
                    player.driftTransitionLiftTimer = 0;
                }
            } else if (
                steerDirection === 0 && player.brakePressure < 0.2 && !input.accelPressed
            ) {
                setDriftState(player, 'recovery');
            } else {
                const targetRatio = steerDirection === player.driftDirection
                    ? 0.82
                    : counterSteering
                        ? 0.48
                        : 0.68;
                player.driftRatio = approach(player.driftRatio, targetRatio, config.driftBuildRate, seconds);
                player.traction = approach(player.traction, 0.42, config.driftBuildRate, seconds);
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

function setDriftState(player: PlayerVehicleState, state: PlayerDriftState) {
    player.driftState = state;
    player.driftStateTimer = 0;

    if (state !== 'drift') {
        player.driftTransitionArmed = false;
        player.driftTransitionDirection = 0;
        player.driftTransitionAwaitingCounter = false;
        player.driftTransitionLiftTimer = 0;
    }
}

export function getCornerIntensity(curve: number) {
    return clamp(Math.abs(curve) / 0.72, 0, 1);
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
    const cornerIntensity = getCornerIntensity(context.currentCurve);
    const cornerLineQuality = getCornerLineQuality(
        player.lateralOffset,
        context.currentCurve,
        config.cornerLineTargetOffset,
    );
    player.cornerLineQuality = cornerLineQuality;
    const lineSpeedAdjustment = (cornerLineQuality - 0.5) * 2 *
        config.cornerLineSpeedBonus *
        cornerIntensity;
    const cornerAccelSpeed = config.accelSpeed -
        cornerIntensity * config.cornerAccelSpeedDrop +
        lineSpeedAdjustment;
    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const throttle = input.accelPressed ? 1 : 0;
    const brake = player.brakePressure;
    updateEngineState(player, throttle, brake, cornerIntensity, speedRatio, config, seconds);
    const launchRatio = config.launchThrottleFullSpeedRatio <= 0
        ? 1
        : smoothstep(clamp(speedRatio / config.launchThrottleFullSpeedRatio, 0, 1));
    const launchThrottleRatio = lerp(config.launchThrottleMinRatio, 1, launchRatio);
    const engineForce = throttle *
        config.engineAcceleration *
        launchThrottleRatio *
        player.engineTorqueScale *
        (1 - speedRatio * 0.45);
    const brakeForce = brake * config.braking;
    const engineBrakeForce = throttle > 0 || brake > 0 ? 0 : config.engineBrakeDeceleration;
    const rollingResistance = config.rollingResistance;
    const aeroDrag = player.speed * player.speed * config.aeroDrag;
    const cornerSpeedLimit = cornerAccelSpeed;
    const cornerLimitForce = player.speed > cornerSpeedLimit
        ? Math.min(
            config.cornerSpeedPull * cornerIntensity * lerp(1.25, 0.72, cornerLineQuality),
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
        steeringScrubRatio;
    const acceleration =
        engineForce +
        context.slopeAcceleration -
        brakeForce -
        engineBrakeForce -
        rollingResistance -
        aeroDrag -
        cornerLimitForce -
        steeringSpeedScrubForce;

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
    player.engineTorqueScale = getEngineTorqueScale(player.torqueScale, player.fuelCutActive) +
        player.boostRatio * 0.12;
}

function getThrottleRpmLift(induction: VehicleEngineProfile['induction']) {
    if (induction === 'na') return 240;
    if (induction === 'single-turbo') return 150;

    return 110;
}

function getEngineTorqueScale(torqueScale: number, fuelCutActive: boolean) {
    const torqueMultiplier = lerp(0.78, 1.08, clamp(torqueScale, 0, 1));

    return fuelCutActive ? torqueMultiplier * 0.45 : torqueMultiplier;
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
