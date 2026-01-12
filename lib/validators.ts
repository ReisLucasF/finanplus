import { z } from "zod";

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Onboarding schemas
export const onboardingStep1Schema = z.object({
  displayName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  theme: z.enum(["LIGHT", "DARK"]),
  country: z.string().min(2, "País é obrigatório"),
  currency: z.string().min(3, "Moeda é obrigatória"),
});

export const onboardingStep2Schema = z.object({
  monthlyLimit: z.number().positive("Limite deve ser positivo").optional(),
});

export const bankAccountSchema = z.object({
  name: z.string().min(2, "Nome da conta é obrigatório"),
  type: z.enum(["CHECKING", "SAVINGS"]),
  initialBalance: z.number(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida"),
});

export const recurringTransactionSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "ANNUAL"]),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
  dueDay: z.number().int().min(1).max(31),
  isActive: z.boolean().default(true),
});

// Transaction schemas
export const transactionSchema = z.object({
  description: z.string().min(2, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().or(z.date()),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).default("COMPLETED"),
});

// Credit Card schemas
export const creditCardSchema = z.object({
  name: z.string().min(2, "Nome do cartão é obrigatório"),
  cardLimit: z.number().positive("Limite deve ser positivo"),
  dueDay: z.number().int().min(1).max(31),
  initialDebt: z.number().min(0).default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida"),
});

export const creditCardPaymentSchema = z.object({
  creditCardId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive("Valor deve ser positivo"),
  dueDate: z.string().or(z.date()),
  paymentDate: z.string().or(z.date()).optional(),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
});

// Transfer schema
export const transferSchema = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount: z.number().positive("Valor deve ser positivo"),
    description: z.string().optional(),
    date: z.string().or(z.date()),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Conta de origem e destino devem ser diferentes",
    path: ["toAccountId"],
  });

// Goal schema
export const goalSchema = z.object({
  name: z.string().min(2, "Nome da meta é obrigatório"),
  targetAmount: z.number().positive("Valor alvo deve ser positivo"),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().or(z.date()),
  accountId: z.string().uuid().optional(),
});

// Category schema
export const categorySchema = z.object({
  name: z.string().min(2, "Nome da categoria é obrigatório"),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
});

// Review schema
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type RecurringTransactionInput = z.infer<
  typeof recurringTransactionSchema
>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type CreditCardInput = z.infer<typeof creditCardSchema>;
export type CreditCardPaymentInput = z.infer<typeof creditCardPaymentSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
