import { useEffect, useMemo, useState } from "react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { PageHeader } from "../ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";
import type { ApiResponse } from "../../types/api";
import type { User } from "../../types/auth";
import { getApiErrorMessage } from "../../utils/apiError";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function roleBadge(rol: User["rol"]) {
  if (rol === "admin") return { label: "Admin", variant: "blue" as const };
  if (rol === "docente") return { label: "Docente", variant: "amber" as const };
  return { label: "Estudiante", variant: "slate" as const };
}

function stateBadge(estado: User["estado"]) {
  if (estado === "activo") return { label: "Activo", variant: "green" as const };
  if (estado === "suspendido") return { label: "Suspendido", variant: "rose" as const };
  return { label: "Inactivo", variant: "amber" as const };
}

export function AccountPanel({ subtitle }: { subtitle?: string }) {
  const { user, api, refreshMe, logout } = useAuth();

  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const baseForm = useMemo(
    () => ({
      nombres: user?.nombres ?? "",
      apellidos: user?.apellidos ?? "",
      telefono: user?.telefono ?? "",
      direccion: user?.direccion ?? "",
      fecha_nacimiento: user?.fecha_nacimiento ?? "",
    }),
    [user]
  );

  const [form, setForm] = useState(baseForm);

  useEffect(() => {
    setForm(baseForm);
  }, [baseForm]);

  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="Cuenta" subtitle={subtitle ?? "Cargando…"} />
        <Card className="p-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">Cargando usuario…</div>
        </Card>
      </div>
    );
  }

  const fullName = `${user.nombres} ${user.apellidos}`.trim();
  const role = roleBadge(user.rol);
  const state = stateBadge(user.estado);

  const saveProfile = async () => {
    setBanner(null);
    setIsSaving(true);
    try {
      await api.put<ApiResponse<User>>(`/users/${user.id}`, {
        nombres: form.nombres.trim() || undefined,
        apellidos: form.apellidos.trim() || undefined,
        telefono: form.telefono.trim() ? form.telefono.trim() : null,
        direccion: form.direccion.trim() ? form.direccion.trim() : null,
        fecha_nacimiento: form.fecha_nacimiento.trim() ? form.fecha_nacimiento.trim() : null,
      });
      await refreshMe();
      setBanner({ tone: "success", text: "Perfil actualizado." });
    } catch (err) {
      setBanner({
        tone: "error",
        text: getApiErrorMessage(err, "No se pudo actualizar el perfil."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    setBanner(null);
    setIsSendingReset(true);
    try {
      await api.post("/auth/forgot-password", { correo: user.correo });
      setBanner({
        tone: "success",
        text: "Listo. Te enviamos un correo con el enlace para restablecer tu contraseña.",
      });
    } catch (err) {
      setBanner({
        tone: "error",
        text: getApiErrorMessage(err, "No se pudo enviar el correo de recuperación."),
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="cf-account-scope space-y-6">
      <PageHeader
        title="Cuenta"
        subtitle={subtitle ?? "Administra tu perfil, seguridad y preferencias"}
      />

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.tone === "success"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/85 p-6 shadow-[0_26px_80px_-52px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-start gap-4">
              <Avatar name={fullName || "Usuario"} src={user.foto_url} size={72} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {fullName || "—"}
                </div>
                <div className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">{user.correo}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={role.variant}>{role.label}</Badge>
                  <Badge variant={state.variant}>{state.label}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">ID</div>
                <div className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">#{user.id}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Último acceso</div>
                <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {formatDateTime(user.ultimo_login)}
                </div>
              </div>
              <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/85 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Creación</div>
                <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {formatDateTime(user.created_at)}
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-white/80 bg-white/85 p-6 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Sesión</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Mantén tu cuenta segura cerrando sesión en dispositivos compartidos.
            </div>
            <div className="mt-4 grid gap-2">
              <Button type="button" variant="danger" onClick={logout}>
                Cerrar sesión
              </Button>
              <Button type="button" variant="ghost" disabled title="Próximamente">
                Cerrar otras sesiones (próximamente)
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="border-white/80 bg-white/88 p-6 shadow-[0_26px_80px_-54px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">Perfil</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Actualiza tu información básica.</div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nombres</label>
                <div className="mt-2">
                  <Input
                    value={form.nombres}
                    onChange={(e) => setForm((p) => ({ ...p, nombres: e.target.value }))}
                    placeholder="Tus nombres"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Apellidos</label>
                <div className="mt-2">
                  <Input
                    value={form.apellidos}
                    onChange={(e) => setForm((p) => ({ ...p, apellidos: e.target.value }))}
                    placeholder="Tus apellidos"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Teléfono</label>
                <div className="mt-2">
                  <Input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Fecha de nacimiento</label>
                <div className="mt-2">
                  <Input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Dirección</label>
                <div className="mt-2">
                  <Input
                    value={form.direccion}
                    onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm(baseForm)}
                disabled={isSaving}
              >
                Deshacer
              </Button>
              <Button type="button" onClick={() => void saveProfile()} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-white/80 bg-white/88 p-6 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">Seguridad</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Te enviaremos un enlace para restablecer tu contraseña.
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void sendPasswordReset()}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? "Enviando..." : "Enviar enlace de restablecimiento"}
                </Button>
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Consejo: revisa también tu bandeja de spam.
              </div>
            </Card>

            <PreferencesCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesCard() {
  const { theme, notifications, setTheme, setNotifications } = usePreferences();

  return (
    <Card className="border-white/80 bg-white/88 p-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="text-sm font-black text-slate-900 dark:text-slate-100">Preferencias</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Personaliza tu experiencia.</div>

      <div className="mt-5 space-y-4 text-sm">
        <div>
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tema</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("claro")}
              className={`rounded-2xl border px-3 py-2 text-left font-semibold transition ${
                theme === "claro"
                  ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800/90"
              }`}
            >
              Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme("oscuro")}
              className={`rounded-2xl border px-3 py-2 text-left font-semibold transition ${
                theme === "oscuro"
                  ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800/90"
              }`}
            >
              Oscuro
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Notificaciones</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNotifications("on")}
              className={`rounded-2xl border px-3 py-2 text-left font-semibold transition ${
                notifications === "on"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200"
                  : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800/90"
              }`}
            >
              Activadas
            </button>
            <button
              type="button"
              onClick={() => setNotifications("off")}
              className={`rounded-2xl border px-3 py-2 text-left font-semibold transition ${
                notifications === "off"
                  ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200"
                  : "border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800/90"
              }`}
            >
              Desactivadas
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
