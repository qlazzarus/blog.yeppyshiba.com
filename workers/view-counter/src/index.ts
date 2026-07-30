/// <reference types="@cloudflare/workers-types" />

type Env = Cloudflare.Env & {
    VIEW_COUNTER_HMAC_SECRET: string;
};

const SITE_ORIGIN = 'https://blog.yeppyshiba.com';
const LOCAL_DEVELOPMENT_ORIGINS = new Set([
    'http://localhost:4321',
    'http://127.0.0.1:4321',
]);
const COOKIE_NAME = 'blog_aid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const MAX_BODY_BYTES = 1024;
const MAX_STATS_PATHS = 100;

type ViewRequest = { id?: unknown; path?: unknown };
type ViewStatRow = {
    baseline_views: number;
    canonical_path: string;
    request_key: string;
    worker_views: number;
};

const encoder = new TextEncoder();

function isAllowedOrigin(request: Request) {
    const origin = request.headers.get('Origin');
    return origin === SITE_ORIGIN || (origin !== null && LOCAL_DEVELOPMENT_ORIGINS.has(origin));
}

function corsHeaders(request: Request) {
    if (!isAllowedOrigin(request)) return new Headers();
    const origin = request.headers.get('Origin');
    if (!origin) return new Headers();

    return new Headers({
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
    });
}

function json(request: Request, body: unknown, init: ResponseInit = {}) {
    const headers = corsHeaders(request);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    for (const [name, value] of new Headers(init.headers)) headers.set(name, value);

    return new Response(JSON.stringify(body), { ...init, headers });
}

function normalizeArticlePath(rawPath: unknown) {
    if (typeof rawPath !== 'string' || rawPath.length > 512) return null;

    const path = rawPath.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    if (!/^\/article\/[^/]+$/u.test(path)) return null;
    return path;
}

function normalizeArticleId(rawId: unknown) {
    if (typeof rawId !== 'string' || rawId.length === 0 || rawId.length > 480) return null;
    if (/[/?#]/u.test(rawId)) return null;
    return `/article/${rawId}`;
}

function resolveArticlePath(payload: ViewRequest) {
    if (payload.path !== undefined && payload.id !== undefined) return null;
    return payload.id !== undefined ? normalizeArticleId(payload.id) : normalizeArticlePath(payload.path);
}

function parseCookie(request: Request, name: string) {
    const prefix = `${name}=`;
    return request.headers
        .get('Cookie')
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length);
}

function base64Url(bytes: ArrayBuffer) {
    const binary = String.fromCharCode(...new Uint8Array(bytes));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, value: string) {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { hash: 'SHA-256', name: 'HMAC' },
        false,
        ['sign'],
    );
    return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function timingSafeEqual(left: string, right: string) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
}

async function getVisitor(request: Request, secret: string) {
    const cookie = parseCookie(request, COOKIE_NAME);
    const [visitorId, signature] = cookie?.split('.') ?? [];
    if (visitorId && signature && /^[0-9a-f-]{36}$/i.test(visitorId)) {
        const expectedSignature = await hmac(secret, `cookie:${visitorId}`);
        if (timingSafeEqual(signature, expectedSignature)) {
            return { setCookie: null, visitorId };
        }
    }

    const newVisitorId = crypto.randomUUID();
    const newSignature = await hmac(secret, `cookie:${newVisitorId}`);
    return {
        setCookie: `${COOKIE_NAME}=${newVisitorId}.${newSignature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
        visitorId: newVisitorId,
    };
}

async function parseLimitedJson(request: Request): Promise<ViewRequest | 'invalid' | 'too_large'> {
    const reader = request.body?.getReader();
    if (!reader) return 'invalid';

    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BODY_BYTES) return 'too_large';
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }

    try {
        return JSON.parse(new TextDecoder().decode(body)) as ViewRequest;
    } catch {
        return 'invalid';
    }
}

function utcDate(now = new Date()) {
    return now.toISOString().slice(0, 10);
}

async function handleView(request: Request, env: Env) {
    if (!isAllowedOrigin(request)) return new Response(null, { status: 403 });
    const declaredContentLength = request.headers.get('Content-Length');
    if (
        declaredContentLength &&
        (!Number.isSafeInteger(Number(declaredContentLength)) ||
            Number(declaredContentLength) > MAX_BODY_BYTES)
    ) {
        return json(request, { error: 'request_too_large' }, { status: 413 });
    }

    const payload = await parseLimitedJson(request);
    if (payload === 'too_large') {
        return json(request, { error: 'request_too_large' }, { status: 413 });
    }
    if (payload === 'invalid') {
        return json(request, { error: 'invalid_json' }, { status: 400 });
    }

    const canonicalPath = resolveArticlePath(payload);
    if (!canonicalPath) return json(request, { error: 'invalid_path' }, { status: 400 });
    if (!env.VIEW_COUNTER_HMAC_SECRET) {
        console.error(JSON.stringify({ event: 'view_counter_missing_hmac_secret' }));
        return json(request, { error: 'temporarily_unavailable' }, { status: 503 });
    }

    const visitor = await getVisitor(request, env.VIEW_COUNTER_HMAC_SECRET);
    const viewDate = utcDate();
    const now = new Date().toISOString();
    const visitorDayHash = await hmac(
        env.VIEW_COUNTER_HMAC_SECRET,
        `view:${viewDate}:${visitor.visitorId}`,
    );

    try {
        const inserted = await env.VIEW_COUNTER_DB.prepare(
            `INSERT OR IGNORE INTO article_view_daily
             (view_date, canonical_path, visitor_day_hash, first_seen_at)
             VALUES (?, ?, ?, ?)`,
        )
            .bind(viewDate, canonicalPath, visitorDayHash, now)
            .run();
        const counted = inserted.meta.changes === 1;

        const response = json(request, { counted });
        if (visitor.setCookie) response.headers.set('Set-Cookie', visitor.setCookie);
        return response;
    } catch (error) {
        console.error(
            JSON.stringify({
                event: 'view_counter_write_failed',
                message: error instanceof Error ? error.message : 'unknown',
            }),
        );
        return json(request, { error: 'temporarily_unavailable' }, { status: 503 });
    }
}

async function handleStats(request: Request, env: Env) {
    if (!isAllowedOrigin(request)) return new Response(null, { status: 403 });
    const searchParams = new URL(request.url).searchParams;
    const rawIds = searchParams.get('ids')?.split(',') ?? [];
    const rawPaths = searchParams.get('paths')?.split(',') ?? [];
    if (rawIds.length > 0 && rawPaths.length > 0) {
        return json(request, { error: 'choose_ids_or_paths' }, { status: 400 });
    }

    const requested = (rawIds.length > 0 ? rawIds : rawPaths)
        .map((value) => ({
            canonicalPath: rawIds.length > 0 ? normalizeArticleId(value) : normalizeArticlePath(value),
            key: value,
        }))
        .filter((item): item is { canonicalPath: string; key: string } => Boolean(item.canonicalPath));
    const requests = [...new Map(requested.map((item) => [item.key, item])).values()];
    if (requests.length === 0 || requests.length > MAX_STATS_PATHS) {
        return json(request, { error: 'invalid_paths' }, { status: 400 });
    }

    const query = `
        WITH requested_paths AS (
            SELECT json_extract(value, '$.key') AS request_key,
                   json_extract(value, '$.canonicalPath') AS canonical_path
            FROM json_each(?)
        )
        SELECT requested_paths.request_key,
               requested_paths.canonical_path,
               COALESCE(article_view_totals.total_views, 0) AS worker_views,
               COALESCE(article_view_baselines.view_count, 0) AS baseline_views
        FROM requested_paths
        LEFT JOIN article_view_totals USING (canonical_path)
        LEFT JOIN article_view_baselines
          ON article_view_baselines.canonical_path = requested_paths.canonical_path
         AND article_view_baselines.source = 'ga4'
    `;

    try {
        const result = await env.VIEW_COUNTER_DB.prepare(query)
            .bind(JSON.stringify(requests))
            .all<ViewStatRow>();
        const stats = Object.fromEntries(
            result.results.map((row) => [
                row.request_key,
                Number(row.worker_views) + Number(row.baseline_views),
            ]),
        );
        return json(request, { stats }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    } catch (error) {
        console.error(
            JSON.stringify({
                event: 'view_counter_stats_failed',
                message: error instanceof Error ? error.message : 'unknown',
            }),
        );
        return json(request, { error: 'temporarily_unavailable' }, { status: 503 });
    }
}

export default {
    async fetch(request, env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return isAllowedOrigin(request)
                ? new Response(null, { headers: corsHeaders(request), status: 204 })
                : new Response(null, { status: 403 });
        }
        if (request.method === 'GET' && url.pathname === '/healthz') {
            const result = await env.VIEW_COUNTER_DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
            return Response.json({ ok: result?.ok === 1 });
        }
        if (request.method === 'POST' && url.pathname === '/v1/views') {
            return handleView(request, env);
        }
        if (request.method === 'GET' && url.pathname === '/v1/stats') {
            return handleStats(request, env);
        }

        return new Response('Not found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;
