/**
 * Scene-wide Phaser depth contract.
 *
 * Keep fractional values where a layer must sit between two existing world
 * passes. Do not rely on creation order for intentional overlap.
 */
export enum RenderDepth {
    Background = 0,
    Moon = 0.5,
    FarCloud = 0.6,
    NearCloud = 0.61,
    FarCity = 1,
    FarCityLights = 1.01,
    NearRidge = 1.2,
    TerrainHorizonOcclusion = 1.85,
    LeftCliffForest = 1.89,
    WallForestBack = 1.9,
    WallForestFront = 1.95,
    World = 2,
    Headlight = 3.6,
    SpeedEffect = 4.35,
    PlayerSoftShadow = 4.8,
    PlayerShadow = 5,
    ForegroundMatte = 6,
    PlayerTireCue = 6.05,
    Player = 6.1,
    Ui = 7,
    Hud = 8,
}
