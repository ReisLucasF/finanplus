import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computeDailyBalances } from "@/lib/daily-balances";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datesParam = searchParams.get("dates");
    const accountId = searchParams.get("accountId");

    if (!datesParam) {
      return NextResponse.json(
        { error: "Informe o parâmetro dates" },
        { status: 400 },
      );
    }

    const targetDates = [...new Set(datesParam.split(",").filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );

    if (targetDates.length === 0) {
      return NextResponse.json({ balances: {} });
    }

    const maxDate = targetDates[targetDates.length - 1];

    const [accounts, transactions, transfers] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId: user.userId },
        select: { id: true, initialBalance: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.userId,
          date: { lte: new Date(`${maxDate}T23:59:59.999Z`) },
          ...(accountId ? { accountId } : {}),
        },
        select: {
          date: true,
          type: true,
          amount: true,
          accountId: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.transfer.findMany({
        where: {
          userId: user.userId,
          date: { lte: new Date(`${maxDate}T23:59:59.999Z`) },
          ...(accountId
            ? {
                OR: [
                  { fromAccountId: accountId },
                  { toAccountId: accountId },
                ],
              }
            : {}),
        },
        select: {
          date: true,
          amount: true,
          fromAccountId: true,
          toAccountId: true,
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const balances = computeDailyBalances(
      accounts.map((a) => ({
        id: a.id,
        initialBalance: a.initialBalance.toNumber(),
      })),
      transactions.map((tx) => ({
        date: tx.date,
        type: tx.type,
        amount: tx.amount.toNumber(),
        accountId: tx.accountId,
      })),
      transfers.map((t) => ({
        date: t.date,
        amount: t.amount.toNumber(),
        fromAccountId: t.fromAccountId,
        toAccountId: t.toAccountId,
      })),
      targetDates,
    );

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("Erro ao calcular saldos diários:", error);
    return NextResponse.json(
      { error: "Erro ao calcular saldos diários" },
      { status: 500 },
    );
  }
}
