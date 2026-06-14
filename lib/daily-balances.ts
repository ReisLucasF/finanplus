type BalanceOperation = {
  date: string;
  apply: (balances: Map<string, number>) => void;
};

function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function computeDailyBalances(
  accounts: Array<{ id: string; initialBalance: number }>,
  transactions: Array<{
    date: Date | string;
    type: string;
    amount: number;
    accountId: string;
  }>,
  transfers: Array<{
    date: Date | string;
    amount: number;
    fromAccountId: string;
    toAccountId: string;
  }>,
  targetDates: string[],
): Record<string, Record<string, number>> {
  const running = new Map<string, number>();
  accounts.forEach((account) => {
    running.set(account.id, account.initialBalance);
  });

  const operations: BalanceOperation[] = [
    ...transactions.map((tx) => ({
      date: toDateKey(tx.date),
      apply: (balances: Map<string, number>) => {
        const current = balances.get(tx.accountId) ?? 0;
        balances.set(
          tx.accountId,
          tx.type === "INCOME" ? current + tx.amount : current - tx.amount,
        );
      },
    })),
    ...transfers.map((transfer) => ({
      date: toDateKey(transfer.date),
      apply: (balances: Map<string, number>) => {
        const from = balances.get(transfer.fromAccountId) ?? 0;
        balances.set(transfer.fromAccountId, from - transfer.amount);
        const to = balances.get(transfer.toAccountId) ?? 0;
        balances.set(transfer.toAccountId, to + transfer.amount);
      },
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const sortedTargets = [...targetDates].sort((a, b) => a.localeCompare(b));
  const maxTarget = sortedTargets[sortedTargets.length - 1];
  const result: Record<string, Record<string, number>> = {};
  let targetIndex = 0;

  for (const op of operations) {
    op.apply(running);

    while (
      targetIndex < sortedTargets.length &&
      sortedTargets[targetIndex] <= op.date
    ) {
      const date = sortedTargets[targetIndex];
      result[date] = Object.fromEntries(running.entries());
      targetIndex++;
    }

    if (maxTarget && op.date > maxTarget) break;
  }

  while (targetIndex < sortedTargets.length) {
    const date = sortedTargets[targetIndex];
    result[date] = Object.fromEntries(running.entries());
    targetIndex++;
  }

  return result;
}

export function buildTransactionWhere(
  userId: string,
  params: {
    accountId?: string | null;
    categoryId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  },
) {
  const where: {
    userId: string;
    accountId?: string;
    categoryId?: string;
    description?: { contains: string };
    date?: { gte?: Date; lte?: Date };
  } = { userId };

  if (params.accountId) where.accountId = params.accountId;
  if (params.categoryId) where.categoryId = params.categoryId;

  const description = params.description?.trim();
  if (description) {
    where.description = { contains: description };
  }

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    }
    if (params.endDate) {
      where.date.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  return where;
}

export function buildTransferWhere(
  userId: string,
  params: {
    accountId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  },
) {
  const where: {
    userId: string;
    OR?: Array<{ fromAccountId: string } | { toAccountId: string }>;
    description?: { contains: string };
    date?: { gte?: Date; lte?: Date };
  } = { userId };

  if (params.accountId) {
    where.OR = [
      { fromAccountId: params.accountId },
      { toAccountId: params.accountId },
    ];
  }

  const description = params.description?.trim();
  if (description) {
    where.description = { contains: description };
  }

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    }
    if (params.endDate) {
      where.date.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  return where;
}
