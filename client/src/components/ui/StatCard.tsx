import { Card } from "./Card";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="group overflow-hidden p-0">
      <div className="relative p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(59,130,246,0.12),transparent_35%)] opacity-80 transition group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_86%_10%,rgba(34,211,238,0.16),transparent_35%)]" />
        <div className="relative">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
      {hint ? <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{hint}</div> : null}
        </div>
      </div>
    </Card>
  );
}
