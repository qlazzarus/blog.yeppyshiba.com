import Phaser from 'phaser';
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
    curveSteeringCue: number;
    engineAcceleration: number;
    engineBrakeDeceleration: number;
    highSpeedSteerForceDrop: number;
    highSpeedSteerVisualDrop: number;
    inputResponse: number;
    maxRoadOffset: number;
    rollingResistance: number;
    rpmIdle: number;
    rpmRedline: number;
    rpmResponse: number;
    steerAcceleration: number;
    steerDamping: number;
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
    rpmIdle: number,
): PlayerVehicleState {
    return {
        lateralOffset: 0,
        rpm: rpmIdle,
        speed: cruiseSpeed,
        steering: 0,
        steeringVelocity: 0,
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

    const speedRatio = Phaser.Math.Clamp(player.speed / config.accelSpeed, 0, 1);
    const steerForceRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.highSpeedSteerForceDrop,
    );
    const steerVisualRatio = getHighSpeedSteeringRatio(
        speedRatio,
        config.highSpeedSteerVisualDrop,
    );
    const centeringForce = -player.lateralOffset * config.centeringResponse;
    const steeringForce = input.steerAxis * config.steerAcceleration * steerForceRatio;
    const curveForce = -context.currentCurve * speedRatio * config.curveDriftAcceleration;
    const dampingForce = -player.steeringVelocity * config.steerDamping;

    player.steeringVelocity += (steeringForce + centeringForce + curveForce + dampingForce) * seconds;
    player.lateralOffset += player.steeringVelocity * seconds;
    player.lateralOffset = Phaser.Math.Clamp(
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

    const targetSteering = Phaser.Math.Clamp(
        input.steerAxis * steerVisualRatio +
            (player.steeringVelocity / config.steerAcceleration) * config.steeringVelocityCue -
            context.currentCurve * speedRatio * config.curveSteeringCue,
        -1,
        1,
    );
    const steeringBlend = 1 - Math.exp(-config.inputResponse * seconds);

    player.steering = Phaser.Math.Linear(player.steering, targetSteering, steeringBlend);
}

export function getCornerIntensity(curve: number) {
    return Phaser.Math.Clamp(Math.abs(curve) / 0.72, 0, 1);
}

export function getHighSpeedSteeringRatio(speedRatio: number, maxDrop: number) {
    const smoothSpeed = speedRatio * speedRatio * (3 - 2 * speedRatio);

    return Phaser.Math.Clamp(1 - smoothSpeed * maxDrop, 1 - maxDrop, 1);
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
    const speedRatio = Phaser.Math.Clamp(player.speed / config.accelSpeed, 0, 1);
    const throttle = input.accelPressed ? 1 : 0;
    const brake = input.brakePressed ? 1 : 0;
    const engineForce = throttle * config.engineAcceleration * (1 - speedRatio * 0.45);
    const brakeForce = brake * config.braking;
    const engineBrakeForce = throttle > 0 || brake > 0 ? 0 : config.engineBrakeDeceleration;
    const rollingResistance = config.rollingResistance;
    const aeroDrag = player.speed * player.speed * config.aeroDrag;
    const cornerSpeedLimit = cornerAccelSpeed;
    const cornerLimitForce = player.speed > cornerSpeedLimit
        ? Math.min(config.cornerSpeedPull * cornerIntensity, player.speed - cornerSpeedLimit)
        : 0;
    const acceleration =
        engineForce +
        context.slopeAcceleration -
        brakeForce -
        engineBrakeForce -
        rollingResistance -
        aeroDrag -
        cornerLimitForce;

    player.speed = Phaser.Math.Clamp(
        player.speed + acceleration * seconds,
        config.brakeSpeed,
        config.accelSpeed,
    );

    if (input.brakePressed && player.speed < 2) {
        player.speed = 0;
    }

    const targetRpm = getEngineRpm(player.speed, throttle, brake, config);
    const rpmBlend = 1 - Math.exp(-config.rpmResponse * seconds);

    player.rpm = Phaser.Math.Linear(player.rpm, targetRpm, rpmBlend);
}

function getEngineRpm(
    speed: number,
    throttle: number,
    brake: number,
    config: PlayerVehicleControllerConfig,
) {
    const gearRatios = [0.18, 0.32, 0.48, 0.66, 0.84, 1];
    const speedRatio = Phaser.Math.Clamp(speed / config.accelSpeed, 0, 1);
    const gearIndex = Math.min(
        gearRatios.length - 1,
        Math.floor(speedRatio * gearRatios.length),
    );
    const gearStart = gearIndex === 0 ? 0 : gearRatios[gearIndex - 1];
    const gearEnd = gearRatios[gearIndex];
    const gearProgress = Phaser.Math.Clamp((speedRatio - gearStart) / (gearEnd - gearStart), 0, 1);
    const throttleLift = throttle > 0 ? 850 : 0;
    const brakeDrop = brake > 0 ? 550 : 0;

    return Phaser.Math.Clamp(
        config.rpmIdle + gearProgress * (config.rpmRedline - config.rpmIdle) + throttleLift - brakeDrop,
        config.rpmIdle,
        config.rpmRedline,
    );
}
