import type { Candle } from '@ed/trading-core';
import { BinanceTiagoFuturesProvider } from './providers/binance-tiago-provider';
import { MockFuturesProvider } from './providers/mock-futures-provider';
import type {
  ExchangeProviderConfig,
  ExchangeProviderContext,
  ExchangeProviderFactory,
  ExchangeProviderName,
  FuturesProvider,
  KlineSubscriptionParams,
  UserDataSubscriptionParams,
} from './providers/provider-types.js';

export interface MarketOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  reduceOnly?: boolean;
  clientOrderId: string;
}

export interface ExchangeOrderResult {
  orderId: string;
  status: 'NEW' | 'FILLED' | 'REJECTED';
  symbol: string;
  clientOrderId: string;
}

export interface ExchangeAdapter {
  placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult>;
  getLatestCandle(symbol: string, timeframe: string): Promise<Candle | null>;
  subscribeKlines(params: KlineSubscriptionParams): Promise<() => void>;
  subscribeUserData(params: UserDataSubscriptionParams): Promise<() => void>;
  renewListenKey(): Promise<void>;
}

const providerRegistry = new Map<ExchangeProviderName, ExchangeProviderFactory>([
  ['binance-tiago', ({ config }) => new BinanceTiagoFuturesProvider(config)],
  ['mock', () => new MockFuturesProvider()],
]);

export function registerExchangeProvider(name: ExchangeProviderName, factory: ExchangeProviderFactory): void {
  providerRegistry.set(name, factory);
}

export function createExchangeProvider(name: ExchangeProviderName, context: ExchangeProviderContext): FuturesProvider {
  const factory = providerRegistry.get(name);
  if (!factory) {
    throw new Error(`Unknown exchange provider: ${name}`);
  }

  return factory(context);
}

export class BinanceFuturesExchangeAdapter implements ExchangeAdapter {
  constructor(private readonly provider: FuturesProvider = new MockFuturesProvider()) {}

  static fromProvider(name: ExchangeProviderName, config: ExchangeProviderConfig = {}): BinanceFuturesExchangeAdapter {
    const provider = createExchangeProvider(name, { config });
    return new BinanceFuturesExchangeAdapter(provider);
  }

  async placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult> {
    return this.provider.placeMarketOrder(params);
  }

  async getLatestCandle(symbol: string, timeframe: string): Promise<Candle | null> {
    return this.provider.getLatestCandle(symbol, timeframe);
  }

  async subscribeKlines(params: KlineSubscriptionParams): Promise<() => void> {
    return this.provider.subscribeKlines(params);
  }

  async subscribeUserData(params: UserDataSubscriptionParams): Promise<() => void> {
    return this.provider.subscribeUserData(params);
  }

  async renewListenKey(): Promise<void> {
    await this.provider.renewListenKey();
  }
}
