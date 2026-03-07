import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUAL"]).optional(),
  startDate: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
  dueDay: z.number().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
});


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

    const recurring = await prisma.recurringTransaction.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    if (!recurring) {
      return NextResponse.json(
        { error: "Recorrência não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(recurring);
  } catch (error) {
    console.error("Erro ao buscar recorrência:", error);
    return NextResponse.json(
      { error: "Erro ao buscar recorrência" },
      { status: 500 }
    );
  }
}


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
    const data = updateSchema.parse(body);

    const recurring = await prisma.recurringTransaction.updateMany({
      where: {
        id,
        userId: user.userId,
      },
      data: {
        ...data,
        endDate: data.endDate === null ? null : data.endDate,
      },
    });

    if (recurring.count === 0) {
      return NextResponse.json(
        { error: "Recorrência não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erro ao atualizar recorrência:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar recorrência" },
      { status: 500 }
    );
  }
}


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

    const recurring = await prisma.recurringTransaction.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (recurring.count === 0) {
      return NextResponse.json(
        { error: "Recorrência não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir recorrência:", error);
    return NextResponse.json(
      { error: "Erro ao excluir recorrência" },
      { status: 500 }
    );
  }
}
