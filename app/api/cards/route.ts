import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const cardSchema = z.object({
  name: z.string().min(1),
  cardLimit: z.number().positive(),
  dueDay: z.number().min(1).max(31),
  initialDebt: z.number().default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const [cards, purchaseSums, paymentSums] = await Promise.all([
      prisma.creditCard.findMany({
        where: { userId: user.userId },
        select: {
          id: true,
          name: true,
          cardLimit: true,
          dueDay: true,
          initialDebt: true,
          color: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.creditCardPurchase.groupBy({
        by: ["creditCardId"],
        where: { userId: user.userId },
        _sum: { amount: true },
      }),
      prisma.creditCardPayment.groupBy({
        by: ["creditCardId"],
        where: { userId: user.userId },
        _sum: { amount: true },
      }),
    ]);

    const purchaseMap = new Map(
      purchaseSums.map((p) => [p.creditCardId, p._sum.amount?.toNumber() ?? 0]),
    );
    const paymentMap = new Map(
      paymentSums.map((p) => [p.creditCardId, p._sum.amount?.toNumber() ?? 0]),
    );

    const serializedCards = cards.map((card) => {
      const purchases = purchaseMap.get(card.id) ?? 0;
      const payments = paymentMap.get(card.id) ?? 0;
      const currentDebt =
        card.initialDebt.toNumber() + purchases - payments;

      return {
        id: card.id,
        name: card.name,
        cardLimit: card.cardLimit.toNumber(),
        dueDay: card.dueDay,
        initialDebt: card.initialDebt.toNumber(),
        color: card.color,
        currentDebt,
      };
    });

    return NextResponse.json(serializedCards);
  } catch (error) {
    console.error("Erro ao buscar cartões:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cartões" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = cardSchema.parse(body);

    const card = await prisma.creditCard.create({
      data: {
        ...data,
        userId: user.userId,
      },
    });

    return NextResponse.json(
      {
        id: card.id,
        name: card.name,
        cardLimit: card.cardLimit.toNumber(),
        dueDay: card.dueDay,
        initialDebt: card.initialDebt.toNumber(),
        color: card.color,
        currentDebt: card.initialDebt.toNumber(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar cartão:", error);
    return NextResponse.json(
      { error: "Erro ao criar cartão" },
      { status: 500 },
    );
  }
}
