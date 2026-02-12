import type { Candle } from '@ed/trading-core';
import type { ExchangeOrderResult, MarketOrderParams } from '../exchange-adapter.js';
import type {
  FuturesProvider,
  KlineSubscriptionParams,
  UserDataSubscriptionParams,
} from './provider-types.js';

export class MockFuturesProvider implements FuturesProvider {
  async placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult> {
    return {
      orderId: `mock-${params.clientOrderId}`,
      status: 'NEW',
      symbol: params.symbol,
      clientOrderId: params.clientOrderId,
    };
  }

  async getLatestCandle(_symbol: string, _timeframe: string): Promise<Candle | null> {
    return null;
  }

  async subscribeKlines(_params: KlineSubscriptionParams): Promise<() => void> {
    return () => {};
  }

  async subscribeUserData(_params: UserDataSubscriptionParams): Promise<() => void> {
    return () => {};
  }

  async renewListenKey(): Promise<void> {}
}
