import React, { useState, useEffect } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  Database,
  UploadCloud,
  DownloadCloud,
  Key,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { supabaseClientService, type SupabaseConfig } from "../../services/supabaseClient";
import { syncService, type SyncState } from "../../services/syncService";
import { Card } from "../ui/Card";
import Button from "../ui/Button";

interface SupabaseSyncSettingsProps {
  onDataReset: () => void;
}

const SQL_SCHEMA = `-- 1. BẢNG TRANSACTIONS (Giao dịch thu / chi)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON public.transactions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at);

-- 2. BẢNG CATEGORIES (Danh mục tùy chỉnh)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. BẢNG YEARLY_SUMMARIES (Lịch sử năm)
CREATE TABLE IF NOT EXISTS public.yearly_summaries (
    year INT PRIMARY KEY,
    total_income NUMERIC NOT NULL DEFAULT 0,
    total_expense NUMERIC NOT NULL DEFAULT 0,
    balance NUMERIC NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    top_expense_categories JSONB DEFAULT '[]'::jsonb,
    top_income_categories JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CẤP QUYỀN TRUY CẬP CHO ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.transactions TO anon, authenticated;
GRANT ALL ON TABLE public.categories TO anon, authenticated;
GRANT ALL ON TABLE public.yearly_summaries TO anon, authenticated;

-- 5. BẬT RLS & CHÍNH SÁCH TRUY CẬP
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access transactions" ON public.transactions;
CREATE POLICY "Public full access transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access categories" ON public.categories;
CREATE POLICY "Public full access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access yearly_summaries" ON public.yearly_summaries;
CREATE POLICY "Public full access yearly_summaries" ON public.yearly_summaries FOR ALL USING (true) WITH CHECK (true);`;

export const SupabaseSyncSettings: React.FC<SupabaseSyncSettingsProps> = ({ onDataReset }) => {
  const [config, setConfig] = useState<SupabaseConfig>(supabaseClientService.getConfig());
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());

  // Testing & Action status states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Schema guide collapsible
  const [showGuide, setShowGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    supabaseClientService.saveConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    // Trigger sync if online
    syncService.sync();
  };

  const handleClearConfig = () => {
    if (window.confirm("Bạn có chắc chắn muốn ngắt kết nối Supabase? Dữ liệu trên máy sẽ không bị mất.")) {
      supabaseClientService.clearConfig();
      setConfig({ url: "", anonKey: "" });
      setTestResult(null);
      syncService.sync();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await supabaseClientService.testConnection(config);
    setIsTesting(false);
    setTestResult(result);
  };

  const handleSyncNow = async () => {
    setIsActionLoading(true);
    setActionMessage(null);
    const res = await syncService.sync();
    setIsActionLoading(false);
    setActionMessage({
      success: res.success,
      text: res.message || (res.success ? "Đồng bộ thành công!" : "Đồng bộ thất bại.")
    });
  };

  const handleUploadAll = async () => {
    if (
      window.confirm(
        "Thao tác này sẽ tải toàn bộ giao dịch và danh mục hiện có trên máy này lên Supabase Cloud. Tiếp tục?"
      )
    ) {
      setIsActionLoading(true);
      setActionMessage(null);
      const res = await syncService.uploadAllLocalData();
      setIsActionLoading(false);
      setActionMessage({
        success: res.success,
        text: res.message
      });
    }
  };

  const handlePullAll = async () => {
    if (
      window.confirm(
        "Thao tác này sẽ tải toàn bộ dữ liệu từ Supabase Cloud về máy và cập nhật dữ liệu cục bộ. Tiếp tục?"
      )
    ) {
      setIsActionLoading(true);
      setActionMessage(null);
      const res = await syncService.pullAllRemoteData();
      setIsActionLoading(false);
      setActionMessage({
        success: res.success,
        text: res.message
      });
      if (res.success) {
        onDataReset();
      }
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConfigured = supabaseClientService.isConfigured();

  return (
    <Card variant="default" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Đồng bộ Supabase Cloud & Offline
            </h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            Lưu trữ dữ liệu trên Supabase kết hợp LocalStorage: hoạt động offline mượt mà và tự động sync khi có mạng.
          </p>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              !syncState.isOnline
                ? "bg-amber-500 animate-pulse"
                : isConfigured
                ? "bg-emerald-500"
                : "bg-slate-300 dark:bg-navy-600"
            }`}
          />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {!syncState.isOnline
              ? "Ngoại tuyến (Offline)"
              : isConfigured
              ? "Cloud đã kết nối"
              : "Chưa cấu hình"}
          </span>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-slate-50 dark:bg-navy-900/90 rounded-2xl p-4 border border-slate-100 dark:border-navy-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-navy-800 p-3 rounded-xl border border-slate-100 dark:border-navy-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Trạng thái mạng
            </span>
            <div className="flex items-center gap-2">
              {syncState.isOnline ? (
                <>
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Đang online
                  </span>
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Đang offline
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-navy-800 p-3 rounded-xl border border-slate-100 dark:border-navy-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Hàng đợi chờ Sync
            </span>
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`w-4 h-4 ${
                  syncState.pendingCount > 0 ? "text-amber-500" : "text-slate-400"
                }`}
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {syncState.pendingCount} thay đổi
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-navy-800 p-3 rounded-xl border border-slate-100 dark:border-navy-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Đồng bộ gần nhất
            </span>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {syncState.lastSyncedAt
                  ? new Date(syncState.lastSyncedAt).toLocaleString("vi-VN")
                  : "Chưa đồng bộ"}
              </span>
            </div>
          </div>
        </div>

        {/* Action result message */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              actionMessage.success
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
            }`}
          >
            {actionMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Sync Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="primary"
            onClick={handleSyncNow}
            disabled={isActionLoading || !isConfigured}
            className="flex items-center gap-2 py-2 px-4 text-xs font-bold"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isActionLoading || syncState.status === "syncing" ? "animate-spin" : ""
              }`}
            />
            <span>Đồng bộ ngay</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleUploadAll}
            disabled={isActionLoading || !isConfigured}
            className="flex items-center gap-2 py-2 px-3 text-xs font-bold"
            title="Đẩy tất cả dữ liệu từ máy lên Supabase"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Đẩy dữ liệu lên Cloud</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handlePullAll}
            disabled={isActionLoading || !isConfigured}
            className="flex items-center gap-2 py-2 px-3 text-xs font-bold"
            title="Tải tất cả dữ liệu từ Supabase về máy này"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Tải dữ liệu từ Cloud</span>
          </Button>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="space-y-4">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wide">
          <Key className="w-4 h-4 text-brand-500" />
          Thông tin cấu hình Supabase
        </h4>

        {saveSuccess && (
          <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl font-bold flex items-center gap-2 border border-emerald-200">
            <Check className="w-4 h-4" />
            Đã lưu cấu hình Supabase thành công!
          </div>
        )}

        {testResult && (
          <div
            className={`text-xs p-3 rounded-xl font-bold flex items-center gap-2 border ${
              testResult.success
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Supabase Anon Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-mono font-medium border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            className="text-xs font-bold py-2 px-5 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Lưu cấu hình</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={isTesting || !config.url || !config.anonKey}
            className="text-xs font-bold py-2 px-4 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
            <span>Kiểm tra kết nối</span>
          </Button>

          {isConfigured && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearConfig}
              className="text-xs font-semibold py-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <span>Ngắt kết nối</span>
            </Button>
          )}
        </div>
      </form>

      {/* SQL Setup Guide Accordion */}
      <div className="border border-slate-100 dark:border-navy-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-navy-900/50">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-navy-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-500" />
            <span>HƯỚNG DẪN THIẾT LẬP BẢNG DỮ LIỆU TRÊN SUPABASE (SQL SCRIPT)</span>
          </div>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide && (
          <div className="p-4 border-t border-slate-100 dark:border-navy-800 space-y-4 text-xs">
            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              <li>
                Đăng nhập hoặc đăng ký tài khoản miễn phí tại{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-500 hover:underline font-bold inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                và tạo một Project mới.
              </li>
              <li>
                Vào mục <strong>SQL Editor</strong> ở menu bên trái của Supabase Dashboard.
              </li>
              <li>
                Bấm nút <strong>"Sao chép SQL Schema"</strong> bên dưới, dán vào SQL Editor và nhấn <strong>Run</strong> để tạo các bảng <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-navy-800">transactions</code>, <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-navy-800">categories</code>, <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-navy-800">yearly_summaries</code>.
              </li>
              <li>
                Vào <strong>Project Settings &gt; API</strong>, sao chép <strong>Project URL</strong> và <strong>anon public key</strong> rồi dán vào form ở trên.
              </li>
            </ol>

            <div className="relative">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Mã SQL tạo bảng và phân quyền RLS:
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-navy-800 hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-navy-700 font-bold transition-all text-[11px]"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép SQL Schema</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-60">
                {SQL_SCHEMA}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SupabaseSyncSettings;
