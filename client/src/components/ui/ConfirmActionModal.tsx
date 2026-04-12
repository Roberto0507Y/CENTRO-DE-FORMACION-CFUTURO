type ConfirmActionModalProps = {
  open: boolean;
  title?: string;
  eyebrow?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  tone?: "blue" | "green";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmActionModal({
  open,
  title = "Confirmar acción",
  eyebrow = "Revisión final",
  description = "Confirma que deseas continuar con esta acción.",
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  isLoading = false,
  tone = "blue",
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  if (!open) return null;

  const toneStyles =
    tone === "green"
      ? {
          glow: "from-emerald-500/20 via-teal-400/10 to-cyan-500/20",
          icon: "bg-emerald-500 text-white shadow-emerald-500/30",
          button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25",
          ring: "ring-emerald-500/20",
          text: "text-emerald-700 dark:text-emerald-300",
        }
      : {
          glow: "from-blue-500/20 via-cyan-400/10 to-sky-500/20",
          icon: "bg-blue-600 text-white shadow-blue-600/30",
          button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25",
          ring: "ring-blue-500/20",
          text: "text-blue-700 dark:text-cyan-300",
        };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[500px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/40">
        <div
          className={`pointer-events-none absolute inset-x-6 -top-20 h-44 rounded-full bg-gradient-to-r ${toneStyles.glow} blur-3xl`}
        />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className={`grid h-11 w-11 place-items-center rounded-2xl shadow-lg ${toneStyles.icon}`}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 7 10 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className={`mt-5 text-xs font-black uppercase tracking-[0.24em] ${toneStyles.text}`}>
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <p className="mx-auto mt-3 max-w-[380px] whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>

          <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`h-11 w-full rounded-2xl px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-40 ${toneStyles.button} ring-4 ${toneStyles.ring}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
