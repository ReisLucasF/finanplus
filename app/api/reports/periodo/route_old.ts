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
    const anoInicio = parseInt(
      searchParams.get("anoInicio") || new Date().getFullYear().toString(),
    );
    const anoFim = parseInt(searchParams.get("anoFim") || anoInicio.toString());

    // Executar procedure de relatório por período
    const resultado = await prisma.$queryRaw`
      CALL sp_Relatorio_Periodo_Usuario(${user.userId}, ${anoInicio}, ${anoFim})
    `;

    // Obter gastos por categoria do período
    const gastosPorCategoria = await prisma.$queryRaw`
      CALL sp_Gastos_Por_Categoria(${user.userId})
    `;

    // Obter evolução mensal do período
    const evolucaoMensal = await prisma.$queryRaw`
      CALL sp_Evolucao_Patrimonial(${user.userId}, 12)
    `;

    return NextResponse.json({
      relatorio:
        Array.isArray(resultado[0]) && resultado[0].length > 0
          ? resultado[0][0]
          : {},
      gastosPorCategoria: Array.isArray(gastosPorCategoria[0])
        ? gastosPorCategoria[0]
        : [],
      evolucaoMensal: Array.isArray(evolucaoMensal[0]) ? evolucaoMensal[0] : [],
    });
  } catch (error) {
    console.error("Erro ao executar relatório por período:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
