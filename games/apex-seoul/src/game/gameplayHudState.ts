import { getDisplaySpeedKmh, type VehicleEngineProfile } from './engineProfile.ts';
import type { PlayerVehicleState } from './vehicle';

export type GameplayHudState = {
    speedKmh: number;
    gearLabel: string;
    rpm: number;
    fuelCutActive: boolean;
    boostRatios: readonly number[];
    elapsedSec: number;
    checkpointLabel: string;
};

export function createGameplayHudState(
    profile: VehicleEngineProfile,
    player: Pick<PlayerVehicleState, 'speed' | 'gearIndex' | 'rpm' | 'fuelCutActive' | 'primaryBoostRatio' | 'secondaryBoostRatio'>,
    accelSpeed: number,
    run: { elapsedSec: number; passedCheckpoints: number; checkpointTimesSec: Array<number | null> },
): GameplayHudState {
    return {
        speedKmh: getDisplaySpeedKmh(player.speed, accelSpeed, profile),
        gearLabel: profile.gears[player.gearIndex]?.label ?? 'N',
        rpm: player.rpm,
        fuelCutActive: player.fuelCutActive,
        boostRatios: profile.induction === 'na' ? [] : profile.induction === 'single-turbo'
            ? [player.primaryBoostRatio] : [player.primaryBoostRatio, player.secondaryBoostRatio],
        elapsedSec: run.elapsedSec,
        checkpointLabel: `CHECKPOINT  ${run.passedCheckpoints} / ${run.checkpointTimesSec.length}`,
    };
}

export function formatGameplayTime(seconds: number) {
    const centiseconds = Math.floor(Math.max(0, seconds) * 100);
    const minutes = Math.floor(centiseconds / 6000).toString().padStart(2, '0');
    const secondsPart = (Math.floor(centiseconds / 100) % 60).toString().padStart(2, '0');
    return `${minutes}:${secondsPart}.${(centiseconds % 100).toString().padStart(2, '0')}`;
}
