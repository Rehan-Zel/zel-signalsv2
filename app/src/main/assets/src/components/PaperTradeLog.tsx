"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  RotateCcw,
  Award,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatPriceDisplay } from "./SignalCard";

export interface PaperTradeItem {
  id: string;
  symbol: string;
  timeframe: string;
  bias: "Bullish" | "Bearish";
  confidence: number;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  reasoning: string;
  status: "OPEN" | "WIN" | "LOSS";
  createdAt: string;
  resolvedAt?: string;
}

interface PaperTradeLogProps {
  trades: PaperTradeItem[];
  onUpdateTradeStatus: (id: string, status: "OPEN" | "WIN" | "LOSS") => void;
  onDeleteTrade: (id: string) => void;
  onClearAllTrades?: () => void;
}

export default function PaperTradeLog({
  trades,
  onUpdateTradeStatus,
  onDeleteTrade,
  onClearAllTrades,
}: PaperTradeLogProps) {
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "WIN" | "LOSS">("ALL");

  const filteredTrades = trades.filter((t) =>
    filter === "ALL" ? true : t.status === filter
  );

  const winCount = trades.filter((t) => t.status === "WIN").length;
  const lossCount = trades.filter((t) => t.status === "LOSS").length;
  const openCount = trades.filter((t) => t.status === "OPEN").length;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#11161F] p-5">
      {/* Header & Summary Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[#F3F6FA]">
              Paper Trade Ledger
            </h3>
            <p className="text-xs text-[#8E9BAE]">
              Resolve open setups to calibrate live terminal Win Rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <span className="rounded-lg border border-[#00E676]/30 bg-[#00E676]/10 px-2.5 py-1 text-[#00E676]">
            {winCount}W
          </span>
          <span className="rounded-lg border border-[#FF3366]/30 bg-[#FF3366]/10 px-2.5 py-1 text-[#FF3366]">
            {lossCount}L
          </span>
          <span className="rounded-lg border border-white/10 bg-[#181F2C] px-2.5 py-1 text-[#8E9BAE]">
            {openCount} Open
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-[#0A0D12] p-1 border border-white/[0.05]">
          {(["ALL", "OPEN", "WIN", "LOSS"] as const).map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold uppercase transition ${
                  active
                    ? "bg-[#181F2C] text-[#F3F6FA] shadow-sm border border-white/10"
                    : "text-[#8E9BAE] hover:text-[#F3F6FA]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {trades.length > 0 && onClearAllTrades && (
          <button
            type="button"
            onClick={onClearAllTrades}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#526075] transition hover:bg-[#FF3366]/10 hover:text-[#FF3366]"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Trade List */}
      <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filteredTrades.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0A0D12]/50 py-10 px-4 text-center"
            >
              <AlertCircle className="h-7 w-7 text-[#526075] mb-2" />
              <p className="text-sm font-medium text-[#8E9BAE]">
                {filter === "ALL"
                  ? "No paper trades logged yet."
                  : `No ${filter.toLowerCase()} paper trades found.`}
              </p>
              <p className="mt-1 text-xs text-[#526075]">
                Generate an AI signal above and click &ldquo;Log Paper Trade&rdquo; to track performance.
              </p>
            </motion.div>
          ) : (
            filteredTrades.map((trade) => {
              const isBullish =
                String(trade.bias).toLowerCase() === "bullish";
              const isWin = trade.status === "WIN";
              const isLoss = trade.status === "LOSS";
              const isOpen = trade.status === "OPEN";

              const formattedTime = (() => {
                try {
                  const d = new Date(trade.createdAt);
                  return d.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                } catch {
                  return "Recent";
                }
              })();

              return (
                <motion.div
                  key={trade.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl border p-3.5 transition ${
                    isWin
                      ? "border-[#00E676]/30 bg-[#00E676]/[0.04]"
                      : isLoss
                      ? "border-[#FF3366]/30 bg-[#FF3366]/[0.04]"
                      : "border-white/[0.07] bg-[#181F2C]/65"
                  }`}
                >
                  {/* Top Row: Symbol, Bias, Timeframe & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                          isBullish
                            ? "border-[#00E676]/30 bg-[#00E676]/12 text-[#00E676]"
                            : "border-[#FF3366]/30 bg-[#FF3366]/12 text-[#FF3366]"
                        }`}
                      >
                        {isBullish ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-[#F3F6FA]">
                            {trade.symbol}
                          </span>
                          <span className="rounded bg-[#0A0D12] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#8E9BAE]">
                            {trade.timeframe}
                          </span>
                          <span
                            className={`font-mono text-[10px] font-bold uppercase ${
                              isBullish ? "text-[#00E676]" : "text-[#FF3366]"
                            }`}
                          >
                            {trade.bias}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#526075]">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formattedTime}</span>
                          <span>•</span>
                          <span className="font-mono tabular-nums">
                            {trade.confidence}% Conf
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isWin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#00E676]/40 bg-[#00E676]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#00E676]">
                          <Award className="h-3 w-3" />
                          WIN ✅
                        </span>
                      )}
                      {isLoss && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FF3366]/40 bg-[#FF3366]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#FF3366]">
                          LOSS ❌
                        </span>
                      )}
                      {isOpen && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#3B82F6]">
                          ACTIVE
                        </span>
                      )}

                      {!isOpen && (
                        <button
                          type="button"
                          onClick={() => onUpdateTradeStatus(trade.id, "OPEN")}
                          title="Reset to Open"
                          className="rounded-lg p-1 text-[#526075] transition hover:bg-white/5 hover:text-[#F3F6FA]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteTrade(trade.id)}
                        title="Delete trade"
                        className="rounded-lg p-1 text-[#526075] transition hover:bg-[#FF3366]/10 hover:text-[#FF3366]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Entry / TP / SL */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-[#0A0D12]/80 px-3 py-2 font-mono text-xs tabular-nums border border-white/[0.04]">
                    <div>
                      <span className="block text-[10px] uppercase text-[#526075]">
                        Entry
                      </span>
                      <span className="font-semibold text-[#F3F6FA]">
                        {formatPriceDisplay(trade.entry)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#00E676]/80">
                        TP Target
                      </span>
                      <span className="font-semibold text-[#00E676]">
                        {formatPriceDisplay(trade.takeProfit)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#FF3366]/80">
                        SL Risk
                      </span>
                      <span className="font-semibold text-[#FF3366]">
                        {formatPriceDisplay(trade.stopLoss)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Outcome Action Buttons */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => onUpdateTradeStatus(trade.id, "WIN")}
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border font-display text-xs font-bold transition ${
                        isWin
                          ? "border-[#00E676] bg-[#00E676] text-[#0A0D12] shadow-[0_0_15px_rgba(0,230,118,0.35)]"
                          : "border-[#00E676]/35 bg-[#00E676]/10 text-[#00E676] hover:bg-[#00E676]/20"
                      }`}
                    >
                      <span>Mark as Win ✅</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateTradeStatus(trade.id, "LOSS")}
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border font-display text-xs font-bold transition ${
                        isLoss
                          ? "border-[#FF3366] bg-[#FF3366] text-white shadow-[0_0_15px_rgba(255,51,102,0.35)]"
                          : "border-[#FF3366]/35 bg-[#FF3366]/10 text-[#FF3366] hover:bg-[#FF3366]/20"
                      }`}
                    >
                      <span>Mark as Loss ❌</span>
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
