# View counter Worker / D1

This directory owns only the Cloudflare-side view-counter service. Its current
scope is page views and GA4 baseline migration; likes are intentionally absent.

The Astro site remains a GitHub Pages deployment. This is a separate Worker
project in the same repository: deploy it with Wrangler; do not move or deploy
the static site through Cloudflare.

## Create the production database

Run this from the repository root after logging in to the intended Cloudflare
account:

```bash
npx wrangler@latest d1 create yeppyshiba-view-counter --location apac
```

Copy the returned UUID into `database_id` in `wrangler.jsonc`. Do not change
the `database_name`; migrations should target that stable name.

Then apply the tracked schema:

```bash
npx wrangler@latest d1 migrations apply yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --remote
```

Verify that the migration was recorded:

```bash
npx wrangler@latest d1 migrations list yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --remote
```

`article_view_baselines` is intentionally separate from Worker-counted data.
At cutover, import one GA4 snapshot into it with `source = 'ga4'`; do not add
that snapshot to `article_view_totals`, or a later retry could double-count it.

## Required secret and first deployment

The view endpoint will not accept requests until the Worker has a long random
HMAC secret. Set it interactively; never put its value in `wrangler.jsonc`, a
commit, or a command argument:

```bash
npx wrangler secret put VIEW_COUNTER_HMAC_SECRET --config workers/view-counter/wrangler.jsonc
npx wrangler deploy --config workers/view-counter/wrangler.jsonc
```

The deployed API is served at `https://api.yeppyshiba.com`. It accepts:

- `POST /v1/views` with `{ "id": "example" }` (or the compatibility form
  `{ "path": "/article/example" }`) from
  `https://blog.yeppyshiba.com` only. A signed HttpOnly cookie and the D1
  uniqueness key limit each browser and article to one counted view per UTC day.
- `GET /v1/stats?ids=example,another` from the same origin. IDs are normalized
  inside the Worker to `/article/{id}`, and the response keeps the requested
  IDs as keys: `{ "stats": { "example": 123 } }`. The legacy
  `paths=/article/example,...` form remains available; `ids` and `paths` cannot
  be mixed in one request. Both forms combine the GA4 baseline and views counted
  after cutover. The Worker passes the requested list to D1 as one JSON-bound
  value, so the bulk query does not grow its SQL placeholder count per article.

For local Astro development, the exact origins `http://localhost:4321` and
`http://127.0.0.1:4321` are also allowed. They are not wildcard patterns and
do not allow other ports. The production origin remains
`https://blog.yeppyshiba.com`.

Before deploying this version, apply migration `0002`; it adds the D1 trigger
that atomically increments `article_view_totals` when a new daily row is added.

## Local schema check

The same migration can be applied to Wrangler's local D1 emulator without
touching Cloudflare:

```bash
npx wrangler@latest d1 migrations apply yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --local
```

The `GET /healthz` Worker route is a binding check. It remains available after
deployment; see `../../docs/view-count-todo.md` for the remaining operational
validation and cutover tasks.
