import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.resolve(projectRoot, 'assets/vehicles/derived/genesis_g70_nieve-symmetric.glb');
const outputPath = path.resolve(projectRoot, 'assets/vehicles/derived/genesis_g70_nieve-sprite-master.glb');
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular]);
const document = await io.read(inputPath);
const root = document.getRoot();
const nodes = root.listNodes();
const rearBadgeNodeNames = new Set(['Object_162', 'Object_180', 'Object_232', 'Object_300']);
const rearLampGeometryNodeName = 'Object_212';
const rearLampLayerNodeNames = new Set([
    'Object_174', 'Object_220', 'Object_224', 'Object_226',
    'Object_276', 'Object_280', 'Object_282', 'Object_284', 'Object_286', 'Object_288', 'Object_290',
]);
const frontLampGeometryNodeName = 'Object_264';
const frontLampLayerNodeNames = new Set(['Object_182', 'Object_184', 'Object_208', 'Object_228', 'Object_306']);
const frontLampHousingSourceMesh = nodes.find((node) => node.getName() === 'Object_182')?.getMesh();
const frontLampBodySourceMesh = nodes.find((node) => node.getName() === 'Object_124')?.getMesh();

// Keep the G70 silhouette, but remove explicit real-world branding from the
// sprite art master. Rear lamps, greenhouse, and body proportion remain.
for (const node of nodes) {
    const materialNames = node.getMesh()?.listPrimitives().map((primitive) => primitive.getMaterial()?.getName()) ?? [];
    const isNamedGenesisBadge = materialNames.some((name) => name === 'GenesisLogo1' || name === 'GenesisLogo2');
    // The rear GENESIS lettering is split across separate chrome/silver/glass
    // meshes in this source, rather than using the named GenesisLogo materials.
    if (!isNamedGenesisBadge && !rearBadgeNodeNames.has(node.getName())) continue;
    const parent = nodes.find((candidate) => candidate.listChildren().includes(node));
    parent?.removeChild(node);
}

// The front lamp uses the same art direction as the rear: preserve the
// original outer curve, but remove source lens/reflection layers and replace
// them with one readable light surface per side.
for (const node of nodes) {
    if (!frontLampLayerNodeNames.has(node.getName())) continue;
    const parent = nodes.find((candidate) => candidate.listChildren().includes(node));
    parent?.removeChild(node);
    // Object_182 is retained only as an off-scene contour source. Its mesh
    // supplies the unified centre lens perimeter below.
    if (node.getName() !== 'Object_182') node.dispose();
}

const frontLampNode = nodes.find((node) => node.getName() === frontLampGeometryNodeName);
const frontLampMaterial = root.listMaterials().find((material) => material.getName() === 'lights');
if (frontLampNode && frontLampMaterial) {
    frontLampMaterial.setDoubleSided(true);
    frontLampNode.setMesh(createContinuousFrontLampMesh([frontLampHousingSourceMesh ?? frontLampNode.getMesh()], frontLampMaterial));
    const parent = nodes.find((candidate) => candidate.listChildren().includes(frontLampNode));
    if (parent && frontLampHousingSourceMesh && frontLampBodySourceMesh) {
        parent.addChild(document.createNode('front-lamp-outer-bezel')
            .setMesh(createFrontLampOuterBezelMesh(frontLampHousingSourceMesh, frontLampBodySourceMesh, frontLampMaterial)));
    }
}

// Discard every source layer except Object_212. It is the original broad lens
// base; the internal stripe meshes are intentionally not retained.
for (const node of nodes) {
    if (!rearLampLayerNodeNames.has(node.getName())) continue;
    const parent = nodes.find((candidate) => candidate.listChildren().includes(node));
    parent?.removeChild(node);
    node.dispose();
}

// Object_212 contains the original upper and lower broad lens bands, but its
// topology has permanent stripe gaps. Replace only that node's mesh with a
// continuous lens surface derived from the original lamp's left/right bounds.
// This is a direct geometry rework — not a panel placed over the bumper.
const rearLampNode = nodes.find((node) => node.getName() === rearLampGeometryNodeName);
const rearLampMaterial = root.listMaterials().find((material) => material.getName() === 'd_red');
if (rearLampNode && rearLampMaterial) {
    rearLampMaterial.setDoubleSided(true);
    rearLampNode.setMesh(createContinuousRearLampMesh(rearLampNode.getMesh(), rearLampMaterial));
}

configureMaterial('body', {
    color: [0.18, 0.29, 0.39, 1],
    metallic: 0.32,
    name: 'role-body',
    roughness: 0.5,
});
configureMaterial('d_glass', { color: [0.12, 0.2, 0.3, 0.72], name: 'role-glass-dark', roughness: 0.22 });
configureMaterial('glass', { color: [0.18, 0.31, 0.43, 0.66], name: 'role-glass', roughness: 0.2 });
configureMaterial('GlassBack.001', { color: [0.16, 0.27, 0.37, 0.66], name: 'role-glass', roughness: 0.2 });
configureMaterial('Glass.001', { color: [0.18, 0.31, 0.43, 0.66], name: 'role-glass', roughness: 0.2 });
configureMaterial('glass_bump', { color: [0.14, 0.24, 0.33, 0.7], name: 'role-glass', roughness: 0.25 });
configureMaterial('r_glass', { color: [0.18, 0.31, 0.43, 0.66], name: 'role-glass', roughness: 0.2 });
configureMaterial('TireBlack', { color: [0.025, 0.03, 0.04, 1], name: 'role-tire', roughness: 0.82 });
configureMaterial('brakes1', { color: [0.32, 0.37, 0.42, 1], metallic: 0.56, name: 'role-wheel', roughness: 0.34 });
configureMaterial('chrome.004', { color: [0.52, 0.61, 0.68, 1], metallic: 0.62, name: 'role-chrome', roughness: 0.34 });
configureMaterial('chrome_d', { color: [0.31, 0.38, 0.45, 1], metallic: 0.45, name: 'role-chrome-dark', roughness: 0.4 });
configureMaterial('d_red', {
    color: [0.62, 0.015, 0.055, 1],
    emissive: [0.48, 0.002, 0.012],
    name: 'role-lamp-rear',
    removeTextures: true,
    roughness: 0.3,
});
configureMaterial('lights', {
    color: [0.48, 0.72, 0.92, 1],
    emissive: [0.18, 0.38, 0.62],
    name: 'role-lamp-front',
    removeTextures: true,
    roughness: 0.28,
});
configureMaterial('plate', {
    color: [0.06, 0.09, 0.12, 1],
    name: 'role-plate-generic',
    removeTexture: true,
    roughness: 0.72,
});

await mkdir(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, document);
console.log(`Created G70 Nieve sprite art master: ${path.relative(projectRoot, outputPath)}`);

function configureMaterial(sourceName, options) {
    const material = root.listMaterials().find((candidate) => candidate.getName() === sourceName);
    if (!material) return;
    material.setName(options.name);
    material.setBaseColorFactor(options.color);
    if (options.metallic !== undefined) material.setMetallicFactor(options.metallic);
    if (options.roughness !== undefined) material.setRoughnessFactor(options.roughness);
    if (options.emissive !== undefined) material.setEmissiveFactor(options.emissive);
    if (options.removeTexture) material.setBaseColorTexture(null);
    if (options.removeTextures) {
        material.setBaseColorTexture(null);
        material.setEmissiveTexture(null);
        material.setNormalTexture(null);
        material.setMetallicRoughnessTexture(null);
        material.setOcclusionTexture(null);
    }
}

function createContinuousRearLampMesh(sourceMesh, material) {
    // Sample the original lens' curved outer contour instead of approximating
    // it with a fixed polygon. The two sampled rails are then joined across
    // the removed inner stripes to form one continuous lens per side.
    const right = createBulgedLampRail(sampleLampContour(sourceMesh, 1));
    const left = createBulgedLampRail(sampleLampContour(sourceMesh, -1));
    const front = [...right, ...left];
    // Preserve the visible lens surface exactly where it is, then grow the
    // geometry inward through the rear body rather than translating the lens.
    const back = front.map(([x, y, z]) => [x, y + 0.12, z]);
    const positions = new Float32Array([...front.flat(), ...back.flat()]);
    const sideVertexCount = right.length;
    const indices = [];
    for (let side = 0; side < 2; side += 1) {
        const offset = side * sideVertexCount;
        const samples = sideVertexCount / 3;
        for (let sample = 0; sample < samples - 1; sample += 1) {
            for (let row = 0; row < 2; row += 1) {
                const top = offset + sample * 3 + row;
                const bottom = top + 1;
                const nextTop = top + 3;
                const nextBottom = nextTop + 1;
                if (side === 0) indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
                else indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
            }
        }
    }
    const frontVertexCount = front.length;
    // Close the back face and the curved outer perimeter for a shallow lens
    // volume. The front face remains unchanged, so its world position is fixed.
    const frontIndexCount = indices.length;
    for (let triangle = 0; triangle < frontIndexCount; triangle += 3) {
        indices.push(
            indices[triangle + 2] + frontVertexCount,
            indices[triangle + 1] + frontVertexCount,
            indices[triangle] + frontVertexCount,
        );
    }
    for (let side = 0; side < 2; side += 1) {
        const offset = side * sideVertexCount;
        const samples = sideVertexCount / 3;
        const perimeter = [
            ...Array.from({ length: samples }, (_, index) => offset + index * 3),
            ...Array.from({ length: samples }, (_, index) => offset + sideVertexCount - 1 - index * 3),
        ];
        for (let edge = 0; edge < perimeter.length; edge += 1) {
            const current = perimeter[edge];
            const next = perimeter[(edge + 1) % perimeter.length];
            indices.push(current, next, current + frontVertexCount, next, next + frontVertexCount, current + frontVertexCount);
        }
    }
    const position = document.createAccessor('rear-lamp-continuous-position')
        .setType('VEC3')
        .setArray(positions);
    const index = document.createAccessor('rear-lamp-continuous-index')
        .setType('SCALAR')
        .setArray(new Uint16Array(indices));
    return document.createMesh('rear-lamp-continuous')
        .addPrimitive(document.createPrimitive()
            .setAttribute('POSITION', position)
            .setIndices(index)
            .setMaterial(material));
}

function createContinuousFrontLampMesh(sourceMeshes, material) {
    const right = sampleFrontLampSurface(sourceMeshes, 1);
    const left = sampleFrontLampSurface(sourceMeshes, -1);
    const positions = new Float32Array([...right.flat(), ...left.flat()]);
    const sideVertexCount = right.length;
    const rows = 8;
    const columns = sideVertexCount / rows;
    const indices = [];
    for (let side = 0; side < 2; side += 1) {
        const offset = side * sideVertexCount;
        for (let column = 0; column < columns - 1; column += 1) {
            for (let row = 0; row < rows - 1; row += 1) {
                const top = offset + column * rows + row;
                const bottom = top + 1;
                const nextTop = top + rows;
                const nextBottom = nextTop + 1;
                if (side === 0) indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
                else indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
            }
        }
    }
    const position = document.createAccessor('front-lamp-continuous-position')
        .setType('VEC3')
        .setArray(positions);
    const normal = document.createAccessor('front-lamp-continuous-normal')
        .setType('VEC3')
        .setArray(createSmoothGridNormals(positions, columns, rows, sideVertexCount));
    const index = document.createAccessor('front-lamp-continuous-index')
        .setType('SCALAR')
        .setArray(new Uint16Array(indices));
    return document.createMesh('front-lamp-continuous')
        .addPrimitive(document.createPrimitive()
            .setAttribute('POSITION', position)
            .setAttribute('NORMAL', normal)
            .setIndices(index)
        .setMaterial(material));
}

function createFrontLampOuterBezelMesh(housingMesh, bodyMesh, material) {
    const rows = 8;
    const columns = 4;
    const bodyPoints = collectMeshPoints(bodyMesh);
    const surfaces = [sampleFrontLampSurface([housingMesh], 1), sampleFrontLampSurface([housingMesh], -1)];
    const positions = [];
    for (const [surfaceIndex, surface] of surfaces.entries()) {
        const side = surfaceIndex === 0 ? 1 : -1;
        const sourceColumns = surface.length / rows;
        const innerColumn = side > 0 ? sourceColumns - 4 : 3;
        const sourceOuterColumn = side > 0 ? sourceColumns - 1 : 0;
        for (let column = 0; column < columns; column += 1) {
            const blend = column / (columns - 1);
            for (let row = 0; row < rows; row += 1) {
                const inner = surface[innerColumn * rows + row];
                const sourceOuter = surface[sourceOuterColumn * rows + row];
                const vertical = row / (rows - 1);
                // This is an annular fill, not another entire lamp surface:
                // it reaches only the exposed outer bezel and rounds there.
                const outerX = sourceOuter[0] + side * (0.045 + Math.sin(Math.PI * vertical) * 0.04);
                const outerZ = sourceOuter[2] + (0.5 - vertical) * 0.022;
                const x = inner[0] * (1 - blend) + outerX * blend;
                const z = inner[2] * (1 - blend) + outerZ * blend;
                const bodyY = sampleBodySurfaceY(bodyPoints, x, z);
                const y = inner[1] * (1 - blend) + bodyY * blend;
                positions.push(x, y, z);
            }
        }
    }
    const indices = [];
    const sideVertexCount = columns * rows;
    for (let side = 0; side < 2; side += 1) {
        const offset = side * sideVertexCount;
        for (let column = 0; column < columns - 1; column += 1) {
            for (let row = 0; row < rows - 1; row += 1) {
                const top = offset + column * rows + row;
                const bottom = top + 1;
                const nextTop = top + rows;
                const nextBottom = nextTop + 1;
                if (side === 0) indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
                else indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
            }
        }
    }
    const position = document.createAccessor('front-lamp-outer-bezel-position').setType('VEC3').setArray(new Float32Array(positions));
    const normal = document.createAccessor('front-lamp-outer-bezel-normal')
        .setType('VEC3')
        .setArray(createSmoothGridNormals(position.getArray(), columns, rows, sideVertexCount));
    const index = document.createAccessor('front-lamp-outer-bezel-index').setType('SCALAR').setArray(new Uint16Array(indices));
    return document.createMesh('front-lamp-outer-bezel')
        .addPrimitive(document.createPrimitive()
            .setAttribute('POSITION', position)
            .setAttribute('NORMAL', normal)
            .setIndices(index)
            .setMaterial(material));
}

function collectMeshPoints(mesh) {
    const points = [];
    for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        if (!position) continue;
        const source = position.getArray();
        for (let index = 0; index < source.length; index += 3) points.push([source[index], source[index + 1], source[index + 2]]);
    }
    return points;
}

function sampleBodySurfaceY(points, x, z) {
    const nearby = points
        .map((point) => ({ point, distance: Math.abs(point[0] - x) * 2 + Math.abs(point[2] - z) * 6 }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 24);
    return Math.max(...nearby.map(({ point }) => point[1])) + 0.006;
}

function createMergedFrontLampMesh(sourceMesh, material) {
    const primitive = sourceMesh?.listPrimitives()[0];
    const position = primitive?.getAttribute('POSITION');
    const index = primitive?.getIndices();
    if (!position || !index) throw new Error('Missing source front-lamp geometry.');
    const sourcePositions = position.getArray();
    const sourceIndices = index.getArray();
    const adjacency = Array.from({ length: position.getCount() }, () => []);
    for (let triangle = 0; triangle < sourceIndices.length; triangle += 3) {
        const a = sourceIndices[triangle];
        const b = sourceIndices[triangle + 1];
        const c = sourceIndices[triangle + 2];
        adjacency[a].push(b, c);
        adjacency[b].push(a, c);
        adjacency[c].push(a, b);
    }
    const componentForVertex = new Int32Array(position.getCount()).fill(-1);
    const components = [];
    for (let start = 0; start < componentForVertex.length; start += 1) {
        if (componentForVertex[start] !== -1) continue;
        const component = [];
        const queue = [start];
        componentForVertex[start] = components.length;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const vertex = queue[cursor];
            component.push(vertex);
            for (const neighbour of adjacency[vertex]) {
                if (componentForVertex[neighbour] !== -1) continue;
                componentForVertex[neighbour] = components.length;
                queue.push(neighbour);
            }
        }
        const zCenter = component.reduce((sum, vertex) => sum + sourcePositions[vertex * 3 + 2], 0) / component.length;
        components.push({ vertices: component, zCenter });
    }
    // Keep only the largest upper/lower exterior lens shells — one pair per
    // side — then overlap their shared boundary. This preserves source curves.
    const selectedComponents = components
        .map((component, id) => ({ ...component, id }))
        .sort((a, b) => b.vertices.length - a.vertices.length)
        .slice(0, 4);
    const selected = new Set(selectedComponents.map(({ id }) => id));
    const remap = new Map();
    const positions = [];
    const indices = [];
    const mapVertex = (vertex) => {
        if (remap.has(vertex)) return remap.get(vertex);
        const mapped = positions.length / 3;
        positions.push(
            sourcePositions[vertex * 3],
            sourcePositions[vertex * 3 + 1] + 0.04,
            sourcePositions[vertex * 3 + 2],
        );
        remap.set(vertex, mapped);
        return mapped;
    };
    for (let triangle = 0; triangle < sourceIndices.length; triangle += 3) {
        const a = sourceIndices[triangle];
        const b = sourceIndices[triangle + 1];
        const c = sourceIndices[triangle + 2];
        const componentId = componentForVertex[a];
        if (!selected.has(componentId) || componentForVertex[b] !== componentId || componentForVertex[c] !== componentId) continue;
        indices.push(mapVertex(a), mapVertex(b), mapVertex(c));
    }
    // Stitch the original upper/lower lens shells together at their inner
    // curves. Only this narrow bridge is new; every outer curve remains from
    // the source geometry.
    for (const side of [-1, 1]) {
        const sideComponents = selectedComponents
            .filter(({ vertices }) => sourcePositions[vertices[0] * 3] * side > 0)
            .sort((a, b) => b.zCenter - a.zCenter);
        const [upper, lower] = sideComponents;
        if (!upper || !lower) continue;
        const bridgeSamples = 20;
        const upperRange = componentXRange(upper.vertices, sourcePositions);
        const lowerRange = componentXRange(lower.vertices, sourcePositions);
        const xMin = Math.max(upperRange[0], lowerRange[0]);
        const xMax = Math.min(upperRange[1], lowerRange[1]);
        const bridge = [];
        for (let sample = 0; sample < bridgeSamples; sample += 1) {
            const x = xMin + ((xMax - xMin) * sample) / (bridgeSamples - 1);
            bridge.push(
                sampleInnerLampEdge(upper.vertices, sourcePositions, x, 'min'),
                sampleInnerLampEdge(lower.vertices, sourcePositions, x, 'max'),
            );
        }
        const offset = positions.length / 3;
        for (const [x, y, z] of bridge) positions.push(x, y + 0.06, z);
        for (let sample = 0; sample < bridgeSamples - 1; sample += 1) {
            const upperLeft = offset + sample * 2;
            const lowerLeft = upperLeft + 1;
            const upperRight = upperLeft + 2;
            const lowerRight = upperLeft + 3;
            if (side > 0) indices.push(upperLeft, lowerLeft, upperRight, upperRight, lowerLeft, lowerRight);
            else indices.push(upperLeft, upperRight, lowerLeft, upperRight, lowerRight, lowerLeft);
        }
    }
    return document.createMesh('front-lamp-merged')
        .addPrimitive(document.createPrimitive()
            .setAttribute('POSITION', document.createAccessor('front-lamp-merged-position')
                .setType('VEC3')
                .setArray(new Float32Array(positions)))
            .setIndices(document.createAccessor('front-lamp-merged-index')
                .setType('SCALAR')
                .setArray(new Uint16Array(indices)))
            .setMaterial(material));
}

function componentXRange(vertices, positions) {
    return vertices.reduce(([min, max], vertex) => {
        const x = positions[vertex * 3];
        return [Math.min(min, x), Math.max(max, x)];
    }, [Infinity, -Infinity]);
}

function sampleInnerLampEdge(vertices, positions, targetX, direction) {
    const nearby = vertices
        .map((vertex) => ({
            x: positions[vertex * 3],
            y: positions[vertex * 3 + 1],
            z: positions[vertex * 3 + 2],
        }))
        .sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX))
        .slice(0, 16);
    const edge = nearby.reduce((best, point) => direction === 'min'
        ? point.z < best.z ? point : best
        : point.z > best.z ? point : best);
    return [edge.x, edge.y, edge.z];
}

function sampleLampContour(sourceMesh, side) {
    const position = sourceMesh?.listPrimitives()[0]?.getAttribute('POSITION');
    if (!position) throw new Error('Missing source rear-lamp geometry.');
    const source = position.getArray();
    const points = [];
    for (let index = 0; index < source.length; index += 3) {
        const x = source[index];
        if (x * side > 0.9) points.push([x, source[index + 1], source[index + 2]]);
    }
    const xMin = Math.min(...points.map(([x]) => x));
    const xMax = Math.max(...points.map(([x]) => x));
    const samples = 18;
    const rail = [];
    for (let sample = 0; sample < samples; sample += 1) {
        const targetX = xMin + ((xMax - xMin) * sample) / (samples - 1);
        const nearby = points.filter(([x]) => Math.abs(x - targetX) <= 0.035);
        const candidates = nearby.length ? nearby : points;
        const top = candidates.reduce((best, point) => point[2] > best[2] ? point : best);
        const bottom = candidates.reduce((best, point) => point[2] < best[2] ? point : best);
        // Anchor horizontal progression to each sampling column, while keeping
        // the source's depth and curved upper/lower contour.
        rail.push([targetX, top[1], top[2]], [targetX, bottom[1], bottom[2]]);
    }
    // A small in-housing overscan covers the remaining source seam without
    // changing the car silhouette or letting the lens spill onto the trunk.
    const centerX = side * 1.55;
    const centerZ = -1.3;
    return rail.map(([x, y, z]) => [
        centerX + (x - centerX) * 1.07,
        y - 0.09,
        centerZ + (z - centerZ) * 1.25,
    ]);
}

function collectFrontLampPoints(sourceMeshes, side) {
    const points = [];
    for (const sourceMesh of sourceMeshes) {
        for (const primitive of sourceMesh.listPrimitives()) {
            const position = primitive.getAttribute('POSITION');
            if (!position) continue;
            const source = position.getArray();
            for (let index = 0; index < source.length; index += 3) {
                const x = source[index];
                if (x * side > 0.9) points.push([x, source[index + 1], source[index + 2]]);
            }
        }
    }
    if (!points.length) throw new Error('Missing source front-lamp geometry.');
    return points;
}

function sampleFrontLampContour(sourceMeshes, side) {
    const points = collectFrontLampPoints(sourceMeshes, side);
    const xMin = Math.min(...points.map(([x]) => x));
    const xMax = Math.max(...points.map(([x]) => x));
    const rail = [];
    const samples = 24;
    for (let sample = 0; sample < samples; sample += 1) {
        const targetX = xMin + ((xMax - xMin) * sample) / (samples - 1);
        const nearby = points.filter(([x]) => Math.abs(x - targetX) <= 0.035);
        const candidates = nearby.length ? nearby : points;
        const top = candidates.reduce((best, point) => point[2] > best[2] ? point : best);
        const bottom = candidates.reduce((best, point) => point[2] < best[2] ? point : best);
        rail.push([targetX, top[1], top[2]], [targetX, bottom[1], bottom[2]]);
    }
    return rail;
}

function sampleFrontLampSurface(sourceMeshes, side) {
    const contour = sampleFrontLampContour(sourceMeshes, side);
    const points = collectFrontLampPoints(sourceMeshes, side);
    const xMin = Math.min(...points.map(([x]) => x));
    const xMax = Math.max(...points.map(([x]) => x));
    const centerX = (xMin + xMax) / 2;
    const outerBoundaryPoints = points.filter(([x]) => side > 0
        ? x >= xMax - 0.22
        : x <= xMin + 0.22);
    const rows = 8;
    const field = [];
    for (let column = 0; column < contour.length / 2; column += 1) {
        const top = contour[column * 2];
        const bottom = contour[column * 2 + 1];
        const centerZ = (top[2] + bottom[2]) / 2;
        const columnRatio = column / (contour.length / 2 - 1);
        // The outward end is the high-X end on the right lamp, and the
        // low-X end on the left lamp. Restrict the extra cover to its last
        // three columns so the grille-facing inner edge stays as approved.
        const outwardProgress = side > 0 ? columnRatio : 1 - columnRatio;
        const outerCapReach = Math.max(0, (outwardProgress - 0.82) / 0.18);
        for (let row = 0; row < rows; row += 1) {
            const ratio = row / (rows - 1);
            const unscaledZ = top[2] + (bottom[2] - top[2]) * ratio;
            // Grow the already-unified lens only in its local vertical span,
            // covering the retired upper/lower divisions without widening the
            // car silhouette.
            // The housing contour already includes both source light bands.
            // Keep the new lens close to this outline instead of stretching a
            // narrow internal-light strip into a block.
            // Only the uncovered upper rim needs a little more reach. Leave
            // the lower bumper-facing edge at r45's conservative value.
            const expandedVerticalScale = unscaledZ >= centerZ ? 1.20 : 1.08;
            // At the very outside edge, return to the source shell instead
            // of continuing the cover expansion into the fender curve.
            const verticalScale = expandedVerticalScale * (1 - outerCapReach) + 1.01 * outerCapReach;
            const targetZ = centerZ + (unscaledZ - centerZ) * verticalScale;
            // Sample the original curved shell locally. The outermost nearby
            // vertex supplies the camera-facing depth, avoiding a flat bar.
            const nearby = points
                .map((point) => ({ point, distance: Math.abs(point[0] - top[0]) * 2 + Math.abs(point[2] - unscaledZ) * 7 }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 12);
            const outerY = Math.max(...nearby.map(({ point }) => point[1]));
            // Trace the physical outer lamp edge by height. The regular grid
            // has a vertical last column; this source-derived coordinate bends
            // that column back around the fender at its top and bottom.
            const capCandidates = outerBoundaryPoints
                .map((point) => ({ point, distance: Math.abs(point[2] - unscaledZ) }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 18)
                .map(({ point }) => point);
            const capX = capCandidates.reduce((best, point) => side > 0
                ? Math.max(best, point[0])
                : Math.min(best, point[0]), capCandidates[0][0]);
            const capY = Math.max(...capCandidates.map((point) => point[1]));
            // Expand from the true inner/outer lamp edges rather than scaling
            // from center, so the cover hugs the bumper on both sides.
            // Give the two end caps a small extra overlap, fading to the r45
            // width in the middle so the lens does not become a wider bar.
            const edgeReach = Math.abs(columnRatio * 2 - 1);
            const expandedHorizontalScale = 1.035 + edgeReach * 0.025;
            const horizontalScale = expandedHorizontalScale * (1 - outerCapReach) + 1.005 * outerCapReach;
            const expandedX = centerX + (top[0] - centerX) * horizontalScale;
            const targetX = expandedX * (1 - outerCapReach) + capX * outerCapReach;
            field.push({
                x: targetX,
                y: outerY,
                capY,
                capX,
                expandedX,
                outerCapReach,
                z: targetZ,
                column,
                row,
            });
        }
    }
    return field.map((sample) => {
        // The source housing has overlapping trim layers at its outside end.
        // Fit one arc between its true top/bottom anchors and its widest
        // point; a per-row extrema/median still leaves a visible zig-zag.
        const capBoundarySamples = field
            .filter((candidate) => candidate.column === sample.column)
            .sort((a, b) => a.row - b.row);
        const capStart = capBoundarySamples[0].capX * side;
        const capEnd = capBoundarySamples[capBoundarySamples.length - 1].capX * side;
        const capPeak = Math.max(...capBoundarySamples.map((candidate) => candidate.capX * side));
        const capProgress = sample.row / (rows - 1);
        const capBaseline = capStart + (capEnd - capStart) * capProgress;
        const smoothCapX = side * (capBaseline
            + Math.sin(Math.PI * capProgress) * (capPeak - (capStart + capEnd) / 2));
        // Reach the housing's exterior curve, with only a hairline inset for
        // numerical overlap. Depth—not a large lateral retreat—keeps this
        // cap from escaping the fender in an oblique view.
        const insetCapX = smoothCapX - side * 0.005;
        const targetX = sample.expandedX * (1 - sample.outerCapReach) + insetCapX * sample.outerCapReach;
        // Smooth the depth field along the lamp width. This removes the
        // blocky source-layer steps before building the new lens shell.
        const neighbours = field.filter((candidate) => candidate.row === sample.row
            && Math.abs(candidate.column - sample.column) <= 2);
        const rimY = neighbours.reduce((sum, candidate) => sum + candidate.y, 0) / neighbours.length;
        const vertical = sample.row / (rows - 1);
        const sideWeight = Math.abs((sample.column / (contour.length / 2 - 1)) * 2 - 1);
        // The perimeter sits close to the bumper while the center swells
        // forward into one continuous lens shell.
        const centerBulge = Math.sin(Math.PI * vertical) * (1 - sideWeight * 0.45) * 0.045;
        const upperBias = (1 - vertical) * 0.025;
        const regularY = rimY + 0.055 + centerBulge + upperBias;
        // The last outward columns must follow their local source depth:
        // averaging across the lamp makes this fast fender transition float.
        const fittedCapY = sample.capY - 0.005;
        const targetY = regularY * (1 - sample.outerCapReach) + fittedCapY * sample.outerCapReach;
        return [
            targetX,
            targetY,
            sample.z,
        ];
    });
}

function createSmoothGridNormals(positions, columns, rows, sideVertexCount) {
    const normals = new Float32Array(positions.length);
    const read = (index) => [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    for (let side = 0; side < 2; side += 1) {
        const offset = side * sideVertexCount;
        for (let column = 0; column < columns; column += 1) {
            for (let row = 0; row < rows; row += 1) {
                const index = offset + column * rows + row;
                const left = read(offset + Math.max(column - 1, 0) * rows + row);
                const right = read(offset + Math.min(column + 1, columns - 1) * rows + row);
                const top = read(offset + column * rows + Math.max(row - 1, 0));
                const bottom = read(offset + column * rows + Math.min(row + 1, rows - 1));
                const dx = right.map((value, axis) => value - left[axis]);
                const dz = bottom.map((value, axis) => value - top[axis]);
                const cross = [
                    dx[1] * dz[2] - dx[2] * dz[1],
                    dx[2] * dz[0] - dx[0] * dz[2],
                    dx[0] * dz[1] - dx[1] * dz[0],
                ];
                const length = Math.hypot(...cross) || 1;
                normals.set(cross.map((value) => value / length), index * 3);
            }
        }
    }
    return normals;
}

function createBulgedLampRail(contour) {
    const rail = [];
    for (let index = 0; index < contour.length; index += 2) {
        const top = contour[index];
        const bottom = contour[index + 1];
        // Keep the original outer rim fixed, but bow the lens' center toward
        // the rear camera to seal the last body-color sliver.
        rail.push(top, [
            (top[0] + bottom[0]) / 2,
            (top[1] + bottom[1]) / 2 - 0.12,
            (top[2] + bottom[2]) / 2,
        ], bottom);
    }
    return rail;
}
