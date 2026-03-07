import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";


export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    
    const recurrings = await prisma.recurringTransaction.findMany({
      where: {
        userId: user.userId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    const createdTransactions = [];

    for (const recurring of recurrings) {
      
      const lastProcessed = recurring.lastProcessedDate;
      let shouldProcess = false;

      if (!lastProcessed) {
        
        shouldProcess = true;
      } else {
        const lastProcessedMonth = lastProcessed.getMonth();
        const lastProcessedYear = lastProcessed.getFullYear();

        
        switch (recurring.frequency) {
          case "MONTHLY":
            
            if (
              currentDay >= recurring.dueDay &&
              (currentMonth !== lastProcessedMonth ||
                currentYear !== lastProcessedYear)
            ) {
              shouldProcess = true;
            }
            break;

          case "WEEKLY":
            
            const daysSinceLastProcessed = Math.floor(
              (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysSinceLastProcessed >= 7) {
              shouldProcess = true;
            }
            break;

          case "BIWEEKLY":
            
            const daysSinceLast = Math.floor(
              (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysSinceLast >= 15) {
              shouldProcess = true;
            }
            break;

          case "ANNUAL":
            
            if (
              currentMonth === lastProcessedMonth &&
              currentDay >= recurring.dueDay &&
              currentYear !== lastProcessedYear
            ) {
              shouldProcess = true;
            }
            break;
        }
      }

      if (shouldProcess) {
        
        const transactionDate = new Date(
          currentYear,
          currentMonth,
          Math.min(recurring.dueDay, 31),
        );

        
        const transaction = await prisma.$transaction(async (tx) => {
          const newTransaction = await tx.transaction.create({
            data: {
              userId: user.userId,
              accountId: recurring.accountId,
              categoryId: recurring.categoryId,
              type: recurring.type,
              description: `[Recorrente] ${recurring.description}`,
              amount: recurring.amount,
              date: transactionDate,
              status: "COMPLETED",
              isRecurring: true,
              recurringId: recurring.id,
            },
            include: {
              category: true,
              account: true,
            },
          });

          
          const amount = recurring.amount.toNumber();
          if (recurring.type === "INCOME") {
            await tx.bankAccount.update({
              where: { id: recurring.accountId },
              data: { currentBalance: { increment: amount } },
            });
          } else {
            await tx.bankAccount.update({
              where: { id: recurring.accountId },
              data: { currentBalance: { decrement: amount } },
            });
          }

          return newTransaction;
        });

        
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: { lastProcessedDate: now },
        });

        createdTransactions.push(transaction);
      }
    }

    return NextResponse.json({
      processed: recurrings.length,
      created: createdTransactions.length,
      transactions: createdTransactions,
    });
  } catch (error) {
    console.error("Erro ao processar recorrências:", error);
    return NextResponse.json(
      { error: "Erro ao processar recorrências" },
      { status: 500 },
    );
  }
}
