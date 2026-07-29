# View counter Worker / D1

This directory owns only the Cloudflare-side view-counter service. The first
migration deliberately contains no likes or client-facing counter endpoints.

The Astro site remains a GitHub Pages deployment. This is a separate Worker
project in the same repository: deploy it with Wrangler only after its API is
implemented; do not move or deploy the static site through Cloudflare.

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

## Local schema check

The same migration can be applied to Wrangler's local D1 emulator without
touching Cloudflare:

```bash
npx wrangler@latest d1 migrations apply yeppyshiba-view-counter --config workers/view-counter/wrangler.jsonc --local
```

The `GET /healthz` Worker route is only a binding check. It is not intended to
be deployed or exposed until origin validation and the view API are implemented.
