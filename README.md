# Wealth Builder (Phase 1 + Phase 2, Clean)

Static SPA hosted on Vercel with serverless APIs.

- **Phase 1**: Bold, high-contrast cards, tabs, charts, provider tiles, withdraw CSV, legal pages.
- **Phase 2**: Live/fallback quotes, Radar v2 + Loss Guard signals, CSV holdings import, Stripe billing (checkout/portal), telemetry + export, **Admin Console** (edit policies, export telemetry).

## Deploy (Vercel)
1) Create project on Vercel (Framework: Other).
2) Add env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID_MONTHLY`
   - `STRIPE_PRICE_ID_LIFETIME` (optional)
   - `ALPHA_VANTAGE_KEY` (optional quotes vendor)
   - `ADMIN_TOKEN` (for Admin Console)
   - `SITE_URL` (optional; e.g., https://yourdomain.com)
3) Push this repo → Deploy.
4) Attach your domain in Vercel (optional).

## Admin Console
- Route: `/#/admin`
- Protected by `ADMIN_TOKEN` (prompt in browser).
- Can:
  - View/edit **Loss Guard** & **Radar** policies (stored in `/tmp` on the function; resets on cold start).
  - Export anonymized telemetry.
  - See PRO status summary (client-side, per-browser).

## Notes
- No custody. We do not hold funds or place orders.
- Quotes fallback is synthetic when vendor is down or no API key.
- YAML files included but UI uses JSON mirrors to avoid client-side YAML lib.

MIT License.
