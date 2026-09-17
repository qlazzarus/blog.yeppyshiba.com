export type AssetAttribution = {
    author: string;
    license: string;
    name: string;
    sourceUrl: string;
};

// Keep this list intentionally flat: the in-game notice is a single complete
// list, and the same records will later feed the release ATTRIBUTIONS.md file.
export const ASSET_ATTRIBUTIONS: readonly AssetAttribution[] = [
    {
        name: 'Moon Overlay Texture', author: 'bart', license: 'CC0',
        sourceUrl: 'https://opengameart.org/content/moon-overlay-texture',
    },
    {
        name: 'Mountains and Buildings', author: 'Kutejnikov', license: 'CC0 1.0',
        sourceUrl: 'https://opengameart.org/content/mountains-and-buildings',
    },
    {
        name: 'Mountains and Trees Parallax Background Detail', author: 'Fupi', license: 'CC0 1.0',
        sourceUrl: 'https://opengameart.org/content/mountains-and-trees-parallax-background-detail',
    },
    {
        name: 'Skyline Background', author: 'FabinhoSC', license: 'CC0 1.0 / Public Domain',
        sourceUrl: 'https://opengameart.org/content/skyline-background',
    },
    {
        name: 'Clouds with Transparency', author: 'WickedInsignia', license: 'CC0',
        sourceUrl: 'https://opengameart.org/content/clouds-with-transparency-fxcloudalpha05png',
    },
    {
        name: 'Smoke Particle Assets', author: 'Kenney (Kenney.nl)', license: 'CC0 1.0',
        sourceUrl: 'https://opengameart.org/content/smoke-particle-assets',
    },
    {
        name: 'Kenney Car Kit', author: 'Kenney (Kenney.nl)', license: 'CC0 1.0',
        sourceUrl: 'https://kenney.nl/assets/car-kit',
    },
    {
        name: 'Genesis G70 vehicle source', author: 'Nieve5677', license: 'CC Attribution',
        sourceUrl: 'https://sketchfab.com/3d-models/genesis-g70-509a72789a224bc894944638fc602426',
    },
    {
        name: 'Phaser', author: 'Photon Storm', license: 'MIT',
        sourceUrl: 'https://github.com/phaserjs/phaser',
    },
    {
        name: 'Three.js', author: 'Three.js contributors', license: 'MIT',
        sourceUrl: 'https://github.com/mrdoob/three.js',
    },
];
