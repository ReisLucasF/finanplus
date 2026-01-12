import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  ticker: z.string().nullable().optional(),
  cdiPercentage: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? parseFloat(val) : null)),
  institution: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  color: z.string().optional(),
});

// GET - Buscar investimento específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(investment);
  } catch (error) {
    console.error("Erro ao buscar investimento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar investimento" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar investimento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Verificar se investimento existe e pertence ao usuário
    const existing = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    const investment = await prisma.investment.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(investment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao atualizar investimento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar investimento" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar investimento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se investimento existe e pertence ao usuário
    const existing = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    await prisma.investment.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Investimento deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar investimento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar investimento" },
      { status: 500 }
    );
  }
}
