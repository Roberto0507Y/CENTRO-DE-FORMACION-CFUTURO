import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-w-0 w-full max-w-full rounded-[1.1rem] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.5)] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-900/92 dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-[0_20px_44px_-34px_rgba(2,6,23,0.95)] dark:focus:border-cyan-400/50 dark:focus:bg-slate-900 dark:focus:ring-cyan-400/15 ${className}`}
      {...props}
    />
  );
}
