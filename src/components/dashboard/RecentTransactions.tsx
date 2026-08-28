import React from "react";
import { ArrowRight, Calendar } from "lucide-react";
import type { Transaction } from "../../types";
import { t } from "../../utils/translations";
import { formatCurrency } from "../../utils/currency";
import { formatGroupDate } from "../../utils/date";
import { Card } from "../ui/Card";

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll: () => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
  onEditTransaction
}) => {
  const displayTransactions = transactions.slice(0, 7); // Display up to 7 recent items

  return (
    <Card variant="default" className="flex flex-col h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          {t.dashboard.recentTransactions}
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-brand-500 dark:text-brand-dark-500 hover:text-brand-600 dark:hover:text-white transition-colors flex items-center gap-1 group/btn"
        >
          <span>{t.dashboard.viewAll}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
        </button>
      </div>

      {/* Transaction List */}
      {displayTransactions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2">
          <span className="text-4xl">🌱</span>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            {t.dashboard.noRecentTransactions}
          </p>
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-slate-50 dark:divide-navy-700/50">
          {displayTransactions.map((tx, idx) => {
            const isIncome = tx.type === "income";
            const dateStr = formatGroupDate(tx.date);

            // Separate emoji and category name if combined
            const firstSpaceIdx = tx.category.indexOf(" ");
            const emoji = firstSpaceIdx > -1 ? tx.category.substring(0, firstSpaceIdx) : "📦";
            const categoryName = firstSpaceIdx > -1 ? tx.category.substring(firstSpaceIdx + 1) : tx.category;

            // Details subtitle: location or note
            const details = [
              categoryName,
              tx.location,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={tx.id}
                onClick={() => onEditTransaction(tx)}
                className={`flex items-center justify-between py-3.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-navy-700/30 rounded-xl px-2 transition-all duration-200 ${
                  idx > 0 ? "border-t border-slate-100 dark:border-navy-700/20" : ""
                }`}
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-navy-700 flex items-center justify-center text-xl shrink-0">
                    {emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {tx.note || categoryName}
                    </h4>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {details}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Date */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-extrabold block ${
                      isIncome ? "text-income" : "text-expense"
                    }`}
                  >
                    {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                  </span>
                  
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default RecentTransactions;
