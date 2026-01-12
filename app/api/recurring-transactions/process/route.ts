import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST - Processar recorrências (criar transações pendentes)
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

    // Buscar recorrências ativas do usuário
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
      // Verificar se deve processar este mês
      const lastProcessed = recurring.lastProcessedDate;
      let shouldProcess = false;

      if (!lastProcessed) {
        // Nunca foi processada
        shouldProcess = true;
      } else {
        const lastProcessedMonth = lastProcessed.getMonth();
        const lastProcessedYear = lastProcessed.getFullYear();

        // Processar baseado na frequência
        switch (recurring.frequency) {
          case "MONTHLY":
            // Se já passou o dia de vencimento e não foi processado este mês
            if (
              currentDay >= recurring.dueDay &&
              (currentMonth !== lastProcessedMonth ||
                currentYear !== lastProcessedYear)
            ) {
              shouldProcess = true;
            }
            break;

          case "WEEKLY":
            // Uma vez por semana
            const daysSinceLastProcessed = Math.floor(
              (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastProcessed >= 7) {
              shouldProcess = true;
            }
            break;

          case "BIWEEKLY":
            // A cada 15 dias
            const daysSinceLast = Math.floor(
              (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLast >= 15) {
              shouldProcess = true;
            }
            break;

          case "ANNUAL":
            // Uma vez por ano
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
        // Criar a transação
        const transactionDate = new Date(
          currentYear,
          currentMonth,
          Math.min(recurring.dueDay, 31)
        );

        const transaction = await prisma.transaction.create({
          data: {
            userId: user.userId,
            accountId: recurring.accountId,
            categoryId: recurring.categoryId,
            type: recurring.type,
            description: `[Recorrente] ${recurring.description}`,
            amount: recurring.amount,
            date: transactionDate,
            status: "PENDING",
            isRecurring: true,
            recurringId: recurring.id,
          },
          include: {
            category: true,
            account: true,
          },
        });

        // Atualizar lastProcessedDate
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
      { status: 500 }
    );
  }
}
