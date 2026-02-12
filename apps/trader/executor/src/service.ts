import type { ExchangeAdapter } from '@ed/exchange-binance-futures';
import { PlatformEventBus, RiskEngine, type StrategyIntent } from '@ed/trading-core';

function toOrderSide(intent: StrategyIntent): 'BUY' | 'SELL' {
  if (intent.action === 'OPEN_SHORT') return 'SELL';
  if (intent.action === 'CLOSE_POSITION' || intent.action === 'REDUCE') return 'SELL';
  return 'BUY';
}

function shouldReduceOnly(intent: StrategyIntent): boolean {
  return intent.action === 'CLOSE_POSITION' || intent.action === 'REDUCE';
}

export function registerIntentExecutor(
  bus: PlatformEventBus,
  exchange: ExchangeAdapter,
  riskEngine: RiskEngine
): () => void {
  return bus.subscribe('STRATEGY_INTENT', async (intent) => {
    const evaluation = riskEngine.evaluate(intent, {
      openPositions: 0,
      leverage: 3,
      notionalUsd: 100,
    });

    if (!evaluation.approved) {
      await bus.publishEvent('RISK_BLOCKED', {
        symbol: intent.symbol,
        reason: evaluation.reason,
      }, intent.correlationId);
      return;
    }

    const clientOrderId = intent.correlationId ?? `exec-${Date.now()}`;

    await bus.publishEvent('ORDER_SENT', {
      symbol: intent.symbol,
      clientOrderId,
      status: 'NEW',
    }, intent.correlationId);

    const order = await exchange.placeMarketOrder({
      symbol: intent.symbol,
      side: toOrderSide(intent),
      quantity: intent.quantity,
      reduceOnly: shouldReduceOnly(intent),
      clientOrderId,
    });

    if (order.status === 'FILLED') {
      await bus.publishEvent('ORDER_FILLED', {
        symbol: order.symbol,
        clientOrderId: order.clientOrderId,
        status: 'FILLED',
      }, intent.correlationId);
      return;
    }

    if (order.status === 'REJECTED') {
      await bus.publishEvent('ORDER_REJECTED', {
        symbol: order.symbol,
        clientOrderId: order.clientOrderId,
        status: 'REJECTED',
        reason: 'exchange rejected order',
      }, intent.correlationId);
      return;
    }

    await bus.publishEvent('ORDER_SENT', {
      symbol: order.symbol,
      clientOrderId: order.clientOrderId,
      status: order.status,
    }, intent.correlationId);
  });
}
