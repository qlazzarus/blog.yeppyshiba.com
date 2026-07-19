import Phaser from 'phaser';

export const WORLD_FOG_COLOR = 0x02060d;
export const WORLD_FOG_END_DISTANCE = 4300;
export const WORLD_FOG_START_DISTANCE = 600;

export function getWorldDistanceFog(distanceAhead: number) {
    const linearFade = Phaser.Math.Clamp(
        (distanceAhead - WORLD_FOG_START_DISTANCE) /
            (WORLD_FOG_END_DISTANCE - WORLD_FOG_START_DISTANCE),
        0,
        1,
    );

    return linearFade * linearFade * (3 - 2 * linearFade);
}

export function mixWithWorldFog(color: number, fogAmount: number) {
    const ratio = Phaser.Math.Clamp(fogAmount, 0, 1);
    const red = Math.round(((color >> 16) & 0xff) * (1 - ratio) + ((WORLD_FOG_COLOR >> 16) & 0xff) * ratio);
    const green = Math.round(((color >> 8) & 0xff) * (1 - ratio) + ((WORLD_FOG_COLOR >> 8) & 0xff) * ratio);
    const blue = Math.round((color & 0xff) * (1 - ratio) + (WORLD_FOG_COLOR & 0xff) * ratio);

    return (red << 16) | (green << 8) | blue;
}
