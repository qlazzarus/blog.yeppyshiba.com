import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'assets/vehicles/optimized/kia_stinger-optimized.glb');
const outputPath = path.resolve(projectRoot, 'assets/vehicles/derived/kia_stinger-badge-debug.glb');
const reportPath = path.resolve(projectRoot, 'assets/vehicles/derived/kia_stinger-badge-debug.json');
const textureDir = path.resolve(projectRoot, 'assets/vehicles/derived/kia_stinger-texture-debug');
const highlightedLayers = new Set((process.env.STINGER_DEBUG_LAYERS ?? '19')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter(Number.isInteger));
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
    // The optimized source requires meshopt, WebP, and quantization. Register
    // the complete standard extension set so a future optimize pass cannot
    // make this diagnostic script unreadable by adding another required one.
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });
const document = await io.read(inputPath);
const nodes = document.getRoot().listNodes().filter((node) => node.getMesh());
const sourceBounds = getBounds(document.getRoot().listScenes()[0]);

for (const [index, node] of nodes.entries()) {
    if (highlightedLayers.has(index)) node.setName(`debug-layer-${index}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
await mkdir(textureDir, { recursive: true });
const textures = document.getRoot().listTextures();
const textureReport = [];
for (const [index, texture] of textures.entries()) {
    const image = texture.getImage();
    if (!image) continue;
    const mimeType = texture.getMimeType() ?? 'image/webp';
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'webp';
    const fileName = `texture-${String(index).padStart(2, '0')}.${extension}`;
    await writeFile(path.join(textureDir, fileName), image);
    textureReport.push({ index, name: texture.getName(), mimeType, file: fileName });
}
await writeFile(reportPath, `${JSON.stringify({
    sourceBounds,
    textures: textureReport,
    materials: document.getRoot().listMaterials().map((material) => ({
        name: material.getName(),
        baseColorFactor: material.getBaseColorFactor(),
        baseColorTexture: (() => {
            const texture = material.getBaseColorTexture();
            const index = document.getRoot().listTextures().indexOf(texture);
            return index === -1 ? null : index;
        })(),
    })),
    layers: nodes.map((node, index) => {
        const bounds = getBounds(node);
        const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
        return {
            index,
            name: node.getName(),
            mesh: node.getMesh()?.getName(),
            materials: [...new Set(node.getMesh()?.listPrimitives()
                .map((primitive) => primitive.getMaterial()?.getName() ?? null))],
            bounds,
            size,
        };
    }),
}, null, 2)}\n`);
console.log(`Created Stinger badge/plate layer debug asset: ${path.relative(projectRoot, outputPath)}`);
console.log(`Highlighted layers: ${[...highlightedLayers].join(', ') || '(none)'}`);
console.log(`Wrote Stinger layer bounds report: ${path.relative(projectRoot, reportPath)}`);
console.log(`Extracted ${textureReport.length} embedded textures: ${path.relative(projectRoot, textureDir)}`);
