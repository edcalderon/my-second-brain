declare module '@ed/exchange-binance-futures' {
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
  }

  export class BinanceFuturesExchangeAdapter {
    static fromProvider(name: 'binance-tiago' | 'mock', config?: Record<string, unknown>): BinanceFuturesExchangeAdapter;
    placeMarketOrder(params: MarketOrderParams): Promise<ExchangeOrderResult>;
  }
}
