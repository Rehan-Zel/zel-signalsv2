"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  KeyRound,
  Cpu,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  twelveDataKey: string;
  aiKey: string;
  onSaveKeys: (twelveDataKey: string, aiKey: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  twelveDataKey,
  aiKey,
  onSaveKeys,
}: SettingsModalProps) {
  const [tdInput, setTdInput] = useState(twelveDataKey);
  const [aiInput, setAiInput] = useState(aiKey);
  const [showTdKey, setShowTdKey] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTdInput(twelveDataKey);
      setAiInput(aiKey);
      setSavedNotice(false);
    }
  }, [isOpen, twelveDataKey, aiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKeys(tdInput.trim(), aiInput.trim());
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 450);
  };

  const handleLoadDemoKeys = () => {
    setTdInput("ZEL_QUANT_SIM");
    setAiInput("ZEL_QUANT_SIM");
  };

  const handleClearKeys = () => {
    setTdInput("");
    setAiInput("");
  };

  const isDemoConfigured =
    tdInput.trim() === "ZEL_QUANT_SIM" || aiInput.trim() === "ZEL_QUANT_SIM";
  const isLiveConfigured =
    Boolean(tdInput.trim()) &&
    Boolean(aiInput.trim()) &&
    !isDemoConfigured;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0A0D12]/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#11161F] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
          >
            {/* Top accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#00E676]" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/12 text-[#3B82F6]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#F3F6FA]">
                    API Terminal Settings
                  </h2>
                  <p className="text-xs text-[#8E9BAE]">
                    Configure Twelve Data & OpenRouter credentials
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Settings"
                className="rounded-lg border border-white/[0.08] bg-[#181F2C] p-2 text-[#8E9BAE] transition hover:text-[#F3F6FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Connection Status Banner */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0A0D12]/70 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLiveConfigured
                      ? "bg-[#00E676] shadow-[0_0_8px_#00E676]"
                      : isDemoConfigured
                      ? "bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]"
                      : "bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]"
                  }`}
                />
                <span className="font-medium text-[#F3F6FA]">
                  {isLiveConfigured
                    ? "Live API Keys Ready"
                    : isDemoConfigured
                    ? "Quant Simulator Keys Active"
                    : "API Keys Not Set"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemoKeys}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#8B5CF6]/40 bg-[#8B5CF6]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#8B5CF6] transition hover:bg-[#8B5CF6]/25"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Use Demo Keys</span>
                </button>
                {(tdInput || aiInput) && (
                  <button
                    type="button"
                    onClick={handleClearKeys}
                    title="Clear inputs"
                    className="rounded-lg border border-white/10 bg-[#181F2C] p-1 text-[#8E9BAE] hover:text-[#FF3366]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Twelve Data API Key Input */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="twelve-data-key"
                    className="text-xs font-semibold uppercase tracking-wider text-[#8E9BAE]"
                  >
                    Twelve Data API Key
                  </label>
                  <span className="font-mono text-[10px] text-[#526075]">
                    api.twelvedata.com
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="twelve-data-key"
                    type={showTdKey ? "text" : "password"}
                    value={tdInput}
                    onChange={(e) => setTdInput(e.target.value)}
                    placeholder="Enter Twelve Data API Key..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#181F2C] pl-3.5 pr-10 font-mono text-xs text-[#F3F6FA] placeholder-[#526075] outline-none transition focus:border-[#3B82F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTdKey((prev) => !prev)}
                    aria-label="Toggle Twelve Data Key visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9BAE] hover:text-[#F3F6FA]"
                  >
                    {showTdKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#526075]">
                  Fetches real 10-bar OHLC time series candles for your selected asset.
                </p>
              </div>

              {/* OpenRouter API Key Input */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="openrouter-key"
                    className="text-xs font-semibold uppercase tracking-wider text-[#8E9BAE]"
                  >
                    OpenRouter API Key
                  </label>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#8B5CF6]">
                    <Cpu className="h-3 w-3" />
                    qwen-2.5-coder-32b
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="openrouter-key"
                    type={showAiKey ? "text" : "password"}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#181F2C] pl-3.5 pr-10 font-mono text-xs text-[#F3F6FA] placeholder-[#526075] outline-none transition focus:border-[#3B82F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiKey((prev) => !prev)}
                    aria-label="Toggle OpenRouter Key visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9BAE] hover:text-[#F3F6FA]"
                  >
                    {showAiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#526075]">
                  Powers structured trade signal generation via OpenRouter Chat Completions.
                </p>
              </div>

              {/* LocalStorage Privacy Note */}
              <div className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-[#0A0D12]/60 p-3 text-[11px] text-[#8E9BAE]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00E676]" />
                <span>
                  Keys are stored locally in your browser&apos;s{" "}
                  <code className="font-mono text-[#F3F6FA]">localStorage</code>{" "}
                  and transmitted directly to the signal API route on request.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-[#181F2C] font-display text-xs font-bold text-[#8E9BAE] transition hover:text-[#F3F6FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex h-11 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] font-display text-xs font-bold text-white shadow-[0_0_20px_-4px_rgba(59,130,246,0.6)] transition hover:brightness-110"
                >
                  {savedNotice ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#00E676]" />
                      <span>Keys Saved!</span>
                    </>
                  ) : (
                    <span>Save API Configuration</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
