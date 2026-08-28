import React from "react";
import { Sparkles, Coins, Wallet2, BarChart2 } from "lucide-react";
import { t } from "../../utils/translations";
import Button from "../ui/Button";

interface OnboardingScreenProps {
  onStart: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-brand-50 to-slate-100 dark:from-navy-950 dark:to-navy-900 flex items-center justify-center p-4">
      {/* Glow effects for premium finish */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md bg-white/80 dark:bg-navy-800/80 backdrop-blur-xl border border-white/20 dark:border-navy-700/50 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-8 max-h-[90vh] overflow-y-auto relative z-10">
        {/* Brand Icon logo */}
        <div className="w-20 h-20 bg-brand-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/20 relative animate-pulse">
          <Wallet2 className="w-10 h-10" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-navy-800" />
        </div>

        {/* Text descriptions */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight whitespace-pre-line">
            {t.onboarding.title}
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 leading-relaxed whitespace-pre-line">
            {t.onboarding.subtitle}
          </p>
        </div>

        {/* Dynamic points visualizer */}
        <div className="w-full space-y-4 py-2 border-y border-slate-100 dark:border-navy-700/80">
          <div className="flex items-center gap-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <Coins className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 dark:text-white">Ghi chép siêu tốc</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Nhập số tiền và chọn phân loại trong 3 giây.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500 shrink-0">
              <BarChart2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 dark:text-white">Báo cáo trực quan</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Biểu đồ dòng tiền và cơ cấu chi tiêu trực quan.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-white" />
          <span>{t.onboarding.startButton}</span>
        </Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
