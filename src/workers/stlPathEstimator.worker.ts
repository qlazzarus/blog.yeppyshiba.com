type Vec = [number, number, number];
type Segment = { a: Vec; b: Vec; aKey: string; bKey: string };
const pointKey = (p: Vec) => `${Math.round(p[0] * 100)}:${Math.round(p[1] * 100)}`;

function parse(buffer: ArrayBuffer): Float32Array {
    if (buffer.byteLength >= 84) {
        const count = new DataView(buffer).getUint32(80, true);
        if (84 + count * 50 === buffer.byteLength) {
            const view = new DataView(buffer); const points = new Float32Array(count * 9);
            for (let i = 0; i < count; i++) for (let j = 0; j < 9; j++) points[i * 9 + j] = view.getFloat32(96 + i * 50 + j * 4, true);
            return points;
        }
    }
    const values: number[] = [];
    for (const match of new TextDecoder().decode(buffer).matchAll(/vertex\s+([-+.\deE]+)\s+([-+.\deE]+)\s+([-+.\deE]+)/g)) values.push(Number(match[1]), Number(match[2]), Number(match[3]));
    return new Float32Array(values);
}

function intersection(a: Vec, b: Vec, z: number): Vec | null {
    const dz = b[2] - a[2];
    if (Math.abs(dz) < 1e-8 || z < Math.min(a[2], b[2]) || z > Math.max(a[2], b[2])) return null;
    const t = (z - a[2]) / dz;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z];
}

function summarizeLayer(segments: Segment[]) {
    const adjacency = new Map<string, number[]>();
    const points = new Map<string, Vec>();
    segments.forEach((segment, index) => {
        adjacency.set(segment.aKey, [...(adjacency.get(segment.aKey) ?? []), index]);
        adjacency.set(segment.bKey, [...(adjacency.get(segment.bKey) ?? []), index]);
        points.set(segment.aKey, segment.a); points.set(segment.bKey, segment.b);
    });
    const visited = new Set<number>(); const loops: Vec[][] = []; let openChains = 0;
    for (let start = 0; start < segments.length; start++) {
        if (visited.has(start)) continue;
        let edge = start, key = segments[start].aKey, startKey = key, closed = false;
        const chain: Vec[] = [points.get(key)!];
        while (!visited.has(edge)) {
            visited.add(edge);
            const segment = segments[edge];
            key = segment.aKey === key ? segment.bKey : segment.aKey;
            chain.push(points.get(key)!);
            if (key === startKey) { closed = true; break; }
            const next = (adjacency.get(key) ?? []).find((index) => !visited.has(index));
            if (next === undefined) break;
            edge = next;
        }
        if (closed && chain.length >= 4) loops.push(chain); else openChains++;
    }
    const area = (loop: Vec[]) => loop.slice(0, -1).reduce((sum, point, index) => { const next = loop[index + 1]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2;
    const contains = (loop: Vec[], point: Vec) => {
        let inside = false;
        for (let i = 0, j = loop.length - 2; i < loop.length - 1; j = i++) { const a = loop[i], b = loop[j]; if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; }
        return inside;
    };
    const ordered = loops.map((loop) => ({ loop, absoluteArea: Math.abs(area(loop)) })).sort((a, b) => b.absoluteArea - a.absoluteArea);
    let outerLoops = 0, holeLoops = 0;
    ordered.forEach(({ loop }, index) => {
        const depth = ordered.slice(0, index).filter(({ loop: parent }) => contains(parent, loop[0])).length;
        if (depth % 2) holeLoops++; else outerLoops++;
    });
    return { closedLoops: loops.length, outerLoops, holeLoops, openChains };
}

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; layerHeight: number }>) => {
    try {
        const vertices = parse(event.data.buffer);
        let minZ = Infinity, maxZ = -Infinity;
        for (let i = 2; i < vertices.length; i += 3) { minZ = Math.min(minZ, vertices[i]); maxZ = Math.max(maxZ, vertices[i]); }
        const totalLayers = Math.max(1, Math.ceil((maxZ - minZ) / event.data.layerHeight));
        const sampledLayers = Math.min(totalLayers, 900);
        const stride = totalLayers / sampledLayers;
        (self as DedicatedWorkerGlobalScope).postMessage({ type: 'progress', value: 0, currentLayer: 0, sampledLayers, totalLayers });
        let perimeterMm = 0, segments = 0, closedLoops = 0, outerLoops = 0, holeLoops = 0, openChains = 0, invalidSegments = 0;
        for (let layer = 0; layer < sampledLayers; layer++) {
            const z = minZ + (layer + .5) * event.data.layerHeight * stride;
            const layerSegments: Segment[] = [];
            for (let i = 0; i < vertices.length; i += 9) {
                const a: Vec = [vertices[i], vertices[i + 1], vertices[i + 2]], b: Vec = [vertices[i + 3], vertices[i + 4], vertices[i + 5]], c: Vec = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];
                if (z < Math.min(a[2], b[2], c[2]) || z > Math.max(a[2], b[2], c[2])) continue;
                const points = [intersection(a, b, z), intersection(b, c, z), intersection(c, a, z)].filter((p): p is Vec => p !== null);
                if (points.length >= 2) {
                    const length = Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]);
                    if (length < .01) { invalidSegments++; continue; }
                    perimeterMm += length; segments++;
                    layerSegments.push({ a: points[0], b: points[1], aKey: pointKey(points[0]), bKey: pointKey(points[1]) });
                }
            }
            const summary = summarizeLayer(layerSegments); closedLoops += summary.closedLoops; outerLoops += summary.outerLoops; holeLoops += summary.holeLoops; openChains += summary.openChains;
            if (layer % Math.max(1, Math.floor(sampledLayers / 20)) === 0) (self as DedicatedWorkerGlobalScope).postMessage({ type: 'progress', value: Math.round(layer / sampledLayers * 100), currentLayer: Math.min(totalLayers, Math.round((layer + 1) * stride)), sampledLayers, totalLayers });
        }
        (self as DedicatedWorkerGlobalScope).postMessage({ type: 'progress', value: 100, currentLayer: totalLayers, sampledLayers, totalLayers });
        (self as DedicatedWorkerGlobalScope).postMessage({ type: 'complete', perimeterMm: perimeterMm * stride, sampledLayers, totalLayers, segments, closedLoops: Math.round(closedLoops * stride), outerLoops: Math.round(outerLoops * stride), holeLoops: Math.round(holeLoops * stride), openChains: Math.round(openChains * stride), invalidSegments, sampled: sampledLayers !== totalLayers });
    } catch (error) { (self as DedicatedWorkerGlobalScope).postMessage({ type: 'error', message: error instanceof Error ? error.message : '경로 분석에 실패했습니다.' }); }
};
