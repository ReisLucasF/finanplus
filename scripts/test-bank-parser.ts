import { readFileSync } from "fs";
import { parseBankStatementFile } from "../lib/bank-statement-parser";

const files: [string, string][] = [
  ["Inter", "c:/Users/lucas/Desktop/Extrato-17-04-2026-a-04-06-2026-CSV.csv"],
  ["BB", "d:/Downloads/Extrato conta corrente - 032026 (2).csv"],
  ["Mercantil", "d:/Downloads/MercantilExtratoCC.txt"],
  ["Bradesco", "c:/Users/lucas/Desktop/Bradesco_12062026_163756.CSV"],
];

for (const [name, path] of files) {
  const fileBuffer = readFileSync(path);
  const buffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  );
  const r = parseBankStatementFile(buffer);
  const income = r.transactions.filter((t) => t.type === "INCOME").length;
  const expense = r.transactions.filter((t) => t.type === "EXPENSE").length;
  console.log(
    `${name}: ${r.bankLabel} | total: ${r.transactions.length} | receitas: ${income} | despesas: ${expense}`,
  );
}
