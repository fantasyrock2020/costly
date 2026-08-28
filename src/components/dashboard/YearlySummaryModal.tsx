import React from "react";
import { Sparkles, Receipt, Award } from "lucide-react";
import type { YearSummary } from "../../types";
import { t } from "../../utils/translations";
import { formatCurrency } from "../../utils/currency";
import Button from "../ui/Button";

interface YearlySummaryModalProps {
  summary: YearSummary;
  onClose: () => void;
}

export const YearlySummaryModal: React.FC<YearlySummaryModalProps> = ({ summary, onClose }) => {
  const savingsRate = summary.totalIncome > 0 
    ? Math.round((summary.balance / summary.totalIncome) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-navy-900 rounded-3xl shadow-2xl p-6 border border-slate-100 dark:border-navy-700/50 text-center relative overflow-hidden"
        role="dialog"
      >
        {/* Confetti-like gradient background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-purple-500/5 pointer-events-none" />

        {/* Top Trophy Icon */}
        <div className="mx-auto w-16 h-16 bg-brand-50 dark:bg-navy-800 text-brand-500 rounded-full flex items-center justify-center text-3xl mb-4 relative z-10 animate-pulse">
          <Award className="w-8 h-8 text-brand-500 dark:text-brand-dark-500" />
        </div>

        <div className="space-y-2 relative z-10">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {t.yearlySummary.title.replace("{year}", summary.year.toString())}
          </h2>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Chúc mừng bạn đã hoàn thành một năm quản lý tài chính!
          </p>
        </div>

        {/* Financial metrics grid */}
        <div className="grid grid-cols-2 gap-3.5 my-6 relative z-10">
          {/* Income */}
          <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.yearlySummary.totalIncome}
            </span>
            <span className="text-sm font-extrabold text-income mt-1">
              +{formatCurrency(summary.totalIncome)}
            </span>
          </div>

          {/* Expense */}
          <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.yearlySummary.totalExpense}
            </span>
            <span className="text-sm font-extrabold text-expense mt-1">
              -{formatCurrency(summary.totalExpense)}
            </span>
          </div>

          {/* Saved */}
          <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.yearlySummary.saved}
            </span>
            <span className={`text-sm font-extrabold mt-1 ${summary.balance >= 0 ? "text-income" : "text-expense"}`}>
              {summary.balance >= 0 ? "+" : ""}
              {formatCurrency(summary.balance)}
            </span>
          </div>

          {/* Savings Rate */}
          <div className="p-3 bg-slate-50 dark:bg-navy-800 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {t.yearlySummary.savingsRate}
            </span>
            <span className="text-sm font-black text-slate-700 dark:text-white mt-1">
              {savingsRate}%
            </span>
          </div>
        </div>

        {/* Total transactions info */}
        <div className="p-4 bg-brand-50/30 dark:bg-navy-800/80 border border-brand-100/10 dark:border-navy-700/80 rounded-2xl flex items-center justify-between mb-6 relative z-10">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-400" />
            {t.yearlySummary.txCount}
          </span>
          <span className="text-sm font-black text-slate-800 dark:text-white">
            {summary.transactionCount}
          </span>
        </div>

        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-relaxed mb-6">
          {t.yearlySummary.archiveNotice.replace("{year}", summary.year.toString())}
        </p>

        <div className="relative z-10">
          <Button
            variant="primary"
            onClick={onClose}
            fullWidth
            className="flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.yearlySummary.closeButton}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default YearlySummaryModal;
