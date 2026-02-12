import { BinanceFuturesExchangeAdapter } from '@ed/exchange-binance-futures';
import { PlatformEventBus, RiskEngine } from '@ed/trading-core';
import { registerIntentExecutor } from './service.js';

export { registerIntentExecutor } from './service.js';

const exchangeProvider = 'mock' as const;
const exchange = BinanceFuturesExchangeAdapter.fromProvider(exchangeProvider, {});
const bus = new PlatformEventBus();
const riskEngine = new RiskEngine({
  maxOpenPositions: 3,
  maxLeveragePerSymbol: 10,
  maxNotionalPerSymbolUsd: 5000,
});

export async function runExecutorScaffold(): Promise<void> {
  registerIntentExecutor(bus, exchange, riskEngine);

  bus.subscribe('ORDER_SENT', async (event) => {
    console.log('[trader-executor] order event:', event);
  });

  await bus.publishEvent('STRATEGY_INTENT', {
    symbol: 'BTCUSDT',
    action: 'OPEN_LONG',
    quantity: '0.001',
    reason: 'scaffold boot intent',
    createdAt: Date.now(),
  });
}
