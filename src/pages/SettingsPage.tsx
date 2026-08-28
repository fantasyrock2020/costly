import React, { useState, useMemo } from "react";
import { Trash2, Download, Upload, Plus, Edit2, Check, X, ShieldAlert } from "lucide-react";
import type { Category, AppMetadata } from "../types";
import { t } from "../utils/translations";
import { transactionService } from "../services/transactionService";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";

interface SettingsPageProps {
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  metadata: AppMetadata;
  onMetadataChange: (metadata: AppMetadata) => void;
  onDataReset: () => void;
  onClearDemoData: () => void;
}

const EMOJI_SUGGESTIONS = [
  "🍜", "🛒", "🚗", "🏠", "💡", "💊", "🎮", "✈️", "📚", "💻", "❤️", "💼", "💰", "📈", "🎁", "🏦", "📦", "🍔", "🚕", "👕", "🍿", "🏥", "⚽"
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  categories,
  onCategoriesChange,
  onDataReset
}) => {
  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
  const [newCatEmoji, setNewCatEmoji] = useState("📦");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [catErrorMessage, setCatErrorMessage] = useState("");

  // Editing Category State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Handle export JSON
  const handleExport = () => {
    try {
      const dataStr = transactionService.exportBackup();
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `cashflow-backup-${new Date().getFullYear()}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      alert(`Xuất dữ liệu thất bại. ${e}`);
    }
  };

  // Handle import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;

      if (window.confirm("Bạn có chắc chắn muốn nhập dữ liệu từ file này? Dữ liệu hiện tại có thể bị ghi đè.")) {
        const importResult = transactionService.importBackup(result);
        if (importResult.success) {
          alert(t.settings.importSuccess);
          onDataReset(); // Reload all states in App.tsx
        } else {
          alert(importResult.error || t.settings.importError);
        }
      }
      // Reset input
      e.target.value = "";
    };
  };

  // Clear all data
  const handleClearAll = () => {
    if (window.confirm(t.settings.clearAllConfirm)) {
      if (window.confirm("XÁC NHẬN LẦN CUỐI: Hành động này sẽ dọn sạch LocalStorage. Bạn chắc chắn chứ?")) {
        transactionService.clearAllData();
        onDataReset();
        alert("Đã xóa toàn bộ dữ liệu ứng dụng.");
      }
    }
  };

  // Add category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatErrorMessage("Tên danh mục không được để trống.");
      return;
    }

    const nameExists = categories.some(
      c => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.type === newCatType
    );
    if (nameExists) {
      setCatErrorMessage("Tên danh mục này đã tồn tại.");
      return;
    }

    const newCategory: Category = {
      id: `custom-cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatEmoji,
      type: newCatType,
      isCustom: true
    };

    const updated = [...categories, newCategory];
    onCategoriesChange(updated);

    // Reset input states
    setNewCatName("");
    setNewCatEmoji("📦");
    setCatErrorMessage("");
    setShowEmojiPicker(false);
  };

  // Delete category
  const handleDeleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    if (window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.icon} ${cat.name}"?`)) {
      const updated = categories.filter(c => c.id !== id);
      onCategoriesChange(updated);
    }
  };

  // Start editing category
  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  // Save renamed category
  const saveRename = (id: string) => {
    if (!editingCatName.trim()) return;
    const updated = categories.map(c => {
      if (c.id === id) {
        return { ...c, name: editingCatName.trim() };
      }
      return c;
    });
    onCategoriesChange(updated);
    setEditingCatId(null);
    setEditingCatName("");
  };

  // Group categories for manager view
  const expenseCategories = useMemo(() => categories.filter(c => c.type === "expense"), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === "income"), [categories]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* 1. Categories Management */}
      <Card variant="default" className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
            {t.settings.categories}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            Thêm danh mục riêng hoặc chỉnh sửa các danh mục hiện có.
          </p>
        </div>

        {/* Add new Category Form */}
        <form onSubmit={handleAddCategory} className="bg-slate-50 dark:bg-navy-900 p-4 rounded-2xl border border-slate-100 dark:border-navy-800/80 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-500" />
            TẠO DANH MỤC MỚI
          </h4>
          
          {catErrorMessage && (
            <div className="text-[11px] text-red-500 font-bold bg-red-50 dark:bg-red-950/25 p-2 rounded-lg">
              {catErrorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-end gap-3">
            {/* Name Input */}
            <div className="flex-1 space-y-1.5 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tên danh mục</label>
              <input
                type="text"
                placeholder={t.settings.categoryNamePlaceholder}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none h-[38px]"
              />
            </div>

            {/* Type selector */}
            <div className="space-y-1.5 w-full sm:w-32">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Loại</label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 text-slate-800 dark:text-white outline-none h-[38px] cursor-pointer"
              >
                <option value="expense">{t.common.expense}</option>
                <option value="income">{t.common.income}</option>
              </select>
            </div>

            {/* Emoji Selector Button */}
            <div className="space-y-1.5 w-full sm:w-20 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Biểu tượng</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full border border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-navy-800 h-[38px] flex items-center justify-center text-xl hover:bg-slate-50 dark:hover:bg-navy-750 transition-colors"
              >
                {newCatEmoji}
              </button>
            </div>

            <Button type="submit" variant="primary" className="h-[38px] w-full sm:w-auto shrink-0 px-5">
              <span>{t.common.add}</span>
            </Button>
          </div>

          {/* Emojis Suggestion List */}
          {showEmojiPicker && (
            <div className="p-3 bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700 rounded-xl shadow-lg animate-slide-down">
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Chọn biểu tượng gợi ý:</span>
              <div className="flex flex-wrap gap-2">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewCatEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-slate-50 dark:hover:bg-navy-700/80 active:scale-95 transition-all ${
                      newCatEmoji === emoji ? "bg-brand-50 dark:bg-navy-750 border border-brand-500/50" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Categories Manager list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Expense Categories List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-expense flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-expense block" />
              DANH MỤC CHI TIÊU ({expenseCategories.length})
            </h4>
            <div className="border border-slate-100 dark:border-navy-850 rounded-2xl divide-y divide-slate-100 dark:divide-navy-800 max-h-[220px] overflow-y-auto pr-1">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{cat.icon}</span>
                    {editingCatId === cat.id ? (
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="px-2 py-0.5 border border-slate-200 dark:border-navy-700 rounded bg-white dark:bg-navy-800 text-xs font-semibold outline-none focus:border-brand-500"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{cat.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingCatId === cat.id ? (
                      <>
                        <button
                          onClick={() => saveRename(cat.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-green-500"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-income flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-income block" />
              DANH MỤC THU NHẬP ({incomeCategories.length})
            </h4>
            <div className="border border-slate-100 dark:border-navy-850 rounded-2xl divide-y divide-slate-100 dark:divide-navy-800 max-h-[220px] overflow-y-auto pr-1">
              {incomeCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{cat.icon}</span>
                    {editingCatId === cat.id ? (
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="px-2 py-0.5 border border-slate-200 dark:border-navy-700 rounded bg-white dark:bg-navy-800 text-xs font-semibold outline-none focus:border-brand-500"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{cat.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingCatId === cat.id ? (
                      <>
                        <button
                          onClick={() => saveRename(cat.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-green-500"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          title="Đổi tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Data Backup and Restore Operations */}
      <Card variant="default" className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
            {t.settings.data}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            Xuất sao lưu tệp JSON hoặc khôi phục dữ liệu dòng tiền của bạn.
          </p>
        </div>

        {/* Action button triggers */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Export JSON */}
          <Button
            variant="secondary"
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Download className="w-4.5 h-4.5" />
            <span>{t.settings.exportData}</span>
          </Button>

          {/* Import JSON file input */}
          <label className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-navy-700 dark:hover:bg-navy-600 text-slate-800 dark:text-white cursor-pointer transition-all active:scale-95 h-[44px]">
            <Upload className="w-4.5 h-4.5" />
            <span>{t.settings.importData}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Warning destructive buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50 dark:border-navy-800/80">
          <Button
            variant="danger"
            onClick={handleClearAll}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4.5 h-4.5" />
            <span>{t.settings.clearAllData}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
