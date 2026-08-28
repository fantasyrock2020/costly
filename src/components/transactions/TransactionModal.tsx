import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, MapPin, Calendar, FileText, Check, Trash2, ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown } from "lucide-react";
import { t } from "../../utils/translations";
import { formatCurrency, parseAmountShortcut, isValidAmountString, getAmountSuggestions } from "../../utils/currency";
import { getTodayISO } from "../../utils/date";
import type { Transaction } from "../../types";
import { transactionService } from "../../services/transactionService";
import Button from "../ui/Button";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTransaction?: Transaction | null;
  initialType?: "income" | "expense" | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction = null,
  initialType = null,
}) => {
  const isEditing = !!editingTransaction;

  // Form fields state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amountRaw, setAmountRaw] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayISO());
  const [location, setLocation] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => transactionService.getCategories(), []);
  const transactions = useMemo(() => transactionService.getTransactions(), [isOpen]);

  // Dynamic amount suggestions based on current amount typed (e.g. 1 -> 1k, 10k, 100k, 1m, 10m)
  const amountSuggestions = useMemo(() => {
    return getAmountSuggestions(amountRaw);
  }, [amountRaw]);

  // Suggest locations based on previous transactions
  const locationSuggestions = useMemo(() => {
    const locs = transactions
      .map((t) => t.location)
      .filter((loc): loc is string => !!loc && loc.trim().length > 0);
    return Array.from(new Set(locs)).slice(0, 4); // top 4 unique locations
  }, [transactions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset or initialize states when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setIsCategoryOpen(false);

      if (editingTransaction) {
        // Editing mode: load transaction details
        setType(editingTransaction.type);
        setAmountRaw(editingTransaction.amount.toString());
        setCategory(editingTransaction.category);
        setDate(editingTransaction.date);
        setLocation(editingTransaction.location || "");
        setNote(editingTransaction.note || "");
      } else {
        // Adding mode
        const lastType = (localStorage.getItem("cashflow_last_type") as "income" | "expense") || "expense";
        const targetType = initialType || lastType;
        setType(targetType);
        setAmountRaw("");
        setCategory("");
        setDate(getTodayISO());
        setLocation("");
        setNote("");
      }

      // Auto focus on amount input
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingTransaction, initialType]);

  // Smart sort categories by past usage frequency
  const sortedCategories = useMemo(() => {
    const typeTxs = transactions.filter((t) => t.type === type);
    const frequencies: Record<string, number> = {};

    typeTxs.forEach((t) => {
      frequencies[t.category] = (frequencies[t.category] || 0) + 1;
    });

    return [...categories]
      .filter((cat) => cat.type === type)
      .sort((a, b) => {
        const keyA = `${a.icon} ${a.name}`;
        const keyB = `${b.icon} ${b.name}`;
        const countA = frequencies[keyA] || 0;
        const countB = frequencies[keyB] || 0;
        return countB - countA;
      });
  }, [categories, type, transactions]);

  // Reset category selection if switching type and selected category doesn't match new type
  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    localStorage.setItem("cashflow_last_type", newType);
    setCategory(""); // Clear category so user picks a relevant one
    setIsCategoryOpen(false);
    setErrorMessage("");
  };

  if (!isOpen) return null;

  const parsedAmount = parseAmountShortcut(amountRaw);
  const isValidAmount = isValidAmountString(amountRaw) && parsedAmount > 0;

  const handleShortcutClick = (shortcutValue: string) => {
    setAmountRaw(shortcutValue);
    setErrorMessage("");
  };

  const handleSelectCategory = (catString: string) => {
    setCategory(catString);
    setErrorMessage("");
    setIsCategoryOpen(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidAmount) {
      setErrorMessage(t.common.errorInvalidAmount);
      amountInputRef.current?.focus();
      return;
    }

    if (!category) {
      setErrorMessage("Vui lòng chọn một danh mục.");
      setIsCategoryOpen(true);
      return;
    }

    if (!date) {
      setErrorMessage(t.common.errorInvalidDate);
      return;
    }

    const txData: Transaction = {
      id: isEditing ? editingTransaction.id : `tx-${Date.now()}`,
      type,
      amount: parsedAmount,
      category,
      date,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: isEditing ? editingTransaction.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = transactionService.saveTransaction(txData);
    if (result.success) {
      onSave();
      onClose();
    } else {
      setErrorMessage(result.error || t.common.errorStorage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      {/* Modal Container */}
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-navy-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-100 dark:border-navy-700/50 overflow-hidden transition-all duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-navy-800 bg-slate-50/50 dark:bg-navy-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {isEditing ? t.transaction.edit : t.transaction.add}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-shake">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Segmented Type Switcher */}
          <div className="p-1 bg-slate-100 dark:bg-navy-800 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                type === "expense"
                  ? "bg-white dark:bg-navy-700 text-expense dark:text-expense shadow-sm border border-rose-100 dark:border-rose-900/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>{t.common.expense} (Chi tiêu)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                type === "income"
                  ? "bg-white dark:bg-navy-700 text-income dark:text-income shadow-sm border border-emerald-100 dark:border-emerald-900/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{t.common.income} (Thu nhập)</span>
            </button>
          </div>

          {/* Amount Card */}
          <div className="bg-slate-50 dark:bg-navy-800/80 p-4 rounded-2xl border border-slate-100 dark:border-navy-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {t.transaction.amount}
              </label>
              {parsedAmount > 0 && (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  = {formatCurrency(parsedAmount)}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                ref={amountInputRef}
                type="text"
                pattern="[0-9kKmM.,]*"
                inputMode="text"
                placeholder="0"
                value={amountRaw}
                onChange={(e) => {
                  setAmountRaw(e.target.value);
                  setErrorMessage("");
                }}
                className={`w-full text-center text-3xl font-black bg-transparent border-b-2 py-2 outline-none transition-colors ${
                  type === "income"
                    ? "text-income border-emerald-200 dark:border-emerald-900/50 focus:border-income"
                    : "text-expense border-rose-200 dark:border-rose-900/50 focus:border-expense"
                }`}
              />
            </div>

            {/* Dynamic Suggestions Row */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {amountRaw && amountRaw.trim() ? `Gợi ý cho "${amountRaw}":` : "Gợi ý chọn nhanh:"}
                </span>
                <span>Gõ <strong className="text-slate-600 dark:text-slate-300">k</strong> (nghìn) / <strong className="text-slate-600 dark:text-slate-300">m</strong> (triệu)</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {amountSuggestions.map((shortcut) => {
                  const val = parseAmountShortcut(shortcut);
                  return (
                    <button
                      key={shortcut}
                      type="button"
                      onClick={() => handleShortcutClick(shortcut)}
                      className="py-2 px-1 rounded-xl border border-slate-200/80 dark:border-navy-600 bg-white dark:bg-navy-700 hover:bg-slate-100 dark:hover:bg-navy-600 hover:border-brand-300 dark:hover:border-brand-dark-500 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-2xs flex flex-col items-center justify-center group"
                    >
                      <span className="text-xs font-extrabold group-hover:text-brand-500 dark:group-hover:text-brand-dark-400">
                        {shortcut}
                      </span>
                      {val > 0 && (
                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-400 leading-tight">
                          {formatCurrency(val).replace(" ₫", "đ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Dropdown Selector */}
          <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
            <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{type === "expense" ? t.transaction.category : t.transaction.categoryIncome}</span>
              {category && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 lowercase">
                  Đã chọn
                </span>
              )}
            </label>

            {/* Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className={`w-full px-4 py-3 rounded-2xl border flex items-center justify-between transition-all bg-white dark:bg-navy-800 text-left shadow-2xs ${
                isCategoryOpen
                  ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-dark-500"
                  : category
                  ? "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                  : "border-slate-200 dark:border-navy-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {category ? (
                  <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {category}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <span>📂</span>
                    <span>{type === "expense" ? "Chọn danh mục chi tiêu..." : "Chọn nguồn thu nhập..."}</span>
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isCategoryOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {isCategoryOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-xl p-2.5 max-h-[230px] overflow-y-auto animate-fade-in space-y-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {sortedCategories.map((cat) => {
                    const catString = `${cat.icon} ${cat.name}`;
                    const isSelected = category === catString;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(catString)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? type === "income"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold"
                              : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold"
                            : "bg-slate-50/50 dark:bg-navy-900/50 border-slate-100 dark:border-navy-700/60 hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 font-semibold"
                        }`}
                      >
                        <span className="text-xl shrink-0">{cat.icon}</span>
                        <span className="text-xs truncate flex-1">{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Date, Location & Note Grid */}
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-navy-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {t.transaction.date}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold outline-none focus:border-brand-500 dark:focus:border-brand-dark-500 transition-colors"
                />
              </div>

              {/* Location Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {t.transaction.location}
                </label>
                <input
                  type="text"
                  placeholder={t.transaction.locationPlaceholder}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold outline-none focus:border-brand-500 dark:focus:border-brand-dark-500 transition-colors"
                />
              </div>
            </div>

            {/* Suggested Location Tags */}
            {locationSuggestions.length > 0 && !location && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-medium">Gợi ý địa điểm:</span>
                {locationSuggestions.map((suggestedLoc) => (
                  <button
                    key={suggestedLoc}
                    type="button"
                    onClick={() => setLocation(suggestedLoc)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-navy-800 dark:hover:bg-navy-700 border border-slate-200/50 dark:border-navy-700 rounded-md text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {suggestedLoc}
                  </button>
                ))}
              </div>
            )}

            {/* Note Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {t.transaction.note}
              </label>
              <input
                type="text"
                placeholder={t.transaction.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-slate-800 dark:text-white text-xs font-semibold outline-none focus:border-brand-500 dark:focus:border-brand-dark-500 transition-colors"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.transaction.deleteConfirmMessage)) {
                    transactionService.deleteTransaction(editingTransaction.id);
                    onSave();
                    onClose();
                  }
                }}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa</span>
              </button>
            )}
            <Button
              type="submit"
              variant="primary"
              className="flex-1 py-3"
              disabled={!isValidAmount || !category}
            >
              <span className="flex items-center justify-center gap-2 text-sm font-bold">
                <Check className="w-4 h-4 stroke-[3]" />
                {isEditing ? "Cập nhật giao dịch" : t.transaction.saveTx}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
