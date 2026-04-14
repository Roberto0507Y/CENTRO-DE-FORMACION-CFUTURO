import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { MyEnrollmentItem } from "../../types/enrollment";

const courseAccents = [
  "from-blue-600 via-cyan-600 to-slate-950",
  "from-emerald-500 via-teal-600 to-slate-950",
  "from-amber-500 via-orange-500 to-slate-950",
  "from-indigo-500 via-violet-600 to-slate-950",
] as const;
const PAGE_SIZE = 12;

function accessBadgeVariant(access: MyEnrollmentItem["curso"]["tipo_acceso"]) {
  return access === "gratis" ? "green" : "blue";
}

function enrollmentBadgeVariant(status: MyEnrollmentItem["estado"]) {
  if (status === "activa") return "green";
  if (status === "pendiente") return "amber";
  if (status === "cancelada") return "rose";
  return "blue";
}

function formatEnrollmentStatus(status: MyEnrollmentItem["estado"]) {
  if (status === "activa") return "Activa";
  if (status === "pendiente") return "Pendiente";
  if (status === "cancelada") return "Cancelada";
  if (status === "finalizada") return "Finalizada";
  return status;
}

function formatLevel(level: string) {
  if (level === "basico") return "Basico";
  if (level === "intermedio") return "Intermedio";
  if (level === "avanzado") return "Avanzado";
  return level;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCourseInitials(title: string) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CF";
}

function getTeacherName(enrollment: MyEnrollmentItem) {
  const name = `${enrollment.docente.nombres ?? ""} ${enrollment.docente.apellidos ?? ""}`.trim();
  return name || "Docente asignado";
}

export function MyCoursesPage() {
  const { api } = useAuth();
  const [items, setItems] = useState<MyEnrollmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<MyEnrollmentItem[]>>("/enrollments/my-courses", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setItems(res.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || controller.signal.aborted) return;
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [api]);

  const sortedCourses = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = new Date(a.fecha_inscripcion).getTime();
        const db = new Date(b.fecha_inscripcion).getTime();
        return db - da;
      }),
    [items],
  );

  const visibleCourses = useMemo(
    () => sortedCourses.filter((item) => item.curso.estado === "publicado"),
    [sortedCourses],
  );
  const totalPages = Math.max(1, Math.ceil(visibleCourses.length / PAGE_SIZE));
  const paginatedCourses = useMemo(
    () => visibleCourses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, visibleCourses],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.7)] dark:border-slate-800 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_90%_12%,rgba(37,99,235,0.26),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0),rgba(15,23,42,0.92))]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Aula estudiante
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
              Mis cursos
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">
              Tus inscripciones activas, ordenadas y listas para entrar al aula.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] px-5 py-4 text-right backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-300">
              Cursos
            </div>
            <div className="mt-2 text-4xl font-black tracking-tight text-white">
              {visibleCourses.length}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <Card className="grid place-items-center border-white/80 bg-white/80 py-20 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <Spinner />
        </Card>
      ) : visibleCourses.length === 0 ? (
        <Card className="overflow-hidden border-white/80 bg-white/85 p-8 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="grid h-14 w-14 place-items-center rounded-3xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-300/10 dark:text-cyan-200 dark:ring-cyan-300/10">
                <BookOpen className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Todavia no tienes cursos
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Explora el catalogo para inscribirte y ver aqui tus cursos.
              </p>
            </div>
            <Link to="/courses">
              <Button>Explorar cursos</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border-white/80 bg-white/80 p-0 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid gap-5 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-4">
            {paginatedCourses.map((enrollment, index) => (
              <CourseEnrollmentCard key={enrollment.id} enrollment={enrollment} index={index} />
            ))}
          </div>
          <PaginationControls
            page={page}
            pageSize={PAGE_SIZE}
            total={visibleCourses.length}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </Card>
      )}
    </div>
  );
}

const CourseEnrollmentCard = memo(function CourseEnrollmentCard({
  enrollment,
  index,
}: {
  enrollment: MyEnrollmentItem;
  index: number;
}) {
  const accent = courseAccents[index % courseAccents.length];

  return (
    <Link
      to={`/student/course/${enrollment.curso.id}`}
      className="group block rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-cyan-300 dark:focus:ring-offset-slate-950"
    >
      <article className="h-full overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40">
        <div className={`relative overflow-hidden bg-gradient-to-br ${accent} p-5 text-white`}>
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full border border-white/20" />
          <div className="pointer-events-none absolute -right-3 top-12 h-20 w-20 rounded-full bg-white/10 blur-sm" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/95 text-base font-black text-slate-950 shadow-lg shadow-black/20">
              {getCourseInitials(enrollment.curso.titulo)}
            </div>
            <Badge variant={accessBadgeVariant(enrollment.curso.tipo_acceso)}>
              {enrollment.curso.tipo_acceso === "gratis" ? "Gratis" : "Pago"}
            </Badge>
          </div>
          <div className="relative mt-6 text-xs font-bold uppercase tracking-[0.2em] text-white/72">
            {enrollment.categoria.nombre}
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={enrollmentBadgeVariant(enrollment.estado)}>
              {formatEnrollmentStatus(enrollment.estado)}
            </Badge>
            <Badge variant="slate">{formatLevel(enrollment.curso.nivel)}</Badge>
          </div>

          <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-cyan-300">
            {enrollment.curso.titulo}
          </h2>
          <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {getTeacherName(enrollment)}
          </p>

          <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Nivel
                </div>
                <div className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {formatLevel(enrollment.curso.nivel)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Inscripcion
                </div>
                <div className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {formatDate(enrollment.fecha_inscripcion)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Entrar al aula
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:translate-x-1 group-hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:group-hover:bg-cyan-200">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});
