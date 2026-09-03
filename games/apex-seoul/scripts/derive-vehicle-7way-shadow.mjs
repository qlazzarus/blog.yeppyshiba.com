import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const DEFAULT_VEHICLE_IDS = ['raven-coupe', 'seorin-gt', 'mirae-gt'];
const CELL_SIZE = 128;
const SHADOW_ALPHA = 210;
const RUNTIME_PREVIEW = {
    silhouetteAlpha: 100,
    silhouetteScaleX: 1.06,
    silhouetteScaleY: 0.42,
    softAlpha: 42,
    softScaleX: 1.23,
    softScaleY: 0.53,
};

const config = { vehicleIds: [] };
for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];
    if (arg === '--vehicle' && next) {
        config.vehicleIds.push(next);
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const vehicleIds = config.vehicleIds.length > 0 ? config.vehicleIds : DEFAULT_VEHICLE_IDS;
for (const vehicleId of vehicleIds) {
    if (!/^[a-z0-9-]+$/.test(vehicleId)) throw new Error(`Invalid public vehicle id: ${vehicleId}`);
    await deriveVehicleShadow(vehicleId);
}

async function deriveVehicleShadow(vehicleId) {
    const candidateDir = path.join(projectRoot, 'assets/vehicles/generated/7way-candidates', vehicleId);
    const detailDir = path.join(candidateDir, 'processed/neutral-128');
    const sourcePath = path.join(detailDir, 'sheet-128-details.png');
    const metadataPath = path.join(detailDir, 'sheet-128-details.json');
    const atlasPath = path.join(candidateDir, 'phaser-128.atlas.json');
    const outputDir = path.join(candidateDir, 'phaser-128');
    const outputPath = path.join(outputDir, 'shadow-128.png');
    const profilePath = path.join(outputDir, 'shadow-128.profile.json');
    const profileOverridePath = path.join(candidateDir, 'shadow-profile-overrides.json');
    const qaPath = path.join(outputDir, 'shadow-128.qa.json');
    const contactPreviewPath = path.join(outputDir, 'shadow-128-runtime-preview.png');
    const footprintPreviewPath = path.join(outputDir, 'shadow-128-runtime-footprint-debug.png');
    const [metadata, atlas, source] = await Promise.all([
        readJson(metadataPath),
        readJson(atlasPath),
        sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    validateMetadata(metadata, atlas, source.info, vehicleId);
    const output = Buffer.alloc(source.data.length, 0);
    for (let offset = 0; offset < source.data.length; offset += 4) {
        if (source.data[offset + 3] === 0) continue;
        output[offset + 3] = SHADOW_ALPHA;
    }

    const generatedProfiles = deriveShadowProfiles(metadata, atlas, source.data, source.info.width);
    const legacyProfiles = vehicleId === 'raven-coupe'
        ? (await readJson(path.join(projectRoot, 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json'))).apex.shadowProfiles
        : null;
    const profileOverrides = await readOptionalJson(profileOverridePath);
    const shadowProfiles = mergeShadowProfiles(generatedProfiles, legacyProfiles, profileOverrides?.shadowProfiles ?? profileOverrides);
    const footprintPreview = makeRuntimeFootprintPreview(output, source.info.width, source.info.height, metadata, atlas, shadowProfiles);
    const contactPreview = makeRuntimePreview(source.data, footprintPreview);
    const profileSource = legacyProfiles
        ? 'legacy-ft86-runtime-profile seed plus generated 7way-only frames'
        : profileOverrides ? 'generated profile plus candidate shadow-profile-overrides.json' : 'generated profile';
    const qa = buildQa({ vehicleId, metadata, source, output, sourcePath, outputPath, profilePath, contactPreviewPath, footprintPreviewPath, footprintPreview, shadowProfiles, profileSource });
    if (!qa.pass) throw new Error(`${vehicleId}: shadow QA failed`);
    await mkdir(outputDir, { recursive: true });
    await sharp(output, {
        raw: { width: source.info.width, height: source.info.height, channels: 4 },
    }).png().toFile(outputPath);
    await sharp(contactPreview, {
        raw: { width: source.info.width, height: source.info.height, channels: 4 },
    }).png().toFile(contactPreviewPath);
    await sharp(footprintPreview, {
        raw: { width: source.info.width, height: source.info.height, channels: 4 },
    }).png().toFile(footprintPreviewPath);
    await writeFile(profilePath, `${JSON.stringify({
        vehicleId,
        generatedBy: 'derive-vehicle-7way-shadow.mjs',
        policy: 'generated from 128px alpha bounds and frame anchor/baseline; optional per-vehicle overrides are merged before runtime promotion',
        profileSource,
        shadowProfiles,
    }, null, 2)}\n`);
    await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`);
    console.log(`7way shadow ${vehicleId}: ${relative(outputPath)}`);
}

function validateMetadata(metadata, atlas, info, vehicleId) {
    if (metadata.vehicleId !== vehicleId || metadata.cellSize !== CELL_SIZE || metadata.columns !== 3 || metadata.rows !== 6 || metadata.poses?.length !== 17) {
        throw new Error(`${vehicleId}: invalid 17-pose detail metadata`);
    }
    if (info.width !== metadata.columns * CELL_SIZE || info.height !== metadata.rows * CELL_SIZE) {
        throw new Error(`${vehicleId}: source dimensions do not match the 3x6 contract`);
    }
    if (atlas.apex?.vehicleId !== vehicleId || atlas.apex?.targetCellSize !== CELL_SIZE || !atlas.frames) {
        throw new Error(`${vehicleId}: invalid candidate atlas`);
    }
}

function buildQa({ vehicleId, metadata, source, output, sourcePath, outputPath, profilePath, contactPreviewPath, footprintPreviewPath, footprintPreview, shadowProfiles, profileSource }) {
    const occupiedCells = new Set(metadata.poses.map((pose) => `${pose.cell.column},${pose.cell.row}`));
    const poseOpaquePixels = {};
    let alphaMismatches = 0;
    let invalidShadowPixels = 0;
    let blankCellOpaquePixels = 0;
    for (let y = 0; y < source.info.height; y += 1) for (let x = 0; x < source.info.width; x += 1) {
        const offset = (y * source.info.width + x) * 4;
        const sourceOpaque = source.data[offset + 3] !== 0;
        const shadowAlpha = output[offset + 3];
        if (sourceOpaque !== (shadowAlpha !== 0)) alphaMismatches += 1;
        if (shadowAlpha !== 0 && shadowAlpha !== SHADOW_ALPHA) invalidShadowPixels += 1;
        const cellKey = `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
        if (!occupiedCells.has(cellKey) && shadowAlpha !== 0) blankCellOpaquePixels += 1;
    }
    for (const pose of metadata.poses) {
        let opaquePixels = 0;
        for (let y = pose.cell.row * CELL_SIZE; y < (pose.cell.row + 1) * CELL_SIZE; y += 1) {
            for (let x = pose.cell.column * CELL_SIZE; x < (pose.cell.column + 1) * CELL_SIZE; x += 1) {
                if (output[(y * source.info.width + x) * 4 + 3] !== 0) opaquePixels += 1;
            }
        }
        poseOpaquePixels[pose.id] = opaquePixels;
    }
    const missingShadowPoses = Object.entries(poseOpaquePixels)
        .filter(([, opaquePixels]) => opaquePixels === 0)
        .map(([id]) => id);
    return {
        vehicleId,
        source: relative(sourcePath),
        output: relative(outputPath),
        profile: relative(profilePath),
        profileSource,
        contactPreview: relative(contactPreviewPath),
        footprintPreview: relative(footprintPreviewPath),
        policy: 'external-black-silhouette; derived only from neutral detail alpha; body sheet remains shadow-free',
        contactPreviewPolicy: 'checker-backed preview mirrors Phaser silhouette squash, soft-shadow expansion, chassis center and contact patch; it is an asset-level approximation, not a browser render',
        dimensions: { width: source.info.width, height: source.info.height },
        cellSize: CELL_SIZE,
        shadowAlpha: SHADOW_ALPHA,
        checks: {
            alphaShape: { pass: alphaMismatches === 0, alphaMismatches },
            shadowPixels: { pass: invalidShadowPixels === 0, invalidShadowPixels },
            blankCell: { pass: blankCellOpaquePixels === 0, blankCellOpaquePixels },
            poses: { pass: missingShadowPoses.length === 0, poseOpaquePixels, missingShadowPoses },
            profiles: checkShadowProfiles(metadata, shadowProfiles),
            previewFootprints: checkFootprintPreview(metadata, footprintPreview, source.info.width),
        },
        pass: alphaMismatches === 0 && invalidShadowPixels === 0 && blankCellOpaquePixels === 0 && missingShadowPoses.length === 0 && checkShadowProfiles(metadata, shadowProfiles).pass && checkFootprintPreview(metadata, footprintPreview, source.info.width).pass,
    };
}

function deriveShadowProfiles(metadata, atlas, body, width) {
    const profiles = {};
    for (const pose of metadata.poses) {
        const frame = atlas.frames[pose.id];
        const bounds = alphaBounds(body, width, pose.cell.column * CELL_SIZE, pose.cell.row * CELL_SIZE);
        const angleRatio = Math.min(1, Math.abs(pose.rearAngleDeg ?? 0) / 44);
        const terrain = pose.id.startsWith('downhill') ? 'downhill' : pose.id.startsWith('uphill') ? 'uphill' : 'level';
        const chassisY = Math.min(0.94, frame.baselineY / CELL_SIZE + 0.032);
        const chassisWidth = clamp((bounds.w / CELL_SIZE) * (0.94 - angleRatio * 0.19), 0.26, 0.42);
        const chassisHeight = terrain === 'downhill' ? 0.061 : terrain === 'uphill' ? 0.077 : 0.071;
        const chassisX = clamp(frame.anchor.x / CELL_SIZE + (pose.rearAngleDeg ?? 0) * 0.0005, 0.32, 0.68);
        profiles[pose.id] = {
            chassis: { alpha: terrain === 'uphill' ? 0.35 : terrain === 'downhill' ? 0.31 : 0.33, h: chassisHeight, w: chassisWidth, x: chassisX, y: chassisY },
            tireContacts: [
                { alpha: 0.78, h: 0.024, w: 0.076, x: clamp(chassisX - chassisWidth * 0.42, 0.1, 0.9), y: chassisY - 0.008 },
                { alpha: 0.82, h: 0.025, w: 0.080, x: clamp(chassisX + chassisWidth * 0.42, 0.1, 0.9), y: chassisY - 0.004 },
            ],
        };
    }
    profiles.default = profiles.center;
    return profiles;
}

function makeRuntimeFootprintPreview(shadow, width, height, metadata, atlas, shadowProfiles) {
    const preview = Buffer.alloc(shadow.length, 255);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        // This is a diagnostic road tone, intentionally lighter than the game
        // asphalt so the multiply-style black shadow remains inspectable.
        const shade = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 76 : 91;
        preview[offset] = shade;
        preview[offset + 1] = shade + 3;
        preview[offset + 2] = shade + 7;
    }
    for (const pose of metadata.poses) {
        const frame = atlas.frames[pose.id];
        const profile = shadowProfiles[pose.id];
        drawRuntimeShadowLayer(preview, shadow, width, height, pose, frame, profile, RUNTIME_PREVIEW.softScaleX, RUNTIME_PREVIEW.softScaleY, RUNTIME_PREVIEW.softAlpha);
        drawRuntimeShadowLayer(preview, shadow, width, height, pose, frame, profile, RUNTIME_PREVIEW.silhouetteScaleX, RUNTIME_PREVIEW.silhouetteScaleY, RUNTIME_PREVIEW.silhouetteAlpha);
        drawContactPatch(preview, width, pose, frame, profile);
    }
    return preview;
}

function makeRuntimePreview(body, footprintPreview) {
    const preview = Buffer.from(footprintPreview);
    for (let offset = 0; offset < body.length; offset += 4) {
        if (body[offset + 3] === 0) continue;
        blendOver(preview, offset, body[offset], body[offset + 1], body[offset + 2], body[offset + 3]);
    }
    return preview;
}

function drawRuntimeShadowLayer(preview, shadow, width, height, pose, frame, profile, scaleX, scaleY, alpha) {
    const sourceLeft = pose.cell.column * CELL_SIZE;
    const sourceTop = pose.cell.row * CELL_SIZE;
    const scaledWidth = CELL_SIZE * scaleX;
    const scaledHeight = CELL_SIZE * scaleY;
    const centerX = sourceLeft + frame.anchor.x + (profile.chassis.x - frame.origin.x) * CELL_SIZE;
    const centerY = sourceTop + frame.anchor.y + (profile.chassis.y - frame.origin.y) * CELL_SIZE - CELL_SIZE * 0.032;
    const left = centerX - frame.origin.x * scaledWidth;
    const top = centerY - frame.origin.y * scaledHeight;
    for (let y = Math.max(sourceTop, Math.floor(top)); y < Math.min(sourceTop + CELL_SIZE, Math.ceil(top + scaledHeight)); y += 1) {
        for (let x = Math.max(sourceLeft, Math.floor(left)); x < Math.min(sourceLeft + CELL_SIZE, Math.ceil(left + scaledWidth)); x += 1) {
            const localX = Math.floor((x - left) / scaleX);
            const localY = Math.floor((y - top) / scaleY);
            if (localX < 0 || localX >= CELL_SIZE || localY < 0 || localY >= CELL_SIZE) continue;
            const sourceOffset = ((sourceTop + localY) * width + sourceLeft + localX) * 4;
            if (shadow[sourceOffset + 3] === 0) continue;
            blendOver(preview, (y * width + x) * 4, 0, 0, 0, alpha);
        }
    }
}

function drawContactPatch(preview, width, pose, frame, profile) {
    const sourceLeft = pose.cell.column * CELL_SIZE;
    const sourceTop = pose.cell.row * CELL_SIZE;
    const centerX = sourceLeft + frame.anchor.x + (profile.chassis.x - frame.origin.x) * CELL_SIZE;
    const centerY = sourceTop + frame.anchor.y + (profile.chassis.y - frame.origin.y) * CELL_SIZE - CELL_SIZE * 0.05;
    const patchWidth = CELL_SIZE * 0.72 * profile.chassis.w;
    const patchHeight = Math.max(2, CELL_SIZE * 0.34 * profile.chassis.h);
    for (let y = Math.floor(centerY - patchHeight / 2); y <= Math.ceil(centerY + patchHeight / 2); y += 1) for (let x = Math.floor(centerX - patchWidth / 2); x <= Math.ceil(centerX + patchWidth / 2); x += 1) {
        const localX = x - sourceLeft;
        const localY = y - sourceTop;
        if (localX < 0 || localX >= CELL_SIZE || localY < 0 || localY >= CELL_SIZE) continue;
        const ellipse = ((x - centerX) / (patchWidth / 2)) ** 2 + ((y - centerY) / (patchHeight / 2)) ** 2;
        if (ellipse <= 1) blendOver(preview, (y * width + x) * 4, 0, 0, 0, 8);
    }
}

function alphaBounds(data, width, left, top) {
    let minX = CELL_SIZE; let minY = CELL_SIZE; let maxX = -1; let maxY = -1;
    for (let y = 0; y < CELL_SIZE; y += 1) for (let x = 0; x < CELL_SIZE; x += 1) {
        if (data[((top + y) * width + left + x) * 4 + 3] === 0) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < 0) throw new Error('Cannot derive a shadow profile from an empty pose');
    return { w: maxX - minX + 1, h: maxY - minY + 1 };
}

function checkShadowProfiles(metadata, profiles) {
    const missingFrames = metadata.poses.filter((pose) => !profiles[pose.id]).map((pose) => pose.id);
    const invalidFrames = Object.entries(profiles).flatMap(([id, profile]) => {
        if (id === 'default') return [];
        const chassis = profile.chassis;
        const valid = [chassis.x, chassis.y, chassis.w, chassis.h].every(Number.isFinite) && chassis.x >= 0 && chassis.x <= 1 && chassis.y >= 0 && chassis.y <= 1 && chassis.w > 0 && chassis.h > 0 && profile.tireContacts?.length === 2;
        return valid ? [] : [id];
    });
    return { pass: missingFrames.length === 0 && invalidFrames.length === 0 && Boolean(profiles.default), missingFrames, invalidFrames };
}

function checkFootprintPreview(metadata, preview, width) {
    const poseDarkPixels = {};
    for (const pose of metadata.poses) {
        let darkPixels = 0;
        for (let y = pose.cell.row * CELL_SIZE; y < (pose.cell.row + 1) * CELL_SIZE; y += 1) {
            for (let x = pose.cell.column * CELL_SIZE; x < (pose.cell.column + 1) * CELL_SIZE; x += 1) {
                if (preview[(y * width + x) * 4] < 70) darkPixels += 1;
            }
        }
        poseDarkPixels[pose.id] = darkPixels;
    }
    const missingPreviewPoses = Object.entries(poseDarkPixels).filter(([, pixels]) => pixels === 0).map(([id]) => id);
    return { pass: missingPreviewPoses.length === 0, poseDarkPixels, missingPreviewPoses };
}

function mergeShadowProfiles(generated, legacySeed, overrides) {
    const merged = structuredClone(generated);
    for (const source of [legacySeed, overrides]) {
        if (!source || typeof source !== 'object') continue;
        for (const [frameId, profile] of Object.entries(source)) {
            if (!merged[frameId] || !profile?.chassis) continue;
            merged[frameId] = structuredClone(profile);
        }
    }
    merged.default = structuredClone(merged.default ?? merged.center);
    return merged;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function blendOver(target, offset, red, green, blue, alpha) {
    const sourceAlpha = alpha / 255;
    const targetAlpha = target[offset + 3] / 255;
    const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
    target[offset] = Math.round((red * sourceAlpha + target[offset] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    target[offset + 1] = Math.round((green * sourceAlpha + target[offset + 1] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    target[offset + 2] = Math.round((blue * sourceAlpha + target[offset + 2] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    target[offset + 3] = Math.round(outputAlpha * 255);
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
    try {
        return await readJson(filePath);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

function relative(filePath) {
    return path.relative(projectRoot, filePath);
}
