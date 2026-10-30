import React, { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "../../services/authService";
import { syncService } from "../../services/syncService";
import type { AuthUser } from "../../types";
import Button from "../ui/Button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    if (tab === "register") {
      if (password.length < 6) {
        setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Mật khẩu nhập lại không trùng khớp.");
        return;
      }

      setIsLoading(true);
      const res = await authService.signUp(email, password);
      setIsLoading(false);

      if (res.success) {
        if (res.user) {
          // Auto signed in — sync all local data to this account
          syncService.syncAfterLogin(res.user.id);
          onSuccess?.(res.user);
          onClose();
        } else {
          setSuccessMessage(res.message);
        }
      } else {
        setErrorMessage(res.message);
      }
    } else {
      // Login
      setIsLoading(true);
      const res = await authService.signIn(email, password);
      setIsLoading(false);

      if (res.success && res.user) {
        // Sync all local data to this account, then load remote data
        syncService.syncAfterLogin(res.user.id);
        onSuccess?.(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsLoading(true);
    const res = await authService.signInWithGoogle();
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.message);
    }
    // If success, browser redirects to Google — modal stays open briefly
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-navy-850 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-navy-700 overflow-hidden relative animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-750 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-navy-800">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
              {tab === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {tab === "login" ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Dữ liệu tài chính riêng tư, đồng bộ an toàn qua Supabase Cloud.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-navy-800 p-1 mt-4">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "register"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Địa chỉ Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Register only) */}
          {tab === "register" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Xác nhận mật khẩu
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="w-full py-2.5 font-bold text-xs flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : tab === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký tài khoản</span>
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-200 dark:bg-navy-700" />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">hoặc</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-navy-700" />
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-750 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {/* Google icon SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Đăng nhập với Google</span>
          </button>

          {/* Guest fallback option */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors"
            >
              Tiếp tục dùng thử (Không cần tài khoản)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
