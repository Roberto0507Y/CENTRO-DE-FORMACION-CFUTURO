import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/admin-dashboard.css";

type AdminMetricsResponse = {
  ok: true;
  data: {
    users: { total: number; active: number; inactive: number; suspended: number; admins: number; teachers: number; students: number };
    courses: { total: number; published: number; draft: number; hidden: number };
    payments: { total: number; pending: number; paid: number; refunded: number; revenueTotal: string; refundsTotal: string };
    enrollments: { total: number; active: number; pending: number; cancelled: number; finished: number };
    activity: {
      recentSignups: Array<{
        id: number;
        nombres: string;
        apellidos: string;
        correo: string;
        rol: "admin" | "docente" | "estudiante";
        estado: "activo" | "inactivo" | "suspendido";
        created_at: string;
      }>;
      recentLogins: Array<{
        id: number;
        nombres: string;
        apellidos: string;
        correo: string;
        rol: "admin" | "docente" | "estudiante";
        estado: "activo" | "inactivo" | "suspendido";
        ultimo_login: string;
      }>;
      recentPayments: Array<{
        id: number;
        usuario_id: number;
        estudiante: { id: number; nombres: string; apellidos: string; correo: string };
        curso: { titulo: string | null; count: number };
        monto_total: string;
        metodo_pago: string;
        estado: string;
        created_at: string;
        fecha_pago: string | null;
      }>;
    };
  };
};

function formatMoneyGTQ(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function AdminDashboardPage() {
  const { user, api } = useAuth();
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminMetricsResponse["data"] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const checkedAt = new Date().toISOString();

    void api
      .get<AdminMetricsResponse>("/admin/metrics", { signal: controller.signal })
      .then((metricsResult) => {
        if (controller.signal.aborted) return;
        setMetrics(metricsResult.data.data);
        setHealthCheckedAt(checkedAt);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMetrics(null);
        setHealthCheckedAt(checkedAt);
      });

    return () => controller.abort();
  }, [api]);

  const greeting = useMemo(() => {
    const name = user?.nombres?.trim() || "Admin";
    return `Bienvenido, ${name}`;
  }, [user?.nombres]);

  const role = user?.rol ?? "admin";
  const roleVariant = role === "admin" ? ("blue" as const) : ("slate" as const);
  const stateVariant =
    user?.estado === "activo"
      ? ("green" as const)
      : user?.estado === "suspendido"
        ? ("rose" as const)
        : ("amber" as const);

  const checkedLabel = useMemo(() => {
    if (!healthCheckedAt) return "—";
    const d = new Date(healthCheckedAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
  }, [healthCheckedAt]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        subtitle="Gestiona usuarios, cursos y configuraciones del campus."
        right={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:justify-end">
            <Link to="/admin/users">
              <Button variant="secondary" className="w-full gap-2 sm:w-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                Usuarios
              </Button>
            </Link>
            <Link to="/admin/courses">
              <Button className="w-full gap-2 sm:w-auto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3 6l9-4 9 4-9 4-9-4Zm0 6l9 4 9-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Nuevo curso
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Usuarios"
          value={metrics ? `${metrics.users.active}/${metrics.users.total}` : "—"}
          tone="blue"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          right={<Badge variant="slate">Activos</Badge>}
        />
        <MetricCard
          label="Cursos"
          value={metrics ? `${metrics.courses.published}/${metrics.courses.total}` : "—"}
          tone="slate"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6l9-4 9 4-9 4-9-4Zm0 6l9 4 9-4" />
            </svg>
          }
          right={<Badge variant="blue">Publicados</Badge>}
        />
        <MetricCard
          label="Ingresos"
          value={metrics ? formatMoneyGTQ(metrics.payments.revenueTotal) : "—"}
          tone="green"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h20v10H2z" />
              <path d="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          }
          right={<Badge variant="green">Pagados</Badge>}
        />
        <MetricCard
          label="Sistema"
          value={!healthCheckedAt ? "Revisando" : metrics ? "Operativo" : "Atención"}
          tone={!healthCheckedAt ? "slate" : metrics ? "green" : "amber"}
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16v6H4z" />
              <path d="M4 14h16v6H4z" />
              <path d="M8 8h.01M8 18h.01" />
            </svg>
          }
          right={
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">rev: {checkedLabel}</span>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">Sesión</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Información del usuario autenticado.
                  </div>
                </div>
                <Link to="/admin/account">
                  <Button variant="ghost" className="gap-2">
                    Gestionar
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <Avatar
                  name={`${user?.nombres ?? ""} ${user?.apellidos ?? ""}`.trim() || "Admin"}
                  src={user?.foto_url}
                  size={56}
                  fit="contain"
                  className="bg-white dark:bg-slate-950"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-black text-slate-900 dark:text-white">
                    {user?.nombres} {user?.apellidos}
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{user?.correo}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={roleVariant}>{role}</Badge>
                    <Badge variant={stateVariant}>{user?.estado ?? "—"}</Badge>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ID #{user?.id ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="text-sm font-black text-slate-900 dark:text-white">Estado del sistema</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Indicadores reales del campus con caché para reducir consultas.
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-3">
                <StatusRow
                  label="API"
                  value="Online"
                  tone="green"
                  detail="Sin ping directo a la base de datos"
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Pagos pendientes</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.payments.pending : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Cursos borrador</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.courses.draft : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Usuarios suspendidos</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.users.suspended : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Inscripciones activas</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.enrollments.active : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Cursos ocultos</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.courses.hidden : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Reembolsos</div>
                  <div className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {metrics ? metrics.payments.refunded : "—"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <aside className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="text-sm font-black text-slate-900 dark:text-white">Acciones rápidas</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Atajos para administración.</div>
            </div>
            <div className="p-6">
              <div className="grid gap-2">
                <QuickLink
                  to="/admin/users"
                  title="Administrar usuarios"
                  subtitle="Roles, estado y perfiles"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
                <QuickLink
                  to="/admin/categories"
                  title="Categorías"
                  subtitle="Organiza el catálogo"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  }
                />
                <QuickLink
                  to="/courses"
                  title="Ver vista pública"
                  subtitle="Catálogo de cursos"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
                      <path d="M7 10h10M7 14h10" />
                    </svg>
                  }
                />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  icon,
  right,
}: {
  label: string;
  value: string;
  tone: "blue" | "slate" | "green" | "amber";
  icon: React.ReactNode;
  right?: React.ReactNode;
}) {
  const toneStyles =
    tone === "blue"
      ? "cf-admin-metric-surface--blue"
      : tone === "green"
        ? "cf-admin-metric-surface--green"
        : tone === "amber"
          ? "cf-admin-metric-surface--amber"
          : "cf-admin-metric-surface--slate";

  return (
    <Card className="group overflow-hidden">
      <div className={`cf-admin-metric-surface ${toneStyles}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-black/5 dark:bg-slate-950/90 dark:text-cyan-200 dark:ring-white/10">
            {icon}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        <div className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="mt-1 truncate text-base font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>
      </div>
    </Card>
  );
}

function StatusRow({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "slate";
  detail: string;
}) {
  const toneDot =
    tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-slate-400";
  const badge =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200"
        : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100";

  return (
    <div className="cf-admin-status-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{detail}</div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${badge}`}>
          <span className={`h-2 w-2 rounded-full ${toneDot}`} aria-hidden="true" />
          {value}
        </span>
      </div>
    </div>
  );
}

function QuickLink({
  to,
  title,
  subtitle,
  icon,
}: {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="cf-admin-quick-link group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/75 dark:hover:bg-slate-800/90"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm transition group-hover:opacity-95 dark:bg-cyan-500 dark:text-slate-950">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900 dark:text-white">{title}</div>
          <div className="truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</div>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400 transition group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-cyan-300">
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
