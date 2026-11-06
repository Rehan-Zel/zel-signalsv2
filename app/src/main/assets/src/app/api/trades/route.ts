import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@/db";
import { paperTrades } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

let tableInitialized = false;

async function ensureTables() {
  if (tableInitialized) return;
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
      CREATE TABLE IF NOT EXISTS paper_trades (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        bias TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        entry DOUBLE PRECISION NOT NULL,
        take_profit DOUBLE PRECISION NOT NULL,
        stop_loss DOUBLE PRECISION NOT NULL,
        reasoning TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP
      );
    `);
    tableInitialized = true;
  } catch (err) {
    console.error("Failed to ensure database tables:", err);
  }
}

export async function GET() {
  try {
    await ensureTables();
    const rows = await db
      .select()
      .from(paperTrades)
      .orderBy(desc(paperTrades.createdAt))
      .limit(100);
    return NextResponse.json({ trades: rows });
  } catch (error) {
    console.error("Error fetching paper trades:", error);
    return NextResponse.json({ trades: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const {
      clientId,
      symbol,
      timeframe,
      bias,
      confidence,
      entry,
      takeProfit,
      stopLoss,
      reasoning,
      status = "OPEN",
    } = body;

    if (!clientId || !symbol || !timeframe || !bias) {
      return NextResponse.json(
        { error: "Missing required trade fields" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(paperTrades)
      .where(eq(paperTrades.clientId, String(clientId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(paperTrades)
        .set({
          status: String(status),
          resolvedAt: status === "OPEN" ? null : new Date(),
        })
        .where(eq(paperTrades.clientId, String(clientId)))
        .returning();
      return NextResponse.json({ trade: updated });
    }

    const [inserted] = await db
      .insert(paperTrades)
      .values({
        clientId: String(clientId),
        symbol: String(symbol).toUpperCase(),
        timeframe: String(timeframe),
        bias: String(bias),
        confidence: Number(confidence) || 75,
        entry: Number(entry),
        takeProfit: Number(takeProfit),
        stopLoss: Number(stopLoss),
        reasoning: String(reasoning || ""),
        status: String(status),
        resolvedAt: status === "OPEN" ? null : new Date(),
      })
      .returning();

    return NextResponse.json({ trade: inserted }, { status: 201 });
  } catch (error) {
    console.error("Error saving paper trade:", error);
    return NextResponse.json(
      { error: "Failed to persist paper trade" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const { clientId, status } = body;

    if (!clientId || !["OPEN", "WIN", "LOSS"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid clientId or status" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(paperTrades)
      .set({
        status,
        resolvedAt: status === "OPEN" ? null : new Date(),
      })
      .where(eq(paperTrades.clientId, String(clientId)))
      .returning();

    return NextResponse.json({ trade: updated || null });
  } catch (error) {
    console.error("Error updating paper trade:", error);
    return NextResponse.json(
      { error: "Failed to update paper trade" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (clientId) {
      await db
        .delete(paperTrades)
        .where(eq(paperTrades.clientId, clientId));
    } else {
      await db.delete(paperTrades);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting paper trade:", error);
    return NextResponse.json(
      { error: "Failed to delete paper trade" },
      { status: 500 }
    );
  }
}
