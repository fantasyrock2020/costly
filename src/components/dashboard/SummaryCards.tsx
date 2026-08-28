import React from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { t } from "../../utils/translations";
import { formatCurrency } from "../../utils/currency";
import { Card } from "../ui/Card";

interface SummaryCardsProps {
  currentIncome: number;
  currentExpense: number;
  prevIncome: number;
  prevExpense: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  currentIncome,
  currentExpense,
  prevIncome,
  prevExpense
}) => {
  const currentBalance = currentIncome - currentExpense;
  const prevBalance = prevIncome - prevExpense;

  // Calculate percentage change vs previous month
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return change;
  };

  const balanceChange = calculateChange(currentBalance, prevBalance);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. BALANCE CARD (Most Prominent - Horizon UI Brand Style) */}
      <Card variant="brand" className="relative overflow-hidden horizon-card-hover group">
        <div className="absolute -right-4 -bottom-6 text-white/10 group-hover:scale-110 transition-transform duration-300">
          <Wallet className="w-36 h-36" />
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold opacity-80 uppercase tracking-wider">
              {t.dashboard.balance}
            </span>
            <span className="p-2 rounded-xl bg-white/20 text-white">
              <Wallet className="w-5 h-5" />
            </span>
          </div>

          <div className="my-5">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight select-all">
              {formatCurrency(currentBalance)}
            </h3>
          </div>

          <div>
            {balanceChange !== null ? (
              <span className="flex items-center gap-1 text-xs font-bold bg-white/20 py-1 px-2.5 rounded-lg w-max">
                {balanceChange >= 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{balanceChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{balanceChange.toFixed(1)}%</span>
                  </>
                )}
                <span className="opacity-80 font-normal"> {t.dashboard.vsPreviousMonth}</span>
              </span>
            ) : (
              <span className="text-xs opacity-60 font-medium">Không có dữ liệu tháng trước</span>
            )}
          </div>
        </div>
      </Card>

      {/* 2. INCOME CARD */}
      <Card variant="default" className="flex items-center justify-between border-l-4 border-l-income horizon-card-hover">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {t.dashboard.income}
          </span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white select-all">
            {formatCurrency(currentIncome)}
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <span className="text-income">↑</span> Ghi nhận tháng này
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-income/10 text-income dark:bg-income/20">
          <ArrowUpRight className="w-6 h-6" />
        </div>
      </Card>

      {/* 3. EXPENSE CARD */}
      <Card variant="default" className="flex items-center justify-between border-l-4 border-l-expense horizon-card-hover">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {t.dashboard.expense}
          </span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white select-all">
            {formatCurrency(currentExpense)}
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <span className="text-expense">↓</span> Đã chi tiêu tháng này
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-expense/10 text-expense dark:bg-expense/20">
          <ArrowDownLeft className="w-6 h-6" />
        </div>
      </Card>
    </div>
  );
};

export default SummaryCards;
