import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const settingsSchema = z.object({
  displayName: z.string().min(1).optional(),
  theme: z.enum(["LIGHT", "DARK"]).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  monthlyLimit: z.number().positive().nullable().optional(),
  notifyTransactions: z.boolean().optional(),
  notifyGoals: z.boolean().optional(),
  notifyMonthlyLimit: z.boolean().optional(),
});

// GET - Buscar configurações do usuário
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        displayName: true,
        email: true,
        name: true,
        theme: true,
        country: true,
        currency: true,
        monthlyLimit: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...userData,
      monthlyLimit: userData.monthlyLimit
        ? Number(userData.monthlyLimit)
        : null,
    });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações do usuário
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = settingsSchema.parse(body);

    await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...data,
        monthlyLimit:
          data.monthlyLimit !== undefined ? data.monthlyLimit : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
