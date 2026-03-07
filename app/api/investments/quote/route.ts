import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";


export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker é obrigatório" },
        { status: 400 }
      );
    }

    
    const response = await fetch(
      `https://brapi.dev/api/quote/${ticker}?token=demo`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar cotação" },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "Ticker não encontrado" },
        { status: 404 }
      );
    }

    const quote = data.results[0];

    return NextResponse.json({
      ticker: quote.symbol,
      name: quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      currency: quote.currency,
      lastUpdate: quote.regularMarketTime,
    });
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cotação" },
      { status: 500 }
    );
  }
}
