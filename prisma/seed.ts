import { PrismaClient, CategoryScope } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function main() {
  console.log(" Iniciando seed...");

  const incomeCategories: { name: string; type: CategoryScope; icon: string }[] = [
    { name: "Salário", type: CategoryScope.INCOME, icon: "💼" },
    { name: "Freelance", type: CategoryScope.INCOME, icon: "💻" },
    { name: "Investimentos", type: CategoryScope.INCOME, icon: "📈" },
    { name: "Bônus", type: CategoryScope.INCOME, icon: "🎁" },
    { name: "Aluguel", type: CategoryScope.INCOME, icon: "🏠" },
    { name: "Vendas", type: CategoryScope.INCOME, icon: "🛍️" },
  ];

  const expenseCategories: { name: string; type: CategoryScope; icon: string }[] = [
    { name: "Alimentação", type: CategoryScope.EXPENSE, icon: "🍔" },
    { name: "Transporte", type: CategoryScope.EXPENSE, icon: "🚗" },
    { name: "Moradia", type: CategoryScope.EXPENSE, icon: "🏡" },
    { name: "Educação", type: CategoryScope.EXPENSE, icon: "📚" },
    { name: "Saúde", type: CategoryScope.EXPENSE, icon: "🏥" },
    { name: "Lazer", type: CategoryScope.EXPENSE, icon: "🎮" },
    { name: "Vestuário", type: CategoryScope.EXPENSE, icon: "👕" },
    { name: "Contas", type: CategoryScope.EXPENSE, icon: "📄" },
    { name: "Mercado", type: CategoryScope.EXPENSE, icon: "🛒" },
    { name: "Pets", type: CategoryScope.EXPENSE, icon: "🐶" },
    { name: "Assinaturas", type: CategoryScope.EXPENSE, icon: "📱" },
  ];

  const sharedCategories: { name: string; type: CategoryScope; icon: string }[] = [
    { name: "Outros", type: CategoryScope.BOTH, icon: "💰" },
    { name: "Importação bancária", type: CategoryScope.BOTH, icon: "🏦" },
  ];

  for (const category of [
    ...incomeCategories,
    ...expenseCategories,
    ...sharedCategories,
  ]) {
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
        userId: null,
      },
    });
  }

  console.log(" Seed concluído!");
}

main()
  .catch((e) => {
    console.error(" Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
