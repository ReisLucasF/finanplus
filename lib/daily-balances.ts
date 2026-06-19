type BalanceOperation = {
  date: string;
  apply: (balances: Map<string, number>) => void;
};

function toDateKey(date: Date | string): string {
  if (typeof date === "string") {
    return date.split("T")[0];
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  ];

  const opsByDate = new Map<string, BalanceOperation[]>();
  for (const op of operations) {
    const list = opsByDate.get(op.date) ?? [];
    list.push(op);
    opsByDate.set(op.date, list);
  }

  const sortedTargets = [...targetDates].sort((a, b) => a.localeCompare(b));
  const operationDates = [...opsByDate.keys()].sort((a, b) => a.localeCompare(b));
  const allDates = [
    ...new Set([...operationDates, ...sortedTargets]),
  ].sort((a, b) => a.localeCompare(b));

  const result: Record<string, Record<string, number>> = {};
  let targetIndex = 0;

  // Aplica todas as operações do dia antes de gravar o saldo (transferências incluídas)
  for (const date of allDates) {
    for (const op of opsByDate.get(date) ?? []) {
      op.apply(running);
    }

    while (
      targetIndex < sortedTargets.length &&
      sortedTargets[targetIndex] <= date
    ) {
      const target = sortedTargets[targetIndex];
      result[target] = Object.fromEntries(running.entries());
      targetIndex++;
    }
  }

  while (targetIndex < sortedTargets.length) {
    const target = sortedTargets[targetIndex];
    result[target] = Object.fromEntries(running.entries());
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
