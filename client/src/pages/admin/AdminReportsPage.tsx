import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { exportZoneExcel } from "./reports/reportExcel";
import { formatNumber, formatPercent } from "./reports/reportFormat";
import type { ReportMode, ZoneReportResponse, ZoneReportRow } from "./reports/reportTypes";

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

function statusLabel(status: AttendanceStatus | null) {
  if (status === "presente") return "Presente";
  if (status === "ausente") return "Ausente";
  if (status === "tarde") return "Tarde";
  if (status === "justificado") return "Justificado";
  return "Sin registro";
}

function statusBadge(status: AttendanceStatus | null) {
  if (status === "presente") return <Badge variant="green">Presente</Badge>;
  if (status === "ausente") return <Badge variant="rose">Ausente</Badge>;
  if (status === "tarde") return <Badge variant="amber">Tarde</Badge>;
  if (status === "justificado") return <Badge variant="blue">Justificado</Badge>;
  return <Badge variant="slate">Sin registro</Badge>;
}

function formatDateEs(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
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

function exportAttendanceExcel(input: {
  course: CourseOption;
  date: string;
  items: AttendanceItem[];
}) {
  const summary = buildSummary(input.items);
  const rows = input.items
    .map((item, index) => {
      const fullName = `${item.estudiante.apellidos}, ${item.estudiante.nombres}`.trim();
      const estado = item.asistencia?.estado ?? null;
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(fullName)}</td>
          <td>${escapeHtml(item.estudiante.correo)}</td>
          <td class="status status-${escapeHtml(estado ?? "sin-registro")}">${escapeHtml(statusLabel(estado))}</td>
          <td>${escapeHtml(item.asistencia?.comentario || "Sin comentario")}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Aptos, Calibri, Arial, sans-serif; color: #0f172a; }
          .sheet { padding: 24px; }
          .hero { background: linear-gradient(135deg, #2563eb, #06b6d4 55%, #020617); color: #fff; padding: 24px; border-radius: 18px; }
          .eyebrow { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #bfdbfe; font-weight: 800; }
          h1 { margin: 8px 0 0; font-size: 28px; }
          .subtitle { margin-top: 8px; color: #dbeafe; font-size: 14px; }
          .summary { margin-top: 20px; border-collapse: separate; border-spacing: 10px; width: 100%; }
          .summary td { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; font-weight: 800; }
          .summary .label { color: #64748b; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
          .summary .value { display: block; margin-top: 6px; font-size: 22px; color: #020617; }
          table.report { margin-top: 20px; width: 100%; border-collapse: collapse; }
          .report th { background: #0f172a; color: #fff; padding: 12px; text-align: left; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
          .report td { border-bottom: 1px solid #e2e8f0; padding: 12px; font-size: 13px; vertical-align: top; }
          .report tr:nth-child(even) td { background: #f8fafc; }
          .center { text-align: center; }
          .status { font-weight: 800; }
          .status-presente { color: #047857; }
          .status-ausente { color: #be123c; }
          .status-tarde { color: #b45309; }
          .status-justificado { color: #1d4ed8; }
          .status-sin-registro { color: #64748b; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <div class="eyebrow">C.FUTURO · Reporte de asistencia</div>
            <h1>${escapeHtml(input.course.titulo)}</h1>
            <div class="subtitle">
              Fecha: ${escapeHtml(formatDateEs(input.date))} · Docente:
              ${escapeHtml(`${input.course.docente.nombres} ${input.course.docente.apellidos}`.trim())}
            </div>
          </div>

          <table class="summary">
            <tr>
              <td><span class="label">Estudiantes</span><span class="value">${input.items.length}</span></td>
              <td><span class="label">Presentes</span><span class="value">${summary.presente}</span></td>
              <td><span class="label">Tarde</span><span class="value">${summary.tarde}</span></td>
              <td><span class="label">Justificados</span><span class="value">${summary.justificado}</span></td>
              <td><span class="label">Ausentes</span><span class="value">${summary.ausente}</span></td>
              <td><span class="label">Sin registro</span><span class="value">${summary.sinRegistro}</span></td>
            </tr>
          </table>

          <table class="report">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([`\ufeff${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-asistencia-${sanitizeFilename(input.course.titulo)}-${input.date}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingCourses(true);
        setError(null);
        const first = await api.get<
          ApiResponse<{ items: CourseOption[]; total: number; page: number; limit: number }>
        >("/courses/my/teaching", { params: { page: 1, limit: COURSE_FETCH_LIMIT } });
        let nextCourses = first.data.data.items;
        const totalPages = Math.ceil(first.data.data.total / first.data.data.limit);

        if (totalPages > 1) {
          const pages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
          const rest = await Promise.all(
            pages.map((nextPage) =>
              api.get<ApiResponse<{ items: CourseOption[] }>>("/courses/my/teaching", {
                params: { page: nextPage, limit: COURSE_FETCH_LIMIT },
              })
            )
          );
          nextCourses = nextCourses.concat(rest.flatMap((res) => res.data.data.items));
        }

        setCourses(nextCourses);
        setSelectedCourseId((current) => current ?? nextCourses[0]?.id ?? null);
      } catch (err) {
        setError(getApiErrorMessage(err, "No se pudieron cargar los cursos."));
      } finally {
        setIsLoadingCourses(false);
      }
    })();
  }, [api]);

  useEffect(() => {
    (async () => {
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
          { params: { date } }
        );
        setItems(res.data.data.items);
        setPage(1);
      } catch (err) {
        setItems([]);
        setError(getApiErrorMessage(err, "No se pudo cargar el reporte de asistencia."));
      } finally {
        setIsLoadingReport(false);
      }
    })();
  }, [api, date, reportMode, selectedCourseId]);

  useEffect(() => {
    (async () => {
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
        });
        setZoneReport(res.data.data);
        setZonePage(1);
      } catch (err) {
        setZoneReport(null);
        setError(getApiErrorMessage(err, "No se pudo cargar el reporte de zona."));
      } finally {
        setIsLoadingReport(false);
      }
    })();
  }, [api, reportMode, selectedCourseId]);

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
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-950 px-6 py-7 text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/20" />
          <div className="pointer-events-none absolute right-16 top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">
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
              disabled={!canExport}
              onClick={() => {
                if (reportMode === "attendance" && selectedCourse) {
                  exportAttendanceExcel({ course: selectedCourse, date, items });
                }
                if (reportMode === "zone" && zoneReport) exportZoneExcel(zoneReport);
              }}
              className="gap-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <div
          className={`grid gap-4 border-b border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50 ${
            reportMode === "attendance" ? "lg:grid-cols-[minmax(0,1fr)_220px]" : "lg:grid-cols-1"
          }`}
        >
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
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="hidden grid-cols-[70px_minmax(220px,1.3fr)_minmax(220px,1fr)_160px_minmax(220px,1fr)] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 xl:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
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
                        <div
                          key={item.estudiante.id}
                          className="grid gap-3 px-5 py-4 xl:grid-cols-[70px_minmax(220px,1.3fr)_minmax(220px,1fr)_160px_minmax(220px,1fr)] xl:items-center"
                        >
                          <div className="hidden text-sm font-black text-slate-500 xl:block">#{rowNumber}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-950 dark:text-white">{fullName}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 xl:hidden">
                              Registro #{rowNumber}
                            </div>
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
      className={`flex min-w-[180px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-800 shadow-sm shadow-blue-600/10 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-100"
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
    <div className="grid place-items-center rounded-[1.6rem] border border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-950/50">
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
          <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden grid-cols-[70px_minmax(220px,1.25fr)_minmax(220px,1fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 2xl:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
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
                  <div
                    key={row.estudiante.id}
                    className="grid gap-3 px-5 py-4 2xl:grid-cols-[70px_minmax(220px,1.25fr)_minmax(220px,1fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_120px] 2xl:items-center"
                  >
                    <div className="hidden text-sm font-black text-slate-500 2xl:block">#{rowNumber}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950 dark:text-white">{fullName}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 2xl:hidden">
                        Registro #{rowNumber}
                      </div>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:dark:bg-transparent">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 2xl:hidden">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-950 dark:text-white 2xl:mt-0">
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
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-400/20"
          : tone === "rose"
            ? "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20"
            : "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800";

  return (
    <div className={`rounded-[1.4rem] p-4 ring-1 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] opacity-75">{label}</div>
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/80 text-current shadow-sm shadow-slate-950/5 dark:bg-white/10">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}
