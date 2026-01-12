import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const paymentSchema = z.object({
  cardId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
});

// POST - Registrar pagamento de cartão
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, accountId, amount } = paymentSchema.parse(body);

    // Verificar se o cartão pertence ao usuário
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se a conta pertence ao usuário
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId: user.userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar saldo da conta
    if (account.currentBalance.toNumber() < amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    // Buscar ou criar categoria "Pagamento de Cartão"
    let category = await prisma.category.findFirst({
      where: {
        name: "Pagamento de Cartão",
        OR: [{ userId: user.userId }, { userId: null }],
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Pagamento de Cartão",
          type: "EXPENSE",
          icon: "CreditCard",
          userId: user.userId,
        },
      });
    }

    // Criar transação de pagamento (negativa para o cartão)
    // e debitar da conta
    const result = await prisma.$transaction(async (tx) => {
      // Criar transação de despesa (reduz dívida do cartão)
      const transaction = await tx.transaction.create({
        data: {
          description: `Pagamento ${card.name}`,
          amount: -amount, // Negativo porque reduz a dívida
          type: "EXPENSE",
          date: new Date(),
          userId: user.userId,
          categoryId: category.id,
          accountId: accountId,
        },
      });

      // Debitar da conta bancária
      await tx.bankAccount.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      });

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erro ao processar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 }
    );
  }
}
