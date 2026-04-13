import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";

function useQueryToken(): string | null {
  const { search } = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    const t = sp.get("token");
    return t && t.trim() ? t.trim() : null;
  }, [search]);
}

export function ResetPasswordPage() {
  const { api } = useAuth();
  const token = useQueryToken();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Token faltante. Abre el enlace desde tu correo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await api.post<ApiResponse<{ ok: true }>>("/auth/reset-password", { token, password });
      setOk(true);
    } catch {
      setError("No se pudo restablecer. El token puede ser inválido o haber expirado.");
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
          <div className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">C.FUTURO</div>
        </div>

        <Card className="overflow-hidden border-slate-200/70 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-5 text-white sm:px-8 sm:py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Restablecer contraseña</h1>
                <p className="mt-1 text-sm font-medium text-white/90">
                  Crea una nueva contraseña para tu cuenta.
                </p>
              </div>
              <div className="hidden sm:grid sm:h-12 sm:w-12 sm:place-items-center sm:rounded-2xl sm:bg-white/10 sm:ring-1 sm:ring-white/15">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 11V8a5 5 0 0 1 10 0v3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 11h12v9H6v-9Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-10 sm:py-9">
            {!token ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                Token faltante. Abre el enlace desde tu correo.
              </div>
            ) : null}

            <form className="mt-6 grid gap-5" onSubmit={submit}>
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Nueva contraseña</label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950/70"
                  disabled={ok}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Confirmar contraseña</label>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  required
                  placeholder="Repite tu contraseña"
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-white focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950/70"
                  disabled={ok}
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
                  {error}
                </div>
              ) : null}
              {ok ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                  <span className="font-bold">Enhorabuena:</span> tu contraseña fue restablecida correctamente. Ya puedes cerrar esta pestaña.
                </div>
              ) : null}

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Consejo: usa una contraseña segura. Si el enlace expiró, solicita uno nuevo.
              </div>

              <Button
                type="submit"
                disabled={isLoading || !token || ok}
                className="h-12 w-full text-base font-black"
              >
                {isLoading ? "Guardando…" : "Cambiar contraseña"}
              </Button>
            </form>

            {ok ? null : (
              <div className="mt-6 text-center text-sm">
                <Link to="/auth/login" className="font-bold text-blue-600 hover:underline dark:text-cyan-300">
                  Volver a ingresar
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
