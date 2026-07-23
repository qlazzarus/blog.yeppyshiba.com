import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const baseConfig = {
    accelSpeed: 760,
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
    cornerInertiaBuildRate: 240,
    cornerInertiaMaxLateralSpeed: 115,
    cornerInertiaRecoveryRate: 320,
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
const candidates = [
    {
        id: 'previous-baseline',
        patch: {
            cornerSpeedPull: 190,
            cornerInertiaMaxLateralSpeed: 150,
            curveSteeringHighSpeedDrop: 0,
            curveSteeringCue: 0.1,
            engineAcceleration: 128,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.34,
            launchThrottleFullSpeedRatio: 0.05,
            launchThrottleMinRatio: 1,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.38,
        },
    },
    {
        id: 'baseline',
        patch: {},
    },
    {
        id: 'previous-2026-07-10-baseline',
        patch: {
            cornerSpeedPull: 120,
            curveSteeringHighSpeedDrop: 0.38,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.38,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
        },
    },
    {
        id: 'previous-visual-cue',
        patch: {
            curveSteeringHighSpeedDrop: 0,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.25,
            inputResponse: 16,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.25,
        },
    },
    {
        id: 'previous-grip-angle',
        patch: {
            curveSteeringHighSpeedDrop: 0,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerForceDrop: 0.42,
            highSpeedSteerVisualDrop: 0.25,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
        },
    },
    {
        id: 'visual-cue-snappier',
        patch: {
            inputResponse: 20,
            steeringVelocityCue: 0.18,
        },
    },
    {
        id: 'previous-lateral-weight',
        patch: {
            centeringResponse: 1.9,
            steerAcceleration: 1750,
        },
    },
    {
        id: 'even-less-curve-force',
        patch: {
            cornerInertiaMaxLateralSpeed: 90,
            curveSteeringCue: 0.05,
        },
    },
    {
        id: 'even-less-corner-pull',
        patch: {
            cornerSpeedPull: 100,
        },
    },
    {
        id: 'stronger-engine',
        patch: {
            engineAcceleration: 190,
        },
    },
    {
        id: 'extra-grip-angle-damping',
        patch: {
            curveSteeringHighSpeedDrop: 0.45,
            highSpeedInputResponseDrop: 0,
            highSpeedLateralVelocityCap: 1650,
            highSpeedSteeringSlewRate: 24,
            highSpeedSteerVisualDrop: 0.45,
            steeringSpeedScrub: 0,
            steeringSpeedScrubThreshold: 0.22,
            steeringVelocityCue: 0.2,
        },
    },
    {
        id: 'stronger-high-speed-weight',
        patch: {
            curveSteeringHighSpeedDrop: 0.52,
            highSpeedInputResponseDrop: 0.42,
            highSpeedLateralVelocityCap: 48,
            highSpeedSteeringSlewRate: 3.6,
            highSpeedSteerForceDrop: 0.65,
            highSpeedSteerVisualDrop: 0.52,
        },
    },
    {
        id: 'combined-second-pass',
        patch: {
            cornerSpeedPull: 100,
            cornerInertiaMaxLateralSpeed: 90,
            curveSteeringHighSpeedDrop: 0.38,
            curveSteeringCue: 0.05,
            engineAcceleration: 190,
            highSpeedSteerVisualDrop: 0.38,
            launchThrottleFullSpeedRatio: 0.38,
            launchThrottleMinRatio: 0.3,
            steeringVelocityCue: 0.2,
        },
    },
];
const scenarios = {
    'easy-bend-grip': {
        durationSec: 8,
        initialSpeed: 700,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? -0.45 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.2,
            slopeAcceleration: 0,
        }),
    },
    'sharp-bend-apex-line': {
        durationSec: 7,
        initialLateralOffset: 220,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 700,
        steerEndSec: 5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? 0.5 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-bend-outside-line': {
        durationSec: 7,
        initialLateralOffset: -220,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 700,
        steerEndSec: 5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? 0.5 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-overspeed-grip': {
        durationSec: 7,
        initialSpeed: 760,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-overspeed-demand-only': {
        durationSec: 4.2,
        initialSpeed: 760,
        speedOverride: 760,
        speedOverrideAtSec: 2,
        steerEndSec: 3.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: false,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3.5 ? 0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-counter-road-grip': {
        durationSec: 7,
        initialSpeed: 760,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? -0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-counter-road-tap': {
        counterRoadEndSec: 3.3,
        counterRoadStartSec: 3,
        durationSec: 7,
        initialSpeed: 760,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t < 2 || t >= 5.5 ? 0 : (t >= 3 && t < 3.3 ? -0.9 : 0.7),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-prepared-grip': {
        durationSec: 7,
        initialSpeed: 760,
        steerEndSec: 5.5,
        steerStartSec: 2.6,
        getInput: (t) => ({
            accelPressed: t >= 2.55,
            brakePressed: t >= 1.1 && t < 2.55,
            steerAxis: t >= 2.6 && t < 5.5 ? 0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'sharp-grip-speed-470': createSharpGripSpeedScenario(470),
    'sharp-grip-speed-560': createSharpGripSpeedScenario(560),
    'sharp-grip-speed-710': createSharpGripSpeedScenario(710),
    'sharp-overspeed-brake-recovery': {
        durationSec: 8,
        initialSpeed: 760,
        steerEndSec: 4,
        steerStartSec: 2,
        understeerRecoveryStartSec: 3.9,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 4 && t < 5,
            steerAxis: t >= 2 && t < 4 ? 0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5 ? 0.62 : 0),
            slopeAcceleration: 0,
        }),
    },
    'right-lane-hold-grip': {
        durationSec: 7,
        initialLateralOffset: 180,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 660,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t >= 2,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.32 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'right-lane-hold-downhill': {
        durationSec: 7,
        initialLateralOffset: 180,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 660,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t >= 2,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.32 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 18,
        }),
    },
    'right-lane-release-recenter': {
        durationSec: 7,
        initialLateralOffset: 180,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 660,
        laneReleaseSec: 3.5,
        steerEndSec: 3.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t >= 2,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3.5 ? 0.32 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-counter-tap-190': {
        counterStartSec: 2.5,
        counterTapEndSec: 2.65,
        durationSec: 5,
        initialLateralOffset: 180,
        initialSpeed: 720,
        steerEndSec: 3.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2.5 && t < 2.65 ? -0.8 : (t >= 2 && t < 3.5 ? 0.32 : 0),
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-counter-tap-200': {
        counterStartSec: 2.5,
        counterTapEndSec: 2.65,
        durationSec: 5,
        initialLateralOffset: 180,
        initialSpeed: 760,
        steerEndSec: 3.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2.5 && t < 2.65 ? -0.8 : (t >= 2 && t < 3.5 ? 0.32 : 0),
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-counter-hold-200': {
        counterStartSec: 2.5,
        durationSec: 5,
        initialLateralOffset: 180,
        initialSpeed: 760,
        steerEndSec: 3.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2.5 && t < 3.5 ? -0.8 : (t >= 2 && t < 2.5 ? 0.32 : 0),
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-neutral-release-190': {
        durationSec: 6,
        initialLateralOffset: 180,
        initialSpeed: 720,
        neutralReleaseSec: 3,
        steerEndSec: 3,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3 ? 0.32 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 3 ? 0.24 : Math.min(0.48, 0.24 + (t - 3) * 0.3),
            slopeAcceleration: 0,
        }),
    },
    'high-speed-neutral-release-200': {
        durationSec: 6,
        initialLateralOffset: 180,
        initialSpeed: 760,
        neutralReleaseSec: 3,
        steerEndSec: 3,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3 ? 0.32 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 3 ? 0.24 : Math.min(0.48, 0.24 + (t - 3) * 0.3),
            slopeAcceleration: 0,
        }),
    },
    'sharp-understeer-threshold-build': {
        durationSec: 6,
        initialLateralOffset: 120,
        initialSpeed: 720,
        sharpThresholdCrossSec: 2.8,
        steerEndSec: 5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? 0.45 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0.38 : Math.min(0.6, 0.38 + (t - 2) * 0.22),
            slopeAcceleration: 0,
        }),
    },
    'budget-medium-full-throttle': {
        durationSec: 7,
        initialSpeed: 720,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.65 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.4 : 0),
            slopeAcceleration: 0,
        }),
    },
    'budget-medium-prepared-grip': {
        durationSec: 7,
        initialSpeed: 530,
        speedOverride: 530,
        speedOverrideAtSec: 2,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.65 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.4 : 0),
            slopeAcceleration: 0,
        }),
    },
    'budget-sharp-full-throttle': {
        durationSec: 7,
        initialSpeed: 720,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.72 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.62 : 0),
            slopeAcceleration: 0,
        }),
    },
    'downhill-sharp-full-throttle': {
        durationSec: 7,
        initialSpeed: 720,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.72 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.62 : 0),
            slopeAcceleration: t < 2 ? 0 : 70,
        }),
    },
    'downhill-sharp-prepared-grip': {
        durationSec: 7,
        initialSpeed: 510,
        speedOverride: 510,
        speedOverrideAtSec: 2,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.72 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.62 : 0),
            slopeAcceleration: t < 2 ? 0 : 70,
        }),
    },
    'budget-sharp-brake-drift': {
        durationSec: 7,
        initialSpeed: 720,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t < 2 || t >= 2.35,
            brakePressed: t >= 2 && t < 2.3,
            steerAxis: t >= 2 && t < 5.5 ? 0.8 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.5 ? 0.62 : 0),
            slopeAcceleration: 0,
        }),
    },
    'sharp-brake-drift-apex-line': {
        driftEntrySec: 2,
        durationSec: 8,
        initialLateralOffset: 220,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 700,
        recoveryStartSec: 5.1,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t < 5.1 || t >= 5.35,
            brakePressed: t >= 2 && t < 2.3,
            steerAxis: t < 2 ? 0 : (t < 5.1 ? 1 : -1),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.1 ? 0.62 : 0.05),
            slopeAcceleration: 0,
        }),
    },
    'sharp-brake-drift-outside-line': {
        driftEntrySec: 2,
        durationSec: 8,
        initialLateralOffset: -220,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 700,
        recoveryStartSec: 5.1,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t < 5.1 || t >= 5.35,
            brakePressed: t >= 2 && t < 2.3,
            steerAxis: t < 2 ? 0 : 1,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : (t < 5.1 ? 0.62 : 0.05),
            slopeAcceleration: 0,
        }),
    },
    'sharp-drift-oversteer': {
        driftEntrySec: 2,
        durationSec: 7,
        initialLateralOffset: -280,
        initialLateralOffsetAtSec: 2,
        initialSpeed: 720,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 2 && t < 2.3,
            steerAxis: t < 2 ? 0 : 1,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.68,
            slopeAcceleration: 0,
        }),
    },
    'curve-counter-steer': {
        counterSteerStartSec: 8,
        durationSec: 16,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 8 && t < 10.5 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'curve-no-input': {
        durationSec: 24,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 4 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-tap-release': {
        counterReleaseSec: 4.05,
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 4.05 && t >= 3.6 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-hold': {
        counterReleaseSec: 5.4,
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 5.4 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-long-hold': {
        counterReleaseSec: 6.6,
        counterStartSec: 3.6,
        // Measure only after the counter trim has had time to fully engage.
        counterSustainStartSec: 4.35,
        driftEntrySec: 2.5,
        durationSec: 8.2,
        getInput: (t) => ({
            accelPressed: t < 2.5 || t >= 2.82,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 6.6 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'explicit-recovery': {
        driftEntrySec: 2.5,
        recoveryStartSec: 3.7,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 3.7),
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.7 ? 1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-transition': {
        counterStartSec: 3.6,
        driftEntrySec: 2.5,
        transitionCommitSec: 4.2,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 3.6) || t >= 4.2,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t >= 3.72 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'counter-lift-exit': {
        counterStartSec: 3.6,
        counterReleaseSec: 4.8,
        driftEntrySec: 2.5,
        recoveryStartSec: 4,
        durationSec: 7,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 4),
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.6 ? 1 : (t < 4.8 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'drift-throttle-blip-hold': {
        counterStartSec: 3.5,
        driftEntrySec: 2.5,
        throttleLiftStartSec: 4,
        throttleResumeSec: 4.15,
        durationSec: 6.2,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 4) || t >= 4.15,
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.5 ? 1 : (t < 5.2 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'drift-throttle-long-lift-exit': {
        counterStartSec: 3.5,
        driftEntrySec: 2.5,
        recoveryStartSec: 4,
        throttleLiftStartSec: 4,
        durationSec: 6.2,
        getInput: (t) => ({
            accelPressed: t < 2.5 || (t >= 2.82 && t < 4),
            brakePressed: false,
            steerAxis: t >= 2.3 && t < 3.5 ? 1 : (t < 5.2 ? -1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'lift-drift-entry': {
        driftEntrySec: 3,
        durationSec: 8,
        getInput: (t) => ({
            accelPressed: t < 3 || t >= 5,
            brakePressed: false,
            steerAxis: t >= 2.5 && t < 5.6 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.5 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'brake-drift-entry-left': {
        driftEntrySec: 2.5,
        durationSec: 6,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 2.42 && t < 2.75,
            steerAxis: t >= 2.3 && t < 4.4 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : 0.285,
            slopeAcceleration: 0,
        }),
    },
    'brake-drift-entry-right': {
        driftEntrySec: 2.5,
        durationSec: 6,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: t >= 2.42 && t < 2.75,
            steerAxis: t >= 2.3 && t < 4.4 ? 1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.3 ? 0 : -0.285,
            slopeAcceleration: 0,
        }),
    },
    'drift-counter-steer-recovery': {
        counterSteerStartSec: 4.5,
        driftEntrySec: 3,
        durationSec: 9,
        getInput: (t) => ({
            accelPressed: t < 3 || t >= 5.5,
            brakePressed: false,
            steerAxis: t < 4.5 ? (t >= 2.5 ? -1 : 0) : (t < 5.5 ? 1 : 0),
        }),
        getRoad: (t) => ({
            currentCurve: t < 2.5 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'high-speed-grip-angle-cap': {
        durationSec: 8,
        initialSpeed: 720,
        steerEndSec: 5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? -1 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    },
    'hold-left-1s-release': {
        durationSec: 8,
        releaseSec: 3,
        startSec: 2,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 3 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'left-hold-3s-release': {
        durationSec: 12,
        releaseSec: 5,
        startSec: 2,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'micro-tap-left': {
        durationSec: 4,
        releaseSec: 1.2,
        startSec: 1,
        targetSteerSign: -1,
        getInput: (t) => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: t >= 1 && t < 1.2 ? -1 : 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'slalom-20s': {
        durationSec: 20,
        getInput: (t) => {
            if (t < 2) {
                return {
                    accelPressed: true,
                    brakePressed: false,
                    steerAxis: 0,
                };
            }

            const phase = Math.floor((t - 2) / 1.4);

            return {
                accelPressed: true,
                brakePressed: false,
                steerAxis: phase % 2 === 0 ? -1 : 1,
            };
        },
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'standing-start-12s': {
        durationSec: 12,
        initialSpeed: 0,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
    'straight-accel-20s': {
        durationSec: 20,
        getInput: () => ({
            accelPressed: true,
            brakePressed: false,
            steerAxis: 0,
        }),
        getRoad: () => ({
            currentCurve: 0,
            slopeAcceleration: 0,
        }),
    },
};

const config = {
    outputDir: 'assets/telemetry/generated/handling-sim',
    sampleHz: 20,
    scenarios: [
        'easy-bend-grip',
        'sharp-bend-apex-line',
        'sharp-bend-outside-line',
        'sharp-overspeed-grip',
        'sharp-overspeed-demand-only',
        'sharp-counter-road-grip',
        'sharp-counter-road-tap',
        'sharp-prepared-grip',
        'sharp-grip-speed-470',
        'sharp-grip-speed-560',
        'sharp-grip-speed-710',
        'sharp-overspeed-brake-recovery',
        'right-lane-hold-grip',
        'right-lane-hold-downhill',
        'right-lane-release-recenter',
        'high-speed-counter-tap-190',
        'high-speed-counter-tap-200',
        'high-speed-counter-hold-200',
        'high-speed-neutral-release-190',
        'high-speed-neutral-release-200',
        'sharp-understeer-threshold-build',
        'budget-medium-full-throttle',
        'budget-medium-prepared-grip',
        'budget-sharp-full-throttle',
        'downhill-sharp-full-throttle',
        'downhill-sharp-prepared-grip',
        'budget-sharp-brake-drift',
        'sharp-brake-drift-apex-line',
        'sharp-brake-drift-outside-line',
        'sharp-drift-oversteer',
        'standing-start-12s',
        'straight-accel-20s',
        'micro-tap-left',
        'hold-left-1s-release',
        'left-hold-3s-release',
        'slalom-20s',
        'curve-no-input',
        'curve-counter-steer',
        'lift-drift-entry',
        'brake-drift-entry-left',
        'brake-drift-entry-right',
        'drift-counter-steer-recovery',
        'high-speed-grip-angle-cap',
        'counter-tap-release',
        'counter-hold',
        'counter-long-hold',
        'drift-throttle-blip-hold',
        'drift-throttle-long-lift-exit',
        'counter-lift-exit',
        'explicit-recovery',
        'counter-transition',
    ],
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--sample-hz' && next) {
        config.sampleHz = parsePositiveNumber(arg, next);
        index += 1;
    } else if (arg === '--scenario' && next) {
        config.scenarios = next.split(',').map((scenario) => scenario.trim()).filter(Boolean);
        index += 1;
    }
}

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, '-');
const outputDir = resolveProjectPath(config.outputDir);
await mkdir(outputDir, { recursive: true });

const report = {
    candidates: [],
    generatedAt: startedAt.toISOString(),
    outputDir: path.relative(projectRoot, outputDir),
    sampleHz: config.sampleHz,
    scenarios: config.scenarios,
};

for (const candidate of candidates) {
    const controllerConfig = {
        ...baseConfig,
        ...candidate.patch,
    };
    const results = config.scenarios.map((scenarioId) => {
        const scenario = scenarios[scenarioId];

        if (!scenario) throw new Error(`Unknown scenario "${scenarioId}"`);

        const samples = simulateScenario(scenario, controllerConfig);
        const score = scoreScenario(scenarioId, scenario, samples, controllerConfig);

        return {
            metrics: score.metrics,
            pass: score.pass,
            scenario: scenarioId,
            totalScore: score.totalScore,
        };
    });
    const relationshipChecks = scoreHandlingRelationships(results);
    const relationshipPenalty = relationshipChecks.reduce((total, check) => total + check.penalty, 0);
    const totalScore = Math.max(
        0,
        average(results.map((result) => result.totalScore)) - relationshipPenalty,
    );

    report.candidates.push({
        config: controllerConfig,
        id: candidate.id,
        patch: candidate.patch,
        relationshipChecks,
        results,
        totalScore: Number(totalScore.toFixed(1)),
    });
}

function scoreHandlingRelationships(results) {
    const byScenario = new Map(results.map((result) => [result.scenario, result]));
    const getMetrics = (scenarioId) => byScenario.get(scenarioId)?.metrics ?? null;
    const checks = [];
    const sharpGripApex = getMetrics('sharp-bend-apex-line');
    const sharpGripOutside = getMetrics('sharp-bend-outside-line');
    const sharpCounterRoadGrip = getMetrics('sharp-counter-road-grip');
    const sharpCounterRoadTap = getMetrics('sharp-counter-road-tap');
    const sharpOverspeedGrip = getMetrics('sharp-overspeed-grip');
    const sharpOverspeedDemandOnly = getMetrics('sharp-overspeed-demand-only');
    const sharpPreparedGrip = getMetrics('sharp-prepared-grip');
    const sharpGripSpeed470 = getMetrics('sharp-grip-speed-470');
    const sharpGripSpeed560 = getMetrics('sharp-grip-speed-560');
    const sharpGripSpeed710 = getMetrics('sharp-grip-speed-710');
    const sharpBrakeRecovery = getMetrics('sharp-overspeed-brake-recovery');
    const levelSharpFullThrottle = getMetrics('budget-sharp-full-throttle');
    const downhillSharpFullThrottle = getMetrics('downhill-sharp-full-throttle');
    const downhillSharpPreparedGrip = getMetrics('downhill-sharp-prepared-grip');
    const rightLaneHold = getMetrics('right-lane-hold-grip');
    const rightLaneHoldDownhill = getMetrics('right-lane-hold-downhill');
    const counterTap190 = getMetrics('high-speed-counter-tap-190');
    const counterTap200 = getMetrics('high-speed-counter-tap-200');
    const neutralRelease190 = getMetrics('high-speed-neutral-release-190');
    const neutralRelease200 = getMetrics('high-speed-neutral-release-200');

    if (sharpGripApex && sharpGripOutside) {
        checks.push(checkAtLeast(
            'relation.sharpGrip.outsideMinusApexSpeedDrop',
            sharpGripOutside.gripCornerSpeedDrop - sharpGripApex.gripCornerSpeedDrop,
            12,
            4,
            18,
        ));
        checks.push(checkAtMost(
            'relation.sharpGrip.accidentalDriftRatio',
            Math.max(sharpGripApex.driftRatioMax, sharpGripOutside.driftRatioMax),
            0.02,
            0.1,
            18,
        ));
    }

    if (sharpOverspeedGrip && sharpPreparedGrip) {
        checks.push(checkAtLeast(
            'relation.sharpGrip.overspeedUndersteerActivation',
            sharpOverspeedGrip.overspeedUndersteerRatioMax,
            0.5,
            0.25,
            22,
        ));
        checks.push(checkAtMost(
            'relation.sharpGrip.preparedUndersteer',
            sharpPreparedGrip.overspeedUndersteerRatioMax,
            0.7,
            0.9,
            16,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.preparedUndersteerRelief',
            sharpOverspeedGrip.overspeedUndersteerRatioMax - sharpPreparedGrip.overspeedUndersteerRatioMax,
            0.3,
            0.12,
            18,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.preparedSteerAuthorityGain',
            sharpPreparedGrip.gripSteerAuthorityMean - sharpOverspeedGrip.gripSteerAuthorityMean,
            0.1,
            0.03,
            20,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.overspeedOutwardDisplacement',
            sharpOverspeedGrip.gripCornerOutwardOffsetMean - sharpPreparedGrip.gripCornerOutwardOffsetMean,
            12,
            4,
            20,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.preparedInputOffsetGain',
            sharpPreparedGrip.gripCornerInputOffsetAtEnd - sharpOverspeedGrip.gripCornerInputOffsetAtEnd,
            4,
            1.5,
            18,
        ));
    }

    if (sharpOverspeedGrip && sharpOverspeedDemandOnly) {
        checks.push(checkAtLeast(
            'relation.sharpGrip.demandOnlyUndersteerActivation',
            sharpOverspeedDemandOnly.overspeedUndersteerRatioMax,
            0.5,
            0.25,
            22,
        ));
        checks.push(checkAtMost(
            'relation.sharpGrip.demandOnlyThrottleDelta',
            sharpOverspeedGrip.overspeedUndersteerRatioMax -
                sharpOverspeedDemandOnly.overspeedUndersteerRatioMax,
            0.08,
            0.2,
            18,
        ));
    }

    if (sharpCounterRoadGrip && sharpOverspeedGrip) {
        checks.push(checkAtLeast(
            'relation.counterRoad.sharpOutsideExcursion',
            sharpCounterRoadGrip.lateralOffsetMaxAbs - sharpOverspeedGrip.lateralOffsetMaxAbs,
            180,
            90,
            22,
        ));
        checks.push(checkAtLeast(
            'relation.counterRoad.sharpExitLoss',
            sharpOverspeedGrip.cornerSpeedAtExit - sharpCounterRoadGrip.cornerSpeedAtExit,
            45,
            20,
            20,
        ));
    }

    if (sharpCounterRoadTap && sharpOverspeedGrip) {
        checks.push(checkAtLeast(
            'relation.counterRoad.tapExitLoss',
            sharpOverspeedGrip.cornerSpeedAtExit - sharpCounterRoadTap.cornerSpeedAtExit,
            4,
            1.5,
            18,
        ));
    }

    if (levelSharpFullThrottle && downhillSharpFullThrottle) {
        checks.push(checkAtMost(
            'relation.downhillSharp.sharedBudgetDelta',
            Math.abs(
                levelSharpFullThrottle.cornerSpeedBudgetAtEntry -
                    downhillSharpFullThrottle.cornerSpeedBudgetAtEntry,
            ),
            2,
            8,
            20,
        ));
        checks.push(checkAtLeast(
            'relation.downhillSharp.naturalExitCarry',
            downhillSharpFullThrottle.cornerSpeedAtExit - levelSharpFullThrottle.cornerSpeedAtExit,
            22,
            8,
            20,
        ));
        checks.push(checkAtLeast(
            'relation.downhillSharp.outsideSafetyMarginGain',
            downhillSharpFullThrottle.cornerSafetyMarginRatioMax -
                levelSharpFullThrottle.cornerSafetyMarginRatioMax,
            0.08,
            0.03,
            18,
        ));
    }

    if (downhillSharpFullThrottle && downhillSharpPreparedGrip) {
        checks.push(checkAtLeast(
            'relation.downhillSharp.preparedEntryRelief',
            downhillSharpFullThrottle.cornerSpeedOverBudgetAtEntry - downhillSharpPreparedGrip.cornerSpeedOverBudgetAtEntry,
            90,
            55,
            18,
        ));
    }

    if (sharpGripSpeed470 && sharpGripSpeed560 && sharpGripSpeed710) {
        checks.push(checkAtLeast(
            'relation.sharpGrip.speedSweep.entryUndersteerBuild',
            sharpGripSpeed710.overspeedUndersteerRatioAtEntry - sharpGripSpeed470.overspeedUndersteerRatioAtEntry,
            0.25,
            0.12,
            22,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.speedSweep.outwardDisplacementBuild',
            sharpGripSpeed710.gripCornerOutwardOffsetMean - sharpGripSpeed470.gripCornerOutwardOffsetMean,
            15,
            6,
            20,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.speedSweep.scrubBuild',
            sharpGripSpeed710.gripCornerSpeedDrop - sharpGripSpeed470.gripCornerSpeedDrop,
            30,
            12,
            18,
        ));
        checks.push(checkAtLeast(
            'relation.sharpGrip.speedSweep.mediumBetweenEndpoints',
            sharpGripSpeed560.overspeedUndersteerRatioAtEntry - sharpGripSpeed470.overspeedUndersteerRatioAtEntry,
            0.2,
            0.08,
            12,
        ));
    }

    if (sharpBrakeRecovery) {
        checks.push(checkAtLeast(
            'relation.sharpGrip.brakeRecovery.lateralCarry',
            sharpBrakeRecovery.overspeedUndersteerLateralVelocityMaxAbs,
            45,
            20,
            16,
        ));
        checks.push(checkAtMost(
            'relation.sharpGrip.brakeRecovery.recoveryMs',
            sharpBrakeRecovery.overspeedUndersteerLateralRecoveryMs,
            800,
            1400,
            20,
        ));
        checks.push(checkAtMost(
            'relation.sharpGrip.brakeRecovery.accidentalDrift',
            sharpBrakeRecovery.driftRatioMax,
            0.02,
            0.1,
            18,
        ));
    }

    if (rightLaneHold && rightLaneHoldDownhill) {
        checks.push(checkAtMost(
            'relation.laneHold.levelDownhillDelta',
            Math.abs(rightLaneHold.laneOffsetRatioAtHoldEnd - rightLaneHoldDownhill.laneOffsetRatioAtHoldEnd),
            0.04,
            0.08,
            18,
        ));
    }

    if (counterTap190 && counterTap200) {
        checks.push(checkAtMost(
            'relation.centering.counterTap190vs200.first100msDelta',
            Math.abs(
                counterTap190.centeringScaleAtCounter100Ms -
                counterTap200.centeringScaleAtCounter100Ms,
            ),
            0.06,
            0.14,
            16,
        ));
    }

    if (neutralRelease190 && neutralRelease200) {
        checks.push(checkAtMost(
            'relation.centering.neutralRelease190vs200.offsetDropDelta',
            Math.abs(
                neutralRelease190.neutralReleaseOffsetDrop350Ms -
                neutralRelease200.neutralReleaseOffsetDrop350Ms,
            ),
            2,
            5,
            16,
        ));
    }

    const driftApex = getMetrics('sharp-brake-drift-apex-line');
    const driftOutside = getMetrics('sharp-brake-drift-outside-line');

    if (driftApex && driftOutside) {
        checks.push(checkAtLeast(
            'relation.sharpDrift.outsideMinusApexEntryLoss',
            driftOutside.driftEntrySpeedDrop - driftApex.driftEntrySpeedDrop,
            20,
            8,
            20,
        ));
    }

    const oversteer = getMetrics('sharp-drift-oversteer');

    if (driftApex && oversteer) {
        checks.push(checkAtLeast(
            'relation.sharpDrift.oversteerMinusApexEntryLoss',
            oversteer.driftEntrySpeedDrop - driftApex.driftEntrySpeedDrop,
            30,
            12,
            20,
        ));
    }

    return checks;
}

report.candidates.sort((left, right) => right.totalScore - left.totalScore);

const reportPath = path.join(outputDir, `handling-sim-${runId}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Handling simulation candidates: ${report.candidates.length}`);
console.log(`Handling simulation report wrote ${path.relative(projectRoot, reportPath)}`);
console.log('Handling simulation ranking:');
for (const candidate of report.candidates) {
    console.log(`- ${candidate.id}: ${candidate.totalScore}`);
}

function simulateScenario(scenario, controllerConfig) {
    const samples = [];
    const player = createDefaultPlayerVehicleState(
        scenario.initialSpeed ?? 440,
        controllerConfig.engineProfile,
        controllerConfig.accelSpeed,
    );
    let initialLateralOffsetApplied = false;
    let speedOverrideApplied = false;
    const initialLateralOffsetAtSec = scenario.initialLateralOffsetAtSec ?? 0;
    const speedOverrideAtSec = scenario.speedOverrideAtSec ?? Number.POSITIVE_INFINITY;
    const dt = 1 / config.sampleHz;
    const steps = Math.round(scenario.durationSec * config.sampleHz);

    for (let step = 0; step <= steps; step += 1) {
        const t = step * dt;
        if (!initialLateralOffsetApplied && t >= initialLateralOffsetAtSec) {
            player.lateralOffset = scenario.initialLateralOffset ?? 0;
            initialLateralOffsetApplied = true;
        }
        if (!speedOverrideApplied && t >= speedOverrideAtSec) {
            player.speed = scenario.speedOverride ?? player.speed;
            speedOverrideApplied = true;
        }
        const input = scenario.getInput(t);
        const road = scenario.getRoad(t);

        updatePlayerVehicle(
            player,
            input,
            road,
            controllerConfig,
            dt,
        );

        samples.push({
            currentCurve: road.currentCurve,
            cornerGrade: player.cornerDemand.grade,
            cornerLineQuality: player.cornerDemand.lineQuality,
            downhillCornerCarryRatio: player.cornerDemand.downhillCarryRatio,
            cornerSafetyMarginRatio: player.cornerDemand.safetyMarginRatio,
            cornerSpeedBudget: player.cornerDemand.targetSpeed,
            cornerSpeedOverBudget: player.cornerDemand.speedOverBudget,
            driftRatio: player.driftRatio,
            driftState: player.driftState,
            driftThrottleLiftTimer: player.driftThrottleLiftTimer,
            driftDirection: player.driftDirection,
            driftLateralVelocity: player.driftLateralVelocity,
            driftBaseLateralVelocity: player.driftBaseLateralVelocity,
            driftExitThrottleDelay: player.driftExitThrottleDelay,
            counterSteerTimer: player.counterSteerTimer,
            counterSteerLateralVelocity: player.counterSteerLateralVelocity,
            counterSteerEntryDriftVelocity: player.counterSteerEntryDriftVelocity,
            counterTrimRatio: player.counterTrimRatio,
            driftTransitionArmed: player.driftTransitionArmed,
            driftTransitionDirection: player.driftTransitionDirection,
            gripCounterRoadLateralVelocity: player.gripCounterRoadLateralVelocity,
            gripCounterRoadRatio: player.gripCounterRoadRatio,
            inputSteerAxis: input.steerAxis,
            gripSteerAngleLimit: player.gripSteerAngleLimit,
            lateralOffset: player.lateralOffset,
            centeringCounterHoldTimer: player.centeringCounterHoldTimer,
            centeringForce: player.centeringForce,
            centeringReleaseTimer: player.centeringReleaseTimer,
            lateralCenteringScale: player.lateralCenteringScale,
            lateralCenteringTargetScale: player.lateralCenteringTargetScale,
            overspeedUndersteerLateralVelocity: player.overspeedUndersteerLateralVelocity,
            overspeedUndersteerRatio: player.overspeedUndersteerRatio,
            overspeedUndersteerTargetRatio: player.overspeedUndersteerTargetRatio,
            rpm: player.rpm,
            speed: player.speed,
            slopeAcceleration: road.slopeAcceleration,
            slipAngle: player.slipAngle,
            steering: player.steering,
            steeringVelocity: player.steeringVelocity,
            t,
        });
    }

    return samples;
}

function scoreScenario(scenarioId, scenario, samples, controllerConfig) {
    const metrics = collectMetrics(samples, controllerConfig, scenario);
    const checks = [
        checkAtMost('offsetClampHitCount', metrics.offsetClampHitCount, 0, 2, 16),
        checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 620, 700, 14),
    ];

    // These scenarios deliberately use a lift to request recovery or a drift
    // transition; evaluate their state response rather than penalizing the
    // intended speed shed.
    if (![
        'brake-drift-entry-left',
        'brake-drift-entry-right',
        'budget-sharp-brake-drift',
        'counter-lift-exit',
        'counter-transition',
        'drift-throttle-long-lift-exit',
        'explicit-recovery',
        'lift-drift-entry',
        'sharp-brake-drift-apex-line',
        'sharp-brake-drift-outside-line',
        'sharp-drift-oversteer',
        'sharp-overspeed-brake-recovery',
        'sharp-overspeed-demand-only',
        'sharp-prepared-grip',
    ].includes(scenarioId)) {
        checks.push(checkAtMost('speedDropFromPeak', metrics.speedDropFromPeak, 140, 230, 12));
    }

    if (scenarioId === 'straight-accel-20s') {
        checks.push(checkAtLeast('speedGain', metrics.speedGain, 300, 180, 24));
        checks.push(checkAtMost('straightDrift.maxAbs', metrics.lateralOffsetMaxAbs, 70, 160, 18));
        checks.push(checkAtLeast('displayTopSpeedKmh', metrics.displayTopSpeedKmh, 185, 183, 12));
        checks.push(checkAtMost('displayTopSpeedKmh', metrics.displayTopSpeedKmh, 185, 187, 12));
    }

    if (scenarioId === 'standing-start-12s') {
        checks.push(checkAtLeast('timeTo100Kmh', metrics.timeTo100Kmh, 4.5, 3.2, 12));
        checks.push(checkAtMost('timeTo100Kmh', metrics.timeTo100Kmh, 7.5, 9, 14));
        checks.push(checkAtLeast('speedGain', metrics.speedGain, 250, 170, 14));
        checks.push(checkAtMost('standingStartDrift.maxAbs', metrics.lateralOffsetMaxAbs, 40, 100, 10));
    }

    if (scenarioId === 'left-hold-3s-release') {
        checks.push(checkAtMost('steerHoldOffset.maxAbs', metrics.lateralOffsetMaxAbs, 240, 340, 14));
        checks.push(checkAtLeast('steeringMaxAbs', metrics.steeringMaxAbs, 0.7, 0.5, 8));
        checks.push(checkAtMost('steeringResponseMs', metrics.steeringResponseMs, 250, 650, 18));
        checks.push(checkAtMost('steeringRecoveryMs', metrics.steeringRecoveryMs, 500, 1100, 18));
        checks.push(checkAtMost('timeToLateralOffset200', metrics.timeToLateralOffset200, 2200, 3400, 8));
    }

    if (scenarioId === 'curve-no-input') {
        checks.push(checkAtMost('curveNoInputDriftMax', metrics.lateralOffsetMaxAbs, 55, 110, 28));
        checks.push(checkAtLeast('curveSpeedGain', metrics.speedGain, 230, 160, 14));
    }

    if (scenarioId === 'micro-tap-left') {
        checks.push(checkAtMost('microTapOffset.maxAbs', metrics.lateralOffsetMaxAbs, 28, 70, 22));
        checks.push(checkAtMost('postReleaseOffsetHalfLife', metrics.postReleaseOffsetHalfLifeMs, 900, 1500, 10));
        checks.push(checkAtLeast('steeringMaxAbs', metrics.steeringMaxAbs, 0.16, 0.08, 10));
    }

    if (scenarioId === 'hold-left-1s-release') {
        checks.push(checkAtMost('hold1Offset.maxAbs', metrics.lateralOffsetMaxAbs, 115, 190, 18));
        checks.push(checkAtMost('postReleaseOffsetOvershoot', metrics.postReleaseOffsetOvershoot, 25, 70, 12));
        checks.push(checkAtMost('postReleaseOffsetHalfLife', metrics.postReleaseOffsetHalfLifeMs, 1100, 1800, 10));
    }

    if (scenarioId === 'slalom-20s') {
        checks.push(checkAtMost('slalomOffsetRms', metrics.slalomOffsetRms, 210, 300, 18));
        checks.push(checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 360, 520, 16));
        checks.push(checkAtLeast('steeringPeakHoldRatio', metrics.steeringPeakHoldRatio, 0.55, 0.35, 8));
    }

    if (scenarioId === 'curve-counter-steer') {
        checks.push(checkAtMost('curveCounterSteerRecoveryMs', metrics.curveCounterSteerRecoveryMs, 1500, 2600, 20));
        checks.push(checkAtMost('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 220, 360, 16));
    }

    if (['lift-drift-entry', 'brake-drift-entry-left', 'brake-drift-entry-right'].includes(scenarioId)) {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 24));
        checks.push(checkAtMost('driftEntryMs', metrics.driftEntryMs, 450, 900, 16));
    }

    if (scenarioId === 'lift-drift-entry') {
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 30, 12, 16));
    }

    if (['brake-drift-entry-left', 'brake-drift-entry-right'].includes(scenarioId)) {
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 25, 10, 14));
    }

    if (scenarioId === 'drift-counter-steer-recovery') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 20));
        checks.push(checkAtMost('driftRecoveryMs', metrics.driftRecoveryMs, 700, 1300, 22));
    }

    if (scenarioId === 'high-speed-grip-angle-cap') {
        checks.push(checkAtLeast('gripSteeringMaxAbs', metrics.gripSteeringMaxAbs, 0.5, 0.38, 12));
        checks.push(checkAtMost('gripSteeringMaxAbs', metrics.gripSteeringMaxAbs, 1, 1.01, 18));
        checks.push(checkAtMost('gripSteerAuthority.mean', metrics.gripSteerAuthorityMean, 0.82, 0.92, 12));
        checks.push(checkAtLeast('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 20, 8, 14));
        checks.push(checkAtMost('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 110, 180, 10));
    }

    if (scenarioId === 'easy-bend-grip') {
        checks.push(checkAtMost('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 55, 100, 18));
        checks.push(checkAtLeast('cornerGrade.easyRatio', metrics.cornerGradeEasyRatio, 0.6, 0.3, 14));
    }

    if (scenarioId === 'sharp-overspeed-grip') {
        checks.push(checkAtLeast('overspeedUndersteerRatio.max', metrics.overspeedUndersteerRatioMax, 0.5, 0.25, 22));
        checks.push(checkAtMost('gripSteerAuthority.mean', metrics.gripSteerAuthorityMean, 0.57, 0.72, 16));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'sharp-overspeed-demand-only') {
        checks.push(checkAtLeast('overspeedUndersteerRatio.entry', metrics.overspeedUndersteerRatioAtEntry, 0.25, 0.12, 20));
        checks.push(checkAtLeast('overspeedUndersteerRatio.max', metrics.overspeedUndersteerRatioMax, 0.5, 0.25, 22));
        checks.push(checkAtLeast(
            'overspeedUndersteerLateralVelocity.maxAbs',
            metrics.overspeedUndersteerLateralVelocityMaxAbs,
            60,
            30,
            18,
        ));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'sharp-counter-road-grip') {
        checks.push(checkAtLeast('gripCounterRoadRatio.max', metrics.gripCounterRoadRatioMax, 0.55, 0.3, 24));
        checks.push(checkAtLeast('gripCounterRoadLateralVelocity.maxAbs', metrics.gripCounterRoadLateralVelocityMaxAbs, 45, 24, 20));
        checks.push(checkAtLeast('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 300, 180, 22));
        checks.push(checkAtLeast('cornerSafetyMarginRatio.max', metrics.cornerSafetyMarginRatioMax, 0.18, 0.08, 18));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'sharp-counter-road-tap') {
        checks.push(checkAtLeast('gripCounterRoadRatio.max', metrics.gripCounterRoadRatioMax, 0.55, 0.3, 20));
        checks.push(checkAtLeast('counterRoadTap.outwardOffsetDelta', metrics.counterRoadTapOutwardOffsetDelta, 14, 6, 22));
        checks.push(checkAtLeast('counterRoadTap.lateralVelocity.maxAbs', metrics.counterRoadTapLateralVelocityMaxAbs, 24, 12, 18));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'sharp-prepared-grip') {
        checks.push(checkAtMost('overspeedUndersteerRatio.max', metrics.overspeedUndersteerRatioMax, 0.7, 0.9, 18));
        checks.push(checkAtLeast('gripSteerAuthority.mean', metrics.gripSteerAuthorityMean, 0.62, 0.48, 16));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (['right-lane-hold-grip', 'right-lane-hold-downhill'].includes(scenarioId)) {
        checks.push(checkAtLeast('laneOffsetRatio.entry', metrics.laneOffsetRatioAtEntry, 0.22, 0.16, 18));
        checks.push(checkAtLeast('laneOffsetRatio.holdEnd', metrics.laneOffsetRatioAtHoldEnd, 0.18, 0.1, 22));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 12));
    }

    if (scenarioId === 'right-lane-release-recenter') {
        checks.push(checkAtLeast('laneOffsetRatio.release', metrics.laneOffsetRatioAtRelease, 0.2, 0.14, 16));
        checks.push(checkAtLeast(
            'laneOffsetRatio.afterRelease250ms',
            metrics.laneOffsetRatioAfterRelease250Ms,
            0.19,
            0.12,
            20,
        ));
        checks.push(checkAtMost('laneOffsetRatio.releaseEnd', metrics.laneOffsetRatioAtEnd, 0.12, 0.2, 16));
    }

    if (['high-speed-counter-tap-190', 'high-speed-counter-tap-200'].includes(scenarioId)) {
        checks.push(checkAtMost(
            'centeringScale.counter100ms',
            metrics.centeringScaleAtCounter100Ms,
            0.64,
            0.78,
            20,
        ));
        checks.push(checkAtMost(
            'centeringScale.counterTap.max',
            metrics.centeringScaleMaxDuringCounterTap,
            0.78,
            0.94,
            18,
        ));
        checks.push(checkAtMost(
            'centeringForce.counter100ms.step',
            metrics.centeringForceStepAtCounter,
            290,
            480,
            14,
        ));
    }

    if (scenarioId === 'high-speed-counter-hold-200') {
        checks.push(checkAtLeast(
            'centeringScale.counterHold300ms',
            metrics.centeringScaleAtCounterHold300Ms,
            0.92,
            0.78,
            18,
        ));
    }

    if (['high-speed-neutral-release-190', 'high-speed-neutral-release-200'].includes(scenarioId)) {
        checks.push(checkAtMost(
            'centeringScale.neutralRelease150ms',
            metrics.centeringScaleAtNeutralRelease150Ms,
            0.37,
            0.44,
            20,
        ));
        checks.push(checkAtMost(
            'neutralRelease.offsetDrop350ms',
            metrics.neutralReleaseOffsetDrop350Ms,
            8,
            16,
            18,
        ));
        checks.push(checkAtMost(
            'neutralRelease.inwardVelocityMax',
            metrics.neutralReleaseInwardVelocityMax,
            20.5,
            32,
            18,
        ));
    }

    if (scenarioId === 'sharp-understeer-threshold-build') {
        checks.push(checkAtMost(
            'overspeedUndersteerRatio.stepMax',
            metrics.overspeedUndersteerRatioStepMax,
            0.16,
            0.3,
            22,
        ));
        checks.push(checkAtLeast(
            'overspeedUndersteerRatio.max',
            metrics.overspeedUndersteerRatioMax,
            0.35,
            0.16,
            18,
        ));
    }

    if (scenarioId === 'budget-medium-full-throttle') {
        checks.push(checkAtLeast(
            'cornerSpeedOverBudget.entry',
            metrics.cornerSpeedOverBudgetAtEntry,
            90,
            50,
            14,
        ));
    }

    if (scenarioId === 'budget-medium-prepared-grip') {
        checks.push(checkAtMost(
            'cornerSpeedOverBudget.entry',
            metrics.cornerSpeedOverBudgetAtEntry,
            45,
            80,
            14,
        ));
    }

    if (scenarioId === 'budget-sharp-full-throttle') {
        checks.push(checkAtLeast(
            'cornerSpeedOverBudget.entry',
            metrics.cornerSpeedOverBudgetAtEntry,
            160,
            110,
            14,
        ));
    }

    if (scenarioId === 'downhill-sharp-full-throttle') {
        checks.push(checkAtLeast('downhillCornerCarryRatio.max', metrics.downhillCornerCarryRatioMax, 0.85, 0.55, 18));
        checks.push(checkAtLeast('cornerSafetyMarginRatio.max', metrics.cornerSafetyMarginRatioMax, 0.08, 0.03, 18));
        checks.push(checkAtLeast('lateralOffset.maxAbs', metrics.lateralOffsetMaxAbs, 150, 95, 18));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'downhill-sharp-prepared-grip') {
        checks.push(checkAtLeast('downhillCornerCarryRatio.max', metrics.downhillCornerCarryRatioMax, 0.85, 0.55, 18));
        checks.push(checkAtMost('cornerSpeedOverBudget.entry', metrics.cornerSpeedOverBudgetAtEntry, 80, 120, 14));
        checks.push(checkAtMost('driftRatio.max', metrics.driftRatioMax, 0.02, 0.1, 14));
    }

    if (scenarioId === 'budget-sharp-brake-drift') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
    }

    if (scenarioId === 'sharp-bend-apex-line') {
        checks.push(checkAtLeast('cornerGrade.sharpRatio', metrics.cornerGradeSharpRatio, 0.6, 0.3, 14));
        checks.push(checkAtLeast('cornerLineQuality.entry', metrics.cornerLineQualityAtEntry, 0.85, 0.62, 18));
        checks.push(checkAtMost('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 65, 90, 14));
    }

    if (scenarioId === 'sharp-bend-outside-line') {
        checks.push(checkAtLeast('cornerGrade.sharpRatio', metrics.cornerGradeSharpRatio, 0.6, 0.3, 14));
        checks.push(checkAtMost('cornerLineQuality.entry', metrics.cornerLineQualityAtEntry, 0.15, 0.38, 18));
        checks.push(checkAtLeast('gripCornerSpeedDrop', metrics.gripCornerSpeedDrop, 65, 42, 14));
    }

    if (scenarioId === 'sharp-brake-drift-apex-line') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 16));
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 75, 45, 16));
        checks.push(checkAtMost('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 125, 165, 16));
        checks.push(checkAtMost('driftExitThrottleDelay.max', metrics.driftExitThrottleDelayMax, 0.04, 0.12, 14));
        checks.push(checkAtLeast('driftExitOneSecondSpeedGain', metrics.driftExitOneSecondSpeedGain, 8, 0, 14));
    }

    if (scenarioId === 'sharp-brake-drift-outside-line') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 16));
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 130, 90, 18));
    }

    if (scenarioId === 'sharp-drift-oversteer') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 16));
        checks.push(checkAtLeast('driftEntrySpeedDrop', metrics.driftEntrySpeedDrop, 145, 100, 18));
        checks.push(checkAtMost('cornerLineQualityAtEntry', metrics.cornerLineQualityAtEntry, 0.1, 0.28, 14));
    }

    if (scenarioId === 'counter-tap-release') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 16));
        checks.push(checkAtLeast('counterReleaseResumeRatio', metrics.counterReleaseResumeRatio, 0.65, 0.35, 24));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 20));
        checks.push(checkAtLeast('counterReleaseDriftHold', metrics.counterReleaseDriftHold, 1, 0, 16));
    }

    if (scenarioId === 'counter-hold') {
        checks.push(checkAtLeast('counterMomentumMinAbs', metrics.counterMomentumMinAbs, 35, 15, 18));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 22));
        checks.push(checkAtMost('counterHoldOffsetDelta.abs', Math.abs(metrics.counterHoldOffsetDelta), 120, 220, 14));
    }

    if (scenarioId === 'counter-long-hold') {
        checks.push(checkAtLeast('counterSustainedMomentumMinAbs', metrics.counterSustainedMomentumMinAbs, 25, 12, 22));
        checks.push(checkAtLeast('counterSustainedMomentumRatio', metrics.counterSustainedMomentumRatio, 0.2, 0.1, 16));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 18));
    }

    if (scenarioId === 'drift-throttle-blip-hold') {
        checks.push(checkAtLeast('throttleBlipDriftHold', metrics.throttleBlipDriftHold, 1, 0, 24));
        checks.push(checkAtLeast('throttleBlipMomentumRatio', metrics.throttleBlipMomentumRatio, 0.45, 0.2, 20));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 18));
    }

    if (scenarioId === 'drift-throttle-long-lift-exit') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtMost('explicitRecoveryMs', metrics.explicitRecoveryMs, 900, 1400, 22));
    }

    if (scenarioId === 'counter-lift-exit') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtMost('explicitRecoveryMs', metrics.explicitRecoveryMs, 800, 1400, 22));
        checks.push(checkAtMost('counterDirectionChangeCount', metrics.counterDirectionChangeCount, 0, 1, 22));
    }

    if (scenarioId === 'explicit-recovery') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtMost('explicitRecoveryMs', metrics.explicitRecoveryMs, 800, 1500, 22));
    }

    if (scenarioId === 'counter-transition') {
        checks.push(checkAtLeast('driftRatio.max', metrics.driftRatioMax, 0.45, 0.2, 14));
        checks.push(checkAtLeast('transitionCommitted', metrics.transitionCommitted, 1, 0, 24));
        checks.push(checkAtMost('transitionCommitMs', metrics.transitionCommitMs, 700, 1300, 18));
    }

    const penalty = checks.reduce((total, check) => total + check.penalty, 0);

    return {
        checks,
        metrics,
        pass: checks.every((check) => check.status !== 'fail'),
        totalScore: Math.max(0, Math.round(100 - penalty)),
    };
}

function measureCornerGradeRatio(samples, grade) {
    const cornerSamples = samples.filter((entry) => entry.cornerGrade !== 'straight');

    return cornerSamples.length > 0
        ? round(cornerSamples.filter((entry) => entry.cornerGrade === grade).length / cornerSamples.length)
        : null;
}

function measureCornerLineQualityAverage(samples) {
    const cornerSamples = samples.filter((entry) => entry.cornerGrade !== 'straight');

    return cornerSamples.length > 0
        ? round(cornerSamples.reduce((total, entry) => total + entry.cornerLineQuality, 0) / cornerSamples.length)
        : null;
}

function measureCornerLineQualityAtEntry(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.steerStartSec + 0.1);

    return sample ? round(sample.cornerLineQuality) : null;
}

function getBudgetCornerSamples(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return [];

    return samples.filter((entry) => (
        entry.t >= scenario.steerStartSec &&
        entry.t <= scenario.steerEndSec &&
        entry.cornerGrade !== 'straight'
    ));
}

function measureCornerSpeedBudgetAtEntry(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.steerStartSec + 0.1);
    return sample ? round(sample.cornerSpeedBudget) : null;
}

function measureCornerSpeedOverBudgetAtEntry(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.steerStartSec + 0.1);
    return sample ? round(sample.cornerSpeedOverBudget) : null;
}

function measureCornerSpeedOverBudgetMax(samples, scenario) {
    const active = getBudgetCornerSamples(samples, scenario);
    return active.length > 0 ? round(Math.max(...active.map((entry) => entry.cornerSpeedOverBudget))) : null;
}

function measureCornerSpeedOverBudgetMean(samples, scenario) {
    const active = getBudgetCornerSamples(samples, scenario);
    return active.length > 0
        ? round(active.reduce((total, entry) => total + entry.cornerSpeedOverBudget, 0) / active.length)
        : null;
}

function measureCornerSpeedBudgetComplianceRatio(samples, scenario) {
    const active = getBudgetCornerSamples(samples, scenario);
    return active.length > 0
        ? round(active.filter((entry) => entry.cornerSpeedOverBudget <= 0.001).length / active.length)
        : null;
}

function measureCornerSpeedAtExit(samples, scenario) {
    if (typeof scenario.steerEndSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.steerEndSec - 0.05);
    return sample ? round(sample.speed) : null;
}

function measureCornerSafetyMarginRatioMax(samples, scenario) {
    const active = getBudgetCornerSamples(samples, scenario);
    return active.length > 0 ? round(Math.max(...active.map((entry) => entry.cornerSafetyMarginRatio))) : null;
}

function measureCounterRoadTapOutwardOffsetDelta(samples, scenario) {
    if (
        typeof scenario.counterRoadStartSec !== 'number' ||
        typeof scenario.counterRoadEndSec !== 'number'
    ) return null;

    const start = findSampleAtOrAfter(samples, scenario.counterRoadStartSec);
    const end = findSampleAtOrAfter(samples, scenario.counterRoadEndSec);
    if (!start || !end) return null;

    const outwardDirection = -Math.sign(start.currentCurve);
    return outwardDirection === 0 ? null : round(outwardDirection * (end.lateralOffset - start.lateralOffset));
}

function measureCounterRoadTapLateralVelocityMaxAbs(samples, scenario) {
    if (
        typeof scenario.counterRoadStartSec !== 'number' ||
        typeof scenario.counterRoadEndSec !== 'number'
    ) return null;

    const active = samples.filter((entry) => (
        entry.t >= scenario.counterRoadStartSec &&
        entry.t <= scenario.counterRoadEndSec
    ));
    return active.length > 0
        ? round(Math.max(...active.map((entry) => Math.abs(entry.gripCounterRoadLateralVelocity))) )
        : null;
}

function collectMetrics(samples, controllerConfig, scenario) {
    const speeds = samples.map((sample) => sample.speed);
    const offsets = samples.map((sample) => sample.lateralOffset);
    const steering = samples.map((sample) => sample.steering);
    const driftRatios = samples.map((sample) => sample.driftRatio);
    const speedMax = Math.max(...speeds);
    const speedFirst = speeds[0];
    const speedLast = speeds[speeds.length - 1];

    return {
        cornerGradeEasyRatio: measureCornerGradeRatio(samples, 'easy'),
        cornerGradeSharpRatio: measureCornerGradeRatio(samples, 'sharp'),
        downhillCornerCarryRatioMax: round(Math.max(...samples.map((sample) => sample.downhillCornerCarryRatio))),
        cornerLineQualityAtEntry: measureCornerLineQualityAtEntry(samples, scenario),
        cornerLineQualityAverage: measureCornerLineQualityAverage(samples),
        cornerSpeedBudgetAtEntry: measureCornerSpeedBudgetAtEntry(samples, scenario),
        cornerSpeedOverBudgetAtEntry: measureCornerSpeedOverBudgetAtEntry(samples, scenario),
        cornerSpeedOverBudgetMax: measureCornerSpeedOverBudgetMax(samples, scenario),
        cornerSpeedOverBudgetMean: measureCornerSpeedOverBudgetMean(samples, scenario),
        cornerSpeedBudgetComplianceRatio: measureCornerSpeedBudgetComplianceRatio(samples, scenario),
        cornerSpeedAtExit: measureCornerSpeedAtExit(samples, scenario),
        cornerSafetyMarginRatioMax: measureCornerSafetyMarginRatioMax(samples, scenario),
        counterRoadTapLateralVelocityMaxAbs: measureCounterRoadTapLateralVelocityMaxAbs(samples, scenario),
        counterRoadTapOutwardOffsetDelta: measureCounterRoadTapOutwardOffsetDelta(samples, scenario),
        lateralOffsetMaxAbs: round(Math.max(...offsets.map((value) => Math.abs(value)))),
        lateralOffsetRms: round(Math.sqrt(
            offsets.reduce((total, value) => total + value * value, 0) / offsets.length,
        )),
        offsetClampHitCount: offsets.filter((value) => Math.abs(value) >= controllerConfig.maxRoadOffset - 10).length,
        speedDropFromPeak: round(speedMax - speedLast),
        displaySpeedMaxKmh: round(getDisplaySpeedKmh(
            speedMax,
            controllerConfig.accelSpeed,
            controllerConfig.engineProfile,
        )),
        displayTopSpeedKmh: controllerConfig.engineProfile.displayTopSpeedKmh,
        speedGain: round(speedLast - speedFirst),
        speedMax: round(speedMax),
        speedMin: round(Math.min(...speeds)),
        highSpeedSteeringMaxAbs: measureHighSpeedSteeringMaxAbs(samples, controllerConfig),
        highSpeedCurveSteeringMaxAbs: measureHighSpeedSteeringMaxAbs(
            samples,
            controllerConfig,
            (sample) => Math.abs(sample.currentCurve) > 0.1,
        ),
        gripSteerAuthorityMean: measureGripSteerAuthorityMean(samples, scenario),
        gripCornerInputOffsetAtEnd: measureGripCornerInputOffsetAtEnd(samples, scenario),
        gripCornerOutwardOffsetMean: measureGripCornerOutwardOffsetMean(samples, scenario),
        gripCounterRoadLateralVelocityMaxAbs: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.gripCounterRoadLateralVelocity)),
        )),
        gripCounterRoadRatioMax: round(Math.max(...samples.map((sample) => sample.gripCounterRoadRatio))),
        overspeedUndersteerRatioAtEntry: measureOverspeedUndersteerRatioAtEntry(samples, scenario),
        laneOffsetRatioAtEntry: measureLaneOffsetRatioAtEntry(samples, controllerConfig, scenario),
        laneOffsetRatioAtHoldEnd: measureLaneOffsetRatioAtTime(
            samples,
            controllerConfig,
            scenario.steerEndSec,
        ),
        laneOffsetRatioAtEnd: round(samples.at(-1).lateralOffset / controllerConfig.maxRoadOffset),
        laneOffsetRatioAtRelease: measureLaneOffsetRatioAtTime(
            samples,
            controllerConfig,
            scenario.laneReleaseSec,
        ),
        laneOffsetRatioAfterRelease250Ms: measureLaneOffsetRatioAtTime(
            samples,
            controllerConfig,
            typeof scenario.laneReleaseSec === 'number' ? scenario.laneReleaseSec + 0.25 : null,
        ),
        centeringScaleAtCounter100Ms: measureCenteringScaleAtCounter(samples, scenario, 0.1),
        centeringScaleAtCounterHold300Ms: measureCenteringScaleAtCounter(samples, scenario, 0.3),
        centeringScaleMaxDuringCounterTap: measureCenteringScaleMaxDuringCounterTap(samples, scenario),
        centeringForceStepAtCounter: measureCenteringForceStepAtCounter(samples, scenario),
        centeringScaleAtNeutralRelease150Ms: measureCenteringScaleAtNeutralRelease(samples, scenario, 0.15),
        neutralReleaseOffsetDrop350Ms: measureNeutralReleaseOffsetDrop(samples, scenario, 0.35),
        neutralReleaseInwardVelocityMax: measureNeutralReleaseInwardVelocityMax(samples, scenario),
        gripCornerSpeedDrop: measureGripCornerSpeedDrop(samples, scenario),
        overspeedUndersteerLateralVelocityMaxAbs: round(Math.max(
            ...samples.map((sample) => Math.abs(sample.overspeedUndersteerLateralVelocity)),
        )),
        overspeedUndersteerLateralRecoveryMs: measureOverspeedUndersteerLateralRecoveryMs(samples, scenario),
        overspeedUndersteerRatioMax: round(Math.max(...samples.map((sample) => sample.overspeedUndersteerRatio))),
        overspeedUndersteerRatioStepMax: measureOverspeedUndersteerRatioStepMax(samples),
        gripSteeringMaxAbs: measureGripSteeringMaxAbs(samples, scenario),
        steeringMaxAbs: round(Math.max(...steering.map((value) => Math.abs(value)))),
        curveCounterSteerRecoveryMs: measureCurveCounterSteerRecoveryMs(samples, scenario),
        counterDirectionChangeCount: measureCounterDirectionChangeCount(samples, scenario),
        counterHoldOffsetDelta: measureCounterHoldOffsetDelta(samples, scenario),
        counterMomentumMinAbs: measureCounterMomentumMinAbs(samples, scenario),
        counterSustainedMomentumMinAbs: measureCounterSustainedMomentumMinAbs(samples, scenario),
        counterSustainedMomentumRatio: measureCounterSustainedMomentumRatio(samples, scenario),
        counterReleaseDriftHold: measureCounterReleaseDriftHold(samples, scenario),
        counterReleaseResumeRatio: measureCounterReleaseResumeRatio(samples, scenario),
        driftEntryMs: measureDriftEntryMs(samples, scenario),
        driftEntrySpeedDrop: measureDriftEntrySpeedDrop(samples, scenario),
        driftExitOneSecondSpeedGain: measureDriftExitOneSecondSpeedGain(samples, scenario),
        driftExitThrottleDelayMax: measureDriftExitThrottleDelayMax(samples, scenario),
        driftRatioMax: round(Math.max(...driftRatios)),
        driftSustainSpeedDrop: measureDriftSustainSpeedDrop(samples, scenario),
        driftRecoveryMs: measureDriftRecoveryMs(samples, scenario),
        explicitRecoveryMs: measureExplicitRecoveryMs(samples, scenario),
        postReleaseOffsetHalfLifeMs: measurePostReleaseOffsetHalfLifeMs(samples, scenario),
        postReleaseOffsetOvershoot: measurePostReleaseOffsetOvershoot(samples, scenario),
        slalomOffsetRms: measureSlalomOffsetRms(samples),
        steeringPeakHoldRatio: measureSteeringPeakHoldRatio(samples),
        steeringRecoveryMs: measureSteeringRecoveryMs(samples),
        steeringResponseMs: measureSteeringResponseMs(samples),
        timeToLateralOffset100: measureTimeToLateralOffset(samples, scenario, 100),
        timeToLateralOffset200: measureTimeToLateralOffset(samples, scenario, 200),
        timeTo100Kmh: measureTimeToKmh(samples, controllerConfig, 100),
        transitionCommitMs: measureTransitionCommitMs(samples, scenario),
        transitionCommitted: measureTransitionCommitted(samples, scenario),
        transitionArmedMs: measureTransitionArmedMs(samples, scenario),
        throttleBlipDriftHold: measureThrottleBlipDriftHold(samples, scenario),
        throttleBlipMomentumRatio: measureThrottleBlipMomentumRatio(samples, scenario),
    };
}

function measureGripSteerAuthorityMean(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return null;

    const active = samples.filter((entry) => (
        entry.t >= scenario.steerStartSec &&
        entry.t <= scenario.steerEndSec &&
        entry.driftState === 'grip'
    ));

    return active.length > 0
        ? round(active.reduce((total, entry) => total + entry.gripSteerAngleLimit, 0) / active.length)
        : null;
}

function getGripCornerSamples(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return [];

    return samples.filter((entry) => (
        entry.t >= scenario.steerStartSec &&
        entry.t <= scenario.steerEndSec &&
        entry.driftState === 'grip'
    ));
}

function measureGripCornerInputOffsetAtEnd(samples, scenario) {
    const active = getGripCornerSamples(samples, scenario);
    const last = active.at(-1);

    return last ? round(Math.sign(last.inputSteerAxis || 1) * last.lateralOffset) : null;
}

function measureGripCornerOutwardOffsetMean(samples, scenario) {
    const active = getGripCornerSamples(samples, scenario).filter((entry) => Math.abs(entry.currentCurve) > 0.1);

    return active.length > 0
        ? round(active.reduce(
            (total, entry) => total - Math.sign(entry.currentCurve) * entry.lateralOffset,
            0,
        ) / active.length)
        : null;
}

function measureOverspeedUndersteerRatioAtEntry(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number') return null;

    const entry = findSampleAtOrAfter(samples, scenario.steerStartSec + 0.1);

    return entry ? round(entry.overspeedUndersteerRatio) : null;
}

function measureLaneOffsetRatioAtEntry(samples, controllerConfig, scenario) {
    if (typeof scenario.steerStartSec !== 'number') return null;

    const entry = findSampleAtOrAfter(samples, scenario.steerStartSec + 0.1);

    return entry ? round(entry.lateralOffset / controllerConfig.maxRoadOffset) : null;
}

function measureLaneOffsetRatioAtTime(samples, controllerConfig, timeSec) {
    if (typeof timeSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, timeSec);

    return sample ? round(sample.lateralOffset / controllerConfig.maxRoadOffset) : null;
}

function measureCenteringScaleAtCounter(samples, scenario, offsetSec) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.counterStartSec + offsetSec);
    return sample ? round(sample.lateralCenteringScale) : null;
}

function measureCenteringScaleMaxDuringCounterTap(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number' || typeof scenario.counterTapEndSec !== 'number') {
        return null;
    }

    const active = samples.filter((entry) => (
        entry.t >= scenario.counterStartSec && entry.t <= scenario.counterTapEndSec
    ));
    return active.length > 0 ? round(Math.max(...active.map((entry) => entry.lateralCenteringScale))) : null;
}

function measureCenteringForceStepAtCounter(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const start = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const after100Ms = findSampleAtOrAfter(samples, scenario.counterStartSec + 0.1);
    return start && after100Ms ? round(Math.abs(after100Ms.centeringForce - start.centeringForce)) : null;
}

function measureCenteringScaleAtNeutralRelease(samples, scenario, offsetSec) {
    if (typeof scenario.neutralReleaseSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.neutralReleaseSec + offsetSec);
    return sample ? round(sample.lateralCenteringScale) : null;
}

function measureNeutralReleaseOffsetDrop(samples, scenario, offsetSec) {
    if (typeof scenario.neutralReleaseSec !== 'number') return null;

    const release = findSampleAtOrAfter(samples, scenario.neutralReleaseSec);
    const after = findSampleAtOrAfter(samples, scenario.neutralReleaseSec + offsetSec);
    return release && after ? round(Math.abs(release.lateralOffset) - Math.abs(after.lateralOffset)) : null;
}

function measureNeutralReleaseInwardVelocityMax(samples, scenario) {
    if (typeof scenario.neutralReleaseSec !== 'number') return null;

    const release = findSampleAtOrAfter(samples, scenario.neutralReleaseSec);
    if (!release || release.lateralOffset === 0) return null;

    const offsetDirection = Math.sign(release.lateralOffset);
    const active = samples.filter((entry) => (
        entry.t >= scenario.neutralReleaseSec && entry.t <= scenario.neutralReleaseSec + 0.5
    ));
    return active.length > 0
        ? round(Math.max(...active.map((entry) => -offsetDirection * entry.steeringVelocity)))
        : null;
}

function measureOverspeedUndersteerRatioStepMax(samples) {
    let maximum = 0;
    for (let index = 1; index < samples.length; index += 1) {
        maximum = Math.max(
            maximum,
            Math.abs(samples[index].overspeedUndersteerRatio - samples[index - 1].overspeedUndersteerRatio),
        );
    }
    return round(maximum);
}

function measureOverspeedUndersteerLateralRecoveryMs(samples, scenario) {
    if (typeof scenario.understeerRecoveryStartSec !== 'number') return null;

    const initial = findSampleAtOrAfter(samples, scenario.understeerRecoveryStartSec);
    if (!initial || Math.abs(initial.overspeedUndersteerLateralVelocity) < 0.001) return null;

    const threshold = Math.abs(initial.overspeedUndersteerLateralVelocity) * 0.25;
    const recovered = samples.find((entry) => (
        entry.t >= scenario.understeerRecoveryStartSec &&
        Math.abs(entry.overspeedUndersteerLateralVelocity) <= threshold &&
        entry.overspeedUndersteerRatio <= 0.12
    ));

    return recovered ? Math.round((recovered.t - scenario.understeerRecoveryStartSec) * 1000) : null;
}

function createSharpGripSpeedScenario(initialSpeed) {
    return {
        durationSec: 7,
        initialSpeed: 440,
        speedOverride: initialSpeed,
        speedOverrideAtSec: 2,
        steerEndSec: 5.5,
        steerStartSec: 2,
        getInput: (t) => ({
            accelPressed: t >= 2,
            brakePressed: false,
            steerAxis: t >= 2 && t < 5.5 ? 0.7 : 0,
        }),
        getRoad: (t) => ({
            currentCurve: t < 2 ? 0 : 0.62,
            slopeAcceleration: 0,
        }),
    };
}

function measureThrottleBlipDriftHold(samples, scenario) {
    if (typeof scenario.throttleResumeSec !== 'number' || typeof scenario.driftEntrySec !== 'number') {
        return null;
    }

    const initial = findSampleAtOrAfter(samples, scenario.driftEntrySec + 0.35);
    const resumed = findSampleAtOrAfter(samples, scenario.throttleResumeSec + 0.18);

    return initial && resumed &&
        resumed.driftState === 'drift' &&
        resumed.driftDirection === initial.driftDirection
        ? 1
        : 0;
}

function measureThrottleBlipMomentumRatio(samples, scenario) {
    if (typeof scenario.throttleLiftStartSec !== 'number' || typeof scenario.throttleResumeSec !== 'number') {
        return null;
    }

    const beforeLift = [...samples].reverse().find((entry) => entry.t < scenario.throttleLiftStartSec);
    const resumed = findSampleAtOrAfter(samples, scenario.throttleResumeSec + 0.18);

    if (!beforeLift || !resumed || Math.abs(beforeLift.driftLateralVelocity) < 0.001) return null;

    return round(Math.abs(resumed.driftLateralVelocity) / Math.abs(beforeLift.driftLateralVelocity));
}

function measureDriftEntryMs(samples, scenario) {
    if (typeof scenario.driftEntrySec !== 'number') return null;

    const sample = samples.find((entry) => entry.t >= scenario.driftEntrySec && entry.driftState === 'drift');

    return sample ? Math.round((sample.t - scenario.driftEntrySec) * 1000) : null;
}

function measureDriftEntrySpeedDrop(samples, scenario) {
    if (typeof scenario.driftEntrySec !== 'number') return null;

    const before = [...samples].reverse().find((entry) => entry.t < scenario.driftEntrySec);
    const entered = samples.find((entry) => (
        entry.t >= scenario.driftEntrySec && entry.driftState === 'drift'
    ));

    return before && entered ? round(before.speed - entered.speed) : null;
}

function measureDriftSustainSpeedDrop(samples, scenario) {
    if (typeof scenario.driftEntrySec !== 'number') return null;

    const entered = samples.find((entry) => (
        entry.t >= scenario.driftEntrySec && entry.driftState === 'drift'
    ));
    const driftSamples = samples.filter((entry) => (
        entry.t >= scenario.driftEntrySec && entry.driftState === 'drift'
    ));

    return entered && driftSamples.length > 0
        ? round(entered.speed - Math.min(...driftSamples.map((entry) => entry.speed)))
        : null;
}

function measureDriftExitOneSecondSpeedGain(samples, scenario) {
    if (typeof scenario.recoveryStartSec !== 'number') return null;

    const exit = findSampleAtOrAfter(samples, scenario.recoveryStartSec);
    const later = findSampleAtOrAfter(samples, scenario.recoveryStartSec + 1);

    return exit && later ? round(later.speed - exit.speed) : null;
}

function measureDriftExitThrottleDelayMax(samples, scenario) {
    if (typeof scenario.recoveryStartSec !== 'number') return null;

    const active = samples.filter((entry) => (
        entry.t >= scenario.recoveryStartSec && entry.t <= scenario.recoveryStartSec + 0.5
    ));

    return active.length > 0
        ? round(Math.max(...active.map((entry) => entry.driftExitThrottleDelay)))
        : null;
}

function measureGripSteeringMaxAbs(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return null;

    const active = samples.filter((entry) => (
        entry.t >= scenario.steerStartSec && entry.t <= scenario.steerEndSec && entry.driftState === 'grip'
    ));

    return active.length > 0 ? round(Math.max(...active.map((entry) => Math.abs(entry.steering)))) : null;
}

function measureGripCornerSpeedDrop(samples, scenario) {
    if (typeof scenario.steerStartSec !== 'number' || typeof scenario.steerEndSec !== 'number') return null;

    const start = findSampleAtOrAfter(samples, scenario.steerStartSec);
    const active = samples.filter((entry) => (
        entry.t >= scenario.steerStartSec && entry.t <= scenario.steerEndSec
    ));

    return start && active.length > 0 ? round(start.speed - Math.min(...active.map((entry) => entry.speed))) : null;
}

function measureDriftRecoveryMs(samples, scenario) {
    if (typeof scenario.counterSteerStartSec !== 'number') return null;

    const sample = samples.find((entry) => (
        entry.t >= scenario.counterSteerStartSec && entry.driftState === 'grip'
    ));

    return sample ? Math.round((sample.t - scenario.counterSteerStartSec) * 1000) : null;
}

function measureCounterDirectionChangeCount(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const endSec = scenario.counterReleaseSec ?? scenario.transitionCommitSec ?? scenario.durationSec;
    const active = samples.filter((entry) => (
        entry.t >= scenario.counterStartSec && entry.t <= endSec
    ));
    if (active.length === 0) return null;

    let changes = 0;
    let previous = active[0].driftDirection;

    for (const entry of active.slice(1)) {
        if (entry.driftDirection !== 0 && previous !== 0 && entry.driftDirection !== previous) {
            changes += 1;
        }
        previous = entry.driftDirection;
    }

    return changes;
}

function measureCounterHoldOffsetDelta(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const start = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const end = findSampleAtOrAfter(samples, scenario.counterReleaseSec ?? scenario.durationSec);

    return start && end ? round(end.lateralOffset - start.lateralOffset) : null;
}

function measureCounterMomentumMinAbs(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const endSec = scenario.counterReleaseSec ?? scenario.durationSec;
    const active = samples.filter((entry) => (
        entry.t >= scenario.counterStartSec && entry.t <= endSec
    ));
    if (active.length === 0) return null;

    return round(Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity))));
}

function getCounterSustainSamples(samples, scenario) {
    if (typeof scenario.counterSustainStartSec !== 'number') return [];

    const endSec = scenario.counterReleaseSec ?? scenario.durationSec;

    return samples.filter((entry) => (
        entry.t >= scenario.counterSustainStartSec && entry.t <= endSec
    ));
}

function measureCounterSustainedMomentumMinAbs(samples, scenario) {
    const active = getCounterSustainSamples(samples, scenario);

    return active.length > 0
        ? round(Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity))))
        : null;
}

function measureCounterSustainedMomentumRatio(samples, scenario) {
    const active = getCounterSustainSamples(samples, scenario);
    if (active.length === 0) return null;

    const baseVelocity = Math.max(1, Math.abs(active[0].driftBaseLateralVelocity));
    const minVelocity = Math.min(...active.map((entry) => Math.abs(entry.driftLateralVelocity)));

    return round(minVelocity / baseVelocity);
}

function measureCounterReleaseDriftHold(samples, scenario) {
    if (typeof scenario.counterReleaseSec !== 'number') return null;

    const sample = findSampleAtOrAfter(samples, scenario.counterReleaseSec + 0.3);

    return sample?.driftState === 'drift' ? 1 : 0;
}

function measureCounterReleaseResumeRatio(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number' || typeof scenario.counterReleaseSec !== 'number') {
        return null;
    }

    const start = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const resumed = findSampleAtOrAfter(samples, scenario.counterReleaseSec + 0.4);
    if (!start || !resumed) return null;

    const denominator = Math.max(1, Math.abs(start.driftBaseLateralVelocity));

    return round(Math.abs(resumed.driftLateralVelocity) / denominator);
}

function measureExplicitRecoveryMs(samples, scenario) {
    if (typeof scenario.recoveryStartSec !== 'number') return null;

    const sample = samples.find((entry) => (
        entry.t >= scenario.recoveryStartSec && entry.driftState === 'grip'
    ));

    return sample ? Math.round((sample.t - scenario.recoveryStartSec) * 1000) : null;
}

function measureTransitionCommitted(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number' || typeof scenario.transitionCommitSec !== 'number') {
        return null;
    }

    const initial = findSampleAtOrAfter(samples, scenario.counterStartSec);
    const committed = samples.find((entry) => (
        entry.t >= scenario.transitionCommitSec &&
        entry.driftDirection !== 0 &&
        entry.driftDirection !== initial?.driftDirection
    ));

    return committed ? 1 : 0;
}

function measureTransitionCommitMs(samples, scenario) {
    if (typeof scenario.transitionCommitSec !== 'number') return null;

    const initial = findSampleAtOrAfter(samples, scenario.counterStartSec ?? 0);
    const committed = samples.find((entry) => (
        entry.t >= scenario.transitionCommitSec &&
        entry.driftDirection !== 0 &&
        entry.driftDirection !== initial?.driftDirection
    ));

    return committed ? Math.round((committed.t - scenario.transitionCommitSec) * 1000) : null;
}

function measureTransitionArmedMs(samples, scenario) {
    if (typeof scenario.counterStartSec !== 'number') return null;

    const armed = samples.find((entry) => entry.driftTransitionArmed);

    return armed ? Math.round((armed.t - scenario.counterStartSec) * 1000) : null;
}

function measureSteeringResponseMs(samples) {
    const startSec = 2;
    const sample = samples.find((entry) => entry.t >= startSec && Math.abs(entry.steering) >= 0.25);

    return sample ? Math.round((sample.t - startSec) * 1000) : null;
}

function measureSteeringRecoveryMs(samples) {
    const releaseSec = 5;
    const sample = samples.find((entry) => entry.t >= releaseSec && Math.abs(entry.steering) <= 0.12);

    return sample ? Math.round((sample.t - releaseSec) * 1000) : null;
}

function measureTimeToKmh(samples, controllerConfig, targetKmh) {
    const targetRatio = targetKmh / controllerConfig.engineProfile.displayTopSpeedKmh;
    const smoothTargetRatio = targetRatio <= 0
        ? 0
        : targetRatio >= 1
            ? 1
            : 0.5 - Math.sin(Math.asin(1 - 2 * targetRatio) / 3);
    const targetSpeed = smoothTargetRatio * controllerConfig.accelSpeed;
    const sample = samples.find((entry) => entry.speed >= targetSpeed);

    return sample ? round(sample.t) : null;
}

function measureHighSpeedSteeringMaxAbs(samples, controllerConfig, predicate = () => true) {
    const highSpeedSamples = samples.filter((entry) => (
        entry.speed / controllerConfig.accelSpeed >= 0.78
        && predicate(entry)
    ));

    if (highSpeedSamples.length === 0) return null;

    return round(Math.max(...highSpeedSamples.map((entry) => Math.abs(entry.steering))));
}

function measureTimeToLateralOffset(samples, scenario, targetOffset) {
    const startSec = scenario.startSec ?? 0;
    const sample = samples.find((entry) => (
        entry.t >= startSec
        && Math.abs(entry.lateralOffset) >= targetOffset
    ));

    return sample ? Math.round((sample.t - startSec) * 1000) : null;
}

function measurePostReleaseOffsetHalfLifeMs(samples, scenario) {
    if (typeof scenario.releaseSec !== 'number') return null;

    const releaseSample = findSampleAtOrAfter(samples, scenario.releaseSec);
    if (!releaseSample) return null;

    const releaseOffset = Math.abs(releaseSample.lateralOffset);
    if (releaseOffset <= 1) return 0;

    const targetOffset = releaseOffset * 0.5;
    const sample = samples.find((entry) => (
        entry.t >= scenario.releaseSec
        && Math.abs(entry.lateralOffset) <= targetOffset
    ));

    return sample ? Math.round((sample.t - scenario.releaseSec) * 1000) : null;
}

function measurePostReleaseOffsetOvershoot(samples, scenario) {
    if (typeof scenario.releaseSec !== 'number') return null;

    const releaseSample = findSampleAtOrAfter(samples, scenario.releaseSec);
    if (!releaseSample) return null;

    const releaseSign = Math.sign(releaseSample.lateralOffset);
    if (releaseSign === 0) return 0;

    const overshoots = samples
        .filter((entry) => entry.t >= scenario.releaseSec)
        .map((entry) => entry.lateralOffset * -releaseSign)
        .filter((value) => value > 0);

    return overshoots.length > 0 ? round(Math.max(...overshoots)) : 0;
}

function measureSlalomOffsetRms(samples) {
    const activeSamples = samples.filter((entry) => entry.t >= 2);
    const offsets = activeSamples.length > 0 ? activeSamples : samples;

    return round(Math.sqrt(
        offsets.reduce((total, entry) => total + entry.lateralOffset * entry.lateralOffset, 0)
        / offsets.length,
    ));
}

function measureSteeringPeakHoldRatio(samples) {
    const activeSamples = samples.filter((entry) => Math.abs(entry.inputSteerAxis) > 0);
    if (activeSamples.length === 0) return null;

    const peakSamples = activeSamples.filter((entry) => Math.abs(entry.steering) >= 0.55);

    return round(peakSamples.length / activeSamples.length);
}

function measureCurveCounterSteerRecoveryMs(samples, scenario) {
    if (typeof scenario.counterSteerStartSec !== 'number') return null;

    const startSample = findSampleAtOrAfter(samples, scenario.counterSteerStartSec);
    if (!startSample) return null;

    const startOffset = Math.abs(startSample.lateralOffset);
    if (startOffset <= 1) return 0;

    const targetOffset = Math.max(40, startOffset * 0.82);
    const sample = samples.find((entry) => (
        entry.t >= scenario.counterSteerStartSec
        && Math.abs(entry.lateralOffset) <= targetOffset
    ));

    return sample ? Math.round((sample.t - scenario.counterSteerStartSec) * 1000) : null;
}

function findSampleAtOrAfter(samples, sec) {
    return samples.find((entry) => entry.t >= sec);
}

function checkAtMost(id, value, target, failAt, weight) {
    if (value === null) return { id, penalty: weight, status: 'missing', target, value };
    if (value <= target) return { id, penalty: 0, status: 'pass', target, value };

    const ratio = Math.min(1, (value - target) / (failAt - target));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
    };
}

function checkAtLeast(id, value, target, failAt, weight) {
    if (value === null) return { id, penalty: weight, status: 'missing', target, value };
    if (value >= target) return { id, penalty: 0, status: 'pass', target, value };

    const ratio = Math.min(1, (target - value) / (target - failAt));

    return {
        id,
        penalty: Number((ratio * weight).toFixed(3)),
        status: ratio >= 1 ? 'fail' : 'warn',
        target,
        value,
    };
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function parsePositiveNumber(option, value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${option} must be a positive number`);
    }

    return parsed;
}

function resolveProjectPath(rawPath) {
    return path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(projectRoot, rawPath);
}

function round(value) {
    return Number(value.toFixed(3));
}
