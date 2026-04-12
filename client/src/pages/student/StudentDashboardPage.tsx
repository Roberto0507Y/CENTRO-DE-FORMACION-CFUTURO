import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Reveal } from "../../components/ui/Reveal";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { MyEnrollmentItem } from "../../types/enrollment";

const courseAccents = [
  "from-sky-500 via-blue-600 to-slate-950",
  "from-emerald-500 via-teal-600 to-slate-950",
  "from-amber-500 via-orange-500 to-slate-950",
  "from-indigo-500 via-violet-600 to-slate-950",
] as const;

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
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

export function StudentDashboardPage() {
  const { user, api } = useAuth();
  const [items, setItems] = useState<MyEnrollmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<MyEnrollmentItem[]>>("/enrollments/my-courses");
        setItems(res.data.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos dias";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const fullName = `${user?.nombres ?? ""} ${user?.apellidos ?? ""}`.trim();

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
    () => sortedCourses.filter((item) => item.curso.estado === "publicado").slice(0, 8),
    [sortedCourses],
  );

  return (
    <div className="space-y-8">
      <Reveal>
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/70 bg-white p-4 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_14%,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(37,99,235,0.18),transparent_28%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(239,246,255,0.88))] dark:bg-[radial-gradient(circle_at_8%_14%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(37,99,235,0.24),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))]" />
          <div className="pointer-events-none absolute -right-24 top-10 -z-10 h-80 w-80 rounded-full border border-blue-200/70 dark:border-cyan-300/10" />
          <div className="pointer-events-none absolute -right-8 top-32 -z-10 h-44 w-44 rounded-full border border-slate-300/70 dark:border-white/10" />

          <div className="rounded-[1.9rem] border border-white/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-blue-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Tablero estudiante
              </div>

              <h1 className="mt-6 max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {greeting}, {fullName || "bienvenido"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                Nos alegra tenerte de vuelta, sigamos aprendiendo juntos.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delayMs={80}>
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-700 dark:text-cyan-300">
                Cursos
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Tu aula del estudiante
              </h2>
            </div>
          </div>

          <Card className="overflow-hidden border-white/80 bg-white/80 p-4 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:p-5">
            {isLoading ? (
              <div className="grid place-items-center py-20">
                <Spinner />
              </div>
            ) : visibleCourses.length === 0 ? (
              <div className="relative overflow-hidden rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-cyan-300 dark:ring-slate-800">
                  <BookOpen className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                  Todavia no hay cursos activos
                </div>
                <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Cuando tengas cursos publicados disponibles, apareceran aqui con acceso directo al aula.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleCourses.map((enrollment, index) => (
                  <CourseTile key={enrollment.id} enrollment={enrollment} index={index} />
                ))}
              </div>
            )}
          </Card>
        </section>
      </Reveal>
    </div>
  );
}

function CourseTile({ enrollment, index }: { enrollment: MyEnrollmentItem; index: number }) {
  const accent = courseAccents[index % courseAccents.length];

  return (
    <Link
      to={`/student/course/${enrollment.curso.id}`}
      className="group block rounded-[1.8rem] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-cyan-300 dark:focus:ring-offset-slate-950"
    >
      <article className="h-full overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-2xl group-hover:shadow-blue-950/10 dark:border-slate-800 dark:bg-slate-900 dark:group-hover:border-cyan-400/40 dark:group-hover:shadow-cyan-950/20">
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

          <h3 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-cyan-300">
            {enrollment.curso.titulo}
          </h3>
          <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {getTeacherName(enrollment)}
          </p>

          <div className="mt-5 grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <CourseMeta
              icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
              label="Nivel"
              value={formatLevel(enrollment.curso.nivel)}
            />
            <CourseMeta
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="Inscripcion"
              value={formatDate(enrollment.fecha_inscripcion)}
            />
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
}

function CourseMeta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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
