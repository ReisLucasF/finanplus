import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const transactionSchema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = transactionSchema.parse(body);

    // Verificar se a transação pertence ao usuário
    const existingTransaction = await prisma.transaction.findUnique({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        account: true,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verificar se a nova conta existe (se mudou)
    if (data.accountId !== existingTransaction.accountId) {
      const newAccount = await prisma.bankAccount.findFirst({
        where: {
          id: data.accountId,
          userId: user.userId,
        },
      });

      if (!newAccount) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }
    }

    // Atualizar transação e saldos em uma transação atômica
    const transaction = await prisma.$transaction(async (tx) => {
      // Reverter o efeito da transação antiga
      const oldAmount = existingTransaction.amount.toNumber();
      const oldType = existingTransaction.type;
      const oldAccountId = existingTransaction.accountId;

      if (oldType === "INCOME") {
        await tx.bankAccount.update({
          where: { id: oldAccountId },
          data: { currentBalance: { decrement: oldAmount } },
        });
      } else {
        await tx.bankAccount.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldAmount } },
        });
      }

      // Aplicar o efeito da nova transação
      if (data.type === "INCOME") {
        await tx.bankAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: data.amount } },
        });
      } else {
        await tx.bankAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amount } },
        });
      }

      // Atualizar a transação
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          description: data.description,
          amount: data.amount,
          date: new Date(data.date),
          status: data.status,
        },
        include: {
          account: true,
          category: true,
        },
      });

      return updatedTransaction;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se a transação pertence ao usuário
    const existingTransaction = await prisma.transaction.findUnique({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Deletar transação e reverter o efeito no saldo
    await prisma.$transaction(async (tx) => {
      // Reverter o efeito da transação no saldo
      const amount = existingTransaction.amount.toNumber();
      const type = existingTransaction.type;
      const accountId = existingTransaction.accountId;

      if (type === "INCOME") {
        // Se era receita, diminuir o saldo
        await tx.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amount } },
        });
      } else {
        // Se era despesa, aumentar o saldo
        await tx.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        });
      }

      // Deletar a transação
      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
