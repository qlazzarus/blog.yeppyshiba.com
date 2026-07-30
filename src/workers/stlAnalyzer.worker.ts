export type ModelAnalysis = {
    triangleCount: number;
    width: number;
    depth: number;
    height: number;
    surfaceArea: number;
    volumeMm3: number | null;
    contactArea: number;
    overhangPercent: number;
    slenderness: number;
    isClosed: boolean;
};

type Vec = [number, number, number];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function parseAscii(text: string): Float32Array {
    const values: number[] = [];
    const matches = text.matchAll(/vertex\s+([-+.\deE]+)\s+([-+.\deE]+)\s+([-+.\deE]+)/g);
    for (const match of matches) values.push(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!values.length || values.length % 9) throw new Error('ASCII STL의 vertex 데이터를 읽을 수 없습니다.');
    return new Float32Array(values);
}

function progress(stage: string, value: number) { (self as DedicatedWorkerGlobalScope).postMessage({ type: 'progress', stage, value }); }

function parseStl(buffer: ArrayBuffer): Float32Array {
    if (buffer.byteLength < 84) return parseAscii(new TextDecoder().decode(buffer));
    const count = new DataView(buffer).getUint32(80, true);
    if (84 + count * 50 === buffer.byteLength) {
        const view = new DataView(buffer); const vertices = new Float32Array(count * 9);
        for (let i = 0; i < count; i++) { for (let j = 0; j < 9; j++) vertices[i * 9 + j] = view.getFloat32(84 + i * 50 + 12 + j * 4, true); if (i % Math.max(1, Math.floor(count / 20)) === 0) progress('STL 읽는 중', Math.round(i / count * 35)); }
        return vertices;
    }
    return parseAscii(new TextDecoder().decode(buffer));
}

function analyze(vertices: Float32Array): ModelAnalysis {
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let area = 0, signedVolume = 0, contactArea = 0, overhangArea = 0;
    const edges = new Map<string, number>();
    for (let i = 0; i < vertices.length; i += 9) {
        const a: Vec = [vertices[i], vertices[i + 1], vertices[i + 2]], b: Vec = [vertices[i + 3], vertices[i + 4], vertices[i + 5]], c: Vec = [vertices[i + 6], vertices[i + 7], vertices[i + 8]];
        for (const p of [a, b, c]) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); minZ = Math.min(minZ, p[2]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); maxZ = Math.max(maxZ, p[2]); }
        const normal = cross(sub(b, a), sub(c, a)); const triangleArea = Math.hypot(...normal) / 2;
        if (!Number.isFinite(triangleArea) || triangleArea === 0) continue;
        area += triangleArea; signedVolume += dot(a, cross(b, c)) / 6;
        const normalZ = normal[2] / (triangleArea * 2);
        if (normalZ < -0.45) overhangArea += triangleArea;
        const rounded = [a, b, c].map((p) => p.map((v) => Math.round(v * 1000)).join(','));
        for (const [u, v] of [[0, 1], [1, 2], [2, 0]]) { const key = [rounded[u], rounded[v]].sort().join('|'); edges.set(key, (edges.get(key) ?? 0) + 1); }
        if (i % Math.max(9, Math.floor(vertices.length / 20 / 9) * 9) === 0) progress('메시 분석 중', 35 + Math.round(i / vertices.length * 50));
    }
    const width = maxX - minX, depth = maxY - minY, height = maxZ - minZ;
    progress('베드 접촉면 분석 중', 85);
    for (let i = 0; i < vertices.length; i += 9) {
        const p: Vec[] = [[vertices[i], vertices[i + 1], vertices[i + 2]], [vertices[i + 3], vertices[i + 4], vertices[i + 5]], [vertices[i + 6], vertices[i + 7], vertices[i + 8]]];
        if (p.every((v) => v[2] <= minZ + Math.max(0.15, height * 0.002))) contactArea += Math.hypot(...cross(sub(p[1], p[0]), sub(p[2], p[0]))) / 2;
    }
    const isClosed = [...edges.values()].every((n) => n === 2);
    return { triangleCount: vertices.length / 9, width, depth, height, surfaceArea: area, volumeMm3: isClosed ? Math.abs(signedVolume) : null, contactArea, overhangPercent: area ? overhangArea / area * 100 : 0, slenderness: height / Math.max(1, Math.min(width, depth)), isClosed };
}

self.onmessage = (event: MessageEvent<{ type: 'analyze'; buffer: ArrayBuffer }>) => {
    try {
        progress('분석 준비 중', 2);
        const vertices = parseStl(event.data.buffer);
        if (!vertices.length) throw new Error('빈 메시입니다.');
        const analysis = analyze(vertices);
        progress('분석 완료', 100);
        (self as DedicatedWorkerGlobalScope).postMessage({ type: 'complete', analysis, vertices }, [vertices.buffer]);
    } catch (error) { (self as DedicatedWorkerGlobalScope).postMessage({ type: 'error', message: error instanceof Error ? error.message : 'STL 분석에 실패했습니다.' }); }
};
