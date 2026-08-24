import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'assets/vehicles/derived/genesis_g70_nieve-symmetric.glb');
const outputPath = path.resolve(projectRoot, 'assets/vehicles/derived/genesis_g70_nieve-front-lamp-debug.glb');
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular]);
const document = await io.read(inputPath);

// One color per source layer. This is intentionally a diagnostic asset: it
// lets us identify the mesh that owns the still-visible outer lamp contour.
const debugLayers = new Map([
    ['Object_182', [1, 0.12, 0.12, 1]],
    ['Object_184', [1, 0.55, 0.08, 1]],
    ['Object_208', [0.18, 0.95, 0.35, 1]],
    ['Object_228', [0.68, 0.25, 1, 1]],
    ['Object_264', [0.05, 0.85, 1, 1]],
    ['Object_306', [1, 0.9, 0.08, 1]],
    // These front-facing dark trim layers share the lamp's bounds and are
    // the remaining candidates for the outer contour seen in the first pass.
    ['Object_102', [0.95, 0.08, 0.72, 1]],
    ['Object_106', [0.08, 1, 0.72, 1]],
    ['Object_108', [0.08, 0.42, 1, 1]],
    ['Object_110', [1, 0.3, 0.08, 1]],
    ['Object_112', [0.72, 0.12, 1, 1]],
]);

for (const node of document.getRoot().listNodes()) {
    const color = debugLayers.get(node.getName());
    const mesh = node.getMesh();
    if (!color || !mesh) continue;
    for (const primitive of mesh.listPrimitives()) {
        const material = document.createMaterial(`debug-${node.getName()}`)
            .setBaseColorFactor(color)
            .setMetallicFactor(0)
            .setRoughnessFactor(0.38)
            .setEmissiveFactor(color.slice(0, 3).map((channel) => channel * 0.18));
        primitive.setMaterial(material);
    }
}

await io.write(outputPath, document);
console.log(`Created G70 Nieve front-lamp layer debug asset: ${outputPath}`);
