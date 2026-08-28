import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

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
    .registerDependencies({
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

for (const [vehicleId, relativeInput] of Object.entries(vehicles)) {
    if (requestedVehicle && vehicleId !== requestedVehicle) continue;
    const wheelDocument = await readDequantized(relativeInput);
    const selected = filterWheelGeometry(wheelDocument, vehicleId, true);
    const occluderDocument = await readDequantized(relativeInput);
    const occluder = filterWheelGeometry(occluderDocument, vehicleId, false);
    const outputPath = path.resolve(projectRoot, `assets/vehicles/derived/wheel-role-${vehicleId}.glb`);
    const occluderPath = path.resolve(projectRoot, `assets/vehicles/derived/wheel-occluder-${vehicleId}.glb`);
    const reportPath = path.resolve(projectRoot, `assets/vehicles/generated/7way-candidates/${vehicleId}/wheel-role-model.qa.json`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await mkdir(path.dirname(reportPath), { recursive: true });
    await io.write(outputPath, wheelDocument);
    await io.write(occluderPath, occluderDocument);
    await writeFile(reportPath, `${JSON.stringify({
        input: relativeInput,
        output: path.relative(projectRoot, outputPath),
        occluderOutput: path.relative(projectRoot, occluderPath),
        occluder,
        selected,
        vehicleId,
    }, null, 2)}\n`);
    console.log(`Created wheel-role model (${selected.componentCount} components, ${selected.triangleCount} triangles): ${path.relative(projectRoot, outputPath)}`);
    console.log(`Created wheel occluder (${occluder.componentCount} components removed, ${occluder.triangleCount} triangles removed): ${path.relative(projectRoot, occluderPath)}`);
}

async function readDequantized(relativeInput) {
    const document = await io.read(path.resolve(projectRoot, relativeInput));
    await document.transform(dequantize());
    return document;
}

function filterWheelGeometry(document, vehicleId, keepWheels) {
    let componentCount = 0;
    let triangleCount = 0;
    const selectedComponents = [];
    for (const node of document.getRoot().listNodes()) {
        const mesh = node.getMesh();
        if (!mesh) continue;
        for (const primitive of [...mesh.listPrimitives()]) {
            if (primitive.getMode() !== 4) {
                mesh.removePrimitive(primitive);
                continue;
            }
            const position = primitive.getAttribute('POSITION');
            const index = primitive.getIndices();
            if (!position || !index) {
                mesh.removePrimitive(primitive);
                continue;
            }
            const indices = index.getArray();
            const material = primitive.getMaterial()?.getName() ?? null;
            const components = findComponents(indices, position.getArray(), node.getWorldMatrix());
            const matchingComponents = components.filter((component) => isWheelComponent(vehicleId, material, component));
            if (keepWheels && matchingComponents.length === 0) {
                mesh.removePrimitive(primitive);
                continue;
            }
            if (!keepWheels && matchingComponents.length === 0) continue;
            const selectedSet = new Set(matchingComponents.flatMap((component) => component.triangles));
            const retainedTriangles = keepWheels
                ? [...selectedSet]
                : Array.from({ length: Math.floor(indices.length / 3) }, (_, triangle) => triangle)
                    .filter((triangle) => !selectedSet.has(triangle));
            if (retainedTriangles.length === 0) {
                mesh.removePrimitive(primitive);
                continue;
            }
            const selectedIndices = new indices.constructor(retainedTriangles.flatMap((triangle) => [
                indices[triangle * 3], indices[triangle * 3 + 1], indices[triangle * 3 + 2],
            ]));
            primitive.setIndices(document.createAccessor().setType('SCALAR').setArray(selectedIndices));
            for (const component of matchingComponents) {
                componentCount += 1;
                triangleCount += component.triangleCount;
                selectedComponents.push({
                    bounds: component.bounds,
                    center: component.center,
                    material,
                    node: node.getName() || null,
                    size: component.size,
                    triangleCount: component.triangleCount,
                });
            }
        }
    }
    return { componentCount, components: selectedComponents, triangleCount };
}

function isWheelComponent(vehicleId, material, component) {
    const [x, y, z] = component.center;
    const [width, height, depth] = component.size;
    if (vehicleId === 'raven-coupe') {
        return material === 'PaletteMaterial001'
            && component.triangleCount > 1_500
            && Math.abs(x) > 45 && y < 30 && Math.abs(z) > 55
            && height > 30 && depth > 30;
    }
    if (vehicleId === 'seorin-gt') {
        // Seorin's tyre sidewall, rim and brake geometry use different
        // materials. Selecting only Tyre_Side/Profiel02 left the exposed rim
        // and spokes in body.png, so a body palette pass broke the rear wheel.
        // The master has four compact, disconnected wheel assemblies at the
        // outer X positions and two axle Z bands. Keep that assembly envelope
        // narrow enough to reject the adjacent fender/body panels.
        const isOuterWheelSide = x < 3_000 || x > 12_000;
        const isWheelAxle = Math.abs(z + 6_300) < 2_800 || Math.abs(z + 27_250) < 2_800;
        // The ~3,650-unit rings at each hub are the overfender/mudguard
        // shells, not the wheel. Keep them in the non-wheel occluder/body
        // role; rim, brake and spoke components stay within 3,400 units.
        const isCompactAssembly = width < 1_000 && height > 1_400 && height < 3_400
            && depth > 1_400 && depth < 3_400 && component.triangleCount >= 80;
        return (material === 'Tyre_Side' || material === 'Profiel02')
            || (isOuterWheelSide && isWheelAxle && y > -500 && y < 5_000 && isCompactAssembly);
    }
    // Mirae GT keeps tyre, rim and brake geometry in several palette
    // materials, but all wheel components share the four outer, low centres.
    return [
        'PaletteMaterial002', 'PaletteMaterial003', 'PaletteMaterial007',
        'PaletteMaterial008', 'PaletteMaterial020', 'PaletteMaterial021',
    ].includes(material)
        && Math.abs(x) > 1.5 && Math.abs(z) > 3 && y < 0.25
        && width < 1 && height < 2 && depth < 2;
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
            component = {
                bounds: { max: [-Infinity, -Infinity, -Infinity], min: [Infinity, Infinity, Infinity] },
                triangles: [],
                triangleCount: 0,
            };
            components.set(root, component);
        }
        component.triangles.push(triangle);
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
