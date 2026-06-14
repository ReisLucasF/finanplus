export type BankId = "inter" | "bb" | "mercantil" | "bradesco" | "nubank";

export interface ParsedBankTransaction {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
}

export interface ParseResult {
  bank: BankId;
  bankLabel: string;
  transactions: ParsedBankTransaction[];
}

const BANK_LABELS: Record<BankId, string> = {
  inter: "Banco Inter",
  bb: "Banco do Brasil",
  mercantil: "Banco Mercantil",
  bradesco: "Bradesco",
  nubank: "Nubank",
};

const DATE_BR = /^\d{2}\/\d{2}\/\d{4}$/;

function toIsoDate(dateStr: string): string {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/"/g, "").trim();
  if (!cleaned) return NaN;

  if (/,\d{1,2}$/.test(cleaned)) {
    const negative = cleaned.startsWith("-");
    const num = cleaned.replace("-", "").replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(num);
    if (Number.isNaN(parsed)) throw new Error(`Valor inválido: ${value}`);
    return negative ? -parsed : parsed;
  }

  const negative = cleaned.startsWith("-");
  const num = cleaned.replace("-", "").replace(/,/g, "");
  const parsed = parseFloat(num);
  if (Number.isNaN(parsed)) throw new Error(`Valor inválido: ${value}`);
  return negative ? -parsed : parsed;
}


function buildTransaction(
  dateStr: string,
  description: string,
  rawValue: number,
): ParsedBankTransaction {
  return {
    date: toIsoDate(dateStr),
    description: description.trim(),
    amount: Math.abs(rawValue),
    type: rawValue >= 0 ? "INCOME" : "EXPENSE",
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function dedupeTransactions(
  transactions: ParsedBankTransaction[],
): ParsedBankTransaction[] {
  const seen = new Set<string>();
  return transactions.filter((tx) => {
    const key = `${tx.date}|${tx.description}|${tx.amount}|${tx.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectBank(content: string): BankId | null {
  const firstLine = content.split(/\r?\n/)[0]?.trim().replace(/^\uFEFF/, "") ?? "";

  if (
    content.includes("Crédito (R$);Débito (R$)") ||
    content.includes("Extrato de: Agência")
  ) {
    return "bradesco";
  }

  if (
    content.includes("Data Lançamento;Descrição;Valor;Saldo") ||
    content.includes("Extrato Conta Corrente")
  ) {
    return "inter";
  }

  if (/^Data,Valor,Identificador/i.test(firstLine)) {
    return "nubank";
  }

  if (firstLine.startsWith('"Data"') && firstLine.includes('"Valor"')) {
    return "bb";
  }

  const mercantilPattern = /^\d{4};\d{4};\d+;\d{2}\/\d{2}\/\d{4};/m;
  if (mercantilPattern.test(content)) {
    return "mercantil";
  }

  return null;
}

function parseInter(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const parts = line.split(";");
    if (parts.length < 3) continue;

    const dateStr = parts[0].trim();
    if (!DATE_BR.test(dateStr)) continue;

    const rawValue = parseAmount(parts[2].trim());
    transactions.push(buildTransaction(dateStr, parts[1], rawValue));
  }

  return transactions;
}

function parseBB(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];
  const skipLabels = ["Saldo Anterior", "Saldo do dia", "S A L D O"];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 6) continue;
    if (cols[0] === "Data") continue;

    const dateStr = cols[0].replace(/"/g, "");
    if (!DATE_BR.test(dateStr) || dateStr === "00/00/0000") continue;

    const lancamento = cols[1].replace(/"/g, "").trim();
    if (skipLabels.some((label) => lancamento.includes(label))) continue;

    const detalhes = cols[2].replace(/"/g, "").trim();
    const valorStr = cols[4].replace(/"/g, "").trim();
    const tipo = cols[5].replace(/"/g, "").trim().toLowerCase();

    if (!valorStr || valorStr === "0,00") continue;

    const amount = Math.abs(parseAmount(valorStr));
    let type: "INCOME" | "EXPENSE";

    if (tipo.includes("entrada") || tipo.includes("credito") || tipo.includes("crédito")) {
      type = "INCOME";
    } else if (
      tipo.includes("saida") ||
      tipo.includes("saída") ||
      tipo.includes("debito") ||
      tipo.includes("débito")
    ) {
      type = "EXPENSE";
    } else if (/recebido|credito|crédito|deposito|depósito/i.test(lancamento)) {
      type = "INCOME";
    } else {
      type = "EXPENSE";
    }

    const description = detalhes ? `${lancamento} - ${detalhes}` : lancamento;

    transactions.push({
      date: toIsoDate(dateStr),
      description,
      amount,
      type,
    });
  }

  return transactions;
}

function parseMercantil(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const parts = line.split(";");
    if (parts.length < 7) continue;

    const dateStr = parts[3].trim();
    if (!DATE_BR.test(dateStr)) continue;

    const description = parts[5].trim();
    const rawValue = parseAmount(parts[6].trim());
    transactions.push(buildTransaction(dateStr, description, rawValue));
  }

  return transactions;
}

function parseNubank(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const cols = parseCsvLine(line.replace(/^\uFEFF/, ""));
    if (cols.length < 4) continue;
    if (cols[0] === "Data") continue;

    const dateStr = cols[0].trim();
    if (!DATE_BR.test(dateStr)) continue;

    const rawValue = parseAmount(cols[1]);
    const description = cols.slice(3).join(",").trim();

    if (!description) continue;

    transactions.push(buildTransaction(dateStr, description, rawValue));
  }

  return transactions;
}

function parseBradesco(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];
  let inTransactionBlock = false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("Data;Lançamento;Dcto.;Crédito")) {
      inTransactionBlock = true;
      continue;
    }

    if (!inTransactionBlock) continue;

    if (
      trimmed.startsWith("Total") ||
      trimmed.startsWith(";Saldos") ||
      trimmed.startsWith(";Últimos") ||
      trimmed.startsWith("Data;Histórico")
    ) {
      inTransactionBlock = false;
      continue;
    }

    const parts = line.split(";");
    if (parts.length < 6) continue;

    const dateStr = parts[0].trim();
    if (!DATE_BR.test(dateStr)) continue;

    const description = parts[1].trim();
    if (
      !description ||
      description.toUpperCase().includes("SALDO ANTERIOR")
    ) {
      continue;
    }

    const creditStr = parts[3]?.trim() ?? "";
    const debitStr = parts[4]?.trim() ?? "";

    if (creditStr) {
      transactions.push({
        date: toIsoDate(dateStr),
        description,
        amount: Math.abs(parseAmount(creditStr)),
        type: "INCOME",
      });
    }

    if (debitStr) {
      transactions.push({
        date: toIsoDate(dateStr),
        description,
        amount: Math.abs(parseAmount(debitStr)),
        type: "EXPENSE",
      });
    }
  }

  return dedupeTransactions(transactions);
}

const PARSERS: Record<BankId, (content: string) => ParsedBankTransaction[]> = {
  inter: parseInter,
  bb: parseBB,
  mercantil: parseMercantil,
  bradesco: parseBradesco,
  nubank: parseNubank,
};

export function parseBankStatement(content: string): ParseResult {
  const bank = detectBank(content);

  if (!bank) {
    throw new Error(
      "Formato não reconhecido. Suportamos extratos CSV/TXT do Inter, Banco do Brasil, Mercantil, Bradesco e Nubank.",
    );
  }

  const transactions = dedupeTransactions(PARSERS[bank](content));

  if (transactions.length === 0) {
    throw new Error(
      `Nenhuma transação encontrada no extrato do ${BANK_LABELS[bank]}.`,
    );
  }

  return {
    bank,
    bankLabel: BANK_LABELS[bank],
    transactions,
  };
}

export function parseBankStatementFile(buffer: ArrayBuffer): ParseResult {
  const encodings = ["utf-8", "windows-1252", "iso-8859-1"];

  for (const encoding of encodings) {
    const content = new TextDecoder(encoding).decode(buffer);
    const bank = detectBank(content);
    if (bank) {
      return parseBankStatement(content);
    }
  }

  throw new Error(
    "Formato não reconhecido. Suportamos extratos CSV/TXT do Inter, Banco do Brasil, Mercantil, Bradesco e Nubank.",
  );
}

export const SUPPORTED_BANKS = Object.values(BANK_LABELS).join(", ");
