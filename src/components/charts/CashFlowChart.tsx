import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import type { Transaction } from "../../types";
import { t } from "../../utils/translations";
import { formatCurrency } from "../../utils/currency";
import { getDaysInMonth, parseISODate } from "../../utils/date";
import { Card } from "../ui/Card";

interface CashFlowChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions, year, month }) => {
  // Generate data for each day of the month
  const chartData = useMemo(() => {
    const days = getDaysInMonth(year, month);
    
    // Group transactions by date
    const dailyMap: Record<string, { income: number; expense: number }> = {};
    days.forEach(day => {
      dailyMap[day] = { income: 0, expense: 0 };
    });

    transactions.forEach(tx => {
      if (dailyMap[tx.date]) {
        if (tx.type === "income") {
          dailyMap[tx.date].income += tx.amount;
        } else {
          dailyMap[tx.date].expense += tx.amount;
        }
      }
    });

    return days.map(dateStr => {
      const { day } = parseISODate(dateStr);
      return {
        dateStr,
        dayLabel: `Ngày ${day}`,
        income: dailyMap[dateStr].income,
        expense: dailyMap[dateStr].expense,
        net: dailyMap[dateStr].income - dailyMap[dateStr].expense
      };
    });
  }, [transactions, year, month]);

  // Format Y Axis ticks
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Custom chart tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateParts = data.dateStr.split("-");
      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const netVal = data.income - data.expense;

      return (
        <div className="bg-white dark:bg-navy-800 p-4 border border-slate-100 dark:border-navy-700/80 rounded-2xl shadow-xl space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-800 dark:text-white border-b border-slate-50 dark:border-navy-700/50 pb-1.5">
            {formattedDate}
          </p>
          <div className="flex justify-between gap-6 font-semibold">
            <span className="text-slate-400">{t.common.income}</span>
            <span className="text-income font-extrabold">+{formatCurrency(data.income)}</span>
          </div>
          <div className="flex justify-between gap-6 font-semibold">
            <span className="text-slate-400">{t.common.expense}</span>
            <span className="text-expense font-extrabold">-{formatCurrency(data.expense)}</span>
          </div>
          <div className="flex justify-between gap-6 font-bold border-t border-slate-50 dark:border-navy-700/50 pt-1.5">
            <span className="text-slate-700 dark:text-white">{t.dashboard.net}</span>
            <span className={netVal >= 0 ? "text-income font-black" : "text-expense font-black"}>
              {netVal >= 0 ? "+" : ""}
              {formatCurrency(netVal)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card variant="default" className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">
          {t.dashboard.cashFlow}
        </h3>
        
        {/* Legends */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-income block" />
            {t.common.income}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-expense block" />
            {t.common.expense}
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div className="flex-1 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#05cd99" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#05cd99" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ee5d50" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ee5d50" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
              className="dark:stroke-navy-700/50"
            />
            
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
              interval="preserveStartEnd"
              minTickGap={25}
            />
            
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
            />
            
            <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
            
            <Area
              type="monotone"
              dataKey="income"
              stroke="#05cd99"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorIncome)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ee5d50"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorExpense)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CashFlowChart;
