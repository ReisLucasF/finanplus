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

const transactionSelect = {
  id: true,
  type: true,
  description: true,
  amount: true,
  date: true,
  status: true,
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: {
      userId: string;
      accountId?: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId: user.userId };

    if (accountId) where.accountId = accountId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: transactionSelect,
      orderBy: { date: "desc" },
      take: limit,
    });

    const serializedTransactions = transactions.map((tx) => ({
      ...tx,
      amount: tx.amount.toNumber(),
    }));

    return NextResponse.json(serializedTransactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transações" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = transactionSchema.parse(body);

    const account = await prisma.bankAccount.findFirst({
      where: {
        id: data.accountId,
        userId: user.userId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    if (
      data.type === "EXPENSE" &&
      account.currentBalance.toNumber() < data.amount
    ) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 },
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.userId,
        },
        select: transactionSelect,
      });

      if (data.status === "COMPLETED") {
        const newBalance =
          data.type === "INCOME"
            ? account.currentBalance.toNumber() + data.amount
            : account.currentBalance.toNumber() - data.amount;

        await tx.bankAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: newBalance },
        });
      }

      return newTransaction;
    });

    return NextResponse.json(
      { ...transaction, amount: transaction.amount.toNumber() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      { error: "Erro ao criar transação" },
      { status: 500 },
    );
  }
}
