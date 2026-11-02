import type { Transaction, YearSummary, AppMetadata, Category, CategorySummary } from "../types";
import { syncService } from "./syncService";
import { authService } from "./authService";

const TRANSACTIONS_KEY = "cashflow_transactions";
const METADATA_KEY = "cashflow_metadata";
const SUMMARIES_KEY = "cashflow_yearly_summaries";
const CATEGORIES_KEY = "cashflow_categories";
const ACTIVE_DATA_OWNER_KEY = "cashflow_active_data_owner";
const GUEST_DATA_KEY = "cashflow_guest_data";

interface LocalDataSnapshot {
  transactions: Transaction[];
  categories: Category[];
  summaries: YearSummary[];
}

function readLocalDataSnapshot(): LocalDataSnapshot {
  return {
    transactions: safeRead<Transaction[]>(TRANSACTIONS_KEY, []),
    categories: safeRead<Category[]>(CATEGORIES_KEY, []),
    summaries: safeRead<YearSummary[]>(SUMMARIES_KEY, [])
  };
}

function writeLocalDataSnapshot(snapshot: LocalDataSnapshot): boolean {
  return (
    safeWrite(TRANSACTIONS_KEY, snapshot.transactions) &&
    safeWrite(CATEGORIES_KEY, snapshot.categories) &&
    safeWrite(SUMMARIES_KEY, snapshot.summaries)
  );
}

function getOwnerDataKey(userId: string): string {
  return `cashflow_user_data_${userId}`;
}

function saveGuestSnapshot(snapshot: LocalDataSnapshot, guestUserId: string): void {
  const guestUserIds = new Set(authService.getGuestUserIds());
  guestUserIds.add(guestUserId);
  const isGuestData = (userId?: string) =>
    !userId || guestUserIds.has(userId) || userId.startsWith("guest-");
  const guestSnapshot: LocalDataSnapshot = {
    transactions: snapshot.transactions.filter((transaction) => isGuestData(transaction.userId)),
    categories: snapshot.categories.filter((category) => !category.isCustom || isGuestData(category.userId)),
    summaries: snapshot.summaries.filter((summary) => isGuestData(summary.userId))
  };
  if (!safeWrite(GUEST_DATA_KEY, guestSnapshot)) {
    console.error("Could not preserve guest data in LocalStorage.");
  }
}

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
  activateDataForUser(userId: string, isGuest: boolean): { success: boolean; error?: string } {
    const activeOwnerId = localStorage.getItem(ACTIVE_DATA_OWNER_KEY);
    const currentSnapshot = readLocalDataSnapshot();

    if (activeOwnerId === userId) {
      if (isGuest) saveGuestSnapshot(currentSnapshot, userId);
      return { success: true };
    }

    if (activeOwnerId) {
      const ownerSnapshotKey = getOwnerDataKey(activeOwnerId);
      if (!safeWrite(ownerSnapshotKey, currentSnapshot)) {
        return { success: false, error: "Không thể lưu dữ liệu của tài khoản hiện tại." };
      }
      if (authService.isGuestUserId(activeOwnerId)) {
        saveGuestSnapshot(currentSnapshot, activeOwnerId);
      }
    } else if (!isGuest) {
      saveGuestSnapshot(currentSnapshot, authService.ensureGuestUserId());
    }

    let nextSnapshot: LocalDataSnapshot | null = safeRead<LocalDataSnapshot | null>(
      getOwnerDataKey(userId),
      null
    );
    if (isGuest) {
      const guestSnapshot = safeRead<LocalDataSnapshot | null>(GUEST_DATA_KEY, null);
      if (guestSnapshot) nextSnapshot = guestSnapshot;
    } else if (!activeOwnerId && !nextSnapshot) {
      // Adopt existing unscoped local data once when installing the per-user storage.
      nextSnapshot = currentSnapshot;
    }

    if (!writeLocalDataSnapshot(nextSnapshot || { transactions: [], categories: [], summaries: [] })) {
      return { success: false, error: "Không thể tải dữ liệu local cho tài khoản hiện tại." };
    }
    localStorage.setItem(ACTIVE_DATA_OWNER_KEY, userId);
    if (isGuest) saveGuestSnapshot(nextSnapshot || currentSnapshot, userId);
    return { success: true };
  },

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
    const currentUser = authService.getCurrentUser();
    if (currentUser?.isGuest) saveGuestSnapshot(readLocalDataSnapshot(), currentUser.id);
    return { success: true, data: transactions };
  },

  // Get categories (custom + default)
  getCategories(): Category[] {
    const stored = safeRead<Category[]>(CATEGORIES_KEY, []);
    return stored.length > 0 ? stored : DEFAULT_CATEGORIES;
  },

  // Save categories
  saveCategories(categories: Category[]): boolean {
    const currentUserId = authService.getCurrentUser()?.id;
    const categoriesToSave = categories.map((category) =>
      category.isCustom && !category.userId
        ? { ...category, userId: currentUserId }
        : category
    );
    const success = safeWrite<Category[]>(CATEGORIES_KEY, categoriesToSave);
    if (success) {
      const currentUser = authService.getCurrentUser();
      if (currentUser?.isGuest) saveGuestSnapshot(readLocalDataSnapshot(), currentUser.id);
      categoriesToSave.filter(c => c.isCustom).forEach(cat => {
        syncService.enqueue({
          entity: "category",
          action: "upsert",
          recordId: cat.id,
          payload: cat
        });
      });
    }
    return success;
  },

  // Get summaries
  getYearlySummaries(): YearSummary[] {
    return safeRead<YearSummary[]>(SUMMARIES_KEY, []);
  },

  // Save summaries
  saveYearlySummaries(summaries: YearSummary[]): boolean {
    const currentUserId = authService.getCurrentUser()?.id;
    const summariesToSave = summaries.map((summary) =>
      summary.userId ? summary : { ...summary, userId: currentUserId }
    );
    const success = safeWrite<YearSummary[]>(SUMMARIES_KEY, summariesToSave);
    if (success) {
      const currentUser = authService.getCurrentUser();
      if (currentUser?.isGuest) saveGuestSnapshot(readLocalDataSnapshot(), currentUser.id);
      summariesToSave.forEach(sum => {
        syncService.enqueue({
          entity: "summary",
          action: "upsert",
          recordId: String(sum.year),
          payload: sum
        });
      });
    }
    return success;
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
    const currentUser = authService.getCurrentUser();
    
    let txToSave: Transaction;
    if (index > -1) {
      // Edit
      txToSave = {
        ...transaction,
        userId: transaction.userId || currentUser?.id,
        updatedAt: new Date().toISOString()
      };
      transactions[index] = txToSave;
    } else {
      // Create new
      txToSave = {
        ...transaction,
        userId: transaction.userId || currentUser?.id,
        createdAt: transaction.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transactions.push(txToSave);
    }

    const result = this.saveTransactions(transactions);
    if (result.success) {
      syncService.enqueue({
        entity: "transaction",
        action: "upsert",
        recordId: txToSave.id,
        payload: txToSave
      });
    }
    
    return result;
  },

  // Migrate guest data to logged-in user
  migrateGuestDataToUser(userId: string): { success: boolean; error?: string } {
    const guestUserId = authService.getGuestUserId();
    const belongsToGuest = (recordUserId?: string) =>
      !recordUserId ||
      authService.isGuestUserId(recordUserId);
    if (!guestUserId) {
      return { success: false, error: "Không tìm thấy UUID guest để chuyển dữ liệu." };
    }

    const activeSnapshot = readLocalDataSnapshot();
    const storedGuestSnapshot = safeRead<LocalDataSnapshot | null>(GUEST_DATA_KEY, null);
    const guestSnapshot = storedGuestSnapshot || {
      transactions: activeSnapshot.transactions.filter((transaction) => belongsToGuest(transaction.userId)),
      categories: activeSnapshot.categories.filter((category) =>
        category.isCustom && belongsToGuest(category.userId)
      ),
      summaries: activeSnapshot.summaries.filter((summary) => belongsToGuest(summary.userId))
    };

    saveGuestSnapshot(guestSnapshot, guestUserId);

    const transactions = new Map<string, Transaction>();
    guestSnapshot.transactions.forEach((transaction) => {
      transactions.set(transaction.id, { ...transaction, userId });
    });
    activeSnapshot.transactions.forEach((transaction) => {
      if (transaction.userId === userId) transactions.set(transaction.id, transaction);
    });

    const categories = new Map<string, Category>();
    guestSnapshot.categories.filter((category) => category.isCustom).forEach((category) => {
      categories.set(category.id, { ...category, userId });
    });
    activeSnapshot.categories
      .filter((category) => !category.isCustom || category.userId === userId)
      .forEach((category) => {
        if (category.isCustom) categories.set(category.id, category);
      });

    const summaries = new Map<number, YearSummary>();
    guestSnapshot.summaries.forEach((summary) => {
      summaries.set(summary.year, { ...summary, userId });
    });
    activeSnapshot.summaries
      .filter((summary) => summary.userId === userId)
      .forEach((summary) => summaries.set(summary.year, summary));

    const migratedSnapshot: LocalDataSnapshot = {
      transactions: Array.from(transactions.values()),
      categories: [
        ...activeSnapshot.categories.filter((category) => !category.isCustom),
        ...Array.from(categories.values())
      ],
      summaries: Array.from(summaries.values())
    };
    if (!writeLocalDataSnapshot(migratedSnapshot)) {
      return { success: false, error: "Không thể lưu dữ liệu guest đã chuyển sang tài khoản." };
    }

    guestSnapshot.transactions.forEach((transaction) => {
      const migrated = { ...transaction, userId };
      syncService.enqueue({
        entity: "transaction",
        action: "upsert",
        recordId: migrated.id,
        userId,
        payload: migrated
      });
    });
    guestSnapshot.categories.filter((category) => category.isCustom).forEach((category) => {
      const migrated = { ...category, userId };
      syncService.enqueue({
        entity: "category",
        action: "upsert",
        recordId: migrated.id,
        userId,
        payload: migrated
      });
    });
    guestSnapshot.summaries.forEach((summary) => {
      const migrated = { ...summary, userId };
      syncService.enqueue({
        entity: "summary",
        action: "upsert",
        recordId: String(migrated.year),
        userId,
        payload: migrated
      });
    });
    return { success: true };
  },

  // Delete transaction
  deleteTransaction(id: string): StorageResult<Transaction[]> {
    const transactions = this.getTransactions();
    const deletedTransaction = transactions.find((transaction) => transaction.id === id);
    const filtered = transactions.filter(t => t.id !== id);
    const result = this.saveTransactions(filtered);
    if (result.success) {
      syncService.enqueue({
        entity: "transaction",
        action: "delete",
        recordId: id,
        userId: deletedTransaction?.userId
      });
    }
    return result;
  },

  // Clear all data
  clearAllData() {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(METADATA_KEY);
    localStorage.removeItem(SUMMARIES_KEY);
    localStorage.removeItem(CATEGORIES_KEY);
    localStorage.removeItem(GUEST_DATA_KEY);
    localStorage.removeItem(ACTIVE_DATA_OWNER_KEY);
    const userDataKeys = Object.keys(localStorage).filter((key) => key.startsWith("cashflow_user_data_"));
    userDataKeys.forEach((key) => localStorage.removeItem(key));
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
