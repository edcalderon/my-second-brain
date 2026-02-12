import type { StrategyIntent } from './types.js';

export interface RiskLimits {
  maxOpenPositions: number;
  maxLeveragePerSymbol: number;
  maxNotionalPerSymbolUsd: number;
}

export interface RiskEvaluation {
  approved: boolean;
  reason: string;
}

export class RiskEngine {
  constructor(private readonly limits: RiskLimits) {}

  evaluate(intent: StrategyIntent, context: { openPositions: number; leverage: number; notionalUsd: number }): RiskEvaluation {
    if (context.openPositions > this.limits.maxOpenPositions) {
      return { approved: false, reason: 'max open positions reached' };
    }

    if (context.leverage > this.limits.maxLeveragePerSymbol) {
      return { approved: false, reason: 'max leverage exceeded' };
    }

    if (context.notionalUsd > this.limits.maxNotionalPerSymbolUsd) {
      return { approved: false, reason: 'max notional exceeded' };
    }

    return { approved: true, reason: `approved:${intent.action}` };
  }
}
