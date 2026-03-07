import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const payments = await prisma.creditCardPayment.findMany({
      where: {
        creditCardId: cardId,
        ...(Object.keys(dateFilter).length > 0 && { dueDate: dateFilter }),
      },
      include: {
        account: true,
      },
      orderBy: { dueDate: "desc" },
    });

    
    const serializedPayments = payments.map((p) => ({
      ...p,
      amount: p.amount.toNumber(),
      account: {
        ...p.account,
        initialBalance: p.account.initialBalance.toNumber(),
        currentBalance: p.account.currentBalance.toNumber(),
      },
    }));

    return NextResponse.json(serializedPayments);
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pagamentos" },
      { status: 500 }
    );
  }
}
