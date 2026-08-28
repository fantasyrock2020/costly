import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySummary } from "../../types";
import { formatCurrency } from "../../utils/currency";
import { Card } from "../ui/Card";

interface CategoryDonutChartProps {
  data: CategorySummary[];
  title: string;
  type: "income" | "expense";
}

// Curated fintech palette for charts
const COLORS = [
  "#4318FF", // Brand Indigo
  "#05CD99", // Emerald Green
  "#EE5D50", // Coral Red
  "#FFB547", // Amber Yellow
  "#9F7AEA", // Purple
  "#4FD1C5", // Teal
  "#ED64A6", // Pink
  "#3182CE", // Blue
  "#ECC94B", // Yellow
  "#5A67D8", // Indigo
  "#A0AEC0", // Slate Gray
  "#2F855A"  // Dark Green
];

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data, title, type }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null);

  // Reset selection when data changes
  useEffect(() => {
    if (data.length > 0) {
      setSelectedCategory(data[0]);
      setActiveIndex(0);
    } else {
      setSelectedCategory(null);
      setActiveIndex(null);
    }
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
    setSelectedCategory(data[index]);
  };

  const hasData = data.length > 0;

  return (
    <Card variant="default" className="flex flex-col h-full justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <span className="text-4xl mb-2">📊</span>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Không có dữ liệu trong khoảng thời gian này
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
          {/* Donut Chart */}
          <div className="w-[180px] h-[180px] relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                  onMouseEnter={onPieEnter}
                  onClick={onPieEnter}
                  cursor="pointer"
                >
                  {data.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      stroke={activeIndex === index ? "#ffffff" : "transparent"}
                      strokeWidth={2}
                      style={{
                        filter: activeIndex === index ? "drop-shadow(0px 4px 8px rgba(0,0,0,0.15))" : "none",
                        transition: "all 0.2s ease"
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#1e293b"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Indicator inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Lớn nhất
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
                {data[0]?.category.split(" ")[0]}
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                {data[0]?.percentage}%
              </span>
            </div>
          </div>

          {/* Interactive Info display */}
          <div className="flex-1 w-full space-y-4">
            {selectedCategory && (
              <div className="p-4 bg-slate-50 dark:bg-navy-900 rounded-2xl border border-slate-100/50 dark:border-navy-700/50 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {selectedCategory.category}
                  </span>
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ 
                      backgroundColor: COLORS[(activeIndex ?? 0) % COLORS.length] 
                    }} 
                  />
                </div>
                <h4 className={`text-lg font-black mt-2 ${type === "expense" ? "text-expense" : "text-income"}`}>
                  {type === "expense" ? "-" : "+"} {formatCurrency(selectedCategory.amount)}
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                  Chiếm {selectedCategory.percentage}% tổng {type === "expense" ? "chi tiêu" : "thu nhập"}
                </p>
              </div>
            )}
            
            {/* Mini Legend list */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-[80px] overflow-y-auto pr-1">
              {data.slice(0, 5).map((item, idx) => (
                <div 
                  key={item.category} 
                  className={`flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-colors ${
                    activeIndex === idx 
                      ? "text-slate-800 dark:text-white" 
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                  onMouseEnter={() => {
                    setActiveIndex(idx);
                    setSelectedCategory(item);
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{item.category.split(" ").slice(1).join(" ") || item.category} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CategoryDonutChart;
