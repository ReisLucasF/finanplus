export function categoryMatchesTransactionType(
  categoryType: string,
  transactionType: string,
): boolean {
  return categoryType === "BOTH" || categoryType === transactionType;
}

export function getCategoryTypeLabel(type: string): string {
  if (type === "BOTH") return "Receita e Despesa";
  if (type === "INCOME") return "Receita";
  return "Despesa";
}

export function getCategoryTypeColor(type: string): {
  bg: string;
  text: string;
} {
  if (type === "BOTH") {
    return {
      bg: "bg-purple-100 dark:bg-purple-900/20",
      text: "text-purple-600",
    };
  }

  if (type === "INCOME") {
    return {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-600",
    };
  }

  return {
    bg: "bg-red-100 dark:bg-red-900/20",
    text: "text-red-600",
  };
}
