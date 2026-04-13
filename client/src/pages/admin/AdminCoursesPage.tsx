import { Suspense, useDeferredValue, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem, CourseStatus } from "../../types/course";
import { useAuth } from "../../hooks/useAuth";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { getApiErrorMessage } from "../../utils/apiError";
import { ArrowRight, Coins, GraduationCap, UserRound } from "lucide-react";
import { lazyNamed } from "../../utils/lazyNamed";

type CourseRow = CourseListItem & { estado: CourseStatus };

const PAGE_SIZE = 12;
const courseAccents = [
  "from-blue-600 via-cyan-600 to-slate-950",
  "from-emerald-500 via-teal-600 to-slate-950",
  "from-amber-500 via-orange-500 to-slate-950",
  "from-indigo-500 via-violet-600 to-slate-950",
] as const;
const CourseEditModal = lazyNamed(
  () => import("../../components/course/CourseEditModal"),
  "CourseEditModal",
);

function getCourseInitials(title: string) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CF";
}

function levelLabel(level: CourseListItem["nivel"]) {
  if (level === "basico") return "Basico";
  if (level === "intermedio") return "Intermedio";
  return "Avanzado";
}

function stateBadge(estado: string) {
  if (estado === "publicado") return "green" as const;
  if (estado === "borrador") return "amber" as const;
  return "slate" as const;
}

function stateLabel(estado: string) {
  if (estado === "publicado") return "Activo";
  if (estado === "oculto") return "Inactivo";
  return "Borrador";
}

function toggleLabel(estado: string) {
  if (estado === "publicado") return "Inactivar";
  if (estado === "oculto") return "Activar";
  return "Publicar";
}

export function AdminCoursesPage() {
  const { api } = useAuth();
  const [list, setList] = useState<{
    items: CourseRow[];
    total: number;
    page: number;
    limit: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<string>("");
  const [pendingDeleteCourse, setPendingDeleteCourse] = useState<CourseRow | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const load = async (pageToLoad = page) => {
    try {
      setIsLoading(true);
      setLoadError("");
      const res = await api.get<ApiResponse<{ items: CourseRow[]; total: number; page: number; limit: number }>>(
        "/courses/my/teaching",
        { params: { page: pageToLoad, limit: PAGE_SIZE, search: deferredQuery || undefined } }
      );
      const data = res.data.data;
      const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && pageToLoad > totalPages) {
        setPage(totalPages);
        return;
      }
      setList(data);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "No se pudieron cargar los cursos.";
      setList({ items: [], total: 0, page: pageToLoad, limit: PAGE_SIZE });
      setLoadError(String(message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, deferredQuery, page]);

  const onDelete = async (courseId: number) => {
    try {
      setDeletingId(courseId);
      await api.delete<ApiResponse<unknown>>(`/courses/${courseId}`);
      if (page > 1 && (list?.items.length ?? 0) === 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        await load();
      }
    } finally {
      setDeletingId(null);
      setPendingDeleteCourse(null);
    }
  };

  const toggleCourseStatus = async (course: CourseRow) => {
    const nextEstado: CourseStatus = course.estado === "publicado" ? "oculto" : "publicado";
    try {
      setStatusUpdatingId(course.id);
      setStatusError("");
      await api.put<ApiResponse<unknown>>(`/courses/${course.id}`, { estado: nextEstado });
      await load();
    } catch (err) {
      setStatusError(getApiErrorMessage(err, "No se pudo cambiar el estado del curso."));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const money = (raw: unknown) => {
    const n = Number(raw ?? 0);
    try {
      return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(Number.isFinite(n) ? n : 0);
    } catch {
      return `Q ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader title="Cursos" subtitle="Cursos creados por docentes en la plataforma." />
      </div>

      {statusError ? (
        <Card className="border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
          {statusError}
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="grid place-items-center py-10">
          <Spinner />
        </Card>
      ) : loadError ? (
        <Card className="p-6">
          <EmptyState
            title="No se pudieron cargar los cursos"
            description={loadError}
            actionLabel="Reintentar"
            onAction={load}
          />
        </Card>
      ) : !list || list.items.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={deferredQuery ? "Sin resultados" : "Sin cursos todavía"}
            description={
              deferredQuery
                ? "Prueba con otro texto o limpia la búsqueda."
                : "Cuando los docentes creen cursos, aparecerán aquí."
            }
            actionLabel={deferredQuery ? "Limpiar" : undefined}
            onAction={
              deferredQuery
                ? () => {
                    setQuery("");
                    setPage(1);
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-semibold text-slate-700">
                Total: <span className="font-black text-slate-900">{list.total}</span>
              </div>
              <div className="relative w-full md:w-[420px]">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
                </svg>
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por curso, slug o docente…"
                  className="bg-slate-50 py-2.5 pl-10 pr-3 font-semibold ring-1 ring-slate-200 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="grid gap-5 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3 2xl:grid-cols-4">
              {list.items.map((c, index) => (
                <AdminCourseCard
                  key={c.id}
                  course={c}
                  index={index}
                  money={money}
                  deleting={deletingId === c.id}
                  statusUpdating={statusUpdatingId === c.id}
                  onEdit={() => setEditId(c.id)}
                  onToggleStatus={() => void toggleCourseStatus(c)}
                  onDelete={() => setPendingDeleteCourse(c)}
                />
              ))}
            </div>

            <PaginationControls
              page={page}
              pageSize={list.limit}
              total={list.total}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          </div>
        </Card>
      )}

      <ConfirmDeleteModal
        open={Boolean(pendingDeleteCourse)}
        title="¿Eliminar curso?"
        description={`Vas a eliminar "${pendingDeleteCourse?.titulo ?? "este curso"}".\nEsta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={pendingDeleteCourse ? deletingId === pendingDeleteCourse.id : false}
        onCancel={() => setPendingDeleteCourse(null)}
        onConfirm={() => {
          if (pendingDeleteCourse) void onDelete(pendingDeleteCourse.id);
        }}
      />

      {editId !== null ? (
        <Suspense fallback={null}>
          <CourseEditModal
            api={api}
            open={editId !== null}
            courseId={editId}
            onClose={() => setEditId(null)}
            onSaved={() => {
              setEditId(null);
              void load();
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function AdminCourseCard({
  course,
  index,
  money,
  deleting,
  statusUpdating,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  course: CourseRow;
  index: number;
  money: (value: unknown) => string;
  deleting: boolean;
  statusUpdating: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const accent = courseAccents[index % courseAccents.length];
  const isFree = course.tipo_acceso === "gratis" || Number(course.precio || 0) <= 0;

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.8rem] border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40">
      <div className={`relative overflow-hidden bg-gradient-to-br ${accent} p-5 text-white`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute -right-3 top-12 h-20 w-20 rounded-full bg-white/10 blur-sm" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/95 text-base font-black text-slate-950 shadow-lg shadow-black/20">
            {getCourseInitials(course.titulo)}
          </div>
          <Badge variant={stateBadge(course.estado || "borrador")}>{stateLabel(course.estado || "borrador")}</Badge>
        </div>
        <div className="relative mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/72">
          {course.categoria.nombre}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={isFree ? "green" : "amber"}>{isFree ? "Gratis" : "Pago"}</Badge>
          <Badge variant="slate">{levelLabel(course.nivel)}</Badge>
        </div>

        <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
          {course.titulo}
        </h2>
        <p className="mt-2 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
          {course.slug}
        </p>

        <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <AdminCourseMeta
            icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
            label="Docente"
            value={`${course.docente.nombres} ${course.docente.apellidos}`.trim()}
          />
          <AdminCourseMeta
            icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
            label="Nivel"
            value={levelLabel(course.nivel)}
          />
          <AdminCourseMeta
            icon={<Coins className="h-4 w-4" aria-hidden="true" />}
            label="Precio"
            value={isFree ? "Gratis" : money(course.precio)}
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button
            size="sm"
            variant={course.estado === "publicado" ? "ghost" : "primary"}
            disabled={statusUpdating}
            onClick={onToggleStatus}
          >
            {statusUpdating ? "Guardando..." : toggleLabel(course.estado)}
          </Button>
          <Link to={`/admin/course/${course.id}/students`}>
            <Button size="sm" variant="secondary">
              Estudiantes
            </Button>
          </Link>
          <Link
            to={`/admin/course/${course.id}/home`}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 hover:shadow"
          >
            Contenido
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Button size="sm" variant="danger" disabled={deleting} onClick={onDelete}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AdminCourseMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <div className="truncate text-sm font-black text-slate-950 dark:text-white">
          {value}
        </div>
      </div>
    </div>
  );
}
