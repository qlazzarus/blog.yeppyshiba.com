/// <reference types="@cloudflare/workers-types" />

const SITE_ORIGIN = 'https://blog.yeppyshiba.com';
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:4321', 'http://localhost:4321']);
const MAX_BODY_BYTES = 1024;
const MAXIMUM_ACCURACY_METERS = 45;
const encoder = new TextEncoder();

const buildings = [
    { name: '101동', latitude: 37.39049, longitude: 126.97845, radius: 58 },
    { name: '102동', latitude: 37.38953, longitude: 126.97754, radius: 58 },
    { name: '103동', latitude: 37.38954, longitude: 126.9767, radius: 58 },
    { name: '104동', latitude: 37.38885, longitude: 126.97598, radius: 58 },
    { name: '105동', latitude: 37.38886, longitude: 126.97462, radius: 58 },
    { name: '106동', latitude: 37.39002, longitude: 126.975, radius: 58 },
    { name: '107동', latitude: 37.39063, longitude: 126.9765, radius: 58 },
];

type VerificationRequest = {
    accuracy?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    password?: unknown;
};

function isAllowedOrigin(request: Request) {
    const origin = request.headers.get('Origin');
    return origin === SITE_ORIGIN || (origin !== null && LOCAL_ORIGINS.has(origin));
}

function corsHeaders(request: Request) {
    const headers = new Headers({
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
    });
    const origin = request.headers.get('Origin');
    if (origin && isAllowedOrigin(request)) {
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
    }
    return headers;
}

function json(request: Request, body: object, status = 200) {
    return new Response(JSON.stringify(body), { headers: corsHeaders(request), status });
}

async function parseJson(request: Request): Promise<VerificationRequest | null> {
    const contentLength = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;
    const reader = request.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BODY_BYTES) return null;
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    try {
        return JSON.parse(new TextDecoder().decode(bytes)) as VerificationRequest;
    } catch {
        return null;
    }
}

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function metersBetween(latitude: number, longitude: number, building: (typeof buildings)[number]) {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(building.latitude - latitude);
    const dLng = radians(building.longitude - longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(latitude)) * Math.cos(radians(building.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function passwordMatches(provided: string, expected: string) {
    const providedBytes = encoder.encode(provided);
    const expectedBytes = encoder.encode(expected);
    const lengthsMatch = providedBytes.byteLength === expectedBytes.byteLength;
    return lengthsMatch
        ? crypto.subtle.timingSafeEqual(providedBytes, expectedBytes)
        : !crypto.subtle.timingSafeEqual(providedBytes, providedBytes);
}

async function verify(request: Request, env: Env) {
    if (!isAllowedOrigin(request)) return new Response(null, { status: 403 });
    if (!env.RESIDENT_ENTRY_PASSWORD || !env.KAKAO_OPEN_CHAT_URL) {
        console.error(JSON.stringify({ event: 'resident_verification_missing_secret' }));
        return json(request, { message: '인증 서비스를 일시적으로 사용할 수 없습니다.' }, 503);
    }

    const payload = await parseJson(request);
    if (!payload) return json(request, { message: '잘못된 인증 요청입니다.' }, 400);
    const { accuracy, latitude, longitude, password } = payload;
    if (
        !validCoordinate(latitude, -90, 90) ||
        !validCoordinate(longitude, -180, 180) ||
        !validCoordinate(accuracy, 0, 10_000) ||
        typeof password !== 'string' ||
        password.length > 256
    ) {
        return json(request, { message: '인증 값이 올바르지 않습니다.' }, 400);
    }
    if (accuracy > MAXIMUM_ACCURACY_METERS) {
        return json(request, { message: '위치 정확도가 낮습니다. 창가나 실외에서 다시 시도해 주세요.' }, 403);
    }

    const nearest = buildings
        .map((building) => ({ ...building, distance: metersBetween(latitude, longitude, building) }))
        .sort((left, right) => left.distance - right.distance)[0];
    if (!nearest || nearest.distance > nearest.radius) {
        return json(request, { message: '101~107동 인증 구역 밖입니다.' }, 403);
    }
    if (!passwordMatches(password, env.RESIDENT_ENTRY_PASSWORD)) {
        return json(request, { message: '비밀번호가 맞지 않습니다.' }, 401);
    }

    return json(request, {
        building: nearest.name,
        kakaoOpenChatUrl: env.KAKAO_OPEN_CHAT_URL,
        verified: true,
    });
}

export default {
    async fetch(request, env): Promise<Response> {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') {
            return isAllowedOrigin(request)
                ? new Response(null, { headers: corsHeaders(request), status: 204 })
                : new Response(null, { status: 403 });
        }
        if (request.method === 'POST' && url.pathname === '/v1/verify') return verify(request, env);
        return new Response('Not found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;
