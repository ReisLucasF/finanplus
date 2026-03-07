import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const purchaseSchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().transform((val) => new Date(val)),
});


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const body = await request.json();
    const data = purchaseSchema.parse(body);

    
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 },
      );
    }

    
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        type: "EXPENSE",
        OR: [{ userId: user.userId }, { userId: null }],
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 },
      );
    }

    
    const purchases = await prisma.creditCardPurchase.findMany({
      where: { creditCardId: cardId },
    });

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0,
    );
    const currentDebt = card.initialDebt.toNumber() + totalPurchases;

    
    if (currentDebt + data.amount > card.cardLimit.toNumber()) {
      return NextResponse.json(
        { error: "Limite do cartão insuficiente" },
        { status: 400 },
      );
    }

    
    const purchase = await prisma.creditCardPurchase.create({
      data: {
        userId: user.userId,
        creditCardId: cardId,
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        date: data.date,
      },
      include: {
        category: true,
      },
    });

    
    const serializedPurchase = {
      ...purchase,
      amount: purchase.amount.toNumber(),
    };

    return NextResponse.json(serializedPurchase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Erro ao registrar compra:", error);
    return NextResponse.json(
      { error: "Erro ao registrar compra" },
      { status: 500 },
    );
  }
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 404 },
      );
    }

    
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const purchases = await prisma.creditCardPurchase.findMany({
      where: {
        creditCardId: cardId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        category: true,
      },
      orderBy: { date: "desc" },
    });

    
    const serializedPurchases = purchases.map((p) => ({
      ...p,
      amount: p.amount.toNumber(),
    }));

    return NextResponse.json(serializedPurchases);
  } catch (error) {
    console.error("Erro ao buscar compras:", error);
    return NextResponse.json(
      { error: "Erro ao buscar compras" },
      { status: 500 },
    );
  }
}
