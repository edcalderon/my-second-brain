import { BinanceFuturesExchangeAdapter, type ExchangeProviderName } from '@ed/exchange-binance-futures';
import { PlatformEventBus, RiskEngine, type Candle, type PositionSnapshot } from '@ed/trading-core';
import { registerIntentExecutor } from '@ed/trader-executor';
import { processCandleAndPublishIntents } from '@ed/trader-strategy';

function getEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

function getProviderName(): ExchangeProviderName {
  const raw = getEnv('EXCHANGE_PROVIDER', 'mock');
  return (raw === 'binance-tiago' || raw === 'mock') ? raw : 'mock';
}

function defaultPosition(symbol: string): PositionSnapshot {
  return {
    symbol,
    side: 'FLAT',
    quantity: '0',
    entryPrice: '0',
    leverage: 1,
    updatedAt: Date.now(),
  };
}

export async function runTraderApp(): Promise<void> {
  const provider = getProviderName();
  const symbol = getEnv('SYMBOL', 'BTCUSDT');
  const timeframe = getEnv('TIMEFRAME', '3m');

  const bus = new PlatformEventBus();
  const exchange = BinanceFuturesExchangeAdapter.fromProvider(provider, {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    testnet: getEnv('BINANCE_TESTNET', 'false') === 'true',
  });

  const riskEngine = new RiskEngine({
    maxOpenPositions: 3,
    maxLeveragePerSymbol: 10,
    maxNotionalPerSymbolUsd: 5000,
  });

  registerIntentExecutor(bus, exchange, riskEngine);

  bus.subscribe('WS_STATUS', (payload) => {
    console.log('[trader] ws status:', payload);
  });

  bus.subscribe('CANDLE_CLOSED', (payload) => {
    console.log('[trader] candle closed:', payload.symbol, payload.timeframe, payload.closeTime);
  });

  bus.subscribe('ORDER_SENT', (payload) => {
    console.log('[trader] order sent:', payload);
  });

  bus.subscribe('ORDER_FILLED', (payload) => {
    console.log('[trader] order filled:', payload);
  });

  bus.subscribe('ORDER_REJECTED', (payload) => {
    console.log('[trader] order rejected:', payload);
  });

  bus.subscribe('RISK_BLOCKED', (payload) => {
    console.log('[trader] risk blocked:', payload);
  });

  const position = defaultPosition(symbol);

  const unsubscribe = await exchange.subscribeKlines({
    symbol,
    timeframe,
    onStatus: (status: 'connected' | 'reconnecting' | 'reconnected' | 'error', reason?: string) => {
      void bus.publishEvent('WS_STATUS', {
        status: status === 'connected' ? 'connected'
          : status === 'reconnecting' ? 'reconnecting'
          : status === 'reconnected' ? 'synced'
          : 'disconnected',
        service: 'market-data',
        message: reason,
      });
    },
    onCandle: async (candle: Candle) => {
      await bus.publishEvent('CANDLE_CLOSED', candle);
      await processCandleAndPublishIntents(bus, candle, position);
    },
  });

  const shutdown = async (signal: string) => {
    console.log(`[trader] shutting down: ${signal}`);
    try {
      unsubscribe();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  console.log(`[trader] running (provider=${provider}, symbol=${symbol}, timeframe=${timeframe})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void runTraderApp();
}
