export interface ParsedInterTransaction {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
}

function parseBrazilianNumber(value: string): number {
  const cleaned = value.replace(/"/g, "").trim();
  const negative = cleaned.startsWith("-");
  const num = cleaned.replace("-", "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(num);
  if (Number.isNaN(parsed)) {
    throw new Error(`Valor inválido: ${value}`);
  }
  return negative ? -parsed : parsed;
}

export function parseInterCsv(content: string): ParsedInterTransaction[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const transactions: ParsedInterTransaction[] = [];

  for (const line of lines) {
    const parts = line.split(";");
    if (parts.length < 3) continue;

    const dateStr = parts[0].trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) continue;

    const description = parts[1].trim();
    const rawValue = parseBrazilianNumber(parts[2].trim());
    const [day, month, year] = dateStr.split("/");

    transactions.push({
      date: `${year}-${month}-${day}`,
      description,
      amount: Math.abs(rawValue),
      type: rawValue >= 0 ? "INCOME" : "EXPENSE",
    });
  }

  if (transactions.length === 0) {
    throw new Error(
      "Nenhuma transação encontrada. Verifique se o arquivo é um extrato CSV do Banco Inter.",
    );
  }

  return transactions;
}
