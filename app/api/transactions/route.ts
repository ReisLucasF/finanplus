import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const transactionSchema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().transform((val) => new Date(val)),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
});

// GET - Listar transações
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const accountId = searchParams.get("accountId");

    const where: any = { userId: user.userId };
    if (accountId) where.accountId = accountId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: true,
        category: true,
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transações" },
      { status: 500 }
    );
  }
}

// POST - Criar transação
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = transactionSchema.parse(body);

    // Verificar se conta existe e pertence ao usuário
    const account = await prisma.bankAccount.findFirst({
      where: {
        id: data.accountId,
        userId: user.userId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Se for despesa, verificar saldo
    if (data.type === "EXPENSE" && account.currentBalance < data.amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    // Criar transação e atualizar saldo da conta
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.userId,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Atualizar saldo da conta
      const newBalance =
        data.type === "INCOME"
          ? account.currentBalance + data.amount
          : account.currentBalance - data.amount;

      await tx.bankAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: newBalance },
      });

      return newTransaction;
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro ao criar transação" },
      { status: 500 }
    );
  }
}
