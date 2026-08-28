import type { Transaction, YearSummary, AppMetadata, Category, CategorySummary } from "../types";

const TRANSACTIONS_KEY = "cashflow_transactions";
const METADATA_KEY = "cashflow_metadata";
const SUMMARIES_KEY = "cashflow_yearly_summaries";
const CATEGORIES_KEY = "cashflow_categories";

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: "exp-food", name: "Ăn uống", icon: "🍜", type: "expense" },
  { id: "exp-shopping", name: "Mua sắm", icon: "🛒", type: "expense" },
  { id: "exp-transport", name: "Đi lại", icon: "🚗", type: "expense" },
  { id: "exp-housing", name: "Nhà cửa", icon: "🏠", type: "expense" },
  { id: "exp-bills", name: "Hóa đơn", icon: "💡", type: "expense" },
  { id: "exp-health", name: "Sức khỏe", icon: "💊", type: "expense" },
  { id: "exp-entertainment", name: "Giải trí", icon: "🎮", type: "expense" },
  { id: "exp-travel", name: "Du lịch", icon: "✈️", type: "expense" },
  { id: "exp-education", name: "Học tập", icon: "📚", type: "expense" },
  { id: "exp-work", name: "Công việc", icon: "💻", type: "expense" },
  { id: "exp-family", name: "Gia đình", icon: "❤️", type: "expense" },
  { id: "exp-other", name: "Khác", icon: "📦", type: "expense" },

  // Income
  { id: "inc-salary", name: "Lương", icon: "💼", type: "income" },
  { id: "inc-bonus", name: "Thưởng", icon: "💰", type: "income" },
  { id: "inc-investment", name: "Đầu tư", icon: "📈", type: "income" },
  { id: "inc-freelance", name: "Làm thêm", icon: "💻", type: "income" },
  { id: "inc-gift", name: "Quà tặng", icon: "🎁", type: "income" },
  { id: "inc-interest", name: "Lãi tiền gửi", icon: "🏦", type: "income" },
  { id: "inc-other", name: "Khác", icon: "📦", type: "income" }
];

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Safely read from LocalStorage
function safeRead<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading key ${key} from LocalStorage:`, e);
    return defaultValue;
  }
}

// Safely write to LocalStorage
function safeWrite<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error writing key ${key} to LocalStorage:`, e);
    return false;
  }
}

export const transactionService = {
  // Get all transactions
  getTransactions(): Transaction[] {
    return safeRead<Transaction[]>(TRANSACTIONS_KEY, []);
  },

  // Save all transactions
  saveTransactions(transactions: Transaction[]): StorageResult<Transaction[]> {
    const success = safeWrite<Transaction[]>(TRANSACTIONS_KEY, transactions);
    if (!success) {
      return { success: false, error: "Unable to save your transaction. Please check your browser storage settings." };
    }
    return { success: true, data: transactions };
  },

  // Get categories (custom + default)
  getCategories(): Category[] {
    const stored = safeRead<Category[]>(CATEGORIES_KEY, []);
    return stored.length > 0 ? stored : DEFAULT_CATEGORIES;
  },

  // Save categories
  saveCategories(categories: Category[]): boolean {
    return safeWrite<Category[]>(CATEGORIES_KEY, categories);
  },

  // Get summaries
  getYearlySummaries(): YearSummary[] {
    return safeRead<YearSummary[]>(SUMMARIES_KEY, []);
  },

  // Save summaries
  saveYearlySummaries(summaries: YearSummary[]): boolean {
    return safeWrite<YearSummary[]>(SUMMARIES_KEY, summaries);
  },

  // Get metadata
  getMetadata(): AppMetadata {
    const defaultMeta: AppMetadata = {
      lastActiveYear: new Date().getFullYear(),
      theme: "system",
      currency: "VND",
      archivedYearsShown: []
    };
    return safeRead<AppMetadata>(METADATA_KEY, defaultMeta);
  },

  // Save metadata
  saveMetadata(metadata: AppMetadata): boolean {
    return safeWrite<AppMetadata>(METADATA_KEY, metadata);
  },

  // Check and run data lifecycle rollover for 1 year
  checkAndRunLifecycleRollover(currentYear: number = new Date().getFullYear()): { rolledOver: boolean, archivedYear?: number } {
    const transactions = this.getTransactions();
    if (transactions.length === 0) return { rolledOver: false };

    // Find if there are transactions belonging to a year earlier than currentYear
    const olderYears = Array.from(
      new Set(
        transactions
          .map(t => new Date(t.date).getFullYear())
          .filter(y => y < currentYear)
      )
    ).sort();

    if (olderYears.length === 0) return { rolledOver: false };

    // Let's archive the oldest olderYear first
    const archiveYear = olderYears[0];
    
    // Extract transactions of that year
    const oldTxs = transactions.filter(t => new Date(t.date).getFullYear() === archiveYear);
    const currentTxs = transactions.filter(t => new Date(t.date).getFullYear() !== archiveYear);

    // Calculate Summary
    const totalIncome = oldTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = oldTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    // Calculate category summaries for expenses
    const expCategoriesMap: Record<string, number> = {};
    const incCategoriesMap: Record<string, number> = {};
    
    oldTxs.forEach(t => {
      if (t.type === "expense") {
        expCategoriesMap[t.category] = (expCategoriesMap[t.category] || 0) + t.amount;
      } else {
        incCategoriesMap[t.category] = (incCategoriesMap[t.category] || 0) + t.amount;
      }
    });

    const topExpenseCategories: CategorySummary[] = Object.keys(expCategoriesMap)
      .map(cat => ({
        category: cat,
        amount: expCategoriesMap[cat],
        percentage: totalExpense > 0 ? Math.round((expCategoriesMap[cat] / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const topIncomeCategories: CategorySummary[] = Object.keys(incCategoriesMap)
      .map(cat => ({
        category: cat,
        amount: incCategoriesMap[cat],
        percentage: totalIncome > 0 ? Math.round((incCategoriesMap[cat] / totalIncome) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    const yearSummary: YearSummary = {
      year: archiveYear,
      totalIncome,
      totalExpense,
      balance,
      transactionCount: oldTxs.length,
      topExpenseCategories,
      topIncomeCategories
    };

    // Save Year Summary
    const summaries = this.getYearlySummaries();
    if (!summaries.some(s => s.year === archiveYear)) {
      summaries.push(yearSummary);
      this.saveYearlySummaries(summaries);
    }

    // Save current transactions (excluding archiveYear)
    this.saveTransactions(currentTxs);

    // Update metadata
    const metadata = this.getMetadata();
    metadata.lastActiveYear = currentYear;
    this.saveMetadata(metadata);

    return { rolledOver: true, archivedYear: archiveYear };
  },

  // Save transaction (create or edit)
  saveTransaction(transaction: Transaction): StorageResult<Transaction[]> {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    
    if (index > -1) {
      // Edit
      transactions[index] = {
        ...transaction,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create new
      transactions.push({
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Update last category usage in metadata if needed or handle sorted categories
    // Sort logic will be handled live by checking transaction patterns
    
    return this.saveTransactions(transactions);
  },

  // Delete transaction
  deleteTransaction(id: string): StorageResult<Transaction[]> {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    return this.saveTransactions(filtered);
  },

  // Clear all data
  clearAllData() {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARIES_KEY);
    localStorage.removeItem(CATEGORIES_KEY);
  },

  // Export JSON backup
  exportBackup(): string {
    const data = {
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      summaries: this.getYearlySummaries(),
      metadata: this.getMetadata()
    };
    return JSON.stringify(data, null, 2);
  },

  // Import JSON backup
  importBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      
      // Validation
      if (!data || typeof data !== "object") return { success: false, error: "Dữ liệu không đúng định dạng." };
      
      if (data.transactions && !Array.isArray(data.transactions)) {
        return { success: false, error: "Danh sách giao dịch không hợp lệ." };
      }
      
      if (data.categories && !Array.isArray(data.categories)) {
        return { success: false, error: "Danh sách danh mục không hợp lệ." };
      }
      
      if (data.summaries && !Array.isArray(data.summaries)) {
        return { success: false, error: "Danh sách lịch sử năm không hợp lệ." };
      }

      // Write data if present, otherwise ignore
      if (data.transactions) this.saveTransactions(data.transactions);
      if (data.categories) this.saveCategories(data.categories);
      if (data.summaries) this.saveYearlySummaries(data.summaries);
      if (data.metadata) this.saveMetadata(data.metadata);

      return { success: true };
    } catch (e) {
      return { success: false, error: `Lỗi giải mã JSON. Vui lòng kiểm tra lại file sao lưu. ${e}` };
    }
  }
};
export default transactionService;
