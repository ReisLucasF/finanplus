// Seed para SQLite - Dados iniciais
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco SQLite...");

  // Limpar dados existentes (opcional - comentar se quiser manter dados)
  console.log("🗑️  Limpando dados antigos...");
  await prisma.investmentTransaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.creditCardPurchase.deleteMany();
  await prisma.creditCardPayment.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.review.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar usuário padrão
  console.log("👤 Criando usuário padrão...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.create({
    data: {
      email: "admin@finanplus.com",
      password: hashedPassword,
      name: "Administrador",
      displayName: "Admin",
      role: "ADMIN",
      theme: "DARK",
      currency: "BRL",
      country: "BR",
      onboardingCompleted: true,
    },
  });

  console.log(`✅ Usuário criado: ${user.email}`);

  // 2. Criar categorias padrão de DESPESAS
  console.log("📂 Criando categorias de despesas...");

  const expenseCategories = [
    { name: "Alimentação", icon: "🍽️", type: "EXPENSE" },
    { name: "Transporte", icon: "🚗", type: "EXPENSE" },
    { name: "Moradia", icon: "🏠", type: "EXPENSE" },
    { name: "Saúde", icon: "🏥", type: "EXPENSE" },
    { name: "Educação", icon: "📚", type: "EXPENSE" },
    { name: "Lazer", icon: "🎮", type: "EXPENSE" },
    { name: "Vestuário", icon: "👔", type: "EXPENSE" },
    { name: "Telefone", icon: "📱", type: "EXPENSE" },
    { name: "Internet", icon: "🌐", type: "EXPENSE" },
    { name: "Streaming", icon: "📺", type: "EXPENSE" },
    { name: "Academia", icon: "💪", type: "EXPENSE" },
    { name: "Supermercado", icon: "🛒", type: "EXPENSE" },
    { name: "Restaurante", icon: "🍕", type: "EXPENSE" },
    { name: "Combustível", icon: "⛽", type: "EXPENSE" },
    { name: "Manutenção", icon: "🔧", type: "EXPENSE" },
    { name: "Seguros", icon: "🛡️", type: "EXPENSE" },
    { name: "Impostos", icon: "📋", type: "EXPENSE" },
    { name: "Presentes", icon: "🎁", type: "EXPENSE" },
    { name: "Pets", icon: "🐕", type: "EXPENSE" },
    { name: "Viagens", icon: "✈️", type: "EXPENSE" },
    { name: "Outros", icon: "📦", type: "EXPENSE" },
  ];

  for (const cat of expenseCategories) {
    await prisma.category.create({
      data: {
        ...cat,
        userId: null, // Categoria do sistema
      },
    });
  }

  console.log(`✅ ${expenseCategories.length} categorias de despesas criadas`);

  // 3. Criar categorias padrão de RECEITAS
  console.log("💰 Criando categorias de receitas...");

  const incomeCategories = [
    { name: "Salário", icon: "💼", type: "INCOME" },
    { name: "Freelance", icon: "💻", type: "INCOME" },
    { name: "Investimentos", icon: "📈", type: "INCOME" },
    { name: "Dividendos", icon: "💵", type: "INCOME" },
    { name: "Aluguel", icon: "🏢", type: "INCOME" },
    { name: "Prêmios", icon: "🏆", type: "INCOME" },
    { name: "Vendas", icon: "🛍️", type: "INCOME" },
    { name: "Bônus", icon: "🎯", type: "INCOME" },
    { name: "13º Salário", icon: "🎄", type: "INCOME" },
    { name: "Restituição", icon: "🔄", type: "INCOME" },
    { name: "Outros", icon: "💸", type: "INCOME" },
  ];

  for (const cat of incomeCategories) {
    await prisma.category.create({
      data: {
        ...cat,
        userId: null, // Categoria do sistema
      },
    });
  }

  console.log(`✅ ${incomeCategories.length} categorias de receitas criadas`);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📊 Resumo:");
  console.log(`   👤 Usuário: ${user.email}`);
  console.log(`   🔑 Senha: admin123`);
  console.log(
    `   📂 Categorias: ${expenseCategories.length + incomeCategories.length}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro durante seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
