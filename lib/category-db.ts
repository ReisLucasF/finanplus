import type { Prisma, PrismaClient } from "@prisma/client";
import { CategoryScope } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function ensureImportCategory(db: DbClient) {
  return db.category.upsert({
    where: {
      name_type: {
        name: "Importação bancária",
        type: CategoryScope.BOTH,
      },
    },
    create: {
      name: "Importação bancária",
      type: CategoryScope.BOTH,
      userId: null,
      icon: "🏦",
    },
    update: {},
  });
}

export async function ensureDefaultCategories(db: DbClient) {
  const defaults = [
    { name: "Importação bancária", type: CategoryScope.BOTH, icon: "🏦" },
    { name: "Outros", type: CategoryScope.BOTH, icon: "💰" },
  ] as const;

  for (const category of defaults) {
    await db.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      create: {
        ...category,
        userId: null,
      },
      update: {},
    });
  }
}

export async function resolveImportCategory(db: DbClient) {
  const bothCategory = await db.category.findFirst({
    where: {
      name: "Importação bancária",
      type: CategoryScope.BOTH,
    },
  });

  if (bothCategory) return bothCategory;

  return ensureImportCategory(db);
}
