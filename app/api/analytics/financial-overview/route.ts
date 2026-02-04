import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Função para converter Decimal do Prisma para número
const convertDecimalFields = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertDecimalFields);
  }
  if (typeof obj === "object") {
    const converted: any = {};
    for (const key in obj) {
      const value = obj[key];
      // Converter Decimal para número
      if (value && typeof value === "object" && "toNumber" in value) {
        converted[key] = value.toNumber();
      } else if (typeof value === "bigint") {
        converted[key] = Number(value);
      } else if (typeof value === "object" && value !== null) {
        converted[key] = convertDecimalFields(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  return obj;
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      console.log("❌ Usuário não autenticado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("✅ Buscando dados para usuário:", currentUser.userId);

    // Verificar se as views existem
    try {
      const viewCheck = await prisma.$queryRawUnsafe(`
                SELECT TABLE_NAME 
                FROM information_schema.VIEWS 
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME LIKE 'vw_%'
            `);
      console.log("📊 Views encontradas:", viewCheck);
    } catch (e) {
      console.log("⚠️ Erro ao verificar views:", e);
    }

    // Buscar dados do dashboard principal
    console.log("🔍 Buscando vw_Dashboard_Principal...");
    const dashboardData = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Dashboard_Principal WHERE userId = '${currentUser.userId}'
        `);
    console.log("📊 Dashboard data:", dashboardData);

    // Buscar gastos por categoria
    console.log("🔍 Buscando vw_Gastos_Por_Categoria...");
    const expensesByCategory = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Gastos_Por_Categoria 
            WHERE userId = '${currentUser.userId}'
            ORDER BY total_ultimos_3_meses DESC
            LIMIT 10
        `);
    console.log("📊 Expenses:", expensesByCategory);

    // Buscar receitas
    console.log("🔍 Buscando vw_Analise_Receitas...");
    const incomeAnalysis = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Analise_Receitas 
            WHERE userId = '${currentUser.userId}'
            ORDER BY receita_ultimos_3_meses DESC
        `);
    console.log("📊 Income:", incomeAnalysis);

    // Buscar portfolio de investimentos
    console.log("🔍 Buscando vw_Portfolio_Investimentos...");
    const investments = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Portfolio_Investimentos 
            WHERE userId = '${currentUser.userId}'
            ORDER BY valor_investido_liquido DESC
        `);
    console.log("📊 Investments:", investments);

    // Buscar análise de cartões
    console.log("🔍 Buscando vw_Analise_Cartoes_Credito...");
    const creditCards = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Analise_Cartoes_Credito 
            WHERE userId = '${currentUser.userId}'
            ORDER BY score_saude_cartao ASC
        `);
    console.log("📊 Credit Cards:", creditCards);

    // Buscar evolução patrimonial (últimos 12 meses)
    console.log("🔍 Buscando vw_Evolucao_Patrimonial...");
    const patrimonyEvolution = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Evolucao_Patrimonial 
            WHERE userId = '${currentUser.userId}'
            ORDER BY ano DESC, mes DESC
            LIMIT 12
        `);
    console.log("📊 Patrimony Evolution:", patrimonyEvolution);

    // Buscar metas
    console.log("🔍 Buscando vw_Analise_Metas...");
    const goals = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Analise_Metas 
            WHERE userId = '${currentUser.userId}'
            ORDER BY dias_restantes ASC
        `);
    console.log("📊 Goals:", goals);

    // Buscar alertas
    console.log("🔍 Buscando vw_Alertas_Financeiros...");
    const alerts = await prisma.$queryRawUnsafe(`
            SELECT * FROM vw_Alertas_Financeiros 
            WHERE userId = '${currentUser.userId}'
            ORDER BY 
                CASE 
                    WHEN nivel_prioridade = 'CRÍTICO' THEN 1
                    WHEN nivel_prioridade = 'ALTO' THEN 2
                    WHEN nivel_prioridade = 'MÉDIO' THEN 3
                    ELSE 4
                END
            LIMIT 10
        `);
    console.log("📊 Alerts:", alerts);

    // Converter campos Decimal para números
    const response = {
      dashboard:
        convertDecimalFields(
          Array.isArray(dashboardData) ? dashboardData[0] : dashboardData,
        ) || null,
      expensesByCategory: convertDecimalFields(expensesByCategory) || [],
      incomeAnalysis: convertDecimalFields(incomeAnalysis) || [],
      investments: convertDecimalFields(investments) || [],
      creditCards: convertDecimalFields(creditCards) || [],
      patrimonyEvolution: convertDecimalFields(patrimonyEvolution) || [],
      goals: convertDecimalFields(goals) || [],
      alerts: convertDecimalFields(alerts) || [],
    };

    console.log("✅ Retornando resposta:", {
      hasData: !!response.dashboard,
      expensesCount: response.expensesByCategory.length,
      incomeCount: response.incomeAnalysis.length,
      investmentsCount: response.investments.length,
      cardsCount: response.creditCards.length,
      patrimonyCount: response.patrimonyEvolution.length,
      goalsCount: response.goals.length,
      alertsCount: response.alerts.length,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ Erro ao buscar análise financeira:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Erro ao buscar dados financeiros",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
