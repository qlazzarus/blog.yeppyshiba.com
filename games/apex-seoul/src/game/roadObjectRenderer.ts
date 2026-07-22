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
    type CrestVisibilityEnvelope,
    ELEVATION_VISUAL_SCALE,
    getRoadCenterOffsetAhead,
} from './roadRenderer';
import {
    getWorldDistanceFog,
    mixWithWorldFog,
} from './worldDistanceFog';
import { SPEED_PRESENTATION_WORLD_CONFIG } from './speedPresentationConfig';
import { GUARDRAIL_COLLISION_CONFIG } from './guardrailCollision';

export type RoadObjectKind =
    | 'blue-reflector'
    | 'chevron-left'
    | 'chevron-right'
    | 'left-cliff-guardrail-post'
    | 'left-cliff-guardrail-span'
    | 'left-cliff-forest'
    | 'right-guardrail-post'
    | 'right-guardrail-span'
    | 'right-retaining-wall-span'
    | 'right-wall-tree'
    | 'sign-speed';

type RoadsideProfile = 'commitment' | 'open-view' | 'recovery' | 'wall-run';

export type RoadObject = {
    collisionRadius: number;
    forestLayer?: WallForestLayer;
    forestScale?: number;
    forestSide?: ForestSide;
    forestVariant?: WallForestVariant;
    id: string;
    kind: RoadObjectKind;
    lateralOffset: number;
    profile: RoadsideProfile;
    spanEndZ?: number;
    z: number;
};

export type WallForestLayer = 'back' | 'front';
export type WallForestVariant = 0 | 1 | 2 | 3 | 4;
export type ForestSide = 'left-cliff' | 'right-wall';

export type RoadObjectRenderStats = {
    leftCliffForestSprites: WallForestSpriteState[];
    motionAnchorPassRate: number;
    motionAnchorPasses: number;
    motionAnchorScreenVelocity: number;
    motionAnchorsVisible: number;
    rendered: number;
    visible: number;
    wallForestSprites: WallForestSpriteState[];
};

export type WallForestSpriteState = {
    alpha: number;
    height: number;
    id: string;
    layer: WallForestLayer;
    side: ForestSide;
    tint: number;
    variant: WallForestVariant;
    width: number;
    x: number;
    y: number;
};

type RoadObjectRenderOptions = {
    crestVisibilityEnvelope?: CrestVisibilityEnvelope;
    horizonOcclusionY?: number | null;
};

export type RoadObjectMotionTracker = {
    getStats: () => RoadObjectRenderStats;
    observe: (objects: ProjectedRoadObject[], elapsedSec: number, viewport: Viewport) => RoadObjectRenderStats;
    reset: () => void;
};

const OBJECT_DRAW_DISTANCE = 9800;
const FOREST_HORIZON_REVEAL_DISTANCE = 72;
const OBJECT_NEAR_CLIP_DISTANCE = 80;
const CONTINUOUS_SPAN_NEAR_CLIP_DISTANCE = 520;
// Guardrails sit closer to the road than the retaining wall. Starting their
// projection closer to the camera pushes the near endpoint well beyond the
// screen edge, so the continuous ribbon enters the viewport instead of ending
// at its boundary on sharp curves or crests.
const GUARDRAIL_SPAN_NEAR_CLIP_DISTANCE = 320;
const LEFT_TREE_OFFSET = -1680;
const RIGHT_WALL_OFFSET = 1580;
const RIGHT_TREE_OFFSET = 1660;
const WALL_FOREST_SIZE_SCALE = 0.7;
const WALL_FOREST_CLUSTER_SLOTS = [
    { layer: 'back', lateralOffset: 250, scale: 0.82, zOffsetRatio: 0.04 },
    { layer: 'back', lateralOffset: 155, scale: 0.9, zOffsetRatio: 0.31 },
    { layer: 'front', lateralOffset: 65, scale: 1, zOffsetRatio: 0.57 },
    { layer: 'front', lateralOffset: -45, scale: 1.12, zOffsetRatio: 0.84 },
] as const satisfies ReadonlyArray<{
    layer: WallForestLayer;
    lateralOffset: number;
    scale: number;
    zOffsetRatio: number;
}>;
const CONTINUOUS_SPAN_OVERLAP_SEGMENTS = 0.42;
const CITY_VIEW_ZONES = [
    { end: 0.29, start: 0.1 },
    { end: 0.76, start: 0.57 },
];
const LEFT_CLIFF_FOREST_CLUSTER_SLOTS = [
    // The outer-left canopy has the largest lateral projection. Keeping it at
    // the nearest z slot made it race past the screen edge much faster than
    // its neighbour, so distance now increases toward the outer cliff.
    { layer: 'back', lateralOffset: -620, scale: 0.78, zOffsetRatio: 0.84 },
    { layer: 'back', lateralOffset: -360, scale: 0.84, zOffsetRatio: 0.62 },
    { layer: 'front', lateralOffset: -130, scale: 0.92, zOffsetRatio: 0.4 },
    { layer: 'front', lateralOffset: 90, scale: 1, zOffsetRatio: 0.18 },
] as const satisfies ReadonlyArray<{
    layer: WallForestLayer;
    lateralOffset: number;
    scale: number;
    zOffsetRatio: number;
}>;

export function createRoadObjects(track: RoadTrack): RoadObject[] {
    const objects: RoadObject[] = [];

    for (let z = track.segmentLength * 3; z < track.length; z += track.segmentLength) {
        const profile = getRoadsideProfile(track, z);
        const segment = getRoadSegment(track, Math.floor(z / track.segmentLength));
        const segmentIndex = Math.floor(z / track.segmentLength);
        const roadEdgeOffset = segment.roadHalfWidth +
            GUARDRAIL_COLLISION_CONFIG.contactClearance;
        const outsideSide = segment.curve >= 0 ? 1 : -1;
        // Draw continuous roadside structures past the following segment
        // boundary. The nearer span is rendered last, which hides projection
        // seams that otherwise read as a brief cut at the screen edge.
        const spanEndZ = Math.min(
            z + track.segmentLength * (1 + CONTINUOUS_SPAN_OVERLAP_SEGMENTS),
            track.length,
        );

        objects.push({
            collisionRadius: 70,
            id: `guard-left-span-${z}`,
            kind: 'left-cliff-guardrail-span',
            lateralOffset: -roadEdgeOffset,
            profile,
            spanEndZ,
            z,
        });
        objects.push({
            collisionRadius: 70,
            id: `guard-right-span-${z}`,
            kind: 'right-guardrail-span',
            lateralOffset: roadEdgeOffset,
            profile,
            spanEndZ,
            z,
        });

        objects.push({
            collisionRadius: 100,
            id: `wall-span-${z}`,
            kind: 'right-retaining-wall-span',
            lateralOffset: RIGHT_WALL_OFFSET,
            profile,
            spanEndZ,
            z,
        });

        // A four-clump cadence spans every road segment. The overlapping
        // foreground and background rows keep the right-hand forest line
        // continuous instead of exposing isolated tree sprites between walls.
        for (const [slotIndex, slot] of WALL_FOREST_CLUSTER_SLOTS.entries()) {
            const seed = getWallForestSeed(segmentIndex, slot.layer, slotIndex);

            objects.push({
                collisionRadius: 90,
                forestLayer: slot.layer,
                forestScale: slot.scale,
                forestSide: 'right-wall',
                forestVariant: seed.variant,
                id: `wall-tree-${segmentIndex}-${slotIndex}`,
                kind: 'right-wall-tree',
                lateralOffset: RIGHT_TREE_OFFSET + slot.lateralOffset + seed.lateralOffset,
                profile,
                z: z + track.segmentLength * slot.zOffsetRatio,
            });
        }

        for (const [slotIndex, slot] of LEFT_CLIFF_FOREST_CLUSTER_SLOTS.entries()) {
            const seed = getWallForestSeed(segmentIndex, slot.layer, slotIndex + 10);

            objects.push({
                collisionRadius: 70,
                forestLayer: slot.layer,
                forestScale: slot.scale,
                forestSide: 'left-cliff',
                forestVariant: seed.variant,
                id: `left-cliff-tree-${segmentIndex}-${slotIndex}`,
                kind: 'left-cliff-forest',
                lateralOffset: LEFT_TREE_OFFSET + slot.lateralOffset + seed.lateralOffset * 0.72,
                profile,
                z: z + track.segmentLength * slot.zOffsetRatio,
            });
        }

        if (segmentIndex % SPEED_PRESENTATION_WORLD_CONFIG.leftGuardrailPostSegmentInterval === 0) {
            objects.push({
                collisionRadius: 50,
                id: `guard-left-post-${z}`,
                kind: 'left-cliff-guardrail-post',
                lateralOffset: -roadEdgeOffset,
                profile,
                z,
            });
        }

        if (segmentIndex % SPEED_PRESENTATION_WORLD_CONFIG.rightGuardrailPostSegmentInterval === 0) {
            objects.push({
                collisionRadius: 50,
                id: `guard-right-post-${z}`,
                kind: 'right-guardrail-post',
                lateralOffset: roadEdgeOffset,
                profile,
                z,
            });
        }

        if (profile === 'commitment' && segmentIndex % 8 === 0) {
            objects.push({
                collisionRadius: 90,
                id: `chevron-${z}`,
                kind: outsideSide > 0 ? 'chevron-right' : 'chevron-left',
                lateralOffset: outsideSide * (roadEdgeOffset + 220),
                profile,
                z: z + track.segmentLength * 1.1,
            });
        }
    }

    // Deliberately small Graphics markers rather than final roadside art. Their
    // denser cadence creates a measurable near-field depth reference.
    for (
        let z = track.segmentLength * 3;
        z < track.length;
        z += track.segmentLength * SPEED_PRESENTATION_WORLD_CONFIG.reflectorSegmentInterval
    ) {
        const profile = getRoadsideProfile(track, z);

        if (profile !== 'commitment' && profile !== 'wall-run') continue;

        const segment = getRoadSegment(track, Math.floor(z / track.segmentLength));
        const roadEdgeOffset = segment.roadHalfWidth +
            GUARDRAIL_COLLISION_CONFIG.contactClearance;
        const outsideSide = segment.curve >= 0 ? 1 : -1;

        objects.push({
            collisionRadius: 50,
            id: `motion-anchor-reflector-${z}`,
            kind: 'blue-reflector',
            lateralOffset: outsideSide * (roadEdgeOffset + 95),
            profile,
            z: z + track.segmentLength * 0.6,
        });
    }

    const speedSignZ = track.segmentLength * 7;
    const speedSignSegment = getRoadSegment(track, 7);
    const speedSignRoadEdgeOffset = speedSignSegment.roadHalfWidth +
        GUARDRAIL_COLLISION_CONFIG.contactClearance;

    objects.push(
        {
            collisionRadius: 100,
            id: 'speed-sign-entry',
            kind: 'sign-speed',
            lateralOffset: speedSignRoadEdgeOffset + 220,
            profile: 'open-view',
            z: speedSignZ,
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
    options: RoadObjectRenderOptions = {},
): RoadObjectRenderStats {
    const currentElevation = getRoadElevationAt(track, camera.z);
    const visibleObjects = objects
        .map((object) => projectRoadObject(
            object,
            track,
            camera,
            viewport,
            currentElevation,
            options.crestVisibilityEnvelope ?? [],
            options.horizonOcclusionY ?? null,
        ))
        .filter((object): object is ProjectedRoadObject => object !== null)
        .sort((a, b) => b.distanceAhead - a.distanceAhead || getRenderLayer(a.object) - getRenderLayer(b.object));

    for (const object of visibleObjects) {
        drawRoadObject(graphics, object);
    }

    const stats = motionTracker.observe(visibleObjects, elapsedSec, viewport);
    const wallForestSprites = visibleObjects
        .filter((object) => object.object.kind === 'right-wall-tree')
        .map((object) => createWallForestSpriteState(object, options.horizonOcclusionY ?? null));
    const leftCliffForestSprites = visibleObjects
        .filter((object) => object.object.kind === 'left-cliff-forest')
        .map((object) => createWallForestSpriteState(object, options.horizonOcclusionY ?? null));

    return {
        ...stats,
        rendered: visibleObjects.length,
        visible: visibleObjects.length,
        leftCliffForestSprites,
        wallForestSprites,
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
                wallForestSprites: [],
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
        leftCliffForestSprites: [],
        visible: 0,
        wallForestSprites: [],
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
    crestVisibilityEnvelope: CrestVisibilityEnvelope,
    horizonOcclusionY: number | null,
): ProjectedRoadObject | null {
    const nearClipDistance = getObjectNearClipDistance(object);
    const startZ = object.spanEndZ
        ? Math.max(object.z, camera.z + nearClipDistance)
        : object.z;
    const distanceAhead = startZ - camera.z;

    if (distanceAhead < nearClipDistance || distanceAhead > OBJECT_DRAW_DISTANCE) {
        return null;
    }

    const crestPoint = getCrestVisibilityPoint(crestVisibilityEnvelope, distanceAhead);

    if (crestPoint && !crestPoint.roadVisible) return null;

    const screen = projectRoadObjectScreen(object, startZ, track, camera, viewport, currentElevation);
    const spanEndZ = getVisibleSpanEndZ(object, startZ, camera.z, crestVisibilityEnvelope);

    if (object.spanEndZ && spanEndZ === null) return null;
    if (spanEndZ !== null && spanEndZ <= startZ) return null;

    const spanEndScreen = spanEndZ !== null
        ? projectRoadObjectScreen(object, spanEndZ, track, camera, viewport, currentElevation)
        : null;

    if (!screen.visible) return null;
    if (spanEndScreen && !spanEndScreen.visible) return null;
    if (screen.y < -120 || screen.y > viewport.height + 180) return null;
    if (horizonOcclusionY !== null) {
        const isForest = object.kind === 'left-cliff-forest' || object.kind === 'right-wall-tree';
        const revealThreshold = isForest
            ? horizonOcclusionY - FOREST_HORIZON_REVEAL_DISTANCE * 0.35
            : horizonOcclusionY + 2;

        if (screen.y <= revealThreshold) return null;
    }

    return {
        distanceAhead,
        object,
        screen,
        spanEndScreen,
    };
}

function getObjectNearClipDistance(object: RoadObject) {
    switch (object.kind) {
        case 'left-cliff-guardrail-span':
        case 'right-guardrail-span':
            return GUARDRAIL_SPAN_NEAR_CLIP_DISTANCE;
        case 'right-retaining-wall-span':
            return CONTINUOUS_SPAN_NEAR_CLIP_DISTANCE;
        default:
            return OBJECT_NEAR_CLIP_DISTANCE;
    }
}

function getCrestVisibilityPoint(
    envelope: CrestVisibilityEnvelope,
    distanceAhead: number,
) {
    if (envelope.length === 0) return undefined;

    return envelope.find((point) => point.distanceAhead >= distanceAhead)
        ?? envelope.at(-1);
}

function getVisibleSpanEndZ(
    object: RoadObject,
    startZ: number,
    cameraZ: number,
    envelope: CrestVisibilityEnvelope,
) {
    if (!object.spanEndZ) return null;

    const endDistanceAhead = object.spanEndZ - cameraZ;
    const endPoint = getCrestVisibilityPoint(envelope, endDistanceAhead);

    if (!endPoint || endPoint.roadVisible) return object.spanEndZ;

    const lastVisiblePoint = envelope.findLast(
        (point) => point.distanceAhead <= endDistanceAhead && point.roadVisible,
    );

    if (!lastVisiblePoint) return null;

    const clippedEndZ = cameraZ + lastVisiblePoint.distanceAhead;

    return clippedEndZ > startZ ? clippedEndZ : null;
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
    const fog = getWorldDistanceFog(projected.distanceAhead);

    switch (projected.object.kind) {
        case 'blue-reflector':
            drawBlueReflector(graphics, projected.screen, fog);
            return;
        case 'chevron-left':
            drawChevron(graphics, projected.screen, -1, fog);
            return;
        case 'chevron-right':
            drawChevron(graphics, projected.screen, 1, fog);
            return;
        case 'left-cliff-guardrail-span':
            drawGuardrailSpan(graphics, projected, 'left', fog);
            return;
        case 'right-guardrail-span':
            drawGuardrailSpan(graphics, projected, 'right', fog);
            return;
        case 'left-cliff-guardrail-post':
            drawGuardrailPost(graphics, projected.screen, 'left', fog);
            return;
        case 'right-guardrail-post':
            drawGuardrailPost(graphics, projected.screen, 'right', fog);
            return;
        case 'right-retaining-wall-span':
            drawRetainingWallSpan(graphics, projected, fog);
            return;
        case 'right-wall-tree':
        case 'left-cliff-forest':
            return;
        case 'sign-speed':
            drawSpeedSign(graphics, projected.screen, fog);
            return;
        default:
            return;
    }
}

function createWallForestSpriteState(
    projected: ProjectedRoadObject,
    horizonOcclusionY: number | null,
): WallForestSpriteState {
    const variant = projected.object.forestVariant ?? 0;
    const layer = projected.object.forestLayer ?? 'front';
    const side = projected.object.forestSide ?? 'right-wall';
    const width = scaleValue(projected.screen, 840, 40, 300) *
        WALL_FOREST_SIZE_SCALE * (projected.object.forestScale ?? 1);
    const leftCliffDrop = scaleValue(projected.screen, 440, 46, 228);
    const wallHeight = getRetainingWallHeight(projected.screen, 26);
    const capRise = getRetainingWallCapRise(projected.screen, 2);
    const topInset = getRetainingWallTopInset(projected.screen, 7);
    const capDepth = scaleValue(projected.screen, 86, 5, 38);

    return {
        // Alpha remains a reveal control at the crest. Distance darkness comes
        // from tinting the tree into the fog colour, so the forest does not
        // become transparent and expose the city/background behind it.
        alpha: getWallForestAlpha(projected.screen.y, horizonOcclusionY),
        height: width * getWallForestAspectRatio(variant),
        id: projected.object.id,
        layer,
        side,
        tint: mixWithWorldFog(0xffffff, getWorldDistanceFog(projected.distanceAhead)),
        variant,
        width,
        x: side === 'left-cliff'
            ? projected.screen.x - topInset + capDepth * 0.2
            : projected.screen.x + topInset - capDepth * 0.38,
        y: side === 'left-cliff'
            ? projected.screen.y + leftCliffDrop
            : projected.screen.y - wallHeight - capRise,
    };
}

function getWallForestAlpha(
    screenY: number,
    horizonOcclusionY: number | null,
) {
    const horizonRevealRatio = horizonOcclusionY === null
        ? 1
        : Phaser.Math.Clamp(
            (screenY - (horizonOcclusionY - FOREST_HORIZON_REVEAL_DISTANCE * 0.35)) /
                FOREST_HORIZON_REVEAL_DISTANCE,
            0,
            1,
        );
    const smoothHorizonReveal = horizonRevealRatio * horizonRevealRatio *
        (3 - horizonRevealRatio * 2);

    return 0.96 * smoothHorizonReveal;
}

function getWallForestSeed(segmentIndex: number, layer: WallForestLayer, slotIndex: number) {
    const base = segmentIndex * 47 + slotIndex * 31 + (layer === 'back' ? 19 : 7);
    const normalized = (value: number) => ((value % 101) + 101) % 101 / 100;

    return {
        lateralOffset: Phaser.Math.Linear(-150, 170, normalized(base * 13)),
        variant: (base % 5) as WallForestVariant,
    };
}

function getWallForestAspectRatio(variant: WallForestVariant) {
    switch (variant) {
        case 0:
            return 520 / 240;
        case 1:
            return 480 / 300;
        case 2:
            return 560 / 220;
        case 3:
            return 500 / 280;
        case 4:
            return 460 / 310;
    }
}

function drawChevron(
    graphics: Phaser.GameObjects.Graphics,
    screen: ScreenPoint,
    direction: -1 | 1,
    fog: number,
) {
    const width = scaleValue(screen, 260, 10, 96);
    const height = scaleValue(screen, 190, 8, 72);
    const x = screen.x;
    const y = screen.y - height * 0.6;

    graphics.fillStyle(mixWithWorldFog(0x050812, fog), 0.76);
    graphics.fillRoundedRect(x - width * 0.6, y - height * 0.55, width * 1.2, height * 1.1, Math.max(2, width * 0.08));
    graphics.lineStyle(Math.max(2, width * 0.14), mixWithWorldFog(0x67b7ff, fog), 0.95);
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
    fog: number,
) {
    const far = projected.spanEndScreen;

    if (!far) return;

    const near = projected.screen;
    const railHeight = side === 'left' ? 74 : 102;
    const nearTopY = near.y - scaleValue(near, railHeight, 5, side === 'left' ? 38 : 50);
    const farTopY = far.y - scaleValue(far, railHeight, 2, side === 'left' ? 38 : 50);
    const nearThickness = Math.max(2, scaleValue(near, side === 'left' ? 25 : 34, 2, 13));
    const farThickness = Math.max(1, scaleValue(far, side === 'left' ? 25 : 34, 1, 13));

    graphics.fillStyle(mixWithWorldFog(0x07101f, fog), 0.96);
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
    graphics.lineStyle(
        Math.max(1, nearThickness * 0.42),
        mixWithWorldFog(0x4f86ad, fog),
        side === 'left' ? 0.7 : 0.9,
    );
    graphics.lineBetween(near.x, nearTopY + nearThickness * 0.36, far.x, farTopY + farThickness * 0.36);

    if (side === 'right') {
        const lowerNearY = nearTopY + scaleValue(near, 42, 4, 22);
        const lowerFarY = farTopY + scaleValue(far, 42, 2, 22);

        graphics.lineStyle(Math.max(1, nearThickness * 0.3), mixWithWorldFog(0x183955, fog), 0.9);
        graphics.lineBetween(near.x, lowerNearY, far.x, lowerFarY);
    }
}

function drawGuardrailPost(
    graphics: Phaser.GameObjects.Graphics,
    screen: ScreenPoint,
    side: 'left' | 'right',
    fog: number,
) {
    const height = scaleValue(screen, side === 'left' ? 118 : 146, 7, side === 'left' ? 54 : 68);
    const width = Math.max(2, scaleValue(screen, side === 'left' ? 26 : 34, 2, 13));
    const y = screen.y - height;

    graphics.fillStyle(mixWithWorldFog(0x102c47, fog), 0.98);
    graphics.fillRect(screen.x - width / 2, y, width, height);
    graphics.fillStyle(mixWithWorldFog(0x4f86ad, fog), side === 'left' ? 0.62 : 0.76);
    graphics.fillRect(screen.x - width * 0.18, y + height * 0.12, width * 0.36, height * 0.68);
}

function drawRetainingWallSpan(graphics: Phaser.GameObjects.Graphics, projected: ProjectedRoadObject, fog: number) {
    const far = projected.spanEndScreen;

    if (!far) return;

    const near = projected.screen;
    const nearHeight = getRetainingWallHeight(near, 26);
    const farHeight = getRetainingWallHeight(far, 8);
    const nearTopY = near.y - nearHeight;
    const farTopY = far.y - farHeight;
    const nearTopX = near.x + getRetainingWallTopInset(near, 7);
    const farTopX = far.x + getRetainingWallTopInset(far, 2);
    graphics.fillStyle(mixWithWorldFog(0x0b243a, fog), 0.98);
    fillQuad(graphics, near.x, near.y, far.x, far.y, farTopX, farTopY, nearTopX, nearTopY);
    graphics.lineStyle(Math.max(1, nearHeight * 0.024), mixWithWorldFog(0x2e5e80, fog), 0.86);
    drawRetainingWallJoint(graphics, near, far, nearHeight, farHeight, 0.3);
    drawRetainingWallJoint(graphics, near, far, nearHeight, farHeight, 0.64);

    const nearCapDepth = scaleValue(near, 86, 5, 38);
    const farCapDepth = scaleValue(far, 86, 2, 38);
    const nearCapRise = getRetainingWallCapRise(near, 2);
    const farCapRise = getRetainingWallCapRise(far, 1);
    graphics.fillStyle(mixWithWorldFog(0x163d59, fog), 0.99);
    fillQuad(
        graphics,
        nearTopX,
        nearTopY,
        farTopX,
        farTopY,
        farTopX - farCapDepth,
        farTopY - farCapRise,
        nearTopX - nearCapDepth,
        nearTopY - nearCapRise,
    );
    graphics.lineStyle(Math.max(1, nearCapRise * 0.42), mixWithWorldFog(0x6097bd, fog), 0.8);
    graphics.lineBetween(
        nearTopX - nearCapDepth,
        nearTopY - nearCapRise,
        farTopX - farCapDepth,
        farTopY - farCapRise,
    );
}

function drawRetainingWallJoint(
    graphics: Phaser.GameObjects.Graphics,
    near: ScreenPoint,
    far: ScreenPoint,
    nearHeight: number,
    farHeight: number,
    ratio: number,
) {
    graphics.lineBetween(
        near.x + getRetainingWallTopInset(near, 7) * ratio,
        near.y - nearHeight * ratio,
        far.x + getRetainingWallTopInset(far, 2) * ratio,
        far.y - farHeight * ratio,
    );
}

function getRetainingWallHeight(screen: ScreenPoint, minimum: number) {
    return scaleValue(screen, 620, minimum, 310);
}

function getRetainingWallCapRise(screen: ScreenPoint, minimum: number) {
    return scaleValue(screen, 28, minimum, 14);
}

function getRetainingWallTopInset(screen: ScreenPoint, minimum: number) {
    return scaleValue(screen, 180, minimum, 78);
}

function drawBlueReflector(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint, fog: number) {
    const size = scaleValue(screen, 66, 3, 30);
    const poleHeight = size * 2.3;

    graphics.fillStyle(mixWithWorldFog(0x0a1b2c, fog), 0.98);
    graphics.fillRect(screen.x - size * 0.12, screen.y - poleHeight, size * 0.24, poleHeight);
    graphics.fillStyle(mixWithWorldFog(0x8bd5ff, fog), 0.96);
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

function drawSpeedSign(graphics: Phaser.GameObjects.Graphics, screen: ScreenPoint, fog: number) {
    const radius = scaleValue(screen, 140, 5, 46);
    const poleWidth = Math.max(2, radius * 0.14);
    const poleHeight = radius * 2.4;
    const y = screen.y - poleHeight - radius * 1.1;

    graphics.fillStyle(mixWithWorldFog(0x050812, fog), 0.8);
    graphics.fillRect(screen.x - poleWidth / 2, y + radius * 0.75, poleWidth, poleHeight);
    graphics.fillStyle(mixWithWorldFog(0xc6e5ff, fog), 0.86);
    graphics.fillCircle(screen.x, y, radius);
    graphics.lineStyle(Math.max(2, radius * 0.18), mixWithWorldFog(0x245f9d, fog), 1);
    graphics.strokeCircle(screen.x, y, radius * 0.86);
    graphics.fillStyle(mixWithWorldFog(0x050812, fog), 0.9);
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
