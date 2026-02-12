# Trader Strategy (Scaffold)

Strategy app scaffold for the Binance Futures rewrite.

## Role
- Consume market candles/position snapshots
- Generate `StrategyIntent` objects
- Feed intents to the executor app

## Current Status
Includes a minimal 3-minute candle intent function for migration bootstrapping.
