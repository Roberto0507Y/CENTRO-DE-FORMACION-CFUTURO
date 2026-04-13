import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative min-w-0 max-w-full rounded-[1.5rem] border border-slate-200/80 bg-white/90 text-slate-900 shadow-[0_18px_60px_-48px_rgba(15,23,42,0.55)] ring-1 ring-white/70 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:ring-white/5 ${className}`}
      {...props}
    />
  );
}
