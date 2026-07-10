import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const MAGENTA = [255, 0, 255];
const SOURCE_BODY_COLORS = [
    { rgb: [40, 58, 70], shade: 1 },
    { rgb: [72, 86, 96], shade: 1 },
    { rgb: [100, 116, 126], shade: 2 },
    { rgb: [102, 124, 134], shade: 2 },
    { rgb: [118, 132, 140], shade: 3 },
    { rgb: [140, 158, 166], shade: 4 },
    { rgb: [154, 166, 172], shade: 4 },
];
const SOURCE_BODY_RAMP = SOURCE_BODY_COLORS.map((entry) => entry.rgb);
const PALETTE_ROLES = [
    { role: 'tire', rgb: [8, 10, 14], debug: [28, 28, 32] },
    { role: 'outline', rgb: [16, 20, 25], debug: [64, 64, 72] },
    { role: 'shadow', rgb: [18, 24, 30], debug: [40, 44, 52] },
    ...SOURCE_BODY_COLORS.map((entry) => ({
        ...entry,
        debug: [70, 220, 110],
        role: 'body',
    })),
    { role: 'tail-light', rgb: [88, 18, 24], debug: [255, 30, 60] },
    { role: 'tail-light', rgb: [164, 34, 38], debug: [255, 30, 60] },
    { role: 'tail-light', rgb: [230, 57, 52], debug: [255, 30, 60] },
    { role: 'amber-light', rgb: [174, 78, 30], debug: [255, 160, 30] },
    { role: 'amber-light', rgb: [236, 136, 43], debug: [255, 190, 45] },
];
const BODY_RAMPS = {
    black: [
        [8, 12, 20],
        [8, 12, 20],
        [16, 28, 48],
        [16, 28, 48],
        [44, 78, 118],
    ],
    silver: [
        [58, 72, 82],
        [58, 72, 82],
        [104, 118, 126],
        [104, 118, 126],
        [132, 146, 154],
    ],
    red: [
        [62, 28, 28],
        [62, 28, 28],
        [108, 52, 48],
        [108, 52, 48],
        [142, 86, 74],
    ],
    blue: [
        [10, 18, 34],
        [10, 18, 34],
        [24, 52, 92],
        [24, 52, 92],
        [70, 118, 180],
    ],
    yellow: [
        [76, 62, 26],
        [76, 62, 26],
        [124, 102, 42],
        [124, 102, 42],
        [176, 154, 82],
    ],
};
const TRANSPARENT_BLEED_RADIUS = 2;
const OUTLINE_RGB = [16, 20, 25];

const config = {
    atlas: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-runtime-256.json',
    audit: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/ft86-retro-palette-audit.json',
    baseAtlas: 'assets/vehicles/approved/atlases/toyota-gt86-poc-128.json',
    debugRoles: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-roles.png',
    input: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced.png',
    outputDir: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256',
    outputPrefix: 'sheet-256-ai-retro-v1-balanced',
    shadow: 'assets/vehicles/generated/pixel-candidates/toyota-gt86-256/sheet-256-ai-retro-v1-balanced-alpha-shadow.png',
};

for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const next = process.argv[index + 1];

    if (arg === '--input' && next) {
        config.input = next;
        index += 1;
    } else if (arg === '--audit' && next) {
        config.audit = next;
        index += 1;
    } else if (arg === '--output-dir' && next) {
        config.outputDir = next;
        index += 1;
    } else if (arg === '--output-prefix' && next) {
        config.outputPrefix = next;
        index += 1;
    } else if (arg === '--atlas' && next) {
        config.atlas = next;
        index += 1;
    } else if (arg === '--base-atlas' && next) {
        config.baseAtlas = next;
        index += 1;
    } else if (arg === '--debug-roles' && next) {
        config.debugRoles = next;
        index += 1;
    } else if (arg === '--shadow' && next) {
        config.shadow = next;
        index += 1;
    } else {
        throw new Error(`Unknown or incomplete option: ${arg}`);
    }
}

const inputPath = resolveProjectPath(config.input, '--input');
const outputDir = resolveProjectPath(config.outputDir, '--output-dir');
const atlasPath = resolveProjectPath(config.atlas, '--atlas');
const auditPath = resolveProjectPath(config.audit, '--audit');
const debugRolesPath = resolveProjectPath(config.debugRoles, '--debug-roles');
const shadowPath = resolveProjectPath(config.shadow, '--shadow');

await mkdir(outputDir, { recursive: true });
await mkdir(path.dirname(atlasPath), { recursive: true });
await mkdir(path.dirname(auditPath), { recursive: true });
await mkdir(path.dirname(debugRolesPath), { recursive: true });
await mkdir(path.dirname(shadowPath), { recursive: true });

const rawAlphaPath = path.join(outputDir, `${config.outputPrefix}-source-alpha.png`);
const alphaPath = path.join(outputDir, `${config.outputPrefix}-alpha.png`);
await magentaToAlpha(inputPath, rawAlphaPath);
await writePaletteAudit(rawAlphaPath, auditPath);
await writeRoleDebugSheet(rawAlphaPath, debugRolesPath);

const variantOutputs = [];
for (const [label, ramp] of Object.entries(BODY_RAMPS)) {
    const outputPath = label === 'silver'
        ? alphaPath
        : path.join(outputDir, `${config.outputPrefix}-${label}-alpha.png`);

    await swapBodyPalette(rawAlphaPath, outputPath, ramp);

    variantOutputs.push({
        color: label,
        file: path.relative(projectRoot, outputPath),
    });
}

await writeShadowSheet(alphaPath, shadowPath);
await writeRuntimeAtlas({
    alphaPath,
    atlasPath,
    baseAtlasPath: resolveProjectPath(config.baseAtlas, '--base-atlas'),
});

console.log(`FT86 source alpha wrote ${path.relative(projectRoot, rawAlphaPath)}`);
console.log(`FT86 alpha wrote ${path.relative(projectRoot, alphaPath)}`);
console.log(`FT86 palette audit wrote ${path.relative(projectRoot, auditPath)}`);
console.log(`FT86 role preview wrote ${path.relative(projectRoot, debugRolesPath)}`);
console.log(`FT86 shadow wrote ${path.relative(projectRoot, shadowPath)}`);
console.log(`FT86 runtime atlas wrote ${path.relative(projectRoot, atlasPath)}`);
for (const variant of variantOutputs) {
    console.log(`FT86 ${variant.color} variant ${variant.file}`);
}

async function magentaToAlpha(sourcePath, outputPath) {
    const image = sharp(sourcePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const alpha = data[index + 3];
        if (alpha === 0) continue;

        if (sameRgb(data, index, MAGENTA)) {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
            data[index + 3] = 0;
        } else {
            data[index + 3] = 255;
        }
    }

    fillTransparentRgbFromNearestOpaque(data, info, TRANSPARENT_BLEED_RADIUS);

    await writeRawPng(data, metadata, info, outputPath);
}

async function swapBodyPalette(sourcePath, outputPath, targetRamp) {
    const image = sharp(sourcePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        if (data[index + 3] === 0) continue;

        const role = getPaletteRole(data, index);
        if (role?.role !== 'body') continue;

        setRgb(data, index, targetRamp[role.shade]);
    }

    cleanEdgeBodyNoise(data, info, targetRamp);
    fillTransparentRgbFromNearestOpaque(data, info, TRANSPARENT_BLEED_RADIUS);

    await writeRawPng(data, metadata, info, outputPath);
}

async function writePaletteAudit(sourcePath, outputPath) {
    const image = sharp(sourcePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const colors = new Map();
    const roles = new Map();

    for (let index = 0; index < data.length; index += info.channels) {
        if (data[index + 3] === 0) continue;

        const rgb = [data[index], data[index + 1], data[index + 2]];
        const key = rgb.join(',');
        const role = getPaletteRole(data, index)?.role ?? 'unknown';
        colors.set(key, {
            count: (colors.get(key)?.count ?? 0) + 1,
            rgb,
            role,
        });
        roles.set(role, (roles.get(role) ?? 0) + 1);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        image: path.relative(projectRoot, sourcePath),
        notes: [
            'Palette roles drive FT86 body color swaps.',
            'Apex Seoul final art direction targets a black/blue dreamlike Seoul downhill, so black and blue variants are art-direction baselines.',
            'Review sheet-256-ai-retro-v1-balanced-roles.png before changing role assignments.',
        ],
        size: {
            height: metadata.height,
            width: metadata.width,
        },
        roles: Object.fromEntries([...roles.entries()].sort(([a], [b]) => a.localeCompare(b))),
        colors: [...colors.values()].sort((a, b) => b.count - a.count),
    };

    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function writeRoleDebugSheet(sourcePath, outputPath) {
    const image = sharp(sourcePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        if (data[index + 3] === 0) continue;

        const role = getPaletteRole(data, index);
        const debug = role?.debug ?? [255, 0, 255];

        setRgb(data, index, debug);
        data[index + 3] = 255;
    }

    await writeRawPng(data, metadata, info, outputPath);
}

async function writeShadowSheet(sourcePath, outputPath) {
    const image = sharp(sourcePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const alpha = data[index + 3];

        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = alpha === 0 ? 0 : 210;
    }

    fillTransparentRgbFromNearestOpaque(data, info, TRANSPARENT_BLEED_RADIUS);

    await writeRawPng(data, metadata, info, outputPath);
}

async function writeRuntimeAtlas({ alphaPath, atlasPath, baseAtlasPath }) {
    const baseAtlas = JSON.parse(await readFile(baseAtlasPath, 'utf8'));
    const metadata = await sharp(alphaPath).metadata();
    const scale = metadata.width / baseAtlas.meta.size.w;
    const nextAtlas = structuredClone(baseAtlas);

    nextAtlas.apex = {
        ...nextAtlas.apex,
        approvedFrom: {
            note: 'Generated from FT86 Retro Style Filter v1 balanced postprocess.',
            source: path.relative(projectRoot, alphaPath),
        },
        targetCellSize: Math.round(baseAtlas.apex.targetCellSize * scale),
        vehicleId: 'ft86-retro-v1',
    };
    nextAtlas.meta = {
        ...nextAtlas.meta,
        image: path.basename(alphaPath),
        size: {
            h: metadata.height,
            w: metadata.width,
        },
    };

    for (const frame of Object.values(nextAtlas.frames)) {
        frame.frame = scaleFrame(frame.frame, scale);
        frame.sourceSize = scaleSize(frame.sourceSize, scale);
        frame.spriteSourceSize = scaleFrame(frame.spriteSourceSize, scale);
    }

    await writeFile(atlasPath, `${JSON.stringify(nextAtlas, null, 2)}\n`);
}

function sameRgb(data, index, rgb) {
    return data[index] === rgb[0] && data[index + 1] === rgb[1] && data[index + 2] === rgb[2];
}

function setRgb(data, index, rgb) {
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
}

function getPaletteRole(data, index) {
    return PALETTE_ROLES.find((entry) => sameRgb(data, index, entry.rgb)) ?? null;
}

function fillTransparentRgbFromNearestOpaque(data, info, radius) {
    const snapshot = new Uint8ClampedArray(data);

    for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
            const index = getPixelIndex(info, x, y);

            if (snapshot[index + 3] !== 0) continue;

            const nearest = findNearestOpaqueRgb(snapshot, info, x, y, radius);

            if (nearest) {
                data[index] = nearest[0];
                data[index + 1] = nearest[1];
                data[index + 2] = nearest[2];
            } else {
                data[index] = 0;
                data[index + 1] = 0;
                data[index + 2] = 0;
            }

            data[index + 3] = 0;
        }
    }
}

function cleanEdgeBodyNoise(data, info, targetRamp) {
    const snapshot = new Uint8ClampedArray(data);
    const bodyColors = uniqueRgbList(targetRamp);

    for (let y = 1; y < info.height - 1; y += 1) {
        for (let x = 1; x < info.width - 1; x += 1) {
            const index = getPixelIndex(info, x, y);

            if (!getBodyColorKey(snapshot, index, bodyColors)) continue;

            const neighbors = countNeighborKinds(snapshot, info, x, y, bodyColors);
            const isWeakBodyEdge = neighbors.transparent > 0 &&
                neighbors.body <= 3 &&
                neighbors.dark >= 2;

            if (isWeakBodyEdge) setRgb(data, index, OUTLINE_RGB);
        }
    }
}

function getBodyColorKey(data, index, bodyColors) {
    if (data[index + 3] === 0) return null;

    const key = `${data[index]},${data[index + 1]},${data[index + 2]}`;

    return bodyColors.has(key) ? key : null;
}

function uniqueRgbList(colors) {
    return new Set(colors.map((rgb) => rgb.join(',')));
}

function countNeighborKinds(data, info, x, y, bodyColors) {
    const counts = {
        body: 0,
        dark: 0,
        transparent: 0,
    };

    for (let yy = y - 1; yy <= y + 1; yy += 1) {
        for (let xx = x - 1; xx <= x + 1; xx += 1) {
            if (xx === x && yy === y) continue;

            const index = getPixelIndex(info, xx, yy);

            if (data[index + 3] === 0) {
                counts.transparent += 1;
            } else if (getBodyColorKey(data, index, bodyColors)) {
                counts.body += 1;
            } else if (sameRgb(data, index, OUTLINE_RGB) || sameRgb(data, index, [8, 10, 14])) {
                counts.dark += 1;
            }
        }
    }

    return counts;
}

function findNearestOpaqueRgb(data, info, x, y, radius) {
    for (let distance = 1; distance <= radius; distance += 1) {
        for (let yy = y - distance; yy <= y + distance; yy += 1) {
            for (let xx = x - distance; xx <= x + distance; xx += 1) {
                if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== distance) continue;
                if (xx < 0 || yy < 0 || xx >= info.width || yy >= info.height) continue;

                const index = getPixelIndex(info, xx, yy);

                if (data[index + 3] === 0) continue;

                return [data[index], data[index + 1], data[index + 2]];
            }
        }
    }

    return null;
}

function getPixelIndex(info, x, y) {
    return (y * info.width + x) * info.channels;
}

async function writeRawPng(data, metadata, info, outputPath) {
    await sharp(data, {
        raw: {
            channels: info.channels,
            height: metadata.height,
            width: metadata.width,
        },
    }).png().toFile(outputPath);
}

function scaleFrame(frame, scale) {
    return {
        h: Math.round(frame.h * scale),
        w: Math.round(frame.w * scale),
        x: Math.round(frame.x * scale),
        y: Math.round(frame.y * scale),
    };
}

function scaleSize(size, scale) {
    return {
        h: Math.round(size.h * scale),
        w: Math.round(size.w * scale),
    };
}

function resolveProjectPath(rawPath, option) {
    const absolutePath = path.isAbsolute(rawPath)
        ? path.resolve(rawPath)
        : path.resolve(projectRoot, rawPath);

    if (!absolutePath.startsWith(projectRoot)) {
        throw new Error(`${option} must point inside ${projectRoot}`);
    }

    return absolutePath;
}
