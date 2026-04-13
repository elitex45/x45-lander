// Shared interface for the trading engine — used by UI components
// that work with both the Live engine and Replay engine.

import type { LiveEngineState, OrderDraft, Position } from "./liveEngine";

export type TradingEngine = {
  state: LiveEngineState;
  place: (draft: OrderDraft) => void;
  cancel: (orderId: string) => void;
  close: (positionId: string, fraction?: number) => void;
  resetAccount: (balance?: number) => void;
  selectAccountStats: () => {
    balance: number;
    equity: number;
    marginUsed: number;
    freeMargin: number;
    unrealizedPnl: number;
    mark: number;
  };
  selectMarkPnl: (pos: Position) => number;
};
