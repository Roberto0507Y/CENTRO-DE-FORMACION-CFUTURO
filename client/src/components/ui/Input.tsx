import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-blue-500/20 transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400/40 dark:focus:bg-slate-900 ${className}`}
      {...props}
    />
  );
}
