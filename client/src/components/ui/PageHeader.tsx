import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  right,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.55)] ring-1 ring-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:ring-white/5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(37,99,235,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_8%_16%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(37,99,235,0.12),transparent_28%)]" />
      <div
        className={`relative flex flex-col gap-3 ${
          align === "center" && !right
            ? "items-center text-center"
            : "md:flex-row md:items-end md:justify-between"
        }`}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl dark:text-white">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
        </div>
        {right ? <div className="md:pb-1">{right}</div> : null}
      </div>
    </div>
  );
}
