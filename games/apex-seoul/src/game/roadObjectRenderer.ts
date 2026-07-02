import Phaser from 'phaser';
import {
    projectGroundPoint,
    type Pseudo3dCamera,
    type ScreenPoint,
    type Viewport,
} from './pseudo3dCamera';
import {
    getRoadElevationAt,
    wrapDistance,
    type RoadTrack,
} from './road';
import {
    ELEVATION_VISUAL_SCALE,
    getRoadCenterOffsetAhead,
} from './roadRenderer';

export type RoadObjectKind =
    | 'checkpoint'
    | 'chevron-left'
    | 'chevron-right'
    | 'guard-post'
    | 'pine'
    | 'sign-speed';

export type RoadObject = {
    collisionRadius: number;
    id: string;
    kind: RoadObjectKind;
    lateralOffset: number;
    z: number;
};

export type RoadObjectRenderStats = {
    rendered: number;
    visible: number;
};

const OBJECT_DRAW_DISTANCE = 9800;
const OBJECT_NEAR_CLIP_DISTANCE = 80;
const ROAD_EDGE_OFFSET = 1180;
const TREE_OFFSET = 1620;

export function createRoadObjects(track: RoadTrack): RoadObject[] {
    const objects: RoadObject[] = [];

    for (let z = 960; z < track.length; z += track.segmentLength * 5) {
        const side = Math.floor(z / track.segmentLength) % 2 === 0 ? -1 : 1;

        objects.push({
            collisionRadius: 70,
            id: `guard-left-${z}`,
            kind: 'guard-post',
            lateralOffset: -ROAD_EDGE_OFFSET,
            z,
        });
        objects.push({
            collisionRadius: 70,
            id: `guard-right-${z}`,
            kind: 'guard-post',
            lateralOffset: ROAD_EDGE_OFFSET,
            z: z + track.segmentLength * 0.45,
        });

        if (z % (track.segmentLength * 10) === 0) {
            objects.push({
                collisionRadius: 90,
                id: `pine-${z}`,
                kind: 'pine',
                lateralOffset: side * TREE_OFFSET,
                z: z + track.segmentLength * 1.4,
            });
        }
    }

    const checkpointInterval = Math.max(track.segmentLength * 22, track.length / 4);

    for (let z = checkpointInterval; z < track.length; z += checkpointInterval) {
        objects.push({
            collisionRadius: 0,
            id: `checkpoint-${Math.round(z)}`,
            kind: 'checkpoint',
            lateralOffset: 0,
            z,
        });
    }

    objects.push(
        {
            collisionRadius: 100,
            id: 'speed-sign-entry',
            kind: 'sign-speed',
            lateralOffset: ROAD_EDGE_OFFSET + 220,
            z: track.segmentLength * 7,
        },
        {
            collisionRadius: 90,
            id: 'chevron-left-1',
            kind: 'chevron-left',
            lateralOffset: -ROAD_EDGE_OFFSET - 120,
            z: track.segmentLength * 28,
        },
        {
            collisionRadius: 90,
            id: 'chevron-right-1',
            kind: 'chevron-right',
            lateralOffset: ROAD_EDGE_OFFSET + 120,
            z: track.segmentLength * 55,
        },
    );

    return objects.sort((a, b) => a.z - b.z);
}

export function renderRoadObjects(
    graphics: Phaser.GameObjects.Graphics,
    objects: RoadObject[],
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
): RoadObjectRenderStats {
    const currentElevation = getRoadElevationAt(track, camera.z);
    const visibleObjects = objects
        .map((object) => projectRoadObject(object, track, camera, viewport, currentElevation))
        .filter((object): object is ProjectedRoadObject => object !== null)
        .sort((a, b) => b.distanceAhead - a.distanceAhead);

    for (const object of visibleObjects) {
        drawRoadObject(graphics, object);
    }

    return {
        rendered: visibleObjects.length,
        visible: visibleObjects.length,
    };
}

type ProjectedRoadObject = {
    distanceAhead: number;
    object: RoadObject;
    screen: ScreenPoint;
};

function projectRoadObject(
    object: RoadObject,
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    currentElevation: number,
): ProjectedRoadObject | null {
    const distanceAhead = wrapDistance(object.z - camera.z, track.length);

    if (distanceAhead < OBJECT_NEAR_CLIP_DISTANCE || distanceAhead > OBJECT_DRAW_DISTANCE) {
        return null;
    }

    const worldZ = camera.z + distanceAhead;
    const roadCenterOffset = getRoadCenterOffsetAhead(track, camera.z, distanceAhead);
    const elevationDelta = getRoadElevationAt(track, worldZ) - currentElevation;
    const screen = projectGroundPoint(
        {
            x: roadCenterOffset + object.lateralOffset,
            y: elevationDelta * ELEVATION_VISUAL_SCALE,
            z: worldZ,
        },
        camera,
        viewport,
    );

    if (!screen.visible) return null;
    if (screen.y < -120 || screen.y > viewport.height + 180) return null;

    return {
        distanceAhead,
        object,
        screen,
    };
}

function drawRoadObject(
    graphics: Phaser.GameObjects.Graphics,
    projected: ProjectedRoadObject,
) {
    switch (projected.object.kind) {
        case 'checkpoint':
            drawCheckpoint(graphics, projected.screen);
            return;
        case 'chevron-left':
            drawChevron(graphics, projected.screen, -1);
            return;
        case 'chevron-right':
            drawChevron(graphics, projected.screen, 1);
            return;
        case 'pine':
            drawPine(graphics, projected.screen);
            return;
        case 'sign-speed':
            drawSpeedSign(graphics, projected.screen);
            return;
        case 'guard-post':
        default:
            drawGuardPost(graphics, projected.screen);
    }
}

function drawCheckpoint(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const width = scaleValue(screen, 1900, 18, 900);
    const height = scaleValue(screen, 520, 24, 240);
    const postWidth = Math.max(3, width * 0.045);
    const y = screen.y - height;
    const leftX = screen.x - width / 2;
    const rightX = screen.x + width / 2;

    graphics.fillStyle(0x101316, 0.78);
    graphics.fillRect(leftX, y, postWidth, height);
    graphics.fillRect(rightX - postWidth, y, postWidth, height);
    graphics.fillStyle(0xf2d266, 0.92);
    graphics.fillRect(leftX, y, width, Math.max(4, height * 0.12));
    graphics.fillStyle(0xeef2f3, 0.86);
    graphics.fillRect(leftX + width * 0.12, y + height * 0.025, width * 0.16, Math.max(2, height * 0.06));
    graphics.fillRect(leftX + width * 0.48, y + height * 0.025, width * 0.16, Math.max(2, height * 0.06));
}

function drawChevron(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint, direction: -1 | 1) {
    const width = scaleValue(screen, 260, 10, 96);
    const height = scaleValue(screen, 190, 8, 72);
    const x = screen.x;
    const y = screen.y - height * 0.6;

    graphics.fillStyle(0x101316, 0.72);
    graphics.fillRoundedRect(x - width * 0.6, y - height * 0.55, width * 1.2, height * 1.1, Math.max(2, width * 0.08));
    graphics.lineStyle(Math.max(2, width * 0.14), 0xf2d266, 1);
    graphics.beginPath();
    graphics.moveTo(x - direction * width * 0.28, y - height * 0.32);
    graphics.lineTo(x + direction * width * 0.22, y);
    graphics.lineTo(x - direction * width * 0.28, y + height * 0.32);
    graphics.strokePath();
}

function drawGuardPost(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const width = scaleValue(screen, 74, 3, 34);
    const height = scaleValue(screen, 180, 8, 88);
    const x = screen.x - width / 2;
    const y = screen.y - height;

    graphics.fillStyle(0xeef2f3, 0.92);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(0xc73938, 0.9);
    graphics.fillRect(x, y + height * 0.18, width, Math.max(2, height * 0.18));
    graphics.fillRect(x, y + height * 0.58, width, Math.max(2, height * 0.18));
}

function drawPine(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const width = scaleValue(screen, 280, 10, 124);
    const height = scaleValue(screen, 440, 18, 210);
    const trunkWidth = Math.max(3, width * 0.16);
    const trunkHeight = height * 0.32;
    const trunkX = screen.x - trunkWidth / 2;
    const trunkY = screen.y - trunkHeight;

    graphics.fillStyle(0x4b342b, 0.95);
    graphics.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);
    graphics.fillStyle(0x1f4f3d, 0.98);
    fillTriangle(
        graphics,
        screen.x,
        screen.y - height,
        screen.x - width * 0.55,
        screen.y - trunkHeight * 0.4,
        screen.x + width * 0.55,
        screen.y - trunkHeight * 0.4,
    );
    graphics.fillStyle(0x2d6849, 0.96);
    fillTriangle(
        graphics,
        screen.x,
        screen.y - height * 0.78,
        screen.x - width * 0.48,
        screen.y - trunkHeight * 0.05,
        screen.x + width * 0.48,
        screen.y - trunkHeight * 0.05,
    );
}

function drawSpeedSign(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const radius = scaleValue(screen, 140, 5, 46);
    const poleWidth = Math.max(2, radius * 0.14);
    const poleHeight = radius * 2.4;
    const y = screen.y - poleHeight - radius * 1.1;

    graphics.fillStyle(0x101316, 0.78);
    graphics.fillRect(screen.x - poleWidth / 2, y + radius * 0.75, poleWidth, poleHeight);
    graphics.fillStyle(0xeef2f3, 0.95);
    graphics.fillCircle(screen.x, y, radius);
    graphics.lineStyle(Math.max(2, radius * 0.18), 0xc73938, 1);
    graphics.strokeCircle(screen.x, y, radius * 0.86);
    graphics.fillStyle(0x101316, 0.9);
    graphics.fillRect(screen.x - radius * 0.38, y - radius * 0.08, radius * 0.76, Math.max(2, radius * 0.14));
}

function scaleValue(screen: ScreenPoint, worldSize: number, min: number, max: number) {
    return Phaser.Math.Clamp(worldSize * screen.scale, min, max);
}

function fillTriangle(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
) {
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.lineTo(x3, y3);
    graphics.closePath();
    graphics.fillPath();
}
