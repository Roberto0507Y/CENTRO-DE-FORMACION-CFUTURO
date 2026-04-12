import { useId, useRef } from "react";
import { Button } from "./Button";

export function FilePicker({
  label = "Adjuntar archivo",
  helperText,
  accept,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  helperText?: string;
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sizeLabel =
    value && Number.isFinite(value.size)
      ? `${Math.max(1, Math.round(value.size / 1024))} KB`
      : null;

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:ring-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950 dark:text-white">{label}</div>
          {helperText ? (
            <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{helperText}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            id={id}
            type="file"
            accept={accept}
            disabled={disabled}
            className="sr-only"
            ref={inputRef}
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            size="sm"
            variant={value ? "secondary" : "primary"}
            className="cursor-pointer"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            aria-controls={id}
          >
            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5-5 5 5" />
                <path d="M12 5v12" />
              </svg>
              {value ? "Cambiar" : "Subir"}
            </span>
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Quitar
            </Button>
          ) : null}
        </div>
      </div>

      {value ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{value.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{sizeLabel}</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
          Selecciona un archivo para adjuntar (opcional).
        </div>
      )}
    </div>
  );
}
