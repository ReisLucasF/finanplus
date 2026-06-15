import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validateTransactionQuantity } from "@/lib/investment-summary";
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
    const validatedData = transactionSchema.parse(body);

    
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

    const allTransactions = await prisma.investmentTransaction.findMany({
      where: { investmentId: id, userId: user.userId },
    });

    const check = validateTransactionQuantity(allTransactions, {
      type: validatedData.type,
      quantity: validatedData.quantity,
    });

    if (!check.ok) {
      return NextResponse.json(
        {
          error: `Quantidade insuficiente para venda. Disponível: ${check.available.toFixed(6)}`,
        },
        { status: 400 },
      );
    }

    
    const amount = validatedData.quantity * validatedData.price;

    
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
      console.error("Erro de validação:", error.issues);
      return NextResponse.json(
        {
          error: "Erro de validação",
          details: error.issues,
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

    return NextResponse.json(
      transactions.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        investmentId: tx.investmentId,
        type: tx.type,
        amount: tx.amount.toNumber(),
        quantity: tx.quantity.toNumber(),
        price: tx.price.toNumber(),
        date: tx.date.toISOString(),
        notes: tx.notes,
        createdAt: tx.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transações" },
      { status: 500 }
    );
  }
}
