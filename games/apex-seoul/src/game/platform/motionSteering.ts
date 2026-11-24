import type { DriveCommand } from '../core/driveCommand';

type OrientationSource = Pick<Window, 'addEventListener' | 'removeEventListener' | 'screen'> & {
    orientation?: number;
};

type OrientationReading = Pick<DeviceOrientationEvent, 'alpha' | 'beta' | 'gamma'>;

export type MotionSteering = {
    destroy: () => void;
    getCommand: () => DriveCommand;
    getStatus: () => {
        state: 'waiting' | 'ready' | 'stale';
        lastValidInputAtMs: number | null;
    };
    reset: () => void;
    setEnabled: (enabled: boolean) => void;
};

const FILTER_RESPONSE = 0.22;
export const MOTION_STEERING_STALE_MS = 500;

/**
 * Uses the device's long-axis tilt in landscape. The first valid reading is
 * the driver's neutral wheel position, so a slightly off-centre mount does
 * not make the car steer before the player touches the phone.
 */
export function createMotionSteering(
    getSensitivity: () => number,
    source: OrientationSource = window,
    nowMs: () => number = () => performance.now(),
): MotionSteering {
    let enabled = false;
    let lastValidInputAtMs: number | null = null;
    let neutralTilt: number | null = null;
    let filteredTilt: number | null = null;
    let steerAxis = 0;

    const reset = () => {
        lastValidInputAtMs = null;
        neutralTilt = null;
        filteredTilt = null;
        steerAxis = 0;
    };
    const isStale = (time: number) =>
        lastValidInputAtMs !== null && time - lastValidInputAtMs >= MOTION_STEERING_STALE_MS;
    const getStatus: MotionSteering['getStatus'] = () => ({
        state: lastValidInputAtMs === null ? 'waiting' : isStale(nowMs()) ? 'stale' : 'ready',
        lastValidInputAtMs,
    });
    const onOrientation = (event: DeviceOrientationEvent) => {
        if (!enabled) return;
        const tilt = getLandscapeTilt(event, getScreenAngle(source));
        if (tilt === null) return;
        const time = nowMs();
        if (isStale(time)) reset();
        lastValidInputAtMs = time;
        if (neutralTilt === null || filteredTilt === null) {
            neutralTilt = tilt;
            filteredTilt = tilt;
            return;
        }
        filteredTilt += (tilt - filteredTilt) * FILTER_RESPONSE;
        steerAxis = getSteerAxis(filteredTilt - neutralTilt, getSensitivity());
    };
    const onScreenOrientationChange = () => reset();

    source.addEventListener('deviceorientation', onOrientation);
    source.addEventListener('orientationchange', onScreenOrientationChange);
    source.screen?.orientation?.addEventListener?.('change', onScreenOrientationChange);

    return {
        destroy: () => {
            enabled = false;
            reset();
            source.removeEventListener('deviceorientation', onOrientation);
            source.removeEventListener('orientationchange', onScreenOrientationChange);
            source.screen?.orientation?.removeEventListener?.('change', onScreenOrientationChange);
        },
        getCommand: () => ({
            accelPressed: false,
            brakePressed: false,
            steerAxis: enabled && !isStale(nowMs()) ? steerAxis : 0,
        }),
        getStatus,
        reset,
        setEnabled: (nextEnabled) => {
            if (enabled === nextEnabled) return;
            enabled = nextEnabled;
            reset();
        },
    };
}

export function getLandscapeTilt(reading: OrientationReading, screenAngle: number): number | null {
    const landscape = screenAngle === 90 || screenAngle === 270 || screenAngle === -90;
    const tilt = landscape ? reading.beta : reading.gamma;
    if (tilt === null || !Number.isFinite(tilt)) return null;
    return screenAngle === 90 ? -tilt : tilt;
}

export function getSteerAxis(tiltDegrees: number, sensitivity: number) {
    const normalizedSensitivity = Math.max(0, Math.min(100, sensitivity)) / 100;
    const deadZoneDegrees = 7 - normalizedSensitivity * 4;
    const fullTiltDegrees = 30 - normalizedSensitivity * 14;
    const magnitude = Math.max(0, Math.abs(tiltDegrees) - deadZoneDegrees) /
        Math.max(1, fullTiltDegrees - deadZoneDegrees);
    return Math.sign(tiltDegrees) * Math.min(1, magnitude);
}

function getScreenAngle(source: OrientationSource) {
    const angle = source.screen?.orientation?.angle;
    return typeof angle === 'number' ? angle : source.orientation ?? 0;
}
