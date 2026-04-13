import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex max-w-full items-center justify-center rounded-2xl text-center font-semibold leading-tight transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-950";
  const sizes = size === "sm" ? "px-3.5 py-2 text-sm" : "px-4.5 py-2.5 text-sm";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
      : variant === "secondary"
        ? "bg-slate-950 text-white shadow-sm shadow-slate-900/15 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/15 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-500/20 dark:hover:bg-cyan-400 dark:hover:shadow-cyan-400/25"
        : variant === "danger"
          ? "bg-rose-600 text-white shadow-sm shadow-rose-600/15 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/15"
          : "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return <button className={`${base} ${sizes} ${styles} ${className}`} {...props} />;
}
