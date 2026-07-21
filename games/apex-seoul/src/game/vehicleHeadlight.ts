import type { VehicleAtlas } from './vehicle';

export type VehicleHeadlightScreenPose = {
    frameId: string;
    lampLeft: {
        x: number;
        y: number;
    };
    lampRight: {
        x: number;
        y: number;
    };
    poseAimX: number;
    profileId: string;
};

export function composeVehicleHeadlightAim(
    framePoseAimX: number,
    fineAimX: number,
    roadAssistAimX: number,
    maxAimX: number,
) {
    const poseSign = Math.sign(framePoseAimX);
    const combinedAimX = framePoseAimX + fineAimX + roadAssistAimX;
    const poseSafeAimX = poseSign !== 0
        ? poseSign * Math.max(0, poseSign * combinedAimX)
        : combinedAimX;

    return Math.min(maxAimX, Math.max(-maxAimX, poseSafeAimX));
}

type VehicleHeadlightTransform = {
    displaySize: number;
    flipX: boolean;
    rotationRadians: number;
    x: number;
    y: number;
};

export function getVehicleHeadlightScreenPose(
    atlas: VehicleAtlas,
    frameId: string,
    transform: VehicleHeadlightTransform,
): VehicleHeadlightScreenPose {
    const frame = atlas.frames[frameId];
    const profileId = getVehicleHeadlightProfileId(atlas, frameId);
    const profile = atlas.apex.headlightProfiles[profileId];

    if (!frame || !profile) {
        throw new Error(`Missing vehicle headlight data for frame: ${frameId}`);
    }

    const lamps = transform.flipX
        ? [profile.lampRight, profile.lampLeft]
        : [profile.lampLeft, profile.lampRight];

    return {
        frameId,
        lampLeft: transformProfilePoint(lamps[0], frame.origin, transform),
        lampRight: transformProfilePoint(lamps[1], frame.origin, transform),
        poseAimX: profile.poseAimX * transform.displaySize * (transform.flipX ? -1 : 1),
        profileId,
    };
}

function getVehicleHeadlightProfileId(atlas: VehicleAtlas, frameId: string) {
    if (atlas.apex.headlightProfiles[frameId]) return frameId;
    if (frameId.endsWith('right-1')) return 'steer-right-1';
    if (frameId.endsWith('right-2')) return 'steer-right-2';

    return 'center';
}

function transformProfilePoint(
    point: { x: number; y: number },
    origin: { x: number; y: number },
    transform: VehicleHeadlightTransform,
) {
    const localX = (point.x - origin.x) * transform.displaySize *
        (transform.flipX ? -1 : 1);
    const localY = (point.y - origin.y) * transform.displaySize;
    const cosine = Math.cos(transform.rotationRadians);
    const sine = Math.sin(transform.rotationRadians);

    return {
        x: transform.x + localX * cosine - localY * sine,
        y: transform.y + localX * sine + localY * cosine,
    };
}
