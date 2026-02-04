import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST - Corrigir dívida do cartão (remover compras se initialDebt estiver negativo)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { error: "cardId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar cartão
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    // Buscar compras antigas (que não foram contabilizadas no initialDebt)
    const purchases = await prisma.creditCardPurchase.findMany({
      where: { creditCardId: cardId },
    });

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0
    );
    const currentInitialDebt = card.initialDebt.toNumber();

    // A dívida correta deveria ser: initialDebt atual + compras antigas
    // Vamos somar as compras ao initialDebt para corrigir
    const correctDebt = currentInitialDebt + totalPurchases;

    await prisma.creditCard.update({
      where: { id: cardId },
      data: { initialDebt: correctDebt },
    });

    return NextResponse.json({
      message: "Dívida corrigida com sucesso",
      oldInitialDebt: currentInitialDebt,
      purchasesAmount: totalPurchases,
      newInitialDebt: correctDebt,
      explanation: "As compras antigas foram somadas ao initialDebt. Agora a dívida está correta.",
    });
  } catch (error) {
    console.error("Erro ao corrigir dívida:", error);
    return NextResponse.json(
      { error: "Erro ao corrigir dívida" },
      { status: 500 }
    );
  }
}
