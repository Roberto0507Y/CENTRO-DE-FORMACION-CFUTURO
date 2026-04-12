import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";

export function ForgotPasswordPage() {
  const { api } = useAuth();
  const [correo, setCorreo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSent(false);
      await api.post<ApiResponse<{ ok: true }>>("/auth/forgot-password", { correo });
      setSent(true);
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 cf-animate-fade-in dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-600/12 blur-3xl" />
        <div className="absolute -bottom-24 right-[-80px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-[480px] border-slate-200/70 bg-white p-7 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30 sm:p-10">
        <div className="grid gap-6">
          <div className="grid place-items-center gap-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-300/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16v12H4V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7l8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Recuperar contraseña
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>
          </div>

          <form className="grid gap-5" onSubmit={submit}>
            <div>
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Correo</label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 6h16v12H4V6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 7l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <Input
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  type="email"
                  required
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950/70"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
                {error}
              </div>
            ) : null}

            {sent ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.
              </div>
            ) : null}

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Revisa también tu bandeja de <span className="font-semibold text-slate-700 dark:text-slate-200">spam</span>.
            </div>

            <Button type="submit" disabled={isLoading} className="h-12 w-full text-base font-black">
              {isLoading ? "Enviando…" : "Enviar enlace"}
            </Button>
          </form>

          <div className="flex items-center justify-center text-sm">
            <Link to="/auth/login" className="font-bold text-blue-600 hover:underline dark:text-cyan-300">
              Volver a ingresar
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
