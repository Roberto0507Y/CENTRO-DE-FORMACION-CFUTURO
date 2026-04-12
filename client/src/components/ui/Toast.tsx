import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export type ToastData = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

function kindStyles(kind: ToastKind) {
  if (kind === "success") {
    return {
      icon: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />,
      ring: "border-emerald-200 dark:border-emerald-900/50",
      bg: "bg-white/95 dark:bg-slate-900/95",
      title: "text-slate-800 dark:text-white",
      desc: "text-slate-500 dark:text-slate-300",
    };
  }
  if (kind === "error") {
    return {
      icon: <TriangleAlert className="h-[18px] w-[18px] text-rose-500" />,
      ring: "border-rose-200 dark:border-rose-900/50",
      bg: "bg-white/95 dark:bg-slate-900/95",
      title: "text-slate-800 dark:text-white",
      desc: "text-slate-500 dark:text-slate-300",
    };
  }
  return {
    icon: <Info className="h-[18px] w-[18px] text-blue-500" />,
    ring: "border-slate-200 dark:border-slate-800",
    bg: "bg-white/95 dark:bg-slate-900/95",
    title: "text-slate-800 dark:text-white",
    desc: "text-slate-500 dark:text-slate-300",
  };
}

export function Toast({
  data,
  onClose,
}: {
  data: ToastData;
  onClose: (id: string) => void;
}) {
  const s = kindStyles(data.kind);
  return (
    <div
      className={[
        "inline-flex w-[380px] max-w-[92vw] items-start gap-3 rounded-[1.35rem] border p-4 text-sm shadow-2xl shadow-slate-900/15 backdrop-blur",
        s.ring,
        s.bg,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="mt-0.5">{s.icon}</div>
      <div className="min-w-0">
        <h3 className={`font-extrabold ${s.title}`}>{data.title}</h3>
        {data.description ? <p className={`mt-1 ${s.desc}`}>{data.description}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => onClose(data.id)}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
