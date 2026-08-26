import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const supportedTargets = new Set(['hood', 'roof', 'rear']);
const analysisTarget = supportedTargets.has(process.argv[2]) ? process.argv[2] : 'rear';
const inputPath = path.resolve(projectRoot, 'assets/vehicles/optimized/kia_stinger-optimized.glb');
const outputPath = path.resolve(projectRoot, `assets/vehicles/derived/kia_stinger-${analysisTarget}-decoration-components.json`);
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

await MeshoptDecoder.ready;
const document = await io.read(inputPath);
await document.transform(dequantize());

const candidates = [];
for (const [nodeIndex, node] of document.getRoot().listNodes().filter((candidate) => candidate.getMesh()).entries()) {
    const mesh = node.getMesh();
    for (const [primitiveIndex, primitive] of mesh.listPrimitives().entries()) {
        if (primitive.getMode() !== 4) continue;
        const position = primitive.getAttribute('POSITION');
        const indices = primitive.getIndices()?.getArray();
        const positions = position?.getArray();
        if (!position || !indices || !positions) continue;
        for (const component of findComponents(indices, positions, node.getWorldMatrix())) {
            const [width, height, depth] = component.size;
            if (!isCandidateForTarget(component, analysisTarget)) continue;
            candidates.push({
                nodeIndex,
                node: node.getName(),
                mesh: mesh.getName(),
                primitiveIndex,
                material: primitive.getMaterial()?.getName() ?? null,
                triangleCount: component.triangleCount,
                bounds: component.bounds,
                center: component.center,
                size: component.size,
            });
        }
    }
}

candidates.sort((a, b) => a.size[0] * a.size[1] * a.size[2] - b.size[0] * b.size[1] * b.size[2]);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ input: path.relative(projectRoot, inputPath), candidates }, null, 2)}\n`);
console.log(`Wrote ${candidates.length} compact ${analysisTarget}-geometry candidates: ${path.relative(projectRoot, outputPath)}`);

function isCandidateForTarget(component, target) {
    const [x, y] = component.center;
    const [width, height, depth] = component.size;
    if (target === 'hood') {
        // The livery stripe is a narrow, centre-line overlay across the hood
        // and may continue across roof/trunk panels. Keep those candidates
        // without selecting the much wider body panels.
        return x > 6200 && x < 8800 && y > 5200
            && width < 2200 && height < 4200 && depth < 16000;
    }
    if (target === 'roof') {
        // Roof, rear glass and the roof livery occupy the upper-middle of the
        // source. Retain broad components here as the roof itself is wider
        // than individual body details.
        const [, y, z] = component.center;
        return y > 7000 && z > -30000 && z < -9000
            && width < 13000 && height < 3200 && depth < 13000;
    }
    // The rendered rear occupies the negative Z end of the source. Keep only
    // compact components there; body panels are intentionally omitted.
    return component.bounds.min[2] <= -30000
        && width <= 9000 && height <= 4000 && depth <= 5000;
}

function findComponents(indices, positions, matrix) {
    const triangleCount = Math.floor(indices.length / 3);
    const parent = new Int32Array(triangleCount);
    const rank = new Int8Array(triangleCount);
    const pointCache = new Map();
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
    // The export duplicates vertices at UV seams. Weld by quantised world
    // position for analysis only, otherwise every triangle looks detached.
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
        let leftRoot = find(left);
        let rightRoot = find(right);
        if (leftRoot === rightRoot) return;
        if (rank[leftRoot] < rank[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
        parent[rightRoot] = leftRoot;
        if (rank[leftRoot] === rank[rightRoot]) rank[leftRoot] += 1;
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

    const components = new Map();
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const root = find(triangle);
        let component = components.get(root);
        if (!component) {
            component = { bounds: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }, triangleCount: 0 };
            components.set(root, component);
        }
        component.triangleCount += 1;
        for (let corner = 0; corner < 3; corner += 1) {
            const point = getPoint(Number(indices[triangle * 3 + corner]));
            for (let axis = 0; axis < 3; axis += 1) {
                component.bounds.min[axis] = Math.min(component.bounds.min[axis], point[axis]);
                component.bounds.max[axis] = Math.max(component.bounds.max[axis], point[axis]);
            }
        }
    }

    return [...components.values()].map((component) => {
        const size = component.bounds.max.map((value, axis) => value - component.bounds.min[axis]);
        return {
            ...component,
            center: component.bounds.min.map((value, axis) => value + size[axis] / 2),
            size,
        };
    });
}
