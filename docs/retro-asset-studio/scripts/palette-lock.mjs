import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const MAGENTA = [255, 0, 255];
const BODY_PALETTE = {
    base: [118, 132, 140],
    dark: [72, 86, 96],
    highlight: [154, 166, 172],
    mid: [100, 116, 126],
    shadow: [48, 60, 70],
};
const GLASS_PALETTE = {
    dark: [40, 58, 70],
    highlight: [140, 158, 166],
    mid: [102, 124, 134],
};
const LIGHT_PALETTE = {
    amber: [236, 136, 43],
    amberDark: [174, 78, 30],
    red: [164, 34, 38],
    redDark: [88, 18, 24],
    redHighlight: [230, 57, 52],
};
const WHEEL_PALETTE = {
    rim: [62, 76, 86],
    tire: [8, 10, 14],
};

export const RETRO_VEHICLE_PALETTES = {
    body: BODY_PALETTE,
    glass: GLASS_PALETTE,
    lights: LIGHT_PALETTE,
    wheel: WHEEL_PALETTE,
};

export async function paletteLockRetroVehicleSheet(imagePath, { qaPath = null, wheelPaletteLock = false } = {}) {
    const image = sharp(imagePath).ensureAlpha();
    const metadata = await image.metadata();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
        const alpha = data[index + 3];

        if (alpha === 0) continue;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        if (isMagentaBackground(red, green, blue)) {
            data[index] = MAGENTA[0];
            data[index + 1] = MAGENTA[1];
            data[index + 2] = MAGENTA[2];
            data[index + 3] = 255;
            continue;
        }

        const [nextRed, nextGreen, nextBlue] = lockVehicleColor(red, green, blue);

        data[index] = nextRed;
        data[index + 1] = nextGreen;
        data[index + 2] = nextBlue;
        data[index + 3] = 255;
    }

    if (qaPath && wheelPaletteLock) {
        await applyWheelPaletteLock({ data, info, qaPath });
    }

    await sharp(data, {
        raw: {
            channels: info.channels,
            height: metadata.height,
            width: metadata.width,
        },
    }).png().toFile(imagePath);
}

function isMagentaBackground(red, green, blue) {
    return (red > 230 && green < 45 && blue > 230)
        || (red > 190 && green < 112 && blue > 190 && red + blue > green * 4.2);
}

function lockVehicleColor(red, green, blue) {
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const isRedLight = red > green * 1.28 && red > blue * 1.16 && red > 72;
    const isAmberLight = red > 130 && green > 68 && blue < 92;
    const isGlass = blue > red * 1.02 && blue >= green * 0.92 && luminance > 42 && luminance < 185;

    if (isRedLight) {
        if (luminance > 150) return LIGHT_PALETTE.redHighlight;
        if (luminance > 92) return LIGHT_PALETTE.red;
        return LIGHT_PALETTE.redDark;
    }

    if (isAmberLight) {
        return luminance > 150 ? LIGHT_PALETTE.amber : LIGHT_PALETTE.amberDark;
    }

    if (luminance < 30) return WHEEL_PALETTE.tire;
    if (luminance < 54) return [16, 20, 25];

    if (isGlass || (saturation > 20 && luminance < 150)) {
        if (luminance > 130) return GLASS_PALETTE.highlight;
        if (luminance > 86) return GLASS_PALETTE.mid;
        return GLASS_PALETTE.dark;
    }

    if (luminance > 214) return BODY_PALETTE.highlight;
    if (luminance > 174) return BODY_PALETTE.base;
    if (luminance > 126) return BODY_PALETTE.mid;
    if (luminance > 76) return BODY_PALETTE.dark;
    return [18, 24, 30];
}

async function applyWheelPaletteLock({ data, info, qaPath }) {
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    const cellSize = qa.targetCellSize;

    for (const pose of qa.poses ?? []) {
        const cellLeft = pose.cell.column * cellSize;
        const cellTop = pose.cell.row * cellSize;

        if (isRearFacingPose(pose.id)) {
            for (const center of pose.wheelCenters ?? []) {
                neutralizeRearWheelArtifact({
                    center,
                    cellLeft,
                    cellTop,
                    data,
                    imageWidth: info.width,
                });
            }

            continue;
        }

        for (const center of pose.wheelCenters ?? []) {
            lockWheelEllipse({
                center,
                cellLeft,
                cellTop,
                data,
                imageWidth: info.width,
            });
        }
    }
}

function isRearFacingPose(poseId) {
    return poseId === 'center' || poseId === 'downhill-center' || poseId === 'uphill-center';
}

function neutralizeRearWheelArtifact({ center, cellLeft, cellTop, data, imageWidth }) {
    const radiusX = center.radiusX + 2.6;
    const radiusY = center.radiusY + 2.1;

    for (let y = Math.floor(center.y - radiusY); y <= Math.ceil(center.y + radiusY); y += 1) {
        for (let x = Math.floor(center.x - radiusX); x <= Math.ceil(center.x + radiusX); x += 1) {
            const normalizedX = (x - center.x) / radiusX;
            const normalizedY = (y - center.y) / radiusY;
            const normalized = normalizedX ** 2 + normalizedY ** 2;

            if (normalized > 1 || normalizedY < -0.58) continue;

            const index = ((cellTop + y) * imageWidth + cellLeft + x) * 4;

            if (data[index + 3] === 0 || isMagentaBackground(data[index], data[index + 1], data[index + 2])) {
                continue;
            }

            const color = normalizedY > 0.24 ? BODY_PALETTE.shadow : BODY_PALETTE.dark;

            data[index] = color[0];
            data[index + 1] = color[1];
            data[index + 2] = color[2];
            data[index + 3] = 255;
        }
    }
}

function lockWheelEllipse({ center, cellLeft, cellTop, data, imageWidth }) {
    const radiusX = center.radiusX + 2.6;
    const radiusY = center.radiusY + 2.1;

    for (let y = Math.floor(center.y - radiusY); y <= Math.ceil(center.y + radiusY); y += 1) {
        for (let x = Math.floor(center.x - radiusX); x <= Math.ceil(center.x + radiusX); x += 1) {
            const normalizedX = (x - center.x) / radiusX;
            const normalizedY = (y - center.y) / radiusY;
            const normalized = normalizedX ** 2 + normalizedY ** 2;

            if (normalized > 1 || normalizedY < -0.58) continue;

            const index = ((cellTop + y) * imageWidth + cellLeft + x) * 4;

            if (data[index + 3] === 0 || isMagentaBackground(data[index], data[index + 1], data[index + 2])) {
                continue;
            }

            const color = normalized < 0.24 ? WHEEL_PALETTE.rim : WHEEL_PALETTE.tire;

            data[index] = color[0];
            data[index + 1] = color[1];
            data[index + 2] = color[2];
            data[index + 3] = 255;
        }
    }
}
