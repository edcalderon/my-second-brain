# Trading Rewrite Migration

## Status: COMPLETED — Migrated to a-quant (private repo)

## History
The trading stack was originally rebuilt inside this monorepo:
- `packages/trading-core` — core types, event bus, risk engine
- `packages/exchange-binance-futures` — Binance USDT-M adapter (REST + WebSocket)
- `apps/trader/executor` — intent-to-order execution with risk evaluation
- `apps/trader/strategy` — 3-minute candle momentum strategy
- `apps/trader` — main trader app wiring everything together

## Migration (February 2026)
All trading functionality has been migrated to the **private a-quant repository**,
which provides a more robust architecture:

- **Rust microservices** with NATS distributed messaging (replaces in-process TypeScript event bus)
- **Fractional Kelly criterion** position sizing (replaces simple risk limits)
- **Multi-signal pause system** — WS instability, execution drift, data quality, consecutive rejects
- **Digital Black-Scholes pricing** and **EWMA volatility** estimation
- **Candle momentum strategy** (ported from this repo's `threeMinuteIntent`)
- **Exchange adapter trait** with provider registry pattern (ported from this repo's `FuturesProvider`)
- **Graceful shutdown** via SIGINT/SIGTERM on all services
- **Cryptographic signer** service for exchange order signing
- **Dashboard API** with real-time aggregated state

## What was removed from this repo
- `apps/trader/` — entire trader app and sub-apps (executor, strategy)
- `packages/trading-core/` — core trading types and event bus
- `packages/exchange-binance-futures/` — Binance exchange adapter
- Related scripts: `dev:trader`, `dev:trader-executor`, `dev:trader-strategy`, `build:trading`

## Archive Location
- Legacy `node-binance-trader` project remains at `archive/node-binance-trader-legacy` (read-only reference)

## ⚠️ Important
The a-quant repository is **strictly private and confidential**. Do NOT reference
its internals, strategies, or infrastructure in this public repository.
