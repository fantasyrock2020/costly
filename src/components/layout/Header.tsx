import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "../../utils/translations";
import { formatMonthYear } from "../../utils/date";

interface HeaderProps {
  selectedYear: number;
  selectedMonth: number;
  onMonthChange: (year: number, month: number) => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedYear,
  selectedMonth,
  onMonthChange,
  title
}) => {
  const [greeting, setGreeting] = useState(t.dashboard.greetingMorning);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting(t.dashboard.greetingMorning);
    } else if (hour >= 12 && hour < 18) {
      setGreeting(t.dashboard.greetingAfternoon);
    } else {
      setGreeting(t.dashboard.greetingEvening);
    }
  }, []);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(selectedYear - 1, 12);
    } else {
      onMonthChange(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(selectedYear + 1, 1);
    } else {
      onMonthChange(selectedYear, selectedMonth + 1);
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 px-4 md:px-8 bg-slate-50/50 dark:bg-navy-900/50 sticky top-0 backdrop-blur-md z-10 border-b border-slate-100/30 dark:border-navy-800/30">
      {/* Page Title & Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight m-0 mb-1 leading-tight">
          {title}
        </h1>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
          {greeting}
        </p>
      </div>

      {/* Center Month Selector & Theme Toggle */}
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
        {/* Month Selector Card */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-navy-800 border border-slate-100 dark:border-navy-700/80 px-2 py-1.5 rounded-2xl shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400 transition-colors h-[36px] w-[36px] flex items-center justify-center"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm font-semibold text-slate-700 dark:text-white px-2 min-w-[120px] text-center">
            {formatMonthYear(selectedYear, selectedMonth)}
          </span>
          
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-500 dark:text-slate-400 transition-colors h-[36px] w-[36px] flex items-center justify-center"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
