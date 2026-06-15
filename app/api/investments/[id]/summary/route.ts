import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateInvestmentSummary,
  fetchStockQuotes,
} from "@/lib/investment-summary";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const investment = await prisma.investment.findFirst({
      where: { id, userId: user.userId },
      include: {
        transactions: { orderBy: { date: "asc" } },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 },
      );
    }

    const tickers =
      investment.type === "STOCKS" && investment.ticker
        ? [investment.ticker]
        : [];
    const quotePrices = await fetchStockQuotes(tickers);
    const summary = calculateInvestmentSummary(investment, quotePrices);

    return NextResponse.json({ investment, summary });
  } catch (error) {
    console.error("Erro ao calcular resumo:", error);
    return NextResponse.json(
      { error: "Erro ao calcular resumo" },
      { status: 500 },
    );
  }
}
