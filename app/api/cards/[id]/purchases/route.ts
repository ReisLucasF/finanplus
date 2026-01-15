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

// POST - Registrar compra no cartão
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const body = await request.json();
    const data = purchaseSchema.parse(body);

    // Verificar se o cartão pertence ao usuário
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se a categoria pertence ao usuário ou é do sistema
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
        { status: 404 }
      );
    }

    // Calcular dívida atual (initialDebt + compras)
    const purchases = await prisma.creditCardPurchase.findMany({
      where: { creditCardId: cardId },
    });

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0
    );
    const currentDebt = card.initialDebt.toNumber() + totalPurchases;

    // Verificar se a compra ultrapassa o limite
    if (currentDebt + data.amount > card.cardLimit.toNumber()) {
      return NextResponse.json(
        { error: "Limite do cartão insuficiente" },
        { status: 400 }
      );
    }

    // Criar compra
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

    // Serializar Decimal
    const serializedPurchase = {
      ...purchase,
      amount: purchase.amount.toNumber(),
    };

    return NextResponse.json(serializedPurchase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erro ao registrar compra:", error);
    return NextResponse.json(
      { error: "Erro ao registrar compra" },
      { status: 500 }
    );
  }
}

// GET - Listar compras do cartão
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

    // Verificar se o cartão pertence ao usuário
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    const purchases = await prisma.creditCardPurchase.findMany({
      where: { creditCardId: cardId },
      include: {
        category: true,
      },
      orderBy: { date: "desc" },
    });

    // Serializar Decimals
    const serializedPurchases = purchases.map((p) => ({
      ...p,
      amount: p.amount.toNumber(),
    }));

    return NextResponse.json(serializedPurchases);
  } catch (error) {
    console.error("Erro ao buscar compras:", error);
    return NextResponse.json(
      { error: "Erro ao buscar compras" },
      { status: 500 }
    );
  }
}
