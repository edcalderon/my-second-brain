import type { Candle } from '@ed/trading-core';
import type { ExchangeOrderResult, MarketOrderParams } from '../exchange-adapter.js';

export type ExchangeProviderName = 'binance-tiago' | 'mock';

export interface ExchangeProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
  demoTrading?: boolean;
  wsBeautify?: boolean;
  useMMSubdomain?: boolean;
}

export interface KlineSubscriptionParams {
  symbol: string;
  timeframe: string;
  onCandle: (candle: Candle) => void | Promise<void>;
  onStatus?: (status: 'connected' | 'reconnecting' | 'reconnected' | 'error', reason?: string) => void;
}

export interface UserDataEvent {
  eventType: string;
  symbol?: string;
  clientOrderId?: string;
  raw: unknown;
}

export interface UserDataSubscriptionParams {
  onEvent: (event: UserDataEvent) => void | Promise<void>;
  onStatus?: (status: 'connected' | 'reconnecting' | 'reconnected' | 'error', reason?: string) => void;
}

export interface FuturesProvider {
  placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult>;
  getLatestCandle(symbol: string, timeframe: string): Promise<Candle | null>;
  subscribeKlines(params: KlineSubscriptionParams): Promise<() => void>;
  subscribeUserData(params: UserDataSubscriptionParams): Promise<() => void>;
  renewListenKey(): Promise<void>;
}

export interface ExchangeProviderContext {
  config: ExchangeProviderConfig;
}

export type ExchangeProviderFactory = (context: ExchangeProviderContext) => FuturesProvider;
