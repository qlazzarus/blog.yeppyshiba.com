import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getDisplaySpeedKmh,
    RAVEN_COUPE_ENGINE_PROFILE,
} from '../src/game/engineProfile.ts';
import {
    createBugakRidgeDownhillTrack,
    DEFAULT_ROAD_HALF_WIDTH,
    SEGMENT_LENGTH,
} from '../src/game/road.ts';
import {
    DEFAULT_CAMERA_EFFECTS_CONFIG,
    getSpeedFovBonus,
} from '../src/game/cameraEffects.js';
import { getFocalLength } from '../src/game/pseudo3dCamera.ts';
import { SPEED_PRESENTATION_WORLD_CONFIG } from '../src/game/speedPresentationConfig.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'assets/telemetry/generated/outrun-unit-scale');
const referenceDataPath = path.join(__dirname, 'reference-data/outrun-speed-sense-ors1.json');
const mainSourcePath = path.join(projectRoot, 'src/main.ts');
const roadObjectSourcePath = path.join(projectRoot, 'src/game/roadObjectRenderer.ts');
const VIEWPORT = Object.freeze({ height: 760, width: 1200 });
const SAMPLE_SPEEDS_KMH = Object.freeze([110, 150, 185, 225]);
const ORS2A_SCALES = Object.freeze([1, 1.5, 2, 3]);
const BLUE_REFLECTOR_WORLD_HEIGHT = 66 * 2.3;

const [referenceData, mainSource, roadObjectSource] = await Promise.all([
    loadJson(referenceDataPath),
    readFile(mainSourcePath, 'utf8'),
    readFile(roadObjectSourcePath, 'utf8'),
]);
const playerAccelSpeed = readNumericConstant(mainSource, 'PLAYER_ACCEL_SPEED');
const objectDrawDistance = readNumericConstant(roadObjectSource, 'OBJECT_DRAW_DISTANCE');
const track = createBugakRidgeDownhillTrack();
const roadObjects = collectRoadObjectBaseline(track);
const minRoadHalfWidth = Math.min(...track.segments.map((segment) => segment.roadHalfWidth));
const apexRows = SAMPLE_SPEEDS_KMH.map((speedKmh) => measureApexSpeed(speedKmh));
const javascriptRacer = measureJavascriptRacer();
const cannonBall = measureCannonBall();
const distinctiveEvents = measureDistinctiveEvents();
const commercialReferences = referenceData.commercialFootage.map((entry) => ({
    ...entry,
    measurements: Object.fromEntries(
        Object.entries(entry.measurements).map(([key, measurement]) => [
            key,
            {
                ...measurement,
                representativeFrames: round(measurement.representative * entry.source.fps, 2),
            },
        ]),
    ),
}));
const scaleCandidates = ORS2A_SCALES.map((scale) => ({
    scale,
    speeds: Object.fromEntries(apexRows.filter((row) => row.speedKmh >= 150).map((row) => [
        row.speedKmh,
        {
            nearPass60To85Sec: round(row.projection.nearPass60To85Sec / scale),
            nearPass60To95Sec: round(row.projection.nearPass60To95Sec / scale),
            roadWidthsPerSec: round(row.normalizedFlow.defaultRoadWidthsPerSec * scale),
            segmentsPerSec: round(row.normalizedFlow.segmentsPerSec * scale),
            worldSpeed: round(row.worldSpeed * scale),
        },
    ])),
}));
const displaySpeedIdentityError = Math.max(...apexRows.map((row) => Math.abs(
    getDisplaySpeedKmh(
        rawSpeedForKmh(row.speedKmh),
        playerAccelSpeed,
        RAVEN_COUPE_ENGINE_PROFILE,
    ) - row.speedKmh
)));
const checks = [
    checkEqual('segmentLength', SEGMENT_LENGTH, 240),
    checkEqual('defaultFullRoadWidth', DEFAULT_ROAD_HALF_WIDTH * 2, 1920),
    checkEqual('objectDrawDistance', objectDrawDistance, 9800),
    checkEqual('playerAccelSpeed', playerAccelSpeed, 760),
    checkAtMost('displaySpeedIdentityErrorKmh', displaySpeedIdentityError, 0.000001),
    checkAtLeast(
        'commercial60FpsReferenceCount',
        commercialReferences.filter((entry) => entry.source.fps >= 60).length,
        2,
    ),
    checkAtLeast('ors2aDiagnosticScaleCeiling', Math.max(...ORS2A_SCALES), 3),
];
const current225 = apexRows.find((row) => row.speedKmh === 225);
const current185 = apexRows.find((row) => row.speedKmh === 185);
const commercialNearPass85 = commercialReferences.map(
    (entry) => entry.measurements.roadMarkNearPass60To85Sec.representative,
);
const diagnosis = {
    cameraProjection: {
        classification: 'secondary',
        evidence: [
            `Steady FOV changes from ${apexRows[0].projection.fovDegrees} to ${current225.projection.fovDegrees} degrees across the audit speeds.`,
            `Even with the speed FOV applied, the 225km/h 60->85% pass remains ${current225.projection.nearPass60To85Sec}s.`,
        ],
    },
    contentGap: {
        classification: 'secondary',
        evidence: [
            `${distinctiveEvents.eventCount} distinctive sign/chevron placements exist across ${track.length}u, while no gate, traffic or sector-transition event kind exists.`,
            `The longest sign/chevron-free interval is ${distinctiveEvents.maxGapUnits}u (${distinctiveEvents.maxGapSecAt185Kmh}s at 185km/h).`,
            'Forest clusters are geometrically large but repeat every segment, so raw sprite count is not treated as event variety.',
        ],
    },
    longitudinalUnitScale: {
        classification: 'primary',
        evidence: [
            `Apex reaches ${current225.normalizedFlow.segmentsPerSec} segment/s and ${current225.normalizedFlow.defaultRoadWidthsPerSec} road-width/s at 225km/h.`,
            `Javascript Racer reaches ${javascriptRacer.normalizedFlow.segmentsPerSec} segment/s and ${javascriptRacer.normalizedFlow.roadWidthsPerSec} road-width/s at its configured maximum.`,
            `Apex 225km/h needs ${round(current225.projection.nearPass60To85Sec / javascriptRacer.projection.nearPass60To85Sec, 2)}x the Javascript Racer 60->85% ground-pass time.`,
            `Apex 225km/h needs ${round(current225.projection.nearPass60To85Sec / Math.max(...commercialNearPass85), 2)}x to ${round(current225.projection.nearPass60To85Sec / Math.min(...commercialNearPass85), 2)}x the manually annotated commercial-reference time.`,
        ],
    },
    markerDensity: {
        classification: 'not-primary',
        evidence: [
            `Corner lane and reflector cadence is already ${current185.microCadence.cornerLanePassesPerSec}/s at 185km/h.`,
            'Increasing the same marker count would raise frequency without shortening a single anchor\'s approach time.',
        ],
    },
};
const report = {
    apex: {
        config: {
            blueReflectorWorldHeight: BLUE_REFLECTOR_WORLD_HEIGHT,
            commitmentFullRoadWidth: minRoadHalfWidth * 2,
            defaultFullRoadWidth: DEFAULT_ROAD_HALF_WIDTH * 2,
            objectDrawDistance,
            playerAccelSpeed,
            segmentLength: SEGMENT_LENGTH,
            topSpeedKmh: RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh,
            viewport: VIEWPORT,
        },
        distinctiveEvents,
        speeds: apexRows,
        track: {
            id: track.id,
            length: track.length,
            segments: track.segments.length,
        },
    },
    checks,
    commercialReferences,
    diagnosis,
    generatedAt: new Date().toISOString(),
    methodology: {
        comparisonRule: 'Raw units are never compared across engines without segment, road width and projection normalization.',
        commercialMeasurement: referenceData.measurementMethod,
        screenGateNote: '60->95% remains for compatibility with the plan. 60->85% is the primary A/B gate because third-person cars and lateral roadside exits often occlude 95%.',
    },
    openSourceReferences: {
        cannonBall,
        javascriptRacer,
    },
    ors2aRecommendation: {
        candidates: scaleCandidates,
        matrix: ORS2A_SCALES,
        rationale: [
            'The former 1.00/1.25/1.50/1.75 matrix is too narrow to falsify the longitudinal-scale hypothesis.',
            'Use 1.00/1.50/2.00/3.00 as the diagnostic sweep; 3.00 is an upper probe, not a production target.',
            'Keep displayed km/h, drivetrain, FOV, marker density and audio fixed.',
            'If scale 2.00+ reads correctly but shortens grip-corner control below the existing gate, pair the chosen flow scale with longitudinal course resampling instead of hiding the issue with camera shake.',
        ],
    },
    pass: checks.every((entry) => entry.pass),
    schemaVersion: 1,
    screenReferenceOnly: referenceData.screenReferenceOnly,
};

await mkdir(outputDir, { recursive: true });
await writeFile(
    path.join(outputDir, 'outrun-unit-scale-ors1.json'),
    `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
    path.join(outputDir, 'outrun-unit-scale-ors1.md'),
    buildMarkdown(report),
);

console.log(`ORS-1 unit/reference audit: ${report.pass ? 'PASS' : 'FAIL'}`);
console.log(`Apex 225km/h: ${current225.normalizedFlow.segmentsPerSec} segment/s, ${current225.projection.nearPass60To85Sec}s screenY 60->85%`);
console.log(`Javascript Racer max: ${javascriptRacer.normalizedFlow.segmentsPerSec} segment/s, ${javascriptRacer.projection.nearPass60To85Sec}s screenY 60->85%`);
console.log(`ORS-2A diagnostic matrix: ${ORS2A_SCALES.map((scale) => scale.toFixed(2)).join(' / ')}`);
if (!report.pass) process.exitCode = 1;

function measureApexSpeed(speedKmh) {
    const worldSpeed = speedKmh /
        RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh * playerAccelSpeed;
    const fovDegrees = DEFAULT_CAMERA_EFFECTS_CONFIG.baseFov +
        getSpeedFovBonus(speedKmh, DEFAULT_CAMERA_EFFECTS_CONFIG);
    const camera = {
        fovDegrees,
        height: 980,
        horizonRatio: 0.38,
        lateralOffset: 0,
        pitch: 0,
        z: 0,
    };
    const focalLength = getFocalLength(camera, VIEWPORT);
    const distance60 = getFlatGroundDistance(camera, focalLength, 0.6);
    const distance85 = getFlatGroundDistance(camera, focalLength, 0.85);
    const distance95 = getFlatGroundDistance(camera, focalLength, 0.95);

    return {
        microCadence: {
            cornerLanePassesPerSec: round(
                worldSpeed * SPEED_PRESENTATION_WORLD_CONFIG.cornerLaneDashSubdivisions /
                    SEGMENT_LENGTH,
            ),
            cornerReflectorPassesPerSec: round(
                worldSpeed * SPEED_PRESENTATION_WORLD_CONFIG.cornerReflectorSubdivisions /
                    SEGMENT_LENGTH,
            ),
            straightLanePassesPerSec: round(worldSpeed / SEGMENT_LENGTH),
        },
        nominalVisibleDepthSec: round(objectDrawDistance / worldSpeed),
        normalizedFlow: {
            commitmentRoadWidthsPerSec: round(worldSpeed / (minRoadHalfWidth * 2)),
            defaultRoadWidthsPerSec: round(worldSpeed / (DEFAULT_ROAD_HALF_WIDTH * 2)),
            segmentsPerSec: round(worldSpeed / SEGMENT_LENGTH),
        },
        projection: {
            flatGroundDistanceAt60Percent: round(distance60),
            flatGroundDistanceAt85Percent: round(distance85),
            flatGroundDistanceAt95Percent: round(distance95),
            focalLength: round(focalLength),
            fovDegrees: round(fovDegrees),
            nearPass60To85Sec: round((distance60 - distance85) / worldSpeed),
            nearPass60To95Sec: round((distance60 - distance95) / worldSpeed),
            reflectorScale16To32Sec: round(getScaleGateTime(
                focalLength,
                BLUE_REFLECTOR_WORLD_HEIGHT,
                16,
                32,
                worldSpeed,
            )),
            reflectorScale32To64Sec: round(getScaleGateTime(
                focalLength,
                BLUE_REFLECTOR_WORLD_HEIGHT,
                32,
                64,
                worldSpeed,
            )),
        },
        speedKmh,
        worldSpeed: round(worldSpeed),
    };
}

function measureJavascriptRacer() {
    const config = {
        cameraHeight: 1000,
        drawDistanceSegments: 300,
        fieldOfViewDegrees: 100,
        fps: 60,
        fullRoadWidth: 4000,
        logicalViewport: { height: 768, width: 1024 },
        segmentLength: 200,
    };
    const maxSpeed = config.segmentLength * config.fps;
    const focalLength = config.logicalViewport.height / 2 /
        Math.tan(config.fieldOfViewDegrees * Math.PI / 360);
    const camera = {
        height: config.cameraHeight,
        horizonRatio: 0.5,
    };
    const distance60 = getFlatGroundDistance(camera, focalLength, 0.6, config.logicalViewport);
    const distance85 = getFlatGroundDistance(camera, focalLength, 0.85, config.logicalViewport);
    const distance95 = getFlatGroundDistance(camera, focalLength, 0.95, config.logicalViewport);

    return {
        config,
        maxSpeed,
        normalizedFlow: {
            roadWidthsPerSec: round(maxSpeed / config.fullRoadWidth),
            segmentsPerSec: round(maxSpeed / config.segmentLength),
            visibleDepthSec: round(
                config.drawDistanceSegments * config.segmentLength / maxSpeed,
            ),
        },
        projection: {
            nearPass60To85Sec: round((distance60 - distance85) / maxSpeed),
            nearPass60To95Sec: round((distance60 - distance95) / maxSpeed),
        },
        source: {
            note: 'Configured maximum is one segment per 60 Hz frame so collision checks do not skip a segment; it is a reference, not an Apex target.',
            url: 'https://github.com/jakesgordon/javascript-racer/blob/master/v4.final.html',
        },
    };
}

function measureCannonBall() {
    const maxSpeedFixed = 0x1260000;
    const carBaseIncrement = 0x12f;
    const displayedSpeedAtMax = maxSpeedFixed >> 16;
    const straightRoadPositionFixedPerTick = carBaseIncrement * displayedSpeedAtMax;

    return {
        carBaseIncrement,
        displayedSpeedAtMax,
        maxSpeedFixed,
        source: {
            note: 'CannonBall multiplies the HUD-facing car_increment high word by CAR_BASE_INC before adding to fixed-point road_pos. Road width and segment normalization are intentionally omitted because the coordinate spaces are ROM-driven and not interchangeable with Apex units.',
            url: 'https://github.com/djyt/cannonball/blob/master/src/main/engine/oferrari.cpp#L1527-L1549',
        },
        straightRoadPosition: {
            fixedPerTick: straightRoadPositionFixedPerTick,
            integerPer30HzSecond: round(straightRoadPositionFixedPerTick / 65536 * 30),
            integerPerTick: round(straightRoadPositionFixedPerTick / 65536),
        },
    };
}

function measureDistinctiveEvents() {
    const distinctive = roadObjects.filter((object) => (
        object.kind === 'sign-speed' || object.kind.startsWith('chevron-')
    ));
    const positions = [...new Set(distinctive.map((object) => round(object.z, 6)))].sort((a, b) => a - b);
    const bounded = [0, ...positions, track.length];
    const gaps = bounded.slice(1).map((position, index) => position - bounded[index]);
    const maxGapUnits = Math.max(...gaps);

    return {
        byKind: countBy(roadObjects, (object) => object.kind),
        eventCount: distinctive.length,
        maxGapSecAt150Kmh: round(maxGapUnits / rawSpeedForKmh(150)),
        maxGapSecAt185Kmh: round(maxGapUnits / rawSpeedForKmh(185)),
        maxGapSecAt225Kmh: round(maxGapUnits / rawSpeedForKmh(225)),
        maxGapUnits: round(maxGapUnits),
        repeatingForestSprites: roadObjects.filter((object) => (
            object.kind === 'right-wall-tree' || object.kind === 'left-cliff-forest'
        )).length,
    };
}

function collectRoadObjectBaseline(roadTrack) {
    const objects = [];

    for (let segmentIndex = 3; segmentIndex < roadTrack.segments.length; segmentIndex += 1) {
        const segment = roadTrack.segments[segmentIndex];
        const z = segmentIndex * roadTrack.segmentLength;
        const profile = getRoadsideProfile(segment.curve, z / roadTrack.length);

        objects.push(
            { kind: 'left-cliff-guardrail-span', z },
            { kind: 'right-guardrail-span', z },
            { kind: 'right-retaining-wall-span', z },
        );
        for (let index = 0; index < 4; index += 1) {
            objects.push({ kind: 'left-cliff-forest', z });
            objects.push({ kind: 'right-wall-tree', z });
        }
        if (segmentIndex % SPEED_PRESENTATION_WORLD_CONFIG.leftGuardrailPostSegmentInterval === 0) {
            objects.push({ kind: 'left-cliff-guardrail-post', z });
        }
        if (segmentIndex % SPEED_PRESENTATION_WORLD_CONFIG.rightGuardrailPostSegmentInterval === 0) {
            objects.push({ kind: 'right-guardrail-post', z });
        }
        if (profile === 'commitment' && segmentIndex % 8 === 0) {
            objects.push({
                kind: segment.curve >= 0 ? 'chevron-right' : 'chevron-left',
                z: z + roadTrack.segmentLength * 1.1,
            });
        }
        if (profile === 'commitment' || profile === 'wall-run') {
            for (
                let subdivision = 0;
                subdivision < SPEED_PRESENTATION_WORLD_CONFIG.cornerReflectorSubdivisions;
                subdivision += 1
            ) {
                objects.push({ kind: 'blue-reflector', z });
            }
        }
    }

    objects.push({ kind: 'sign-speed', z: roadTrack.segmentLength * 7 });

    return objects;
}

function getRoadsideProfile(curve, progress) {
    const intensity = Math.abs(curve);

    if (intensity >= 0.55) return 'commitment';
    if ((progress >= 0.1 && progress <= 0.29) || (progress >= 0.57 && progress <= 0.76)) {
        return 'open-view';
    }
    if (intensity <= 0.16) return 'recovery';

    return 'wall-run';
}

function getFlatGroundDistance(camera, focalLength, screenYRatio, viewport = VIEWPORT) {
    const horizonY = viewport.height * camera.horizonRatio;
    const targetY = viewport.height * screenYRatio;

    return camera.height * focalLength / (targetY - horizonY);
}

function getScaleGateTime(focalLength, worldHeight, fromPx, toPx, speed) {
    const fromDistance = focalLength * worldHeight / fromPx;
    const toDistance = focalLength * worldHeight / toPx;

    return (fromDistance - toDistance) / speed;
}

function rawSpeedForKmh(speedKmh) {
    return speedKmh / RAVEN_COUPE_ENGINE_PROFILE.displayTopSpeedKmh * playerAccelSpeed;
}

function readNumericConstant(source, name) {
    const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9_]+(?:\\.[0-9]+)?)`));

    if (!match) throw new Error(`Unable to read numeric constant ${name}`);

    return Number(match[1].replaceAll('_', ''));
}

function countBy(values, getKey) {
    const counts = new Map();

    for (const value of values) {
        const key = getKey(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function checkAtLeast(id, value, target) {
    return { id, pass: value >= target, target: `>= ${target}`, value: round(value) };
}

function checkAtMost(id, value, target) {
    return { id, pass: value <= target, target: `<= ${target}`, value: round(value) };
}

function checkEqual(id, value, target) {
    return { id, pass: value === target, target: `= ${target}`, value: round(value) };
}

function buildMarkdown(value) {
    const lines = [
        '# Apex Seoul ORS-1 Unit / Screen-flow Audit',
        '',
        `Generated: ${value.generatedAt}`,
        '',
        `Status: **${value.pass ? 'PASS' : 'FAIL'}**`,
        '',
        '## Outcome',
        '',
        '- Primary: longitudinal unit scale.',
        '- Secondary: homogeneous content gaps and, to a smaller degree, projection.',
        '- Not primary: micro-marker density; it is already in the intended 4-6/s corner band.',
        '- ORS-2A diagnostic matrix: `1.00 / 1.50 / 2.00 / 3.00`.',
        '',
        '## Apex current build',
        '',
        '| HUD km/h | world u/s | segment/s | road-width/s | visible depth | 60->85% | 60->95% | reflector 16->32px | reflector 32->64px |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.apex.speeds.map((row) => (
            `| ${row.speedKmh} | ${row.worldSpeed} | ${row.normalizedFlow.segmentsPerSec} | ` +
            `${row.normalizedFlow.defaultRoadWidthsPerSec} | ${row.nominalVisibleDepthSec}s | ` +
            `${row.projection.nearPass60To85Sec}s | ${row.projection.nearPass60To95Sec}s | ` +
            `${row.projection.reflectorScale16To32Sec}s | ${row.projection.reflectorScale32To64Sec}s |`
        )),
        '',
        'The screen times use the actual steady speed FOV at 1200x760 on flat ground. The 9,800u visible-depth value is nominal; fog and crest occlusion shorten actual visibility.',
        '',
        '## Open-source engine normalization',
        '',
        '| engine | speed basis | segment/s | road-width/s | visible depth | 60->85% | 60->95% |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
        `| Apex Seoul | 225km/h / ${value.apex.config.playerAccelSpeed}u/s | ${current225.normalizedFlow.segmentsPerSec} | ${current225.normalizedFlow.defaultRoadWidthsPerSec} | ${current225.nominalVisibleDepthSec}s | ${current225.projection.nearPass60To85Sec}s | ${current225.projection.nearPass60To95Sec}s |`,
        `| Javascript Racer | configured max / ${value.openSourceReferences.javascriptRacer.maxSpeed}u/s | ${value.openSourceReferences.javascriptRacer.normalizedFlow.segmentsPerSec} | ${value.openSourceReferences.javascriptRacer.normalizedFlow.roadWidthsPerSec} | ${value.openSourceReferences.javascriptRacer.normalizedFlow.visibleDepthSec}s | ${value.openSourceReferences.javascriptRacer.projection.nearPass60To85Sec}s | ${value.openSourceReferences.javascriptRacer.projection.nearPass60To95Sec}s |`,
        `| CannonBall | HUD high word ${value.openSourceReferences.cannonBall.displayedSpeedAtMax}, then × ${value.openSourceReferences.cannonBall.carBaseIncrement} | n/a | n/a | n/a | n/a | n/a |`,
        '',
        'Javascript Racer deliberately caps movement at one segment per frame for collision safety. Its 60 segment/s is evidence of a very different scale, not a production target. CannonBall confirms the architectural point: display speed and road-position progression have an explicit conversion layer.',
        '',
        '## Official 60 fps footage annotations',
        '',
        '| game | sample | HUD speed | 60->85% | 60->95% | 16->32px | 32->64px | sample note |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
        ...value.commercialReferences.map((entry) => (
            `| ${entry.title} | ${entry.sample.startSec}s ${entry.sample.scene} | ` +
            `${entry.sample.hudSpeedKmh ?? 'n/a'} | ` +
            `${formatRange(entry.measurements.roadMarkNearPass60To85Sec.range)} | ` +
            `${formatRange(entry.measurements.roadMarkNearPass60To95Sec.range)} | ` +
            `${formatRange(entry.measurements.roadsideScale16To32Sec.range)} | ` +
            `${formatRange(entry.measurements.roadsideScale32To64Sec.range)} | ` +
            `${entry.sample.qualifiers.at(-1)} |`
        )),
        '',
        'These are manual frame ranges, not reverse-engineered commercial units. Trailer video files are not stored in the repository.',
        '',
        '## Cause separation',
        '',
        '| factor | classification | evidence |',
        '| --- | --- | --- |',
        ...Object.entries(value.diagnosis).map(([factor, result]) => (
            `| ${factor} | ${result.classification} | ${result.evidence.join(' ')} |`
        )),
        '',
        '## ORS-2A diagnostic sweep',
        '',
        '| scale | 150 segment/s | 150 60->85% | 185 segment/s | 185 60->85% | 225 segment/s | 225 60->85% |',
        '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
        ...value.ors2aRecommendation.candidates.map((candidate) => (
            `| ${candidate.scale.toFixed(2)} | ${candidate.speeds[150].segmentsPerSec} | ${candidate.speeds[150].nearPass60To85Sec}s | ` +
            `${candidate.speeds[185].segmentsPerSec} | ${candidate.speeds[185].nearPass60To85Sec}s | ` +
            `${candidate.speeds[225].segmentsPerSec} | ${candidate.speeds[225].nearPass60To85Sec}s |`
        )),
        '',
        ...value.ors2aRecommendation.rationale.map((line) => `- ${line}`),
        '',
        '## Content-gap baseline',
        '',
        `- Distinctive sign/chevron objects: ${value.apex.distinctiveEvents.eventCount}`,
        `- Repeating forest sprites: ${value.apex.distinctiveEvents.repeatingForestSprites}`,
        `- Longest distinctive-event gap: ${value.apex.distinctiveEvents.maxGapUnits}u / ${value.apex.distinctiveEvents.maxGapSecAt185Kmh}s at 185km/h`,
        '- Macro traffic/gate/sector transition kinds: 0',
        '',
        '## Checks',
        '',
        '| check | pass | target | value |',
        '| --- | --- | --- | ---: |',
        ...value.checks.map((entry) => (
            `| ${entry.id} | ${entry.pass ? 'yes' : 'no'} | ${entry.target} | ${entry.value} |`
        )),
        '',
        '## Sources',
        '',
        `- [Javascript Racer source](${value.openSourceReferences.javascriptRacer.source.url})`,
        `- [CannonBall road-position conversion](${value.openSourceReferences.cannonBall.source.url})`,
        ...value.commercialReferences.map((entry) => `- [${entry.source.label}](${entry.source.url})`),
        ...value.screenReferenceOnly.map((entry) => `- [${entry.source.label}](${entry.source.url}) — qualitative only`),
        '',
    ];

    return `${lines.join('\n')}\n`;
}

function formatRange(range) {
    return `${range[0]}-${range[1]}s`;
}

async function loadJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

function round(value, digits = 4) {
    return Number(value.toFixed(digits));
}
