import type { Investment, InvestmentTransaction } from "@prisma/client";

export interface InvestmentSummaryResult {
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

function calcularDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const atual = new Date(dataInicio);

  while (atual <= dataFim) {
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    atual.setDate(atual.getDate() + 1);
  }

  return dias;
}

export function calculateInvestmentSummary(
  investment: Investment & { transactions: InvestmentTransaction[] },
  quotePrices: Map<string, number>,
): InvestmentSummaryResult {
  let totalQuantity = 0;
  let totalBought = 0;
  let totalSold = 0;
  let weightedSum = 0;

  for (const transaction of investment.transactions) {
    const qty = parseFloat(transaction.quantity.toString());
    const amount = parseFloat(transaction.amount.toString());

    if (transaction.type === "BUY") {
      totalQuantity += qty;
      totalBought += amount;
      weightedSum += amount;
    } else if (transaction.type === "SELL") {
      totalQuantity -= qty;
      totalSold += amount;
      const proportionSold = qty / (totalQuantity + qty);
      weightedSum -= weightedSum * proportionSold;
    }
  }

  const totalInvested = totalBought - totalSold;
  const averagePrice = totalQuantity > 0 ? weightedSum / totalQuantity : 0;

  let currentValue = 0;
  let profitLoss = 0;
  let profitLossPercentage = 0;

  if (
    investment.type === "CDB" &&
    investment.cdiPercentage &&
    investment.transactions.length > 0 &&
    totalInvested > 0
  ) {
    const dataInicial = new Date(investment.transactions[0].date);
    const diasUteis = calcularDiasUteis(dataInicial, new Date());
    const taxaAnual = 13.75 * (investment.cdiPercentage.toNumber() / 100);
    const taxaDiaria = Math.pow(1 + taxaAnual / 100, 1 / 252) - 1;
    currentValue = totalInvested * Math.pow(1 + taxaDiaria, diasUteis);
    profitLoss = currentValue - totalInvested;
    profitLossPercentage =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  } else if (totalQuantity <= 0) {
    currentValue = 0;
    profitLoss = totalSold - totalBought;
    profitLossPercentage =
      totalBought > 0 ? (profitLoss / totalBought) * 100 : 0;
  } else if (
    investment.type === "STOCKS" &&
    investment.ticker &&
    quotePrices.has(investment.ticker)
  ) {
    const currentPrice = quotePrices.get(investment.ticker)!;
    currentValue = currentPrice * totalQuantity;
    profitLoss = currentValue - totalInvested;
    profitLossPercentage =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  } else {
    currentValue = averagePrice * totalQuantity;
    profitLoss = currentValue - totalInvested;
    profitLossPercentage =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  }

  return {
    totalQuantity,
    averagePrice,
    totalInvested,
    currentValue,
    profitLoss,
    profitLossPercentage,
  };
}

export async function fetchStockQuotes(
  tickers: string[],
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const unique = [...new Set(tickers.filter(Boolean))];
  if (unique.length === 0) return prices;

  try {
    const response = await fetch(
      `https://brapi.dev/api/quote/${unique.join(",")}`,
      { next: { revalidate: 300 } },
    );
    const data = await response.json();
    for (const result of data.results ?? []) {
      if (result.symbol && result.regularMarketPrice) {
        prices.set(result.symbol, result.regularMarketPrice);
      }
    }
  } catch {
    // fallback: empty map uses average price
  }

  return prices;
}

export function aggregateInvestmentTotals(
  summaries: InvestmentSummaryResult[],
) {
  const totals = summaries.reduce(
    (acc, s) => ({
      total: acc.total + 1,
      invested: acc.invested + s.totalInvested,
      current: acc.current + s.currentValue,
      profit: acc.profit + s.profitLoss,
    }),
    { total: 0, invested: 0, current: 0, profit: 0 },
  );

  return {
    ...totals,
    profitPercentage:
      totals.invested > 0 ? (totals.profit / totals.invested) * 100 : 0,
  };
}
