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

function serializeTransaction(tx: {
  id: string;
  userId: string;
  investmentId: string;
  type: string;
  amount: { toNumber: () => number };
  quantity: { toNumber: () => number };
  price: { toNumber: () => number };
  date: Date;
  notes: string | null;
  createdAt: Date;
}) {
  return {
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
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id, transactionId } = await params;
    const body = await request.json();
    const validated = transactionSchema.parse(body);

    const investment = await prisma.investment.findFirst({
      where: { id, userId: user.userId },
    });
    if (!investment) {
      return NextResponse.json(
        { error: "Investimento não encontrado" },
        { status: 404 },
      );
    }

    const existing = await prisma.investmentTransaction.findFirst({
      where: { id: transactionId, investmentId: id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 },
      );
    }

    const allTransactions = await prisma.investmentTransaction.findMany({
      where: { investmentId: id, userId: user.userId },
    });

    const check = validateTransactionQuantity(allTransactions, {
      id: transactionId,
      type: validated.type,
      quantity: validated.quantity,
    });

    if (!check.ok) {
      return NextResponse.json(
        {
          error: `Quantidade insuficiente. Disponível: ${check.available.toFixed(6)}`,
        },
        { status: 400 },
      );
    }

    const amount = validated.quantity * validated.price;
    const updated = await prisma.investmentTransaction.update({
      where: { id: transactionId },
      data: {
        type: validated.type,
        quantity: validated.quantity,
        price: validated.price,
        amount,
        date: validated.date,
        notes: validated.notes ?? null,
      },
    });

    return NextResponse.json(serializeTransaction(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Erro de validação", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar transação" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id, transactionId } = await params;

    const existing = await prisma.investmentTransaction.findFirst({
      where: { id: transactionId, investmentId: id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 },
      );
    }

    await prisma.investmentTransaction.delete({ where: { id: transactionId } });
    return NextResponse.json({ message: "Transação excluída" });
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return NextResponse.json(
      { error: "Erro ao excluir transação" },
      { status: 500 },
    );
  }
}
