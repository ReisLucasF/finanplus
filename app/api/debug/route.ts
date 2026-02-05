import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar dados básicos do usuário
    const totalTransactions = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as expense_count,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count
      FROM Transaction 
      WHERE userId = ${user.userId}
    `;

    // Verificar transações recentes
    const recentTransactions = await prisma.$queryRaw`
      SELECT id, type, status, amount, date, description
      FROM Transaction 
      WHERE userId = ${user.userId}
      ORDER BY date DESC
      LIMIT 10
    `;

    // Verificar saldos
    const accountBalances = await prisma.$queryRaw`
      SELECT SUM(currentBalance) as total_balance
      FROM BankAccount 
      WHERE userId = ${user.userId}
    `;

    // Verificar categorias
    const categories = await prisma.$queryRaw`
      SELECT COUNT(*) as total_categories
      FROM Category 
      WHERE userId = ${user.userId} OR userId IS NULL
    `;

    // Converter BigInt para Number
    const convertBigIntToNumber = (value: any): number => {
      if (typeof value === "bigint") {
        return Number(value);
      }
      return Number(value) || 0;
    };

    // Processar dados para evitar BigInt
    const processObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(processObject);
      }
      if (obj && typeof obj === "object") {
        const processed: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "bigint") {
            processed[key] = convertBigIntToNumber(value);
          } else if (typeof value === "object") {
            processed[key] = processObject(value);
          } else {
            processed[key] = value;
          }
        }
        return processed;
      }
      return obj;
    };

    return NextResponse.json({
      debug: processObject({
        userId: user.userId,
        totalTransactions: Array.isArray(totalTransactions)
          ? totalTransactions[0]
          : totalTransactions,
        recentTransactions,
        accountBalances: Array.isArray(accountBalances)
          ? accountBalances[0]
          : accountBalances,
        categories: Array.isArray(categories) ? categories[0] : categories,
      }),
      success: true,
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
