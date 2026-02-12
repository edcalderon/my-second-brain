import type { Candle } from '@ed/trading-core';
import { USDMClient, WebsocketClient } from 'binance';
import type { ExchangeOrderResult, MarketOrderParams } from '../exchange-adapter.js';
import type {
  ExchangeProviderConfig,
  FuturesProvider,
  KlineSubscriptionParams,
  UserDataSubscriptionParams,
} from './provider-types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toStringSafe(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '';
}

function lowerSymbol(symbol: string): string {
  return symbol.toLowerCase();
}

export class BinanceTiagoFuturesProvider implements FuturesProvider {
  private readonly restClient: USDMClient;
  private readonly wsClient: WebsocketClient;
  private listenKeyHeartbeatAt = 0;
  private userDataStreamSubscribed = false;

  constructor(config: ExchangeProviderConfig = {}) {
    this.restClient = new USDMClient({
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      testnet: config.testnet,
      demoTrading: config.demoTrading,
      useMMSubdomain: config.useMMSubdomain,
    });

    this.wsClient = new WebsocketClient({
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      testnet: config.testnet,
      beautify: config.wsBeautify ?? true,
      useMMSubdomain: config.useMMSubdomain,
    });
  }

  async placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult> {
    const clientOrderId = params.clientOrderId || `nbt_${crypto.randomUUID()}`;

    const response = await this.withRateLimitRetry(async () => {
      return this.restClient.submitNewOrder({
        symbol: params.symbol,
        side: params.side,
        type: 'MARKET',
        quantity: Number(params.quantity),
        reduceOnly: params.reduceOnly,
        newClientOrderId: clientOrderId,
      } as any);
    });

    const orderId = toStringSafe((response as any)?.orderId) || `pending-${clientOrderId}`;
    const status = toStringSafe((response as any)?.status) as ExchangeOrderResult['status'];

    return {
      orderId,
      status: status || 'NEW',
      symbol: params.symbol,
      clientOrderId,
    };
  }

  async getLatestCandle(symbol: string, timeframe: string): Promise<Candle | null> {
    const candles = await this.withRateLimitRetry(async () => {
      return this.restClient.getKlines({ symbol, interval: timeframe, limit: 1 } as any);
    });

    const latest = Array.isArray(candles) ? candles[0] : null;
    if (!latest) return null;

    return {
      symbol,
      timeframe,
      open: toStringSafe((latest as any).open),
      high: toStringSafe((latest as any).high),
      low: toStringSafe((latest as any).low),
      close: toStringSafe((latest as any).close),
      volume: toStringSafe((latest as any).volume),
      closeTime: Number((latest as any).closeTime ?? Date.now()),
    };
  }

  async subscribeKlines(params: KlineSubscriptionParams): Promise<() => void> {
    const topic = `${lowerSymbol(params.symbol)}@kline_${params.timeframe}`;

    const messageHandler = async (message: any) => {
      const wsEvent = message?.eventType ?? message?.e;
      const wsSymbol = message?.symbol ?? message?.s;
      const kline = message?.kline ?? message?.k;

      if (wsEvent !== 'kline' || wsSymbol !== params.symbol || !kline) {
        return;
      }

      const isFinal = Boolean(kline?.isFinal ?? kline?.x);
      if (!isFinal) return;

      await params.onCandle({
        symbol: params.symbol,
        timeframe: params.timeframe,
        open: toStringSafe(kline.open ?? kline.o),
        high: toStringSafe(kline.high ?? kline.h),
        low: toStringSafe(kline.low ?? kline.l),
        close: toStringSafe(kline.close ?? kline.c),
        volume: toStringSafe(kline.volume ?? kline.v),
        closeTime: Number(kline.closeTime ?? kline.T ?? Date.now()),
      });
    };

    const reconnectingHandler = () => params.onStatus?.('reconnecting');
    const reconnectedHandler = () => params.onStatus?.('reconnected');
    const openHandler = () => params.onStatus?.('connected');
    const exceptionHandler = (event: any) => params.onStatus?.('error', String(event?.error ?? 'ws exception'));

    this.wsClient.on('message', messageHandler);
    this.wsClient.on('reconnecting', reconnectingHandler);
    this.wsClient.on('reconnected', reconnectedHandler);
    this.wsClient.on('open', openHandler);
    this.wsClient.on('exception', exceptionHandler);

    this.wsClient.subscribe(topic, 'usdm');

    return () => {
      this.wsClient.unsubscribe(topic, 'usdm');
      this.wsClient.off('message', messageHandler);
      this.wsClient.off('reconnecting', reconnectingHandler);
      this.wsClient.off('reconnected', reconnectedHandler);
      this.wsClient.off('open', openHandler);
      this.wsClient.off('exception', exceptionHandler);
    };
  }

  async subscribeUserData(params: UserDataSubscriptionParams): Promise<() => void> {
    const messageHandler = async (message: any) => {
      const eventType = toStringSafe(message?.eventType ?? message?.e);
      if (!eventType) return;

      if (eventType === 'listenKeyExpired') {
        params.onStatus?.('error', 'listenKeyExpired');
        return;
      }

      await params.onEvent({
        eventType,
        symbol: toStringSafe(message?.symbol ?? message?.s),
        clientOrderId: toStringSafe(
          message?.order?.clientOrderId ?? message?.o?.c ?? message?.clientOrderId
        ),
        raw: message,
      });
    };

    const reconnectingHandler = () => params.onStatus?.('reconnecting');
    const reconnectedHandler = () => params.onStatus?.('reconnected');
    const openHandler = () => params.onStatus?.('connected');
    const exceptionHandler = (event: any) => params.onStatus?.('error', String(event?.error ?? 'ws exception'));

    this.wsClient.on('message', messageHandler);
    this.wsClient.on('reconnecting', reconnectingHandler);
    this.wsClient.on('reconnected', reconnectedHandler);
    this.wsClient.on('open', openHandler);
    this.wsClient.on('exception', exceptionHandler);

    await this.wsClient.subscribeUsdFuturesUserDataStream();
    this.userDataStreamSubscribed = true;
    this.listenKeyHeartbeatAt = Date.now();

    return () => {
      this.userDataStreamSubscribed = false;
      this.wsClient.unsubscribeUsdFuturesUserDataStream().catch((error) => {
        console.warn('failed to unsubscribe user data stream', error);
      });
      this.wsClient.off('message', messageHandler);
      this.wsClient.off('reconnecting', reconnectingHandler);
      this.wsClient.off('reconnected', reconnectedHandler);
      this.wsClient.off('open', openHandler);
      this.wsClient.off('exception', exceptionHandler);
    };
  }

  async renewListenKey(): Promise<void> {
    if (!this.userDataStreamSubscribed) {
      return;
    }

    await this.withRateLimitRetry(async () => {
      await this.restClient.keepAliveFuturesUserDataListenKey();
      return true;
    });

    this.listenKeyHeartbeatAt = Date.now();
  }

  private async withRateLimitRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        attempt += 1;

        const statusCode = Number(error?.code ?? error?.statusCode ?? error?.response?.status);
        const retryAfterHeader =
          error?.headers?.['retry-after'] ??
          error?.response?.headers?.['retry-after'] ??
          error?.response?.headers?.['Retry-After'];

        const retryAfterSeconds = Number(retryAfterHeader);
        const isRateLimit = statusCode === 429;

        if (!isRateLimit || attempt > maxRetries) {
          throw error;
        }

        const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : 1000 * attempt;

        await sleep(waitMs);
      }
    }
  }
}
