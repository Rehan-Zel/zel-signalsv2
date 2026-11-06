import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export interface CandleData {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  bias: text("bias").notNull(), // "Bullish" | "Bearish"
  confidence: integer("confidence").notNull(),
  entry: doublePrecision("entry").notNull(),
  takeProfit: doublePrecision("take_profit").notNull(),
  stopLoss: doublePrecision("stop_loss").notNull(),
  reasoning: text("reasoning").notNull(),
  candles: jsonb("candles").$type<CandleData[]>(),
  source: text("source").default("live").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paperTrades = pgTable("paper_trades", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  bias: text("bias").notNull(), // "Bullish" | "Bearish"
  confidence: integer("confidence").notNull(),
  entry: doublePrecision("entry").notNull(),
  takeProfit: doublePrecision("take_profit").notNull(),
  stopLoss: doublePrecision("stop_loss").notNull(),
  reasoning: text("reasoning").notNull(),
  status: text("status").default("OPEN").notNull(), // "OPEN" | "WIN" | "LOSS"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type SignalRecord = typeof signals.$inferSelect;
export type NewSignalRecord = typeof signals.$inferInsert;
export type PaperTradeRecord = typeof paperTrades.$inferSelect;
export type NewPaperTradeRecord = typeof paperTrades.$inferInsert;
