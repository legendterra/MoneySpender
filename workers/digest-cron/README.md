# moneyspender-digest-cron

Cloudflare Worker that calls `GET https://money.moneyspender.net/api/cron/digest`
every hour (`0 * * * *`, UTC). Vercel Hobby only allows daily crons, so the
hourly digest is triggered from here; the app itself decides, per user and in
WIB, whether a notification is due (PLAN.md section 7).

Files:

- `wrangler.toml` — name, cron trigger, `APP_URL` var.
- `src/index.ts` — `scheduled` handler: fetches the endpoint with
  `Authorization: Bearer $CRON_SECRET` and logs status + summary.

## Deploy (run by the owner, not by CI)

```bash
cd workers/digest-cron
npx wrangler login                      # once, opens the Cloudflare login
npx wrangler secret put CRON_SECRET     # paste the same value as Vercel's CRON_SECRET
npx wrangler deploy
```

`CRON_SECRET` must equal the `CRON_SECRET` environment variable of the Vercel
project (generate one with `npm run generate:cron-secret` in the repo root).

## Check that it works

```bash
# Dry run against production: shows who would get what at the current WIB hour,
# without sending or logging anything.
curl -H "Authorization: Bearer $CRON_SECRET" "https://money.moneyspender.net/api/cron/digest?dry=1"

# Same for a simulated hour (only allowed together with dry=1).
curl -H "Authorization: Bearer $CRON_SECRET" "https://money.moneyspender.net/api/cron/digest?dry=1&hour=21"

# Live logs of the worker (each run prints one [digest-cron] line).
npx wrangler tail moneyspender-digest-cron

# Trigger the scheduled handler locally (sends real pushes via APP_URL!).
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

To pause the digest, remove the trigger in the Cloudflare dashboard
(Workers > moneyspender-digest-cron > Settings > Triggers) or run
`npx wrangler delete`.
