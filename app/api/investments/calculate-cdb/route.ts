import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";


function calcularDiasUteis(dataInicio: Date, dataFim: Date): number {
  let dias = 0;
  const atual = new Date(dataInicio);

  while (atual <= dataFim) {
    const diaSemana = atual.getDay();
    
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    atual.setDate(atual.getDate() + 1);
  }

  return dias;
}


export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const valorInicial = parseFloat(searchParams.get("valor") || "0");
    const cdiPercentage = parseFloat(searchParams.get("cdi") || "0");
    const dataInvestimento = searchParams.get("data");

    if (!valorInicial || !cdiPercentage || !dataInvestimento) {
      return NextResponse.json(
        {
          error: "Parâmetros obrigatórios: valor, cdi, data",
        },
        { status: 400 }
      );
    }

    
    
    const taxaCDIAnual = 13.75;

    
    const taxaInvestimentoAnual = (taxaCDIAnual * cdiPercentage) / 100;

    
    const dataInicio = new Date(dataInvestimento);
    const hoje = new Date();
    const diasUteis = calcularDiasUteis(dataInicio, hoje);

    
    const taxaDiaria = Math.pow(1 + taxaInvestimentoAnual / 100, 1 / 252) - 1;

    
    const valorAtual = valorInicial * Math.pow(1 + taxaDiaria, diasUteis);
    const rendimento = valorAtual - valorInicial;
    const rendimentoPercentual =
      ((valorAtual - valorInicial) / valorInicial) * 100;

    return NextResponse.json({
      valorInicial,
      valorAtual,
      rendimento,
      rendimentoPercentual,
      diasUteis,
      diasCorridos: Math.floor(
        (hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
      ),
      taxaCDIAnual,
      taxaInvestimentoAnual,
      cdiPercentage,
    });
  } catch (error) {
    console.error("Erro ao calcular CDB:", error);
    return NextResponse.json(
      { error: "Erro ao calcular CDB" },
      { status: 500 }
    );
  }
}
