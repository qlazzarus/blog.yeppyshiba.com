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

const ROAD_HALF_WIDTH = 960;
const RUMBLE_WIDTH = 130;
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
        const road = projectRoadSlice(
            nearCenterX,
            farCenterX,
            (nearElevation - currentElevation) * ELEVATION_VISUAL_SCALE,
            (farElevation - currentElevation) * ELEVATION_VISUAL_SCALE,
            nearWorldZ,
            farWorldZ,
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
        drawShoulder(graphics, projected.road, projected.absoluteIndex, -1, camera, viewport);
        drawShoulder(graphics, projected.road, projected.absoluteIndex, 1, camera, viewport);
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
    farWorldZ: number;
    nearCenterX: number;
    nearElevation: number;
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
    camera: Pseudo3dCamera,
    viewport: Viewport,
): ProjectedRoadSlice | null {
    const roadNearLeft = projectGroundPoint(
        { x: nearCenterX - ROAD_HALF_WIDTH, y: nearElevation, z: nearWorldZ },
        camera,
        viewport,
    );
    const roadNearRight = projectGroundPoint(
        { x: nearCenterX + ROAD_HALF_WIDTH, y: nearElevation, z: nearWorldZ },
        camera,
        viewport,
    );
    const roadFarLeft = projectGroundPoint(
        { x: farCenterX - ROAD_HALF_WIDTH, y: farElevation, z: farWorldZ },
        camera,
        viewport,
    );
    const roadFarRight = projectGroundPoint(
        { x: farCenterX + ROAD_HALF_WIDTH, y: farElevation, z: farWorldZ },
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
        farWorldZ,
        nearCenterX,
        nearElevation,
        nearWorldZ,
        roadFarLeft,
        roadFarRight,
        roadNearLeft,
        roadNearRight,
    };
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
        absoluteIndex % 2 === 0 ? 0x34383b : 0x303437,
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

    graphics.fillStyle(0x2f4a3d, 0.95);
    graphics.fillRect(0, gapTopY, viewport.width, gapBottomY - gapTopY);
    graphics.fillStyle(0x49624b, 0.45);
    graphics.fillRect(0, gapBottomY - 3, viewport.width, 3);
}

function drawShoulder(
    graphics: Phaser.GameObjects.Graphics,
    road: ProjectedRoadSlice,
    absoluteIndex: number,
    side: -1 | 1,
    camera: Pseudo3dCamera,
    viewport: Viewport,
) {
    const innerNearX = road.nearCenterX + side * ROAD_HALF_WIDTH;
    const outerNearX = road.nearCenterX + side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);
    const innerFarX = road.farCenterX + side * ROAD_HALF_WIDTH;
    const outerFarX = road.farCenterX + side * (ROAD_HALF_WIDTH + RUMBLE_WIDTH);

    fillProjectedRoadBand(
        graphics,
        road,
        innerNearX,
        outerNearX,
        innerFarX,
        outerFarX,
        camera,
        viewport,
        absoluteIndex % 2 === 0 ? 0xe7ecef : 0xc73938,
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
            road.nearCenterX - ROAD_HALF_WIDTH,
            road.nearCenterX + ROAD_HALF_WIDTH,
            laneCenterRatio,
        );
        const farLaneCenterX = Phaser.Math.Linear(
            road.farCenterX - ROAD_HALF_WIDTH,
            road.farCenterX + ROAD_HALF_WIDTH,
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
            0xf2d266,
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
