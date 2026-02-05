// Seed para SQLite - Dados iniciais
import { PrismaClient, TransactionType } from "@prisma/client";
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
    { name: "Alimentação", icon: "🍽️", type: TransactionType.EXPENSE },
    { name: "Transporte", icon: "🚗", type: TransactionType.EXPENSE },
    { name: "Moradia", icon: "🏠", type: TransactionType.EXPENSE },
    { name: "Saúde", icon: "🏥", type: TransactionType.EXPENSE },
    { name: "Educação", icon: "📚", type: TransactionType.EXPENSE },
    { name: "Lazer", icon: "🎮", type: TransactionType.EXPENSE },
    { name: "Vestuário", icon: "👔", type: TransactionType.EXPENSE },
    { name: "Telefone", icon: "📱", type: TransactionType.EXPENSE },
    { name: "Internet", icon: "🌐", type: TransactionType.EXPENSE },
    { name: "Streaming", icon: "📺", type: TransactionType.EXPENSE },
    { name: "Academia", icon: "💪", type: TransactionType.EXPENSE },
    { name: "Supermercado", icon: "🛒", type: TransactionType.EXPENSE },
    { name: "Restaurante", icon: "🍕", type: TransactionType.EXPENSE },
    { name: "Combustível", icon: "⛽", type: TransactionType.EXPENSE },
    { name: "Manutenção", icon: "🔧", type: TransactionType.EXPENSE },
    { name: "Seguros", icon: "🛡️", type: TransactionType.EXPENSE },
    { name: "Impostos", icon: "📋", type: TransactionType.EXPENSE },
    { name: "Presentes", icon: "🎁", type: TransactionType.EXPENSE },
    { name: "Pets", icon: "🐕", type: TransactionType.EXPENSE },
    { name: "Viagens", icon: "✈️", type: TransactionType.EXPENSE },
    { name: "Outros", icon: "📦", type: TransactionType.EXPENSE },
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
    { name: "Salário", icon: "💼", type: TransactionType.INCOME },
    { name: "Freelance", icon: "💻", type: TransactionType.INCOME },
    { name: "Investimentos", icon: "📈", type: TransactionType.INCOME },
    { name: "Dividendos", icon: "💵", type: TransactionType.INCOME },
    { name: "Aluguel", icon: "🏢", type: TransactionType.INCOME },
    { name: "Prêmios", icon: "🏆", type: TransactionType.INCOME },
    { name: "Vendas", icon: "🛍️", type: TransactionType.INCOME },
    { name: "Bônus", icon: "🎯", type: TransactionType.INCOME },
    { name: "13º Salário", icon: "🎄", type: TransactionType.INCOME },
    { name: "Restituição", icon: "🔄", type: TransactionType.INCOME },
    { name: "Outros", icon: "💸", type: TransactionType.INCOME },
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
