import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


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


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    
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
        { status: 404 },
      );
    }

    
    let totalQuantity = 0;
    let totalBought = 0; 
    let totalSold = 0; 
    let weightedSum = 0; 

    for (const transaction of investment.transactions) {
      const qty = parseFloat(transaction.quantity.toString());
      const price = parseFloat(transaction.price.toString());
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
      const primeiraTransacao = investment.transactions[0];
      const dataInicial = new Date(primeiraTransacao.date);
      const dataAtual = new Date();

      const diasUteis = calcularDiasUteis(dataInicial, dataAtual);
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
    } else if (investment.type === "STOCKS" && investment.ticker) {
      
      try {
        console.log(`Buscando cotação para ${investment.ticker}...`);
        const response = await fetch(
          `https://brapi.dev/api/quote/${investment.ticker}`,
        );
        const data = await response.json();
        console.log("Resposta BRAPI:", data);

        if (data.results && data.results.length > 0) {
          const currentPrice = data.results[0].regularMarketPrice;
          console.log(
 `Preço atual (BRAPI): ${currentPrice}, Quantidade: ${totalQuantity}`,
 );
          currentValue = currentPrice * totalQuantity;
          profitLoss = currentValue - totalInvested;
          profitLossPercentage =
            totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
        } else {
          
          console.log("BRAPI falhou, tentando scraping...");
          try {
            const scrapResponse = await fetch(
              `${
                process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
              }/api/scrap/quote/${investment.ticker}`,
            );
            const scrapData = await scrapResponse.json();

            if (scrapData.cotacao?.preco) {
              const currentPrice = parseFloat(
                scrapData.cotacao.preco.replace(",", "."),
              );
              console.log(
 `Preço atual (Scraping): ${currentPrice}, Quantidade: ${totalQuantity}`,
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
        
        currentValue = averagePrice * totalQuantity;
      }
    } else {
      
      currentValue = averagePrice * totalQuantity;
      profitLoss = currentValue - totalInvested;
      profitLossPercentage =
        totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
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
      { status: 500 },
    );
  }
}
