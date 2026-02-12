# Exchange Binance Futures (Scaffold)

Exchange adapter package for Binance USDT-M Futures.

## Role
- Isolate REST and WebSocket exchange interactions
- Expose stable adapter interfaces to apps
- Keep exchange-specific fragility out of strategy/executor logic

## Current Status
Contains baseline adapter interfaces and a stub implementation for clean migration sequencing.

## Adapter Switching
- `BinanceFuturesExchangeAdapter.fromProvider('binance-tiago', config)` for real Binance SDK usage
- `BinanceFuturesExchangeAdapter.fromProvider('mock')` for local testing
- `registerExchangeProvider(name, factory)` to plug any future exchange SDK/provider without changing executor logic
