export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string; // Stored as the category name, e.g., "🍜 Ăn uống" or just the category object ID/name
  date: string; // ISO date format: YYYY-MM-DD
  location?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

export interface YearSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  topExpenseCategories: CategorySummary[];
  topIncomeCategories: CategorySummary[];
}

export interface AppMetadata {
  lastActiveYear: number;
  theme: "light" | "dark" | "system";
  currency: string; // default "VND"
  archivedYearsShown: number[]; // List of years whose summaries have been shown to the user in a popup
}

export interface Category {
  id: string;
  name: string; // Display name (without emoji if separate, or including emoji)
  icon: string; // Emoji, e.g. "🍜"
  type: "income" | "expense";
  isCustom?: boolean;
}
