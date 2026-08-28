import React from "react";
import { PlusCircle, MinusCircle } from "lucide-react";
import { t } from "../../utils/translations";

interface QuickActionsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAddIncome, onAddExpense }) => {
  return (
    <div className="flex gap-4">
      {/* Add Income Shortcut */}
      <button
        onClick={onAddIncome}
        className="flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700/60 shadow-sm text-sm font-bold text-slate-800 dark:text-white hover:border-income/40 dark:hover:border-income/40 active:scale-98 transition-all hover:shadow-md h-[56px]"
      >
        <PlusCircle className="w-5 h-5 text-income" />
        <span>{t.dashboard.quickAddIncome}</span>
      </button>

      {/* Add Expense Shortcut */}
      <button
        onClick={onAddExpense}
        className="flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700/60 shadow-sm text-sm font-bold text-slate-800 dark:text-white hover:border-expense/40 dark:hover:border-expense/40 active:scale-98 transition-all hover:shadow-md h-[56px]"
      >
        <MinusCircle className="w-5 h-5 text-expense" />
        <span>{t.dashboard.quickAddExpense}</span>
      </button>
    </div>
  );
};

export default QuickActions;
