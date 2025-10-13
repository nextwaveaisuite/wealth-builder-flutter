# Wealth Builder (Clean)

Static SPA hosted on Vercel with serverless APIs.

- Phase 1 UI preserved (copy your existing `style.css`, `legal/*`, `bot.js`).
- Phase 2 adds: live quotes, Radar v2 + Loss Guard signals, CSV holdings import, Stripe billing, telemetry.

## Dev
No build step. Use `vercel dev` for local.

## Deploy
Connect this repo in Vercel → Project Settings:
- Framework: **Other**
- Default Runtime: Node.js 20
- No Install/Build/Output commands

Set env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_LIFETIME` (optional)
- `ALPHA_VANTAGE_KEY` (optional; quotes fallback included)
- `SITE_URL` (optional)
- `ADMIN_TOKEN` (optional, client-side prompt only)
