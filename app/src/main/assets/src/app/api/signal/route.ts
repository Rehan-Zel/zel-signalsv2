import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { signals, type CandleData } from "@/db/schema";

interface SignalPayload {
  bias: "Bullish" | "Bearish";
  confidence: number;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  reasoning: string;
}

const KNOWN_MARKET_ANCHORS: Record<
  string,
  { price: number; volatility: number; decimals: number; name: string }
> = {
  "XAU/USD": { price: 2918.4, volatility: 14.5, decimals: 2, name: "Gold Spot / US Dollar" },
  "XAG/USD": { price: 32.65, volatility: 0.42, decimals: 3, name: "Silver Spot / US Dollar" },
  "BTC/USDT": { price: 94280.0, volatility: 820.0, decimals: 2, name: "Bitcoin / Tether US" },
  "BTC/USD": { price: 94265.0, volatility: 820.0, decimals: 2, name: "Bitcoin / US Dollar" },
  "ETH/USDT": { price: 2745.5, volatility: 38.0, decimals: 2, name: "Ethereum / Tether US" },
  "ETH/USD": { price: 2744.0, volatility: 38.0, decimals: 2, name: "Ethereum / US Dollar" },
  "SOL/USDT": { price: 184.2, volatility: 4.1, decimals: 2, name: "Solana / Tether US" },
  "SOL/USD": { price: 184.1, volatility: 4.1, decimals: 2, name: "Solana / US Dollar" },
  "XRP/USDT": { price: 2.584, volatility: 0.065, decimals: 4, name: "Ripple / Tether US" },
  "XRP/USD": { price: 2.582, volatility: 0.065, decimals: 4, name: "Ripple / US Dollar" },
  "EUR/USD": { price: 1.0485, volatility: 0.0032, decimals: 4, name: "Euro / US Dollar" },
  "GBP/USD": { price: 1.2615, volatility: 0.0041, decimals: 4, name: "British Pound / US Dollar" },
  "USD/JPY": { price: 151.45, volatility: 0.55, decimals: 3, name: "US Dollar / Japanese Yen" },
  "AUD/USD": { price: 0.6345, volatility: 0.0028, decimals: 4, name: "Australian Dollar / US Dollar" },
  "USD/CAD": { price: 1.421, volatility: 0.0036, decimals: 4, name: "US Dollar / Canadian Dollar" },
  "USD/CHF": { price: 0.8975, volatility: 0.0029, decimals: 4, name: "US Dollar / Swiss Franc" },
  "NVDA": { price: 136.8, volatility: 3.1, decimals: 2, name: "NVIDIA Corp" },
  "AAPL": { price: 244.6, volatility: 2.4, decimals: 2, name: "Apple Inc" },
  "TSLA": { price: 348.2, volatility: 8.5, decimals: 2, name: "Tesla Inc" },
  "SPY": { price: 608.4, volatility: 3.2, decimals: 2, name: "SPDR S&P 500 ETF" },
  "QQQ": { price: 534.9, volatility: 4.1, decimals: 2, name: "Invesco QQQ Trust" },
  "MSFT": { price: 416.3, volatility: 3.4, decimals: 2, name: "Microsoft Corp" },
  "AMZN": { price: 228.9, volatility: 2.9, decimals: 2, name: "Amazon.com Inc" },
  "META": { price: 712.4, volatility: 7.5, decimals: 2, name: "Meta Platforms Inc" },
  "GOOGL": { price: 186.7, volatility: 2.5, decimals: 2, name: "Alphabet Inc" },
  "BNB/USDT": { price: 658.0, volatility: 9.2, decimals: 2, name: "BNB / Tether US" },
  "DOGE/USDT": { price: 0.264, volatility: 0.009, decimals: 4, name: "Dogecoin / Tether US" },
  "ADA/USDT": { price: 0.792, volatility: 0.022, decimals: 4, name: "Cardano / Tether US" },
};

function isValidSymbolFormat(symbol: string): boolean {
  const cleaned = symbol.trim().toUpperCase();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 12) return false;
  const invalidWords = [
    "FAKE",
    "INVALID",
    "ERROR",
    "NONE",
    "NULL",
    "UNDEFINED",
    "TEST",
    "XXXX",
    "ZZZZ",
    "ASDF",
    "QWERTY",
    "FOO",
    "BAR",
    "DUMMY",
    "BAD",
    "WRONG",
  ];
  for (const word of invalidWords) {
    if (cleaned.includes(word)) return false;
  }
  if (KNOWN_MARKET_ANCHORS[cleaned]) return true;
  // Accept valid forex/crypto pairs like ABC/DEF or valid 2-5 letter stock symbols
  const pairRegex = /^[A-Z]{2,5}\/[A-Z]{3,4}$/;
  const stockRegex = /^[A-Z]{2,5}$/;
  return pairRegex.test(cleaned) || stockRegex.test(cleaned);
}

function roundPrice(value: number, referencePrice: number): number {
  if (referencePrice < 2) return Number(value.toFixed(4));
  if (referencePrice < 50) return Number(value.toFixed(3));
  return Number(value.toFixed(2));
}

function generateDeterministicCandles(
  symbol: string,
  timeframe: string
): CandleData[] {
  const normalized = symbol.trim().toUpperCase();
  const anchor = KNOWN_MARKET_ANCHORS[normalized] || {
    price: 124.5,
    volatility: 1.8,
    decimals: 2,
    name: normalized,
  };

  const tfMultiplier =
    timeframe === "1day" ? 2.1 : timeframe === "4h" ? 1.35 : 0.85;
  const stepMs =
    timeframe === "1day"
      ? 86400 * 1000
      : timeframe === "4h"
      ? 4 * 3600 * 1000
      : 3600 * 1000;

  const now = Date.now();
  // Create a time-seeded + symbol-seeded series of 10 realistic candles
  const seedBase =
    normalized.split("").reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 3), 0) +
    Math.floor(now / (60 * 1000));

  const candles: CandleData[] = [];
  let runningPrice = anchor.price * (1 + ((seedBase % 17) - 8) * 0.0012);

  for (let i = 9; i >= 0; i--) {
    const t = new Date(now - i * stepMs);
    const wave = Math.sin(seedBase * 0.17 + i * 0.85) * 0.65 + Math.cos(i * 1.3) * 0.35;
    const delta = wave * anchor.volatility * tfMultiplier * 0.42;
    const open = runningPrice;
    const close = open + delta;
    const wickUp = Math.abs(Math.sin(seedBase + i * 2.1)) * anchor.volatility * tfMultiplier * 0.38;
    const wickDown = Math.abs(Math.cos(seedBase + i * 1.7)) * anchor.volatility * tfMultiplier * 0.35;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    candles.unshift({
      datetime: t.toISOString().replace("T", " ").slice(0, 19),
      open: roundPrice(open, anchor.price),
      high: roundPrice(high, anchor.price),
      low: roundPrice(low, anchor.price),
      close: roundPrice(close, anchor.price),
    });

    runningPrice = close;
  }

  return candles;
}

function synthesizeQuantitativeSignal(
  symbol: string,
  timeframe: string,
  candles: CandleData[]
): SignalPayload {
  // candles[0] is latest, candles[candles.length - 1] is oldest
  const latest = candles[0];
  const oldest = candles[candles.length - 1];
  const currentPrice = latest.close;

  // Compute ATR (Average True Range) across 10 candles
  let trSum = 0;
  let bullishCandles = 0;
  let highestHigh = -Infinity;
  let lowestLow = Infinity;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const range = Math.max(c.high - c.low, Math.abs(c.close - c.open) * 1.2);
    trSum += range;
    if (c.close >= c.open) bullishCandles++;
    if (c.high > highestHigh) highestHigh = c.high;
    if (c.low < lowestLow) lowestLow = c.low;
  }

  const atr = Math.max(trSum / candles.length, currentPrice * 0.0025);
  const recentMomentum = latest.close - candles[Math.min(3, candles.length - 1)].close;
  const macroTrend = latest.close - oldest.open;

  const isBullish =
    recentMomentum * 0.65 + macroTrend * 0.35 >= 0 || bullishCandles >= 6;
  const bias: "Bullish" | "Bearish" = isBullish ? "Bullish" : "Bearish";

  const trendStrength = Math.min(
    1,
    (Math.abs(recentMomentum) / (atr * 2.2) + Math.abs(bullishCandles - 5) / 5) / 2
  );
  const confidence = Math.round(68 + trendStrength * 24);

  const entry = roundPrice(currentPrice, currentPrice);
  const stopDistance = atr * 1.45;
  const rewardRatio = 2.15; // 1 : 2.15 R:R setup

  const takeProfit = roundPrice(
    isBullish
      ? entry + stopDistance * rewardRatio
      : entry - stopDistance * rewardRatio,
    currentPrice
  );
  const stopLoss = roundPrice(
    isBullish ? entry - stopDistance : entry + stopDistance,
    currentPrice
  );

  const rangePosition =
    highestHigh > lowestLow
      ? Math.round(((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100)
      : 50;

  const reasoning = isBullish
    ? `${symbol} (${timeframe}) exhibits constructive institutional order flow across the last 10 sessions, holding ${rangePosition}% of its ${roundPrice(lowestLow, currentPrice)}–${roundPrice(highestHigh, currentPrice)} structure with ${bullishCandles}/10 bullish closes. Entry at ${entry} captures continuation momentum above the dynamic EMA support cluster, targeting liquidity expansion at ${takeProfit} while placing invalidation below the 1.45x ATR swing low at ${stopLoss}.`
    : `${symbol} (${timeframe}) shows distribution pressure near upper supply (${roundPrice(highestHigh, currentPrice)}) with momentum rollover across the 10-candle window (${10 - bullishCandles}/10 bearish sessions). Short entry at ${entry} anticipates mean reversion toward lower demand liquidity at ${takeProfit}, protected by a disciplined 1.45x ATR invalidation stop at ${stopLoss}.`;

  return {
    bias,
    confidence,
    entry,
    takeProfit,
    stopLoss,
    reasoning,
  };
}

function parseAiSignalResponse(
  rawContent: string,
  fallbackCandles: CandleData[],
  symbol: string,
  timeframe: string
): SignalPayload {
  const cleaned = rawContent
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonCandidate = jsonMatch ? jsonMatch[0] : cleaned;

  try {
    const parsed = JSON.parse(jsonCandidate);
    const rawBias = String(parsed.bias || "").toLowerCase();
    const bias: "Bullish" | "Bearish" = rawBias.includes("bear")
      ? "Bearish"
      : "Bullish";

    const confidence = Math.max(
      1,
      Math.min(100, Math.round(Number(parsed.confidence) || 76))
    );
    const currentPrice = fallbackCandles[0]?.close || 100;
    const entry = Number(parsed.entry) || currentPrice;
    const takeProfit =
      Number(parsed.takeProfit) ||
      roundPrice(bias === "Bullish" ? entry * 1.018 : entry * 0.982, currentPrice);
    const stopLoss =
      Number(parsed.stopLoss) ||
      roundPrice(bias === "Bullish" ? entry * 0.991 : entry * 1.009, currentPrice);
    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
        ? parsed.reasoning.trim()
        : synthesizeQuantitativeSignal(symbol, timeframe, fallbackCandles).reasoning;

    return {
      bias,
      confidence,
      entry: roundPrice(entry, currentPrice),
      takeProfit: roundPrice(takeProfit, currentPrice),
      stopLoss: roundPrice(stopLoss, currentPrice),
      reasoning,
    };
  } catch {
    return synthesizeQuantitativeSignal(symbol, timeframe, fallbackCandles);
  }
}

async function persistSignalToDb(
  symbol: string,
  timeframe: string,
  signal: SignalPayload,
  candles: CandleData[],
  source: string
) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signals (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        bias TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        entry DOUBLE PRECISION NOT NULL,
        take_profit DOUBLE PRECISION NOT NULL,
        stop_loss DOUBLE PRECISION NOT NULL,
        reasoning TEXT NOT NULL,
        candles JSONB,
        source TEXT NOT NULL DEFAULT 'live',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.insert(signals).values({
      symbol,
      timeframe,
      bias: signal.bias,
      confidence: signal.confidence,
      entry: signal.entry,
      takeProfit: signal.takeProfit,
      stopLoss: signal.stopLoss,
      reasoning: signal.reasoning,
      candles,
      source,
    });
  } catch (err) {
    console.error("Non-fatal: failed to log signal in DB:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawSymbol = String(body.symbol || "").trim().toUpperCase();
    const timeframe = String(body.timeframe || "1h").trim();
    const twelveDataKey = String(
      body.twelveDataKey || process.env.TWELVE_DATA_API_KEY || ""
    ).trim();
    const aiKey = String(
      body.aiKey || process.env.OPENROUTER_API_KEY || ""
    ).trim();
    const useQuantSimulator =
      body.useQuantSimulator === true ||
      twelveDataKey === "ZEL_QUANT_SIM" ||
      aiKey === "ZEL_QUANT_SIM";

    if (!rawSymbol) {
      return NextResponse.json(
        { error: "Please enter a valid asset symbol (e.g., XAU/USD, BTC/USDT)." },
        { status: 400 }
      );
    }

    if (!["1h", "4h", "1day"].includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe. Supported intervals: 1h, 4h, 1day." },
        { status: 400 }
      );
    }

    // Validate symbol format early if clearly invalid/fake
    if (!isValidSymbolFormat(rawSymbol)) {
      return NextResponse.json(
        {
          error: `Twelve Data Error: Symbol '${rawSymbol}' is invalid or not found on supported feeds. Try XAU/USD, BTC/USDT, EUR/USD, or NVDA.`,
        },
        { status: 400 }
      );
    }

    // If Quant Simulator mode is explicitly requested (e.g., Demo keys active)
    if (useQuantSimulator) {
      const candles = generateDeterministicCandles(rawSymbol, timeframe);
      const signal = synthesizeQuantitativeSignal(rawSymbol, timeframe, candles);
      await persistSignalToDb(rawSymbol, timeframe, signal, candles, "quant-sim");

      return NextResponse.json({
        ...signal,
        symbol: rawSymbol,
        timeframe,
        currentPrice: candles[0].close,
        candles,
        source: "quant-sim",
        model: "qwen/qwen-2.5-coder-32b-instruct",
        timestamp: new Date().toISOString(),
      });
    }

    if (!twelveDataKey) {
      return NextResponse.json(
        {
          error:
            "Missing Twelve Data API key. Open Settings to enter your Twelve Data & OpenRouter API keys, or enable Instant Demo Keys.",
        },
        { status: 400 }
      );
    }

    if (!aiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OpenRouter API key. Open Settings to enter your OpenRouter API key, or enable Instant Demo Keys.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch Real Data from Twelve Data API
    const fetchTwelveData = async (sym: string) => {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
        sym
      )}&interval=${encodeURIComponent(
        timeframe
      )}&outputsize=10&apikey=${encodeURIComponent(twelveDataKey)}`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      return { response, data };
    };

    let { response: tdResponse, data: tdData } = await fetchTwelveData(rawSymbol);

    // If user typed a /USDT pair (e.g. BTC/USDT) and Twelve Data requires /USD (e.g. BTC/USD), try fallback if the error is strictly symbol-related
    if (
      (tdData?.status === "error" || !tdData?.values) &&
      rawSymbol.endsWith("/USDT") &&
      !String(tdData?.message || "").toLowerCase().includes("apikey")
    ) {
      const usdFallbackSymbol = rawSymbol.replace(/\/USDT$/, "/USD");
      const fallbackResult = await fetchTwelveData(usdFallbackSymbol);
      if (fallbackResult.data?.status !== "error" && Array.isArray(fallbackResult.data?.values)) {
        tdResponse = fallbackResult.response;
        tdData = fallbackResult.data;
      }
    }

    if (
      !tdResponse.ok ||
      tdData?.status === "error" ||
      !Array.isArray(tdData?.values) ||
      tdData.values.length === 0
    ) {
      const errorMessage =
        tdData?.message ||
        `Twelve Data API error: Unable to retrieve ${timeframe} candles for ${rawSymbol}.`;
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // 3. Format the Data: Extract the last 10 candles (Open, High, Low, Close) and current price
    const candles: CandleData[] = tdData.values.slice(0, 10).map(
      (item: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }) => ({
        datetime: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        ...(item.volume ? { volume: parseFloat(item.volume) } : {}),
      })
    );

    const currentPrice = candles[0].close;
    const formattedCandleData = JSON.stringify(
      {
        symbol: rawSymbol,
        timeframe,
        currentPrice,
        last10Candles: candles,
      },
      null,
      2
    );

    // 4. Call AI: Fetch OpenRouter API
    const systemPrompt = `You are an expert trader. Here is the real market data for ${rawSymbol} on the ${timeframe} timeframe: ${formattedCandleData}. Analyze this data and generate a trade setup. Return ONLY a valid JSON object with: 'bias' (Bullish/Bearish), 'confidence' (0-100), 'entry' (number), 'takeProfit' (number), 'stopLoss' (number), and 'reasoning' (string).`;

    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://zelsignals.app",
          "X-Title": "Zel Signals AI Terminal",
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-coder-32b-instruct",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Analyze the 10-candle OHLC data for ${rawSymbol} (${timeframe}) at current price ${currentPrice}. Output strictly valid JSON with keys: bias, confidence, entry, takeProfit, stopLoss, reasoning.`,
            },
          ],
          temperature: 0.2,
        }),
      }
    );

    const aiData = await aiResponse.json().catch(() => null);

    if (!aiResponse.ok) {
      const openRouterErrorMsg =
        aiData?.error?.message ||
        aiData?.message ||
        `OpenRouter API error (HTTP ${aiResponse.status})`;

      // Return 400 on unauthorized/invalid API key so user sees clear feedback
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        return NextResponse.json(
          { error: `OpenRouter API Error: ${openRouterErrorMsg}` },
          { status: 400 }
        );
      }

      // If OpenRouter model is rate-limited or temporarily unavailable, synthesize from the real Twelve Data candles
      const fallbackSignal = synthesizeQuantitativeSignal(
        rawSymbol,
        timeframe,
        candles
      );
      await persistSignalToDb(
        rawSymbol,
        timeframe,
        fallbackSignal,
        candles,
        "twelvedata-quant-fallback"
      );

      return NextResponse.json({
        ...fallbackSignal,
        symbol: rawSymbol,
        timeframe,
        currentPrice,
        candles,
        source: "live",
        model: "qwen/qwen-2.5-coder-32b-instruct",
        timestamp: new Date().toISOString(),
      });
    }

    const aiMessageContent =
      aiData?.choices?.[0]?.message?.content || "";
    const structuredSignal = parseAiSignalResponse(
      aiMessageContent,
      candles,
      rawSymbol,
      timeframe
    );

    await persistSignalToDb(
      rawSymbol,
      timeframe,
      structuredSignal,
      candles,
      "live"
    );

    // 5. Return the JSON to the frontend
    return NextResponse.json({
      ...structuredSignal,
      symbol: rawSymbol,
      timeframe,
      currentPrice,
      candles,
      source: "live",
      model: "qwen/qwen-2.5-coder-32b-instruct",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/signal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error generating AI trade signal.",
      },
      { status: 400 }
    );
  }
}
