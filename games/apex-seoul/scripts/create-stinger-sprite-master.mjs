import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'assets/vehicles/optimized/kia_stinger-optimized.glb');
const outputPath = path.resolve(projectRoot, 'assets/vehicles/derived/kia_stinger-sprite-master.glb');
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const document = await io.read(inputPath);
await document.transform(dequantize());
const root = document.getRoot();
let removedPrimitiveCount = 0;
let removedNodeCount = 0;

// texture-09.webp is the extracted KIA emblem image. In the glTF texture
// table it is referenced by material_1 (not material_2_1: image and texture
// indices differ because EXT_texture_webp redirects the source image).
// Remove that emblem primitive instead of repainting a shared texture.
for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const primitive of [...mesh.listPrimitives()]) {
        if (primitive.getMaterial()?.getName() !== 'material_1') continue;
        mesh.removePrimitive(primitive);
        removedPrimitiveCount += 1;
    }
    if (mesh.listPrimitives().length > 0) continue;
    const parent = [
        ...root.listNodes(),
        ...root.listScenes(),
    ].find((candidate) => candidate.listChildren().includes(node));
    parent?.removeChild(node);
    node.dispose();
    removedNodeCount += 1;
}

const rearDecorationRemoval = removeRearDecorationComponents(document, root);
const rearLipSpoilerRemoval = removeRearLipSpoiler(document, root);
const rearSideMarkerRemoval = removeRearSideMarkers(document, root);
const stripeMaterial = root.listMaterials().find((material) => material.getName() === 'material_5');
if (!stripeMaterial) throw new Error('Could not find the Stinger body stripe material (material_5).');
const sidePaintMaterial = root.listMaterials().find((material) => material.getName() === 'material_7');
if (!sidePaintMaterial) throw new Error('Could not find the Stinger side-paint material (material_7).');

// The white centre stripe is baked into material_5's base-colour map.
// PaletteMaterial001~006 look like paint, but their shared palette texture
// also carries alpha/overlay information for the model; keep those intact.
stripeMaterial.setBaseColorTexture(null);
stripeMaterial.setBaseColorFactor([1, 1, 1, 1]);
// material_7 is the otherwise grey door/side-panel layer. It has no texture
// and is independent from glass, wheels and the retained black roof surfaces.
sidePaintMaterial.setBaseColorFactor([1, 1, 1, 1]);
const rearConnectorSimplification = simplifyRearConnectorTriangles(document, root, stripeMaterial);

await mkdir(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
console.log(`Created Stinger sprite art master: ${path.relative(projectRoot, outputPath)}`);
console.log(`Removed KIA emblem primitives: ${removedPrimitiveCount}; empty nodes: ${removedNodeCount}`);
console.log(`Removed rear plate/lettering components: ${rearDecorationRemoval.componentCount}; triangles: ${rearDecorationRemoval.triangleCount}`);
console.log(`Removed rear lip-spoiler components: ${rearLipSpoilerRemoval.componentCount}; triangles: ${rearLipSpoilerRemoval.triangleCount}`);
console.log(`Removed rear outer red-marker components: ${rearSideMarkerRemoval.componentCount}; triangles: ${rearSideMarkerRemoval.triangleCount}`);
console.log(`Simplified rear-centre connector triangles: ${rearConnectorSimplification.triangleCount}`);
console.log('Removed the baked centre stripe and set body/side paint materials to solid white.');

function simplifyRearConnectorTriangles(document, root, bodyPaintMaterial) {
    let triangleCount = 0;
    for (const node of root.listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const primitive of [...mesh.listPrimitives()]) {
            // material_3 carries the dark lamp layer; material_2 carries the
            // textured lamp face. Reassign only their unwanted extensions.
            const materialName = primitive.getMaterial()?.getName();
            if (primitive.getMode() !== 4 || !['material_2', 'material_3', 'PaletteMaterial002'].includes(materialName)) continue;
            const position = primitive.getAttribute('POSITION');
            const index = primitive.getIndices();
            const positions = position?.getArray();
            const indices = index?.getArray();
            if (!position || !index || !positions || !indices) continue;
            const matrix = node.getWorldMatrix();
            const connectorIndices = [];
            const retainedIndices = [];
            for (let triangle = 0; triangle < Math.floor(indices.length / 3); triangle += 1) {
                const centroid = getTriangleCentroid(indices, positions, triangle, matrix);
                const isCentralConnector = materialName === 'material_3' && isRearConnectorTriangle(centroid);
                const isOuterLampExtension = ['material_2', 'material_3'].includes(materialName)
                    && isRearOuterLampExtension(centroid);
                const isRearPanelLine = materialName === 'PaletteMaterial002'
                    && isRearPanelLineTriangle(centroid);
                const destination = isCentralConnector || isOuterLampExtension || isRearPanelLine
                    ? connectorIndices
                    : retainedIndices;
                destination.push(indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2]);
            }
            if (connectorIndices.length === 0) continue;
            triangleCount += connectorIndices.length / 3;
            primitive.setIndices(document.createAccessor('stinger-rear-connector-retained-index')
                .setType('SCALAR')
                .setArray(new Uint32Array(retainedIndices)));
            const connectorPrimitive = document.createPrimitive()
                .setMode(primitive.getMode())
                .setMaterial(bodyPaintMaterial)
                .setIndices(document.createAccessor('stinger-rear-connector-white-index')
                    .setType('SCALAR')
                    .setArray(new Uint32Array(connectorIndices)));
            for (const semantic of ['POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0']) {
                const attribute = primitive.getAttribute(semantic);
                if (attribute) connectorPrimitive.setAttribute(semantic, attribute);
            }
            mesh.addPrimitive(connectorPrimitive);
        }
    }
    return { triangleCount };
}

function getTriangleCentroid(indices, positions, triangle, matrix) {
    const point = (vertex) => {
        const offset = Number(vertex) * 3;
        const x = positions[offset];
        const y = positions[offset + 1];
        const z = positions[offset + 2];
        return [
            matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
            matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
            matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
        ];
    };
    const start = triangle * 3;
    const a = point(indices[start]);
    const b = point(indices[start + 1]);
    const c = point(indices[start + 2]);
    return [
        (a[0] + b[0] + c[0]) / 3,
        (a[1] + b[1] + c[1]) / 3,
        (a[2] + b[2] + c[2]) / 3,
    ];
}

function isRearConnectorTriangle([x, y, z]) {
    // The rear central bar occupies the inner span at the high tail-lamp
    // elevation. This keeps the outer lamp clusters intact and paints over
    // the connector rather than deleting surfaces (so no trunk hole results).
    return z < -33000
        && x > 4500 && x < 10800
        && y > 6100 && y < 6700;
}

function isRearOuterLampExtension([x, y, z]) {
    // The remaining red quarter-panel line is in the forward, outboard tail
    // lamp texture projection. Preserve the core lamp at the trunk side and
    // repaint only this narrow extension to body colour.
    return (x < 4200 || x > 10800)
        && y > 5650 && y < 6250
        && z > -33400 && z < -32600;
}

function isRearPanelLineTriangle([x, y, z]) {
    // Picked directly in the preview: PaletteMaterial002 / Material2 / face
    // 9929 has centroid (13428, 5732, -31318). This narrow mirrored band is
    // the red rear-quarter-panel line, embedded in a large connected mesh.
    const isPrimaryBand = (x < 2200 || x > 12800)
        && y > 5500 && y < 5900
        && z > -32500 && z < -30500;
    // The remaining picked face (Material2 / PaletteMaterial002 / face 9944)
    // is a separate, outer tip at (14224, 6466, -13153).
    const isOuterTip = (x < 900 || x > 14000)
        && y > 6300 && y < 6650
        && z > -13700 && z < -12700;
    return isPrimaryBand || isOuterTip;
}

function removeRearLipSpoiler(document, root) {
    let componentCount = 0;
    let triangleCount = 0;
    for (const node of root.listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const primitive of mesh.listPrimitives()) {
            // The lip spoiler is a detached, low-height, full-width black
            // component above the rear lamps. It is not part of the trunk lid.
            if (primitive.getMode() !== 4 || primitive.getMaterial()?.getName() !== 'PaletteMaterial003') continue;
            const position = primitive.getAttribute('POSITION');
            const indices = primitive.getIndices()?.getArray();
            const positions = position?.getArray();
            if (!position || !indices || !positions) continue;
            const components = findTriangleComponents(indices, positions, node.getWorldMatrix());
            const spoilerRoots = new Set();
            for (const component of components.values()) {
                if (!isRearLipSpoiler(component)) continue;
                spoilerRoots.add(component.root);
                componentCount += 1;
                triangleCount += component.triangles.length;
            }
            if (spoilerRoots.size === 0) continue;
            const kept = [];
            for (let triangle = 0; triangle < Math.floor(indices.length / 3); triangle += 1) {
                if (spoilerRoots.has(components.triangleRoots[triangle])) continue;
                kept.push(indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2]);
            }
            primitive.setIndices(document.createAccessor('stinger-rear-lip-spoiler-removed-index')
                .setType('SCALAR')
                .setArray(new Uint32Array(kept)));
        }
    }
    return { componentCount, triangleCount };
}

function isRearLipSpoiler(component) {
    const [x, y, z] = component.center;
    const [width, height, depth] = component.size;
    return x > 7000 && x < 8100
        && y > 6500 && y < 7200
        && z < -33000
        && width > 7000 && width < 9000
        && height < 700 && depth > 1000 && depth < 2000;
}

function removeRearSideMarkers(document, root) {
    let componentCount = 0;
    let triangleCount = 0;
    for (const node of root.listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const primitive of mesh.listPrimitives()) {
            const materialName = primitive.getMaterial()?.getName();
            // These paired primitives are rear-side reflector details. The
            // short pieces sit beside the lamps; the long pieces run forward
            // across each rear quarter panel. Both are independent of lamps.
            if (primitive.getMode() !== 4 || !['material_4', 'material_4_0', 'PaletteMaterial001'].includes(materialName)) continue;
            const position = primitive.getAttribute('POSITION');
            const indices = primitive.getIndices()?.getArray();
            const positions = position?.getArray();
            if (!position || !indices || !positions) continue;
            const components = findTriangleComponents(indices, positions, node.getWorldMatrix());
            const markerRoots = new Set();
            for (const component of components.values()) {
                if (!isRearSideMarker(component, materialName)) continue;
                markerRoots.add(component.root);
                componentCount += 1;
                triangleCount += component.triangles.length;
            }
            if (markerRoots.size === 0) continue;
            const kept = [];
            for (let triangle = 0; triangle < Math.floor(indices.length / 3); triangle += 1) {
                if (markerRoots.has(components.triangleRoots[triangle])) continue;
                kept.push(indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2]);
            }
            primitive.setIndices(document.createAccessor('stinger-rear-side-marker-removed-index')
                .setType('SCALAR')
                .setArray(new Uint32Array(kept)));
        }
    }
    return { componentCount, triangleCount };
}

function isRearSideMarker(component, materialName) {
    const [x, y, z] = component.center;
    const [width, height, depth] = component.size;
    const isOuterSide = x < 2300 || x > 12700;
    const isShortLampMarker = isOuterSide
        && y > 5650 && y < 5850
        && z > -32850 && z < -32500
        && width < 150 && height < 150 && depth < 300;
    // This is the visible red strip in the review: a long, low-height
    // component extending forward from each outer tail lamp.
    const isLongQuarterPanelStrip = isOuterSide
        && y > 5600 && y < 5900
        && z > -33300 && z < -30500
        && width < 800 && height < 300
        && depth > 2000 && depth < 3000;
    // The remaining line is a sequence of thin PaletteMaterial001 strips on
    // the rear quarter panels, not part of the tail-lamp meshes.
    const isPaletteQuarterPanelLine = materialName === 'PaletteMaterial001'
        // The line is inset from the absolute body edge (x≈3.4k / 11.6k),
        // so it requires a separate, wider left/right range.
        && (x < 4000 || x > 11000)
        && y > 5800 && y < 6150
        && z > -32000 && z < -30000
        && width < 100 && height < 180
        && depth > 1400 && depth < 1900;
    // Short, separate overlays immediately beyond the tail-lamp housings.
    // These are the remaining red ends visible after the long side strip is
    // removed; the lamp face itself remains in material_2/material_3.
    const isPaletteOuterLampExtension = materialName === 'PaletteMaterial001'
        && (x < 3300 || x > 12000)
        && y > 5850 && y < 6150
        && z > -33550 && z < -33100
        && width < 250 && height < 120 && depth < 250;
    return isShortLampMarker
        || isLongQuarterPanelStrip
        || isPaletteQuarterPanelLine
        || isPaletteOuterLampExtension;
}

function removeRearDecorationComponents(document, root) {
    let componentCount = 0;
    let triangleCount = 0;
    for (const node of root.listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const primitive of mesh.listPrimitives()) {
            if (primitive.getMode() !== 4) continue;
            const position = primitive.getAttribute('POSITION');
            const index = primitive.getIndices();
            const positions = position?.getArray();
            const indices = index?.getArray();
            if (!position || !index || !positions || !indices) continue;
            const components = findTriangleComponents(indices, positions, node.getWorldMatrix());
            const removableRoots = new Set();
            for (const component of components.values()) {
                if (!isRearPlateOrLettering(component)) continue;
                removableRoots.add(component.root);
                componentCount += 1;
                triangleCount += component.triangles.length;
            }
            if (removableRoots.size === 0) continue;
            const kept = [];
            for (let triangle = 0; triangle < Math.floor(indices.length / 3); triangle += 1) {
                if (removableRoots.has(components.triangleRoots[triangle])) continue;
                kept.push(indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2]);
            }
            primitive.setIndices(document.createAccessor('stinger-rear-cleanup-index')
                .setType('SCALAR')
                .setArray(new Uint32Array(kept)));
        }
    }
    return { componentCount, triangleCount };
}

function isRearPlateOrLettering(component) {
    const [x, y, z] = component.center;
    const [width, height, depth] = component.size;
    const isPlate = x > 6100 && x < 8950 && y > 3500 && y < 5250 && z < -34200
        && width < 2400 && height < 1200 && depth < 900;
    const isLeftLettering = x > 3800 && x < 5000 && y > 5000 && y < 5600 && z < -34000
        && width < 1500 && height < 500 && depth < 500;
    const isRightLettering = x > 9800 && x < 11200 && y > 5000 && y < 5600 && z < -34000
        && width < 1500 && height < 500 && depth < 500;
    return isPlate || isLeftLettering || isRightLettering;
}

function findTriangleComponents(indices, positions, matrix) {
    const triangleCount = Math.floor(indices.length / 3);
    const parent = new Int32Array(triangleCount);
    const rank = new Int8Array(triangleCount);
    const pointCache = new Map();
    const ownerByPosition = new Map();
    for (let triangle = 0; triangle < triangleCount; triangle += 1) parent[triangle] = triangle;
    const find = (value) => {
        let current = value;
        while (parent[current] !== current) {
            parent[current] = parent[parent[current]];
            current = parent[current];
        }
        return current;
    };
    const join = (left, right) => {
        let a = find(left);
        let b = find(right);
        if (a === b) return;
        if (rank[a] < rank[b]) [a, b] = [b, a];
        parent[b] = a;
        if (rank[a] === rank[b]) rank[a] += 1;
    };
    const getPoint = (vertex) => {
        const cached = pointCache.get(vertex);
        if (cached) return cached;
        const offset = vertex * 3;
        const x = positions[offset];
        const y = positions[offset + 1];
        const z = positions[offset + 2];
        const point = [
            matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
            matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
            matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
        ];
        pointCache.set(vertex, point);
        return point;
    };
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        for (let corner = 0; corner < 3; corner += 1) {
            const vertex = Number(indices[triangle * 3 + corner]);
            const key = getPoint(vertex).map((value) => Math.round(value * 10)).join(',');
            const owner = ownerByPosition.get(key);
            if (owner === undefined) ownerByPosition.set(key, triangle);
            else join(triangle, owner);
        }
    }
    const componentByRoot = new Map();
    const triangleRoots = new Int32Array(triangleCount);
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const root = find(triangle);
        triangleRoots[triangle] = root;
        let component = componentByRoot.get(root);
        if (!component) {
            component = { root, triangles: [], bounds: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] } };
            componentByRoot.set(root, component);
        }
        component.triangles.push(triangle);
        for (let corner = 0; corner < 3; corner += 1) {
            const point = getPoint(Number(indices[triangle * 3 + corner]));
            for (let axis = 0; axis < 3; axis += 1) {
                component.bounds.min[axis] = Math.min(component.bounds.min[axis], point[axis]);
                component.bounds.max[axis] = Math.max(component.bounds.max[axis], point[axis]);
            }
        }
    }
    for (const component of componentByRoot.values()) {
        component.size = component.bounds.max.map((value, axis) => value - component.bounds.min[axis]);
        component.center = component.bounds.min.map((value, axis) => value + component.size[axis] / 2);
    }
    componentByRoot.triangleRoots = triangleRoots;
    return componentByRoot;
}
