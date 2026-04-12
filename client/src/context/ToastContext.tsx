import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toast, type ToastData, type ToastKind } from "../components/ui/Toast";

type ToastInput = {
  kind?: ToastKind;
  title: string;
  description?: string;
  durationMs?: number;
};

type ToastContextValue = {
  push: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = uid();
    const data: ToastData = {
      id,
      kind: input.kind ?? "info",
      title: input.title,
      description: input.description,
    };
    setToasts((prev) => [data, ...prev].slice(0, 4));

    const duration = input.durationMs ?? 4200;
    window.setTimeout(() => remove(id), duration);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  // Limpia toasts al navegar atrás/adelante con hot reload
  useEffect(() => {
    return () => setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-5 z-[60] flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} data={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
