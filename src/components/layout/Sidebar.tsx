import React from "react";
import { LayoutDashboard, Receipt, BarChart3, Settings } from "lucide-react";
import { t } from "../../utils/translations";

type PageType = "dashboard" | "transactions" | "statistics" | "settings";

interface SidebarProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: "dashboard" as PageType, label: t.nav.dashboard, icon: LayoutDashboard },
    { id: "transactions" as PageType, label: t.nav.transactions, icon: Receipt },
    { id: "statistics" as PageType, label: t.nav.statistics, icon: BarChart3 },
    { id: "settings" as PageType, label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 left-0 bg-white dark:bg-navy-800 border-r border-slate-100 dark:border-navy-700 z-20">
      {/* Brand Logo */}
      <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-navy-700/50">
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <span className="bg-brand-500 text-white p-1.5 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </span>
          <span>DòngTiền<span className="text-brand-500 font-extrabold">.</span></span>
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-8 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "text-brand-500 dark:text-white bg-brand-50/50 dark:bg-navy-700/50"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-navy-700/20"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-brand-500 dark:text-brand-dark-500" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span>{item.label}</span>

              {/* Active right bar indicator */}
              {isActive && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-1 rounded-l-full bg-brand-500 dark:bg-brand-dark-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 text-center border-t border-slate-100 dark:border-navy-700/50">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Dòng Tiền Cá Nhân © 2026
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
