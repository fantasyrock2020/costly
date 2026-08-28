import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}) => {
  // Base classes with touch target optimization (min height 44px for md/lg sizes, easy tap)
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-500/50";

  // Size styles
  const sizes = {
    sm: "px-3 py-1.5 text-xs h-[36px]",
    md: "px-5 py-2.5 text-sm h-[44px]", // Optimal touch target
    lg: "px-7 py-3 text-base h-[52px]"
  };

  // Variant styles inspired by Horizon UI
  const variants = {
    primary: "bg-brand-500 hover:bg-brand-600 dark:bg-brand-dark-500 dark:hover:bg-brand-600 text-white shadow-md shadow-brand-500/10",
    secondary: "bg-slate-100 hover:bg-slate-200 dark:bg-navy-700 dark:hover:bg-navy-600 text-slate-800 dark:text-white",
    danger: "bg-expense hover:bg-expense-dark dark:bg-expense hover:bg-expense-dark text-white shadow-md shadow-expense/10",
    success: "bg-income hover:bg-income-dark dark:bg-income hover:bg-income-dark text-white shadow-md shadow-income/10",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-600 dark:text-slate-300",
    icon: "p-2 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-navy-700 dark:hover:bg-navy-600 text-slate-600 dark:text-slate-300"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
