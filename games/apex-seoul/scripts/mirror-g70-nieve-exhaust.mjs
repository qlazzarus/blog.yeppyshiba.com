import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'assets/vehicles/genesis_g70_nieve.glb');
const outputPath = path.resolve(projectRoot, 'assets/vehicles/derived/genesis_g70_nieve-symmetric.glb');
const sourceExhaustNodeNames = ['Object_178', 'Object_302'];
const exhaustCentersX = [-1.57, 1.57];

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular]);
const document = await io.read(inputPath);
const root = document.getRoot();
const nodes = root.listNodes();
const sourceChromeNode = getNode('Object_178');
const exhaustParent = getParent(sourceChromeNode);
const chromeMaterial = sourceChromeNode.getMesh().listPrimitives()[0].getMaterial();
const recessMaterial = root.listMaterials().find((material) => material.getName() === 'black_matt');

if (!chromeMaterial || !recessMaterial) throw new Error('Expected G70 Nieve exhaust materials were not found.');

// The original one-sided tip and long internal pipe sit below the bumper on the
// mirrored side. Replace both with short, matched rear LOD tips.
for (const sourceNodeName of sourceExhaustNodeNames) {
    const sourceNode = getNode(sourceNodeName);
    getParent(sourceNode).removeChild(sourceNode);
}

for (const centerX of exhaustCentersX) {
    exhaustParent.addChild(createExhaustNode(centerX, chromeMaterial, recessMaterial));
}

await mkdir(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
console.log(`Created symmetric G70 Nieve source model: ${path.relative(projectRoot, outputPath)}`);

function getNode(name) {
    const node = nodes.find((candidate) => candidate.getName() === name);
    if (!node?.getMesh()) throw new Error(`Expected G70 Nieve exhaust mesh node was not found: ${name}`);
    return node;
}

function getParent(node) {
    const parent = nodes.find((candidate) => candidate.listChildren().includes(node));
    if (!parent) throw new Error(`Expected parent node was not found: ${node.getName()}`);
    return parent;
}

function createExhaustNode(centerX, chromeMaterial, recessMaterial) {
    const side = centerX < 0 ? 'left' : 'right';
    const mesh = document.createMesh(`sprite_exhaust_${side}_mesh`);
    mesh.addPrimitive(createRecessPrimitive(centerX, recessMaterial));
    mesh.addPrimitive(createChromeRimPrimitive(centerX, chromeMaterial));
    return document.createNode(`sprite_exhaust_${side}`).setMesh(mesh);
}

function createRecessPrimitive(centerX, material) {
    const triangles = [];
    const center = [centerX, 0.115, -6.135];
    const segments = 16;
    for (let index = 0; index < segments; index += 1) {
        const start = (index / segments) * Math.PI * 2;
        const end = ((index + 1) / segments) * Math.PI * 2;
        triangles.push([center, ellipsePoint(center, 0.205, 0.068, start), ellipsePoint(center, 0.205, 0.068, end)]);
    }
    return createTrianglePrimitive('exhaust_recess', triangles, material);
}

function createChromeRimPrimitive(centerX, material) {
    const triangles = [];
    const frontCenter = [centerX, 0.115, -6.205];
    const backCenter = [centerX, 0.115, -6.145];
    const segments = 16;
    for (let index = 0; index < segments; index += 1) {
        const start = (index / segments) * Math.PI * 2;
        const end = ((index + 1) / segments) * Math.PI * 2;
        const frontOuterStart = ellipsePoint(frontCenter, 0.25, 0.092, start);
        const frontOuterEnd = ellipsePoint(frontCenter, 0.25, 0.092, end);
        const frontInnerStart = ellipsePoint(frontCenter, 0.17, 0.052, start);
        const frontInnerEnd = ellipsePoint(frontCenter, 0.17, 0.052, end);
        const backOuterStart = ellipsePoint(backCenter, 0.25, 0.092, start);
        const backOuterEnd = ellipsePoint(backCenter, 0.25, 0.092, end);
        const backInnerStart = ellipsePoint(backCenter, 0.17, 0.052, start);
        const backInnerEnd = ellipsePoint(backCenter, 0.17, 0.052, end);

        triangles.push([frontOuterStart, frontOuterEnd, frontInnerEnd], [frontOuterStart, frontInnerEnd, frontInnerStart]);
        triangles.push([frontOuterStart, backOuterStart, backOuterEnd], [frontOuterStart, backOuterEnd, frontOuterEnd]);
        triangles.push([frontInnerStart, frontInnerEnd, backInnerEnd], [frontInnerStart, backInnerEnd, backInnerStart]);
    }
    return createTrianglePrimitive('exhaust_chrome_rim', triangles, material);
}

function ellipsePoint([centerX, centerY, centerZ], radiusX, radiusY, angle) {
    return [centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY, centerZ];
}

function createTrianglePrimitive(name, triangles, material) {
    const positions = [];
    const normals = [];
    for (const worldTriangle of triangles) {
        const localTriangle = worldTriangle.map(toParentLocal);
        const normal = triangleNormal(...localTriangle);
        for (const point of localTriangle) {
            positions.push(...point);
            normals.push(...normal);
        }
    }

    return document
        .createPrimitive(name)
        .setAttribute('POSITION', document.createAccessor(`${name}_position`).setType('VEC3').setArray(new Float32Array(positions)))
        .setAttribute('NORMAL', document.createAccessor(`${name}_normal`).setType('VEC3').setArray(new Float32Array(normals)))
        .setMaterial(material);
}

// The parent has the Sketchfab Y-up conversion rotation. Authoring in vehicle
// world coordinates makes the bumper offset clear, then converts to parent-local.
function toParentLocal([x, y, z]) {
    return [x, z, -y];
}

function triangleNormal(a, b, c) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const length = Math.hypot(...normal) || 1;
    return normal.map((value) => value / length);
}
