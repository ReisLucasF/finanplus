/** Categorias excluídas de receitas/despesas operacionais */
export const EXCLUDED_INCOME_EXPENSE_CATEGORIES = [
  "Investimentos",
  "Transferência entre contas",
  "Transferencia entre contas",
  "Outros"
] as const;

export function classifyExpenseCategory(name: string): string {
  const lower = name.toLowerCase();
  const essencial = [
    "alimentação",
    "moradia",
    "transporte",
    "saúde",
    "educação",
    "contas",
    "mercado",
  ];
  const importante = [
    "vestuário",
    "telefone",
    "internet",
    "seguros",
    "assinaturas",
    "pets",
  ];

  if (essencial.some((e) => lower.includes(e))) return "ESSENCIAL";
  if (importante.some((i) => lower.includes(i))) return "IMPORTANTE";
  if (lower.includes("lazer")) return "SUPÉRFLUO";
  return "OUTROS";
}

export function classifyIncomeCategory(name: string): string {
  const lower = name.toLowerCase();
  const ativa = ["salário", "freelance", "autônomo", "bônus"];
  const passiva = ["dividendos", "aluguel", "juros"];

  if (ativa.some((a) => lower.includes(a))) return "ATIVA_PRINCIPAL";
  if (passiva.some((p) => lower.includes(p))) return "PASSIVA";
  return "EXTRA_VARIÁVEL";
}

export function classifyInvestmentRisk(type: string): string {
  if (["STOCKS", "CRYPTO"].includes(type)) return "ALTO";
  if (["REAL_ESTATE", "FUNDS"].includes(type)) return "MEDIO";
  return "BAIXO";
}

export function computeHealthStatus(
  savingsRate: number,
  emergencyMonths: number,
): string {
  if (emergencyMonths >= 6 && savingsRate >= 20) return "EXCELENTE";
  if (emergencyMonths >= 3 && savingsRate >= 10) return "BOM";
  if (emergencyMonths >= 1 || savingsRate >= 0) return "ATENÇÃO";
  return "CRÍTICO";
}
