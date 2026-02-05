import { PrismaClient, TransactionType } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

async function main() {
  console.log("🌱 Iniciando seed...");

  // Categorias de RECEITA padrão do sistema
  const incomeCategories: { name: string; type: TransactionType; icon: string }[] = [
    { name: "Salário", type: TransactionType.INCOME, icon: "💼" },
    { name: "Freelance", type: TransactionType.INCOME, icon: "💻" },
    { name: "Investimentos", type: TransactionType.INCOME, icon: "📈" },
    { name: "Bônus", type: TransactionType.INCOME, icon: "🎁" },
    { name: "Aluguel", type: TransactionType.INCOME, icon: "🏠" },
    { name: "Vendas", type: TransactionType.INCOME, icon: "🛍️" },
    { name: "Outros", type: TransactionType.INCOME, icon: "💰" },
  ];

  // Categorias de DESPESA padrão do sistema
  const expenseCategories: { name: string; type: TransactionType; icon: string }[] = [
    { name: "Alimentação", type: TransactionType.EXPENSE, icon: "🍔" },
    { name: "Transporte", type: TransactionType.EXPENSE, icon: "🚗" },
    { name: "Moradia", type: TransactionType.EXPENSE, icon: "🏡" },
    { name: "Educação", type: TransactionType.EXPENSE, icon: "📚" },
    { name: "Saúde", type: TransactionType.EXPENSE, icon: "🏥" },
    { name: "Lazer", type: TransactionType.EXPENSE, icon: "🎮" },
    { name: "Vestuário", type: TransactionType.EXPENSE, icon: "👕" },
    { name: "Contas", type: TransactionType.EXPENSE, icon: "📄" },
    { name: "Mercado", type: TransactionType.EXPENSE, icon: "🛒" },
    { name: "Pets", type: TransactionType.EXPENSE, icon: "🐶" },
    { name: "Assinaturas", type: TransactionType.EXPENSE, icon: "📱" },
    { name: "Outros", type: TransactionType.EXPENSE, icon: "💸" },
  ];

  // Criar categorias de receita
  for (const category of incomeCategories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {},
      create: {
        ...category,
        userId: null, // Categorias do sistema não têm userId
      },
    });
  }

  // Criar categorias de despesa
  for (const category of expenseCategories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {},
      create: {
        ...category,
        userId: null, // Categorias do sistema não têm userId
      },
    });
  }

  console.log("✅ Seed concluído!");
  console.log(`📊 ${incomeCategories.length} categorias de receita criadas`);
  console.log(`📊 ${expenseCategories.length} categorias de despesa criadas`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
