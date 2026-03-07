import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const investmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum([
    "STOCKS",
    "CDB",
    "FUNDS",
    "TREASURY",
    "CRYPTO",
    "REAL_ESTATE",
    "OTHER",
  ]),
  ticker: z.string().nullable().optional(),
  cdiPercentage: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? parseFloat(val) : null)),
  institution: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  color: z.string().default("#3B82F6"),
});


export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { userId: user.userId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(investments);
  } catch (error) {
    console.error("Erro ao buscar investimentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar investimentos" },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = investmentSchema.parse(body);

    const investment = await prisma.investment.create({
      data: {
        userId: user.userId,
        name: validatedData.name,
        type: validatedData.type,
        ticker: validatedData.ticker,
        cdiPercentage: validatedData.cdiPercentage,
        institution: validatedData.institution,
        notes: validatedData.notes,
        color: validatedData.color,
      },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar investimento:", error);
    return NextResponse.json(
      { error: "Erro ao criar investimento" },
      { status: 500 }
    );
  }
}
