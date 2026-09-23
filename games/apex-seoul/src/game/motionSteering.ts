import type { DriveCommand } from './sceneInput';

type OrientationSource = Pick<Window, 'addEventListener' | 'removeEventListener' | 'screen'> & {
    orientation?: number;
};

type OrientationReading = Pick<DeviceOrientationEvent, 'alpha' | 'beta' | 'gamma'>;

export type MotionSteering = {
    destroy: () => void;
    getCommand: () => DriveCommand;
    reset: () => void;
    setEnabled: (enabled: boolean) => void;
};

const FILTER_RESPONSE = 0.22;

/**
 * Uses the device's long-axis tilt in landscape. The first valid reading is
 * the driver's neutral wheel position, so a slightly off-centre mount does
 * not make the car steer before the player touches the phone.
 */
export function createMotionSteering(
    getSensitivity: () => number,
    source: OrientationSource = window,
): MotionSteering {
    let enabled = false;
    let neutralTilt: number | null = null;
    let filteredTilt: number | null = null;
    let steerAxis = 0;

    const reset = () => {
        neutralTilt = null;
        filteredTilt = null;
        steerAxis = 0;
    };
    const onOrientation = (event: DeviceOrientationEvent) => {
        if (!enabled) return;
        const tilt = getLandscapeTilt(event, getScreenAngle(source));
        if (tilt === null) return;
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
            source.removeEventListener('deviceorientation', onOrientation);
            source.removeEventListener('orientationchange', onScreenOrientationChange);
            source.screen?.orientation?.removeEventListener?.('change', onScreenOrientationChange);
        },
        getCommand: () => ({ accelPressed: false, brakePressed: false, steerAxis: enabled ? steerAxis : 0 }),
        reset,
        setEnabled: (nextEnabled) => {
            if (enabled === nextEnabled) return;
            enabled = nextEnabled;
            reset();
        },
    };
}

export function getLandscapeTilt(reading: OrientationReading, screenAngle: number): number | null {
    const beta = reading.beta;
    const gamma = reading.gamma;
    if (screenAngle === 90) return typeof beta === 'number' ? -beta : null;
    if (screenAngle === 270 || screenAngle === -90) return typeof beta === 'number' ? beta : null;
    return typeof gamma === 'number' ? gamma : null;
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
