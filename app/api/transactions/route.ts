import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { buildTransactionWhere } from "@/lib/daily-balances";

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

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function serializeTransaction(tx: {
  amount: { toNumber: () => number };
  [key: string]: unknown;
}) {
  return {
    ...tx,
    amount: tx.amount.toNumber(),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const description = searchParams.get("description");

    const where = buildTransactionWhere(user.userId, {
      accountId,
      categoryId,
      startDate,
      endDate,
      description,
    });

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE),
      );
      const skip = (page - 1) * limit;

      const [total, transactions] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where,
          select: transactionSelect,
          orderBy: [{ date: "desc" }, { id: "desc" }],
          skip,
          take: limit,
        }),
      ]);

      return NextResponse.json({
        data: transactions.map(serializeTransaction),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const transactions = await prisma.transaction.findMany({
      where,
      select: transactionSelect,
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(transactions.map(serializeTransaction));
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

    return NextResponse.json(serializeTransaction(transaction), {
      status: 201,
    });
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
