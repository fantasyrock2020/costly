import { supabaseClientService } from "./supabaseClient";
import { authService } from "./authService";
import type { Transaction, Category, YearSummary } from "../types";

const SYNC_QUEUE_KEY = "cashflow_sync_queue";
const LAST_SYNCED_KEY = "cashflow_last_synced_at";

export type SyncStatus = "idle" | "syncing" | "offline" | "synced" | "error" | "unconfigured";

export interface SyncQueueItem {
  id: string;
  entity: "transaction" | "category" | "summary";
  action: "upsert" | "delete";
  recordId: string;
  payload?: any;
  timestamp: number;
  attempts: number;
}

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type SyncStateListener = (state: SyncState) => void;
type DataUpdateListener = () => void;

class SyncService {
  private listeners: Set<SyncStateListener> = new Set();
  private dataUpdateListeners: Set<DataUpdateListener> = new Set();
  private isSyncing = false;
  private syncTimeout: any = null;

  private state: SyncState = {
    status: "idle",
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null
  };

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    // Load initial state
    const queue = this.getQueue();
    const lastSynced = localStorage.getItem(LAST_SYNCED_KEY);
    this.state.pendingCount = queue.length;
    this.state.lastSyncedAt = lastSynced;
    this.state.isOnline = navigator.onLine;

    if (!supabaseClientService.isConfigured()) {
      this.state.status = "unconfigured";
    } else if (!this.state.isOnline) {
      this.state.status = "offline";
    } else if (queue.length > 0) {
      this.state.status = "idle";
    } else {
      this.state.status = "synced";
    }

    // Network status listeners
    window.addEventListener("online", () => {
      this.updateState({ isOnline: true });
      // When back online, automatically trigger sync!
      this.triggerSyncDebounced(1000);
    });

    window.addEventListener("offline", () => {
      this.updateState({ isOnline: false, status: "offline" });
    });

    // Auto-sync periodic heartbeat when online (every 60s)
    setInterval(() => {
      if (
        this.state.isOnline &&
        supabaseClientService.isConfigured() &&
        !this.isSyncing &&
        this.state.status !== "error"
      ) {
        this.sync();
      }
    }, 60000);
  }

  // Subscribe to sync state changes
  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  // Subscribe to data updates (when cloud sync fetches newer transactions)
  public onDataUpdate(listener: DataUpdateListener): () => void {
    this.dataUpdateListeners.add(listener);
    return () => this.dataUpdateListeners.delete(listener);
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (e) {
        console.error("Error in sync listener:", e);
      }
    });
  }

  private notifyDataUpdate() {
    this.dataUpdateListeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Error in data update listener:", e);
      }
    });
  }

  // Read queue from LocalStorage
  public getQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SyncQueueItem[];
    } catch {
      return [];
    }
  }

  // Save queue to LocalStorage
  private saveQueue(queue: SyncQueueItem[]) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      this.updateState({ pendingCount: queue.length });
    } catch (e) {
      console.error("Error saving sync queue:", e);
    }
  }

  // Enqueue a modification
  public enqueue(item: {
    entity: "transaction" | "category" | "summary";
    action: "upsert" | "delete";
    recordId: string;
    payload?: any;
  }) {
    const queue = this.getQueue();
    // Check if recordId is already in queue
    const existingIndex = queue.findIndex(
      (q) => q.entity === item.entity && q.recordId === item.recordId
    );

    if (existingIndex > -1) {
      const existing = queue[existingIndex];
      if (item.action === "delete") {
        queue[existingIndex] = {
          ...existing,
          action: "delete",
          payload: undefined,
          timestamp: Date.now()
        };
      } else {
        queue[existingIndex] = {
          ...existing,
          action: "upsert",
          payload: item.payload,
          timestamp: Date.now()
        };
      }
    } else {
      queue.push({
        id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        entity: item.entity,
        action: item.action,
        recordId: item.recordId,
        payload: item.payload,
        timestamp: Date.now(),
        attempts: 0
      });
    }

    this.saveQueue(queue);

    // If online and Supabase is configured, trigger sync
    if (this.state.isOnline && supabaseClientService.isConfigured()) {
      this.triggerSyncDebounced(1500);
    } else if (!this.state.isOnline) {
      this.updateState({ status: "offline" });
    } else if (!supabaseClientService.isConfigured()) {
      this.updateState({ status: "unconfigured" });
    }
  }

  public triggerSyncDebounced(ms: number = 1000) {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.sync();
    }, ms);
  }

  // Main Sync Function (Two-way sync: Push local changes, Pull remote changes)
  public async sync(): Promise<{ success: boolean; message?: string }> {
    if (this.isSyncing) {
      return { success: false, message: "Đang trong quá trình đồng bộ..." };
    }

    if (!navigator.onLine) {
      this.updateState({ isOnline: false, status: "offline" });
      return { success: false, message: "Không có kết nối mạng (Offline)." };
    }

    const client = supabaseClientService.getClient();
    if (!client) {
      this.updateState({ status: "unconfigured" });
      return { success: false, message: "Chưa cấu hình Supabase URL và Key." };
    }

    this.isSyncing = true;
    this.updateState({ status: "syncing", lastError: null });

    try {
      // 1. PUSH PHASE: Process Outbox Queue
      const queue = this.getQueue();
      const remainingQueue: SyncQueueItem[] = [];
      let pushErrors = 0;

      for (const item of queue) {
        try {
          const currentUser = authService.getCurrentUser();

          if (item.entity === "transaction") {
            if (item.action === "upsert" && item.payload) {
              const tx: Transaction = item.payload;
              const row: any = {
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                category: tx.category,
                date: tx.date,
                location: tx.location || null,
                note: tx.note || null,
                created_at: tx.createdAt || new Date().toISOString(),
                updated_at: tx.updatedAt || new Date().toISOString(),
                deleted_at: null
              };
              if (currentUser?.id || tx.userId) {
                row.user_id = currentUser?.id || tx.userId;
              }
              const { error } = await client.from("transactions").upsert(row);
              if (error) throw error;
            } else if (item.action === "delete") {
              // Soft delete or hard delete in Supabase
              const { error } = await client
                .from("transactions")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", item.recordId);
              if (error) {
                // If soft delete fails (e.g. column not supported), fallback to delete
                await client.from("transactions").delete().eq("id", item.recordId);
              }
            }
          } else if (item.entity === "category") {
            if (item.action === "upsert" && item.payload) {
              const cat: Category = item.payload;
              const row: any = {
                id: cat.id,
                name: cat.name,
                icon: cat.icon,
                type: cat.type,
                is_custom: !!cat.isCustom,
                updated_at: new Date().toISOString(),
                deleted_at: null
              };
              if (currentUser?.id || cat.userId) {
                row.user_id = currentUser?.id || cat.userId;
              }
              const { error } = await client.from("categories").upsert(row);
              if (error) throw error;
            } else if (item.action === "delete") {
              const { error } = await client
                .from("categories")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", item.recordId);
              if (error) {
                await client.from("categories").delete().eq("id", item.recordId);
              }
            }
          } else if (item.entity === "summary") {
            if (item.action === "upsert" && item.payload) {
              const sum: YearSummary = item.payload;
              const row: any = {
                id: `${currentUser?.id || "default"}_${sum.year}`,
                year: sum.year,
                total_income: sum.totalIncome,
                total_expense: sum.totalExpense,
                balance: sum.balance,
                transaction_count: sum.transactionCount,
                top_expense_categories: sum.topExpenseCategories,
                top_income_categories: sum.topIncomeCategories,
                updated_at: new Date().toISOString()
              };
              if (currentUser?.id || sum.userId) {
                row.user_id = currentUser?.id || sum.userId;
              }
              const { error } = await client.from("yearly_summaries").upsert(row);
              if (error) throw error;
            }
          }
        } catch (itemErr: any) {
          console.error(`Failed to push sync item ${item.id}:`, itemErr);
          pushErrors++;
          item.attempts += 1;
          // Keep item in queue to retry if under 5 attempts
          if (item.attempts < 5) {
            remainingQueue.push(item);
          }
        }
      }

      this.saveQueue(remainingQueue);

      // 2. PULL PHASE: Pull remote updates and merge with local storage
      let hasDataChanged = false;
      const pendingRecordIds = new Set(remainingQueue.map((q) => q.recordId));

      // Fetch active transactions from Supabase
      const { data: remoteTxs, error: txError } = await client
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (txError) {
        console.warn("Pull transactions error:", txError);
        if (
          txError.code === "PGRST301" ||
          txError.message?.includes("JWT") ||
          txError.message?.includes("Invalid API key") ||
          (txError as any).status === 401 ||
          txError.code === "401"
        ) {
          throw new Error(
            "Lỗi xác thực (401 Unauthorized): Khóa API không đúng hoặc không có quyền. Bạn cần dùng khóa 'anon public' (chuỗi JWT bắt đầu bằng 'eyJ...') từ Supabase Dashboard."
          );
        }
      } else if (remoteTxs) {
        const localTxsRaw = localStorage.getItem("cashflow_transactions");
        let localTxs: Transaction[] = localTxsRaw ? JSON.parse(localTxsRaw) : [];
        const localTxMap = new Map<string, Transaction>(localTxs.map((t) => [t.id, t]));

        for (const r of remoteTxs) {
          // If this record has a local pending mutation in the queue, skip remote override (local wins until pushed)
          if (pendingRecordIds.has(r.id)) continue;

          if (r.deleted_at) {
            if (localTxMap.has(r.id)) {
              localTxMap.delete(r.id);
              hasDataChanged = true;
            }
          } else {
            const mapped: Transaction = {
              id: r.id,
              userId: r.user_id || undefined,
              type: r.type,
              amount: Number(r.amount),
              category: r.category,
              date: r.date,
              location: r.location || undefined,
              note: r.note || undefined,
              createdAt: r.created_at || new Date().toISOString(),
              updatedAt: r.updated_at || new Date().toISOString()
            };

            const existing = localTxMap.get(r.id);
            if (!existing || new Date(mapped.updatedAt) > new Date(existing.updatedAt)) {
              localTxMap.set(r.id, mapped);
              hasDataChanged = true;
            }
          }
        }

        if (hasDataChanged) {
          localStorage.setItem(
            "cashflow_transactions",
            JSON.stringify(Array.from(localTxMap.values()))
          );
        }
      }

      // Fetch custom categories from Supabase
      const { data: remoteCats } = await client.from("categories").select("*");
      if (remoteCats && remoteCats.length > 0) {
        const localCatsRaw = localStorage.getItem("cashflow_categories");
        let localCats: Category[] = localCatsRaw ? JSON.parse(localCatsRaw) : [];
        const localCatMap = new Map<string, Category>(localCats.map((c) => [c.id, c]));

        for (const r of remoteCats) {
          if (pendingRecordIds.has(r.id)) continue;

          if (r.deleted_at) {
            if (localCatMap.has(r.id)) {
              localCatMap.delete(r.id);
              hasDataChanged = true;
            }
          } else {
            const mappedCat: Category = {
              id: r.id,
              name: r.name,
              icon: r.icon,
              type: r.type,
              isCustom: r.is_custom
            };
            if (!localCatMap.has(r.id)) {
              localCatMap.set(r.id, mappedCat);
              hasDataChanged = true;
            }
          }
        }

        if (hasDataChanged) {
          localStorage.setItem(
            "cashflow_categories",
            JSON.stringify(Array.from(localCatMap.values()))
          );
        }
      }

      // 3. FINISH
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);

      if (pushErrors > 0) {
        this.updateState({
          status: "error",
          lastSyncedAt: now,
          lastError: `Có ${pushErrors} mục chưa thể đồng bộ lên Supabase.`
        });
      } else {
        this.updateState({
          status: remainingQueue.length > 0 ? "idle" : "synced",
          lastSyncedAt: now,
          lastError: null
        });
      }

      if (hasDataChanged) {
        this.notifyDataUpdate();
      }

      return {
        success: pushErrors === 0,
        message: pushErrors === 0 ? "Đồng bộ thành công!" : "Đồng bộ một phần."
      };
    } catch (err: any) {
      console.error("Sync error:", err);
      const errMsg = err?.message || "Lỗi đồng bộ với Supabase.";
      this.updateState({ status: "error", lastError: errMsg });
      return { success: false, message: errMsg };
    } finally {
      this.isSyncing = false;
    }
  }

  // Upload all existing local data to Supabase (Initial Migration)
  public async uploadAllLocalData(): Promise<{ success: boolean; message: string; count?: number }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase URL và Key." };
    }

    try {
      this.updateState({ status: "syncing" });

      // Transactions
      const localTxsRaw = localStorage.getItem("cashflow_transactions");
      const localTxs: Transaction[] = localTxsRaw ? JSON.parse(localTxsRaw) : [];

      const currentUser = authService.getCurrentUser();

      if (localTxs.length > 0) {
        const rows = localTxs.map((tx) => ({
          id: tx.id,
          user_id: currentUser?.id || tx.userId || null,
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          location: tx.location || null,
          note: tx.note || null,
          created_at: tx.createdAt || new Date().toISOString(),
          updated_at: tx.updatedAt || new Date().toISOString(),
          deleted_at: null
        }));

        // Upsert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error } = await client.from("transactions").upsert(chunk);
          if (error) throw error;
        }
      }

      // Categories
      const localCatsRaw = localStorage.getItem("cashflow_categories");
      const localCats: Category[] = localCatsRaw ? JSON.parse(localCatsRaw) : [];
      if (localCats.length > 0) {
        const catRows = localCats.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          type: c.type,
          is_custom: !!c.isCustom,
          updated_at: new Date().toISOString(),
          deleted_at: null
        }));
        await client.from("categories").upsert(catRows);
      }

      // Yearly summaries
      const localSumsRaw = localStorage.getItem("cashflow_yearly_summaries");
      const localSums: YearSummary[] = localSumsRaw ? JSON.parse(localSumsRaw) : [];
      if (localSums.length > 0) {
        const sumRows = localSums.map((s) => ({
          year: s.year,
          total_income: s.totalIncome,
          total_expense: s.totalExpense,
          balance: s.balance,
          transaction_count: s.transactionCount,
          top_expense_categories: s.topExpenseCategories,
          top_income_categories: s.topIncomeCategories,
          updated_at: new Date().toISOString()
        }));
        await client.from("yearly_summaries").upsert(sumRows);
      }

      // Clear sync queue
      this.saveQueue([]);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);
      this.updateState({ status: "synced", lastSyncedAt: now, lastError: null });

      return {
        success: true,
        message: `Đã đẩy thành công ${localTxs.length} giao dịch lên Supabase!`,
        count: localTxs.length
      };
    } catch (e: any) {
      console.error("Upload all error:", e);
      this.updateState({ status: "error", lastError: e.message });
      return { success: false, message: `Lỗi tải lên: ${e.message}` };
    }
  }

  // Pull all data from Supabase and overwrite or fill local
  public async pullAllRemoteData(): Promise<{ success: boolean; message: string; count?: number }> {
    const client = supabaseClientService.getClient();
    if (!client) {
      return { success: false, message: "Chưa cấu hình Supabase URL và Key." };
    }

    try {
      this.updateState({ status: "syncing" });

      const { data: remoteTxs, error: txError } = await client
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (txError) throw txError;

      const mappedTxs: Transaction[] = (remoteTxs || []).map((r) => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        category: r.category,
        date: r.date,
        location: r.location || undefined,
        note: r.note || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
      }));

      localStorage.setItem("cashflow_transactions", JSON.stringify(mappedTxs));

      // Categories
      const { data: remoteCats } = await client
        .from("categories")
        .select("*")
        .is("deleted_at", null);

      if (remoteCats && remoteCats.length > 0) {
        const mappedCats: Category[] = remoteCats.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          type: c.type,
          isCustom: c.is_custom
        }));
        localStorage.setItem("cashflow_categories", JSON.stringify(mappedCats));
      }

      // Summaries
      const { data: remoteSums } = await client.from("yearly_summaries").select("*");
      if (remoteSums && remoteSums.length > 0) {
        const mappedSums: YearSummary[] = remoteSums.map((s) => ({
          year: s.year,
          totalIncome: Number(s.total_income),
          totalExpense: Number(s.total_expense),
          balance: Number(s.balance),
          transactionCount: Number(s.transaction_count),
          topExpenseCategories: s.top_expense_categories || [],
          topIncomeCategories: s.top_income_categories || []
        }));
        localStorage.setItem("cashflow_yearly_summaries", JSON.stringify(mappedSums));
      }

      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);
      this.saveQueue([]);
      this.updateState({ status: "synced", lastSyncedAt: now, lastError: null });
      this.notifyDataUpdate();

      return {
        success: true,
        message: `Đã tải về thành công ${mappedTxs.length} giao dịch từ Supabase!`,
        count: mappedTxs.length
      };
    } catch (e: any) {
      console.error("Pull all error:", e);
      this.updateState({ status: "error", lastError: e.message });
      return { success: false, message: `Lỗi tải về: ${e.message}` };
    }
  }

  /**
   * Full post-login sync flow:
   * 1. Migrate local guest data to the logged-in user
   * 2. Upload ALL local data to Supabase (so nothing is lost)
   * 3. Pull ALL remote data for this user (merge + overwrite)
   * 4. Notify UI to reload
   */
  public async syncAfterLogin(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Step 1: Migrate any local data that doesn't have a userId
      // Dynamic import to avoid circular dependency (syncService ↔ transactionService)
      const mod = await import("./transactionService");
      mod.transactionService.migrateGuestDataToUser(userId);

      // Step 2: Upload all local data to Supabase
      const uploadResult = await this.uploadAllLocalData();
      if (!uploadResult.success) {
        console.warn("Post-login upload partial failure:", uploadResult.message);
        // Continue anyway — pull will merge
      }

      // Step 3: Pull all remote data for this user and merge
      const pullResult = await this.pullAllRemoteData();
      if (!pullResult.success) {
        console.warn("Post-login pull failure:", pullResult.message);
      }

      // Step 4: Clear sync queue (everything is now in sync)
      this.saveQueue([]);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNCED_KEY, now);
      this.updateState({ status: "synced", lastSyncedAt: now, lastError: null });
      this.notifyDataUpdate();

      return {
        success: true,
        message: `Đồng bộ sau đăng nhập thành công! ${uploadResult.count || 0} giao dịch đã tải lên, ${pullResult.count || 0} giao dịch đã tải về.`
      };
    } catch (e: any) {
      console.error("syncAfterLogin error:", e);
      return { success: false, message: e.message || "Lỗi đồng bộ sau đăng nhập." };
    }
  }
}

export const syncService = new SyncService();
export default syncService;
