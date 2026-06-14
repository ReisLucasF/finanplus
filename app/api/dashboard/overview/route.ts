import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  aggregateInvestmentTotals,
  calculateInvestmentSummary,
  fetchStockQuotes,
} from "@/lib/investment-summary";

function serializeAccount(account: {
  id: string;
  name: string;
  type: string;
  color: string;
  initialBalance: { toNumber: () => number };
  currentBalance: { toNumber: () => number };
}) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    initialBalance: account.initialBalance.toNumber(),
    currentBalance: account.currentBalance.toNumber(),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios" },
        { status: 400 },
      );
    }

    const startDate = new Date(startParam);
    const endDate = new Date(endParam);
    const duration = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - duration);
    const prevEnd = new Date(startDate.getTime() - 1);

    const [
      accounts,
      cardsRaw,
      purchaseSums,
      paymentSums,
      goals,
      recurrings,
      periodTransactions,
      prevTransactions,
      investments,
      cardExpensesRows,
    ] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId: user.userId },
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          initialBalance: true,
          currentBalance: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.creditCard.findMany({
        where: { userId: user.userId },
        select: {
          id: true,
          name: true,
          cardLimit: true,
          dueDay: true,
          initialDebt: true,
          color: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.creditCardPurchase.groupBy({
        by: ["creditCardId"],
        where: { userId: user.userId },
        _sum: { amount: true },
      }),
      prisma.creditCardPayment.groupBy({
        by: ["creditCardId"],
        where: { userId: user.userId },
        _sum: { amount: true },
      }),
      prisma.goal.findMany({
        where: { userId: user.userId },
        include: {
          account: { select: { id: true, name: true, currentBalance: true } },
        },
        orderBy: { targetDate: "asc" },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId: user.userId, isActive: true },
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
          frequency: true,
          startDate: true,
          endDate: true,
          dueDay: true,
          isActive: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.userId,
          status: "COMPLETED",
          date: { gte: startDate, lte: endDate },
        },
        select: {
          type: true,
          amount: true,
          category: { select: { name: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.userId,
          status: "COMPLETED",
          date: { gte: prevStart, lte: prevEnd },
        },
        select: { type: true, amount: true },
      }),
      prisma.investment.findMany({
        where: { userId: user.userId },
        include: { transactions: { orderBy: { date: "asc" } } },
      }),
      prisma.creditCardPurchase.groupBy({
        by: ["categoryId"],
        where: {
          userId: user.userId,
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
    ]);

    const purchaseMap = new Map(
      purchaseSums.map((p) => [p.creditCardId, p._sum.amount?.toNumber() ?? 0]),
    );
    const paymentMap = new Map(
      paymentSums.map((p) => [p.creditCardId, p._sum.amount?.toNumber() ?? 0]),
    );

    const cards = cardsRaw.map((card) => {
      const purchases = purchaseMap.get(card.id) ?? 0;
      const payments = paymentMap.get(card.id) ?? 0;
      const currentDebt =
        card.initialDebt.toNumber() + purchases - payments;
      return {
        id: card.id,
        name: card.name,
        cardLimit: card.cardLimit.toNumber(),
        dueDay: card.dueDay,
        initialDebt: card.initialDebt.toNumber(),
        color: card.color,
        currentDebt,
      };
    });

    const serializedAccounts = accounts.map(serializeAccount);
    const available = serializedAccounts.reduce(
      (sum, acc) => sum + acc.currentBalance,
      0,
    );

    let income = 0;
    let expenses = 0;
    const expensesByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    for (const tx of periodTransactions) {
      const amount = tx.amount.toNumber();
      const categoryName = tx.category.name;

      if (tx.type === "INCOME") {
        income += amount;
        incomeByCategory[categoryName] =
          (incomeByCategory[categoryName] ?? 0) + amount;
      } else {
        expenses += amount;
        expensesByCategory[categoryName] =
          (expensesByCategory[categoryName] ?? 0) + amount;
      }
    }

    let prevIncome = 0;
    let prevExpenses = 0;
    for (const tx of prevTransactions) {
      const amount = tx.amount.toNumber();
      if (tx.type === "INCOME") prevIncome += amount;
      else prevExpenses += amount;
    }

    const categoryIds = cardExpensesRows.map((r) => r.categoryId);
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [];
    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

    const cardExpensesByCategory = cardExpensesRows.map((row) => ({
      name: categoryNameMap.get(row.categoryId) ?? "Sem categoria",
      value: row._sum.amount?.toNumber() ?? 0,
    }));

    const tickers = investments
      .filter((i) => i.type === "STOCKS" && i.ticker)
      .map((i) => i.ticker!);
    const quotePrices = await fetchStockQuotes(tickers);
    const investmentSummaries = investments.map((inv) =>
      calculateInvestmentSummary(inv, quotePrices),
    );
    const investmentTotals = aggregateInvestmentTotals(investmentSummaries);

    const serializedGoals = goals.map((goal) => ({
      ...goal,
      targetAmount: goal.targetAmount.toNumber(),
      currentAmount: goal.currentAmount.toNumber(),
      account: goal.account
        ? {
            ...goal.account,
            currentBalance: goal.account.currentBalance.toNumber(),
          }
        : null,
    }));

    const serializedRecurrings = recurrings.map((r) => ({
      ...r,
      amount: r.amount.toNumber(),
    }));

    return NextResponse.json({
      accounts: serializedAccounts,
      cards,
      goals: serializedGoals,
      recurrings: serializedRecurrings,
      available,
      income,
      expenses,
      previousMonth: {
        income: prevIncome,
        expenses: prevExpenses,
        balance: prevIncome - prevExpenses,
      },
      expensesByCategory: Object.entries(expensesByCategory).map(
        ([name, value]) => ({ name, value }),
      ),
      incomeByCategory: Object.entries(incomeByCategory).map(
        ([name, value]) => ({ name, value }),
      ),
      cardExpensesByCategory,
      investments: investmentTotals,
    });
  } catch (error) {
    console.error("Erro ao carregar overview:", error);
    return NextResponse.json(
      { error: "Erro ao carregar overview" },
      { status: 500 },
    );
  }
}
