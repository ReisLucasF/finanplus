import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().transform((val) => new Date(val)),
});

// GET - Listar transferências
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const transfers = await prisma.transfer.findMany({
      where: { userId: user.userId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transferências" },
      { status: 500 }
    );
  }
}

// POST - Criar transferência
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = transferSchema.parse(body);

    if (data.fromAccountId === data.toAccountId) {
      return NextResponse.json(
        { error: "Não é possível transferir para a mesma conta" },
        { status: 400 }
      );
    }

    // Verificar se ambas as contas existem e pertencem ao usuário
    const [fromAccount, toAccount] = await Promise.all([
      prisma.bankAccount.findFirst({
        where: { id: data.fromAccountId, userId: user.userId },
      }),
      prisma.bankAccount.findFirst({
        where: { id: data.toAccountId, userId: user.userId },
      }),
    ]);

    if (!fromAccount || !toAccount) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar saldo
    if (fromAccount.currentBalance < data.amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    // Criar transferência e atualizar saldos
    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.transfer.create({
        data: {
          ...data,
          userId: user.userId,
        },
        include: {
          fromAccount: true,
          toAccount: true,
        },
      });

      // Atualizar saldos
      await tx.bankAccount.update({
        where: { id: data.fromAccountId },
        data: { currentBalance: fromAccount.currentBalance - data.amount },
      });

      await tx.bankAccount.update({
        where: { id: data.toAccountId },
        data: { currentBalance: toAccount.currentBalance + data.amount },
      });

      return newTransfer;
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar transferência:", error);
    return NextResponse.json(
      { error: "Erro ao criar transferência" },
      { status: 500 }
    );
  }
}
