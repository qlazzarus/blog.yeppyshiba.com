import Phaser from 'phaser';
import {
    projectGroundPoint,
    type Pseudo3dCamera,
    type ScreenPoint,
    type Viewport,
} from './pseudo3dCamera';
import {
    DEFAULT_ROAD_HALF_WIDTH,
    getRoadElevationAt,
    getRoadHalfWidthAt,
    getRoadSegment,
    type RoadTrack,
} from './road';
import {
    ELEVATION_VISUAL_SCALE,
    getRoadCenterOffsetAhead,
} from './roadRenderer';

export type RoadObjectKind =
    | 'blue-reflector'
    | 'chevron-left'
    | 'chevron-right'
    | 'left-cliff-guardrail-post'
    | 'left-cliff-guardrail-span'
    | 'right-guardrail-post'
    | 'right-guardrail-span'
    | 'right-retaining-wall-span'
    | 'right-wall-tree'
    | 'sign-speed';

type RoadsideProfile = 'commitment' | 'open-view' | 'recovery' | 'wall-run';

export type RoadObject = {
    collisionRadius: number;
    id: string;
    kind: RoadObjectKind;
    lateralOffset: number;
    profile: RoadsideProfile;
    spanEndZ?: number;
    z: number;
};

export type RoadObjectRenderStats = {
    motionAnchorPassRate: number;
    motionAnchorPasses: number;
    motionAnchorScreenVelocity: number;
    motionAnchorsVisible: number;
    rendered: number;
    visible: number;
};

export type RoadObjectMotionTracker = {
    getStats: () => RoadObjectRenderStats;
    observe: (objects: ProjectedRoadObject[], elapsedSec: number, viewport: Viewport) => RoadObjectRenderStats;
    reset: () => void;
};

const OBJECT_DRAW_DISTANCE = 9800;
const OBJECT_NEAR_CLIP_DISTANCE = 80;
const ROAD_EDGE_OFFSET = 1180;
const RIGHT_WALL_OFFSET = 1580;
const RIGHT_TREE_OFFSET = 1830;
const CITY_VIEW_ZONES = [
    { end: 0.29, start: 0.1 },
    { end: 0.76, start: 0.57 },
];

export function createRoadObjects(track: RoadTrack): RoadObject[] {
    const objects: RoadObject[] = [];

    for (let z = track.segmentLength * 3; z < track.length; z += track.segmentLength) {
        const profile = getRoadsideProfile(track, z);
        const segment = getRoadSegment(track, Math.floor(z / track.segmentLength));
        const segmentIndex = Math.floor(z / track.segmentLength);
        const outsideSide = segment.curve >= 0 ? 1 : -1;
        const spanEndZ = Math.min(z + track.segmentLength, track.length);

        objects.push({
            collisionRadius: 70,
            id: `guard-left-span-${z}`,
            kind: 'left-cliff-guardrail-span',
            lateralOffset: -ROAD_EDGE_OFFSET,
            profile,
            spanEndZ,
            z,
        });
        objects.push({
            collisionRadius: 70,
            id: `guard-right-span-${z}`,
            kind: 'right-guardrail-span',
            lateralOffset: ROAD_EDGE_OFFSET,
            profile,
            spanEndZ,
            z,
        });

        if (profile === 'wall-run' || profile === 'commitment') {
            objects.push({
                collisionRadius: 100,
                id: `wall-span-${z}`,
                kind: 'right-retaining-wall-span',
                lateralOffset: RIGHT_WALL_OFFSET,
                profile,
                spanEndZ,
                z,
            });
        }

        if ((profile === 'wall-run' || profile === 'commitment') && segmentIndex % 8 === 0) {
            objects.push({
                collisionRadius: 90,
                id: `wall-tree-${z}`,
                kind: 'right-wall-tree',
                lateralOffset: RIGHT_TREE_OFFSET,
                profile,
                z: z + track.segmentLength * 1.15,
            });
        }

        if (segmentIndex % 4 === 0) {
            objects.push({
                collisionRadius: 50,
                id: `guard-left-post-${z}`,
                kind: 'left-cliff-guardrail-post',
                lateralOffset: -ROAD_EDGE_OFFSET,
                profile,
                z,
            });
        }

        if (segmentIndex % 3 === 0) {
            objects.push({
                collisionRadius: 50,
                id: `guard-right-post-${z}`,
                kind: 'right-guardrail-post',
                lateralOffset: ROAD_EDGE_OFFSET,
                profile,
                z,
            });
        }

        if (profile === 'commitment' && segmentIndex % 8 === 0) {
            objects.push({
                collisionRadius: 90,
                id: `chevron-${z}`,
                kind: outsideSide > 0 ? 'chevron-right' : 'chevron-left',
                lateralOffset: outsideSide * (ROAD_EDGE_OFFSET + 220),
                profile,
                z: z + track.segmentLength * 1.1,
            });
        }
    }

    // Deliberately small Graphics markers rather than final roadside art. Their
    // denser cadence creates a measurable near-field depth reference.
    for (let z = track.segmentLength * 3; z < track.length; z += track.segmentLength * 2) {
        const profile = getRoadsideProfile(track, z);

        if (profile !== 'commitment' && profile !== 'wall-run') continue;

        const segment = getRoadSegment(track, Math.floor(z / track.segmentLength));
        const outsideSide = segment.curve >= 0 ? 1 : -1;

        objects.push({
            collisionRadius: 50,
            id: `motion-anchor-reflector-${z}`,
            kind: 'blue-reflector',
            lateralOffset: outsideSide * (ROAD_EDGE_OFFSET + 95),
            profile,
            z: z + track.segmentLength * 0.6,
        });
    }

    objects.push(
        {
            collisionRadius: 100,
            id: 'speed-sign-entry',
            kind: 'sign-speed',
            lateralOffset: ROAD_EDGE_OFFSET + 220,
            profile: 'open-view',
            z: track.segmentLength * 7,
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
    elapsedSec: number,
    motionTracker: RoadObjectMotionTracker,
): RoadObjectRenderStats {
    const currentElevation = getRoadElevationAt(track, camera.z);
    const visibleObjects = objects
        .map((object) => projectRoadObject(object, track, camera, viewport, currentElevation))
        .filter((object): object is ProjectedRoadObject => object !== null)
        .sort((a, b) => b.distanceAhead - a.distanceAhead || getRenderLayer(a.object) - getRenderLayer(b.object));

    for (const object of visibleObjects) {
        drawRoadObject(graphics, object);
    }

    const stats = motionTracker.observe(visibleObjects, elapsedSec, viewport);

    return {
        ...stats,
        rendered: visibleObjects.length,
        visible: visibleObjects.length,
    };
}

export function createRoadObjectMotionTracker(): RoadObjectMotionTracker {
    const previousById = new Map<string, { elapsedSec: number; y: number }>();
    let passTimes: number[] = [];
    let screenVelocity = 0;
    let totalPasses = 0;
    let stats: RoadObjectRenderStats = createEmptyRoadObjectStats();

    return {
        getStats: () => stats,
        observe: (objects, elapsedSec, viewport) => {
            const nearGateY = viewport.height * 0.74;
            const anchors = objects.filter((object) => object.object.kind === 'blue-reflector');
            let velocityTotal = 0;
            let velocitySamples = 0;

            for (const anchor of anchors) {
                const previous = previousById.get(anchor.object.id);

                if (previous && elapsedSec > previous.elapsedSec) {
                    const seconds = elapsedSec - previous.elapsedSec;
                    const deltaY = anchor.screen.y - previous.y;

                    if (deltaY > 0) {
                        velocityTotal += deltaY / seconds;
                        velocitySamples += 1;
                    }

                    if (previous.y < nearGateY && anchor.screen.y >= nearGateY) {
                        passTimes.push(elapsedSec);
                        totalPasses += 1;
                    }
                }

                previousById.set(anchor.object.id, { elapsedSec, y: anchor.screen.y });
            }

            if (velocitySamples > 0) {
                screenVelocity = Phaser.Math.Linear(screenVelocity, velocityTotal / velocitySamples, 0.2);
            }

            passTimes = passTimes.filter((time) => elapsedSec - time <= 1);
            const staleBefore = elapsedSec - 2;

            for (const [id, sample] of previousById) {
                if (sample.elapsedSec < staleBefore) previousById.delete(id);
            }

            stats = {
                motionAnchorPassRate: passTimes.length,
                motionAnchorPasses: totalPasses,
                motionAnchorScreenVelocity: screenVelocity,
                motionAnchorsVisible: anchors.length,
                rendered: objects.length,
                visible: objects.length,
            };

            return stats;
        },
        reset: () => {
            previousById.clear();
            passTimes = [];
            screenVelocity = 0;
            totalPasses = 0;
            stats = createEmptyRoadObjectStats();
        },
    };
}

function createEmptyRoadObjectStats(): RoadObjectRenderStats {
    return {
        motionAnchorPassRate: 0,
        motionAnchorPasses: 0,
        motionAnchorScreenVelocity: 0,
        motionAnchorsVisible: 0,
        rendered: 0,
        visible: 0,
    };
}

type ProjectedRoadObject = {
    distanceAhead: number;
    object: RoadObject;
    screen: ScreenPoint;
    spanEndScreen: ScreenPoint | null;
};

function projectRoadObject(
    object: RoadObject,
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    currentElevation: number,
): ProjectedRoadObject | null {
    const startZ = object.spanEndZ
        ? Math.max(object.z, camera.z + OBJECT_NEAR_CLIP_DISTANCE)
        : object.z;
    const distanceAhead = startZ - camera.z;

    if (distanceAhead < OBJECT_NEAR_CLIP_DISTANCE || distanceAhead > OBJECT_DRAW_DISTANCE) {
        return null;
    }

    const screen = projectRoadObjectScreen(object, startZ, track, camera, viewport, currentElevation);
    const spanEndScreen = object.spanEndZ
        ? projectRoadObjectScreen(object, object.spanEndZ, track, camera, viewport, currentElevation)
        : null;

    if (!screen.visible) return null;
    if (spanEndScreen && !spanEndScreen.visible) return null;
    if (screen.y < -120 || screen.y > viewport.height + 180) return null;

    return {
        distanceAhead,
        object,
        screen,
        spanEndScreen,
    };
}

function projectRoadObjectScreen(
    object: RoadObject,
    worldZ: number,
    track: RoadTrack,
    camera: Pseudo3dCamera,
    viewport: Viewport,
    currentElevation: number,
) {
    const distanceAhead = worldZ - camera.z;
    const roadCenterOffset = getRoadCenterOffsetAhead(track, camera.z, distanceAhead);
    const elevationDelta = getRoadElevationAt(track, worldZ) - currentElevation;
    const roadHalfWidth = getRoadHalfWidthAt(track, worldZ);

    return projectGroundPoint(
        {
            x: roadCenterOffset + getRoadRelativeObjectOffset(object.lateralOffset, roadHalfWidth),
            y: elevationDelta * ELEVATION_VISUAL_SCALE,
            z: worldZ,
        },
        camera,
        viewport,
    );
}

function getRoadRelativeObjectOffset(baseOffset: number, roadHalfWidth: number) {
    const side = Math.sign(baseOffset) || 1;
    const outsideRoadOffset = Math.max(0, Math.abs(baseOffset) - DEFAULT_ROAD_HALF_WIDTH);

    return side * (roadHalfWidth + outsideRoadOffset);
}

function drawRoadObject(
    graphics: Phaser.GameObjects.Graphics,
    projected: ProjectedRoadObject,
) {
    switch (projected.object.kind) {
        case 'blue-reflector':
            drawBlueReflector(graphics, projected.screen);
            return;
        case 'chevron-left':
            drawChevron(graphics, projected.screen, -1);
            return;
        case 'chevron-right':
            drawChevron(graphics, projected.screen, 1);
            return;
        case 'left-cliff-guardrail-span':
            drawGuardrailSpan(graphics, projected, 'left');
            return;
        case 'right-guardrail-span':
            drawGuardrailSpan(graphics, projected, 'right');
            return;
        case 'left-cliff-guardrail-post':
            drawGuardrailPost(graphics, projected.screen, 'left');
            return;
        case 'right-guardrail-post':
            drawGuardrailPost(graphics, projected.screen, 'right');
            return;
        case 'right-retaining-wall-span':
            drawRetainingWallSpan(graphics, projected);
            return;
        case 'right-wall-tree':
            drawWallTree(graphics, projected.screen);
            return;
        case 'sign-speed':
            drawSpeedSign(graphics, projected.screen);
            return;
        default:
            return;
    }
}

function drawChevron(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint, direction: -1 | 1) {
    const width = scaleValue(screen, 260, 10, 96);
    const height = scaleValue(screen, 190, 8, 72);
    const x = screen.x;
    const y = screen.y - height * 0.6;

    graphics.fillStyle(0x050812, 0.76);
    graphics.fillRoundedRect(x - width * 0.6, y - height * 0.55, width * 1.2, height * 1.1, Math.max(2, width * 0.08));
    graphics.lineStyle(Math.max(2, width * 0.14), 0x67b7ff, 0.95);
    graphics.beginPath();
    graphics.moveTo(x - direction * width * 0.28, y - height * 0.32);
    graphics.lineTo(x + direction * width * 0.22, y);
    graphics.lineTo(x - direction * width * 0.28, y + height * 0.32);
    graphics.strokePath();
}

function drawGuardrailSpan(
    graphics: Phaser.GameObjects.Graphics,
    projected: ProjectedRoadObject,
    side: 'left' | 'right',
) {
    const far = projected.spanEndScreen;

    if (!far) return;

    const near = projected.screen;
    const railHeight = side === 'left' ? 74 : 102;
    const nearTopY = near.y - scaleValue(near, railHeight, 5, side === 'left' ? 38 : 50);
    const farTopY = far.y - scaleValue(far, railHeight, 2, side === 'left' ? 38 : 50);
    const nearThickness = Math.max(2, scaleValue(near, side === 'left' ? 25 : 34, 2, 13));
    const farThickness = Math.max(1, scaleValue(far, side === 'left' ? 25 : 34, 1, 13));

    graphics.fillStyle(0x07101f, 0.96);
    fillQuad(
        graphics,
        near.x,
        nearTopY,
        far.x,
        farTopY,
        far.x,
        farTopY + farThickness,
        near.x,
        nearTopY + nearThickness,
    );
    graphics.lineStyle(Math.max(1, nearThickness * 0.42), 0x4f86ad, side === 'left' ? 0.7 : 0.9);
    graphics.lineBetween(near.x, nearTopY + nearThickness * 0.36, far.x, farTopY + farThickness * 0.36);

    if (side === 'right') {
        const lowerNearY = nearTopY + scaleValue(near, 42, 4, 22);
        const lowerFarY = farTopY + scaleValue(far, 42, 2, 22);

        graphics.lineStyle(Math.max(1, nearThickness * 0.3), 0x183955, 0.9);
        graphics.lineBetween(near.x, lowerNearY, far.x, lowerFarY);
    }
}

function drawGuardrailPost(
    graphics: Phaser.GameObjects.Graphics,
    screen: ScreenPoint,
    side: 'left' | 'right',
) {
    const height = scaleValue(screen, side === 'left' ? 118 : 146, 7, side === 'left' ? 54 : 68);
    const width = Math.max(2, scaleValue(screen, side === 'left' ? 26 : 34, 2, 13));
    const y = screen.y - height;

    graphics.fillStyle(0x102c47, 0.98);
    graphics.fillRect(screen.x - width / 2, y, width, height);
    graphics.fillStyle(0x4f86ad, side === 'left' ? 0.62 : 0.76);
    graphics.fillRect(screen.x - width * 0.18, y + height * 0.12, width * 0.36, height * 0.68);
}

function drawRetainingWallSpan(graphics: Phaser.GameObjects.Graphics, projected: ProjectedRoadObject) {
    const far = projected.spanEndScreen;

    if (!far) return;

    const near = projected.screen;
    const nearHeight = scaleValue(near, 620, 26, 310);
    const farHeight = scaleValue(far, 620, 8, 310);
    graphics.fillStyle(0x071523, 0.97);
    fillQuad(graphics, near.x, near.y, far.x, far.y, far.x, far.y - farHeight, near.x, near.y - nearHeight);
    graphics.lineStyle(Math.max(1, nearHeight * 0.024), 0x183955, 0.7);
    graphics.lineBetween(near.x, near.y - nearHeight * 0.3, far.x, far.y - farHeight * 0.3);
    graphics.lineBetween(near.x, near.y - nearHeight * 0.64, far.x, far.y - farHeight * 0.64);
}

function drawWallTree(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const width = scaleValue(screen, 410, 16, 186);
    const height = scaleValue(screen, 720, 34, 330);
    const trunkHeight = height * 0.24;

    graphics.fillStyle(0x06111c, 0.98);
    graphics.fillRect(screen.x - width * 0.08, screen.y - trunkHeight, width * 0.16, trunkHeight);
    graphics.fillStyle(0x082138, 0.98);
    fillTriangle(
        graphics,
        screen.x,
        screen.y - height,
        screen.x - width * 0.58,
        screen.y - trunkHeight * 0.25,
        screen.x + width * 0.58,
        screen.y - trunkHeight * 0.25,
    );
    graphics.fillStyle(0x0c3150, 0.92);
    fillTriangle(
        graphics,
        screen.x + width * 0.12,
        screen.y - height * 0.74,
        screen.x - width * 0.46,
        screen.y - trunkHeight * 0.02,
        screen.x + width * 0.5,
        screen.y - trunkHeight * 0.02,
    );
}

function drawBlueReflector(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const size = scaleValue(screen, 66, 3, 30);
    const poleHeight = size * 2.3;

    graphics.fillStyle(0x0a1b2c, 0.98);
    graphics.fillRect(screen.x - size * 0.12, screen.y - poleHeight, size * 0.24, poleHeight);
    graphics.fillStyle(0x8bd5ff, 0.96);
    graphics.fillRoundedRect(screen.x - size / 2, screen.y - poleHeight, size, size, Math.max(2, size * 0.18));
}

function getRoadsideProfile(track: RoadTrack, z: number): RoadsideProfile {
    const progress = z / track.length;
    const segment = getRoadSegment(track, Math.floor(z / track.segmentLength));
    const curveIntensity = Math.abs(segment.curve);

    if (curveIntensity >= 0.55) return 'commitment';
    if (CITY_VIEW_ZONES.some((zone) => progress >= zone.start && progress <= zone.end)) return 'open-view';
    if (curveIntensity <= 0.16) return 'recovery';

    return 'wall-run';
}

function drawSpeedSign(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint) {
    const radius = scaleValue(screen, 140, 5, 46);
    const poleWidth = Math.max(2, radius * 0.14);
    const poleHeight = radius * 2.4;
    const y = screen.y - poleHeight - radius * 1.1;

    graphics.fillStyle(0x050812, 0.8);
    graphics.fillRect(screen.x - poleWidth / 2, y + radius * 0.75, poleWidth, poleHeight);
    graphics.fillStyle(0xc6e5ff, 0.86);
    graphics.fillCircle(screen.x, y, radius);
    graphics.lineStyle(Math.max(2, radius * 0.18), 0x245f9d, 1);
    graphics.strokeCircle(screen.x, y, radius * 0.86);
    graphics.fillStyle(0x050812, 0.9);
    graphics.fillRect(screen.x - radius * 0.38, y - radius * 0.08, radius * 0.76, Math.max(2, radius * 0.14));
}

function scaleValue(screen: ScreenPoint, worldSize: number, min: number, max: number) {
    return Phaser.Math.Clamp(worldSize * screen.scale, min, max);
}

function getRenderLayer(object: RoadObject) {
    switch (object.kind) {
        case 'right-wall-tree':
            return 0;
        case 'right-retaining-wall-span':
            return 1;
        case 'left-cliff-guardrail-span':
        case 'right-guardrail-span':
            return 2;
        case 'left-cliff-guardrail-post':
        case 'right-guardrail-post':
            return 3;
        default:
            return 4;
    }
}

function fillQuad(
    graphics: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
) {
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.lineTo(x3, y3);
    graphics.lineTo(x4, y4);
    graphics.closePath();
    graphics.fillPath();
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
