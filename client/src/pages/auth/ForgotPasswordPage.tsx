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
    <div className="relative flex min-h-screen w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-slate-50 px-4 py-6 cf-animate-fade-in sm:items-center sm:py-10 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-600/12 blur-3xl" />
        <div className="absolute -bottom-24 right-[-80px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative my-auto w-full max-w-[560px]">
        <div className="mb-5 text-center sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 shadow-sm backdrop-blur dark:border-cyan-400/20 dark:bg-slate-900/70 dark:text-cyan-200">
            Recuperación de acceso
          </div>
        </div>

        <Card className="relative overflow-hidden border-slate-200/70 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] px-5 py-6 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.78)_100%)] sm:px-8 sm:py-7">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-300/20">
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
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-[2rem]">
                  Recuperar contraseña
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ingresa tu correo institucional o personal y te enviaremos un enlace para restablecer tu acceso de forma segura.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <form className="grid gap-5" onSubmit={submit}>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/65 dark:text-slate-300">
                Usa el mismo correo con el que ingresas a la plataforma. Revisa también tu bandeja principal y la carpeta de spam.
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                  Correo electrónico
                </label>
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
                    className="h-12 rounded-xl border-slate-200/90 bg-white pl-10 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 hover:border-blue-200 focus:border-blue-400 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-cyan-400/30 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-base font-black shadow-[0_18px_38px_-18px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:to-cyan-400"
              >
                {isLoading ? "Enviando…" : "Enviar enlace"}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center text-sm">
              <Link to="/auth/login" className="font-bold text-blue-600 hover:underline dark:text-cyan-300">
                Volver a ingresar
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
