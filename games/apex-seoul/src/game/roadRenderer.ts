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
    type RoadTrack,
} from './road';

export type RoadRenderStats = {
    baseSegmentIndex: number;
    currentCurve: number;
    currentElevation: number;
    horizonGapY: number | null;
    visibleSegments: number;
};

type RoadRenderOptions = {
    downhillCueRatio?: number;
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
    let visibleSegments = 0;
    let horizonGapY: number | null = null;

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

        visibleSegments += 1;
        horizonGapY = getNearestHorizonGapY(horizonGapY, road);
        projectedSegments.push({
            absoluteIndex,
            road,
            segment,
        });
    }

    drawDownhillTerrainFill(graphics, projectedSegments, camera, viewport, options.downhillCueRatio ?? 0);

    for (let i = projectedSegments.length - 1; i >= 0; i -= 1) {
        const projected = projectedSegments[i];

        drawRoadBody(graphics, projected.road, projected.absoluteIndex);
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

    return {
        baseSegmentIndex,
        currentCurve,
        currentElevation,
        horizonGapY,
        visibleSegments,
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
        const width = road ? getRoadWidthAtY(road, screenY) : null;

        if (width !== null) return width;
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

    return Math.abs(rightX - leftX);
}

function drawRoadBody(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    absoluteIndex: number,
) {
    fillQuad(
        graphics,
        road.roadFarLeft,
        road.roadFarRight,
        road.roadNearRight,
        road.roadNearLeft,
        absoluteIndex % 2 === 0 ? 0x101722 : 0x0c121b,
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

function drawDownhillTerrainFill(
    graphics: Phaser.GameObjects.Graphics,
    projectedSegments: ProjectedSegment[],
    camera: Pseudo3dCamera,
    viewport: Viewport,
    downhillCueRatio: number,
) {
    if (downhillCueRatio <= 0 || projectedSegments.length === 0) return;

    const horizonY = getHorizonY(camera, viewport);
    const farthestRoad = projectedSegments.at(-1)?.road;

    if (!farthestRoad) return;

    const farRoadTopY = Math.min(farthestRoad.roadFarLeft.y, farthestRoad.roadFarRight.y);
    const gapTopY = horizonY - 2;
    const gapBottomY = Phaser.Math.Clamp(
        farRoadTopY,
        horizonY + 8,
        horizonY + Phaser.Math.Linear(34, 92, downhillCueRatio),
    );

    if (gapBottomY <= gapTopY) return;

    graphics.fillStyle(0x071a2a, 0.95);
    graphics.fillRect(0, gapTopY, viewport.width, gapBottomY - gapTopY);
    graphics.fillStyle(0x245f9d, 0.42);
    graphics.fillRect(0, gapBottomY - 3, viewport.width, 3);
}

function drawShoulder(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    side: -1 | 1,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
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
        0x0a0f18,
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
        0x4f86ad,
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
    if (absoluteIndex % 3 !== 0) return;

    for (let lane = 1; lane < laneCount; lane += 1) {
        const laneCenterRatio = lane / laneCount;
        const nearLaneCenterX = Phaser.Math.Linear(
            road.nearCenterX - road.nearRoadHalfWidth,
            road.nearCenterX + road.nearRoadHalfWidth,
            laneCenterRatio,
        );
        const farLaneCenterX = Phaser.Math.Linear(
            road.farCenterX - road.farRoadHalfWidth,
            road.farCenterX + road.farRoadHalfWidth,
            laneCenterRatio,
        );

        fillProjectedRoadBand(
            graphics,
            road,
            nearLaneCenterX - LANE_MARK_WIDTH,
            nearLaneCenterX + LANE_MARK_WIDTH,
            farLaneCenterX - LANE_MARK_WIDTH,
            farLaneCenterX + LANE_MARK_WIDTH,
            camera,
            viewport,
            0x67b7ff,
        );
    }
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
