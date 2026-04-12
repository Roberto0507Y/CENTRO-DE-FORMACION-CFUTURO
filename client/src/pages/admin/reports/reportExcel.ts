import type { AttendanceItem } from "../../../types/attendance";
import type { CourseOption, ZoneReportResponse } from "./reportTypes";
import { escapeHtml, formatDateEs, formatNumber, formatPercent, sanitizeFilename } from "./reportFormat";
import { statusLabel } from "./reportTypes";

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

function reportStyles() {
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
    .status { font-weight: 800; }
    .status-presente { color: #047857; }
    .status-ausente { color: #be123c; }
    .status-tarde { color: #b45309; }
    .status-justificado { color: #1d4ed8; }
    .status-sin-registro { color: #64748b; }
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

export function exportAttendanceExcel(input: {
  course: CourseOption;
  date: string;
  items: AttendanceItem[];
}) {
  const summary = buildAttendanceSummary(input.items);
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
        <style>${reportStyles()}</style>
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

  downloadExcel(
    html,
    `reporte-asistencia-${sanitizeFilename(input.course.titulo)}-${input.date}.xls`
  );
}

export function exportZoneExcel(report: ZoneReportResponse) {
  const rows = report.rows
    .map((row, index) => {
      const fullName = `${row.estudiante.apellidos}, ${row.estudiante.nombres}`.trim();
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(fullName)}</td>
          <td>${escapeHtml(row.estudiante.correo)}</td>
          <td>${escapeHtml(`${formatNumber(row.tareas.puntos_obtenidos)} / ${formatNumber(row.tareas.puntos_posibles)}`)}</td>
          <td>${escapeHtml(`${formatNumber(row.quizzes.puntos_obtenidos)} / ${formatNumber(row.quizzes.puntos_posibles)}`)}</td>
          <td>${escapeHtml(`${formatNumber(row.zona.puntos_obtenidos)} / ${formatNumber(row.zona.puntos_posibles)}`)}</td>
          <td>${escapeHtml(formatPercent(row.zona.porcentaje))}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${reportStyles()}</style>
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
              <td><span class="label">Tareas</span><span class="value">${report.resumen.tareas_total}</span></td>
              <td><span class="label">Quizzes</span><span class="value">${report.resumen.quizzes_total}</span></td>
              <td><span class="label">Zona obtenida</span><span class="value">${formatNumber(report.resumen.zona_puntos_obtenidos)}</span></td>
              <td><span class="label">Zona posible</span><span class="value">${formatNumber(report.resumen.zona_puntos_posibles)}</span></td>
              <td><span class="label">Promedio</span><span class="value">${formatPercent(report.resumen.zona_promedio_porcentaje)}</span></td>
            </tr>
          </table>

          <table class="report">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Tareas</th>
                <th>Quizzes</th>
                <th>Zona</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  downloadExcel(html, `reporte-zona-${sanitizeFilename(report.curso.titulo)}.xls`);
}
