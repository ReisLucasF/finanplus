import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

async function main() {
  console.log("🌱 Iniciando seed...");

  // Categorias de RECEITA padrão do sistema
  const incomeCategories = [
    { name: "Salário", type: "INCOME", icon: "💼" },
    { name: "Freelance", type: "INCOME", icon: "💻" },
    { name: "Investimentos", type: "INCOME", icon: "📈" },
    { name: "Bônus", type: "INCOME", icon: "🎁" },
    { name: "Aluguel", type: "INCOME", icon: "🏠" },
    { name: "Vendas", type: "INCOME", icon: "🛍️" },
    { name: "Outros", type: "INCOME", icon: "💰" },
  ];

  // Categorias de DESPESA padrão do sistema
  const expenseCategories = [
    { name: "Alimentação", type: "EXPENSE", icon: "🍔" },
    { name: "Transporte", type: "EXPENSE", icon: "🚗" },
    { name: "Moradia", type: "EXPENSE", icon: "🏡" },
    { name: "Educação", type: "EXPENSE", icon: "📚" },
    { name: "Saúde", type: "EXPENSE", icon: "🏥" },
    { name: "Lazer", type: "EXPENSE", icon: "🎮" },
    { name: "Vestuário", type: "EXPENSE", icon: "👕" },
    { name: "Contas", type: "EXPENSE", icon: "📄" },
    { name: "Mercado", type: "EXPENSE", icon: "🛒" },
    { name: "Pets", type: "EXPENSE", icon: "🐶" },
    { name: "Assinaturas", type: "EXPENSE", icon: "📱" },
    { name: "Outros", type: "EXPENSE", icon: "💸" },
  ];

  // Criar categorias de receita
  for (const category of incomeCategories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type as any,
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
          type: category.type as any,
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
