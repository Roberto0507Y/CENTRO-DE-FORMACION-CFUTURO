import type { HTMLAttributes } from "react";

type Variant = "slate" | "blue" | "green" | "amber" | "rose";

export function Badge({
  variant = "slate",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none";
  const styles =
    variant === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-200"
      : variant === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
        : variant === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200"
          : variant === "rose"
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200"
            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return <span className={`${base} ${styles} ${className}`} {...props} />;
}
