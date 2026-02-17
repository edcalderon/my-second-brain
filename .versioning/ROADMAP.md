# Project Roadmap – Trading Stack

<!-- roadmap:managed:start -->
> Managed by `@edcalderon/versioning` reentry-status-extension.
> Canonical roadmap file: .versioning/ROADMAP.md
> Active milestone: —
> 
> Everything outside this block is user-editable.
<!-- roadmap:managed:end -->

## Status

The Binance Futures trading stack has been **fully migrated to a separate private repository**.

All trading-related code, strategies, and exchange integrations have been removed from this
public second-brain repository. The private repo now handles:

- Strategy → risk → execution loop with typed events and NATS messaging
- Exchange adapter abstraction with provider registry pattern
- Fractional Kelly criterion position sizing
- Multi-signal safety system (pause on WS instability, execution drift, data quality issues)
- Candle momentum + Black-Scholes pricing strategies
- Graceful shutdown on all services
- Cryptographic signer for exchange order signing
- Real-time dashboard API

## Remaining in this repo

- `archive/node-binance-trader-legacy` — read-only reference of the original legacy trader
- `docs/TRADING_REWRITE_MIGRATION.md` — migration history and details
