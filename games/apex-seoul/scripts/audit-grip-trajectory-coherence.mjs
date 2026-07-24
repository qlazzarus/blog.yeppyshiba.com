import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import {
    createDefaultPlayerVehicleState,
    updatePlayerVehicle,
} from '../src/game/playerVehicleController.ts';
import {
    createVehicleUndersteerVisualState,
    updateVehicleUndersteerVisualState,
} from '../src/game/vehicleUndersteerVisual.ts';
import { createPlayerControllerBaselineConfig } from './player-controller-baseline-config.mjs';

const FRAME_SECONDS = 1 / 60;
const OUTPUT_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../assets/telemetry/generated/grip-trajectory',
);
const controllerConfig = createPlayerControllerBaselineConfig();
const tapRelease = runTapRelease();
const neutralStraight = runNeutralStraight();
const neutralLeftCorner = runNeutralLeftCorner();
const checks = [
    check(
        'full-digital-input-does-not-hit-full-physics-on-first-frame',
        tapRelease.firstFrameCommand > 0 &&
            tapRelease.firstFrameCommand < 0.25,
        {
            input: 1,
            physicalSteeringCommand: tapRelease.firstFrameCommand,
        },
    ),
    check(
        'held-input-builds-useful-physics-command',
        tapRelease.peakCommand >= 0.75,
        { peakCommand: tapRelease.peakCommand },
    ),
    check(
        'released-physics-command-returns-neutral',
        tapRelease.commandHalfSecondAfterRelease <= 0.05,
        {
            commandHalfSecondAfterRelease:
                tapRelease.commandHalfSecondAfterRelease,
        },
    ),
    check(
        'sprite-sign-follows-physical-command',
        tapRelease.commandedSamples.every((sample) => (
            Math.sign(sample.bodyPose) ===
                Math.sign(sample.physicalSteeringCommand)
        )),
        {
            commandedSamples: tapRelease.commandedSamples.length,
            mismatches: tapRelease.commandedSamples.filter((sample) => (
                Math.sign(sample.bodyPose) !==
                    Math.sign(sample.physicalSteeringCommand)
            )).length,
        },
    ),
    check(
        'neutral-command-keeps-center-pose-after-release',
        tapRelease.settledNeutralSamples.every((sample) => (
            Math.abs(sample.bodyPose) <= 0.05
        )),
        {
            maxAbsBodyPose: round(Math.max(
                ...tapRelease.settledNeutralSamples.map((sample) => (
                    Math.abs(sample.bodyPose)
                )),
            )),
            samples: tapRelease.settledNeutralSamples.length,
        },
    ),
    check(
        'release-does-not-auto-align-world-heading-to-road',
        tapRelease.headingRetentionRatio >= 0.9,
        {
            headingAtCommandNeutral: tapRelease.headingAtCommandNeutral,
            headingAtEnd: tapRelease.headingAtEnd,
            headingRetentionRatio: tapRelease.headingRetentionRatio,
        },
    ),
    check(
        'straight-neutral-remains-centered',
        neutralStraight.maxAbsHeading <= 0.0001 &&
            neutralStraight.maxAbsOffset <= 0.0001 &&
            neutralStraight.maxAbsPhysicalCommand <= 0.0001,
        neutralStraight,
    ),
    check(
        'left-corner-neutral-command-keeps-center-pose',
        neutralLeftCorner.headingError > 0 &&
            neutralLeftCorner.lateralOffset > 0 &&
            Math.abs(neutralLeftCorner.bodyPose) <= 0.001 &&
            neutralLeftCorner.physicalSteeringCommand === 0,
        neutralLeftCorner,
    ),
];
const report = {
    checks,
    generatedAt: new Date().toISOString(),
    neutralLeftCorner,
    neutralStraight,
    pass: checks.every((entry) => entry.pass),
    purpose: 'Keep grip sprite pose command-driven while world-line heading remains independent',
    schemaVersion: 2,
    tapRelease,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
    path.join(OUTPUT_DIR, 'grip-trajectory-contract.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(OUTPUT_DIR, 'grip-trajectory-contract.md'),
    buildMarkdown(report),
);

console.log(`Grip trajectory coherence: ${report.pass ? 'PASS' : 'FAIL'}`);
for (const entry of checks) {
    console.log(
        `${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ` +
        `${JSON.stringify(entry.evidence)}`,
    );
}
if (!report.pass) process.exitCode = 1;

function runTapRelease() {
    const player = createPlayerAtKmh(160);
    let visualState = createVehicleUndersteerVisualState();
    const frames = [];
    const holdSeconds = 0.4;
    const totalSeconds = 1.6;

    for (
        let elapsedSec = 0;
        elapsedSec < totalSeconds - FRAME_SECONDS / 2;
        elapsedSec += FRAME_SECONDS
    ) {
        const steerAxis = elapsedSec < holdSeconds ? 1 : 0;

        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis,
            },
            {
                currentCurve: 0,
                longitudinalScale: 2,
                previewRoadCurve: 0,
                slopeAcceleration: 0,
            },
            controllerConfig,
            FRAME_SECONDS,
        );
        visualState = updateGripVisualState(
            visualState,
            player,
            FRAME_SECONDS,
        );
        frames.push({
            bodyPose: round(visualState.poseValue),
            elapsedSec: round(elapsedSec + FRAME_SECONDS),
            headingError: round(player.vehicleHeadingError),
            physicalSteeringCommand: round(player.physicalSteeringCommand),
            steerAxis,
        });
    }

    const firstFrame = frames[0];
    const releaseSamples = frames.filter((sample) => sample.elapsedSec > holdSeconds);
    const commandNeutralSample = releaseSamples.find((sample) => (
        Math.abs(sample.physicalSteeringCommand) <= 0.05
    ));
    const halfSecondAfterRelease = frames.find((sample) => (
        sample.elapsedSec >= holdSeconds + 0.5
    ));
    const commandedSamples = frames.filter((sample) => (
        Math.abs(sample.physicalSteeringCommand) >= 0.08
    ));
    const settledNeutralSamples = releaseSamples.filter((sample) => (
        sample.elapsedSec >= holdSeconds + 0.5
    ));
    const headingAtCommandNeutral = Math.abs(
        commandNeutralSample?.headingError ?? frames.at(-1).headingError,
    );
    const headingAtEnd = Math.abs(frames.at(-1).headingError);

    return {
        commandHalfSecondAfterRelease: round(
            Math.abs(halfSecondAfterRelease?.physicalSteeringCommand ?? 1),
        ),
        firstFrameCommand: firstFrame.physicalSteeringCommand,
        headingAtCommandNeutral: round(headingAtCommandNeutral),
        headingAtEnd: round(headingAtEnd),
        headingRetentionRatio: round(
            headingAtEnd / Math.max(0.0001, headingAtCommandNeutral),
        ),
        commandedSamples,
        peakCommand: round(Math.max(
            ...frames.map((sample) => Math.abs(sample.physicalSteeringCommand)),
        )),
        releaseSamples,
        settledNeutralSamples,
    };
}

function runNeutralStraight() {
    const player = createPlayerAtKmh(160);
    let maxAbsHeading = 0;
    let maxAbsOffset = 0;
    let maxAbsPhysicalCommand = 0;

    for (let frame = 0; frame < 120; frame += 1) {
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis: 0,
            },
            {
                currentCurve: 0,
                longitudinalScale: 2,
                previewRoadCurve: 0.66,
                slopeAcceleration: 0,
            },
            controllerConfig,
            FRAME_SECONDS,
        );
        maxAbsHeading = Math.max(maxAbsHeading, Math.abs(player.vehicleHeadingError));
        maxAbsOffset = Math.max(maxAbsOffset, Math.abs(player.lateralOffset));
        maxAbsPhysicalCommand = Math.max(
            maxAbsPhysicalCommand,
            Math.abs(player.physicalSteeringCommand),
        );
    }

    return {
        maxAbsHeading: round(maxAbsHeading),
        maxAbsOffset: round(maxAbsOffset),
        maxAbsPhysicalCommand: round(maxAbsPhysicalCommand),
    };
}

function runNeutralLeftCorner() {
    const player = createPlayerAtKmh(185);
    let visualState = createVehicleUndersteerVisualState();

    for (let frame = 0; frame < 60; frame += 1) {
        updatePlayerVehicle(
            player,
            {
                accelPressed: true,
                brakePressed: false,
                steerAxis: 0,
            },
            {
                currentCurve: -0.62,
                longitudinalScale: 2,
                previewRoadCurve: -0.62,
                slopeAcceleration: 0,
            },
            controllerConfig,
            FRAME_SECONDS,
        );
        visualState = updateGripVisualState(
            visualState,
            player,
            FRAME_SECONDS,
        );
    }

    return {
        bodyPose: round(visualState.poseValue),
        headingError: round(player.vehicleHeadingError),
        lateralOffset: round(player.lateralOffset),
        physicalSteeringCommand: round(player.physicalSteeringCommand),
        speedKmh: round(getDisplaySpeedKmh(
            player.speed,
            760,
            RAVEN_COUPE_ENGINE_PROFILE,
        )),
    };
}

function updateGripVisualState(current, player, seconds) {
    const physicalSteering = player.physicalSteeringCommand *
        player.lowSpeedVisualSteeringAuthority *
        player.speedHandling.visualYawScale;

    return updateVehicleUndersteerVisualState(
        current,
        {
            baseGripAngleCap: player.speedHandling.gripAngleCap,
            driftState: player.driftState,
            gripSteerAngleLimit: player.gripSteerAngleLimit,
            lateralVelocityRoadRate:
                player.overspeedUndersteerLateralVelocity /
                controllerConfig.maxRoadOffset,
            physicalSteering,
            understeerRatio: player.overspeedUndersteerRatio,
        },
        seconds,
    );
}

function createPlayerAtKmh(speedKmh) {
    return createDefaultPlayerVehicleState(
        760 * speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh,
        RAVEN_COUPE_ENGINE_PROFILE,
        760,
    );
}

function buildMarkdown(value) {
    return [
        '# Apex Seoul Grip Trajectory Coherence',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '| Check | Result | Evidence |',
        '| --- | --- | --- |',
        ...value.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'PASS' : 'FAIL'} | ` +
            `\`${JSON.stringify(entry.evidence)}\` |`
        )),
    ].join('\n') + '\n';
}

function check(id, pass, evidence) {
    return { evidence, id, pass };
}

function round(value) {
    return Number(value.toFixed(4));
}
