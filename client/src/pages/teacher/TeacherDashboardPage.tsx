import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem } from "../../types/course";

function getCourseInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "C";
}

export function TeacherDashboardPage() {
  const { user, api } = useAuth();
  const [items, setItems] = useState<Array<CourseListItem & { estado: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<{ items: Array<CourseListItem & { estado: string }> }>>(
          "/courses/my/teaching",
          { params: { page: 1, limit: 50 } }
        );
        setItems(res.data.data.items);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api]);

  const publishedCount = useMemo(
    () => items.filter((c) => c.estado === "publicado").length,
    [items]
  );

  const draftCount = useMemo(
    () => items.filter((c) => c.estado === "borrador").length,
    [items]
  );

  const hiddenCount = useMemo(
    () => items.filter((c) => c.estado === "oculto").length,
    [items]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Hola, ${user?.nombres ?? ""} ${user?.apellidos ?? ""}`.trim()}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Cursos" value={`${items.length}`} hint="Total" />
        <StatCard label="Publicados" value={`${publishedCount}`} hint="Visibles al público" />
        <StatCard label="Rol" value={user?.rol ?? "—"} hint="Cuenta" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">Tus cursos</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gestiona tus cursos publicados y borradores.</div>
                </div>
                <Link
                  to="/teacher/courses"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-700 sm:w-auto"
                >
                  Ir a cursos
                </Link>
              </div>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : items.length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">Aún no has creado cursos.</div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {items.slice(0, 12).map((c) => {
                    const badge =
                      c.estado === "publicado"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-200 dark:ring-emerald-900/40"
                        : c.estado === "borrador"
                          ? "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-900/40"
                          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:ring-slate-700";

                    return (
                      <Link key={c.id} to="/teacher/courses" className="group">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/85 dark:hover:shadow-cyan-950/20">
                          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-950">
                            <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/20" />
                            <div className="pointer-events-none absolute -right-3 top-12 h-20 w-20 rounded-full bg-white/10 blur-sm" />
                            <div className="absolute left-3 bottom-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/95 text-base font-black text-slate-950 shadow-lg shadow-black/20 dark:bg-slate-950/90 dark:text-cyan-200 dark:shadow-cyan-950/30">
                              {getCourseInitial(c.titulo)}
                            </div>
                            <div className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-black/5 bg-white/90 text-slate-900 dark:bg-slate-950/85 dark:text-slate-100 dark:ring-white/10">
                              {c.tipo_acceso === "gratis" ? "Gratis" : "Pago"}
                            </div>
                            <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${badge}`}>
                              {c.estado}
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="line-clamp-2 text-sm font-extrabold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-cyan-300">
                              {c.titulo}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              {c.categoria.nombre} · {c.nivel}
                            </div>
                            <div className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                              {c.fecha_publicacion ? `Publicado: ${new Date(c.fecha_publicacion).toLocaleDateString("es-GT")}` : "Sin fecha de publicación"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Por hacer</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Acciones rápidas</div>
            </div>
            <div className="p-4">
              <div className="grid gap-2">
                <Link
                  to="/teacher/courses"
                  className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-100 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:border-slate-800 dark:bg-slate-950/70 dark:text-white dark:hover:bg-slate-800/90"
                >
                  <span>Crear / editar cursos</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Abrir</span>
                </Link>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/75">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Resumen</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100 dark:bg-emerald-950/35 dark:ring-emerald-900/40">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-200">Publicados</div>
                      <div className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-100">{publishedCount}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100 dark:bg-amber-950/35 dark:ring-amber-900/40">
                      <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Borrador</div>
                      <div className="mt-1 text-lg font-black text-amber-900 dark:text-amber-100">{draftCount}</div>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Ocultos</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{hiddenCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Actividad</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Últimos cursos editados</div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="grid place-items-center py-6">
                  <Spinner />
                </div>
              ) : items.length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">Sin actividad reciente.</div>
              ) : (
                <div className="grid gap-2">
                  {items.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{c.titulo}</div>
                        <div className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">
                          {c.categoria.nombre} · {c.estado}
                        </div>
                      </div>
                      <Link
                        to="/teacher/courses"
                        className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                      >
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
