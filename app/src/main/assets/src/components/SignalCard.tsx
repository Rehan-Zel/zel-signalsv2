"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Crosshair,
  Sparkles,
  CheckCircle2,
  BookmarkPlus,
  Copy,
  Check,
  BarChart3,
  Clock,
} from "lucide-react";

export interface CandleItem {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeSignal {
  bias: "Bullish" | "Bearish";
  confidence: number;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  reasoning: string;
  symbol: string;
  timeframe: string;
  currentPrice?: number;
  candles?: CandleItem[];
  source?: string;
  model?: string;
  timestamp?: string;
}

interface SignalCardProps {
  signal: TradeSignal;
  onLogPaperTrade: (signal: TradeSignal) => void;
  isAlreadyLogged?: boolean;
}

export function formatPriceDisplay(value: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
  if (Math.abs(value) < 2) return value.toFixed(4);
  if (Math.abs(value) < 50) return value.toFixed(3);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SignalCard({
  signal,
  onLogPaperTrade,
  isAlreadyLogged = false,
}: SignalCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCandles, setShowCandles] = useState<boolean>(true);

  const isBullish =
    String(signal.bias || "").toLowerCase() === "bullish";

  const riskDistance = Math.abs(signal.entry - signal.stopLoss);
  const rewardDistance = Math.abs(signal.takeProfit - signal.entry);
  const rrRatio =
    riskDistance > 0 ? (rewardDistance / riskDistance).toFixed(2) : "2.00";

  const tpPercent =
    signal.entry > 0
      ? (((signal.takeProfit - signal.entry) / signal.entry) * 100).toFixed(2)
      : "0.00";
  const slPercent =
    signal.entry > 0
      ? (((signal.stopLoss - signal.entry) / signal.entry) * 100).toFixed(2)
      : "0.00";

  const totalSpan = riskDistance + rewardDistance || 1;
  const riskSplitPct = Math.max(
    18,
    Math.min(82, Math.round((riskDistance / totalSpan) * 100))
  );
  const rewardSplitPct = 100 - riskSplitPct;

  const copyPrice = (label: string, val: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(String(val));
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const candles = signal.candles || [];
  const chronologicalCandles = [...candles].reverse();
  const minLow =
    chronologicalCandles.length > 0
      ? Math.min(...chronologicalCandles.map((c) => c.low))
      : 0;
  const maxHigh =
    chronologicalCandles.length > 0
      ? Math.max(...chronologicalCandles.map((c) => c.high))
      : 1;
  const priceRange = Math.max(maxHigh - minLow, 0.0001);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl bg-[#11161F] p-5 border transition-all duration-300 ${
        isBullish
          ? "border-[#00E676]/35 shadow-[0_0_30px_-8px_rgba(0,230,118,0.18)]"
          : "border-[#FF3366]/35 shadow-[0_0_30px_-8px_rgba(255,51,102,0.18)]"
      }`}
    >
      {/* Top ambient glow bar */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
          isBullish
            ? "bg-gradient-to-r from-transparent via-[#00E676] to-transparent"
            : "bg-gradient-to-r from-transparent via-[#FF3366] to-transparent"
        }`}
      />

      {/* Row 1: Asset Ticker, Timeframe & Directional Bias Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isBullish
                ? "border-[#00E676]/30 bg-[#00E676]/12 text-[#00E676]"
                : "border-[#FF3366]/30 bg-[#FF3366]/12 text-[#FF3366]"
            }`}
          >
            {isBullish ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold tracking-tight text-[#F3F6FA]">
                {signal.symbol}
              </h2>
              <span className="rounded-md border border-white/10 bg-[#181F2C] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-[#8E9BAE]">
                {signal.timeframe}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8E9BAE]">
              <Clock className="h-3 w-3 text-[#526075]" />
              <span>
                Spot:{" "}
                <strong className="font-mono text-[#F3F6FA] tabular-nums">
                  {formatPriceDisplay(signal.currentPrice ?? signal.entry)}
                </strong>
              </span>
              <span className="text-[#526075]">•</span>
              <span className="font-mono text-[11px] text-[#3B82F6]">
                1 : {rrRatio} R:R
              </span>
            </div>
          </div>
        </div>

        {/* Bias Pill */}
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${
            isBullish
              ? "border-[#00E676]/40 bg-[#00E676]/15 text-[#00E676]"
              : "border-[#FF3366]/40 bg-[#FF3366]/15 text-[#FF3366]"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full animate-pulse ${
              isBullish ? "bg-[#00E676]" : "bg-[#FF3366]"
            }`}
          />
          <span>{isBullish ? "Bullish Long" : "Bearish Short"}</span>
        </div>
      </div>

      {/* Row 2: Confidence Meter */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0A0D12]/60 p-3.5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold uppercase tracking-wider text-[#8E9BAE]">
            AI Signal Confidence
          </span>
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              isBullish ? "text-[#00E676]" : "text-[#FF3366]"
            }`}
          >
            {signal.confidence}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#181F2C]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(5, signal.confidence))}%` }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isBullish
                ? "bg-gradient-to-r from-[#3B82F6] to-[#00E676]"
                : "bg-gradient-to-r from-[#8B5CF6] to-[#FF3366]"
            }`}
          />
        </div>
      </div>

      {/* Row 3: 3-Column Execution Price Matrix (Entry, Take Profit, Stop Loss) */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {/* Entry Price */}
        <button
          type="button"
          onClick={() => copyPrice("entry", signal.entry)}
          title="Click to copy Entry price"
          className="group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#181F2C]/80 p-3 text-left transition hover:border-[#3B82F6]/50"
        >
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#8E9BAE]">
              <Crosshair className="h-3 w-3 text-[#3B82F6]" />
              Entry
            </span>
            {copiedField === "entry" ? (
              <Check className="h-3 w-3 text-[#00E676]" />
            ) : (
              <Copy className="h-3 w-3 text-[#526075] opacity-0 group-hover:opacity-100 transition" />
            )}
          </div>
          <div className="mt-2 font-mono text-base sm:text-lg font-bold tracking-tight text-[#F3F6FA] tabular-nums">
            {formatPriceDisplay(signal.entry)}
          </div>
          <span className="mt-1 font-mono text-[10px] text-[#3B82F6]">
            MARKET / LIMIT
          </span>
        </button>

        {/* Take Profit (TP) */}
        <button
          type="button"
          onClick={() => copyPrice("tp", signal.takeProfit)}
          title="Click to copy Take Profit price"
          className="group relative flex flex-col justify-between rounded-xl border border-[#00E676]/25 bg-[#00E676]/[0.07] p-3 text-left transition hover:border-[#00E676]/60"
        >
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#00E676]">
              <Target className="h-3 w-3" />
              Take Profit
            </span>
            {copiedField === "tp" ? (
              <Check className="h-3 w-3 text-[#00E676]" />
            ) : (
              <Copy className="h-3 w-3 text-[#00E676]/60 opacity-0 group-hover:opacity-100 transition" />
            )}
          </div>
          <div className="mt-2 font-mono text-base sm:text-lg font-bold tracking-tight text-[#00E676] tabular-nums">
            {formatPriceDisplay(signal.takeProfit)}
          </div>
          <span className="mt-1 font-mono text-[10px] text-[#00E676]/85 tabular-nums">
            {Number(tpPercent) > 0 ? `+${tpPercent}%` : `${tpPercent}%`} TARGET
          </span>
        </button>

        {/* Stop Loss (SL) */}
        <button
          type="button"
          onClick={() => copyPrice("sl", signal.stopLoss)}
          title="Click to copy Stop Loss price"
          className="group relative flex flex-col justify-between rounded-xl border border-[#FF3366]/25 bg-[#FF3366]/[0.07] p-3 text-left transition hover:border-[#FF3366]/60"
        >
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#FF3366]">
              <ShieldAlert className="h-3 w-3" />
              Stop Loss
            </span>
            {copiedField === "sl" ? (
              <Check className="h-3 w-3 text-[#00E676]" />
            ) : (
              <Copy className="h-3 w-3 text-[#FF3366]/60 opacity-0 group-hover:opacity-100 transition" />
            )}
          </div>
          <div className="mt-2 font-mono text-base sm:text-lg font-bold tracking-tight text-[#FF3366] tabular-nums">
            {formatPriceDisplay(signal.stopLoss)}
          </div>
          <span className="mt-1 font-mono text-[10px] text-[#FF3366]/85 tabular-nums">
            {Number(slPercent) > 0 ? `+${slPercent}%` : `${slPercent}%`} RISK
          </span>
        </button>
      </div>

      {/* Visual Price Ladder Bar (SL <-> Entry <-> TP) */}
      <div className="mt-3.5 rounded-xl border border-white/[0.05] bg-[#0A0D12]/60 px-3.5 py-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#8E9BAE] mb-1.5">
          <span className="text-[#FF3366]">SL Zone ({riskSplitPct}%)</span>
          <span className="text-[#F3F6FA]">Entry Pivot</span>
          <span className="text-[#00E676]">TP Zone ({rewardSplitPct}%)</span>
        </div>
        <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-[#181F2C]">
          <div
            style={{ width: `${riskSplitPct}%` }}
            className="h-full bg-gradient-to-r from-[#FF3366]/80 to-[#FF3366]/30"
          />
          <div className="h-full w-1 bg-white shadow-[0_0_6px_#fff]" />
          <div
            style={{ width: `${rewardSplitPct}%` }}
            className="h-full bg-gradient-to-r from-[#00E676]/30 to-[#00E676]/85"
          />
        </div>
      </div>

      {/* Optional 10-Candle OHLC Mini Terminal Strip */}
      {chronologicalCandles.length > 0 && (
        <div className="mt-3.5 rounded-xl border border-white/[0.06] bg-[#0A0D12]/70 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8E9BAE]">
              <BarChart3 className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Last {chronologicalCandles.length} OHLC Candles Analyzed</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCandles((prev) => !prev)}
              className="text-[11px] font-mono text-[#3B82F6] hover:underline"
            >
              {showCandles ? "Hide Chart" : "Show Chart"}
            </button>
          </div>

          {showCandles && (
            <div className="mt-1">
              <div className="grid grid-cols-10 items-end gap-1.5 h-20 pt-2 pb-1 px-1 border-b border-white/[0.05]">
                {chronologicalCandles.map((candle, idx) => {
                  const bullishCandle = candle.close >= candle.open;
                  const highPct = ((candle.high - minLow) / priceRange) * 100;
                  const lowPct = ((candle.low - minLow) / priceRange) * 100;
                  const bodyTopPct =
                    ((Math.max(candle.open, candle.close) - minLow) /
                      priceRange) *
                    100;
                  const bodyBottomPct =
                    ((Math.min(candle.open, candle.close) - minLow) /
                      priceRange) *
                    100;
                  const bodyHeightPct = Math.max(6, bodyTopPct - bodyBottomPct);
                  const wickHeightPct = Math.max(8, highPct - lowPct);

                  return (
                    <div
                      key={candle.datetime + idx}
                      title={`${candle.datetime}\nO: ${candle.open} | H: ${candle.high}\nL: ${candle.low} | C: ${candle.close}`}
                      className="relative flex h-full w-full flex-col items-center justify-end group"
                    >
                      {/* Wick */}
                      <div
                        style={{
                          bottom: `${lowPct}%`,
                          height: `${wickHeightPct}%`,
                        }}
                        className={`absolute w-[1.5px] ${
                          bullishCandle ? "bg-[#00E676]/60" : "bg-[#FF3366]/60"
                        }`}
                      />
                      {/* Candle Body */}
                      <div
                        style={{
                          bottom: `${bodyBottomPct}%`,
                          height: `${bodyHeightPct}%`,
                        }}
                        className={`absolute w-full max-w-[14px] rounded-[2px] transition-transform group-hover:scale-110 ${
                          bullishCandle
                            ? "bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.3)]"
                            : "bg-[#FF3366] shadow-[0_0_8px_rgba(255,51,102,0.3)]"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-[#526075] tabular-nums">
                <span>Low: {formatPriceDisplay(minLow)}</span>
                <span>10-Bar Structure ({signal.timeframe})</span>
                <span>High: {formatPriceDisplay(maxHigh)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 4: AI Reasoning Callout */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0A0D12]/80 p-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B5CF6]">
              AI Quantitative Reasoning
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#526075]">
            Qwen-2.5-32B
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[#F3F6FA]/90">
          {signal.reasoning}
        </p>
      </div>

      {/* Row 5: Log Paper Trade Action Button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => onLogPaperTrade(signal)}
          disabled={isAlreadyLogged}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-sm font-bold tracking-wide transition-all ${
            isAlreadyLogged
              ? "cursor-default border border-[#00E676]/40 bg-[#00E676]/15 text-[#00E676]"
              : "border border-[#3B82F6]/50 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-[0_0_24px_-4px_rgba(59,130,246,0.55)] hover:brightness-110 active:scale-[0.99]"
          }`}
        >
          {isAlreadyLogged ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Logged to Paper Trades ✓</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="h-4 w-4" />
              <span>Log Paper Trade</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
