import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "brand" | "glass" | "outline";
  hoverable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  hoverable = false,
  className = "",
  ...props
}) => {
  const baseStyle = "rounded-2xl p-5 transition-all duration-300";
  
  // Theme variants
  const variants = {
    default: "bg-white dark:bg-navy-800 text-slate-800 dark:text-white shadow-[0_12px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_24px_rgba(0,0,0,0.15)] border border-slate-100/50 dark:border-navy-700/50",
    brand: "bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-dark-500 dark:to-brand-700 text-white shadow-lg shadow-brand-500/20",
    glass: "bg-white/80 dark:bg-navy-800/80 backdrop-blur-md text-slate-800 dark:text-white border border-white/20 dark:border-navy-700/20 shadow-sm",
    outline: "bg-transparent border border-slate-200 dark:border-navy-700 text-slate-800 dark:text-white"
  };

  const hoverStyle = hoverable ? "horizon-card-hover cursor-pointer" : "";

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
