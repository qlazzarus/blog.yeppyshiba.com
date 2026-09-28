export type Pseudo3dCamera = {
    fovDegrees: number;
    height: number;
    horizonRatio: number;
    lateralOffset: number;
    pitch: number;
    z: number;
};

export type Viewport = {
    height: number;
    width: number;
};

export type GroundPoint = {
    x: number;
    y?: number;
    z: number;
};

export type ScreenPoint = {
    scale: number;
    visible: boolean;
    x: number;
    y: number;
};

const MIN_CAMERA_SPACE_Z = 1;

export function getFocalLength(camera: Pseudo3dCamera, viewport: Viewport) {
    const fovRadians = (camera.fovDegrees * Math.PI) / 180;

    return viewport.height / 2 / Math.tan(fovRadians / 2);
}

export function getHorizonY(camera: Pseudo3dCamera, viewport: Viewport) {
    return viewport.height * camera.horizonRatio + camera.pitch;
}

export function projectGroundPoint(
    point: GroundPoint,
    camera: Pseudo3dCamera,
    viewport: Viewport,
): ScreenPoint {
    const cameraSpaceZ = point.z - camera.z;

    if (cameraSpaceZ <= MIN_CAMERA_SPACE_Z) {
        return {
            scale: 0,
            visible: false,
            x: viewport.width / 2,
            y: viewport.height + 1,
        };
    }

    const focalLength = getFocalLength(camera, viewport);
    const scale = focalLength / cameraSpaceZ;
    const horizonY = getHorizonY(camera, viewport);
    const worldY = point.y ?? 0;

    return {
        scale,
        visible: true,
        x: viewport.width / 2 + (point.x - camera.lateralOffset) * scale,
        y: horizonY + (camera.height - worldY) * scale,
    };
}

export function createDefaultCamera(): Pseudo3dCamera {
    return {
        fovDegrees: 72,
        height: 980,
        horizonRatio: 0.38,
        lateralOffset: 0,
        pitch: 0,
        z: 0,
    };
}
