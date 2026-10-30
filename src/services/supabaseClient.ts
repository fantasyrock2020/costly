import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_CONFIG_KEY = "cashflow_supabase_config";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = "";

export const supabaseClientService = {
  // Get stored or env config
  getConfig(): SupabaseConfig {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim()
          };
        }
      }
    } catch (e) {
      console.error("Error reading supabase config:", e);
    }

    // Fallback to Vite env variables
    const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
    const envAnonKey = (
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      ""
    ).trim();

    return {
      url: envUrl,
      anonKey: envAnonKey
    };
  },

  // Save config
  saveConfig(config: SupabaseConfig): void {
    localStorage.setItem(
      SUPABASE_CONFIG_KEY,
      JSON.stringify({
        url: config.url.trim(),
        anonKey: config.anonKey.trim()
      })
    );
    // Invalidate client
    cachedClient = null;
    cachedConfigKey = "";
  },

  // Clear config
  clearConfig(): void {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
    cachedClient = null;
    cachedConfigKey = "";
  },

  // Check if configured
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.url && config.anonKey);
  },

  // Get or initialize Supabase client instance
  getClient(): SupabaseClient | null {
    const config = this.getConfig();
    if (!config.url || !config.anonKey) {
      return null;
    }

    const currentKey = `${config.url}|${config.anonKey}`;
    if (cachedClient && cachedConfigKey === currentKey) {
      return cachedClient;
    }

    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      cachedConfigKey = currentKey;
      return cachedClient;
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
      return null;
    }
  },

  // Test connection to Supabase
  async testConnection(customConfig?: SupabaseConfig): Promise<{ success: boolean; message: string }> {
    const config = customConfig || this.getConfig();
    if (!config.url || !config.anonKey) {
      return { success: false, message: "Chưa nhập đầy đủ Supabase URL và Anon Key." };
    }

    try {
      const testClient = createClient(config.url, config.anonKey);
      // Query transactions table or health check
      const { error } = await testClient.from("transactions").select("id").limit(1);
      
      if (error) {
        if (
          error.code === "PGRST301" ||
          error.message?.includes("JWT") ||
          error.message?.includes("Invalid API key") ||
          (error as any).status === 401 ||
          error.code === "401"
        ) {
          return {
            success: false,
            message: "Lỗi 401 (Unauthorized): Khóa API không đúng hoặc không có quyền truy cập. Supabase yêu cầu khóa 'anon public' dạng chuỗi JWT bắt đầu bằng 'eyJ...', lấy tại: Project Settings > API > Project API keys > anon public."
          };
        }
        // Check if permission denied
        if (error.code === "42501" || error.message?.includes("permission denied")) {
          return {
            success: false,
            message: "Lỗi quyền hạn (42501): Vai trò 'anon' chưa được cấp quyền thao tác trên bảng. Hãy chạy lệnh 'GRANT ALL ON TABLE public.transactions TO anon, authenticated;' trong SQL Editor."
          };
        }
        // Check if table does not exist
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return {
            success: false,
            message: "Kết nối thành công tới Supabase nhưng bảng 'transactions' chưa được tạo. Hãy chạy SQL Schema trong phần hướng dẫn!"
          };
        }
        return { success: false, message: `Lỗi kết nối: ${error.message} (mã: ${error.code})` };
      }

      return { success: true, message: "Kết nối Supabase thành công! Bảng dữ liệu đã sẵn sàng." };
    } catch (err: any) {
      return {
        success: false,
        message: `Không thể kết nối tới Supabase: ${err.message || "Vui lòng kiểm tra lại mạng hoặc URL/Key."}`
      };
    }
  }
};
