import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().default(0),
  targetDate: z.string().transform((val) => new Date(val)),
  accountId: z.string().nullable().optional(),
  includeInvestments: z.boolean().default(false),
});

// GET - Listar metas
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const goals = await prisma.goal.findMany({
      where: { userId: user.userId },
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Erro ao buscar metas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar metas" },
      { status: 500 }
    );
  }
}

// POST - Criar meta
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    

    try {
      const data = goalSchema.parse(body);
    } catch (validationError) {
      console.error("❌ Erro na validação de goals:", validationError);
      throw validationError;
    }

    const data = goalSchema.parse(body);

    // Se accountId foi fornecido, verificar se existe e pertence ao usuário
    if (data.accountId) {
      const account = await prisma.bankAccount.findFirst({
        where: {
          id: data.accountId,
          userId: user.userId,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Conta não encontrada" },
          { status: 404 }
        );
      }
    }

    const goal = await prisma.goal.create({
      data: {
        ...data,
        userId: user.userId,
      },
      include: {
        account: true,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar meta:", error);
    return NextResponse.json({ error: "Erro ao criar meta" }, { status: 500 });
  }
}
