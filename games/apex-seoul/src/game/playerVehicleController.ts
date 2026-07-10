import {
    getBoostRatio,
    getGearRpm,
    getInitialGearIndex,
    getTorqueScale,
    type VehicleEngineProfile,
} from './engineProfile.ts';
import type { PlayerVehicleState } from './vehicle';

export type PlayerVehicleControllerConfig = {
    accelSpeed: number;
    aeroDrag: number;
    brakeSpeed: number;
    braking: number;
    centeringResponse: number;
    cornerAccelSpeedDrop: number;
    cornerSpeedPull: number;
    curveDriftAcceleration: number;
    curveSteeringHighSpeedDrop: number;
    curveSteeringCue: number;
    engineAcceleration: number;
    engineBrakeDeceleration: number;
    engineProfile: VehicleEngineProfile;
    highSpeedInputResponseDrop: number;
    highSpeedLateralVelocityCap: number;
    highSpeedSteeringSlewRate: number;
    highSpeedSteerForceDrop: number;
    highSpeedSteerVisualDrop: number;
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
        boostRatio: 0,
        engineTorqueScale: getEngineTorqueScale(torqueScale, false),
        fuelCutActive: false,
        fuelCutTimer: 0,
        gearIndex,
        lateralOffset: 0,
        rpm,
        speed: cruiseSpeed,
        steering: 0,
        steeringVelocity: 0,
        torqueScale,
    };
}

export function updatePlayerVehicle(
    player: PlayerVehicleState,
    input: PlayerVehicleInput,
    context: PlayerVehicleUpdateContext,
    config: PlayerVehicleControllerConfig,
    seconds: number,
) {
    updatePlayerSpeed(player, input, context, config, seconds);

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
    const centeringForce = -player.lateralOffset * config.centeringResponse;
    const steeringForce = input.steerAxis * config.steerAcceleration * steerForceRatio;
    const curveForce = -context.currentCurve * speedRatio * config.curveDriftAcceleration;
    const dampingForce = -player.steeringVelocity * config.steerDamping;

    player.steeringVelocity += (steeringForce + centeringForce + curveForce + dampingForce) * seconds;
    const smoothSpeed = getSmoothSpeedRatio(speedRatio);
    const lateralVelocityLimit = lerp(
        config.steerAcceleration,
        config.highSpeedLateralVelocityCap,
        smoothSpeed,
    );
    player.steeringVelocity = clamp(
        player.steeringVelocity,
        -lateralVelocityLimit,
        lateralVelocityLimit,
    );
    player.lateralOffset += player.steeringVelocity * seconds;
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
        input.steerAxis * steerVisualRatio +
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

export function getCornerIntensity(curve: number) {
    return clamp(Math.abs(curve) / 0.72, 0, 1);
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
    const cornerAccelSpeed = config.accelSpeed - cornerIntensity * config.cornerAccelSpeedDrop;
    const speedRatio = clamp(player.speed / config.accelSpeed, 0, 1);
    const throttle = input.accelPressed ? 1 : 0;
    const brake = input.brakePressed ? 1 : 0;
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
        ? Math.min(config.cornerSpeedPull * cornerIntensity, player.speed - cornerSpeedLimit)
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
