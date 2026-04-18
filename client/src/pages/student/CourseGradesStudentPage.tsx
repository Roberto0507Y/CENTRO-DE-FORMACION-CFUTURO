import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AttendanceStatus } from "../../types/attendance";
import type {
  GradebookAttendanceItem,
  GradebookQuizItem,
  GradebookTaskItem,
  MyCourseGradebook,
} from "../../types/gradebook";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "../shared/courseManage.types";

const ATTENDANCE_PAGE_SIZE = 6;

function formatDate(value: string | null | undefined) {
  if (!value) return "Pendiente";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return localDate.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Pendiente";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function formatScore(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Sin nota";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sin datos";
  return `${formatScore(value)}%`;
}

function attendanceBadge(status: AttendanceStatus) {
  if (status === "presente") return <Badge variant="green">Presente</Badge>;
  if (status === "tarde") return <Badge variant="amber">Tarde</Badge>;
  if (status === "justificado") return <Badge variant="blue">Justificado</Badge>;
  return <Badge variant="rose">Ausente</Badge>;
}

function gradeBadge(task: GradebookTaskItem) {
  if (!task.entrega) return <Badge variant="slate">Sin entrega</Badge>;
  if (task.entrega.calificacion === null || task.entrega.calificacion === undefined) {
    return <Badge variant="amber">Pendiente de nota</Badge>;
  }
  if (task.entrega.estado === "devuelta") return <Badge variant="rose">Devuelta</Badge>;
  return <Badge variant="green">Calificada</Badge>;
}

function quizGradeBadge(quiz: GradebookQuizItem) {
  if (!quiz.completado) return <Badge variant="slate">Sin completar</Badge>;
  if (quiz.puntaje_obtenido === null || quiz.puntaje_obtenido === undefined) {
    return <Badge variant="amber">Pendiente</Badge>;
  }
  return <Badge variant="green">Completado</Badge>;
}

function metricTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "from-slate-950 to-slate-800 dark:from-slate-900 dark:to-slate-800";
  if (value >= 85) return "from-emerald-600 to-cyan-700 dark:from-emerald-500 dark:to-cyan-600";
  if (value >= 70) return "from-blue-700 to-cyan-700 dark:from-blue-600 dark:to-cyan-500";
  return "from-amber-600 to-rose-700 dark:from-amber-500 dark:to-rose-600";
}

function TaskGradeRow({ task }: { task: GradebookTaskItem }) {
  const score = task.entrega?.calificacion;
  const hasGrade = score !== null && score !== undefined;

  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-cyan-400/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950 dark:text-white">{task.titulo}</div>
          <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Entrega: {formatDateTime(task.fecha_entrega)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gradeBadge(task)}
          <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white dark:bg-cyan-500 dark:text-slate-950">
            {hasGrade ? formatScore(score) : "—"} / {formatScore(task.puntos)}
          </div>
        </div>
      </div>

      {task.entrega?.comentario_docente ? (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-slate-200">
          {task.entrega.comentario_docente}
        </div>
      ) : (
        <div className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {task.entrega ? "Aún no hay retroalimentación del docente." : "Todavía no has enviado esta tarea."}
        </div>
      )}
    </div>
  );
}

function AttendanceRow({ item }: { item: GradebookAttendanceItem }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
      <div>
        <div className="text-sm font-black text-slate-950 dark:text-white">{formatDate(item.fecha)}</div>
        {item.comentario ? (
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.comentario}</div>
        ) : null}
      </div>
      {attendanceBadge(item.estado)}
    </div>
  );
}

function QuizGradeRow({ quiz }: { quiz: GradebookQuizItem }) {
  const score = quiz.puntaje_obtenido;
  const hasGrade = score !== null && score !== undefined;

  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-emerald-400/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-950 dark:text-white">{quiz.titulo}</div>
          <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            Cierre: {formatDateTime(quiz.fecha_cierre)} · Intentos: {quiz.intentos}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quizGradeBadge(quiz)}
          <div className="rounded-2xl bg-emerald-700 px-3 py-2 text-sm font-black text-white dark:bg-emerald-400 dark:text-slate-950">
            {hasGrade ? formatScore(score) : "—"} / {formatScore(quiz.puntaje_total)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {quiz.completado
          ? `Mejor resultado registrado${quiz.fecha_fin ? ` el ${formatDateTime(quiz.fecha_fin)}` : ""}.`
          : "Aún no has completado este quiz."}
      </div>
    </div>
  );
}

export function CourseGradesStudentPage() {
  const { api } = useAuth();
  const { courseId } = useParams();
  const ctx = useOutletContext<CourseManageOutletContext>();
  const id = Number(courseId);

  const [data, setData] = useState<MyCourseGradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendancePage, setAttendancePage] = useState(1);

  const loadGradebook = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get<ApiResponse<MyCourseGradebook>>(`/courses/${id}/grades/my`);
      setData(res.data.data);
    } catch (err) {
      setData(null);
      setError(getApiErrorMessage(err, "No se pudieron cargar tus calificaciones."));
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    void loadGradebook();
  }, [loadGradebook]);

  useEffect(() => {
    setAttendancePage(1);
  }, [data?.asistencia.length]);

  const attendanceItems = useMemo(() => data?.asistencia ?? [], [data?.asistencia]);
  const attendanceTotalPages = Math.max(1, Math.ceil(attendanceItems.length / ATTENDANCE_PAGE_SIZE));
  const safeAttendancePage = Math.min(attendancePage, attendanceTotalPages);
  const paginatedAttendance = useMemo(() => {
    const start = (safeAttendancePage - 1) * ATTENDANCE_PAGE_SIZE;
    return attendanceItems.slice(start, start + ATTENDANCE_PAGE_SIZE);
  }, [attendanceItems, safeAttendancePage]);
  const attendanceStart = attendanceItems.length === 0 ? 0 : (safeAttendancePage - 1) * ATTENDANCE_PAGE_SIZE + 1;
  const attendanceEnd = Math.min(attendanceItems.length, safeAttendancePage * ATTENDANCE_PAGE_SIZE);

  if (loading) {
    return (
      <div className="grid place-items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-sm font-semibold text-rose-700 dark:text-rose-300">
        {error}
      </Card>
    );
  }

  if (!data) return null;

  const resumen = data.resumen;
  const quizzes = data.quizzes ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-slate-950/70">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(14,165,233,0.20),transparent_28%),radial-gradient(circle_at_86%_0%,rgba(34,197,94,0.16),transparent_26%)] dark:bg-[radial-gradient(circle_at_15%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.14),transparent_26%)]" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-700 dark:text-cyan-300">
                Calificaciones
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                {data.curso.titulo || ctx.courseTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                Revisa tus notas, retroalimentación y asistencia registrada en este curso.
              </p>
              <Button className="mt-5" variant="secondary" onClick={() => void loadGradebook()} disabled={loading}>
                Actualizar
              </Button>
            </div>
            <div
              className={`w-full rounded-[1.75rem] bg-gradient-to-br ${metricTone(
                resumen.zona_porcentaje,
              )} p-5 text-white shadow-2xl shadow-slate-950/20 sm:w-auto sm:min-w-[220px]`}
            >
              <div className="text-xs font-black uppercase tracking-[0.22em] opacity-80">Zona total</div>
              <div className="mt-3 text-4xl font-black tracking-tight">{formatPercent(resumen.zona_porcentaje)}</div>
              <div className="mt-2 text-xs font-bold opacity-80">
                Tareas + quizzes completados
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
            Zona acumulada
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {formatScore(resumen.zona_puntos_obtenidos)}
            <span className="text-lg text-slate-400"> / {formatScore(resumen.zona_puntos_posibles)}</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Tareas + quizzes completados</div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
            Tareas
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {formatScore(resumen.tareas_puntos_obtenidos)}
            <span className="text-lg text-slate-400"> / {formatScore(resumen.tareas_puntos_posibles)}</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {resumen.tareas_calificadas} de {resumen.tareas_total} calificadas
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
            Quizzes
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {formatScore(resumen.quizzes_puntos_obtenidos)}
            <span className="text-lg text-slate-400"> / {formatScore(resumen.quizzes_puntos_posibles)}</span>
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {resumen.quizzes_completados} de {resumen.quizzes_total} completados
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
            Asistencia
          </div>
          <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
            {formatPercent(resumen.asistencia_porcentaje)}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {resumen.asistencia_total} registros en total
          </div>
        </Card>

        <Card className="p-5 md:col-span-2 xl:col-span-4">
          <div className="text-xs font-black uppercase tracking-[0.20em] text-slate-500 dark:text-slate-400">
            Resumen asistencia
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="green">{resumen.asistencias_presentes} presentes</Badge>
            <Badge variant="amber">{resumen.asistencias_tarde} tarde</Badge>
            <Badge variant="blue">{resumen.asistencias_justificadas} justificadas</Badge>
            <Badge variant="rose">{resumen.asistencias_ausentes} ausentes</Badge>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-950 dark:text-white">Notas por tarea</div>
                <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Calificaciones y comentarios del docente.
                </div>
              </div>
              <Badge variant="blue">{resumen.tareas_calificadas} calificadas</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {data.tareas.length === 0 ? (
                <EmptyState title="Sin tareas publicadas" description="Cuando tu docente publique tareas aparecerán aquí." />
              ) : (
                data.tareas.map((task) => <TaskGradeRow key={task.id} task={task} />)
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-950 dark:text-white">Notas por quiz</div>
                <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Resultados completados que suman a tu zona.
                </div>
              </div>
              <Badge variant="green">{resumen.quizzes_completados} completados</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {quizzes.length === 0 ? (
                <EmptyState title="Sin quizzes publicados" description="Cuando tu docente publique quizzes aparecerán aquí." />
              ) : (
                quizzes.map((quiz) => <QuizGradeRow key={quiz.id} quiz={quiz} />)
              )}
            </div>
          </Card>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-950 dark:text-white">Asistencia</div>
              <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Registros del curso.
              </div>
            </div>
            <Badge variant="blue">{attendanceItems.length} registros</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {paginatedAttendance.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Aún no hay asistencia registrada.
              </div>
            ) : (
              paginatedAttendance.map((item) => <AttendanceRow key={item.id} item={item} />)
            )}
          </div>

          {attendanceItems.length > ATTENDANCE_PAGE_SIZE ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Mostrando {attendanceStart}-{attendanceEnd} de {attendanceItems.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeAttendancePage <= 1}
                  onClick={() => setAttendancePage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                  {safeAttendancePage} / {attendanceTotalPages}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeAttendancePage >= attendanceTotalPages}
                  onClick={() => setAttendancePage((page) => Math.min(attendanceTotalPages, page + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
