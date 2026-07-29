interface D1PreparedStatement {
    first<T>(): Promise<T | null>;
}

interface D1Database {
    prepare(query: string): D1PreparedStatement;
}

export interface Env {
    VIEW_COUNTER_DB: D1Database;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (request.method === 'GET' && url.pathname === '/healthz') {
            const result = await env.VIEW_COUNTER_DB.prepare('SELECT 1 AS ok').first();
            return Response.json({ ok: result?.ok === 1 });
        }

        return new Response('Not found', { status: 404 });
    },
};
