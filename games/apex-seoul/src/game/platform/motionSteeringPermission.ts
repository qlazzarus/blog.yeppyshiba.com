export type MotionSteeringPermissionStatus =
    | 'enabled'
    | 'not-mobile'
    | 'unsupported'
    | 'insecure-context'
    | 'denied';

type OrientationPermissionApi = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * This must be called from a user gesture. iOS exposes an explicit permission
 * request; Android browsers generally grant access without a prompt once the
 * orientation API is available in a secure context.
 */
export async function requestMotionSteeringPermission(): Promise<MotionSteeringPermissionStatus> {
    if (!isMobileDevice()) return 'not-mobile';
    if (!window.isSecureContext) return 'insecure-context';
    if (!('DeviceOrientationEvent' in window)) return 'unsupported';

    const orientationApi = window.DeviceOrientationEvent as OrientationPermissionApi;
    if (!orientationApi.requestPermission) return 'enabled';

    try {
        return await orientationApi.requestPermission() === 'granted' ? 'enabled' : 'denied';
    } catch {
        return 'denied';
    }
}

export function isMobileDevice(navigatorValue: Pick<Navigator, 'maxTouchPoints' | 'userAgent'> = navigator) {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigatorValue.userAgent) ||
        (/Macintosh/i.test(navigatorValue.userAgent) && navigatorValue.maxTouchPoints > 1);
}
