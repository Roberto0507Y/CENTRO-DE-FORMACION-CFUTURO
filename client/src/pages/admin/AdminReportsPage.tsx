import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, Download, Users } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AttendanceItem, AttendanceListResponse, AttendanceStatus } from "../../types/attendance";
import type { CourseListItem, CourseStatus } from "../../types/course";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatNumber, formatPercent } from "./reports/reportFormat";
import type { ReportMode, ZoneReportResponse, ZoneReportRow } from "./reports/reportTypes";
import "../../styles/admin-reports.css";

type CourseOption = CourseListItem & { estado: CourseStatus };

const COURSE_FETCH_LIMIT = 100;
const REPORT_PAGE_SIZE = 12;

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusBadge(status: AttendanceStatus | null) {
  if (status === "presente") return <Badge variant="green">Presente</Badge>;
  if (status === "ausente") return <Badge variant="rose">Ausente</Badge>;
  if (status === "tarde") return <Badge variant="amber">Tarde</Badge>;
  if (status === "justificado") return <Badge variant="blue">Justificado</Badge>;
  return <Badge variant="slate">Sin registro</Badge>;
}

function buildSummary(items: AttendanceItem[]) {
  return items.reduce(
    (acc, item) => {
      const estado = item.asistencia?.estado ?? null;
      if (estado === "presente") acc.presente += 1;
      else if (estado === "ausente") acc.ausente += 1;
      else if (estado === "tarde") acc.tarde += 1;
      else if (estado === "justificado") acc.justificado += 1;
      else acc.sinRegistro += 1;
      return acc;
    },
    { presente: 0, ausente: 0, tarde: 0, justificado: 0, sinRegistro: 0 }
  );
}

export function AdminReportsPage() {
  const { api } = useAuth();
  const [reportMode, setReportMode] = useState<ReportMode>("attendance");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [date, setDate] = useState(todayInputValue);
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [zoneReport, setZoneReport] = useState<ZoneReportResponse | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zonePage, setZonePage] = useState(1);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const summary = useMemo(() => buildSummary(items), [items]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(items.length / REPORT_PAGE_SIZE)));
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * REPORT_PAGE_SIZE;
    return items.slice(start, start + REPORT_PAGE_SIZE);
  }, [items, safePage]);
  const zoneRows = useMemo(() => zoneReport?.rows ?? [], [zoneReport]);
  const zoneSummary = zoneReport?.resumen ?? {
    estudiantes: 0,
    tareas_total: 0,
    quizzes_total: 0,
    tareas_puntos_posibles: 0,
    quizzes_puntos_posibles: 0,
    zona_puntos_obtenidos: 0,
    zona_puntos_posibles: 0,
    zona_promedio_porcentaje: null,
  };
  const safeZonePage = Math.min(zonePage, Math.max(1, Math.ceil(zoneRows.length / REPORT_PAGE_SIZE)));
  const paginatedZoneRows = useMemo(() => {
    const start = (safeZonePage - 1) * REPORT_PAGE_SIZE;
    return zoneRows.slice(start, start + REPORT_PAGE_SIZE);
  }, [safeZonePage, zoneRows]);

  const loadCourses = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoadingCourses(true);
        setError(null);
        const first = await api.get<
          ApiResponse<{ items: CourseOption[]; total: number; page: number; limit: number }>
        >("/courses/my/teaching", {
          params: { page: 1, limit: COURSE_FETCH_LIMIT },
          signal,
        });
        if (signal?.aborted) return;
        let nextCourses = first.data.data.items;
        const totalPages = Math.ceil(first.data.data.total / first.data.data.limit);

        if (totalPages > 1) {
          const pages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
          const rest = await Promise.all(
            pages.map((nextPage) =>
              api.get<ApiResponse<{ items: CourseOption[] }>>("/courses/my/teaching", {
                params: { page: nextPage, limit: COURSE_FETCH_LIMIT },
                signal,
              })
            )
          );
          if (signal?.aborted) return;
          nextCourses = nextCourses.concat(rest.flatMap((res) => res.data.data.items));
        }

        setCourses(nextCourses);
        setSelectedCourseId((current) => current ?? nextCourses[0]?.id ?? null);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setError(getApiErrorMessage(err, "No se pudieron cargar los cursos."));
      } finally {
        if (!signal?.aborted) setIsLoadingCourses(false);
      }
    },
    [api]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCourses(controller.signal);
    return () => controller.abort();
  }, [loadCourses]);

  const loadAttendanceReport = useCallback(
    async (signal?: AbortSignal) => {
      if (reportMode !== "attendance") return;
      if (!selectedCourseId) {
        setItems([]);
        return;
      }
      try {
        setIsLoadingReport(true);
        setError(null);
        const res = await api.get<ApiResponse<AttendanceListResponse>>(
          `/courses/${selectedCourseId}/attendance`,
          { params: { date }, signal }
        );
        if (signal?.aborted) return;
        setItems(res.data.data.items);
        setPage(1);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setItems([]);
        setError(getApiErrorMessage(err, "No se pudo cargar el reporte de asistencia."));
      } finally {
        if (!signal?.aborted) setIsLoadingReport(false);
      }
    },
    [api, date, reportMode, selectedCourseId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAttendanceReport(controller.signal);
    return () => controller.abort();
  }, [loadAttendanceReport]);

  const loadZoneReport = useCallback(
    async (signal?: AbortSignal) => {
      if (reportMode !== "zone") return;
      if (!selectedCourseId) {
        setZoneReport(null);
        return;
      }
      try {
        setIsLoadingReport(true);
        setError(null);
        const res = await api.get<ApiResponse<ZoneReportResponse>>("/reports/zone", {
          params: { course_id: selectedCourseId },
          signal,
        });
        if (signal?.aborted) return;
        setZoneReport(res.data.data);
        setZonePage(1);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setZoneReport(null);
        setError(getApiErrorMessage(err, "No se pudo cargar el reporte de zona."));
      } finally {
        if (!signal?.aborted) setIsLoadingReport(false);
      }
    },
    [api, reportMode, selectedCourseId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadZoneReport(controller.signal);
    return () => controller.abort();
  }, [loadZoneReport]);

  const canExport =
    !isLoadingReport &&
    ((reportMode === "attendance" && Boolean(selectedCourse) && items.length > 0) ||
      (reportMode === "zone" && Boolean(zoneReport) && zoneRows.length > 0));

  const heroCopy =
    reportMode === "attendance"
      ? {
          eyebrow: "Asistencia general",
          title: "Reporte por curso y fecha",
          description:
            "Selecciona un curso, revisa el estado de cada estudiante y descarga una hoja de Excel lista para entregar.",
        }
      : {
          eyebrow: "Zona académica",
          title: "Tareas + quizzes por estudiante",
          description:
            "Suma automáticamente las tareas calificadas y los quizzes completados para revisar la zona del curso.",
        };

  const handleExport = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const { exportAttendanceExcel, exportZoneExcel } = await import("./reports/reportExcel");
      if (reportMode === "attendance" && selectedCourse) {
        exportAttendanceExcel({ course: selectedCourse, date, items });
      }
      if (reportMode === "zone" && zoneReport) {
        exportZoneExcel(zoneReport);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Consulta asistencia y zona académica por curso, con exportación directa a Excel."
      />

      <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row">
            <ModeButton
              active={reportMode === "attendance"}
              label="Asistencia"
              description="Por fecha"
              onClick={() => {
                setReportMode("attendance");
                setError(null);
              }}
            />
            <ModeButton
              active={reportMode === "zone"}
              label="Zona"
              description="Tareas + quizzes"
              onClick={() => {
                setReportMode("zone");
                setError(null);
              }}
            />
          </div>
        </div>
        <div className="cf-admin-reports-hero px-6 py-7 text-white">
          <div className="cf-admin-reports-hero-ring pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full" />
          <div className="cf-admin-reports-hero-glow pointer-events-none absolute right-16 top-10 h-28 w-28 rounded-full" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="cf-admin-reports-hero-kicker text-xs font-black uppercase text-cyan-100">
                {heroCopy.eyebrow}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{heroCopy.title}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/78">
                {heroCopy.description}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!canExport || isExporting}
              onClick={() => void handleExport()}
              className="gap-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting ? "Preparando..." : "Exportar Excel"}
            </Button>
          </div>
        </div>

        <div className={`cf-admin-reports-filter-grid border-b border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50 ${reportMode === "attendance" ? "cf-admin-reports-filter-grid--attendance" : ""}`}>
          <div>
            <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Curso</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none ring-blue-500/20 transition focus:border-blue-300 focus:ring-4 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-cyan-400/40"
              value={selectedCourseId ?? ""}
              onChange={(event) => setSelectedCourseId(Number(event.target.value) || null)}
              disabled={isLoadingCourses}
            >
              {courses.length === 0 ? <option value="">Sin cursos disponibles</option> : null}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.titulo} · {course.docente.nombres} {course.docente.apellidos}
                </option>
              ))}
            </select>
          </div>
          {reportMode === "attendance" ? (
            <div>
              <label className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Fecha</label>
              <Input
                className="mt-2 py-3"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mx-5 mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {reportMode === "attendance" ? (
          <>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
              <ReportStat icon={<Users className="h-4 w-4" />} label="Estudiantes" value={items.length} />
              <ReportStat icon={<BookOpen className="h-4 w-4" />} label="Presentes" value={summary.presente} tone="green" />
              <ReportStat icon={<CalendarDays className="h-4 w-4" />} label="Tarde" value={summary.tarde} tone="amber" />
              <ReportStat icon={<BookOpen className="h-4 w-4" />} label="Justificados" value={summary.justificado} tone="blue" />
              <ReportStat icon={<Users className="h-4 w-4" />} label="Ausentes" value={summary.ausente} tone="rose" />
              <ReportStat icon={<Users className="h-4 w-4" />} label="Sin registro" value={summary.sinRegistro} />
            </div>

            <div className="px-5 pb-5">
              {isLoadingCourses || isLoadingReport ? (
                <LoadingReport />
              ) : items.length === 0 ? (
                <EmptyState
                  title="No hay estudiantes para mostrar"
                  description="Selecciona otro curso o fecha para consultar la asistencia."
                />
              ) : (
                <div className="cf-admin-reports-table-shell overflow-x-auto border border-slate-200 bg-white [-webkit-overflow-scrolling:touch] dark:border-slate-800 dark:bg-slate-900">
                  <div className="cf-admin-reports-attendance-head cf-admin-reports-head-label gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <div>#</div>
                    <div>Estudiante</div>
                    <div>Correo</div>
                    <div>Estado</div>
                    <div>Comentario</div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedItems.map((item, index) => {
                      const rowNumber = (safePage - 1) * REPORT_PAGE_SIZE + index + 1;
                      const fullName = `${item.estudiante.apellidos}, ${item.estudiante.nombres}`.trim();
                      return (
                        <div key={item.estudiante.id} className="cf-admin-reports-attendance-row grid gap-3 px-5 py-4">
                          <div className="text-sm font-black text-slate-500">#{rowNumber}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-950 dark:text-white">{fullName}</div>
                          </div>
                          <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {item.estudiante.correo}
                          </div>
                          <div>{statusBadge(item.asistencia?.estado ?? null)}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">
                            {item.asistencia?.comentario || "Sin comentario"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <PaginationControls
                    page={safePage}
                    pageSize={REPORT_PAGE_SIZE}
                    total={items.length}
                    isLoading={isLoadingReport}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <ZoneReportContent
            rows={zoneRows}
            paginatedRows={paginatedZoneRows}
            page={safeZonePage}
            summary={zoneSummary}
            isLoading={isLoadingCourses || isLoadingReport}
            onPageChange={setZonePage}
          />
        )}
      </Card>
    </div>
  );
}

function ModeButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cf-admin-reports-mode flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "cf-admin-reports-mode--active border-blue-300 bg-blue-50 text-blue-800 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/10"
      }`}
    >
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-0.5 block text-xs font-semibold opacity-70">{description}</span>
      </span>
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-blue-600 dark:bg-cyan-300" : "bg-slate-300 dark:bg-slate-700"}`} />
    </button>
  );
}

function LoadingReport() {
  return (
    <div className="cf-admin-reports-loading-shell grid place-items-center border border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <Spinner />
        Cargando reporte...
      </div>
    </div>
  );
}

function ZoneReportContent({
  rows,
  paginatedRows,
  page,
  summary,
  isLoading,
  onPageChange,
}: {
  rows: ZoneReportRow[];
  paginatedRows: ZoneReportRow[];
  page: number;
  summary: ZoneReportResponse["resumen"];
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
        <ReportStat icon={<Users className="h-4 w-4" />} label="Estudiantes" value={summary.estudiantes} />
        <ReportStat icon={<BookOpen className="h-4 w-4" />} label="Tareas" value={summary.tareas_total} tone="blue" />
        <ReportStat icon={<BookOpen className="h-4 w-4" />} label="Quizzes" value={summary.quizzes_total} tone="green" />
        <ReportStat icon={<CalendarDays className="h-4 w-4" />} label="Zona obtenida" value={formatNumber(summary.zona_puntos_obtenidos)} tone="amber" />
        <ReportStat icon={<CalendarDays className="h-4 w-4" />} label="Zona posible" value={formatNumber(summary.zona_puntos_posibles)} />
        <ReportStat icon={<BookOpen className="h-4 w-4" />} label="Promedio" value={formatPercent(summary.zona_promedio_porcentaje)} tone="green" />
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No hay zona para mostrar"
            description="Cuando el curso tenga estudiantes inscritos, tareas o quizzes, aparecerá el resumen aquí."
          />
        ) : (
          <div className="cf-admin-reports-table-shell cf-admin-reports-zone-table border border-slate-200 bg-white [-webkit-overflow-scrolling:touch] dark:border-slate-800 dark:bg-slate-900">
            <div className="cf-admin-reports-zone-head cf-admin-reports-head-label gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <div>#</div>
              <div>Estudiante</div>
              <div>Correo</div>
              <div>Tareas</div>
              <div>Quizzes</div>
              <div>Zona</div>
              <div>%</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRows.map((row, index) => {
                const rowNumber = (page - 1) * REPORT_PAGE_SIZE + index + 1;
                const fullName = `${row.estudiante.apellidos}, ${row.estudiante.nombres}`.trim();
                return (
                  <div key={row.estudiante.id} className="cf-admin-reports-zone-row grid gap-3 px-5 py-4">
                    <div className="text-sm font-black text-slate-500">#{rowNumber}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950 dark:text-white">{fullName}</div>
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {row.estudiante.correo}
                    </div>
                    <ScoreCell
                      label="Tareas"
                      score={row.tareas.puntos_obtenidos}
                      possible={row.tareas.puntos_posibles}
                      hint={`${row.tareas.calificadas ?? 0}/${row.tareas.total} calificadas`}
                    />
                    <ScoreCell
                      label="Quizzes"
                      score={row.quizzes.puntos_obtenidos}
                      possible={row.quizzes.puntos_posibles}
                      hint={`${row.quizzes.completados ?? 0}/${row.quizzes.total} completados`}
                    />
                    <ScoreCell
                      label="Zona"
                      score={row.zona.puntos_obtenidos}
                      possible={row.zona.puntos_posibles}
                      hint="Tareas + quizzes"
                    />
                    <div>
                      <Badge variant={row.zona.porcentaje === null ? "slate" : row.zona.porcentaje >= 70 ? "green" : "amber"}>
                        {formatPercent(row.zona.porcentaje)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationControls
              page={page}
              pageSize={REPORT_PAGE_SIZE}
              total={rows.length}
              isLoading={isLoading}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </>
  );
}

function ScoreCell({
  label,
  score,
  possible,
  hint,
}: {
  label: string;
  score: number;
  possible: number;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <div className="sr-only">{label}</div>
      <div className="text-sm font-black text-slate-950 dark:text-white">
        {formatNumber(score)} / {formatNumber(possible)}
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

function ReportStat({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: "slate" | "green" | "amber" | "blue" | "rose";
}) {
  const toneClass =
    tone === "green"
      ? "cf-admin-reports-stat--green"
      : tone === "amber"
        ? "cf-admin-reports-stat--amber"
        : tone === "blue"
          ? "cf-admin-reports-stat--blue"
          : tone === "rose"
            ? "cf-admin-reports-stat--rose"
            : "cf-admin-reports-stat--slate";

  return (
    <div className={`cf-admin-reports-stat ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="cf-admin-reports-stat-label text-xs font-black uppercase opacity-75">{label}</div>
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/80 text-current shadow-sm shadow-slate-950/5 dark:bg-white/10">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}
