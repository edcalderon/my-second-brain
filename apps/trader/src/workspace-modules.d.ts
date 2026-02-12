declare module '@ed/exchange-binance-futures' {
  import type { Candle } from '@ed/trading-core';

  export type ExchangeProviderName = 'binance-tiago' | 'mock';

  export interface MarketOrderParams {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: string;
    clientOrderId: string;
    reduceOnly?: boolean;
  }

  export interface ExchangeOrderResult {
    orderId: string;
    status: 'NEW' | 'FILLED' | 'REJECTED';
    symbol: string;
    clientOrderId: string;
  }

  export interface ExchangeAdapter {
    placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult>;
    subscribeKlines(params: {
      symbol: string;
      timeframe: string;
      onCandle: (candle: Candle) => void | Promise<void>;
      onStatus?: (status: 'connected' | 'reconnecting' | 'reconnected' | 'error', reason?: string) => void;
    }): Promise<() => void>;
  }

  export class BinanceFuturesExchangeAdapter implements ExchangeAdapter {
    static fromProvider(name: ExchangeProviderName, config?: Record<string, unknown>): BinanceFuturesExchangeAdapter;
    placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult>;
    subscribeKlines(params: {
      symbol: string;
      timeframe: string;
      onCandle: (candle: Candle) => void | Promise<void>;
      onStatus?: (status: 'connected' | 'reconnecting' | 'reconnected' | 'error', reason?: string) => void;
    }): Promise<() => void>;
  }
}

declare module '@ed/trader-executor' {
  import type { ExchangeAdapter } from '@ed/exchange-binance-futures';
  import type { PlatformEventBus, RiskEngine } from '@ed/trading-core';

  export function registerIntentExecutor(
    bus: PlatformEventBus,
    exchange: ExchangeAdapter,
    riskEngine: RiskEngine
  ): () => void;
}

declare module '@ed/trader-strategy' {
  import type { Candle, PlatformEventBus, PositionSnapshot } from '@ed/trading-core';

  export function processCandleAndPublishIntents(
    bus: PlatformEventBus,
    candle: Candle,
    position: PositionSnapshot
  ): Promise<number>;
}
