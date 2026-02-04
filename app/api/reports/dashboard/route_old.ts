import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    // Usar queries diretas em vez de procedures para evitar problema de collation
    const dashboardData = await prisma.$queryRaw`
      SELECT 
        -- KPIs principais
        COALESCE((
            SELECT AVG(receita_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receita_mes
                FROM Transaction t
                WHERE t.userId = ${user.userId}
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'PAID'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as receita_media_mensal,
        
        COALESCE((
            SELECT AVG(despesa_mes) FROM (
                SELECT 
                    SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes
                FROM Transaction t
                WHERE t.userId = ${user.userId}
                  AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  AND t.status = 'PAID'
                GROUP BY DATE_FORMAT(t.date, '%Y-%m')
            ) AS ultimos_meses
        ), 0) as despesa_media_mensal,
        
        -- Patrimônio atual
        COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = ${user.userId}), 0) as saldo_bancos,
        COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = ${user.userId}), 0) as divida_cartoes,
        COALESCE((
            SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
            FROM InvestmentTransaction it
            JOIN Investment i ON it.investmentId = i.id
            WHERE i.userId = ${user.userId}
        ), 0) as valor_investimentos,
        
        -- Metas
        COALESCE((SELECT COUNT(*) FROM Goal WHERE userId = ${user.userId} AND targetDate >= CURDATE()), 0) as total_metas,
        COALESCE((
            SELECT AVG((currentAmount / targetAmount) * 100) 
            FROM Goal 
            WHERE userId = ${user.userId} AND targetDate >= CURDATE() AND targetAmount > 0
        ), 0) as progresso_metas_percentual
    `;

    const result = {
      dashboard: {
        receita_media_mensal: Number(dashboard.receita_media_mensal) || 0,
        despesa_media_mensal: Number(dashboard.despesa_media_mensal) || 0,
        saldo_bancos: Number(dashboard.saldo_bancos) || 0,
        divida_cartoes: Number(dashboard.divida_cartoes) || 0,
        valor_investimentos: Number(dashboard.valor_investimentos) || 0,
        total_metas: Number(dashboard.total_metas) || 0,
        progresso_metas_percentual:
          Number(dashboard.progresso_metas_percentual) || 0,
      },
      gastosPorCategoria: Array.isArray(gastosPorCategoria[0])
        ? gastosPorCategoria[0]
        : [],
      analiseReceitas: Array.isArray(analiseReceitas[0])
        ? analiseReceitas[0]
        : [],
      evolucaoPatrimonial: Array.isArray(evolucaoPatrimonial[0])
        ? evolucaoPatrimonial[0]
        : [],
      alertas: Array.isArray(alertas[0]) ? alertas[0] : [],
      portfolioInvestimentos: Array.isArray(portfolioInvestimentos[0])
        ? portfolioInvestimentos[0]
        : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
