import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowRight, Clock, GraduationCap, Star, Users } from "lucide-react";
import type { CourseListItem } from "../../types/course";
import { formatMoneyGTQ } from "../../utils/format";
import { Badge } from "./Badge";
import { Card } from "./Card";

const courseAccents = [
  "from-blue-600 via-cyan-600 to-slate-950",
  "from-emerald-500 via-teal-600 to-slate-950",
  "from-amber-500 via-orange-500 to-slate-950",
  "from-indigo-500 via-violet-600 to-slate-950",
] as const;

function levelLabel(level: CourseListItem["nivel"]) {
  if (level === "basico") return "Básico";
  if (level === "intermedio") return "Intermedio";
  return "Avanzado";
}

function formatRating(rating: number) {
  const v = Math.max(0, Math.min(5, rating));
  return v.toFixed(1);
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

function getAccent(courseId: number) {
  return courseAccents[Math.abs(courseId) % courseAccents.length];
}

export function CourseCard({ course }: { course: CourseListItem }) {
  const priceLabel =
    course.tipo_acceso === "gratis" ? "Gratis" : formatMoneyGTQ(course.precio);
  const accent = getAccent(course.id);

  return (
    <Card className="group mx-auto flex h-full w-full max-w-[23.5rem] flex-col overflow-hidden rounded-[1.8rem] border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10 sm:max-w-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40">
      <div className={`relative overflow-hidden bg-gradient-to-br ${accent} p-4 text-white sm:p-5`}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/20 sm:-right-10 sm:-top-12 sm:h-32 sm:w-32" />
        <div className="pointer-events-none absolute right-0 top-10 h-16 w-16 rounded-full bg-white/10 blur-sm sm:-right-3 sm:top-12 sm:h-20 sm:w-20" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-[1.35rem] bg-white/95 text-sm font-black text-slate-950 shadow-lg shadow-black/20 sm:h-14 sm:w-14 sm:rounded-3xl sm:text-base">
            {getCourseInitials(course.titulo)}
          </div>
          <Badge variant={course.tipo_acceso === "gratis" ? "green" : "amber"}>
            {course.tipo_acceso === "gratis" ? "Gratis" : "De pago"}
          </Badge>
        </div>
        <div className="relative mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72 sm:mt-6 sm:text-xs sm:tracking-[0.2em]">
          {course.categoria.nombre}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="slate">{levelLabel(course.nivel)}</Badge>
          {typeof course.rating_promedio === "number" ? (
            <Badge variant="amber" className="gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
              {formatRating(course.rating_promedio)}
            </Badge>
          ) : (
            <Badge variant="slate" className="gap-1.5">
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              Nuevo
            </Badge>
          )}
        </div>

        <h2 className="mt-3 line-clamp-2 text-lg font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-700 sm:mt-4 sm:text-xl dark:text-white dark:group-hover:text-cyan-300">
          {course.titulo}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600 sm:mt-2 sm:leading-6 dark:text-slate-300">
          {course.descripcion_corta || "Curso publicado. Ingresa para ver el contenido."}
        </p>

        <div className="mt-4 grid gap-2.5 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-2.5 sm:mt-5 sm:gap-3 sm:rounded-[1.4rem] sm:p-3 dark:border-slate-800 dark:bg-slate-950/70">
          <CourseMeta
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Estudiantes"
            value={
              typeof course.estudiantes_count === "number"
                ? `${course.estudiantes_count}`
                : "Disponible"
            }
          />
          <CourseMeta
            icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
            label="Docente"
            value={`${course.docente.nombres} ${course.docente.apellidos}`.trim()}
          />
          {course.duracion_horas ? (
            <CourseMeta
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Duracion"
              value={`${course.duracion_horas} h`}
            />
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 min-[390px]:flex-row min-[390px]:items-end min-[390px]:justify-between sm:pt-5 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Precio
            </div>
            <div className="mt-1 text-lg font-black text-slate-950 sm:text-base dark:text-white">
              {priceLabel}
            </div>
          </div>
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 min-[390px]:w-auto min-[390px]:shrink-0 sm:w-auto sm:py-2"
          >
            Ver curso
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function CourseMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[1.15rem] bg-white text-blue-700 ring-1 ring-slate-200 sm:h-10 sm:w-10 sm:rounded-2xl dark:bg-slate-900 dark:text-cyan-300 dark:ring-slate-800">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] dark:text-slate-400">
          {label}
        </div>
        <div className="truncate text-sm font-black text-slate-950 dark:text-white">
          {value}
        </div>
      </div>
    </div>
  );
}
