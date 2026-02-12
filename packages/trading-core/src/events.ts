import type { Candle, StrategyIntent } from './types.js';

export type PlatformEventType =
  | 'CANDLE_CLOSED'
  | 'WS_STATUS'
  | 'STRATEGY_INTENT'
  | 'ORDER_SENT'
  | 'ORDER_FILLED'
  | 'ORDER_REJECTED'
  | 'RISK_BLOCKED'
  | 'STATE_DRIFT'
  | 'KILL_SWITCH';

export interface WsStatusPayload {
  status: 'connected' | 'reconnecting' | 'synced' | 'disconnected';
  service: 'market-data' | 'executor' | 'strategy';
  message?: string;
}

export interface OrderEventPayload {
  symbol: string;
  clientOrderId: string;
  status: 'NEW' | 'FILLED' | 'REJECTED';
  reason?: string;
}

export interface RiskBlockedPayload {
  symbol: string;
  reason: string;
}

export interface DriftPayload {
  symbol: string;
  reason: string;
}

export interface KillSwitchPayload {
  active: boolean;
  reason: string;
}

export interface PlatformEventPayloadMap {
  CANDLE_CLOSED: Candle;
  WS_STATUS: WsStatusPayload;
  STRATEGY_INTENT: StrategyIntent;
  ORDER_SENT: OrderEventPayload;
  ORDER_FILLED: OrderEventPayload;
  ORDER_REJECTED: OrderEventPayload;
  RISK_BLOCKED: RiskBlockedPayload;
  STATE_DRIFT: DriftPayload;
  KILL_SWITCH: KillSwitchPayload;
}

export interface PlatformEvent<K extends PlatformEventType = PlatformEventType> {
  type: K;
  payload: PlatformEventPayloadMap[K];
  correlationId: string;
  timestamp: number;
}
