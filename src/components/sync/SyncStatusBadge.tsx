import React, { useState, useEffect } from "react";
import { Cloud, CloudCheck, CloudOff, RefreshCw, CloudAlert } from "lucide-react";
import { syncService, type SyncState } from "../../services/syncService";

interface SyncStatusBadgeProps {
  onOpenSettings?: () => void;
  className?: string;
  showText?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  onOpenSettings,
  className = "",
  showText = true
}) => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getState());
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
      if (state.status === "synced") {
        setJustSynced(true);
        const timer = setTimeout(() => setJustSynced(false), 3000);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncState.status === "unconfigured") {
      onOpenSettings?.();
    } else {
      syncService.sync();
    }
  };

  const formatLastSyncTime = (isoString: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Rendering based on status
  let badgeContent = null;

  if (syncState.status === "unconfigured") {
    badgeContent = (
      <button
        onClick={handleClick}
        title="Chưa kết nối Supabase Cloud. Bấm để cấu hình."
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400 transition-all border border-slate-200/50 dark:border-navy-700 cursor-pointer ${className}`}
      >
        <Cloud className="w-3.5 h-3.5 text-slate-400" />
        {showText && <span>Chưa kết nối Cloud</span>}
      </button>
    );
  } else if (!syncState.isOnline || syncState.status === "offline") {
    badgeContent = (
      <button
        onClick={handleClick}
        title={`Đang ngoại tuyến. Dữ liệu lưu cục bộ và sẽ tự động đồng bộ khi có mạng. (${syncState.pendingCount} mục chờ sync)`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition-all cursor-pointer ${className}`}
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-500" />
        {showText && (
          <span>
            Ngoại tuyến {syncState.pendingCount > 0 ? `(${syncState.pendingCount})` : ""}
          </span>
        )}
      </button>
    );
  } else if (syncState.status === "syncing") {
    badgeContent = (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-brand-500 animate-spin" />
        {showText && <span>Đang đồng bộ...</span>}
      </div>
    );
  } else if (syncState.status === "error") {
    badgeContent = (
      <button
        onClick={handleClick}
        title={syncState.lastError || "Lỗi đồng bộ Supabase. Bấm để thử lại."}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 cursor-pointer ${className}`}
      >
        <CloudAlert className="w-3.5 h-3.5 text-rose-500" />
        {showText && <span>Lỗi đồng bộ (Thử lại)</span>}
      </button>
    );
  } else if (syncState.pendingCount > 0) {
    badgeContent = (
      <button
        onClick={handleClick}
        title={`${syncState.pendingCount} mục chờ đồng bộ. Bấm để đồng bộ ngay.`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 cursor-pointer ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
        {showText && <span>{syncState.pendingCount} chờ sync</span>}
      </button>
    );
  } else {
    // Synced
    badgeContent = (
      <button
        onClick={handleClick}
        title={`Đã đồng bộ lên Supabase Cloud ${syncState.lastSyncedAt ? `lúc ${formatLastSyncTime(syncState.lastSyncedAt)}` : ""}. Bấm để đồng bộ lại.`}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
          justSynced
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300"
            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50"
        } border transition-all cursor-pointer ${className}`}
      >
        <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
        {showText && (
          <span>
            {justSynced
              ? "Vừa đồng bộ"
              : syncState.lastSyncedAt
              ? `Đã sync ${formatLastSyncTime(syncState.lastSyncedAt)}`
              : "Đã đồng bộ"}
          </span>
        )}
      </button>
    );
  }

  return badgeContent;
};

export default SyncStatusBadge;
