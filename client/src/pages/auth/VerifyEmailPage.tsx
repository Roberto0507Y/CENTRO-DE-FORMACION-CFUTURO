import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";

function useQueryToken(): string | null {
  const { search } = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    const token = sp.get("token");
    return token && token.trim() ? token.trim() : null;
  }, [search]);
}

export function VerifyEmailPage() {
  const { api } = useAuth();
  const token = useQueryToken();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );

  useEffect(() => {
    if (!token) return;

    let active = true;

    const run = async () => {
      try {
        await api.post<ApiResponse<{ ok: true }>>("/auth/verify-email", { token });
        if (active) setStatus("success");
      } catch {
        if (active) setStatus("error");
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [api, token]);

  const isSuccess = status === "success";
  const isLoading = status === "loading";

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
            <MailCheck className="h-4 w-4" aria-hidden="true" />
            Confirmación de cuenta
          </div>
        </div>

        <Card className="relative overflow-hidden border-slate-200/70 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30">
          <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-500 px-5 py-6 text-white sm:px-8 sm:py-7">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                {isLoading ? (
                  <Spinner size={22} />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                ) : (
                  <XCircle className="h-7 w-7" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight sm:text-[2rem]">
                  {isLoading
                    ? "Confirmando tu cuenta"
                    : isSuccess
                      ? "Cuenta confirmada"
                      : "No pudimos confirmar tu cuenta"}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                  {isLoading
                    ? "Estamos validando tu enlace de activación. Esto tomará solo un momento."
                    : isSuccess
                      ? "Tu acceso ya está activo. Ahora puedes iniciar sesión en la plataforma."
                      : "El enlace puede ser inválido, ya fue utilizado o expiró. Si necesitas ayuda, solicita soporte."}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7">
            <div
              className={
                isSuccess
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
                  : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/65 dark:text-slate-300"
              }
            >
              {isLoading
                ? "Por favor, espera mientras terminamos la verificación."
                : isSuccess
                  ? "Listo. Tu correo fue validado correctamente y tu cuenta quedó activa."
                  : "Si copiaste el enlace manualmente, confirma que esté completo. También puedes intentar registrarte nuevamente o contactar soporte."}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/" className="text-center text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                Volver al inicio
              </Link>
              <Link
                to="/auth/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-base font-black text-white shadow-sm shadow-blue-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
