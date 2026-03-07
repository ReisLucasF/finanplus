import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["CHECKING", "SAVINGS"]),
  initialBalance: z.number(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    const serializedAccounts = accounts.map((account) => ({
      ...account,
      initialBalance: account.initialBalance.toNumber(),
      currentBalance: account.currentBalance.toNumber(),
    }));

    return NextResponse.json(serializedAccounts);
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contas" },
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
    const data = accountSchema.parse(body);

    const account = await prisma.bankAccount.create({
      data: {
        ...data,
        currentBalance: data.initialBalance,
        userId: user.userId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar conta:", error);
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
  }
}
