import React from "react";
import { LayoutDashboard, Receipt, BarChart3, Settings } from "lucide-react";
import { t } from "../../utils/translations";

type PageType = "dashboard" | "transactions" | "statistics" | "settings";

interface BottomNavProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: "dashboard" as PageType, label: t.nav.dashboard, icon: LayoutDashboard },
    { id: "transactions" as PageType, label: t.nav.transactions, icon: Receipt },
    { id: "statistics" as PageType, label: t.nav.statistics, icon: BarChart3 },
    { id: "settings" as PageType, label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-navy-800/90 backdrop-blur-md border-t border-slate-100 dark:border-navy-700/80 z-30 flex items-center justify-around px-2 shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-200 ${
              isActive
                ? "text-brand-500 dark:text-brand-dark-500 scale-105"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1 tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
