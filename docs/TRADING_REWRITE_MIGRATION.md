# Trading Rewrite Migration

## Goal
Deprecate the legacy `node-binance-trader` repository while preserving it as read-only reference, and rebuild the trading stack cleanly inside the monorepo.

## New Workspaces
- `packages/trading-core`
- `packages/exchange-binance-futures`
- `apps/trader/executor`
- `apps/trader/strategy`
- `apps/trader`

## Archive Location
- Legacy project moved to `archive/node-binance-trader-legacy`
- Legacy `.kiro` migration spec moved to `.kiro/specs/binance-futures-platform-legacy`

## Why This Shape
- One monorepo dependency graph and CI surface
- Clear separation between core domain, exchange layer, strategy logic, and live execution
- Safer incremental rewrite without legacy runtime assumptions leaking into active workspaces

## Next Build Steps
1. Extend `packages/trading-core` with full event payload coverage and serialization
2. Harden Binance USDT-M REST/WS provider in `packages/exchange-binance-futures` (fill lifecycle, drift snapshots, listen-key alerts)
3. Wire market-data app and full strategy→risk→executor loop
4. Add replay/backtest harness before enabling live orders

## Adapter Strategy
- Exchange integration now follows a provider registry pattern to keep SDK/vendor switching simple.
- Current providers: `binance-tiago` and `mock`.
- Future SDKs can be added with `registerExchangeProvider(...)` without changing executor business logic.
