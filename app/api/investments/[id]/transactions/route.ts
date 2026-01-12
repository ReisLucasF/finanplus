import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const transactionSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
  date: z.string().transform((val) => new Date(val)),
  notes: z.string().nullable().optional(),
});

// POST - Registrar nova transação (compra ou venda)
export async function POST(
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
    console.log("Body recebido:", body);
    const validatedData = transactionSchema.parse(body);
    console.log("Dados validados:", validatedData);

    // Verificar se investimento existe e pertence ao usuário
    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    // Calcular amount (quantidade × preço)
    const amount = validatedData.quantity * validatedData.price;

    // Criar transação
    const transaction = await prisma.investmentTransaction.create({
      data: {
        userId: user.userId,
        investmentId: id,
        type: validatedData.type,
        amount,
        quantity: validatedData.quantity,
        price: validatedData.price,
        date: validatedData.date,
        notes: validatedData.notes,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Erro completo:", error);
    if (error instanceof z.ZodError) {
      console.error("Erro de validação:", error.errors);
      return NextResponse.json(
        {
          error: "Erro de validação",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    console.error("Erro ao criar transação:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar transação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// GET - Listar transações do investimento
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

    // Verificar se investimento pertence ao usuário
    const investment = await prisma.investment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 }
      );
    }

    const transactions = await prisma.investmentTransaction.findMany({
      where: { investmentId: id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transações" },
      { status: 500 }
    );
  }
}
