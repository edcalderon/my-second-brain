import type { Candle, PositionSnapshot, StrategyIntent } from '@ed/trading-core';
export { processCandleAndPublishIntents } from './service.js';

export interface StrategyContext {
  candle: Candle;
  position: PositionSnapshot;
}

export function threeMinuteIntent(context: StrategyContext): StrategyIntent[] {
  if (context.candle.timeframe !== '3m') return [];

  const side = context.position.side;
  const close = Number(context.candle.close);
  const open = Number(context.candle.open);

  if (Number.isNaN(close) || Number.isNaN(open)) return [];

  if (close > open && side !== 'LONG') {
    return [{
      symbol: context.candle.symbol,
      action: 'OPEN_LONG',
      quantity: '0.001',
      reason: '3m candle bullish momentum',
      createdAt: Date.now(),
    }];
  }

  if (close < open && side === 'LONG') {
    return [{
      symbol: context.candle.symbol,
      action: 'CLOSE_POSITION',
      quantity: '0.001',
      reason: '3m candle bearish invalidation',
      reduceOnly: true,
      createdAt: Date.now(),
    }];
  }

  return [];
}
