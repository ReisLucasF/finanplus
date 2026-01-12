import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Função auxiliar para calcular dias úteis
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

// POST - Atualizar valor automaticamente (ação ou CDB)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Buscar investimento
    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    let valorAtual = parseFloat(investment.currentAmount.toString());
    let novaQuantidade = investment.quantity
      ? parseFloat(investment.quantity.toString())
      : null;

    // Se for AÇÃO com ticker, buscar cotação
    if (investment.type === "STOCKS" && investment.ticker) {
      try {
        const response = await fetch(
          `https://brapi.dev/api/quote/${investment.ticker}?token=demo`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const cotacao = data.results[0].regularMarketPrice;

          if (novaQuantidade) {
            valorAtual = cotacao * novaQuantidade;
          }

          // Criar transação de atualização
          await prisma.investmentTransaction.create({
            data: {
              userId: user.userId,
              investmentId: id,
              type: "UPDATE",
              amount: valorAtual,
              quantity: novaQuantidade,
              price: cotacao,
              description: `Atualização automática - Cotação: R$ ${cotacao.toFixed(
                2
              )}`,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao buscar cotação:", error);
        return NextResponse.json(
          { error: "Erro ao buscar cotação da ação" },
          { status: 500 }
        );
      }
    }

    // Se for CDB com percentual CDI, calcular rendimento
    if (
      investment.type === "CDB" &&
      investment.cdiPercentage &&
      investment.investmentDate
    ) {
      const valorInicial = parseFloat(investment.initialAmount.toString());
      const cdiPercentage = parseFloat(investment.cdiPercentage.toString());
      const taxaCDIAnual = 13.75; // Taxa aproximada - em produção, buscar de API

      const taxaInvestimentoAnual = (taxaCDIAnual * cdiPercentage) / 100;
      const dataInicio = new Date(investment.investmentDate);
      const hoje = new Date();
      const diasUteis = calcularDiasUteis(dataInicio, hoje);

      const taxaDiaria = Math.pow(1 + taxaInvestimentoAnual / 100, 1 / 252) - 1;
      valorAtual = valorInicial * Math.pow(1 + taxaDiaria, diasUteis);

      // Criar transação de atualização
      await prisma.investmentTransaction.create({
        data: {
          userId: user.userId,
          investmentId: id,
          type: "UPDATE",
          amount: valorAtual,
          description: `Atualização automática - ${cdiPercentage}% do CDI (${diasUteis} dias úteis)`,
        },
      });
    }

    // Atualizar investimento
    const updated = await prisma.investment.update({
      where: { id },
      data: {
        currentAmount: valorAtual,
        updatedAt: new Date(),
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar investimento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar investimento" },
      { status: 500 }
    );
  }
}
