import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { categoryMatchesTransactionType } from "@/lib/category-utils";
import { z } from "zod";

const bulkUpdateSchema = z
  .object({
    ids: z.array(z.string()).min(1),
    updates: z
      .object({
        categoryId: z.string().optional(),
        description: z.string().min(1).optional(),
      })
      .refine(
        (data) => data.categoryId !== undefined || data.description !== undefined,
        { message: "Informe ao menos um campo para atualizar" },
      ),
  })
  .strict();

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, updates } = bulkUpdateSchema.parse(body);

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        userId: user.userId,
      },
      select: { id: true, type: true },
    });

    if (transactions.length !== ids.length) {
      return NextResponse.json(
        { error: "Uma ou mais transações não foram encontradas" },
        { status: 404 },
      );
    }

    if (updates.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updates.categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria não encontrada" },
          { status: 404 },
        );
      }

      const incompatible = transactions.some(
        (tx) => !categoryMatchesTransactionType(category.type, tx.type),
      );

      if (incompatible) {
        return NextResponse.json(
          {
            error:
              "A categoria selecionada não é compatível com todas as transações (receita/despesa)",
          },
          { status: 400 },
        );
      }
    }

    const result = await prisma.transaction.updateMany({
      where: {
        id: { in: ids },
        userId: user.userId,
      },
      data: {
        ...(updates.categoryId ? { categoryId: updates.categoryId } : {}),
        ...(updates.description ? { description: updates.description } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `${result.count} transação(ões) atualizada(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao atualizar transações em massa:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar transações" },
      { status: 500 },
    );
  }
}
