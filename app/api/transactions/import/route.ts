import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const importSchema = z.object({
  accountId: z.string(),
  transactions: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number().positive(),
        type: z.enum(["INCOME", "EXPENSE"]),
        date: z.string(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, transactions } = importSchema.parse(body);

    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, userId: user.userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    const [incomeCategory, expenseCategory] = await Promise.all([
      prisma.category.findFirst({
        where: { name: "Outros", type: "INCOME" },
      }),
      prisma.category.findFirst({
        where: { name: "Outros", type: "EXPENSE" },
      }),
    ]);

    if (!incomeCategory || !expenseCategory) {
      return NextResponse.json(
        { error: "Categorias padrão não encontradas" },
        { status: 500 },
      );
    }

    const sorted = [...transactions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const result = await prisma.$transaction(async (tx) => {
      let balance = account.currentBalance.toNumber();
      let imported = 0;
      let skipped = 0;

      for (const item of sorted) {
        const dateStart = new Date(`${item.date}T00:00:00.000Z`);
        const dateEnd = new Date(`${item.date}T23:59:59.999Z`);

        const existing = await tx.transaction.findFirst({
          where: {
            userId: user.userId,
            accountId,
            description: item.description,
            amount: item.amount,
            type: item.type,
            date: { gte: dateStart, lte: dateEnd },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const categoryId =
          item.type === "INCOME" ? incomeCategory.id : expenseCategory.id;

        await tx.transaction.create({
          data: {
            userId: user.userId,
            accountId,
            categoryId,
            type: item.type,
            description: item.description,
            amount: item.amount,
            date: new Date(`${item.date}T12:00:00.000Z`),
            status: "COMPLETED",
          },
        });

        balance =
          item.type === "INCOME"
            ? balance + item.amount
            : balance - item.amount;
        imported++;
      }

      if (imported > 0) {
        await tx.bankAccount.update({
          where: { id: accountId },
          data: { currentBalance: balance },
        });
      }

      return { imported, skipped };
    });

    return NextResponse.json({
      success: true,
      message: `${result.imported} transação(ões) importada(s)${result.skipped > 0 ? `, ${result.skipped} duplicata(s) ignorada(s)` : ""}`,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao importar transações:", error);
    return NextResponse.json(
      { error: "Erro ao importar transações" },
      { status: 500 },
    );
  }
}
