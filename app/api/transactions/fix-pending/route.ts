import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.userId,
        status: "PENDING",
      },
      include: {
        account: true,
      },
    });

    if (pendingTransactions.length === 0) {
      return NextResponse.json({
        message: "Nenhuma transação pendente encontrada",
        fixed: 0,
      });
    }

    const results = [];

    
    for (const transaction of pendingTransactions) {
      try {
        await prisma.$transaction(async (tx) => {
          
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "COMPLETED" },
          });

          
          const amount = transaction.amount.toNumber();
          if (transaction.type === "INCOME") {
            await tx.bankAccount.update({
              where: { id: transaction.accountId },
              data: { currentBalance: { increment: amount } },
            });
          } else {
            await tx.bankAccount.update({
              where: { id: transaction.accountId },
              data: { currentBalance: { decrement: amount } },
            });
          }
        });

        results.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount.toNumber(),
          type: transaction.type,
          accountId: transaction.accountId,
          status: "success",
        });
      } catch (error) {
        console.error(`Erro ao corrigir transação ${transaction.id}:`, error);
        results.push({
          id: transaction.id,
          description: transaction.description,
          status: "error",
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return NextResponse.json({
      message: `${results.filter((r) => r.status === "success").length} transações corrigidas`,
      total: pendingTransactions.length,
      results,
    });
  } catch (error) {
    console.error("Erro ao corrigir transações:", error);
    return NextResponse.json(
      { error: "Erro ao corrigir transações" },
      { status: 500 },
    );
  }
}
