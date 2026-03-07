import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAllAnalytics } from "@/lib/analytics";

const convertDecimalFields = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertDecimalFields);
  }
  if (typeof obj === "object") {
    const converted: any = {};
    for (const key in obj) {
      const value = obj[key];
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
      console.log("Usuário não autenticado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("Buscando dados para usuário:", currentUser.userId);

    let useViews = true;
    try {
      const viewCheck = (await prisma.$queryRawUnsafe(`
                SELECT TABLE_NAME 
                FROM information_schema.VIEWS 
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'vw_Dashboard_Principal'
            `)) as any[];

      if (!viewCheck || viewCheck.length === 0) {
        console.log("Views SQL não encontradas, usando cálculos TypeScript");
        useViews = false;
      } else {
        console.log("Views SQL encontradas, usando views");
      }
    } catch (e: any) {
      console.log(
        "Banco não suporta views, usando cálculos TypeScript:",
        e.message,
      );
      useViews = false;
    }

    let response;

    if (useViews) {
      console.log("Buscando dados das views SQL...");

      const dashboardData = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Dashboard_Principal WHERE userId = '${currentUser.userId}'
          `);
      console.log("Dashboard data:", dashboardData);

      const expensesByCategory = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Gastos_Por_Categoria 
              WHERE userId = '${currentUser.userId}'
              ORDER BY total_ultimos_3_meses DESC
              LIMIT 10
          `);

      const incomeAnalysis = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Analise_Receitas 
              WHERE userId = '${currentUser.userId}'
              ORDER BY receita_ultimos_3_meses DESC
          `);

      const investments = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Portfolio_Investimentos 
              WHERE userId = '${currentUser.userId}'
              ORDER BY valor_investido_liquido DESC
          `);

      const creditCards = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Analise_Cartoes_Credito 
              WHERE userId = '${currentUser.userId}'
              ORDER BY score_saude_cartao ASC
          `);

      const patrimonyEvolution = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Evolucao_Patrimonial 
              WHERE userId = '${currentUser.userId}'
              ORDER BY ano DESC, mes DESC
              LIMIT 12
          `);

      const goals = await prisma.$queryRawUnsafe(`
              SELECT * FROM vw_Analise_Metas 
              WHERE userId = '${currentUser.userId}'
              ORDER BY dias_restantes ASC
          `);

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

      response = {
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
    } else {
      console.log(" Calculando dados em TypeScript...");
      response = await calculateAllAnalytics(currentUser.userId);
    }

    console.log("Retornando resposta:", {
      hasData: !!response.dashboard,
      expensesCount: response.expensesByCategory?.length || 0,
      incomeCount: response.incomeAnalysis?.length || 0,
      investmentsCount: response.investments?.length || 0,
      cardsCount: response.creditCards?.length || 0,
      patrimonyCount: response.patrimonyEvolution?.length || 0,
      goalsCount: response.goals?.length || 0,
      alertsCount: response.alerts?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Erro ao buscar análise financeira:", error);
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
