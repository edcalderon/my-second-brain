# Trading System Migration History

## Status: COMPLETED — Migrated to a-quant (private repo)

## History
The trading stack was originally rebuilt inside this monorepo (`edward`):
- `packages/trading-core` — core types, event bus, risk engine
- `packages/exchange-binance-futures` — Binance USDT-M adapter
- `apps/trader/executor` — intent-to-order execution
- `apps/trader` — main trader app

## V1 Migration (Early February 2026) -> Legacy Rust Engine
Trading functionality was initially migrated to a robust Rust-based microservices architecture within the private `a-quant` repository. This included:
- **Rust microservices** with NATS distributed messaging
- **Fractional Kelly criterion** position sizing
- **Cryptographic signer** service for Azure/GCP hybrid deployment.

## V2 Migration (Late February 2026) -> Python & Hummingbot (Current)
The platform was recently re-architected into a significantly leaner, low-cost asymmetric stack (Architecture v2.2) to eliminate the overhead of GKE Autopilot and Rust complexity:

- **Compute:** Lightweight **GCE e2-medium + K3s Single-Node Cluster** (~$17/mo).
- **Orchestration:** **Python (FastAPI)** `api-svc` engine for managing strategies.
- **Execution:** **Hummingbot API v2.12** running as a sidecar for robust exchange execution, handling precise stop-loss/take-profit, scaling, and market data feeds.
- **Data:** **Supabase PostgreSQL Free Tier** using native Time-Series partitioning.
- **Infrastructure:** **Traefik v3** built-in ingress + GCP Service Account Metadata auth (Zero-JSON credentials).

## What was removed from this repo (`edward`)
- `apps/trader/` — entire trader app and sub-apps
- `packages/trading-core/` — core trading types and event bus
- `packages/exchange-binance-futures/` — Binance exchange adapter
- All related dev/build scripts

## ⚠️ Important
The `a-quant` repository is **strictly private and confidential**. Do NOT reference its internals, proprietary strategies, or infrastructure in this public repository. All architecture blueprints are preserved in `a-quant/.agents/new-architecture/`.
