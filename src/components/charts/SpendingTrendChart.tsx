import React, { useMemo } from "react";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from "recharts";
import type { Transaction } from "../../types";
import { t } from "../../utils/translations";
import { formatCurrency } from "../../utils/currency";
import { Card } from "../ui/Card";

interface SpendingTrendChartProps {
  transactions: Transaction[];
  year: number;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ transactions, year }) => {
  // Aggregate data for January to December of the specified year
  const chartData = useMemo(() => {
    const monthlyValues = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthLabel: `Thg ${i + 1}`,
      income: 0,
      expense: 0,
      savings: 0
    }));

    // Filter transactions belonging to the active year
    const yearTxs = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getFullYear() === year;
    });

    yearTxs.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthIdx = txDate.getMonth(); // 0-11
      if (monthIdx >= 0 && monthIdx < 12) {
        if (tx.type === "income") {
          monthlyValues[monthIdx].income += tx.amount;
        } else {
          monthlyValues[monthIdx].expense += tx.amount;
        }
      }
    });

    // Calculate savings and filter out months that have no activity and are in the future
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const isCurrentYear = year === new Date().getFullYear();

    return monthlyValues
      .map(m => ({
        ...m,
        savings: m.income - m.expense
      }))
      .filter(m => {
        // If it's this year, show months up to the current month
        if (isCurrentYear) {
          return m.month <= currentMonth;
        }
        // If it's a previous year, show months that actually have transactions or show all 12
        return true;
      });
  }, [transactions, year]);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const hasData = chartData.some(d => d.income > 0 || d.expense > 0);

  return (
    <Card variant="default" className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {t.statistics.spendingTrend} ({year})
        </h3>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center py-20 text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Chưa có dữ liệu giao dịch trong năm {year} để vẽ xu hướng.
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: -5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
                className="dark:stroke-navy-700/50"
              />
              
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
              />
              
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
              />
              
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                contentStyle={{
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.95)",
                  border: "none",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                  fontSize: "11px",
                  color: "#1e293b",
                  fontWeight: "bold"
                }}
              />
              
              <Legend
                verticalAlign="top"
                height={36}
                iconSize={10}
                iconType="circle"
                wrapperStyle={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#94a3b8"
                }}
              />
              
              <Bar
                name={t.common.income}
                dataKey="income"
                fill="#05cd99"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              
              <Bar
                name={t.common.expense}
                dataKey="expense"
                fill="#ee5d50"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              
              <Line
                name={t.statistics.saved}
                type="monotone"
                dataKey="savings"
                stroke="#4318ff"
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 0, fill: "#4318ff" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default SpendingTrendChart;
