import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveImportCategory } from "@/lib/category-db";
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

function buildDedupeKey(item: {
  date: string;
  description: string;
  amount: number;
  type: string;
}) {
  return `${item.date}|${item.description}|${item.amount}|${item.type}`;
}

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

    const sorted = [...transactions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const minDate = new Date(`${sorted[0].date}T00:00:00.000Z`);
    const maxDate = new Date(`${sorted[sorted.length - 1].date}T23:59:59.999Z`);

    const result = await prisma.$transaction(async (tx) => {
      const importCategory = await resolveImportCategory(tx);

      const existingRows = await tx.transaction.findMany({
        where: {
          userId: user.userId,
          accountId,
          date: { gte: minDate, lte: maxDate },
        },
        select: {
          description: true,
          amount: true,
          type: true,
          date: true,
        },
      });

      const existingKeys = new Set(
        existingRows.map((row) =>
          buildDedupeKey({
            date: row.date.toISOString().slice(0, 10),
            description: row.description,
            amount: row.amount.toNumber(),
            type: row.type,
          }),
        ),
      );

      let balance = account.currentBalance.toNumber();
      let imported = 0;
      let skipped = 0;
      const toCreate: Array<{
        userId: string;
        accountId: string;
        categoryId: string;
        type: "INCOME" | "EXPENSE";
        description: string;
        amount: number;
        date: Date;
        status: "COMPLETED";
      }> = [];

      for (const item of sorted) {
        const key = buildDedupeKey(item);
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        existingKeys.add(key);
        toCreate.push({
          userId: user.userId,
          accountId,
          categoryId: importCategory.id,
          type: item.type,
          description: item.description,
          amount: item.amount,
          date: new Date(`${item.date}T12:00:00.000Z`),
          status: "COMPLETED",
        });

        balance =
          item.type === "INCOME"
            ? balance + item.amount
            : balance - item.amount;
        imported++;
      }

      if (toCreate.length > 0) {
        await tx.transaction.createMany({ data: toCreate });
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
