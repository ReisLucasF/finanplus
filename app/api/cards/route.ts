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

// GET - Listar cartões
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const cards = await prisma.creditCard.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("Erro ao buscar cartões:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cartões" },
      { status: 500 }
    );
  }
}

// POST - Criar cartão
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    console.log("📥 Body recebido no POST:", JSON.stringify(body, null, 2));
    console.log("📊 Tipos:", {
      name: typeof body.name,
      cardLimit: typeof body.cardLimit,
      dueDay: typeof body.dueDay,
      initialDebt: typeof body.initialDebt,
      color: typeof body.color,
    });

    const data = cardSchema.parse(body);
    console.log("✅ Dados após validação:", JSON.stringify(data, null, 2));

    const card = await prisma.creditCard.create({
      data: {
        ...data,
        userId: user.userId,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar cartão:", error);
    return NextResponse.json(
      { error: "Erro ao criar cartão" },
      { status: 500 }
    );
  }
}
