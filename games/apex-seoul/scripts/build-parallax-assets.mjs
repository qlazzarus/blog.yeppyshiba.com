import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'assets/environment/source');
const OUTPUT_ROOT = path.join(ROOT, 'assets/environment/generated/parallax-v1');
const WIDTH = 1600;

const sources = {
    city: path.join(SOURCE_ROOT, 'oga-mountains-buildings/city_1.jpg'),
    cloud: path.join(SOURCE_ROOT, 'oga-transparent-clouds/fx_cloudalpha05.png'),
    mountain: path.join(SOURCE_ROOT, 'oga-mountains-trees/mountainsfardetail_0.png'),
    moon: path.join(SOURCE_ROOT, 'oga-moon-overlay/moon_overlay.png'),
    skyline: [1, 2, 3, 4].map((index) => path.join(
        SOURCE_ROOT,
        `oga-skyline/Background_City_Skyline/Layers/Background_City_Skyline_Back_0${index}.png`,
    )),
    trees: path.join(SOURCE_ROOT, 'oga-mountains-trees/treesfardetail.png'),
};

await mkdir(OUTPUT_ROOT, { recursive: true });

await Promise.all([
    buildNearRidge(),
    buildMidBuildings(),
    buildFarCity(),
    buildMoon(),
    buildCloud(),
]);

async function buildMoon() {
    const { data, info } = await sharp(sources.moon)
        .extract({ height: 500, left: 50, top: 42, width: 500 })
        .resize({ fit: 'contain', height: 256, width: 256 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const luminance = (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;

        data[index] = Math.round(178 * luminance);
        data[index + 1] = Math.round(211 * luminance);
        data[index + 2] = Math.round(255 * luminance);
    }

    await writeRawPng(data, info, 'moon-cool-blue.png');
}

async function buildCloud() {
    const { data, info } = await sharp(sources.cloud)
        .extract({ height: 700, left: 110, top: 64, width: 1800 })
        .resize({ fit: 'fill', height: 360, width: WIDTH })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const alpha = data[index + 3] / 255;

        data[index] = 2;
        data[index + 1] = 6;
        data[index + 2] = 12;
        data[index + 3] = Math.round(alpha * 255);
    }

    await writeRawPng(data, info, 'cloud-dark-blue.png');
}

async function buildNearRidge() {
    const [mountain, trees] = await Promise.all([
        recolorTransparent(sources.mountain, {
            blue: 42,
            green: 21,
            red: 6,
            strength: 0.72,
            width: WIDTH,
            height: 250,
        }),
        recolorTransparent(sources.trees, {
            blue: 30,
            green: 14,
            red: 4,
            strength: 0.5,
            width: WIDTH,
            height: 128,
        }),
    ]);

    await sharp({
        create: {
            background: { alpha: 0, b: 0, g: 0, r: 0 },
            channels: 4,
            height: 280,
            width: WIDTH,
        },
    })
        .composite([
            { input: mountain, left: 0, top: 20 },
            { input: trees, left: 0, top: 152 },
        ])
        .png()
        .toFile(path.join(OUTPUT_ROOT, 'ridge-near-blueblack.png'));
}

async function buildMidBuildings() {
    const city = await recolorOpaqueCity(sources.city, 760, 116, {
        blue: 78,
        green: 38,
        red: 13,
        threshold: 25,
    });
    const cityMirror = await sharp(city).flop().png().toBuffer();

    const composite = await sharp({
        create: {
            background: { alpha: 0, b: 0, g: 0, r: 0 },
            channels: 4,
            height: 140,
            width: WIDTH,
        },
    })
        .composite([
            { input: city, left: -72, top: 18 },
            { input: cityMirror, left: 620, top: 12 },
            { input: city, left: 1312, top: 20 },
        ])
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const lights = Buffer.alloc(composite.data.length);

    addSparseCityLights(composite.data, composite.info, {
        color: [106, 182, 255],
        count: 180,
        lightData: lights,
        minAlpha: 55,
        seed: 0x2a8d,
        size: 2,
    });

    await Promise.all([
        writeRawPng(composite.data, composite.info, 'buildings-mid-blueblack.png'),
        writeRawPng(lights, composite.info, 'buildings-mid-lights-bluewhite.png'),
    ]);
}

async function buildFarCity() {
    const layers = await Promise.all(sources.skyline.map((source) => recolorTransparent(source, {
        blue: 115,
        green: 60,
        red: 20,
        strength: 0.9,
        width: 480,
        height: 120,
    })));

    const composite = await sharp({
        create: {
            background: { alpha: 0, b: 0, g: 0, r: 0 },
            channels: 4,
            height: 132,
            width: WIDTH,
        },
    })
        .composite([
            { input: layers[0], left: -58, top: 8 },
            { input: layers[1], left: 344, top: 12 },
            { input: layers[2], left: 746, top: 4 },
            { input: layers[3], left: 1148, top: 14 },
        ])
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const lights = Buffer.alloc(composite.data.length);

    addSparseCityLights(composite.data, composite.info, {
        color: [116, 196, 255],
        count: 140,
        lightData: lights,
        minAlpha: 65,
        seed: 0x51a7,
        size: 2,
    });

    await Promise.all([
        writeRawPng(composite.data, composite.info, 'city-far-blueblack.png'),
        writeRawPng(lights, composite.info, 'city-far-lights-bluewhite.png'),
    ]);
}

function writeRawPng(data, info, filename) {
    return sharp(data, {
        raw: {
            channels: info.channels,
            height: info.height,
            width: info.width,
        },
    })
        .png()
        .toFile(path.join(OUTPUT_ROOT, filename));
}

async function recolorTransparent(source, options) {
    const { data, info } = await sharp(source)
        .ensureAlpha()
        .resize({
            fit: 'fill',
            height: options.height,
            kernel: sharp.kernel.nearest,
            width: options.width,
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const luminance = (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;
        const value = luminance * options.strength;

        data[index] = Math.round(options.red * value);
        data[index + 1] = Math.round(options.green * value);
        data[index + 2] = Math.round(options.blue * value);
    }

    return sharp(data, {
        raw: {
            channels: info.channels,
            height: info.height,
            width: info.width,
        },
    }).png().toBuffer();
}

async function recolorOpaqueCity(source, width, height, options) {
    const { data, info } = await sharp(source)
        .resize({ fit: 'fill', height, kernel: sharp.kernel.nearest, width })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        const alpha = clamp((luminance - options.threshold) * 8, 0, 215) / 255;

        data[index] = Math.round(options.red * alpha);
        data[index + 1] = Math.round(options.green * alpha);
        data[index + 2] = Math.round(options.blue * alpha);
        data[index + 3] = Math.round(alpha * 255);
    }

    return sharp(data, {
        raw: {
            channels: info.channels,
            height: info.height,
            width: info.width,
        },
    }).png().toBuffer();
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function addSparseCityLights(data, info, options) {
    let seed = options.seed;
    let placed = 0;

    while (placed < options.count) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const x = seed % info.width;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const y = 16 + (seed % (info.height - 28));
        const index = (y * info.width + x) * info.channels;

        if (data[index + 3] < options.minAlpha) continue;

        for (let offsetY = 0; offsetY < options.size; offsetY += 1) {
            for (let offsetX = 0; offsetX < options.size; offsetX += 1) {
                const targetX = x + offsetX;
                const targetY = y + offsetY;

                if (targetX >= info.width || targetY >= info.height) continue;

                const targetIndex = (targetY * info.width + targetX) * info.channels;

                if (data[targetIndex + 3] < options.minAlpha) continue;

                options.lightData[targetIndex] = options.color[0];
                options.lightData[targetIndex + 1] = options.color[1];
                options.lightData[targetIndex + 2] = options.color[2];
                options.lightData[targetIndex + 3] = 255;
            }
        }
        placed += 1;
    }
}
