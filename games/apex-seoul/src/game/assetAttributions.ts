/** Provenance records use repository-relative metadata paths, not bundled URLs. */
export type AssetAttribution = {
    id: string;
    origin: 'external' | 'project' | 'unknown';
    surfaces: readonly ('game' | 'vehicle-preview')[];
    name: string;
    author: string | null;
    license: string | null;
    licenseUrl: string | null;
    sourceUrl: string | null;
    acquiredAt: string | null;
    modification: string;
    metadataReferences: readonly string[];
    unresolved: readonly string[];
};

export const RUNTIME_ASSET_PROVENANCE = [
    {
        id: 'oga-moon', surfaces: ['game'], origin: 'external', name: 'Moon Overlay Texture', author: 'bart',
        license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://opengameart.org/content/moon-overlay-texture', acquiredAt: '2026-07-16',
        modification: 'Cropped and blue-tinted for the sky layer.',
        metadataReferences: ['assets/environment/source/oga-moon-overlay/README.md', 'assets/environment/approved/parallax-v1/README.md'],
        unresolved: [],
    },
    {
        id: 'oga-ridge', surfaces: ['game'], origin: 'external', name: 'Mountains and Trees Parallax Background Detail', author: 'Fupi',
        license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        sourceUrl: 'https://opengameart.org/content/mountains-and-trees-parallax-background-detail', acquiredAt: '2026-07-16',
        modification: 'Resized, composed, and converted to the black-blue ridge palette.',
        metadataReferences: ['assets/environment/source/oga-mountains-trees/README.md', 'assets/environment/approved/parallax-v1/README.md'], unresolved: [],
    },
    {
        id: 'oga-skyline', surfaces: ['game'], origin: 'external', name: 'Skyline Background', author: 'FabinhoSC',
        license: 'CC0 1.0 / Public Domain', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        sourceUrl: 'https://opengameart.org/content/skyline-background', acquiredAt: '2026-07-16',
        modification: 'Resized and palette-converted; light overlay generated from opaque building pixels.',
        metadataReferences: ['assets/environment/source/oga-skyline/README.md', 'assets/environment/source/oga-skyline/Read.txt', 'assets/environment/approved/parallax-v1/README.md'], unresolved: [],
    },
    {
        id: 'oga-clouds', surfaces: ['game'], origin: 'external', name: 'Clouds with Transparency', author: 'WickedInsignia',
        license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://opengameart.org/content/clouds-with-transparency-fxcloudalpha05png', acquiredAt: '2026-07-16',
        modification: 'Cropped and converted into a dark blue transparent cloud strip.',
        metadataReferences: ['assets/environment/source/oga-transparent-clouds/README.md', 'assets/environment/approved/parallax-v1/README.md'],
        unresolved: [],
    },
    {
        id: 'kenney-smoke', surfaces: ['game'], origin: 'external', name: 'Smoke Particle Assets', author: 'Kenney (Kenney.nl)',
        license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        sourceUrl: 'https://opengameart.org/content/smoke-particle-assets', acquiredAt: '2026-07-28',
        modification: 'Three white puff PNGs renamed; runtime scales, tints, rotates and fades them.',
        metadataReferences: ['assets/effects/approved/kenney-smoke-particle-assets/README.md'], unresolved: [],
    },
    {
        id: 'project-wall-forest', surfaces: ['game'], origin: 'project', name: 'Wall forest SVGs', author: null, license: null, licenseUrl: null,
        sourceUrl: null, acquiredAt: null, modification: 'Five project-owned transparent tree SVGs placed along the road.',
        metadataReferences: ['assets/environment/approved/parallax-v1/README.md'], unresolved: [],
    },
    {
        id: 'menu-hero', surfaces: ['game'], origin: 'project', name: 'Main menu hero', author: null, license: null, licenseUrl: null,
        sourceUrl: null, acquiredAt: '2026-09-07', modification: 'Generated with GPT ImageGen as confirmed by the user; WebP displayed as the main menu background.',
        metadataReferences: ['assets/ui/main-menu/apex-seoul-night-garage-hero.webp'],
        unresolved: [],
    },
    {
        id: 'raven-ft86-source', surfaces: ['game', 'vehicle-preview'], origin: 'external', name: 'Raven Coupe source model', author: 'Nieve5677', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://sketchfab.com/3d-models/toyota-gt86-f02c802c32994b2784fa182a9ed71f84', acquiredAt: '2026-06-28', modification: 'FT86 source rendered as pose sheets, resized, recolored, and used for vehicle shadows.',
        metadataReferences: ['assets/vehicles/optimized/toyota_gt86-optimized.glb', 'assets/vehicles/source/manifests/real-vehicle-7way-candidates.json', 'assets/vehicles/generated/7way-candidates/raven-coupe/source-17pose-512.json'],
        unresolved: [],
    },
    {
        id: 'seorin-stinger-source', surfaces: ['game', 'vehicle-preview'], origin: 'external', name: 'Seorin GT source model', author: 'Car2022', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://sketchfab.com/3d-models/kia-stinger-b1493e68069f4b869743de7a4220a4f4', acquiredAt: '2026-06-28', modification: 'Stinger-derived sprite master rendered as pose sheets, recolored, and used for shadows.',
        metadataReferences: ['assets/vehicles/optimized/kia_stinger-optimized.glb', 'assets/vehicles/source/manifests/real-vehicle-7way-candidates.json', 'assets/vehicles/generated/7way-candidates/seorin-gt/source-17pose-512.json', 'scripts/create-stinger-sprite-master.mjs'],
        unresolved: [],
    },
    {
        id: 'mirae-g70-nieve', surfaces: ['game', 'vehicle-preview'], origin: 'external', name: 'Genesis G70 vehicle source', author: 'Nieve5677',
        license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://sketchfab.com/3d-models/genesis-g70-509a72789a224bc894944638fc602426', acquiredAt: '2026-08-19T00:33:32.906Z',
        modification: 'Mirrored exhaust, removed markings and altered lamp and material roles; rendered and recolored into sprite and shadow sheets.',
        metadataReferences: ['assets/vehicles/optimized/genesis_g70_nieve-sprite-master-optimized.glb', 'assets/vehicles/genesis_g70_nieve.sketchfab.json', 'assets/vehicles/derived/genesis_g70_nieve-symmetric.json', 'assets/vehicles/derived/genesis_g70_nieve-sprite-master.json', 'assets/vehicles/generated/7way-candidates/mirae-gt/source-17pose-512.json'],
        unresolved: [],
    },
    {
        id: 'legacy-g70-poc', surfaces: ['game', 'vehicle-preview'], origin: 'external', name: 'Legacy G70 POC sprite', author: 'Lucas.Karlsmoen', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://sketchfab.com/3d-models/genesis-g70-ded2c8428fb9499ebd2bfc69c5592b02', acquiredAt: '2026-06-28', modification: 'Legacy G70 model rendered to a 128px sprite and shadow; loaded in startup and used as catalog fallback.',
        metadataReferences: ['assets/vehicles/optimized/genesis_g70-optimized.glb', 'assets/vehicles/source/manifests/real-vehicle-poc.json', 'assets/vehicles/approved/atlases/genesis-g70-poc-128.json'],
        unresolved: [],
    },
    {
        id: 'pwa-icons', surfaces: ['game'], origin: 'project', name: 'PWA icon artwork', author: null, license: null, licenseUrl: null,
        sourceUrl: null, acquiredAt: '2026-09-22', modification: 'Generated using GPT as confirmed by the user; SVG icon rasterized to 192px and 512px PNGs.',
        metadataReferences: ['public/icons/apex-seoul.svg', 'scripts/generate-pwa-icons.mjs'],
        unresolved: [],
    },
    {
        id: 'phaser', surfaces: ['game'], origin: 'external', name: 'Phaser', author: 'Photon Storm', license: 'MIT',
        licenseUrl: 'https://github.com/phaserjs/phaser/blob/master/LICENSE.md', sourceUrl: 'https://github.com/phaserjs/phaser', acquiredAt: null,
        modification: 'Bundled game framework.', metadataReferences: ['package.json', '../../node_modules/phaser/LICENSE.md'], unresolved: [],
    },
    {
        id: 'three', surfaces: ['vehicle-preview'], origin: 'external', name: 'Three.js', author: 'Three.js contributors', license: 'MIT',
        licenseUrl: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE', sourceUrl: 'https://github.com/mrdoob/three.js', acquiredAt: null,
        modification: 'Bundled by the separate vehicle preview entry.', metadataReferences: ['package.json', 'node_modules/three/LICENSE', 'src/vehicle-preview.ts'], unresolved: [],
    },
    {
        id: 'meshoptimizer', surfaces: ['vehicle-preview'], origin: 'external', name: 'meshoptimizer decoder', author: 'Arseny Kapoulkine', license: 'MIT',
        licenseUrl: 'https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md', sourceUrl: 'https://github.com/zeux/meshoptimizer', acquiredAt: null,
        modification: 'Decoder bundled via Three.js in the separate vehicle preview entry.',
        metadataReferences: ['node_modules/three/examples/jsm/libs/meshopt_decoder.module.js', 'src/vehicle-preview.ts'], unresolved: [],
    },
    {
        id: 'genesis-coupe-preview', surfaces: ['vehicle-preview'], origin: 'external', name: 'VEHICLE - Hyundai Genesis Coupe 3.8', author: 'Thcyrax',
        license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://sketchfab.com/3d-models/vehicle-hyundai-genesis-coupe-38-eac436f9b1a34e58843a72625b9b57b5', acquiredAt: '2026-08-18T04:08:42.376Z',
        modification: 'Optimized model loaded by the separate vehicle preview entry.',
        metadataReferences: ['assets/vehicles/optimized/genesis_coupe-optimized.glb', 'assets/vehicles/genesis_coupe.sketchfab.json', 'scripts/optimize-real-vehicle-models.mjs', 'src/vehicle-preview.ts'],
        unresolved: [],
    },
] as const satisfies readonly AssetAttribution[];

export type AttributionId = typeof RUNTIME_ASSET_PROVENANCE[number]['id'];

// The in-game credits cover game runtime sources. Preview-only sources remain in the provenance inventory.
export const ASSET_ATTRIBUTIONS: readonly AssetAttribution[] = RUNTIME_ASSET_PROVENANCE.filter(
    item => item.origin === 'external' && (item.surfaces as readonly string[]).includes('game'),
);
export const UNRESOLVED_RUNTIME_PROVENANCE = RUNTIME_ASSET_PROVENANCE.filter(item => item.unresolved.length > 0);

/** Resources outside the Phaser startup loader, identified by their repository paths. */
export const ADDITIONAL_RUNTIME_PROVENANCE: readonly { path: string; attributionIds: readonly AttributionId[]; entry: 'game' | 'vehicle-preview' }[] = [
    { path: 'public/icons/apex-seoul.svg', attributionIds: ['pwa-icons'], entry: 'game' },
    { path: 'public/icons/apex-seoul-192.png', attributionIds: ['pwa-icons'], entry: 'game' },
    { path: 'public/icons/apex-seoul-512.png', attributionIds: ['pwa-icons'], entry: 'game' },
    { path: '../../node_modules/phaser', attributionIds: ['phaser'], entry: 'game' },
    { path: 'node_modules/three', attributionIds: ['three', 'meshoptimizer'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/optimized/toyota_gt86-optimized.glb', attributionIds: ['raven-ft86-source'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/derived/kia_stinger-badge-debug.glb', attributionIds: ['seorin-stinger-source'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/derived/kia_stinger-sprite-master.glb', attributionIds: ['seorin-stinger-source'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/optimized/genesis_g70-optimized.glb', attributionIds: ['legacy-g70-poc'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/optimized/genesis_g70_nieve-sprite-master-optimized.glb', attributionIds: ['mirae-g70-nieve'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/optimized/genesis_g70_nieve-front-lamp-debug-optimized.glb', attributionIds: ['mirae-g70-nieve'], entry: 'vehicle-preview' },
    { path: 'assets/vehicles/optimized/genesis_coupe-optimized.glb', attributionIds: ['genesis-coupe-preview'], entry: 'vehicle-preview' },
];
