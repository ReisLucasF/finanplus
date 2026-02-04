import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("dataInicio") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dataFim = searchParams.get("dataFim") || new Date().toISOString().split('T')[0];

    console.log("📅 API Relatório Período - User:", user.userId, "Período:", dataInicio, "até", dataFim);

    // Query direta para relatório por período
    const relatorioPeriodo = await prisma.$queryRaw`
      SELECT 
        'RESUMO_PERIODO' as tipo,
        ${dataInicio} as data_inicio,
        ${dataFim} as data_fim,
        
        -- Totais do período
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_receitas,
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_despesas,
        COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END), 0) as saldo_periodo,
        
        -- Quantidade de transações
        COUNT(CASE WHEN t.type = 'INCOME' THEN 1 END) as qtd_receitas,
        COUNT(CASE WHEN t.type = 'EXPENSE' THEN 1 END) as qtd_despesas,
        
        -- Valores médios
        AVG(CASE WHEN t.type = 'INCOME' THEN t.amount END) as media_receitas,
        AVG(CASE WHEN t.type = 'EXPENSE' THEN t.amount END) as media_despesas
        
      FROM Transaction t
      WHERE t.userId = ${user.userId}
        AND t.status IN ('COMPLETED', 'PENDING')
        AND t.date BETWEEN ${dataInicio} AND ${dataFim}
    `;

    // Converter BigInt para Number para evitar erro de serialização
    const convertBigIntToNumber = (value: any): number => {
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return Number(value) || 0;
    };

    const relatorio = Array.isArray(relatorioPeriodo) ? relatorioPeriodo[0] : {};
    const relatorioProcessed = {
      tipo: relatorio.tipo,
      data_inicio: relatorio.data_inicio,
      data_fim: relatorio.data_fim,
      total_receitas: convertBigIntToNumber(relatorio.total_receitas),
      total_despesas: convertBigIntToNumber(relatorio.total_despesas),
      saldo_periodo: convertBigIntToNumber(relatorio.saldo_periodo),
      qtd_receitas: convertBigIntToNumber(relatorio.qtd_receitas),
      qtd_despesas: convertBigIntToNumber(relatorio.qtd_despesas),
      media_receitas: convertBigIntToNumber(relatorio.media_receitas),
      media_despesas: convertBigIntToNumber(relatorio.media_despesas)
    };

    return NextResponse.json({
      relatorioPeriodo: relatorioProcessed,
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erro ao buscar relatório por período:", error);
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