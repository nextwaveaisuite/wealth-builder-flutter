
# Wealth Builder — Flutter Web (Vercel + GitHub Actions + Supabase-ready)

**What it is:** Rules-based micro-investing web app for Australians. It automates tiny weekly contributions into ETFs, keeps a growth/safety balance, applies strictly capped opportunity tilts, protects with Loss Guard™, and exports CSV + deep links to your chosen provider.

## What it's used for
- Turn $5–$25/week into a disciplined ETF portfolio (not stock-picking)
- Stay on target (e.g., 70/30 growth/safety) with drift-aware DCA
- Add small, capped tilts when conditions favour growth/safety
- Protect the downside with Loss Guard™ (weekly brake, floors, overweight cap)
- Withdraw with a safety-first plan (CSV export + deep links)
- Remain broker-agnostic today; APIs planned under AFSL partner

## Quick Start (CI/Web-only workflow)
1. Create a GitHub repo and push this folder.
2. In GitHub → Settings → Secrets and variables → Actions, add:
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - Optional later: `SUPABASE_URL`, `SUPABASE_ANON`
3. Vercel → New Project → Import this repo (Framework: **Other**).
4. GitHub Actions will build Flutter Web and deploy to Vercel automatically.

## Local development (optional)
You can also run locally with Flutter SDK (not required for CI/web-only):
```
flutter pub get
flutter run -d chrome
```

## AU Compliance
General information only; not financial advice. No custody of funds. Users execute at their provider. Design allows future AFSL-covered execution via partner.
