import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const recurringSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUAL"]),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
  dueDay: z.number().min(1).max(31),
});

// GET - Listar transações recorrentes
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const recurrings = await prisma.recurringTransaction.findMany({
      where: { userId: user.userId },
      include: {
        account: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recurrings);
  } catch (error) {
    console.error("Erro ao buscar recorrências:", error);
    return NextResponse.json(
      { error: "Erro ao buscar recorrências" },
      { status: 500 }
    );
  }
}

// POST - Criar transação recorrente
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    try {
      const data = recurringSchema.parse(body);
    } catch (validationError) {
      console.error("❌ Erro na validação:", validationError);
      throw validationError;
    }

    const data = recurringSchema.parse(body);

    // Verificar se a conta pertence ao usuário
    const account = await prisma.bankAccount.findFirst({
      where: { id: data.accountId, userId: user.userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Criar recorrência
    const recurring = await prisma.recurringTransaction.create({
      data: {
        ...data,
        userId: user.userId,
        endDate: data.endDate || undefined,
      },
      include: {
        account: true,
        category: true,
      },
    });

    return NextResponse.json(recurring, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erro ao criar recorrência:", error);
    return NextResponse.json(
      { error: "Erro ao criar recorrência" },
      { status: 500 }
    );
  }
}
