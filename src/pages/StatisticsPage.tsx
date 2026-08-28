import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, PiggyBank, Lightbulb } from "lucide-react";
import type { Transaction } from "../types";
import { t } from "../utils/translations";
import { formatCurrency } from "../utils/currency";
import { getPreviousMonth, getTodayISO } from "../utils/date";
import CategoryDonutChart from "../components/charts/CategoryDonutChart";
import SpendingTrendChart from "../components/charts/SpendingTrendChart";
import { Card } from "../components/ui/Card";

interface StatisticsPageProps {
  transactions: Transaction[];
  selectedYear: number;
  selectedMonth: number;
}

type PeriodType = "this-month" | "last-month" | "this-year" | "custom";

export const StatisticsPage: React.FC<StatisticsPageProps> = ({
  transactions,
  selectedYear,
  selectedMonth
}) => {
  const [period, setPeriod] = useState<PeriodType>("this-month");
  
  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayISO());

  // 1. Get filtered transactions based on the selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;

      if (period === "this-month") {
        return txYear === selectedYear && txMonth === selectedMonth;
      } else if (period === "last-month") {
        const prev = getPreviousMonth(selectedYear, selectedMonth);
        return txYear === prev.year && txMonth === prev.month;
      } else if (period === "this-year") {
        return txYear === selectedYear;
      } else {
        // custom
        return tx.date >= customStartDate && tx.date <= customEndDate;
      }
    });
  }, [transactions, period, selectedYear, selectedMonth, customStartDate, customEndDate]);

  // 2. Compute period summary metrics (Income, Expense, Savings, Savings Rate)
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    periodTransactions.forEach(t => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    return {
      income,
      expense,
      savings,
      savingsRate,
      count: periodTransactions.length
    };
  }, [periodTransactions]);

  // 3. Compute Category breakdown for Expenses
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    let totalExpense = 0;

    periodTransactions.forEach(t => {
      if (t.type === "expense") {
        map[t.category] = (map[t.category] || 0) + t.amount;
        totalExpense += t.amount;
      }
    });

    return Object.keys(map)
      .map(cat => ({
        category: cat,
        amount: map[cat],
        percentage: totalExpense > 0 ? Math.round((map[cat] / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions]);

  // 4. Compute Category breakdown for Income
  const incomeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    let totalIncome = 0;

    periodTransactions.forEach(t => {
      if (t.type === "income") {
        map[t.category] = (map[t.category] || 0) + t.amount;
        totalIncome += t.amount;
      }
    });

    return Object.keys(map)
      .map(cat => ({
        category: cat,
        amount: map[cat],
        percentage: totalIncome > 0 ? Math.round((map[cat] / totalIncome) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions]);

  // 5. Generate dynamically calculated insights (No AI, pure calculations)
  const insights = useMemo(() => {
    const list: string[] = [];

    if (periodTransactions.length === 0) return list;

    // Insight 1: MoM Spending change (only applicable when viewing "this-month" and we have previous month data)
    if (period === "this-month") {
      const prev = getPreviousMonth(selectedYear, selectedMonth);
      const prevTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() === prev.year && (txDate.getMonth() + 1) === prev.month;
      });

      const prevExpense = prevTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      
      if (prevExpense > 0) {
        const diffPercent = ((summary.expense - prevExpense) / prevExpense) * 100;
        if (diffPercent < 0) {
          list.push(
            t.statistics.insightImprovement.replace("{percent}", Math.abs(diffPercent).toFixed(0))
          );
        } else if (diffPercent > 0) {
          list.push(
            t.statistics.insightExpenseUp.replace("{percent}", diffPercent.toFixed(0))
          );
        }
      }
    }

    // Insight 2: Biggest Expense Category
    if (expenseBreakdown.length > 0) {
      const top = expenseBreakdown[0];
      list.push(
        t.statistics.insightTopExpense
          .replace("{category}", top.category)
          .replace("{percent}", top.percentage.toString())
      );
    }

    // Insight 3: Biggest Income Category
    if (incomeBreakdown.length > 0) {
      const top = incomeBreakdown[0];
      list.push(
        t.statistics.insightTopIncome
          .replace("{category}", top.category)
          .replace("{percent}", top.percentage.toString())
      );
    }

    // Insight 4: Savings rate feedback
    if (summary.income > 0) {
      if (summary.savingsRate >= 30) {
        list.push(
          t.statistics.insightSavingsHigh.replace("{rate}", summary.savingsRate.toString())
        );
      } else {
        list.push(
          t.statistics.insightSavingsLow.replace("{rate}", summary.savingsRate.toString())
        );
      }
    }

    return list;
  }, [periodTransactions, period, selectedYear, selectedMonth, transactions, summary, expenseBreakdown, incomeBreakdown]);

  const hasData = periodTransactions.length > 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* 1. Period Selector Tabs */}
      <Card variant="default" className="p-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick tab filters */}
          <div className="flex bg-slate-50 dark:bg-navy-900 p-1 rounded-xl border border-slate-100 dark:border-navy-800/80 w-full md:w-auto">
            <button
              onClick={() => setPeriod("this-month")}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === "this-month"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setPeriod("last-month")}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === "last-month"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              Tháng trước
            </button>
            <button
              onClick={() => setPeriod("this-year")}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === "this-year"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              Năm nay
            </button>
            <button
              onClick={() => setPeriod("custom")}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === "custom"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              Tùy chọn
            </button>
          </div>

          {/* Inline Custom Date inputs */}
          {period === "custom" && (
            <div className="flex items-center gap-2 w-full md:w-auto animate-slide-down">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="flex-1 md:w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold"
              />
              <span className="text-xs text-slate-400 font-bold shrink-0">đến</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="flex-1 md:w-36 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold"
              />
            </div>
          )}
        </div>
      </Card>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white dark:bg-navy-800 rounded-3xl border border-slate-100 dark:border-navy-700/50">
          <span className="text-5xl">📊</span>
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-slate-800 dark:text-white">
              {t.empty.notEnoughData}
            </h4>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-xs px-4">
              {t.empty.notEnoughDataSub}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Financial Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="default" className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-income/10 text-income dark:bg-income/20 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {t.statistics.income}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white truncate block mt-0.5">
                  {formatCurrency(summary.income)}
                </span>
              </div>
            </Card>

            <Card variant="default" className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-expense/10 text-expense dark:bg-expense/20 shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {t.statistics.expense}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white truncate block mt-0.5">
                  {formatCurrency(summary.expense)}
                </span>
              </div>
            </Card>

            <Card variant="default" className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500 dark:bg-navy-700 dark:text-white shrink-0">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {t.statistics.saved}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white truncate block mt-0.5">
                  {formatCurrency(summary.savings)}
                </span>
              </div>
            </Card>

            <Card variant="default" className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 dark:bg-navy-700 dark:text-white shrink-0">
                <span className="text-sm font-black">%</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  {t.statistics.savingsRate}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white truncate block mt-0.5">
                  {summary.savingsRate}%
                </span>
              </div>
            </Card>
          </div>

          {/* 3. Category Breakdown Pie/Donut charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryDonutChart
              data={expenseBreakdown}
              title={t.statistics.whereMoneyWent}
              type="expense"
            />
            <CategoryDonutChart
              data={incomeBreakdown}
              title={t.statistics.incomeSources}
              type="income"
            />
          </div>

          {/* 4. Spending Trend Chart */}
          <SpendingTrendChart
            transactions={transactions}
            year={selectedYear}
          />

          {/* 5. Financial Insights Card */}
          {insights.length > 0 && (
            <Card variant="default" className="bg-gradient-to-r from-brand-50/30 to-white dark:from-navy-800 dark:to-navy-800">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-navy-700/50 pb-2.5">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  {t.statistics.insightsTitle}
                </h4>
              </div>
              
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-dark-500 mt-1.5 shrink-0" />
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 6. Period Summary (At the bottom) */}
          <Card variant="outline" className="p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-white">
                  Tổng kết thời kỳ hoạt động
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  Tất cả các số liệu được tính toán động dựa trên các bộ lọc đã chọn.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Số giao dịch</span>
                  <span className="text-sm font-black text-slate-700 dark:text-white mt-0.5 block">
                    {summary.count}
                  </span>
                </div>
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-navy-700" />
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Thực thu</span>
                  <span className={`text-sm font-black mt-0.5 block ${summary.savings >= 0 ? "text-income" : "text-expense"}`}>
                    {summary.savings >= 0 ? "+" : ""}
                    {formatCurrency(summary.savings)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default StatisticsPage;
