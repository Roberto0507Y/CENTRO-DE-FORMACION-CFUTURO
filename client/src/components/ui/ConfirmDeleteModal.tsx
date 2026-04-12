type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  open,
  title = "¿Estás seguro?",
  description = "¿Realmente quieres continuar? Esta acción no se puede deshacer.",
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-[460px] flex-col items-center rounded-3xl border border-slate-200 bg-white px-5 py-6 text-center shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/40">
        <div className="flex items-center justify-center rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M2.875 5.75h1.917m0 0h15.333m-15.333 0v13.417a1.917 1.917 0 0 0 1.916 1.916h9.584a1.917 1.917 0 0 0 1.916-1.916V5.75m-10.541 0V3.833a1.917 1.917 0 0 1 1.916-1.916h3.834a1.917 1.917 0 0 1 1.916 1.916V5.75m-5.75 4.792v5.75m3.834-5.75v5.75"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-2 max-w-[340px] whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-slate-300">
          {description}
        </p>

        <div className="mt-5 flex w-full items-center justify-center gap-4">
          <button
            type="button"
            className="h-10 w-full rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-600 transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-36 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="h-10 w-full rounded-md bg-red-600 text-sm font-medium text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 md:w-36"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
