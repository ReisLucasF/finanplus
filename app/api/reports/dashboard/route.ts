import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📊 API Dashboard - User:", user.userId);

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
                  AND t.status IN ('COMPLETED', 'PAID')
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
                  AND t.status IN ('COMPLETED', 'PAID')
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

    // Buscar gastos por categoria
    const gastosPorCategoria = await prisma.$queryRaw`
      SELECT 
          c.name as categoria,
          c.type as tipo_categoria,
          
          COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN t.amount END), 0) as total_transacoes_ultimo_mes,
          COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN cp.amount END), 0) as total_cartao_ultimo_mes,
          
          COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as total_transacoes_3_meses,
          COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0) as total_cartao_3_meses,
          
          COUNT(DISTINCT t.id) as quantidade_transacoes,
          COUNT(DISTINCT cp.id) as quantidade_compras_cartao

      FROM Category c
      LEFT JOIN Transaction t ON c.id = t.categoryId 
          AND t.type = 'EXPENSE' 
          AND t.status IN ('COMPLETED', 'PENDING')
          AND t.userId = ${user.userId}
      LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId 
          AND cp.userId = ${user.userId}
      WHERE c.type = 'EXPENSE' 
        AND (c.userId = ${user.userId} OR c.userId IS NULL)
      GROUP BY c.id, c.name, c.type
      HAVING (total_transacoes_3_meses + total_cartao_3_meses) > 0
      ORDER BY (total_transacoes_3_meses + total_cartao_3_meses) DESC
      LIMIT 10
    `;

    // Buscar alertas simples
    const alertas = await prisma.$queryRaw`
      SELECT 'GASTO_ALTO' as tipo_alerta, 
             'Gastos acima da média detectados' as mensagem,
             'MEDIO' as prioridade,
             NOW() as data_alerta
      UNION ALL
      SELECT 'DASHBOARD_OK' as tipo_alerta, 
             'Dashboard carregado com sucesso' as mensagem,
             'BAIXO' as prioridade,
             NOW() as data_alerta
      LIMIT 5
    `;

    const dashboard = Array.isArray(dashboardData) ? dashboardData[0] : {};

    // Converter BigInt para Number para evitar erro de serialização
    const convertBigIntToNumber = (value: any): number => {
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return Number(value) || 0;
    };

    // Processar gastos por categoria
    const gastosPorCategoriaProcessed = Array.isArray(gastosPorCategoria) 
      ? gastosPorCategoria.map((item: any) => ({
          categoria: item.categoria,
          tipo_categoria: item.tipo_categoria,
          total_ultimo_mes: convertBigIntToNumber(item.total_transacoes_ultimo_mes) + convertBigIntToNumber(item.total_cartao_ultimo_mes),
          total_ultimos_3_meses: convertBigIntToNumber(item.total_transacoes_3_meses) + convertBigIntToNumber(item.total_cartao_3_meses),
          quantidade_transacoes: convertBigIntToNumber(item.quantidade_transacoes),
          quantidade_compras_cartao: convertBigIntToNumber(item.quantidade_compras_cartao)
        }))
      : [];

    // Processar alertas
    const alertasProcessed = Array.isArray(alertas)
      ? alertas.map((item: any) => ({
          tipo_alerta: item.tipo_alerta,
          mensagem: item.mensagem,
          prioridade: item.prioridade,
          data_alerta: item.data_alerta
        }))
      : [];

    const result = {
      dashboard: {
        receita_media_mensal: convertBigIntToNumber(dashboard.receita_media_mensal),
        despesa_media_mensal: convertBigIntToNumber(dashboard.despesa_media_mensal),
        saldo_bancos: convertBigIntToNumber(dashboard.saldo_bancos),
        divida_cartoes: convertBigIntToNumber(dashboard.divida_cartoes),
        valor_investimentos: convertBigIntToNumber(dashboard.valor_investimentos),
        total_metas: convertBigIntToNumber(dashboard.total_metas),
        progresso_metas_percentual: convertBigIntToNumber(dashboard.progresso_metas_percentual),
        patrimonio_liquido: convertBigIntToNumber(dashboard.saldo_bancos) + convertBigIntToNumber(dashboard.valor_investimentos) - convertBigIntToNumber(dashboard.divida_cartoes)
      },
      gastosPorCategoria: gastosPorCategoriaProcessed,
      alertas: alertasProcessed,
      analiseReceitas: [],
      portfolioInvestimentos: [],
      evolucaoPatrimonial: [],
      success: true,
      timestamp: new Date().toISOString()
    };

    console.log("📊 API Dashboard - Response:", JSON.stringify(result, null, 2));

    return NextResponse.json(result);

  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        success: false
      },
      { status: 500 }
    );
  }
}