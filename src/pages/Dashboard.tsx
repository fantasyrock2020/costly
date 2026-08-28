import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Transaction } from "../types";
import { t } from "../utils/translations";
import { getPreviousMonth } from "../utils/date";
import SummaryCards from "../components/dashboard/SummaryCards";
import QuickActions from "../components/dashboard/QuickActions";
import CashFlowChart from "../components/charts/CashFlowChart";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import Button from "../components/ui/Button";

interface DashboardProps {
  transactions: Transaction[];
  selectedYear: number;
  selectedMonth: number;
  onNavigate: (page: "dashboard" | "transactions" | "statistics" | "settings") => void;
  onOpenAddModal: (type?: "income" | "expense" | null) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  selectedYear,
  selectedMonth,
  onNavigate,
  onOpenAddModal,
  onEditTransaction
}) => {
  // 1. Filter current month transactions
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // 2. Compute current month's income & expense
  const currentSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    currentMonthTransactions.forEach(t => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return { income, expense };
  }, [currentMonthTransactions]);

  // 3. Compute previous month's income & expense for comparison
  const prevSummary = useMemo(() => {
    const prev = getPreviousMonth(selectedYear, selectedMonth);
    const prevTxs = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getFullYear() === prev.year && (txDate.getMonth() + 1) === prev.month;
    });

    let income = 0;
    let expense = 0;
    prevTxs.forEach(t => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });
    return { income, expense };
  }, [transactions, selectedYear, selectedMonth]);

  // 4. Sort transactions by updatedAt / date for recent list (overall transactions)
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      // Sort primarily by date desc, then by createdAt desc
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [transactions]);

  const hasAnyTransactions = transactions.length > 0;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* If database is completely empty, show onboarding/empty state */}
      {!hasAnyTransactions ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-navy-800 rounded-3xl border border-slate-100 dark:border-navy-700/50 shadow-sm space-y-6">
          <div className="w-20 h-20 bg-brand-50 dark:bg-navy-700 rounded-full flex items-center justify-center text-4xl animate-bounce">
            💵
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
              {t.empty.noTransactions}
            </h2>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-sm">
              {t.empty.noTransactionsSub}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onOpenAddModal(null)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm giao dịch đầu tiên</span>
          </Button>
        </div>
      ) : (
        <>
          {/* Main Financial Cards */}
          <SummaryCards
            currentIncome={currentSummary.income}
            currentExpense={currentSummary.expense}
            prevIncome={prevSummary.income}
            prevExpense={prevSummary.expense}
          />

          {/* Quick Actions Shortcuts */}
          <QuickActions
            onAddIncome={() => onOpenAddModal("income")}
            onAddExpense={() => onOpenAddModal("expense")}
          />

          {/* Main Content Grid: Chart & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart - Spans 2 columns on large screens */}
            <div className="lg:col-span-2">
              <CashFlowChart
                transactions={currentMonthTransactions}
                year={selectedYear}
                month={selectedMonth}
              />
            </div>
            
            {/* Recent list - Spans 1 column */}
            <div>
              <RecentTransactions
                transactions={recentTransactions}
                onViewAll={() => onNavigate("transactions")}
                onEditTransaction={onEditTransaction}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
