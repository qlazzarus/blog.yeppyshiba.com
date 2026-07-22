import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    APEX_S_ENGINE_PROFILE,
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
    VORTEX_GT_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';

const FRAME_SECONDS = 1 / 60;
const ACCEL_SPEED = 760;
const THRESHOLDS_KMH = [30, 60, 80, 100, 120, 150, 180];
const BASE_CONFIG = {
    accelSpeed: ACCEL_SPEED,
    aeroDrag: 0.000007661283025835461,
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
    cornerEasyIntensityThreshold: 0.34,
    cornerEasySpeedLossScale: 0.95,
    cornerLineSpeedBonus: 70,
    cornerLineTargetOffset: 260,
    cornerSevereLineScrubScale: 1.2,
    cornerSevereOverspeedFullRatio: 1.45,
    cornerSevereOverspeedScrub: 140,
    cornerSevereOverspeedStartRatio: 1.18,
    cornerSharpIntensityThreshold: 0.7,
    cornerSharpLineRewardScale: 1.35,
    cornerSharpSpeedLossScale: 1.18,
    cornerSpeedPull: 100,
    downhillCornerBudgetMaxReduction: 0,
    downhillCornerBudgetSlopeAcceleration: 65,
    downhillCornerLateralScale: 1.3,
    downhillCornerOverspeedScrub: 0,
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
    launchThrottleFullSpeedRatio: 1,
    launchThrottleMinRatio: 0.5,
    maxRoadOffset: 700,
    overspeedUndersteerMax: 0.62,
    overspeedEasyUndersteerFullRatio: 0.2,
    overspeedEasyUndersteerScale: 0.3,
    overspeedMediumUndersteerScale: 0.58,
    overspeedUndersteerMinSteerInput: 0.08,
    overspeedUndersteerSteerInputFull: 0.45,
    overspeedUndersteerLiftTargetScale: 0.55,
    overspeedUndersteerBrakeTargetScale: 0.28,
    overspeedEasyLateralScale: 4,
    overspeedEasyRoadMaxRatio: 0.22,
    overspeedMediumLateralScale: 1.15,
    overspeedMediumRoadMaxRatio: 0.42,
    overspeedSafetyMarginStartRatio: 0.16,
    overspeedSafetyMarginFullRatio: 0.32,
    overspeedSafetyMarginScrub: 75,
    overspeedSharpLateralScale: 1.55,
    overspeedSharpSpeedScrubScale: 1.35,
    overspeedSharpUndersteerScale: 1,
    overspeedUndersteerRoadBuildRate: 2.2,
    overspeedUndersteerRoadMaxRatio: 0.54,
    overspeedUndersteerRoadRecoveryRate: 7.5,
    overspeedUndersteerRoadSpeedRate: 0.72,
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
const PROFILES = [
    RAVEN_COUPE_ENGINE_PROFILE,
    APEX_S_ENGINE_PROFILE,
    VORTEX_GT_ENGINE_PROFILE,
];

const rows = PROFILES.map((profile) => simulateProfile(profile));
const raven = rows.find((row) => row.profileId === RAVEN_COUPE_ENGINE_PROFILE.id);
const checks = [
    between('raven0to60', raven.hits['60']?.timeSec, 3.5, 5),
    between('raven0to100', raven.hits['100']?.timeSec, 7.8, 8.3),
    between('raven100Gear', raven.hits['100']?.gear, 3, 4),
    atMost('raven0to100MaxLateralOffset', Math.abs(raven.maxLateralOffsetBefore100), 0.1),
    equals('raven0to100DriftState', raven.driftStateAt100, 'grip'),
];
const report = { checks, pass: checks.every((check) => check.pass), rows };

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function simulateProfile(profile) {
    const config = { ...BASE_CONFIG, engineProfile: profile };
    const player = createDefaultPlayerVehicleState(0, profile, ACCEL_SPEED);
    const hits = {};
    let maxLateralOffsetBefore100 = 0;
    let driftStateAt100 = player.driftState;

    for (let frame = 0; frame <= 60 * 45; frame += 1) {
        const timeSec = frame * FRAME_SECONDS;
        const speedKmh = getDisplaySpeedKmh(player.speed, ACCEL_SPEED, profile);

        if (speedKmh < 100) {
            maxLateralOffsetBefore100 = Math.max(maxLateralOffsetBefore100, Math.abs(player.lateralOffset));
        }

        for (const threshold of THRESHOLDS_KMH) {
            if (!hits[threshold] && speedKmh >= threshold) {
                hits[threshold] = {
                    gear: player.gearIndex + 1,
                    rpm: Math.round(player.rpm),
                    speed: round(player.speed),
                    timeSec: round(timeSec),
                    torque: round(player.engineTorqueScale, 4),
                };
                if (threshold === 100) driftStateAt100 = player.driftState;
            }
        }

        updatePlayerVehicle(
            player,
            { accelPressed: true, brakePressed: false, steerAxis: 0 },
            { currentCurve: 0, slopeAcceleration: 0 },
            config,
            FRAME_SECONDS,
        );
    }

    return {
        displayName: profile.displayName,
        driftStateAt100,
        hits,
        maxLateralOffsetBefore100: round(maxLateralOffsetBefore100, 4),
        profileId: profile.id,
    };
}

function atMost(id, value, target) {
    return { id, pass: value <= target, target, value };
}

function between(id, value, min, max) {
    return { id, max, min, pass: value >= min && value <= max, value };
}

function equals(id, value, target) {
    return { id, pass: value === target, target, value };
}

function round(value, digits = 3) {
    return Number(value.toFixed(digits));
}
