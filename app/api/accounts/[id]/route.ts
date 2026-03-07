import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "SAVINGS"]),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.bankAccount.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    // Serializar Decimals
    const serializedAccount = {
      ...account,
      initialBalance: account.initialBalance.toNumber(),
      currentBalance: account.currentBalance.toNumber(),
      transactions: account.transactions.map((t) => ({
        ...t,
        amount: t.amount.toNumber(),
      })),
    };

    return NextResponse.json(serializedAccount);
  } catch (error) {
    console.error("Erro ao buscar conta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = accountSchema.parse(body);

    const account = await prisma.bankAccount.updateMany({
      where: {
        id,
        userId: user.userId,
      },
      data,
    });

    if (account.count === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao atualizar conta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const transactionsCount = await prisma.transaction.count({
      where: { accountId: id },
    });

    if (transactionsCount > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir uma conta com transações vinculadas" },
        { status: 400 },
      );
    }

    const account = await prisma.bankAccount.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (account.count === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta" },
      { status: 500 },
    );
  }
}
