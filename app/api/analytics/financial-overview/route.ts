import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchFinancialAnalytics } from "@/lib/financial-analytics";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const data = await fetchFinancialAnalytics(user.userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar análise financeira:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados financeiros" },
      { status: 500 },
    );
  }
}
