// Analytics Engine - Cálculos financeiros em TypeScript
// Substitui as views SQL quando usando SQLite ou como fallback

import { prisma } from "@/lib/prisma";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Função auxiliar para formatar datas
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Função para calcular dias úteis (aproximado - considera apenas dias da semana)
function calcularDiasUteis(dataInicial: Date, dataFinal: Date): number {
  let dias = 0;
  const current = new Date(dataInicial);

  while (current <= dataFinal) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Não é domingo nem sábado
      dias++;
    }
    current.setDate(current.getDate() + 1);
  }

  return dias;
}

// 1. Dashboard Principal
export async function calculateDashboardPrincipal(
  userId: string,
  dateRange?: DateRange,
) {
  const filters: any = { userId };

  if (dateRange) {
    filters.date = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  // Receitas
  const receitas = await prisma.transaction.aggregate({
    where: { ...filters, type: "INCOME", status: "COMPLETED" },
    _sum: { amount: true },
  });

  // Despesas
  const despesas = await prisma.transaction.aggregate({
    where: { ...filters, type: "EXPENSE", status: "COMPLETED" },
    _sum: { amount: true },
  });

  // Compras no cartão
  const comprasCartao = await prisma.creditCardPurchase.aggregate({
    where: dateRange
      ? {
          userId,
          date: { gte: dateRange.startDate, lte: dateRange.endDate },
        }
      : { userId },
    _sum: { amount: true },
  });

  const totalReceitas = Number(receitas._sum.amount || 0);
  const totalDespesas =
    Number(despesas._sum.amount || 0) + Number(comprasCartao._sum.amount || 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  // Patrimônio total
  const contas = await prisma.bankAccount.findMany({
    where: { userId },
    select: { currentBalance: true },
  });

  const investimentos = await prisma.investment.findMany({
    where: { userId },
    include: { transactions: true },
  });

  let totalInvestimentos = 0;
  for (const inv of investimentos) {
    let invested = 0;
    for (const tx of inv.transactions) {
      if (tx.type === "BUY") invested += Number(tx.amount);
      else if (tx.type === "SELL") invested -= Number(tx.amount);
    }
    totalInvestimentos += invested;
  }

  const patrimonioTotal =
    contas.reduce((sum, c) => sum + Number(c.currentBalance), 0) +
    totalInvestimentos;

  // Taxa de poupança
  const taxaPoupanca =
    totalReceitas > 0 ? (saldoLiquido / totalReceitas) * 100 : 0;

  // Reserva de emergência (despesas mensais médias)
  const despesaMediaMensal = totalDespesas; // Se filtrado por mês
  const mesesReserva =
    despesaMediaMensal > 0 ? patrimonioTotal / despesaMediaMensal : 0;

  // Status de saúde financeira
  let statusSaude = "BOM";
  if (mesesReserva < 3 || taxaPoupanca < 10) statusSaude = "CRÍTICO";
  else if (mesesReserva < 6 || taxaPoupanca < 20) statusSaude = "ATENÇÃO";

  return {
    periodo_inicio: dateRange ? formatDate(dateRange.startDate) : null,
    periodo_fim: dateRange ? formatDate(dateRange.endDate) : null,
    total_receitas: totalReceitas,
    total_despesas: totalDespesas,
    saldo_liquido: saldoLiquido,
    patrimonio_total: patrimonioTotal,
    total_investimentos: totalInvestimentos,
    taxa_poupanca: taxaPoupanca,
    reserva_emergencia_meses: mesesReserva,
    status_saude: statusSaude,
  };
}

// 2. Gastos por Categoria
export async function calculateGastosPorCategoria(
  userId: string,
  dateRange?: DateRange,
) {
  const filters: any = { userId, type: "EXPENSE", status: "COMPLETED" };

  if (dateRange) {
    filters.date = { gte: dateRange.startDate, lte: dateRange.endDate };
  }

  const transactions = await prisma.transaction.findMany({
    where: filters,
    include: { category: true },
  });

  const comprasCartao = await prisma.creditCardPurchase.findMany({
    where: dateRange
      ? {
          userId,
          date: { gte: dateRange.startDate, lte: dateRange.endDate },
        }
      : { userId },
    include: { category: true },
  });

  // Agrupar por categoria
  const categorias = new Map<string, any>();

  for (const tx of transactions) {
    const key = tx.category.name;
    if (!categorias.has(key)) {
      categorias.set(key, {
        categoria: tx.category.name,
        total_gasto: 0,
        quantidade_transacoes: 0,
        valor_medio: 0,
        classificacao: classifyCategory(tx.category.name),
      });
    }
    const cat = categorias.get(key)!;
    cat.total_gasto += Number(tx.amount);
    cat.quantidade_transacoes++;
  }

  for (const cp of comprasCartao) {
    const key = cp.category.name;
    if (!categorias.has(key)) {
      categorias.set(key, {
        categoria: cp.category.name,
        total_gasto: 0,
        quantidade_transacoes: 0,
        valor_medio: 0,
        classificacao: classifyCategory(cp.category.name),
      });
    }
    const cat = categorias.get(key)!;
    cat.total_gasto += Number(cp.amount);
    cat.quantidade_transacoes++;
  }

  // Calcular média e percentual
  const totalGeral = Array.from(categorias.values()).reduce(
    (sum, c) => sum + c.total_gasto,
    0,
  );

  const resultado = Array.from(categorias.values()).map((cat) => ({
    ...cat,
    valor_medio: cat.total_gasto / cat.quantidade_transacoes,
    percentual_total: totalGeral > 0 ? (cat.total_gasto / totalGeral) * 100 : 0,
  }));

  return resultado.sort((a, b) => b.total_gasto - a.total_gasto);
}

// Classificação de categorias
function classifyCategory(name: string): string {
  const essencial = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Saúde",
    "Educação",
  ];
  const importante = ["Vestuário", "Telefone", "Internet", "Seguros"];

  if (essencial.some((e) => name.toLowerCase().includes(e.toLowerCase()))) {
    return "ESSENCIAL";
  }
  if (importante.some((i) => name.toLowerCase().includes(i.toLowerCase()))) {
    return "IMPORTANTE";
  }
  return "SUPÉRFLUO";
}

// 3. Análise de Receitas
export async function calculateAnaliseReceitas(
  userId: string,
  dateRange?: DateRange,
) {
  const filters: any = { userId, type: "INCOME", status: "COMPLETED" };

  if (dateRange) {
    filters.date = { gte: dateRange.startDate, lte: dateRange.endDate };
  }

  const transactions = await prisma.transaction.findMany({
    where: filters,
    include: { category: true },
  });

  const categorias = new Map<string, any>();

  for (const tx of transactions) {
    const key = tx.category.name;
    if (!categorias.has(key)) {
      categorias.set(key, {
        categoria_receita: tx.category.name,
        total_recebido: 0,
        quantidade_recebimentos: 0,
        valor_medio: 0,
        tipo_receita: classifyIncome(tx.category.name),
      });
    }
    const cat = categorias.get(key)!;
    cat.total_recebido += Number(tx.amount);
    cat.quantidade_recebimentos++;
  }

  const totalGeral = Array.from(categorias.values()).reduce(
    (sum, c) => sum + c.total_recebido,
    0,
  );

  const resultado = Array.from(categorias.values()).map((cat) => ({
    ...cat,
    valor_medio: cat.total_recebido / cat.quantidade_recebimentos,
    percentual_total:
      totalGeral > 0 ? (cat.total_recebido / totalGeral) * 100 : 0,
    regularidade: cat.quantidade_recebimentos >= 2 ? "Regular" : "Eventual",
  }));

  return resultado.sort((a, b) => b.total_recebido - a.total_recebido);
}

function classifyIncome(name: string): string {
  const ativa = ["Salário", "Freelance", "Autônomo"];
  const passiva = ["Dividendos", "Aluguel", "Juros", "Investimento"];

  if (ativa.some((a) => name.toLowerCase().includes(a.toLowerCase()))) {
    return "ATIVA_PRINCIPAL";
  }
  if (passiva.some((p) => name.toLowerCase().includes(p.toLowerCase()))) {
    return "PASSIVA";
  }
  return "EXTRA_VARIÁVEL";
}

// 4. Portfolio de Investimentos
export async function calculatePortfolioInvestimentos(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { transactions: true },
  });

  const portfolio = [];

  for (const inv of investments) {
    let totalInvested = 0;
    let totalQuantity = 0;

    for (const tx of inv.transactions) {
      if (tx.type === "BUY") {
        totalInvested += Number(tx.amount);
        totalQuantity += Number(tx.quantity);
      } else if (tx.type === "SELL") {
        totalInvested -= Number(tx.amount);
        totalQuantity -= Number(tx.quantity);
      }
    }

    const risco = classifyRisk(inv.type);

    portfolio.push({
      nome_investimento: inv.name,
      tipo: inv.type,
      instituicao: inv.institution || "Não especificado",
      valor_investido: totalInvested,
      nivel_risco: risco,
      ticker: inv.ticker,
      cdi_percentage: inv.cdiPercentage ? Number(inv.cdiPercentage) : null,
    });
  }

  const totalGeral = portfolio.reduce((sum, p) => sum + p.valor_investido, 0);

  return portfolio.map((p) => ({
    ...p,
    percentual_portfolio:
      totalGeral > 0 ? (p.valor_investido / totalGeral) * 100 : 0,
    recomendacao_alocacao: getRecommendation(p.nivel_risco),
  }));
}

function classifyRisk(type: string): string {
  const alto = ["STOCKS", "CRYPTO"];
  const medio = ["REAL_ESTATE", "FUNDS"];

  if (alto.includes(type)) return "ALTO";
  if (medio.includes(type)) return "MÉDIO";
  return "BAIXO";
}

function getRecommendation(risk: string): string {
  if (risk === "ALTO") return "Máximo 30% do portfolio";
  if (risk === "MÉDIO") return "Entre 30-50% do portfolio";
  return "Mínimo 20% do portfolio";
}

// 5. Análise de Cartões de Crédito
export async function calculateAnaliseCartoes(
  userId: string,
  dateRange?: DateRange,
) {
  const cards = await prisma.creditCard.findMany({
    where: { userId },
    include: {
      purchases: dateRange
        ? {
            where: {
              date: { gte: dateRange.startDate, lte: dateRange.endDate },
            },
          }
        : true,
      payments: true,
    },
  });

  return cards.map((card) => {
    const totalGasto = card.purchases.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const utilizacao = (totalGasto / Number(card.cardLimit)) * 100;
    const fatura = totalGasto + Number(card.initialDebt);

    let score = 100;
    if (utilizacao > 80) score -= 40;
    else if (utilizacao > 50) score -= 20;
    else if (utilizacao > 30) score -= 10;

    let statusCartao = "SAUDÁVEL";
    if (utilizacao > 80) statusCartao = "CRÍTICO";
    else if (utilizacao > 50) statusCartao = "ATENÇÃO";

    return {
      nome_cartao: card.name,
      limite: Number(card.cardLimit),
      total_gasto: totalGasto,
      percentual_utilizado: utilizacao,
      divida_atual: Number(card.initialDebt),
      fatura_atual: fatura,
      dia_vencimento: card.dueDay,
      score_saude: score,
      status_cartao: statusCartao,
    };
  });
}

// 6. Evolução Patrimonial
export async function calculateEvolucaoPatrimonial(userId: string) {
  // Buscar todas as transações
  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "COMPLETED" },
    orderBy: { date: "asc" },
  });

  const compras = await prisma.creditCardPurchase.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const transfers = await prisma.transfer.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  // Agrupar por mês
  const meses = new Map<string, any>();

  for (const tx of transactions) {
    const mes = tx.date.toISOString().substring(0, 7); // YYYY-MM
    if (!meses.has(mes)) {
      meses.set(mes, {
        mes,
        receitas: 0,
        despesas: 0,
        saldo: 0,
        patrimonio: 0,
        taxa_poupanca: 0,
      });
    }
    const m = meses.get(mes)!;
    if (tx.type === "INCOME") m.receitas += Number(tx.amount);
    else m.despesas += Number(tx.amount);
  }

  for (const cp of compras) {
    const mes = cp.date.toISOString().substring(0, 7);
    if (!meses.has(mes)) {
      meses.set(mes, {
        mes,
        receitas: 0,
        despesas: 0,
        saldo: 0,
        patrimonio: 0,
        taxa_poupanca: 0,
      });
    }
    meses.get(mes)!.despesas += Number(cp.amount);
  }

  // Calcular saldo e patrimônio acumulado
  let patrimonioAcumulado = 0;
  const resultado = Array.from(meses.values()).map((m) => {
    m.saldo = m.receitas - m.despesas;
    patrimonioAcumulado += m.saldo;
    m.patrimonio = patrimonioAcumulado;
    m.taxa_poupanca = m.receitas > 0 ? (m.saldo / m.receitas) * 100 : 0;
    return m;
  });

  return resultado.sort((a, b) => a.mes.localeCompare(b.mes));
}

// 7. Análise de Metas
export async function calculateAnaliseMetas(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { account: true },
  });

  return goals.map((goal) => {
    const progresso =
      (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100;
    const faltante = Number(goal.targetAmount) - Number(goal.currentAmount);

    const hoje = new Date();
    const prazo = goal.targetDate;
    const diasRestantes = Math.floor(
      (prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
    );
    const mesesRestantes = diasRestantes / 30;

    const valorMensal = mesesRestantes > 0 ? faltante / mesesRestantes : 0;

    let viabilidade = "VIÁVEL";
    if (progresso < 30 && mesesRestantes < 6) viabilidade = "CRÍTICA";
    else if (progresso < 50 && mesesRestantes < 12) viabilidade = "ATENÇÃO";

    return {
      nome_meta: goal.name,
      valor_alvo: Number(goal.targetAmount),
      valor_atual: Number(goal.currentAmount),
      valor_faltante: faltante,
      percentual_progresso: progresso,
      data_alvo: goal.targetDate,
      dias_restantes: diasRestantes,
      valor_mensal_necessario: valorMensal,
      viabilidade,
    };
  });
}

// 8. Alertas Financeiros
export async function calculateAlertasFinanceiros(userId: string) {
  const alertas = [];

  // Dashboard para calcular reserva
  const dashboard = await calculateDashboardPrincipal(userId);

  if (dashboard.reserva_emergencia_meses < 3) {
    alertas.push({
      tipo_alerta: "RESERVA_EMERGENCIA",
      nivel: "CRÍTICO",
      titulo: "Reserva de Emergência Insuficiente",
      descricao: `Você possui apenas ${dashboard.reserva_emergencia_meses.toFixed(1)} meses de reserva. Recomendado: mínimo 6 meses.`,
      valor_referencia: dashboard.patrimonio_total,
      recomendacao:
        "Priorize construir uma reserva de emergência antes de novos investimentos.",
    });
  }

  // Verificar cartões
  const cartoes = await calculateAnaliseCartoes(userId);
  for (const card of cartoes) {
    if (card.percentual_utilizado > 80) {
      alertas.push({
        tipo_alerta: "USO_CARTAO",
        nivel: "CRÍTICO",
        titulo: `Cartão ${card.nome_cartao} com alto uso`,
        descricao: `Utilizando ${card.percentual_utilizado.toFixed(1)}% do limite.`,
        valor_referencia: card.total_gasto,
        recomendacao: "Reduza gastos no cartão ou aumente o limite.",
      });
    }
  }

  // Verificar metas
  const metas = await calculateAnaliseMetas(userId);
  for (const meta of metas) {
    if (meta.viabilidade === "CRÍTICA") {
      alertas.push({
        tipo_alerta: "META_RISCO",
        nivel: "ATENÇÃO",
        titulo: `Meta "${meta.nome_meta}" em risco`,
        descricao: `Progresso de ${meta.percentual_progresso.toFixed(1)}% com ${meta.dias_restantes} dias restantes.`,
        valor_referencia: meta.valor_faltante,
        recomendacao: `Necessário poupar R$ ${meta.valor_mensal_necessario.toFixed(2)}/mês.`,
      });
    }
  }

  return alertas;
}

// Função principal que retorna tudo
export async function calculateAllAnalytics(
  userId: string,
  dateRange?: DateRange,
) {
  const [
    dashboard,
    expensesByCategory,
    incomeAnalysis,
    investments,
    creditCards,
    patrimonyEvolution,
    goals,
    alerts,
  ] = await Promise.all([
    calculateDashboardPrincipal(userId, dateRange),
    calculateGastosPorCategoria(userId, dateRange),
    calculateAnaliseReceitas(userId, dateRange),
    calculatePortfolioInvestimentos(userId),
    calculateAnaliseCartoes(userId, dateRange),
    calculateEvolucaoPatrimonial(userId),
    calculateAnaliseMetas(userId),
    calculateAlertasFinanceiros(userId),
  ]);

  return {
    dashboard,
    expensesByCategory,
    incomeAnalysis,
    investments,
    creditCards,
    patrimonyEvolution,
    goals,
    alerts,
  };
}
