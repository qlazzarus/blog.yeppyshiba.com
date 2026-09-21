# Resident verification Worker

This Worker validates submitted GPS coordinates and password, then returns the Kakao Open Chat URL. Those values are Worker secrets, so neither appears in the static GitHub Pages build.

## Configure and deploy

Run the following from `workers/resident-verification`. Enter each value in Wrangler's interactive prompt; do not pass it on a command line.

```bash
npx wrangler secret put RESIDENT_ENTRY_PASSWORD
npx wrangler secret put KAKAO_OPEN_CHAT_URL
npx wrangler deploy
```

Copy the deployed Worker URL into GitHub repository secret `PUBLIC_RESIDENT_VERIFICATION_API_URL`. The GitHub Pages build exposes only this API URL.

For local testing, copy `.dev.vars.example` to `.dev.vars`, populate it locally, then run `npx wrangler dev --local`.

The Worker intentionally permits browser requests only from `https://blog.yeppyshiba.com` (and local Astro development origins). Update `SITE_ORIGIN` before deployment if the production origin differs.
