import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Helper para calcular dias úteis
function calcularDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const atual = new Date(dataInicio);

  while (atual <= dataFim) {
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    atual.setDate(atual.getDate() + 1);
  }

  return dias;
}

// GET - Calcular valores agregados do investimento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Buscar investimento e transações
    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        transactions: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    // Calcular valores agregados a partir das transações
    let totalQuantity = 0;
    let totalInvested = 0;
    let weightedSum = 0; // Para calcular preço médio ponderado

    for (const transaction of investment.transactions) {
      const qty = parseFloat(transaction.quantity.toString());
      const price = parseFloat(transaction.price.toString());
      const amount = parseFloat(transaction.amount.toString());

      if (transaction.type === "BUY") {
        totalQuantity += qty;
        totalInvested += amount;
        weightedSum += amount;
      } else if (transaction.type === "SELL") {
        totalQuantity -= qty;
        totalInvested -= amount;
        weightedSum -= amount;
      }
    }

    // Preço médio ponderado
    const averagePrice = totalQuantity > 0 ? weightedSum / totalQuantity : 0;

    // Calcular valor atual baseado no tipo de investimento
    let currentValue = 0;
    let profitLoss = 0;
    let profitLossPercentage = 0;

    if (totalQuantity > 0) {
      if (investment.type === "STOCKS" && investment.ticker) {
        // Para ações, buscar cotação atual via BRAPI
        try {
          const response = await fetch(
            `https://brapi.dev/api/quote/${investment.ticker}`
          );
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            const currentPrice = data.results[0].regularMarketPrice;
            currentValue = currentPrice * totalQuantity;
            profitLoss = currentValue - totalInvested;
            profitLossPercentage =
              totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
          } else {
            // Fallback: tentar buscar via scraping
            try {
              const scrapResponse = await fetch(
                `${
                  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
                }/api/scrap/quote/${investment.ticker}`
              );
              const scrapData = await scrapResponse.json();

              if (scrapData.cotacao?.preco) {
                const currentPrice = parseFloat(
                  scrapData.cotacao.preco.replace(",", ".")
                );
               
                currentValue = currentPrice * totalQuantity;
                profitLoss = currentValue - totalInvested;
                profitLossPercentage =
                  totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
              } else {
                console.error("Scraping não retornou preço válido");
                currentValue = averagePrice * totalQuantity;
              }
            } catch (scrapError) {
              console.error("Erro no scraping:", scrapError);
              currentValue = averagePrice * totalQuantity;
            }
          }
        } catch (error) {
          console.error("Erro ao buscar cotação:", error);
          // Se falhar, usar preço médio como valor atual
          currentValue = averagePrice * totalQuantity;
        }
      } else if (
        investment.type === "CDB" &&
        investment.cdiPercentage &&
        investment.transactions.length > 0
      ) {
        // Para CDB, calcular rendimento composto
        const primeiraTransacao = investment.transactions[0];
        const dataInicial = new Date(primeiraTransacao.date);
        const dataAtual = new Date();

        const diasUteis = calcularDiasUteis(dataInicial, dataAtual);
        const taxaAnual = 13.75 * (investment.cdiPercentage.toNumber() / 100); // CDI base de 13.75%
        const taxaDiaria = Math.pow(1 + taxaAnual / 100, 1 / 252) - 1;

        currentValue = totalInvested * Math.pow(1 + taxaDiaria, diasUteis);
        profitLoss = currentValue - totalInvested;
        profitLossPercentage =
          totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      } else {
        // Para outros tipos, usar o preço médio
        currentValue = averagePrice * totalQuantity;
        profitLoss = currentValue - totalInvested;
        profitLossPercentage =
          totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      }
    }

    return NextResponse.json({
      investment,
      summary: {
        totalQuantity,
        averagePrice,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage,
      },
    });
  } catch (error) {
    console.error("Erro ao calcular resumo:", error);
    return NextResponse.json(
      { error: "Erro ao calcular resumo" },
      { status: 500 }
    );
  }
}
