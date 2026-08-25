## Why

Trading pages currently collapse partial backend outages into a generic fetch
failure. That makes local development noisy when one dependency is unavailable
and makes production outages hard to interpret because the UI does not explain
whether the backend is degraded or fully offline.

## What Changes

- Add a shared outage model for trading pages so the dashboard can distinguish
  healthy, degraded, and offline states.
- Preserve last-known or cached data when a fresh request fails.
- Render a dedicated banner on trading pages when the trading API returns a
  degraded or offline response.
- Surface structured outage details from the trading API instead of only a
  generic request failure.

## Capabilities

### New Capabilities

- `trading-outage-feedback`: user-facing degraded/offline state reporting for
  trading pages.

### Modified Capabilities

- `dashboard`: trading pages, client API helpers, and shared UI components.

## Impact

- `edward/apps/dashboard/src/lib/hummingbot-api.ts`
- `edward/apps/dashboard/src/app/portfolio/page.tsx`
- `edward/apps/dashboard/src/app/market/page.tsx`
- `edward/apps/dashboard/src/app/risk/page.tsx`
- `edward/apps/dashboard/src/app/strategy/page.tsx`
- `edward/apps/dashboard/src/app/execution/page.tsx`
- new shared trading outage UI component(s)
