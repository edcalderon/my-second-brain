export type IntentAction =
  | 'OPEN_LONG'
  | 'OPEN_SHORT'
  | 'CLOSE_POSITION'
  | 'REDUCE'
  | 'FLIP';

export interface Candle {
  symbol: string;
  timeframe: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export interface PositionSnapshot {
  symbol: string;
  side: 'LONG' | 'SHORT' | 'FLAT';
  quantity: string;
  entryPrice: string;
  leverage: number;
  updatedAt: number;
}

export interface StrategyIntent {
  symbol: string;
  action: IntentAction;
  quantity: string;
  reason: string;
  reduceOnly?: boolean;
  correlationId?: string;
  createdAt: number;
}
