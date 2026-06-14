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


export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    const where: {
      userId: string;
      OR?: Array<
        | { fromAccountId: string }
        | { toAccountId: string }
      >;
    } = { userId: user.userId };

    if (accountId) {
      where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }

    const transfers = await prisma.transfer.findMany({
      where,
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const serializedTransfers = transfers.map((transfer) => ({
      ...transfer,
      amount: transfer.amount.toNumber(),
    }));

    return NextResponse.json(serializedTransfers);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);
    return NextResponse.json(
      { error: "Erro ao buscar transferências" },
      { status: 500 }
    );
  }
}


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

    
    if (fromAccount.currentBalance.toNumber() < data.amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 400 }
      );
    }

    
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

      
      await tx.bankAccount.update({
        where: { id: data.fromAccountId },
        data: {
          currentBalance: { decrement: data.amount },
        },
      });

      await tx.bankAccount.update({
        where: { id: data.toAccountId },
        data: {
          currentBalance: { increment: data.amount },
        },
      });

      return newTransfer;
    });

    
    const serializedTransfer = {
      ...transfer,
      amount: transfer.amount.toNumber(),
      fromAccount: {
        ...transfer.fromAccount,
        initialBalance: transfer.fromAccount.initialBalance.toNumber(),
        currentBalance: transfer.fromAccount.currentBalance.toNumber(),
      },
      toAccount: {
        ...transfer.toAccount,
        initialBalance: transfer.toAccount.initialBalance.toNumber(),
        currentBalance: transfer.toAccount.currentBalance.toNumber(),
      },
    };

    return NextResponse.json(serializedTransfer, { status: 201 });
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
