import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import type { Transaction, Category, AppMetadata, YearSummary } from "./types";
import { transactionService } from "./services/transactionService";
import { getTodayISO, parseISODate } from "./utils/date";
import { t } from "./utils/translations";

import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import Header from "./components/layout/Header";
import OnboardingScreen from "./components/layout/OnboardingScreen";
import TransactionModal from "./components/transactions/TransactionModal";
import YearlySummaryModal from "./components/dashboard/YearlySummaryModal";

import Dashboard from "./pages/Dashboard";
import TransactionsPage from "./pages/TransactionsPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";

type PageType = "dashboard" | "transactions" | "statistics" | "settings";

function App() {
  // App-wide state loaded from storage service
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [yearlySummaries, setYearlySummaries] = useState<YearSummary[]>([]);

  // Navigation and active view states
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default as in user request
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August

  // Onboarding controls
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [txModalType, setTxModalType] = useState<"income" | "expense" | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Year-end popup state
  const [activeYearSummaryPopup, setActiveYearSummaryPopup] = useState<YearSummary | null>(null);

  // 1. Initialize data on load
  const loadAllData = () => {
    const txList = transactionService.getTransactions();
    const catList = transactionService.getCategories();
    const meta = transactionService.getMetadata();
    const summaries = transactionService.getYearlySummaries();

    setTransactions(txList);
    setCategories(catList);
    setMetadata(meta);
    setYearlySummaries(summaries);

    // Always go straight into website dashboard without onboarding prompt
    localStorage.setItem("cashflow_onboard_complete", "true");
    setIsOnboarding(false);

    // Set initial view month to current date or default August 2026
    const today = getTodayISO();
    const { year, month } = parseISODate(today);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 2. Perform yearly lifecycle rollover checks when transactions are loaded
  useEffect(() => {
    if (metadata && transactions.length > 0) {
      const todayYear = new Date().getFullYear();
      const rolloverResult = transactionService.checkAndRunLifecycleRollover(todayYear);
      
      if (rolloverResult.rolledOver && rolloverResult.archivedYear) {
        // Reload all data to reflect the changes (archived year transactions deleted)
        const updatedTxs = transactionService.getTransactions();
        const updatedSummaries = transactionService.getYearlySummaries();
        setTransactions(updatedTxs);
        setYearlySummaries(updatedSummaries);
      }
    }
  }, [metadata, transactions.length]);

  // 3. Find yearly summaries that haven't been shown in a popup yet
  useEffect(() => {
    if (metadata && yearlySummaries.length > 0 && !activeYearSummaryPopup) {
      const pendingPopup = yearlySummaries.find(
        (summary) => !metadata.archivedYearsShown.includes(summary.year)
      );
      if (pendingPopup) {
        setActiveYearSummaryPopup(pendingPopup);
      }
    }
  }, [yearlySummaries, metadata, activeYearSummaryPopup]);

  // 4. Handle Theme changes (Light, Dark, System preferences)
  useEffect(() => {
    if (!metadata) return;

    const root = window.document.documentElement;
    const applyTheme = (theme: "light" | "dark" | "system") => {
      root.classList.remove("light", "dark");
      
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.add("light");
      } else {
        // System preference
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(isDark ? "dark" : "light");
      }
    };

    applyTheme(metadata.theme);

    // Listen for system theme change events if set to system theme
    if (metadata.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handleSystemChange);
      return () => mediaQuery.removeEventListener("change", handleSystemChange);
    }
  }, [metadata]);

  // Start Onboarding Flow (Initializes realistic demo data for August 2026)
  const handleStartOnboarding = () => {
    localStorage.setItem("cashflow_onboard_complete", "true");
    setIsOnboarding(false);
    
    // Set page to dashboard
    setCurrentPage("dashboard");
  };

  // Close Year-end summary popup and record in metadata
  const handleCloseYearPopup = () => {
    if (!metadata || !activeYearSummaryPopup) return;

    const updatedShown = [...metadata.archivedYearsShown, activeYearSummaryPopup.year];
    const updatedMeta = { ...metadata, archivedYearsShown: updatedShown };
    
    transactionService.saveMetadata(updatedMeta);
    setMetadata(updatedMeta);
    setActiveYearSummaryPopup(null);
  };

  // Transaction action handlers
  const handleOpenAddModal = (type: "income" | "expense" | null = null) => {
    setTxModalType(type);
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = () => {
    // Reload transactions list
    setTransactions(transactionService.getTransactions());
  };

  // Reload handler when resetting or restoring settings
  const handleDataReset = () => {
    loadAllData();
  };

  const handleClearDemoData = () => {
    setTransactions(transactionService.getTransactions());
  };

  const handleCategoriesChange = (updatedCats: Category[]) => {
    transactionService.saveCategories(updatedCats);
    setCategories(updatedCats);
  };

  const handleMetadataChange = (updatedMeta: AppMetadata) => {
    transactionService.saveMetadata(updatedMeta);
    setMetadata(updatedMeta);
  };

  // Get Page Title
  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard":
        return t.nav.dashboard;
      case "transactions":
        return t.nav.transactions;
      case "statistics":
        return t.nav.statistics;
      case "settings":
        return t.nav.settings;
      default:
        return t.nav.dashboard;
    }
  };

  if (isOnboarding) {
    return <OnboardingScreen onStart={handleStartOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex transition-colors duration-200">
      {/* Sidebar navigation for desktop */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Main View Shell */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
          title={getPageTitle()}
        />

        {/* Scrollable content container */}
        <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl w-full mx-auto">
          {currentPage === "dashboard" && (
            <Dashboard
              transactions={transactions}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onNavigate={setCurrentPage}
              onOpenAddModal={handleOpenAddModal}
              onEditTransaction={handleEditTransaction}
            />
          )}

          {currentPage === "transactions" && (
            <TransactionsPage
              transactions={transactions}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onOpenAddModal={handleOpenAddModal}
              onEditTransaction={handleEditTransaction}
            />
          )}

          {currentPage === "statistics" && (
            <StatisticsPage
              transactions={transactions}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />
          )}

          {currentPage === "settings" && (
            <SettingsPage
              categories={categories}
              onCategoriesChange={handleCategoriesChange}
              metadata={metadata || { lastActiveYear: 2026, theme: "system", currency: "VND", archivedYearsShown: [] }}
              onMetadataChange={handleMetadataChange}
              onDataReset={handleDataReset}
              onClearDemoData={handleClearDemoData}
            />
          )}
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

        {/* Mobile Floating Action Button (+) */}
        <div className="md:hidden fixed bottom-20 right-5 z-30">
          <button
            onClick={() => handleOpenAddModal(null)}
            className="w-14 h-14 bg-brand-500 hover:bg-brand-600 dark:bg-brand-dark-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-500/25 active:scale-95 transition-all outline-none"
            aria-label="Thêm giao dịch"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Transaction Modal (Add/Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
          setTxModalType(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        initialType={txModalType}
      />

      {/* Year rollover summary popup */}
      {activeYearSummaryPopup && (
        <YearlySummaryModal
          summary={activeYearSummaryPopup}
          onClose={handleCloseYearPopup}
        />
      )}
    </div>
  );
}

export default App;
