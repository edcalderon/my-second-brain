# Project Roadmap – Binance Futures Trading Rewrite

<!-- roadmap:managed:start -->
> Managed by `@edcalderon/versioning` reentry-status-extension.
> Canonical roadmap file: .versioning/ROADMAP.md
> Active milestone: —
> 
> Everything outside this block is user-editable.
<!-- roadmap:managed:end -->

## North Star

- A safe, observable USDT-M futures trading stack inside this monorepo.
- Strategy → risk → execution loop with typed events, correlation IDs, and replayability.
- Exchange SDK/provider can be swapped without rewriting executor/business logic.

## Now (1–2 weeks)

- [now-01] Finish single-process app (`apps/trader`) wiring: market-data → strategy → executor (mock provider default)
- [now-02] Normalize Binance user-data order events into `ORDER_*` platform events (fills/rejects)
- [now-03] Add config loader + `.env.example` for exchange/provider selection and symbols/timeframes

## Next (4–8 weeks)

- [next-01] Add Market Data service as its own app with backfill + WS health tracking
- [next-02] Add PositionManager (REST snapshot + reconciliation) and synced-guard in executor
- [next-03] Expand risk engine (kill-switch, daily loss, cooldown) + audit log
- [next-04] Add persistence + replay/backtest harness

## Later

- [later-01] Observability: structured logs, metrics, alerting (Telegram)
- [later-02] Deployment: docker/compose + prod runbooks
