# GA CI Automation Setup

This document explains how to enable the CI-driven GA automation that periodically fetches GA4 data and updates `src/data/` files automatically.

Overview

- The repository contains a GitHub Actions workflow: `.github/workflows/ga-weekly-promotion.yml`.
- The workflow runs `node scripts/optimize_internal_links_and_amplify.cjs` and commits outputs to `auto/ga-promotion` branch when changes occur.

Required repository secrets

1. `ANALYTICS_CREDENTIALS_B64` — base64-encoded Google service account JSON. The service account must have the `Analytics Data API` permission for the target property.
2. `ANALYTICS_PROPERTY_ID` — your GA4 property ID (number, e.g., `314819162`).

How to produce `ANALYTICS_CREDENTIALS_B64`

1. Create a Google Cloud service account and download the JSON key file (e.g. `key.json`).
2. On your local machine run:

```bash
# macOS / Linux
base64 key.json | tr -d '\n' > key.json.b64
cat key.json.b64

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('key.json')) > key.json.b64
Get-Content key.json.b64
```

Copy the base64 string and paste it to the GitHub repository Settings → Secrets → Actions → `New repository secret` with name `ANALYTICS_CREDENTIALS_B64`.

Set `ANALYTICS_PROPERTY_ID` as a secret as well (value: e.g. `314819162`).

How to enable and test the workflow

1. Add the two repository secrets as above.
2. In GitHub, open the `Actions` tab → select `Weekly GA Promotion Update` → `Run workflow` (use `workflow_dispatch`) to trigger immediately.
3. Alternatively, push a test commit to any branch — the workflow can also be dispatched via `workflow_dispatch` in the UI.

Local testing (optional)

- You can run the script locally (without GitHub) if you set environment variables locally. Example:

```bash
export ANALYTICS_CREDENTIALS_B64=$(cat key.json.b64)
export ANALYTICS_PROPERTY_ID=314819162
node scripts/optimize_internal_links_and_amplify.cjs
```

Notes and security

- Never commit the raw service-account JSON to the repo. Use the base64 secret only in GitHub Actions.
- The workflow commits generated files to a dedicated branch (`auto/ga-promotion`). You can change this behavior in the workflow if desired.

Optional improvements

- If you prefer not to commit generated files to the repository, update the workflow to upload outputs to a cloud bucket (S3 / GCS) or create a release asset.
- For near-real-time updates, consider a small serverless endpoint (Vercel/Netlify Functions) that queries GA on demand and caches results with a short TTL.
