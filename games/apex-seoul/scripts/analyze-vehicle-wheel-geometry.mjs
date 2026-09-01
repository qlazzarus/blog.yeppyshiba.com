import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const vehicles = {
    'mirae-gt': 'assets/vehicles/optimized/genesis_g70_nieve-sprite-master-optimized.glb',
    'raven-coupe': 'assets/vehicles/optimized/toyota_gt86-optimized.glb',
    'seorin-gt': 'assets/vehicles/derived/kia_stinger-sprite-master.glb',
};
const requestedVehicle = process.argv[2] ?? null;

if (requestedVehicle && !vehicles[requestedVehicle]) {
    throw new Error(`Unknown vehicle: ${requestedVehicle}. Expected ${Object.keys(vehicles).join(', ')}.`);
}

const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

await MeshoptDecoder.ready;

for (const [vehicleId, relativeInput] of Object.entries(vehicles)) {
    if (requestedVehicle && vehicleId !== requestedVehicle) continue;
    const document = await io.read(path.resolve(projectRoot, relativeInput));
    await document.transform(dequantize());
    const components = listGeometryComponents(document);
    const outputPath = path.resolve(
        projectRoot,
        `assets/vehicles/generated/7way-candidates/${vehicleId}/wheel-geometry-analysis.json`,
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
        componentCount: components.length,
        components,
        input: relativeInput,
        vehicleId,
    }, null, 2)}\n`);
    console.log(`Wrote ${components.length} geometry components: ${path.relative(projectRoot, outputPath)}`);
}

function listGeometryComponents(document) {
    const components = [];
    for (const node of document.getRoot().listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const [primitiveIndex, primitive] of mesh.listPrimitives().entries()) {
            if (primitive.getMode() !== 4) continue;
            const position = primitive.getAttribute('POSITION');
            const indices = primitive.getIndices();
            if (!position || !indices) continue;
            for (const component of findComponents(indices.getArray(), position.getArray(), node.getWorldMatrix())) {
                if (component.triangleCount < 24) continue;
                components.push({
                    ...component,
                    material: primitive.getMaterial()?.getName() ?? null,
                    mesh: mesh.getName() || null,
                    node: node.getName() || null,
                    primitiveIndex,
                });
            }
        }
    }
    return components.sort((left, right) => right.triangleCount - left.triangleCount);
}

function findComponents(indices, positions, matrix) {
    const triangleCount = Math.floor(indices.length / 3);
    const parent = new Int32Array(triangleCount);
    const rank = new Int8Array(triangleCount);
    const ownerByPosition = new Map();
    const pointCache = new Map();

    const getPoint = (vertex) => {
        const cached = pointCache.get(vertex);
        if (cached) return cached;
        const offset = vertex * 3;
        const point = [
            matrix[0] * positions[offset] + matrix[4] * positions[offset + 1] + matrix[8] * positions[offset + 2] + matrix[12],
            matrix[1] * positions[offset] + matrix[5] * positions[offset + 1] + matrix[9] * positions[offset + 2] + matrix[13],
            matrix[2] * positions[offset] + matrix[6] * positions[offset + 1] + matrix[10] * positions[offset + 2] + matrix[14],
        ];
        pointCache.set(vertex, point);
        return point;
    };
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

    for (let triangle = 0; triangle < triangleCount; triangle += 1) parent[triangle] = triangle;
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
            component = { bounds: { max: [-Infinity, -Infinity, -Infinity], min: [Infinity, Infinity, Infinity] }, triangleCount: 0 };
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
