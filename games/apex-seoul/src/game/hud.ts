import Phaser from 'phaser';
import type { Pseudo3dCamera } from './pseudo3dCamera';
import type { RoadTrack } from './road';
import type { RoadRenderStats } from './roadRenderer';
import { RenderDepth } from './renderDepth';
import { formatNullableNumber, type RuntimeQaOverrides, type RuntimeTelemetryConfig, type RuntimeTuning } from './runtimeConfig';
import type { PlayerVehicleState, VehicleTerrainCue } from './vehicle';

export type ApexHudState = {
    camera: Pseudo3dCamera;
    controlsLabel: string;
    cornerIntensity: number;
    player: PlayerVehicleState;
    qa: RuntimeQaOverrides;
    roadStats: RoadRenderStats | null;
    run: {
        elapsedSec: number;
        finishTimeSec: number | null;
        finished: boolean;
        passedCheckpoints: number;
        progressRatio: number;
    };
    slopeAcceleration: number;
    speedKmh: number;
    steeringRatio: number;
    telemetry: RuntimeTelemetryConfig;
    telemetryEventCount: number;
    track: RoadTrack;
    tuning: RuntimeTuning;
    vehicleTerrainCue: VehicleTerrainCue;
};

export function createHudText(scene: Phaser.Scene) {
    return scene.add
        .text(20, 18, '', {
            color: '#eef2f3',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            lineSpacing: 5,
        })
        .setDepth(RenderDepth.Hud);
}

export function renderHudText(hudText: Phaser.GameObjects.Text, state: ApexHudState) {
    const {
        camera,
        cornerIntensity,
        player,
        qa,
        roadStats,
        run,
        slopeAcceleration,
        speedKmh,
        steeringRatio,
        telemetry,
        telemetryEventCount,
        track,
        tuning,
        vehicleTerrainCue,
    } = state;

    hudText.setText(
        [
            `Apex Seoul - ${track.name}`,
            `horizon ${(camera.horizonRatio * 100).toFixed(0)}% + pitch ${camera.pitch.toFixed(0)}px`,
            `height ${camera.height.toFixed(0)} | fov ${camera.fovDegrees.toFixed(1)} | z ${camera.z.toFixed(0)}`,
            roadStats
                ? `segment ${roadStats.baseSegmentIndex} | curve ${roadStats.currentCurve.toFixed(2)} | elevation ${roadStats.currentElevation.toFixed(0)} | crest ${formatNullableNumber(roadStats.crestEnvelopeY)} | occlusion ${formatNullableNumber(roadStats.horizonOcclusionY)} | visible ${roadStats.visibleSegments} | hidden ${roadStats.occludedSegments}`
                : 'segment -- | curve -- | visible --',
            run.finished
                ? `run FINISH ${formatRunTime(run.finishTimeSec ?? run.elapsedSec)} | progress 100% | checkpoints ${run.passedCheckpoints}/3 | R restart`
                : `run ${formatRunTime(run.elapsedSec)} | progress ${(run.progressRatio * 100).toFixed(1)}% | checkpoints ${run.passedCheckpoints}/3`,
            `speed ${speedKmh.toFixed(0)} km/h (${player.speed.toFixed(0)}u) | gear ${player.gearIndex + 1} | rpm ${player.rpm.toFixed(0)} | torque ${player.torqueScale.toFixed(2)} | boost ${player.boostRatio.toFixed(2)} | fuel cut ${player.fuelCutActive ? 'on' : 'off'} | shift cut ${player.shiftCutRatio.toFixed(2)}`,
            `slope ${slopeAcceleration.toFixed(0)} | corner ${cornerIntensity.toFixed(2)} | line ${player.cornerDemand.lineQuality.toFixed(2)} | demand ${player.cornerDemand.lateralDemand.toFixed(2)} | loss ${player.cornerSpeedLoss.zone} ${player.cornerSpeedLoss.totalForce.toFixed(0)} | steer ratio ${steeringRatio.toFixed(2)} | car offset ${player.lateralOffset.toFixed(0)} | steer ${player.steering.toFixed(2)} | terrain ${vehicleTerrainCue}`,
            `sprite ${(tuning.vehicleViewportRatio * 100).toFixed(0)}vw | anchor ${tuning.playerRoadAnchorDistance.toFixed(0)}z | contact cue ${tuning.playerContactTerrainCueThreshold.toFixed(0)} | curve bias ${tuning.curveScreenBias.toFixed(0)}px`,
            `telemetry ${telemetry.enabled ? 'on' : 'off'} | log ${telemetryEventCount}`,
            qa.enabled
                ? `qa freeze ${qa.freeze ? 'on' : 'off'} | forced ${formatNullableNumber(qa.steering)} steer / ${formatNullableNumber(qa.z)} z`
                : null,
            state.controlsLabel,
        ].filter(Boolean).join('\n'),
    );
}

function formatRunTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;

    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`;
}
