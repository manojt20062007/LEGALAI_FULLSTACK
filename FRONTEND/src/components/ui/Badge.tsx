import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "compliant"
    | "nonCompliant"
    | "needsReview"
    | "pass"
    | "fail"
    | "warning"
    | "info";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-900 text-white border-transparent",
    secondary: "bg-slate-100 text-slate-800 border-slate-200",
    outline: "bg-transparent text-slate-700 border-slate-300",
    compliant: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
    nonCompliant: "bg-rose-50 text-rose-800 border-rose-300 font-semibold",
    needsReview: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
    pass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium",
    fail: "bg-rose-100 text-rose-800 border-rose-300 font-medium",
    warning: "bg-amber-100 text-amber-800 border-amber-300 font-medium",
    info: "bg-blue-50 text-blue-800 border-blue-200 font-medium",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs rounded",
    md: "px-2.5 py-1 text-xs rounded-md",
    lg: "px-3.5 py-1.5 text-sm rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border transition-colors focus:outline-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
