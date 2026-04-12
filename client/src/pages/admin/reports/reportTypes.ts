import type { AttendanceStatus } from "../../../types/attendance";
import type { CourseListItem, CourseStatus } from "../../../types/course";

export type CourseOption = CourseListItem & { estado: CourseStatus };

export type ReportMode = "attendance" | "zone";

export type ZoneReportBucket = {
  total: number;
  calificadas?: number;
  completados?: number;
  intentos?: number;
  puntos_obtenidos: number;
  puntos_posibles: number;
  porcentaje: number | null;
};

export type ZoneReportRow = {
  estudiante: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
  };
  tareas: ZoneReportBucket;
  quizzes: ZoneReportBucket;
  zona: Pick<ZoneReportBucket, "puntos_obtenidos" | "puntos_posibles" | "porcentaje">;
};

export type ZoneReportResponse = {
  curso: {
    id: number;
    titulo: string;
    docente: {
      nombres: string;
      apellidos: string;
    };
  };
  resumen: {
    estudiantes: number;
    tareas_total: number;
    quizzes_total: number;
    tareas_puntos_posibles: number;
    quizzes_puntos_posibles: number;
    zona_puntos_obtenidos: number;
    zona_puntos_posibles: number;
    zona_promedio_porcentaje: number | null;
  };
  rows: ZoneReportRow[];
};

export type AttendanceSummary = {
  presente: number;
  ausente: number;
  tarde: number;
  justificado: number;
  sinRegistro: number;
};

export function statusLabel(status: AttendanceStatus | null) {
  if (status === "presente") return "Presente";
  if (status === "ausente") return "Ausente";
  if (status === "tarde") return "Tarde";
  if (status === "justificado") return "Justificado";
  return "Sin registro";
}
