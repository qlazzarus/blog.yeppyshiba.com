import Phaser from 'phaser';
import {
    getHorizonY,
    projectGroundPoint,
    type Pseudo3dCamera,
    type ScreenPoint,
    type Viewport,
} from './pseudo3dCamera';
import {
    getCameraSegmentProgress,
    getRoadElevationAt,
    getRoadHalfWidthAt,
    getRoadSegment,
    SEGMENT_LENGTH,
    type RoadTrack,
} from './road';
import { getWorldDistanceFog, WORLD_FOG_COLOR } from './worldDistanceFog';
import { SPEED_PRESENTATION_WORLD_CONFIG } from './speedPresentationConfig';

export type RoadRenderStats = {
    baseSegmentIndex: number;
    crestEnvelopeY: number | null;
    crestVisibilityEnvelope: CrestVisibilityEnvelope;
    currentCurve: number;
    currentElevation: number;
    headlightRoadTangent: HeadlightRoadTangent | null;
    horizonGapY: number | null;
    horizonOcclusionY: number | null;
    occludedSegments: number;
    visibleSegments: number;
};

export type HeadlightRoadTangent = {
    aimX: number;
    farCenterX: number;
    farScreenY: number;
    nearCenterX: number;
    nearScreenY: number;
};

export type CrestVisibilityEnvelope = Array<{
    distanceAhead: number;
    roadVisible: boolean;
    screenY: number;
}>;

type RoadRenderOptions = {
    downhillCueRatio?: number;
    drawHorizonOcclusion?: boolean;
};

type ProjectedSegment = {
    absoluteIndex: number;
    road: ProjectedRoadSlice;
    segment: {
        laneCount: number;
    };
};

const RUMBLE_WIDTH = 130;
const EDGE_LINE_WIDTH = 24;
const LANE_MARK_WIDTH = 18;
const DRAW_SEGMENTS = 76;
const CURVE_STEP = 86;
const NEAR_CLIP_DISTANCE = 18;
const ROAD_NEAR_COLORS = [0x101926, 0x0b121d] as const;
const ROAD_FAR_COLOR = 0x03070c;
const SHOULDER_NEAR_COLOR = 0x080e16;
const SHOULDER_FAR_COLOR = 0x020509;
const EDGE_LINE_NEAR_COLOR = 0x43789d;
const EDGE_LINE_FAR_COLOR = 0x122b3e;
const LANE_MARK_NEAR_COLOR = 0x5da9df;
const LANE_MARK_FAR_COLOR = 0x1d435f;
const HEADLIGHT_TANGENT_FAR_SCREEN_Y_RATIO = 0.48;
const HEADLIGHT_TANGENT_NEAR_SCREEN_Y_RATIO = 0.68;
export const ELEVATION_VISUAL_SCALE = 4.2;

export function renderRoad(
    graphics: Phaser.GameObjects.Graphics,
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    options: RoadRenderOptions = {},
): RoadRenderStats {
    const baseSegment = Math.floor(camera.z / track.segmentLength);
    const baseSegmentIndex = getRoadSegment(track, baseSegment).index;
    const progress = getCameraSegmentProgress(track, camera.z);
    const currentCurve = getRoadSegment(track, baseSegment).curve;
    const currentElevation = getRoadElevationAt(track, camera.z);
    const projectedSegments: ProjectedSegment[] = [];
    const boundaryCenters = getVisibleBoundaryCenters(track, baseSegment, progress);
    const boundaryElevations = getVisibleBoundaryElevations(track, baseSegment, progress);

    for (let i = 0; i <= DRAW_SEGMENTS; i += 1) {
        const absoluteIndex = baseSegment + i;
        const segment = getRoadSegment(track, absoluteIndex);
        const nearWorldZ = i === 0
            ? camera.z + NEAR_CLIP_DISTANCE
            : absoluteIndex * track.segmentLength;
        const farWorldZ = i === 0
            ? (baseSegment + 1) * track.segmentLength
            : nearWorldZ + track.segmentLength;
        const nearCenterX = boundaryCenters[i];
        const farCenterX = boundaryCenters[i + 1];
        const nearElevation = boundaryElevations[i];
        const farElevation = boundaryElevations[i + 1];
        const nearRoadHalfWidth = getRoadHalfWidthAt(track, nearWorldZ);
        const farRoadHalfWidth = getRoadHalfWidthAt(track, farWorldZ);
        const road = projectRoadSlice(
            nearCenterX,
            farCenterX,
            (nearElevation - currentElevation) * ELEVATION_VISUAL_SCALE,
            (farElevation - currentElevation) * ELEVATION_VISUAL_SCALE,
            nearWorldZ,
            farWorldZ,
            nearRoadHalfWidth,
            farRoadHalfWidth,
            camera,
            viewport,
        );

        if (!road) continue;

        projectedSegments.push({
            absoluteIndex,
            road,
            segment,
        });
    }

    const crestVisibility = applyCrestVisibilityEnvelope(projectedSegments, camera.z, viewport);
    const visibleProjectedSegments = crestVisibility.visibleSegments;
    const headlightRoadTangent = getHeadlightRoadTangent(
        visibleProjectedSegments,
        viewport,
    );
    const horizonGapY = visibleProjectedSegments.reduce<number | null>(
        (gapY, projected) => getNearestHorizonGapY(gapY, projected.road),
        null,
    );

    const horizonOcclusionY = getHorizonOcclusionY(
        visibleProjectedSegments,
        horizonGapY,
        camera,
        viewport,
        options.downhillCueRatio ?? 0,
    );

    for (let i = visibleProjectedSegments.length - 1; i >= 0; i -= 1) {
        const projected = visibleProjectedSegments[i];

        drawRoadBody(graphics, projected.road, projected.absoluteIndex, camera.z);
        drawShoulder(graphics, projected.road, -1, camera, viewport);
        drawShoulder(graphics, projected.road, 1, camera, viewport);
        drawLaneMarks(
            graphics,
            projected.road,
            projected.absoluteIndex,
            projected.segment.laneCount,
            camera,
            viewport,
        );
    }

    if (options.drawHorizonOcclusion ?? true) {
        renderHorizonOcclusion(graphics, horizonOcclusionY, camera, viewport);
    }

    return {
        baseSegmentIndex,
        crestEnvelopeY: crestVisibility.envelope.at(-1)?.screenY ?? null,
        crestVisibilityEnvelope: crestVisibility.envelope,
        currentCurve,
        currentElevation,
        headlightRoadTangent,
        horizonGapY,
        horizonOcclusionY,
        occludedSegments: projectedSegments.length - visibleProjectedSegments.length,
        visibleSegments: visibleProjectedSegments.length,
    };
}

export function getRoadCenterOffsetAhead(
    track: RoadTrack,
    cameraZ: number,
    distanceAhead: number,
) {
    if (distanceAhead <= 0) return 0;

    const baseSegment = Math.floor(cameraZ / track.segmentLength);
    const progress = getCameraSegmentProgress(track, cameraZ);
    const boundaryCenters = getVisibleBoundaryCenters(track, baseSegment, progress);
    const boundaryDistances = [0];
    let distance = track.segmentLength * (1 - progress);

    boundaryDistances.push(distance);

    for (let index = 2; index < boundaryCenters.length; index += 1) {
        distance += track.segmentLength;
        boundaryDistances.push(distance);
    }

    for (let index = 1; index < boundaryDistances.length; index += 1) {
        if (distanceAhead > boundaryDistances[index]) continue;

        const segmentDistance = boundaryDistances[index] - boundaryDistances[index - 1];
        const localDistance = distanceAhead - boundaryDistances[index - 1];
        const ratio = segmentDistance > 0 ? localDistance / segmentDistance : 0;

        return Phaser.Math.Linear(boundaryCenters[index - 1], boundaryCenters[index], ratio);
    }

    return boundaryCenters.at(-1) ?? 0;
}

/**
 * Returns the paved road span at a screen-space Y coordinate. This is the
 * useful comparison point for the player car, whose sprite is composited at a
 * fixed-ish screen anchor rather than at its literal ground-contact depth.
 */
export function getRoadWidthAtScreenY(
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    screenY: number,
) {
    const span = getRoadSpanAtScreenY(track, camera, viewport, screenY);

    return span ? Math.abs(span.rightX - span.leftX) : null;
}

export type RoadScreenSpan = {
    leftX: number;
    rightX: number;
};

export function getRoadSpanAtScreenY(
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    screenY: number,
): RoadScreenSpan | null {
    const baseSegment = Math.floor(camera.z / track.segmentLength);
    const progress = getCameraSegmentProgress(track, camera.z);
    const currentElevation = getRoadElevationAt(track, camera.z);
    const boundaryCenters = getVisibleBoundaryCenters(track, baseSegment, progress);
    const boundaryElevations = getVisibleBoundaryElevations(track, baseSegment, progress);

    for (let i = 0; i <= DRAW_SEGMENTS; i += 1) {
        const absoluteIndex = baseSegment + i;
        const nearWorldZ = i === 0
            ? camera.z + NEAR_CLIP_DISTANCE
            : absoluteIndex * track.segmentLength;
        const farWorldZ = i === 0
            ? (baseSegment + 1) * track.segmentLength
            : nearWorldZ + track.segmentLength;
        const road = projectRoadSlice(
            boundaryCenters[i],
            boundaryCenters[i + 1],
            (boundaryElevations[i] - currentElevation) * ELEVATION_VISUAL_SCALE,
            (boundaryElevations[i + 1] - currentElevation) * ELEVATION_VISUAL_SCALE,
            nearWorldZ,
            farWorldZ,
            getRoadHalfWidthAt(track, nearWorldZ),
            getRoadHalfWidthAt(track, farWorldZ),
            camera,
            viewport,
        );
        const span = road ? getRoadSpanAtY(road, screenY) : null;

        if (span) return span;
    }

    return null;
}

function getVisibleBoundaryCenters(
    track: RoadTrack,
    baseSegment: number,
    progress: number,
) {
    const centers = [0];
    let centerX = 0;

    for (let boundary = 1; boundary <= DRAW_SEGMENTS + 1; boundary += 1) {
        const previousSegment = getRoadSegment(track, baseSegment + boundary - 1);
        const nextSegment = getRoadSegment(track, baseSegment + boundary);
        const distanceRatio = boundary === 1 ? 1 - progress : 1;
        const averageCurve = (previousSegment.curve + nextSegment.curve) / 2;

        centerX += averageCurve * CURVE_STEP * distanceRatio;
        centers.push(centerX);
    }

    return centers;
}

function getVisibleBoundaryElevations(
    track: RoadTrack,
    baseSegment: number,
    progress: number,
) {
    const currentSegment = getRoadSegment(track, baseSegment);
    const nextSegment = getRoadSegment(track, baseSegment + 1);
    const elevations = [
        Phaser.Math.Linear(currentSegment.elevation, nextSegment.elevation, progress),
    ];

    for (let boundary = 1; boundary <= DRAW_SEGMENTS + 1; boundary += 1) {
        const segment = getRoadSegment(track, baseSegment + boundary);

        elevations.push(segment.elevation);
    }

    return elevations;
}

type ProjectedRoadSlice = {
    farCenterX: number;
    farElevation: number;
    farRoadHalfWidth: number;
    farWorldZ: number;
    nearCenterX: number;
    nearElevation: number;
    nearRoadHalfWidth: number;
    nearWorldZ: number;
    roadFarLeft: ScreenPoint;
    roadFarRight: ScreenPoint;
    roadNearLeft: ScreenPoint;
    roadNearRight: ScreenPoint;
};

function projectRoadSlice(
    nearCenterX: number,
    farCenterX: number,
    nearElevation: number,
    farElevation: number,
    nearWorldZ: number,
    farWorldZ: number,
    nearRoadHalfWidth: number,
    farRoadHalfWidth: number,
    camera: Pseudo3dCamera,
    viewport: Viewport,
): ProjectedRoadSlice | null {
    const roadNearLeft = projectGroundPoint(
        { x: nearCenterX - nearRoadHalfWidth, y: nearElevation, z: nearWorldZ },
        camera,
        viewport,
    );
    const roadNearRight = projectGroundPoint(
        { x: nearCenterX + nearRoadHalfWidth, y: nearElevation, z: nearWorldZ },
        camera,
        viewport,
    );
    const roadFarLeft = projectGroundPoint(
        { x: farCenterX - farRoadHalfWidth, y: farElevation, z: farWorldZ },
        camera,
        viewport,
    );
    const roadFarRight = projectGroundPoint(
        { x: farCenterX + farRoadHalfWidth, y: farElevation, z: farWorldZ },
        camera,
        viewport,
    );

    if (
        !roadNearLeft.visible ||
        !roadNearRight.visible ||
        !roadFarLeft.visible ||
        !roadFarRight.visible
    ) {
        return null;
    }

    return {
        farCenterX,
        farElevation,
        farRoadHalfWidth,
        farWorldZ,
        nearCenterX,
        nearElevation,
        nearRoadHalfWidth,
        nearWorldZ,
        roadFarLeft,
        roadFarRight,
        roadNearLeft,
        roadNearRight,
    };
}

function getRoadWidthAtY(road: ProjectedRoadSlice, screenY: number) {
    const span = getRoadSpanAtY(road, screenY);

    return span ? Math.abs(span.rightX - span.leftX) : null;
}

function getRoadSpanAtY(road: ProjectedRoadSlice, screenY: number) {
    const nearY = road.roadNearLeft.y;
    const farY = road.roadFarLeft.y;
    const minimumY = Math.min(nearY, farY);
    const maximumY = Math.max(nearY, farY);

    if (screenY < minimumY || screenY > maximumY || Math.abs(nearY - farY) < 0.001) {
        return null;
    }

    const ratio = Phaser.Math.Clamp((screenY - farY) / (nearY - farY), 0, 1);
    const leftX = Phaser.Math.Linear(road.roadFarLeft.x, road.roadNearLeft.x, ratio);
    const rightX = Phaser.Math.Linear(road.roadFarRight.x, road.roadNearRight.x, ratio);

    return { leftX, rightX };
}

function getHeadlightRoadTangent(
    projectedSegments: ProjectedSegment[],
    viewport: Viewport,
): HeadlightRoadTangent | null {
    const nearScreenY = viewport.height * HEADLIGHT_TANGENT_NEAR_SCREEN_Y_RATIO;
    const farScreenY = viewport.height * HEADLIGHT_TANGENT_FAR_SCREEN_Y_RATIO;
    const nearCenterX = getVisibleRoadCenterAtY(projectedSegments, nearScreenY);
    const farCenterX = getVisibleRoadCenterAtY(projectedSegments, farScreenY);

    if (nearCenterX === null || farCenterX === null) return null;

    return {
        aimX: farCenterX - nearCenterX,
        farCenterX,
        farScreenY,
        nearCenterX,
        nearScreenY,
    };
}

function getVisibleRoadCenterAtY(
    projectedSegments: ProjectedSegment[],
    screenY: number,
) {
    // Segments are ordered near-to-far. When elevation makes multiple slices
    // overlap at the same screen Y, the nearest rendered surface owns the
    // sample, matching the far-to-near draw order below.
    for (const projected of projectedSegments) {
        const span = getRoadSpanAtY(projected.road, screenY);

        if (span) return (span.leftX + span.rightX) / 2;
    }

    return null;
}

function drawRoadBody(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    absoluteIndex: number,
    cameraZ: number,
) {
    const distanceFade = getRoadDistanceFade(road, cameraZ);
    const nearColor = ROAD_NEAR_COLORS[Math.abs(absoluteIndex) % ROAD_NEAR_COLORS.length];

    fillQuad(
        graphics,
        road.roadFarLeft,
        road.roadFarRight,
        road.roadNearRight,
        road.roadNearLeft,
        getFoggedRoadColor(nearColor, ROAD_FAR_COLOR, distanceFade, 0.85),
    );
}

function getNearestHorizonGapY(currentGapY: number | null, road: ProjectedRoadSlice) {
    const topY = Math.min(
        road.roadFarLeft.y,
        road.roadFarRight.y,
        road.roadNearLeft.y,
        road.roadNearRight.y,
    );

    if (currentGapY === null) return topY;

    return Math.min(currentGapY, topY);
}

function applyCrestVisibilityEnvelope(
    projectedSegments: ProjectedSegment[],
    cameraZ: number,
    viewport: Viewport,
) {
    const envelope: CrestVisibilityEnvelope = [];
    const visibleSegments: ProjectedSegment[] = [];
    let crestY = viewport.height + 1;

    for (const projected of projectedSegments) {
        const sliceY = Math.min(projected.road.roadFarLeft.y, projected.road.roadFarRight.y);
        const distanceAhead = Math.max(0, projected.road.farWorldZ - cameraZ);
        const visible = sliceY <= crestY + 1.5;

        if (visible) {
            crestY = Math.min(crestY, sliceY);
            visibleSegments.push(projected);
        }

        envelope.push({
            distanceAhead,
            roadVisible: visible,
            screenY: crestY,
        });
    }

    return { envelope, visibleSegments };
}

function getHorizonOcclusionY(
    projectedSegments: ProjectedSegment[],
    horizonGapY: number | null,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    downhillCueRatio: number,
) {
    if (downhillCueRatio <= 0 || projectedSegments.length === 0) return null;

    const horizonY = getHorizonY(camera, viewport);
    const farthestRoad = projectedSegments.at(-1)?.road;

    if (!farthestRoad) return null;

    const farRoadTopY = Math.min(farthestRoad.roadFarLeft.y, farthestRoad.roadFarRight.y);
    const gapReferenceY = Math.max(horizonGapY ?? farRoadTopY, farRoadTopY);

    return Phaser.Math.Clamp(
        gapReferenceY,
        horizonY + 8,
        horizonY + Phaser.Math.Linear(34, 92, downhillCueRatio),
    );
}

export function renderHorizonOcclusion(
    graphics: Phaser.GameObjects.Graphics,
    horizonOcclusionY: number | null,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
    if (horizonOcclusionY === null) return;

    const horizonY = getHorizonY(camera, viewport);
    const gapTopY = horizonY - 2;

    if (horizonOcclusionY <= gapTopY) return;

    graphics.fillStyle(0x02060d, 0.94);
    graphics.fillRect(0, gapTopY, viewport.width, horizonOcclusionY - gapTopY);
    graphics.fillStyle(0x0b2135, 0.34);
    graphics.fillRect(0, horizonOcclusionY - 2, viewport.width, 2);
}

function drawShoulder(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    side: -1 | 1,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
    const distanceFade = getRoadDistanceFade(road, camera.z);
    const innerNearX = road.nearCenterX + side * road.nearRoadHalfWidth;
    const outerNearX = road.nearCenterX + side * (road.nearRoadHalfWidth + RUMBLE_WIDTH);
    const innerFarX = road.farCenterX + side * road.farRoadHalfWidth;
    const outerFarX = road.farCenterX + side * (road.farRoadHalfWidth + RUMBLE_WIDTH);

    fillProjectedRoadBand(
        graphics,
        road,
        innerNearX,
        outerNearX,
        innerFarX,
        outerFarX,
        camera,
        viewport,
        getFoggedRoadColor(SHOULDER_NEAR_COLOR, SHOULDER_FAR_COLOR, distanceFade, 0.9),
    );
    fillProjectedRoadBand(
        graphics,
        road,
        innerNearX,
        innerNearX + side * EDGE_LINE_WIDTH,
        innerFarX,
        innerFarX + side * EDGE_LINE_WIDTH,
        camera,
        viewport,
        getFoggedRoadColor(EDGE_LINE_NEAR_COLOR, EDGE_LINE_FAR_COLOR, distanceFade, 0.52),
    );
}

function drawLaneMarks(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    absoluteIndex: number,
    laneCount: number,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
    if (absoluteIndex % SPEED_PRESENTATION_WORLD_CONFIG.laneDashSegmentInterval !== 0) return;

    const laneMarkRoad = getLaneMarkRoadSlice(road, absoluteIndex, camera, viewport);

    if (!laneMarkRoad) return;

    const distanceFade = getRoadDistanceFade(laneMarkRoad, camera.z);

    for (let lane = 1; lane < laneCount; lane += 1) {
        const laneCenterRatio = lane / laneCount;
        const nearLaneCenterX = Phaser.Math.Linear(
            laneMarkRoad.nearCenterX - laneMarkRoad.nearRoadHalfWidth,
            laneMarkRoad.nearCenterX + laneMarkRoad.nearRoadHalfWidth,
            laneCenterRatio,
        );
        const farLaneCenterX = Phaser.Math.Linear(
            laneMarkRoad.farCenterX - laneMarkRoad.farRoadHalfWidth,
            laneMarkRoad.farCenterX + laneMarkRoad.farRoadHalfWidth,
            laneCenterRatio,
        );

        fillProjectedRoadBand(
            graphics,
            laneMarkRoad,
            nearLaneCenterX - LANE_MARK_WIDTH,
            nearLaneCenterX + LANE_MARK_WIDTH,
            farLaneCenterX - LANE_MARK_WIDTH,
            farLaneCenterX + LANE_MARK_WIDTH,
            camera,
            viewport,
            getFoggedRoadColor(LANE_MARK_NEAR_COLOR, LANE_MARK_FAR_COLOR, distanceFade, 0.42),
        );
    }
}

function getLaneMarkRoadSlice(
    road: ProjectedRoadSlice,
    absoluteIndex: number,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
    const segmentStartZ = absoluteIndex * SEGMENT_LENGTH;
    const dashStartZ = segmentStartZ +
        SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.laneDashStartRatio;
    const dashEndZ = dashStartZ +
        SEGMENT_LENGTH * SPEED_PRESENTATION_WORLD_CONFIG.laneDashLengthRatio;
    const clippedStartZ = Math.max(road.nearWorldZ, dashStartZ);
    const clippedEndZ = Math.min(road.farWorldZ, dashEndZ);

    if (clippedEndZ <= clippedStartZ) return null;

    const worldSpan = Math.max(0.000001, road.farWorldZ - road.nearWorldZ);
    const startRatio = Phaser.Math.Clamp(
        (clippedStartZ - road.nearWorldZ) / worldSpan,
        0,
        1,
    );
    const endRatio = Phaser.Math.Clamp(
        (clippedEndZ - road.nearWorldZ) / worldSpan,
        0,
        1,
    );

    return projectRoadSlice(
        Phaser.Math.Linear(road.nearCenterX, road.farCenterX, startRatio),
        Phaser.Math.Linear(road.nearCenterX, road.farCenterX, endRatio),
        Phaser.Math.Linear(road.nearElevation, road.farElevation, startRatio),
        Phaser.Math.Linear(road.nearElevation, road.farElevation, endRatio),
        clippedStartZ,
        clippedEndZ,
        Phaser.Math.Linear(road.nearRoadHalfWidth, road.farRoadHalfWidth, startRatio),
        Phaser.Math.Linear(road.nearRoadHalfWidth, road.farRoadHalfWidth, endRatio),
        camera,
        viewport,
    );
}

function getRoadDistanceFade(road: ProjectedRoadSlice, cameraZ: number) {
    const centerDistance = Math.max(
        0,
        (road.nearWorldZ + road.farWorldZ) * 0.5 - cameraZ,
    );
    return getWorldDistanceFog(centerDistance);
}

function mixColor(from: number, to: number, amount: number) {
    const ratio = Phaser.Math.Clamp(amount, 0, 1);
    const fromRed = (from >> 16) & 0xff;
    const fromGreen = (from >> 8) & 0xff;
    const fromBlue = from & 0xff;
    const toRed = (to >> 16) & 0xff;
    const toGreen = (to >> 8) & 0xff;
    const toBlue = to & 0xff;
    const red = Math.round(Phaser.Math.Linear(fromRed, toRed, ratio));
    const green = Math.round(Phaser.Math.Linear(fromGreen, toGreen, ratio));
    const blue = Math.round(Phaser.Math.Linear(fromBlue, toBlue, ratio));

    return (red << 16) | (green << 8) | blue;
}

function getFoggedRoadColor(
    nearColor: number,
    farMaterialColor: number,
    distanceFade: number,
    fogExponent: number,
) {
    const materialColor = mixColor(nearColor, farMaterialColor, distanceFade);
    const worldFogAmount = Math.pow(distanceFade, fogExponent);

    return mixColor(materialColor, WORLD_FOG_COLOR, worldFogAmount);
}

function fillProjectedRoadBand(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    nearLeftX: number,
    nearRightX: number,
    farLeftX: number,
    farRightX: number,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    color: number,
) {
    const nearLeft = projectGroundPoint(
        { x: nearLeftX, y: road.nearElevation, z: road.nearWorldZ },
        camera,
        viewport,
    );
    const nearRight = projectGroundPoint(
        { x: nearRightX, y: road.nearElevation, z: road.nearWorldZ },
        camera,
        viewport,
    );
    const farLeft = projectGroundPoint(
        { x: farLeftX, y: road.farElevation, z: road.farWorldZ },
        camera,
        viewport,
    );
    const farRight = projectGroundPoint(
        { x: farRightX, y: road.farElevation, z: road.farWorldZ },
        camera,
        viewport,
    );

    if (!nearLeft.visible || !nearRight.visible || !farLeft.visible || !farRight.visible) {
        return;
    }

    fillQuad(graphics, farLeft, farRight, nearRight, nearLeft, color);
}

function fillQuad(
    graphics: Phaser.GameObjects.Graphics,
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number },
    color: number,
) {
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(a.x, a.y);
    graphics.lineTo(b.x, b.y);
    graphics.lineTo(c.x, c.y);
    graphics.lineTo(d.x, d.y);
    graphics.closePath();
    graphics.fillPath();
}
