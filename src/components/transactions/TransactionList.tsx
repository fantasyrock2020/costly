import React, { useMemo } from "react";
import { MapPin, Clock } from "lucide-react";
import type { Transaction } from "../../types";
import { formatCurrency } from "../../utils/currency";
import { formatGroupDate } from "../../utils/date";

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEditTransaction
}) => {
  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    // Sort transactions by date desc, then by createdAt desc
    const sorted = [...transactions].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });

    sorted.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });

    return Object.keys(groups).map((date) => ({
      date,
      items: groups[date]
    }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-white dark:bg-navy-800 rounded-3xl border border-slate-100 dark:border-navy-700/50">
        <span className="text-5xl">🔍</span>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Không tìm thấy giao dịch nào
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs px-4">
            Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để tìm giao dịch của bạn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTransactions.map((group) => (
        <div key={group.date} className="space-y-3">
          {/* Group Header (Date) */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {formatGroupDate(group.date)}
            </span>
            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-navy-800/80" />
          </div>

          {/* Group Items */}
          <div className="space-y-2.5">
            {group.items.map((tx) => {
              const isIncome = tx.type === "income";
              
              // Extract emoji and name
              const firstSpaceIdx = tx.category.indexOf(" ");
              const emoji = firstSpaceIdx > -1 ? tx.category.substring(0, firstSpaceIdx) : "📦";
              const categoryName = firstSpaceIdx > -1 ? tx.category.substring(firstSpaceIdx + 1) : tx.category;

              // Format transaction creation time
              const txTime = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit"
              }) : "09:00";

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 dark:bg-navy-800 dark:hover:bg-navy-700/40 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-md cursor-pointer transition-all duration-200"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-navy-700 flex items-center justify-center text-2xl shrink-0">
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {tx.note || categoryName}
                      </h4>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-slate-400 dark:text-slate-500">
                        <span className="text-xs font-semibold">{categoryName}</span>
                        {tx.location && (
                          <span className="text-[10px] font-semibold flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-navy-600 block" />
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {tx.location}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-navy-600 block" />
                          <Clock className="w-3 h-3 text-slate-400" />
                          {txTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right info (Amount) */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-extrabold ${
                        isIncome ? "text-income" : "text-expense"
                      }`}
                    >
                      {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
