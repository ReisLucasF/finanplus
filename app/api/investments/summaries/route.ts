import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  aggregateInvestmentTotals,
  calculateInvestmentSummary,
  fetchStockQuotes,
} from "@/lib/investment-summary";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { userId: user.userId },
      include: {
        transactions: { orderBy: { date: "asc" } },
      },
    });

    const tickers = investments
      .filter((i) => i.type === "STOCKS" && i.ticker)
      .map((i) => i.ticker!);
    const quotePrices = await fetchStockQuotes(tickers);

    const summaries = investments.map((investment) => ({
      id: investment.id,
      summary: calculateInvestmentSummary(investment, quotePrices),
    }));

    return NextResponse.json({
      summaries,
      totals: aggregateInvestmentTotals(summaries.map((s) => s.summary)),
    });
  } catch (error) {
    console.error("Erro ao calcular resumos:", error);
    return NextResponse.json(
      { error: "Erro ao calcular resumos" },
      { status: 500 },
    );
  }
}
