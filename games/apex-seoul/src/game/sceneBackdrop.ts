import type { Viewport } from './pseudo3dCamera';

export function getBackdropSkyLayout(input: {
    elapsedSec: number;
    moonDisplaySize: number;
    moonXRatio: number;
    moonYRatio: number;
    viewport: Viewport;
}) {
    const moonX = input.viewport.width * input.moonXRatio;
    const moonY = input.viewport.height * input.moonYRatio;
    return {
        farCloud: { height: 300, width: 1600, x: input.viewport.width / 2 + (input.elapsedSec * 3.5) % 360 - 180, y: moonY - 18 },
        moon: { size: input.moonDisplaySize, x: moonX, y: moonY },
        nearCloud: { height: 360, width: 1600, x: input.viewport.width / 2 + (input.elapsedSec * 7) % 420 - 210, y: moonY + 26 },
    };
}

export function getBackdropCityLayout(input: {
    farOffset: number;
    farHeight: number;
    parallaxWidth: number;
    ridgeBaselineOffsetY: number;
    ridgeHeight: number;
    ridgeOffset: number;
    skylineY: number;
    viewport: Viewport;
}) {
    return {
        far: { height: input.farHeight, width: input.parallaxWidth, x: input.viewport.width / 2 + input.farOffset, y: input.skylineY - 6 },
        ridge: { height: input.ridgeHeight, width: input.parallaxWidth, x: input.viewport.width / 2 + input.ridgeOffset, y: input.skylineY + input.ridgeBaselineOffsetY },
    };
}

export type BackdropRect = { alpha: number; color: number; height: number; width: number; x: number; y: number };

export function getBackdropBandRects(viewport: Viewport, horizonY: number, skylineY: number): BackdropRect[] {
    return [
        { alpha: 1, color: 0x07101f, height: Math.max(0, horizonY), width: viewport.width, x: 0, y: 0 },
        { alpha: 0.24, color: 0x14395f, height: 18, width: viewport.width, x: 0, y: Math.max(0, skylineY - 42) },
        { alpha: 0.18, color: 0x3f7dd7, height: 2, width: viewport.width, x: 0, y: skylineY - 16 },
        { alpha: 1, color: 0x081520, height: viewport.height - horizonY, width: viewport.width, x: 0, y: horizonY },
    ];
}

export function getForegroundMatteRects(viewport: Viewport): BackdropRect[] {
    const sideWidth = Math.min(176, viewport.width * 0.16);
    const bottomHeight = Math.min(104, viewport.height * 0.14);
    const steps = 7;
    const rects: BackdropRect[] = [];

    for (let step = 0; step < steps; step += 1) {
        const ratio = 1 - step / steps;
        const width = sideWidth * ratio;
        const height = bottomHeight * ratio;
        rects.push(
            { alpha: 0.14, color: 0x02060d, height: viewport.height, width, x: 0, y: 0 },
            { alpha: 0.14, color: 0x02060d, height: viewport.height, width, x: viewport.width - width, y: 0 },
            { alpha: 0.11, color: 0x010407, height, width: viewport.width, x: 0, y: viewport.height - height },
        );
    }
    return rects;
}
