import type { AttendanceItem } from "../../../types/attendance";
import type { CourseOption, ZoneReportResponse } from "./reportTypes";
import { escapeHtml, formatDateEs, formatNumber, formatPercent, sanitizeFilename } from "./reportFormat";
import { statusLabel } from "./reportTypes";

type ReportOutputMode = "excel" | "pdf";

function downloadExcel(html: string, filename: string) {
  const blob = new Blob([`\ufeff${html}`], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openPrintReport(html: string, title: string, targetWindow?: Window | null) {
  const printWindow = targetWindow ?? window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    throw new Error("No se pudo abrir la ventana de impresion.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
  printWindow.focus();

  printWindow.setTimeout(() => {
    printWindow.print();
  }, 350);
}

function reportStyles(mode: ReportOutputMode = "excel") {
  return `
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
    .number { text-align: right; font-weight: 800; }
    .muted { color: #64748b; font-weight: 700; }
    .status { font-weight: 800; }
    .status-presente { color: #047857; }
    .status-ausente { color: #be123c; }
    .status-tarde { color: #b45309; }
    .status-justificado { color: #1d4ed8; }
    .status-sin-registro { color: #64748b; }
    .mark { text-align: center; font-weight: 900; color: #94a3b8; }
    .mark-yes { color: #0f172a; background: #e0f2fe; }
    .student-name { font-weight: 800; }
    .zone-good { color: #047857; font-weight: 900; }
    .zone-watch { color: #b45309; font-weight: 900; }
    .zone-empty { color: #64748b; font-weight: 900; }
    ${
      mode === "pdf"
        ? `
    @page { size: landscape; margin: 11mm; }
    html, body { margin: 0; background: #fff; }
    .sheet { padding: 0; }
    .hero { border-radius: 14px; padding: 18px 20px; }
    h1 { font-size: 22px; }
    .subtitle { font-size: 11px; }
    .summary { border-spacing: 6px; margin-top: 12px; }
    .summary td { padding: 9px; border-radius: 10px; }
    .summary .label { font-size: 8px; letter-spacing: 1.2px; }
    .summary .value { font-size: 15px; }
    table.report { margin-top: 12px; table-layout: fixed; }
    .report th { padding: 7px; font-size: 8px; letter-spacing: 1px; }
    .report td { padding: 7px; font-size: 9px; word-break: break-word; }
    .report tr { break-inside: avoid; page-break-inside: avoid; }
    `
        : ""
    }
  `;
}

function buildAttendanceSummary(items: AttendanceItem[]) {
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

function attendanceMark(
  actual: AttendanceItem["asistencia"],
  expected: "presente" | "tarde" | "justificado" | "ausente" | "sin-registro"
) {
  const estado = actual?.estado ?? "sin-registro";
  return estado === expected ? "1" : "";
}

function zoneClass(percent: number | null) {
  if (percent === null) return "zone-empty";
  return percent >= 70 ? "zone-good" : "zone-watch";
}

function averageByStudents(value: number, students: number) {
  if (students <= 0) return null;
  return value / students;
}

function buildAttendanceHtml(
  input: {
    course: CourseOption;
    date: string;
    items: AttendanceItem[];
  },
  mode: ReportOutputMode
) {
  const summary = buildAttendanceSummary(input.items);
  const rows = input.items
    .map((item, index) => {
      const fullName = `${item.estudiante.apellidos}, ${item.estudiante.nombres}`.trim();
      const estado = item.asistencia?.estado ?? null;
      const estadoClass = estado ?? "sin-registro";
      const comment = item.asistencia?.comentario?.trim() || "Sin comentario";
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td class="student-name">${escapeHtml(fullName)}</td>
          <td>${escapeHtml(item.estudiante.correo)}</td>
          <td class="center muted">${item.estudiante.id}</td>
          <td class="mark ${attendanceMark(item.asistencia, "presente") ? "mark-yes" : ""}">${attendanceMark(item.asistencia, "presente")}</td>
          <td class="mark ${attendanceMark(item.asistencia, "tarde") ? "mark-yes" : ""}">${attendanceMark(item.asistencia, "tarde")}</td>
          <td class="mark ${attendanceMark(item.asistencia, "justificado") ? "mark-yes" : ""}">${attendanceMark(item.asistencia, "justificado")}</td>
          <td class="mark ${attendanceMark(item.asistencia, "ausente") ? "mark-yes" : ""}">${attendanceMark(item.asistencia, "ausente")}</td>
          <td class="mark ${attendanceMark(item.asistencia, "sin-registro") ? "mark-yes" : ""}">${attendanceMark(item.asistencia, "sin-registro")}</td>
          <td class="status status-${escapeHtml(estadoClass)}">${escapeHtml(statusLabel(estado))}</td>
          <td>${escapeHtml(comment)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte de asistencia - ${escapeHtml(input.course.titulo)}</title>
        <style>${reportStyles(mode)}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <div class="eyebrow">C.FUTURO · Asistencia por estudiante</div>
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
                <th>ID</th>
                <th>Presente</th>
                <th>Tarde</th>
                <th>Justificado</th>
                <th>Ausente</th>
                <th>Sin registro</th>
                <th>Estado final</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function buildZoneHtml(report: ZoneReportResponse, mode: ReportOutputMode) {
  const zonePossiblePerStudent =
    report.resumen.tareas_puntos_posibles + report.resumen.quizzes_puntos_posibles;
  const averageObtained = averageByStudents(
    report.resumen.zona_puntos_obtenidos,
    report.resumen.estudiantes
  );

  const rows = report.rows
    .map((row, index) => {
      const fullName = `${row.estudiante.apellidos}, ${row.estudiante.nombres}`.trim();
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td class="center muted">${row.estudiante.id}</td>
          <td class="student-name">${escapeHtml(fullName)}</td>
          <td>${escapeHtml(row.estudiante.correo)}</td>
          <td class="number">${escapeHtml(formatNumber(row.tareas.puntos_obtenidos))}</td>
          <td class="number">${escapeHtml(formatNumber(row.tareas.puntos_posibles))}</td>
          <td class="center">${row.tareas.calificadas ?? 0} / ${row.tareas.total}</td>
          <td class="number">${escapeHtml(formatNumber(row.quizzes.puntos_obtenidos))}</td>
          <td class="number">${escapeHtml(formatNumber(row.quizzes.puntos_posibles))}</td>
          <td class="center">${row.quizzes.completados ?? 0} / ${row.quizzes.total}</td>
          <td class="number">${escapeHtml(formatNumber(row.zona.puntos_obtenidos))}</td>
          <td class="number">${escapeHtml(formatNumber(row.zona.puntos_posibles))}</td>
          <td class="${zoneClass(row.zona.porcentaje)}">${escapeHtml(formatPercent(row.zona.porcentaje))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte de zona - ${escapeHtml(report.curso.titulo)}</title>
        <style>${reportStyles(mode)}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="hero">
            <div class="eyebrow">C.FUTURO · Reporte de zona</div>
            <h1>${escapeHtml(report.curso.titulo)}</h1>
            <div class="subtitle">
              Tareas + quizzes · Docente:
              ${escapeHtml(`${report.curso.docente.nombres} ${report.curso.docente.apellidos}`.trim())}
            </div>
          </div>

          <table class="summary">
            <tr>
              <td><span class="label">Estudiantes</span><span class="value">${report.resumen.estudiantes}</span></td>
              <td><span class="label">Tareas publicadas</span><span class="value">${report.resumen.tareas_total}</span></td>
              <td><span class="label">Quizzes publicados</span><span class="value">${report.resumen.quizzes_total}</span></td>
              <td><span class="label">Zona por estudiante</span><span class="value">${formatNumber(zonePossiblePerStudent)}</span></td>
              <td><span class="label">Prom. obtenido</span><span class="value">${formatNumber(averageObtained)}</span></td>
              <td><span class="label">Promedio general</span><span class="value">${formatPercent(report.resumen.zona_promedio_porcentaje)}</span></td>
            </tr>
          </table>

          <table class="report">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Tareas obt.</th>
                <th>Tareas posible</th>
                <th>Tareas calificadas</th>
                <th>Quizzes obt.</th>
                <th>Quizzes posible</th>
                <th>Quizzes completados</th>
                <th>Zona obtenida</th>
                <th>Zona posible</th>
                <th>% zona</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

export function exportAttendanceExcel(input: {
  course: CourseOption;
  date: string;
  items: AttendanceItem[];
}) {
  downloadExcel(
    buildAttendanceHtml(input, "excel"),
    `reporte-asistencia-${sanitizeFilename(input.course.titulo)}-${input.date}.xls`
  );
}

export function exportAttendancePdf(
  input: {
    course: CourseOption;
    date: string;
    items: AttendanceItem[];
  },
  targetWindow?: Window | null
) {
  openPrintReport(
    buildAttendanceHtml(input, "pdf"),
    `reporte-asistencia-${sanitizeFilename(input.course.titulo)}-${input.date}`,
    targetWindow
  );
}

export function exportZoneExcel(report: ZoneReportResponse) {
  downloadExcel(buildZoneHtml(report, "excel"), `reporte-zona-${sanitizeFilename(report.curso.titulo)}.xls`);
}

export function exportZonePdf(report: ZoneReportResponse, targetWindow?: Window | null) {
  openPrintReport(
    buildZoneHtml(report, "pdf"),
    `reporte-zona-${sanitizeFilename(report.curso.titulo)}`,
    targetWindow
  );
}
