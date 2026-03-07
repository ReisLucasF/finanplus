import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const paymentSchema = z.object({
  cardId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
});


export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, accountId, amount } = paymentSchema.parse(body);

    
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 },
      );
    }

    
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId: user.userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    
    if (account.currentBalance.toNumber() < amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 },
      );
    }

    
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

    
    const result = await prisma.$transaction(async (tx) => {
      
      const transaction = await tx.transaction.create({
        data: {
          description: `Pagamento ${card.name}`,
          amount: amount,
          type: "EXPENSE",
          date: new Date(),
          userId: user.userId,
          categoryId: category.id,
          accountId: accountId,
        },
      });

      
      await tx.bankAccount.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      });

      
      const payment = await tx.creditCardPayment.create({
        data: {
          userId: user.userId,
          creditCardId: cardId,
          accountId: accountId,
          amount: amount,
          dueDate: new Date(),
          paymentDate: new Date(),
          status: "PAID",
        },
      });

      return { transaction, payment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Erro ao processar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao processar pagamento" },
      { status: 500 },
    );
  }
}
