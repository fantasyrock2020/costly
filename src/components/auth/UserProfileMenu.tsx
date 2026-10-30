import React, { useState, useEffect, useRef } from "react";
import { LogIn, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { authService } from "../../services/authService";
import { syncService } from "../../services/syncService";
import type { AuthUser } from "../../types";

interface UserProfileMenuProps {
  onOpenAuthModal: () => void;
  className?: string;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ onOpenAuthModal, className = "" }) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await authService.signOut();
    syncService.sync();
  };

  if (!user) {
    return (
      <button
        onClick={onOpenAuthModal}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 transition-all cursor-pointer ${className}`}
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Đăng nhập</span>
      </button>
    );
  }

  // Get display name or short email
  const displayEmail = user.email.split("@")[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-navy-700 transition-all cursor-pointer"
        aria-label="Tài khoản người dùng"
      >
        <div className="w-5 h-5 rounded-lg bg-brand-500 text-white flex items-center justify-center text-[10px] uppercase font-black">
          {displayEmail.charAt(0)}
        </div>
        <span className="max-w-[100px] truncate">{displayEmail}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-850 rounded-2xl shadow-xl border border-slate-100 dark:border-navy-700 p-2 z-50 animate-slide-down">
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-navy-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tài khoản đang đăng nhập
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white truncate block mt-0.5" title={user.email}>
              {user.email}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>Dữ liệu riêng tư (RLS)</span>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
