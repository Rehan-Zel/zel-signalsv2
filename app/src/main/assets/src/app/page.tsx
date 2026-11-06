"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Zap,
  Radio,
  AlertTriangle,
  Search,
  Clock,
  Activity,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import SignalCard, { type TradeSignal } from "@/components/SignalCard";
import PaperTradeLog, { type PaperTradeItem } from "@/components/PaperTradeLog";
import SettingsModal from "@/components/SettingsModal";

const STORAGE_KEYS = {
  TWELVE_DATA: "zel_twelve_data_key",
  OPENROUTER: "zel_openrouter_key",
  TRADES: "zel_paper_trades",
  LAST_SIGNAL: "zel_last_signal",
  SEEDED: "zel_initial_seeded_v1",
};

const QUICK_TICKERS = [
  "XAU/USD",
  "BTC/USDT",
  "ETH/USDT",
  "EUR/USD",
  "SOL/USDT",
  "NVDA",
];

const TIMEFRAMES = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1day", label: "1DAY" },
] as const;

const INITIAL_SIGNAL: TradeSignal = {
  symbol: "XAU/USD",
  timeframe: "1h",
  bias: "Bullish",
  confidence: 86,
  entry: 2918.4,
  takeProfit: 2946.8,
  stopLoss: 2904.6,
  currentPrice: 2918.4,
  reasoning:
    "XAU/USD (1h) exhibits strong institutional demand absorption above the 2910 liquidity shelf, printing 7/10 bullish hourly closes with expanding body-to-wick ratios. Entry at 2918.40 targets upper channel expansion at 2946.80 while maintaining disciplined 1.45x ATR downside invalidation at 2904.60.",
  source: "quant-sim",
  model: "qwen/qwen-2.5-coder-32b-instruct",
  candles: [
    { datetime: "2025-05-12 18:00:00", open: 2914.2, high: 2920.1, low: 2912.8, close: 2918.4 },
    { datetime: "2025-05-12 17:00:00", open: 2911.5, high: 2916.0, low: 2909.4, close: 2914.2 },
    { datetime: "2025-05-12 16:00:00", open: 2913.0, high: 2915.4, low: 2908.9, close: 2911.5 },
    { datetime: "2025-05-12 15:00:00", open: 2907.8, high: 2914.6, low: 2906.2, close: 2913.0 },
    { datetime: "2025-05-12 14:00:00", open: 2905.1, high: 2909.5, low: 2903.7, close: 2907.8 },
    { datetime: "2025-05-12 13:00:00", open: 2908.4, high: 2910.2, low: 2904.0, close: 2905.1 },
    { datetime: "2025-05-12 12:00:00", open: 2902.6, high: 2909.8, low: 2901.5, close: 2908.4 },
    { datetime: "2025-05-12 11:00:00", open: 2899.2, high: 2904.1, low: 2897.8, close: 2902.6 },
    { datetime: "2025-05-12 10:00:00", open: 2901.0, high: 2903.0, low: 2896.9, close: 2899.2 },
    { datetime: "2025-05-12 09:00:00", open: 2896.4, high: 2902.5, low: 2894.8, close: 2901.0 },
  ],
};

const INITIAL_TRADES: PaperTradeItem[] = [
  {
    id: "seed-trade-1",
    symbol: "BTC/USDT",
    timeframe: "4h",
    bias: "Bullish",
    confidence: 88,
    entry: 93450.0,
    takeProfit: 95200.0,
    stopLoss: 92600.0,
    reasoning:
      "Breakout above 4H order block with bullish volume divergence and rising EMA support.",
    status: "WIN",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "seed-trade-2",
    symbol: "EUR/USD",
    timeframe: "1h",
    bias: "Bearish",
    confidence: 79,
    entry: 1.0512,
    takeProfit: 1.0465,
    stopLoss: 1.0538,
    reasoning:
      "Rejection wick at 1.0520 supply zone followed by bearish engulfing structure.",
    status: "WIN",
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "seed-trade-3",
    symbol: "SOL/USDT",
    timeframe: "1h",
    bias: "Bullish",
    confidence: 72,
    entry: 186.4,
    takeProfit: 193.5,
    stopLoss: 183.1,
    reasoning:
      "Attempted continuation bounce off intraday VWAP invalidated by macro pullback.",
    status: "LOSS",
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 390).toISOString(),
  },
];

export default function ZelSignalsDashboard() {
  const [symbol, setSymbol] = useState<string>("XAU/USD");
  const [timeframe, setTimeframe] = useState<"1h" | "4h" | "1day">("1h");
  const [twelveDataKey, setTwelveDataKey] = useState<string>("");
  const [aiKey, setAiKey] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [currentSignal, setCurrentSignal] = useState<TradeSignal>(INITIAL_SIGNAL);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggedSignalSignature, setLoggedSignalSignature] = useState<string | null>(
    null
  );

  const [trades, setTrades] = useState<PaperTradeItem[]>(INITIAL_TRADES);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hydrate API keys, last signal, and paper trades from LocalStorage + sync with DB
  useEffect(() => {
    try {
      const savedTdKey = localStorage.getItem(STORAGE_KEYS.TWELVE_DATA) || "";
      const savedAiKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER) || "";
      setTwelveDataKey(savedTdKey);
      setAiKey(savedAiKey);

      const savedSignal = localStorage.getItem(STORAGE_KEYS.LAST_SIGNAL);
      if (savedSignal) {
        const parsedSignal = JSON.parse(savedSignal);
        if (parsedSignal && parsedSignal.symbol && parsedSignal.entry) {
          setCurrentSignal(parsedSignal);
        }
      }

      const savedTradesRaw = localStorage.getItem(STORAGE_KEYS.TRADES);
      const alreadySeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);

      if (savedTradesRaw) {
        const parsedTrades = JSON.parse(savedTradesRaw);
        if (Array.isArray(parsedTrades)) {
          setTrades(parsedTrades);
        }
      } else if (!alreadySeeded) {
        localStorage.setItem(
          STORAGE_KEYS.TRADES,
          JSON.stringify(INITIAL_TRADES)
        );
        localStorage.setItem(STORAGE_KEYS.SEEDED, "true");
        setTrades(INITIAL_TRADES);
        // Also sync initial trades to PostgreSQL
        INITIAL_TRADES.forEach((t) => {
          fetch("/api/trades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: t.id,
              symbol: t.symbol,
              timeframe: t.timeframe,
              bias: t.bias,
              confidence: t.confidence,
              entry: t.entry,
              takeProfit: t.takeProfit,
              stopLoss: t.stopLoss,
              reasoning: t.reasoning,
              status: t.status,
            }),
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.error("Failed reading localStorage:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save trades to LocalStorage whenever updated
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
    } catch (err) {
      console.error("Failed saving trades to localStorage:", err);
    }
  }, [trades, hydrated]);

  // Save API Keys handler
  const handleSaveKeys = useCallback((newTdKey: string, newAiKey: string) => {
    setTwelveDataKey(newTdKey);
    setAiKey(newAiKey);
    try {
      localStorage.setItem(STORAGE_KEYS.TWELVE_DATA, newTdKey);
      localStorage.setItem(STORAGE_KEYS.OPENROUTER, newAiKey);
    } catch (err) {
      console.error("Failed saving keys to localStorage:", err);
    }
  }, []);

  // Calculate Win Rate (%)
  const { winRate, winCount, lossCount, resolvedCount } = useMemo(() => {
    const wins = trades.filter((t) => t.status === "WIN").length;
    const losses = trades.filter((t) => t.status === "LOSS").length;
    const resolved = wins + losses;
    const rate = resolved > 0 ? Math.round((wins / resolved) * 100) : 0;
    return {
      winRate: rate,
      winCount: wins,
      lossCount: losses,
      resolvedCount: resolved,
    };
  }, [trades]);

  // Generate Signal Handler
  const handleGenerateSignal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanedSymbol = symbol.trim().toUpperCase();
    if (!cleanedSymbol) {
      setErrorMessage("Please enter an asset symbol (e.g., XAU/USD or BTC/USDT).");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // If user hasn't entered personal paid keys yet, automatically enable quant simulator unless they entered custom keys
      const hasCustomKeys =
        Boolean(twelveDataKey.trim()) || Boolean(aiKey.trim());
      const isExplicitDemo =
        twelveDataKey.trim() === "ZEL_QUANT_SIM" ||
        aiKey.trim() === "ZEL_QUANT_SIM";

      const response = await fetch("/api/signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: cleanedSymbol,
          timeframe,
          twelveDataKey: hasCustomKeys ? twelveDataKey.trim() : "ZEL_QUANT_SIM",
          aiKey: hasCustomKeys ? aiKey.trim() : "ZEL_QUANT_SIM",
          useQuantSimulator: !hasCustomKeys || isExplicitDemo,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setErrorMessage(
          data.error ||
            `Unable to generate signal for ${cleanedSymbol}. Verify symbol and API keys.`
        );
        setIsLoading(false);
        return;
      }

      const generatedSignal: TradeSignal = {
        bias: data.bias === "Bearish" ? "Bearish" : "Bullish",
        confidence: Number(data.confidence) || 78,
        entry: Number(data.entry),
        takeProfit: Number(data.takeProfit),
        stopLoss: Number(data.stopLoss),
        reasoning: String(data.reasoning || ""),
        symbol: data.symbol || cleanedSymbol,
        timeframe: data.timeframe || timeframe,
        currentPrice: Number(data.currentPrice || data.entry),
        candles: Array.isArray(data.candles) ? data.candles : [],
        source: data.source || "live",
        model: data.model || "qwen/qwen-2.5-coder-32b-instruct",
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setCurrentSignal(generatedSignal);
      setLoggedSignalSignature(null);

      try {
        localStorage.setItem(
          STORAGE_KEYS.LAST_SIGNAL,
          JSON.stringify(generatedSignal)
        );
      } catch {
        // Ignore storage quota issues
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Network error while contacting signal engine."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Log Paper Trade Handler
  const handleLogPaperTrade = useCallback((sig: TradeSignal) => {
    const signature = `${sig.symbol}-${sig.timeframe}-${sig.entry}-${sig.takeProfit}-${sig.stopLoss}`;
    const newTrade: PaperTradeItem = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol: sig.symbol,
      timeframe: sig.timeframe,
      bias: sig.bias,
      confidence: sig.confidence,
      entry: sig.entry,
      takeProfit: sig.takeProfit,
      stopLoss: sig.stopLoss,
      reasoning: sig.reasoning,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    setTrades((prev) => [newTrade, ...prev]);
    setLoggedSignalSignature(signature);

    // Sync to PostgreSQL
    fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: newTrade.id,
        symbol: newTrade.symbol,
        timeframe: newTrade.timeframe,
        bias: newTrade.bias,
        confidence: newTrade.confidence,
        entry: newTrade.entry,
        takeProfit: newTrade.takeProfit,
        stopLoss: newTrade.stopLoss,
        reasoning: newTrade.reasoning,
        status: newTrade.status,
      }),
    }).catch(() => {});
  }, []);

  // Update Paper Trade Status (Mark as Win / Mark as Loss)
  const handleUpdateTradeStatus = useCallback(
    (id: string, status: "OPEN" | "WIN" | "LOSS") => {
      setTrades((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                resolvedAt:
                  status === "OPEN" ? undefined : new Date().toISOString(),
              }
            : t
        )
      );

      fetch("/api/trades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id, status }),
      }).catch(() => {});
    },
    []
  );

  // Delete single trade
  const handleDeleteTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    fetch(`/api/trades?clientId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
  }, []);

  // Clear all trades
  const handleClearAllTrades = useCallback(() => {
    setTrades([]);
    fetch("/api/trades", { method: "DELETE" }).catch(() => {});
  }, []);

  const currentSignalSignature = `${currentSignal.symbol}-${currentSignal.timeframe}-${currentSignal.entry}-${currentSignal.takeProfit}-${currentSignal.stopLoss}`;
  const isCurrentSignalLogged =
    loggedSignalSignature === currentSignalSignature;

  // SVG Ring Geometry for Header Win Rate
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, winRate)) / 100) * circumference;

  const isLiveKeysConfigured =
    Boolean(twelveDataKey.trim()) &&
    Boolean(aiKey.trim()) &&
    twelveDataKey.trim() !== "ZEL_QUANT_SIM" &&
    aiKey.trim() !== "ZEL_QUANT_SIM";

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#F3F6FA] selection:bg-[#3B82F6]/30 selection:text-white pb-12">
      {/* Ambient Radial Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-80 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(59,130,246,0.16),transparent)]"
      />

      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0A0D12]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B82F6]/40 bg-gradient-to-br from-[#3B82F6]/25 to-[#8B5CF6]/20 shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)]">
              <Zap className="h-4 w-4 text-[#3B82F6]" />
              <span
                className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0A0D12] ${
                  isLiveKeysConfigured ? "bg-[#00E676]" : "bg-[#3B82F6]"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-base font-bold tracking-tight text-[#F3F6FA]">
                  Zel Signals
                </h1>
                <span className="rounded border border-[#8B5CF6]/35 bg-[#8B5CF6]/12 px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                  AI v2.5
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 text-[11px] text-[#8E9BAE] hover:text-[#F3F6FA]"
              >
                <Radio className="h-2.5 w-2.5 text-[#00E676]" />
                <span>
                  {isLiveKeysConfigured
                    ? "Twelve Data + OpenRouter Live"
                    : "Quant Terminal Ready"}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Circular Win Rate Progress Ring + Settings Gear */}
          <div className="flex items-center gap-2.5">
            <div
              title={`Paper Trade Win Rate: ${winRate}% (${winCount}W / ${lossCount}L)`}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#11161F] px-2.5 py-1.5"
            >
              <div className="relative flex h-10 w-10 items-center justify-center">
                <svg
                  className="-rotate-90 h-10 w-10 transform"
                  viewBox="0 0 42 42"
                >
                  <circle
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    stroke="#181F2C"
                    strokeWidth="3.5"
                  />
                  <motion.circle
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    stroke={
                      resolvedCount === 0
                        ? "#3B82F6"
                        : winRate >= 50
                        ? "#00E676"
                        : "#FF3366"
                    }
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute font-mono text-[10px] font-bold tabular-nums text-[#F3F6FA]">
                  {winRate}%
                </span>
              </div>
              <div className=" pr-0.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#8E9BAE]">
                  Win Rate
                </span>
                <span className="font-mono text-xs font-bold tabular-nums text-[#F3F6FA]">
                  {winCount}W-{lossCount}L
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open API Settings"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#11161F] text-[#8E9BAE] transition hover:border-[#3B82F6]/50 hover:text-[#F3F6FA]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile-First Container */}
      <main className="relative z-10 mx-auto max-w-[480px] space-y-4 px-4 pt-4">
        {/* Section 1: Market Selector Card */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#11161F] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#3B82F6]" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#F3F6FA]">
                Market Scanner & Timeframe
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-[#181F2C] px-2 py-1 font-mono text-[10px] text-[#8E9BAE] transition hover:border-[#3B82F6]/40 hover:text-[#F3F6FA]"
            >
              <Sparkles className="h-2.5 w-2.5 text-[#8B5CF6]" />
              <span>{isLiveKeysConfigured ? "Live Keys" : "API Keys"}</span>
            </button>
          </div>

          <form onSubmit={handleGenerateSignal} className="space-y-3.5">
            {/* Asset Symbol Input */}
            <div>
              <label
                htmlFor="asset-symbol-input"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8E9BAE]"
              >
                Asset Ticker Symbol
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526075]" />
                <input
                  id="asset-symbol-input"
                  type="text"
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. XAU/USD, BTC/USDT, EUR/USD"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#181F2C] pl-10 pr-16 font-mono text-sm font-bold uppercase tracking-wider text-[#F3F6FA] placeholder-[#526075] outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#0A0D12]/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#8E9BAE]">
                  SPOT
                </span>
              </div>

              {/* Quick Ticker Preset Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {QUICK_TICKERS.map((ticker) => {
                  const isSelected = symbol.trim().toUpperCase() === ticker;
                  return (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => {
                        setSymbol(ticker);
                        setErrorMessage(null);
                      }}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                        isSelected
                          ? "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-[#3B82F6]"
                          : "border-white/[0.06] bg-[#181F2C]/70 text-[#8E9BAE] hover:border-white/15 hover:text-[#F3F6FA]"
                      }`}
                    >
                      {ticker}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeframe Segmented Selector (1h, 4h, 1day) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8E9BAE]">
                  <Clock className="h-3.5 w-3.5 text-[#3B82F6]" />
                  <span>Candle Interval</span>
                </label>
                <span className="font-mono text-[10px] text-[#526075]">
                  10-Bar Lookback
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.06] bg-[#0A0D12] p-1">
                {TIMEFRAMES.map((tf) => {
                  const active = timeframe === tf.value;
                  return (
                    <button
                      key={tf.value}
                      type="button"
                      onClick={() => setTimeframe(tf.value)}
                      className={`relative h-9 rounded-lg font-mono text-xs font-bold uppercase transition ${
                        active
                          ? "bg-[#181F2C] text-[#F3F6FA] shadow-sm border border-[#3B82F6]/40"
                          : "text-[#8E9BAE] hover:text-[#F3F6FA]"
                      }`}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Signal Primary CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3B82F6] via-[#2563EB] to-[#4F46E5] font-display text-sm font-bold tracking-wide text-white shadow-[0_0_28px_-4px_rgba(59,130,246,0.65)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing 10 Candles via Qwen-2.5 AI...</span>
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  <span>Generate Signal</span>
                </>
              )}
            </button>
          </form>

          {/* Graceful Error Banner for Invalid Symbols or Twelve Data / OpenRouter Errors */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 rounded-xl border border-[#FF3366]/40 bg-[#FF3366]/12 p-3.5 text-xs text-[#FF3366]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF3366]" />
                    <div>
                      <p className="font-bold uppercase tracking-wider">
                        Signal Engine Error
                      </p>
                      <p className="mt-0.5 leading-relaxed text-[#F3F6FA]/90">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="shrink-0 rounded-lg border border-[#FF3366]/40 bg-[#0A0D12]/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#F3F6FA] hover:bg-[#FF3366]/20"
                  >
                    Keys
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Section 2: Active AI Signal Card */}
        <SignalCard
          signal={currentSignal}
          onLogPaperTrade={handleLogPaperTrade}
          isAlreadyLogged={isCurrentSignalLogged}
        />

        {/* Section 3: Paper Trade History Log */}
        <PaperTradeLog
          trades={trades}
          onUpdateTradeStatus={handleUpdateTradeStatus}
          onDeleteTrade={handleDeleteTrade}
          onClearAllTrades={handleClearAllTrades}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        twelveDataKey={twelveDataKey}
        aiKey={aiKey}
        onSaveKeys={handleSaveKeys}
      />
    </div>
  );
}
