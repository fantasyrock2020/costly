import React, { useState, useMemo, useEffect } from "react";
import { Search, Calendar, ListFilter, Plus } from "lucide-react";
import type { Transaction } from "../types";
import { t } from "../utils/translations";
import { getPreviousMonth, getTodayISO } from "../utils/date";
import { transactionService } from "../services/transactionService";
import TransactionList from "../components/transactions/TransactionList";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";

interface TransactionsPageProps {
  transactions: Transaction[];
  selectedYear: number;
  selectedMonth: number;
  onOpenAddModal: (type?: "income" | "expense" | null) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  selectedYear,
  selectedMonth,
  onOpenAddModal,
  onEditTransaction
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<"this-month" | "last-month" | "this-year" | "custom">("this-month");
  
  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayISO());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayISO());

  const categories = useMemo(() => transactionService.getCategories(), []);

  // Filter categories by type for the dropdown selector
  const availableCategoriesForSelect = useMemo(() => {
    if (filterType === "all") return categories;
    return categories.filter(c => c.type === filterType);
  }, [categories, filterType]);

  // Reset category filter if it's not applicable to the current transaction type filter
  useEffect(() => {
    if (filterCategory !== "all") {
      const exists = availableCategoriesForSelect.some(c => `${c.icon} ${c.name}` === filterCategory);
      if (!exists) setFilterCategory("all");
    }
  }, [filterType, availableCategoriesForSelect, filterCategory]);

  // Filtered transactions calculation
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter by search query (note, location, category)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(query) || false;
        const locMatch = tx.location?.toLowerCase().includes(query) || false;
        const catMatch = tx.category.toLowerCase().includes(query);
        if (!noteMatch && !locMatch && !catMatch) return false;
      }

      // 2. Filter by Transaction Type (income / expense)
      if (filterType !== "all" && tx.type !== filterType) {
        return false;
      }

      // 3. Filter by Category
      if (filterCategory !== "all" && tx.category !== filterCategory) {
        return false;
      }

      // 4. Filter by Date range
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;

      if (dateFilterType === "this-month") {
        if (txYear !== selectedYear || txMonth !== selectedMonth) return false;
      } else if (dateFilterType === "last-month") {
        const prev = getPreviousMonth(selectedYear, selectedMonth);
        if (txYear !== prev.year || txMonth !== prev.month) return false;
      } else if (dateFilterType === "this-year") {
        // filter by current system year or selected year
        if (txYear !== selectedYear) return false;
      } else if (dateFilterType === "custom") {
        if (tx.date < customStartDate || tx.date > customEndDate) return false;
      }

      return true;
    });
  }, [
    transactions,
    searchQuery,
    filterType,
    filterCategory,
    dateFilterType,
    selectedYear,
    selectedMonth,
    customStartDate,
    customEndDate
  ]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top filter section */}
      <Card variant="default" className="space-y-4">
        {/* Search & Add Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 h-[44px] rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-sm font-semibold outline-none focus:border-brand-500 dark:focus:border-brand-dark-500 transition-colors"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => onOpenAddModal(null)}
            className="flex items-center gap-2 h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm giao dịch</span>
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Type Tabs */}
          <div className="flex bg-slate-50 dark:bg-navy-900 p-1 rounded-xl border border-slate-100 dark:border-navy-800/80">
            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === "all"
                  ? "bg-white dark:bg-navy-700 text-brand-500 dark:text-white shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              {t.common.all}
            </button>
            <button
              onClick={() => setFilterType("income")}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === "income"
                  ? "bg-white dark:bg-navy-700 text-income shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              {t.common.income}
            </button>
            <button
              onClick={() => setFilterType("expense")}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === "expense"
                  ? "bg-white dark:bg-navy-700 text-expense shadow-sm"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              }`}
            >
              {t.common.expense}
            </button>
          </div>

          {/* 2. Category Dropdown */}
          <div className="relative">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-brand-500/50 appearance-none h-[38px] cursor-pointer"
            >
              <option value="all">Danh mục: Tất cả</option>
              {availableCategoriesForSelect.map(cat => (
                <option key={cat.id} value={`${cat.icon} ${cat.name}`}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date Selection Dropdown */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl outline-none focus:ring-1 focus:ring-brand-500/50 appearance-none h-[38px] cursor-pointer"
            >
              <option value="this-month">Thời gian: Tháng này</option>
              <option value="last-month">Thời gian: Tháng trước</option>
              <option value="this-year">Thời gian: Năm nay</option>
              <option value="custom">Thời gian: Tùy chọn</option>
            </select>
          </div>
        </div>

        {/* Inline custom date range picker */}
        {dateFilterType === "custom" && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-50 dark:border-navy-800/80 animate-slide-down">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Từ ngày</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold outline-none"
              />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Đến ngày</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold outline-none"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Grouped transaction history timeline */}
      <TransactionList
        transactions={filteredTransactions}
        onEditTransaction={onEditTransaction}
      />
    </div>
  );
};

export default TransactionsPage;
