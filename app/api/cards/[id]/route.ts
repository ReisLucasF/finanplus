import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const cardSchema = z.object({
  name: z.string().min(1),
  cardLimit: z.number().positive(),
  dueDay: z.number().min(1).max(31),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

// GET - Buscar cartão específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const card = await prisma.creditCard.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error("Erro ao buscar cartão:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cartão" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar cartão
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    console.log("Body recebido no PUT:", JSON.stringify(body, null, 2));
    console.log("Tipos no body:", {
      name: typeof body.name,
      cardLimit: typeof body.cardLimit,
      dueDay: typeof body.dueDay,
      color: typeof body.color,
    });

    try {
      const data = cardSchema.parse(body);
      console.log("✅ Validação passou!");
    } catch (validationError) {
      console.error("❌ Erro na validação:", validationError);
      throw validationError;
    }

    const data = cardSchema.parse(body);

    const card = await prisma.creditCard.updateMany({
      where: {
        id,
        userId: user.userId,
      },
      data,
    });

    if (card.count === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Erro de validação Zod:", error.errors);
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Erro NÃO-Zod ao atualizar cartão:", error);
    console.error("Tipo do erro:", typeof error);
    console.error(
      "Nome do erro:",
      error instanceof Error ? error.constructor.name : "Desconhecido"
    );
    return NextResponse.json(
      { error: "Erro ao atualizar cartão" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir cartão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const card = await prisma.creditCard.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (card.count === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir cartão:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cartão" },
      { status: 500 }
    );
  }
}
