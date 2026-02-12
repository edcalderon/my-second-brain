import { PlatformEventBus, type Candle, type PositionSnapshot } from '@ed/trading-core';
import { threeMinuteIntent } from './index.js';

export async function processCandleAndPublishIntents(
  bus: PlatformEventBus,
  candle: Candle,
  position: PositionSnapshot
): Promise<number> {
  const intents = threeMinuteIntent({ candle, position });

  for (const intent of intents) {
    await bus.publishEvent('STRATEGY_INTENT', {
      ...intent,
      correlationId: intent.correlationId ?? crypto.randomUUID(),
    });
  }

  return intents.length;
}
