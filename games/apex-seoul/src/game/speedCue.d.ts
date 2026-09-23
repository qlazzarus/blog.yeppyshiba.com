export type SpeedCueState = {
    driftExitBurstTimer: number;
    driftExitReapplyTimer: number;
    previousAccelPressed: boolean | null;
    previousDriftState: 'grip' | 'setup' | 'drift' | 'recovery';
    throttleBurstTimer: number;
};

export type SpeedCueInput = {
    accelPressed: boolean;
    downhillRatio: number;
    driftRatio: number;
    driftState: SpeedCueState['previousDriftState'];
    seconds: number;
    speedKmh: number;
};

export type SpeedCue = {
    base: number;
    downhill: number;
    driftExitBurst: number;
    driftFlow: number;
    intensity: number;
    throttleBurst: number;
};

export const SPEED_CUE_CONFIG: Readonly<{
    baseMaxIntensity: number;
    baseSpeedBands: ReadonlyArray<{ intensityRatio: number; speedKmh: number }>;
    downhillMaxIntensity: number;
    driftExitBurstDuration: number;
    driftExitBurstMaxIntensity: number;
    driftExitReapplyWindow: number;
    driftFlowFullSpeedKmh: number;
    driftFlowMaxIntensity: number;
    driftFlowMinSpeedKmh: number;
    throttleBurstDuration: number;
    throttleBurstMaxIntensity: number;
}>;

export function createSpeedCueState(): SpeedCueState;
export function updateSpeedCue(state: SpeedCueState, input: SpeedCueInput): SpeedCue;
export function getSpeedCueRatio(speedKmh: number): number;
