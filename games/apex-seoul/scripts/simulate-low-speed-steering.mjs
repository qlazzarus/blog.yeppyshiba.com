import {
    createDefaultPlayerVehicleState,
    getLowSpeedLateralAuthority,
    getLowSpeedVisualSteeringAuthority,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';

const FRAME_SECONDS = 1 / 60;
const ACCEL_SPEED = 760;
const HIGH_SPEED_STEER_WEAK_THRESHOLD = 0.22;
const STEER_WEAK_THRESHOLD = 0.14;
const VEHICLE_ROTATION_DEG = 3.5;
const CONFIG = {
    accelSpeed: ACCEL_SPEED,
    aeroDrag: 0.00012,
    brakeSpeed: 0,
    braking: 330,
    brakeReleaseResponse: 13,
    brakeResponse: 8,
    centeringResponse: 6,
    centeringCounterHoldDuration: 0.18,
    centeringCounterStartScale: 0.58,
    centeringInputHoldScale: 0.35,
    centeringNeutralInwardVelocityCap: 20,
    centeringReleaseDelay: 0.18,
    centeringReleaseScaleResponse: 0.8,
    centeringReleaseScale: 0.45,
    centeringScaleResponse: 4.8,
    cornerAccelSpeedDrop: 140,
    cornerEasyIntensityThreshold: 0.34,
    cornerEasySpeedLossScale: 0.35,
    cornerLineSpeedBonus: 70,
    cornerLineTargetOffset: 260,
    cornerSharpIntensityThreshold: 0.7,
    cornerSharpLineRewardScale: 1.35,
    cornerSharpSpeedLossScale: 1.18,
    cornerSpeedPull: 160,
    downhillCornerBudgetMaxReduction: 0.08,
    downhillCornerBudgetSlopeAcceleration: 65,
    downhillCornerLateralScale: 1.3,
    downhillCornerOverspeedScrub: 145,
    curveDriftAcceleration: 160,
    curveSteeringHighSpeedDrop: 0.42,
    curveSteeringCue: 0.06,
    driftBuildRate: 2.8,
    driftDecayRate: 2.6,
    driftEntrySpeedLoss: 16,
    driftEntryLateralKick: 190,
    driftBreakawayDuration: 0.22,
    driftBrakeEntryPressure: 0.64,
    driftBrakeEntrySpeedLoss: 14,
    driftEasyEntrySpeedLossScale: 0.55,
    driftExitReaccelDelay: 0.24,
    driftLiftEntrySpeedLoss: 22,
    driftOutsideLineOverspeedPull: 0.65,
    driftOutsideLineScrubScale: 0.55,
    driftSharpEntrySpeedLossScale: 1.25,
    driftThrottleGraceDuration: 0.28,
    driftThrottleLiftRatio: 0.44,
    driftCounterNeutralDuration: 0.08,
    driftLateralDamping: 1.9,
    driftLateralMaxSpeed: 230,
    driftCounterSteerLateralScale: 0.42,
    driftCounterSteerLateralSustainScale: 0.58,
    driftCounterSteerLateralVelocityCap: 52,
    driftCounterTrimDuration: 0.65,
    driftCounterTrimMaxRatio: 0.62,
    driftCounterTrimResponse: 7,
    driftCounterTrimReleaseResponse: 4,
    driftSustainAcceleration: 70,
    driftTransitionArmDuration: 0.12,
    driftTransitionInputWindow: 0.42,
    driftTransitionKick: 120,
    driftMaxSlipAngle: 10,
    driftMinCornerIntensity: 0.38,
    driftMinSpeedRatio: 0.55,
    driftMinSteerInput: 0.6,
    driftRecoveryRate: 2.3,
    engineAcceleration: 82,
    engineBrakeDeceleration: 26,
    engineProfile: RAVEN_COUPE_ENGINE_PROFILE,
    gripCounterRoadCenteringScale: 0.1,
    gripCounterRoadLateralBuildRate: 180,
    gripCounterRoadLateralMaxSpeed: 96,
    gripCounterRoadLateralRecoveryRate: 150,
    gripCounterRoadSpeedScrub: 72,
    highSpeedInputResponseDrop: 0.28,
    highSpeedLateralVelocityCap: 70,
    highSpeedSteeringSlewRate: 5.6,
    highSpeedSteerForceDrop: 0.54,
    highSpeedSteerVisualDrop: 0.43,
    gripSteerAngleHighSpeedCap: 0.72,
    gripSteerAngleHighSpeedStartRatio: 0.55,
    inputResponse: 18,
    launchThrottleFullSpeedRatio: 0.7,
    launchThrottleMinRatio: 0.5,
    maxRoadOffset: 700,
    overspeedUndersteerMax: 0.62,
    overspeedMediumUndersteerScale: 0.58,
    overspeedUndersteerMinSteerInput: 0.18,
    overspeedSafetyMarginStartRatio: 0.16,
    overspeedSafetyMarginFullRatio: 0.32,
    overspeedSafetyMarginScrub: 75,
    overspeedSharpLateralScale: 1.55,
    overspeedSharpSpeedScrubScale: 1.35,
    overspeedSharpUndersteerScale: 1,
    overspeedUndersteerLateralBuildRate: 180,
    overspeedUndersteerLateralMaxSpeed: 120,
    overspeedUndersteerLateralRecoveryRate: 130,
    overspeedUndersteerRatioBuildRate: 2.8,
    overspeedUndersteerRatioRecoveryRate: 4.5,
    overspeedUndersteerSpeedScrub: 28,
    overspeedUndersteerSpeedWindow: 150,
    rollingResistance: 14,
    rpmIdle: 1100,
    rpmRedline: 7200,
    rpmResponse: 7,
    steerAcceleration: 1650,
    steerDamping: 9.2,
    steeringSpeedScrub: 64,
    steeringSpeedScrubThreshold: 0.22,
    steeringVelocityCue: 0.2,
};

const checks = [];
const authoritySamples = [0, 5, 30, 60].map((speedKmh) => ({
    lateralAuthority: round(getLowSpeedLateralAuthority(speedKmh), 4),
    speedKmh,
    visualAuthority: round(getLowSpeedVisualSteeringAuthority(speedKmh), 4),
}));
const stationary = runSteerHold({ accelPressed: false, durationSec: 2, speed: 0, steerAxis: -1 });
const launchSteer = runSteerHold({ accelPressed: true, durationSec: 0.35, speed: 0, steerAxis: 1 });
const crawl = runSteerHold({
    accelPressed: false,
    durationSec: 2,
    maintainSpeed: true,
    speed: speedForDisplayKmh(10),
    steerAxis: 1,
});
const medium = runSteerHold({
    accelPressed: false,
    durationSec: 2,
    maintainSpeed: true,
    speed: speedForDisplayKmh(60),
    steerAxis: 1,
});
const driftLock = runDriftAttemptAtLowSpeed();

checks.push(atMost('stationaryLateralOffset', Math.abs(stationary.lateralOffset), 0.001));
checks.push(atMost('stationarySteeringVelocity', Math.abs(stationary.steeringVelocity), 0.001));
checks.push(atMost('stationaryVisualSteering', Math.abs(stationary.visualSteering), 0.001));
checks.push(equals('stationaryVisualFrame', stationary.visualFrame, 'center'));
checks.push(atMost('launchFirst350msLateralOffset', Math.abs(launchSteer.lateralOffset), 0.35));
checks.push(atMost('launchFirst350msVisualSteering', Math.abs(launchSteer.visualSteering), 0.01));
checks.push(equals('launchFirst350msVisualFrame', launchSteer.visualFrame, 'center'));
checks.push(between('crawlLateralOffset', Math.abs(crawl.lateralOffset), 0.01, 22));
checks.push(atMost('crawlVisualSteering', Math.abs(crawl.visualSteering), 0.1));
checks.push(equals('crawlVisualFrame', crawl.visualFrame, 'center'));
checks.push(between('mediumLateralOffset', Math.abs(medium.lateralOffset), 180, 320));
checks.push(atLeast('mediumVisualSteering', Math.abs(medium.visualSteering), 0.55));
checks.push(equals('driftLockedState', driftLock.driftState, 'grip'));
checks.push(atMost('driftLockedRatio', driftLock.driftRatio, 0.01));

const metrics = {
    authoritySamples,
    crawl,
    driftLock,
    launchSteer,
    medium,
    stationary,
};
const report = { checks, metrics, pass: checks.every((check) => check.pass) };

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function runSteerHold({ accelPressed, durationSec, maintainSpeed = false, speed, steerAxis }) {
    const player = createPlayer(speed);
    const frames = Math.round(durationSec / FRAME_SECONDS);

    for (let frame = 0; frame < frames; frame += 1) {
        if (maintainSpeed) player.speed = speed;
        updatePlayerVehicle(
            player,
            { accelPressed, brakePressed: false, steerAxis },
            { currentCurve: 0, slopeAcceleration: 0 },
            CONFIG,
            FRAME_SECONDS,
        );
        if (maintainSpeed) player.speed = speed;
    }

    return snapshot(player);
}

function runDriftAttemptAtLowSpeed() {
    const player = createPlayer(speedForDisplayKmh(30));

    for (let frame = 0; frame < 40; frame += 1) {
        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: true, steerAxis: 1 },
            { currentCurve: 0.62, slopeAcceleration: 0 },
            CONFIG,
            FRAME_SECONDS,
        );
    }

    return snapshot(player);
}

function createPlayer(speed) {
    const player = createDefaultPlayerVehicleState(0, RAVEN_COUPE_ENGINE_PROFILE, ACCEL_SPEED);
    player.speed = speed;
    return player;
}

function snapshot(player) {
    const visual = getVisualSteeringSnapshot(player);

    return {
        displaySpeedKmh: round(getDisplaySpeedKmh(player.speed, ACCEL_SPEED, RAVEN_COUPE_ENGINE_PROFILE), 3),
        driftRatio: round(player.driftRatio, 4),
        driftState: player.driftState,
        lateralOffset: round(player.lateralOffset, 4),
        lowSpeedLateralAuthority: round(player.lowSpeedLateralAuthority, 4),
        lowSpeedVisualSteeringAuthority: round(player.lowSpeedVisualSteeringAuthority, 4),
        rotationDeg: round(visual.rotationDeg, 4),
        speed: round(player.speed, 4),
        steering: round(player.steering, 4),
        steeringVelocity: round(player.steeringVelocity, 4),
        visualFrame: visual.frame,
        visualSteering: round(visual.value, 4),
        visualSteeringThreshold: round(visual.threshold, 4),
    };
}

function getVisualSteeringSnapshot(player) {
    const speedRatio = clamp(player.speed / ACCEL_SPEED, 0, 1);
    const smoothSpeed = smoothstep(speedRatio);
    const threshold = lerp(STEER_WEAK_THRESHOLD, HIGH_SPEED_STEER_WEAK_THRESHOLD, smoothSpeed);
    const value = player.steering;

    return {
        frame: selectVisualFrame(value, threshold),
        rotationDeg: value * VEHICLE_ROTATION_DEG,
        threshold,
        value,
    };
}

function selectVisualFrame(steering, threshold) {
    const strongThreshold = threshold + (1 - threshold) * 0.62;

    if (steering <= -strongThreshold) return 'steer-left-2';
    if (steering >= strongThreshold) return 'steer-right-2';
    if (steering <= -threshold) return 'steer-left-1';
    if (steering >= threshold) return 'steer-right-1';

    return 'center';
}

function speedForDisplayKmh(targetKmh) {
    let bestSpeed = 0;
    let bestDelta = Infinity;

    for (let speed = 0; speed <= ACCEL_SPEED; speed += 0.1) {
        const delta = Math.abs(
            getDisplaySpeedKmh(speed, ACCEL_SPEED, RAVEN_COUPE_ENGINE_PROFILE) - targetKmh,
        );
        if (delta < bestDelta) {
            bestDelta = delta;
            bestSpeed = speed;
        }
    }

    return bestSpeed;
}

function atLeast(id, value, target) {
    return { id, pass: value >= target, target, value: round(value, 4) };
}

function atMost(id, value, target) {
    return { id, pass: value <= target, target, value: round(value, 4) };
}

function between(id, value, min, max) {
    return { id, max, min, pass: value >= min && value <= max, value: round(value, 4) };
}

function equals(id, value, target) {
    return { id, pass: value === target, target, value };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function smoothstep(value) {
    return value * value * (3 - 2 * value);
}

function round(value, digits = 3) {
    return typeof value === 'number' ? Number(value.toFixed(digits)) : value;
}
