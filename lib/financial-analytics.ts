import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EXCLUDED_INCOME_EXPENSE_CATEGORIES,
  classifyExpenseCategory,
  classifyIncomeCategory,
  classifyInvestmentRisk,
  computeHealthStatus,
} from "@/lib/analytics-constants";
import {
  aggregateInvestmentTotals,
  calculateInvestmentSummary,
  fetchStockQuotes,
} from "@/lib/investment-summary";

type RawRow = Record<string, unknown>;

function num(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

const excludedList = Prisma.join(
  EXCLUDED_INCOME_EXPENSE_CATEGORIES.map((n) => Prisma.sql`${n}`),
);

const categoryExclusion = Prisma.sql`c.name NOT IN (${excludedList})`;

async function queryBalances(userId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      saldo_contas: unknown;
      divida_cartoes: unknown;
      limite_cartoes: unknown;
      total_cartoes: unknown;
    }>
  >`
    SELECT
      COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = ${userId}), 0) AS saldo_contas,
      COALESCE((
        SELECT SUM(cb.initialDebt + COALESCE(p.total_purchases, 0) - COALESCE(pay.total_payments, 0))
        FROM CreditCard cb
        LEFT JOIN (
          SELECT creditCardId, SUM(amount) AS total_purchases
          FROM CreditCardPurchase WHERE userId = ${userId}
          GROUP BY creditCardId
        ) p ON p.creditCardId = cb.id
        LEFT JOIN (
          SELECT creditCardId, SUM(amount) AS total_payments
          FROM CreditCardPayment WHERE userId = ${userId}
          GROUP BY creditCardId
        ) pay ON pay.creditCardId = cb.id
        WHERE cb.userId = ${userId}
      ), 0) AS divida_cartoes,
      COALESCE((SELECT SUM(cardLimit) FROM CreditCard WHERE userId = ${userId}), 0) AS limite_cartoes,
      (SELECT COUNT(*) FROM CreditCard WHERE userId = ${userId}) AS total_cartoes
  `;
  return rows[0];
}

async function queryMonthlyFlow(userId: string, months: number) {
  return prisma.$queryRaw<
    Array<{
      ym: string;
      receita: unknown;
      despesa_tx: unknown;
      despesa_cartao: unknown;
    }>
  >`
    SELECT
      meses.ym,
      COALESCE(rec.receita, 0) AS receita,
      COALESCE(desp.despesa, 0) AS despesa_tx,
      COALESCE(card.despesa, 0) AS despesa_cartao
    FROM (
      SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq MONTH), '%Y-%m') AS ym
      FROM (
        SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
        UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
        UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
      ) seqs
      WHERE seq < ${months}
    ) meses
    LEFT JOIN (
      SELECT DATE_FORMAT(t.date, '%Y-%m') AS ym, SUM(t.amount) AS receita
      FROM \`Transaction\` t
      INNER JOIN Category c ON c.id = t.categoryId
      WHERE t.userId = ${userId}
        AND t.type = 'INCOME'
        AND t.status = 'COMPLETED'
        AND t.date >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
        AND ${categoryExclusion}
      GROUP BY DATE_FORMAT(t.date, '%Y-%m')
    ) rec ON rec.ym = meses.ym
    LEFT JOIN (
      SELECT DATE_FORMAT(t.date, '%Y-%m') AS ym, SUM(t.amount) AS despesa
      FROM \`Transaction\` t
      INNER JOIN Category c ON c.id = t.categoryId
      WHERE t.userId = ${userId}
        AND t.type = 'EXPENSE'
        AND t.status = 'COMPLETED'
        AND t.date >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
        AND ${categoryExclusion}
      GROUP BY DATE_FORMAT(t.date, '%Y-%m')
    ) desp ON desp.ym = meses.ym
    LEFT JOIN (
      SELECT DATE_FORMAT(cp.date, '%Y-%m') AS ym, SUM(cp.amount) AS despesa
      FROM CreditCardPurchase cp
      INNER JOIN Category c ON c.id = cp.categoryId
      WHERE cp.userId = ${userId}
        AND cp.date >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
        AND ${categoryExclusion}
      GROUP BY DATE_FORMAT(cp.date, '%Y-%m')
    ) card ON card.ym = meses.ym
    ORDER BY meses.ym DESC
  `;
}

async function queryExpensesByCategory(userId: string) {
  return prisma.$queryRaw<
    Array<{
      categoria: string;
      total_ultimo_mes: unknown;
      total_ultimos_3_meses: unknown;
      transacoes_ultimos_3_meses: unknown;
      ticket_medio: unknown;
      total_mes_anterior: unknown;
    }>
  >`
    SELECT
      c.name AS categoria,
      SUM(CASE
        WHEN combined.date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
         AND combined.date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
        THEN combined.amount ELSE 0 END) AS total_ultimo_mes,
      SUM(combined.amount) AS total_ultimos_3_meses,
      COUNT(*) AS transacoes_ultimos_3_meses,
      AVG(combined.amount) AS ticket_medio,
      SUM(CASE
        WHEN combined.date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 MONTH), '%Y-%m-01')
         AND combined.date < DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        THEN combined.amount ELSE 0 END) AS total_mes_anterior
    FROM (
      SELECT t.categoryId, t.amount, t.date
      FROM \`Transaction\` t
      INNER JOIN Category c ON c.id = t.categoryId
      WHERE t.userId = ${userId}
        AND t.type = 'EXPENSE'
        AND t.status = 'COMPLETED'
        AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        AND ${categoryExclusion}
      UNION ALL
      SELECT cp.categoryId, cp.amount, cp.date
      FROM CreditCardPurchase cp
      INNER JOIN Category c ON c.id = cp.categoryId
      WHERE cp.userId = ${userId}
        AND cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        AND ${categoryExclusion}
    ) combined
    INNER JOIN Category c ON c.id = combined.categoryId
    GROUP BY c.name
    ORDER BY total_ultimos_3_meses DESC
  `;
}

async function queryIncomeAnalysis(userId: string) {
  return prisma.$queryRaw<
    Array<{
      fonte_receita: string;
      receita_ultimo_mes: unknown;
      receita_ultimos_3_meses: unknown;
      quantidade_transacoes: unknown;
      media_mensal_3_meses: unknown;
      dias_desde_ultima_receita: unknown;
    }>
  >`
    SELECT
      c.name AS fonte_receita,
      SUM(CASE
        WHEN t.date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
         AND t.date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
        THEN t.amount ELSE 0 END) AS receita_ultimo_mes,
      SUM(t.amount) AS receita_ultimos_3_meses,
      COUNT(*) AS quantidade_transacoes,
      SUM(t.amount) / 3 AS media_mensal_3_meses,
      DATEDIFF(CURDATE(), MAX(t.date)) AS dias_desde_ultima_receita
    FROM \`Transaction\` t
    INNER JOIN Category c ON c.id = t.categoryId
    WHERE t.userId = ${userId}
      AND t.type = 'INCOME'
      AND t.status = 'COMPLETED'
      AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      AND ${categoryExclusion}
    GROUP BY c.name
    ORDER BY receita_ultimos_3_meses DESC
  `;
}

async function queryRecurringFixedCosts(userId: string) {
  return prisma.$queryRaw<
    Array<{
      descricao: string;
      categoria: string;
      meses_repetidos: unknown;
      media_mensal: unknown;
      total_4_meses: unknown;
      ultimo_valor: unknown;
    }>
  >`
    WITH expense_monthly AS (
      SELECT
        LOWER(TRIM(e.description)) AS desc_key,
        MIN(e.description) AS descricao,
        c.name AS categoria,
        DATE_FORMAT(e.date, '%Y-%m') AS ym,
        SUM(e.amount) AS month_total,
        MAX(e.date) AS last_date
      FROM (
        SELECT t.description, t.categoryId, t.amount, t.date
        FROM \`Transaction\` t
        INNER JOIN Category c ON c.id = t.categoryId
        WHERE t.userId = ${userId}
          AND t.type = 'EXPENSE'
          AND t.status = 'COMPLETED'
          AND t.date >= DATE_SUB(CURDATE(), INTERVAL 4 MONTH)
          AND ${categoryExclusion}
        UNION ALL
        SELECT cp.description, cp.categoryId, cp.amount, cp.date
        FROM CreditCardPurchase cp
        INNER JOIN Category c ON c.id = cp.categoryId
        WHERE cp.userId = ${userId}
          AND cp.date >= DATE_SUB(CURDATE(), INTERVAL 4 MONTH)
          AND ${categoryExclusion}
      ) e
      INNER JOIN Category c ON c.id = e.categoryId
      GROUP BY desc_key, c.name, ym
    ),
    recurring AS (
      SELECT
        desc_key,
        descricao,
        categoria,
        COUNT(DISTINCT ym) AS meses_repetidos,
        AVG(month_total) AS media_mensal,
        SUM(month_total) AS total_4_meses
      FROM expense_monthly
      GROUP BY desc_key, descricao, categoria
      HAVING meses_repetidos >= 2
    ),
    last_values AS (
      SELECT em.desc_key, em.month_total AS ultimo_valor
      FROM expense_monthly em
      INNER JOIN (
        SELECT desc_key, MAX(ym) AS max_ym
        FROM expense_monthly
        GROUP BY desc_key
      ) latest ON latest.desc_key = em.desc_key AND latest.max_ym = em.ym
    )
    SELECT
      r.descricao,
      r.categoria,
      r.meses_repetidos,
      r.media_mensal,
      r.total_4_meses,
      COALESCE(lv.ultimo_valor, r.media_mensal) AS ultimo_valor
    FROM recurring r
    LEFT JOIN last_values lv ON lv.desc_key = r.desc_key
    ORDER BY r.media_mensal DESC
  `;
}

async function queryCreditCards(userId: string) {
  return prisma.$queryRaw<
    Array<{
      card_id: string;
      nome_cartao: string;
      limite_total: unknown;
      divida_atual: unknown;
      compras_mes: unknown;
      percentual_utilizado: unknown;
    }>
  >`
    SELECT
      cc.id AS card_id,
      cc.name AS nome_cartao,
      cc.cardLimit AS limite_total,
      (cc.initialDebt + COALESCE(p.total_purchases, 0) - COALESCE(pay.total_payments, 0)) AS divida_atual,
      COALESCE(pm.compras_mes, 0) AS compras_mes,
      CASE
        WHEN cc.cardLimit > 0 THEN
          ((cc.initialDebt + COALESCE(p.total_purchases, 0) - COALESCE(pay.total_payments, 0)) / cc.cardLimit) * 100
        ELSE 0
      END AS percentual_utilizado
    FROM CreditCard cc
    LEFT JOIN (
      SELECT creditCardId, SUM(amount) AS total_purchases
      FROM CreditCardPurchase WHERE userId = ${userId}
      GROUP BY creditCardId
    ) p ON p.creditCardId = cc.id
    LEFT JOIN (
      SELECT creditCardId, SUM(amount) AS total_payments
      FROM CreditCardPayment WHERE userId = ${userId}
      GROUP BY creditCardId
    ) pay ON pay.creditCardId = cc.id
    LEFT JOIN (
      SELECT creditCardId, SUM(amount) AS compras_mes
      FROM CreditCardPurchase
      WHERE userId = ${userId}
        AND date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY creditCardId
    ) pm ON pm.creditCardId = cc.id
    WHERE cc.userId = ${userId}
    ORDER BY percentual_utilizado DESC
  `;
}

async function queryGoals(userId: string) {
  return prisma.$queryRaw<
    Array<{
      goal_id: string;
      nome_meta: string;
      valor_objetivo: unknown;
      valor_atual: unknown;
      target_date: Date;
      include_investments: unknown;
      account_balance: unknown;
    }>
  >`
    SELECT
      g.id AS goal_id,
      g.name AS nome_meta,
      g.targetAmount AS valor_objetivo,
      g.currentAmount AS valor_atual,
      g.targetDate AS target_date,
      g.includeInvestments AS include_investments,
      COALESCE(ba.currentBalance, 0) AS account_balance
    FROM Goal g
    LEFT JOIN BankAccount ba ON ba.id = g.accountId
    WHERE g.userId = ${userId}
    ORDER BY g.targetDate ASC
  `;
}

async function queryInvestmentContributions(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ aportes_3_meses: unknown }>>`
    SELECT COALESCE(SUM(
      CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END
    ), 0) AS aportes_3_meses
    FROM InvestmentTransaction it
    INNER JOIN Investment i ON i.id = it.investmentId
    WHERE i.userId = ${userId}
      AND it.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
  `;
  return num(rows[0]?.aportes_3_meses);
}

async function buildInvestmentPortfolio(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { transactions: { orderBy: { date: "asc" } } },
  });

  const tickers = investments
    .filter((i) => i.type === "STOCKS" && i.ticker)
    .map((i) => i.ticker!);
  const quotes = await fetchStockQuotes(tickers);

  const summaries = investments.map((inv) => {
    const summary = calculateInvestmentSummary(inv, quotes);
    const lastTx = inv.transactions[inv.transactions.length - 1];
    const diasDesde =
      lastTx != null
        ? Math.floor(
            (Date.now() - new Date(lastTx.date).getTime()) / 86400000,
          )
        : null;

    const aportes3m = inv.transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 3);
        return d >= cutoff;
      })
      .reduce(
        (s, tx) =>
          s + (tx.type === "BUY" ? num(tx.amount) : -num(tx.amount)),
        0,
      );

    return {
      investment: inv,
      summary,
      diasDesde,
      aportes3m,
    };
  });

  const totals = aggregateInvestmentTotals(summaries.map((s) => s.summary));
  const totalValue = totals.current;

  return summaries.map(({ investment: inv, summary, diasDesde, aportes3m }) => ({
    nome_investimento: inv.name,
    tipo_investimento: inv.type,
    ticker: inv.ticker,
    corretora_ou_banco: inv.institution ?? "Não informado",
    valor_investido_liquido: summary.totalInvested,
    valor_atual: summary.currentValue,
    quantidade_atual: summary.totalQuantity,
    preco_medio_compra: summary.averagePrice,
    nivel_risco: classifyInvestmentRisk(inv.type),
    percentual_portfolio:
      totalValue > 0 ? (summary.currentValue / totalValue) * 100 : 0,
    aportes_3_meses: aportes3m,
    dias_desde_ultima_movimentacao: diasDesde ?? 0,
    percentual_cdi: inv.cdiPercentage ? num(inv.cdiPercentage) : null,
    color: inv.color,
    lucro_prejuizo: summary.profitLoss,
    lucro_prejuizo_percentual: summary.profitLossPercentage,
  }));
}

function buildAlerts(params: {
  emergencyMonths: number;
  savingsRate: number;
  runwayMonths: number;
  fixedMonthly: number;
  creditCards: RawRow[];
  goals: RawRow[];
  expensesByCategory: RawRow[];
}) {
  const alerts: Array<{
    tipo_alerta: string;
    nivel_prioridade: string;
    titulo: string;
    mensagem: string;
    acao_sugerida: string;
  }> = [];

  if (params.emergencyMonths < 3) {
    alerts.push({
      tipo_alerta: "RESERVA_EMERGENCIA",
      nivel_prioridade: "CRÍTICO",
      titulo: "Reserva de emergência baixa",
      mensagem: `Você tem cobertura para ${params.emergencyMonths.toFixed(1)} meses de despesas. O ideal é 6 meses ou mais.`,
      acao_sugerida:
        "Reduza gastos supérfluos e direcione parte da receita para caixa antes de novos aportes.",
    });
  } else if (params.emergencyMonths < 6) {
    alerts.push({
      tipo_alerta: "RESERVA_EMERGENCIA",
      nivel_prioridade: "MÉDIO",
      titulo: "Reserva abaixo do ideal",
      mensagem: `${params.emergencyMonths.toFixed(1)} meses de cobertura. Meta recomendada: 6 meses.`,
      acao_sugerida: "Continue aumentando a reserva gradualmente.",
    });
  }

  if (params.runwayMonths > 0 && params.runwayMonths < 6) {
    alerts.push({
      tipo_alerta: "RUNWAY",
      nivel_prioridade: params.runwayMonths < 3 ? "ALTO" : "MÉDIO",
      titulo: "Runway limitado com custos fixos",
      mensagem: `Com custos fixos de ${params.fixedMonthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês, seu caixa + investimentos cobrem ~${params.runwayMonths.toFixed(1)} meses.`,
      acao_sugerida:
        "Revise assinaturas e despesas recorrentes; considere aumentar receita ou reduzir fixos.",
    });
  }

  if (params.savingsRate < 10) {
    alerts.push({
      tipo_alerta: "TAXA_POUPANCA",
      nivel_prioridade: params.savingsRate < 0 ? "ALTO" : "MÉDIO",
      titulo: "Taxa de poupança baixa",
      mensagem: `Taxa de poupança média de ${params.savingsRate.toFixed(1)}% nos últimos 3 meses.`,
      acao_sugerida: "Identifique categorias com maior crescimento e estabeleça um teto mensal.",
    });
  }

  for (const card of params.creditCards) {
    const pct = num(card.percentual_utilizado);
    if (pct > 70) {
      alerts.push({
        tipo_alerta: "CARTAO",
        nivel_prioridade: pct > 90 ? "CRÍTICO" : "ALTO",
        titulo: `Cartão ${str(card.nome_cartao)} com alto uso`,
        mensagem: `${pct.toFixed(0)}% do limite utilizado (${num(card.divida_atual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de dívida).`,
        acao_sugerida: "Priorize pagamento da fatura e evite novas compras parceladas.",
      });
    }
  }

  for (const exp of params.expensesByCategory.slice(0, 3)) {
    const prev = num(exp.total_mes_anterior);
    const last = num(exp.total_ultimo_mes);
    if (prev > 0 && last > prev * 1.3) {
      const variation = ((last - prev) / prev) * 100;
      alerts.push({
        tipo_alerta: "GASTO_CATEGORIA",
        nivel_prioridade: variation > 50 ? "ALTO" : "MÉDIO",
        titulo: `Aumento em ${str(exp.categoria)}`,
        mensagem: `Gastos subiram ${variation.toFixed(0)}% vs mês anterior.`,
        acao_sugerida: "Analise transações recentes nesta categoria.",
      });
    }
  }

  for (const goal of params.goals) {
    const progress = num(goal.progresso_percentual);
    const dias = num(goal.dias_restantes);
    if (dias < 90 && progress < 70) {
      alerts.push({
        tipo_alerta: "META",
        nivel_prioridade: dias < 30 ? "CRÍTICO" : "MÉDIO",
        titulo: `Meta "${str(goal.nome_meta)}" em risco`,
        mensagem: `${progress.toFixed(0)}% concluído com ${dias} dias restantes.`,
        acao_sugerida: "Ajuste o valor mensal ou estenda o prazo da meta.",
      });
    }
  }

  const priorityOrder: Record<string, number> = {
    CRÍTICO: 1,
    ALTO: 2,
    MÉDIO: 3,
    BAIXO: 4,
  };

  return alerts.sort(
    (a, b) =>
      (priorityOrder[a.nivel_prioridade] ?? 9) -
      (priorityOrder[b.nivel_prioridade] ?? 9),
  );
}

export async function fetchFinancialAnalytics(userId: string) {
  const [
    balances,
    monthlyFlow,
    expensesRaw,
    incomeRaw,
    fixedCostsRaw,
    creditCardsRaw,
    goalsRaw,
    aportes3m,
    investments,
  ] = await Promise.all([
    queryBalances(userId),
    queryMonthlyFlow(userId, 12),
    queryExpensesByCategory(userId),
    queryIncomeAnalysis(userId),
    queryRecurringFixedCosts(userId),
    queryCreditCards(userId),
    queryGoals(userId),
    queryInvestmentContributions(userId),
    buildInvestmentPortfolio(userId),
  ]);

  const saldoContas = num(balances?.saldo_contas);
  const dividaCartoes = num(balances?.divida_cartoes);
  const limiteCartoes = num(balances?.limite_cartoes);
  const valorInvestido = investments.reduce((s, i) => s + i.valor_atual, 0);
  const patrimonioLiquido = saldoContas + valorInvestido - dividaCartoes;
  const caixaComInvestimentos = saldoContas + valorInvestido;

  const last3 = monthlyFlow.slice(0, 3);
  const lastMonth = monthlyFlow[0];

  const avgIncome3m =
    last3.length > 0
      ? last3.reduce((s, m) => s + num(m.receita), 0) / last3.length
      : 0;
  const avgExpense3m =
    last3.length > 0
      ? last3.reduce(
          (s, m) => s + num(m.despesa_tx) + num(m.despesa_cartao),
          0,
        ) / last3.length
      : 0;

  const receitaUltimoMes = num(lastMonth?.receita);
  const despesaUltimoMes =
    num(lastMonth?.despesa_tx) + num(lastMonth?.despesa_cartao);

  const savingsRate =
    avgIncome3m > 0
      ? ((avgIncome3m - avgExpense3m) / avgIncome3m) * 100
      : 0;
  const emergencyMonths =
    avgExpense3m > 0 ? saldoContas / avgExpense3m : 0;

  const totalIncome3m = incomeRaw.reduce(
    (s, r) => s + num(r.receita_ultimos_3_meses),
    0,
  );

  const expensesByCategory = expensesRaw.map((row) => {
    const total3m = num(row.total_ultimos_3_meses);
    const last = num(row.total_ultimo_mes);
    const prev = num(row.total_mes_anterior);
    const variation =
      prev > 0 ? ((last - prev) / prev) * 100 : last > 0 ? 100 : 0;
    const classification = classifyExpenseCategory(str(row.categoria));
    const txCount = num(row.transacoes_ultimos_3_meses);

    return {
      categoria: str(row.categoria),
      total_ultimo_mes: last,
      total_ultimos_3_meses: total3m,
      media_mensal_3_meses: total3m / 3,
      classificacao_categoria: classification,
      frequencia_uso:
        txCount >= 8 ? "Frequente" : txCount >= 3 ? "Regular" : "Esporádico",
      variacao_mes_anterior_percentual: variation,
      alerta_variacao:
        variation > 30 ? "ALTO" : variation > 15 ? "MODERADO" : "NORMAL",
      transacoes_ultimos_3_meses: txCount,
      ticket_medio: num(row.ticket_medio),
      percentual_total_3_meses: 0,
    };
  });

  const expenseTotal3m = expensesByCategory.reduce(
    (s, e) => s + e.total_ultimos_3_meses,
    0,
  );
  for (const e of expensesByCategory) {
    e.percentual_total_3_meses =
      expenseTotal3m > 0
        ? (e.total_ultimos_3_meses / expenseTotal3m) * 100
        : 0;
  }

  const incomeAnalysis = incomeRaw.map((row) => {
    const total3m = num(row.receita_ultimos_3_meses);
    const txCount = num(row.quantidade_transacoes);
    return {
      fonte_receita: str(row.fonte_receita),
      receita_ultimo_mes: num(row.receita_ultimo_mes),
      receita_ultimos_3_meses: total3m,
      media_mensal_3_meses: num(row.media_mensal_3_meses),
      tipo_renda: classifyIncomeCategory(str(row.fonte_receita)),
      regularidade:
        txCount >= 3 ? "Regular" : txCount >= 2 ? "Recorrente" : "Eventual",
      percentual_renda_total_3_meses:
        totalIncome3m > 0 ? (total3m / totalIncome3m) * 100 : 0,
      quantidade_transacoes: txCount,
      dias_desde_ultima_receita: num(row.dias_desde_ultima_receita),
    };
  });

  const fixedCosts = fixedCostsRaw.map((row) => ({
    descricao: str(row.descricao),
    categoria: str(row.categoria),
    meses_repetidos: num(row.meses_repetidos),
    media_mensal: num(row.media_mensal),
    total_4_meses: num(row.total_4_meses),
    ultimo_valor: num(row.ultimo_valor),
    confianca:
      num(row.meses_repetidos) >= 3
        ? "ALTA"
        : num(row.meses_repetidos) >= 2
          ? "MÉDIA"
          : "BAIXA",
  }));

  const fixedMonthly = fixedCosts.reduce((s, f) => s + f.media_mensal, 0);
  const runwayMonths =
    fixedMonthly > 0 ? caixaComInvestimentos / fixedMonthly : 0;

  const creditCards = creditCardsRaw.map((row) => {
    const pct = num(row.percentual_utilizado);
    let status = "SAUDÁVEL";
    if (pct > 80) status = "CRÍTICO";
    else if (pct > 50) status = "ALTO";
    else if (pct > 30) status = "MODERADO";

    let score = 100;
    if (pct > 80) score -= 45;
    else if (pct > 50) score -= 25;
    else if (pct > 30) score -= 10;

    return {
      nome_cartao: str(row.nome_cartao),
      limite_total: num(row.limite_total),
      divida_atual: num(row.divida_atual),
      percentual_utilizado: pct,
      status_utilizacao: status,
      score_saude_cartao: score,
      alerta_pagamento: pct > 70 ? "ATENCAO_FATURA" : "OK",
      proxima_fatura_valor: num(row.compras_mes),
    };
  });

  const goals = goalsRaw.map((row) => {
    const target = num(row.valor_objetivo);
    const current = num(row.valor_atual);
    const accountBal = num(row.account_balance);
    const progress = target > 0 ? (current / target) * 100 : 0;
    const dias = Math.floor(
      (new Date(row.target_date).getTime() - Date.now()) / 86400000,
    );
    const meses = dias / 30;
    const faltante = Math.max(target - current, 0);
    const mensal = meses > 0 ? faltante / meses : faltante;

    let viabilidade = "VIÁVEL";
    if (progress >= 100) viabilidade = "ALCANÇADA";
    else if (dias < 0) viabilidade = "ATRASADA";
    else if (progress < 40 && dias < 180) viabilidade = "DESAFIADORA";
    else if (progress < 25 && dias < 90) viabilidade = "INVIÁVEL_NO_PRAZO";

    return {
      nome_meta: str(row.nome_meta),
      valor_objetivo: target,
      valor_atual: current,
      progresso_percentual: progress,
      dias_restantes: dias,
      status_prazo:
        dias < 0 ? "ATRASADO" : dias <= 30 ? "URGENTE" : "NO_PRAZO",
      viabilidade,
      valor_necessario_por_mes: mensal,
      saldo_conta_vinculada: accountBal,
      include_investments: Boolean(row.include_investments),
    };
  });

  const patrimonyEvolution = [...monthlyFlow]
    .reverse()
    .map((m) => {
      const receita = num(m.receita);
      const despesa = num(m.despesa_tx) + num(m.despesa_cartao);
      const saldo = receita - despesa;
      const taxa = receita > 0 ? (saldo / receita) * 100 : 0;
      const [year, month] = m.ym.split("-");
      const mesAno = new Date(Number(year), Number(month) - 1).toLocaleDateString(
        "pt-BR",
        { month: "short", year: "numeric" },
      );

      return {
        mes_ano: mesAno,
        ym: m.ym,
        receita_mes: receita,
        despesa_mes: despesa,
        saldo_liquido_real_mes: saldo,
        taxa_poupanca_mes_percentual: taxa,
        desempenho_mes: saldo > 0 ? "POSITIVO" : saldo < 0 ? "NEGATIVO" : "NEUTRO",
        classificacao_resultado:
          taxa >= 30
            ? "EXCELENTE_POUPANCA"
            : taxa >= 20
              ? "BOA_POUPANCA"
              : taxa >= 10
                ? "POUPANCA_MODERADA"
                : taxa >= 0
                  ? "POUPANCA_BAIXA"
                  : "DEFICIT",
      };
    });

  const metasAtivas = goals.filter((g) => g.viabilidade !== "ALCANÇADA");
  const progressoMedio =
    metasAtivas.length > 0
      ? metasAtivas.reduce((s, g) => s + g.progresso_percentual, 0) /
        metasAtivas.length
      : 0;

  const dashboard = {
    saldo_contas_correntes: saldoContas,
    valor_investido_total: valorInvestido,
    divida_cartoes_atual: dividaCartoes,
    patrimonio_liquido_atual: patrimonioLiquido,
    receita_ultimo_mes: receitaUltimoMes,
    receita_media_3_meses: avgIncome3m,
    despesa_ultimo_mes: despesaUltimoMes,
    despesa_media_3_meses: avgExpense3m,
    taxa_poupanca_percentual: savingsRate,
    meses_reserva_emergencia: emergencyMonths,
    total_metas_ativas: metasAtivas.length,
    metas_atrasadas: goals.filter((g) => g.dias_restantes < 0).length,
    progresso_medio_metas_percentual: progressoMedio,
    total_cartoes: num(balances?.total_cartoes),
    limite_total_cartoes: limiteCartoes,
    utilizacao_limite_percentual:
      limiteCartoes > 0 ? (dividaCartoes / limiteCartoes) * 100 : 0,
    total_investimentos_ativos: investments.length,
    aportes_investimentos_3_meses: aportes3m,
    status_saude_financeira: computeHealthStatus(savingsRate, emergencyMonths),
    caixa_com_investimentos: caixaComInvestimentos,
  };

  const fixedCostAnalysis = {
    custo_fixo_mensal_estimado: fixedMonthly,
    runway_meses: runwayMonths,
    caixa_total: caixaComInvestimentos,
    itens_recorrentes: fixedCosts,
    total_itens: fixedCosts.length,
    cobertura_percentual:
      avgExpense3m > 0 ? (fixedMonthly / avgExpense3m) * 100 : 0,
  };

  const alerts = buildAlerts({
    emergencyMonths,
    savingsRate,
    runwayMonths,
    fixedMonthly,
    creditCards,
    goals,
    expensesByCategory,
  });

  return {
    dashboard,
    fixedCostAnalysis,
    expensesByCategory,
    incomeAnalysis,
    investments,
    creditCards,
    patrimonyEvolution,
    goals,
    alerts,
  };
}

export { EXCLUDED_INCOME_EXPENSE_CATEGORIES };
