import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    
    const purchases = await prisma.creditCardPurchase.findMany({
      where: {
        userId: user.userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        category: true,
      },
    });

    
    const categoryMap = new Map<
      string,
      { name: string; value: number; color?: string }
    >();

    purchases.forEach((purchase) => {
      const categoryId = purchase.category.id;
      const existing = categoryMap.get(categoryId);

      if (existing) {
        existing.value += purchase.amount.toNumber();
      } else {
        categoryMap.set(categoryId, {
          name: purchase.category.name,
          value: purchase.amount.toNumber(),
        });
      }
    });

    
    const data = Array.from(categoryMap.values()).sort(
      (a, b) => b.value - a.value
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar gastos por categoria:", error);
    return NextResponse.json(
      { error: "Erro ao buscar gastos por categoria" },
      { status: 500 }
    );
  }
}
