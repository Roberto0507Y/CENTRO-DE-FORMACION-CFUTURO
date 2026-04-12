import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { CourseCreateForm } from "../../components/course/CourseCreateForm";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem, CourseStatus } from "../../types/course";
import { Button } from "../../components/ui/Button";
import { CourseEditModal } from "../../components/course/CourseEditModal";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, GraduationCap } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { getApiErrorMessage } from "../../utils/apiError";

type TeachingResponse = { items: (CourseListItem & { estado: CourseStatus })[]; total: number; page: number; limit: number };
const PAGE_SIZE = 12;

const courseAccents = [
  "from-blue-600 via-cyan-600 to-slate-950",
  "from-emerald-500 via-teal-600 to-slate-950",
  "from-amber-500 via-orange-500 to-slate-950",
  "from-indigo-500 via-violet-600 to-slate-950",
] as const;

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

export function TeacherCoursesPage() {
  const { api, user } = useAuth();
  const [list, setList] = useState<TeachingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState<string>("");

  const load = async (pageToLoad = page) => {
    try {
      setIsLoading(true);
      const res = await api.get<ApiResponse<TeachingResponse>>("/courses/my/teaching", {
        params: { page: pageToLoad, limit: PAGE_SIZE },
      });
      const data = res.data.data;
      const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && pageToLoad > totalPages) {
        setPage(totalPages);
        return;
      }
      setList(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, page]);

  const toggleCourseStatus = async (course: TeachingResponse["items"][number]) => {
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

  return (
    <div className="space-y-6">
      <PageHeader title="Mis cursos" subtitle="Gestión docente" />

      {statusError ? (
        <Card className="border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
          {statusError}
        </Card>
      ) : null}

      {user ? (
        <CourseCreateForm
          api={api}
          currentUser={user}
          variant="teacher"
          onCreated={() => {
            setPage(1);
            void load(1);
          }}
        />
      ) : null}

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : !list || list.items.length === 0 ? (
        <Card className="p-4 text-sm text-slate-600">Aún no tienes cursos.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid gap-5 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3 2xl:grid-cols-4">
            {list.items.map((c, index) => (
              <TeacherCourseCard
                key={c.id}
                course={c}
                index={index}
                onEdit={() => setEditId(c.id)}
                statusUpdating={statusUpdatingId === c.id}
                onToggleStatus={() => void toggleCourseStatus(c)}
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
        </Card>
      )}

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
    </div>
  );
}

function TeacherCourseCard({
  course,
  index,
  onEdit,
  statusUpdating,
  onToggleStatus,
}: {
  course: CourseListItem & { estado: CourseStatus };
  index: number;
  onEdit: () => void;
  statusUpdating: boolean;
  onToggleStatus: () => void;
}) {
  const accent = courseAccents[index % courseAccents.length];

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-[1.8rem] border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40">
      <div className={`relative overflow-hidden bg-gradient-to-br ${accent} p-5 text-white`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute -right-3 top-12 h-20 w-20 rounded-full bg-white/10 blur-sm" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/95 text-base font-black text-slate-950 shadow-lg shadow-black/20">
            {getCourseInitials(course.titulo)}
          </div>
          <Badge variant={stateBadge(course.estado)}>{stateLabel(course.estado || "borrador")}</Badge>
        </div>
        <div className="relative mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/72">
          {course.categoria.nombre}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={course.tipo_acceso === "gratis" ? "green" : "amber"}>
            {course.tipo_acceso === "gratis" ? "Gratis" : "Pago"}
          </Badge>
          <Badge variant="slate">{levelLabel(course.nivel)}</Badge>
        </div>

        <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
          {course.titulo}
        </h2>
        <p className="mt-2 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
          {course.slug}
        </p>

        <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Nivel
              </div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                {levelLabel(course.nivel)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Publicacion
              </div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                {course.fecha_publicacion ? new Date(course.fecha_publicacion).toLocaleDateString("es-GT") : "Sin fecha"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
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
          <Link
            to={`/teacher/course/${course.id}/tasks`}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 hover:shadow"
          >
            Entrar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
