import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Converter BigInt para Number para evitar erro de serialização
    const convertBigIntToNumber = (value: any): number => {
      if (typeof value === "bigint") {
        return Number(value);
      }
      return Number(value) || 0;
    };

    // Processar array de dados convertendo BigInt
    const processArray = (arr: any[]) => {
      return arr.map((item: any) => {
        const processed: any = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === "bigint") {
            processed[key] = convertBigIntToNumber(value);
          } else {
            processed[key] = value;
          }
        }
        // Para gastos por categoria, calcular total combinado
        if (
          processed.total_transacoes !== undefined &&
          processed.total_cartao !== undefined
        ) {
          processed.total_3_meses =
            processed.total_transacoes + processed.total_cartao;
        }
        return processed;
      });
    };

    // Query para dados básicos do dashboard
    const dashboardBasico = await prisma.$queryRaw`
      SELECT 
        COALESCE((SELECT SUM(currentBalance) FROM BankAccount WHERE userId = ${user.userId}), 0) as saldo_bancos,
        COALESCE((SELECT SUM(initialDebt) FROM CreditCard WHERE userId = ${user.userId}), 0) as divida_cartoes,
        COALESCE((
          SELECT SUM(CASE WHEN it.type = 'BUY' THEN it.amount ELSE -it.amount END)
          FROM InvestmentTransaction it
          JOIN Investment i ON it.investmentId = i.id
          WHERE i.userId = ${user.userId}
        ), 0) as valor_investimentos,
        COALESCE((
          SELECT AVG(receita_mes) FROM (
              SELECT SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as receita_mes
              FROM Transaction t
              WHERE t.userId = ${user.userId}
                AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                AND t.status IN ('COMPLETED', 'PAID')
              GROUP BY DATE_FORMAT(t.date, '%Y-%m')
          ) AS ultimos_meses
        ), 0) as receita_media_mensal,
        COALESCE((
          SELECT AVG(despesa_mes) FROM (
              SELECT SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as despesa_mes
              FROM Transaction t
              WHERE t.userId = ${user.userId}
                AND t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                AND t.status IN ('COMPLETED', 'PAID')
              GROUP BY DATE_FORMAT(t.date, '%Y-%m')
          ) AS ultimos_meses
        ), 0) as despesa_media_mensal
    `;

    // Query para gastos por categoria
    const gastosPorCategoria = await prisma.$queryRaw`
      SELECT 
        c.name as categoria,
        COALESCE(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN t.amount END), 0) as total_transacoes,
        COALESCE(SUM(CASE WHEN cp.date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) THEN cp.amount END), 0) as total_cartao,
        COUNT(DISTINCT t.id) as qtd_transacoes,
        COUNT(DISTINCT cp.id) as qtd_compras_cartao
      FROM Category c
      LEFT JOIN Transaction t ON c.id = t.categoryId 
        AND t.type = 'EXPENSE' 
        AND t.status IN ('COMPLETED', 'PENDING')
        AND t.userId = ${user.userId}
      LEFT JOIN CreditCardPurchase cp ON c.id = cp.categoryId 
        AND cp.userId = ${user.userId}
      WHERE c.type = 'EXPENSE' 
        AND (c.userId = ${user.userId} OR c.userId IS NULL)
      GROUP BY c.id, c.name
      HAVING (total_transacoes + total_cartao) > 0
      ORDER BY (total_transacoes + total_cartao) DESC
      LIMIT 10
    `;

    const dashboard = Array.isArray(dashboardBasico) ? dashboardBasico[0] : {};

    // Calcular métricas avançadas
    const receita_media = convertBigIntToNumber(dashboard.receita_media_mensal);
    const despesa_media = convertBigIntToNumber(dashboard.despesa_media_mensal);
    const saldo_bancos = convertBigIntToNumber(dashboard.saldo_bancos);
    const patrimonio_liquido =
      saldo_bancos +
      convertBigIntToNumber(dashboard.valor_investimentos) -
      convertBigIntToNumber(dashboard.divida_cartoes);

    // Calcular taxa de poupança (se houver receita)
    const taxa_poupanca =
      receita_media > 0
        ? ((receita_media - despesa_media) / receita_media) * 100
        : 0;

    // Calcular runway (meses de reserva)
    const runway_meses = despesa_media > 0 ? saldo_bancos / despesa_media : 0;

    return NextResponse.json({
      relatorio: {
        resumo_historico: {
          receita_media_mensal: receita_media,
          despesa_media_mensal: despesa_media,
          saldo_liquido_historico: receita_media - despesa_media,
        },
        patrimonio_atual: {
          saldo_bancos: saldo_bancos,
          divida_cartoes: convertBigIntToNumber(dashboard.divida_cartoes),
          valor_investimentos: convertBigIntToNumber(
            dashboard.valor_investimentos,
          ),
          patrimonio_liquido: patrimonio_liquido,
        },
        gastos_por_categoria: processArray(
          Array.isArray(gastosPorCategoria) ? gastosPorCategoria : [],
        ),
        receitas_por_fonte: [],
        portfolio_investimentos: [],
        evolucao_patrimonial: [],
        // Métricas calculadas
        taxa_poupanca_historica: taxa_poupanca,
        runway_meses_reserva: runway_meses,
        status_reserva_emergencia:
          runway_meses >= 6
            ? "ADEQUADA"
            : runway_meses >= 3
              ? "MÍNIMA"
              : "CRÍTICA",
        resumo_executivo_pessoal: `Patrimônio de R$ ${patrimonio_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, taxa de poupança de ${taxa_poupanca.toFixed(1)}%, reserva para ${runway_meses.toFixed(1)} meses.`,
      },
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao buscar relatório completo:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      },
      { status: 500 },
    );
  }
}
