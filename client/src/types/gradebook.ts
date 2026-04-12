import type { AttendanceStatus } from "./attendance";
import type { TaskStatus, TaskSubmissionStatus } from "./task";

export type GradebookTaskItem = {
  id: number;
  titulo: string;
  puntos: string;
  fecha_entrega: string;
  estado: TaskStatus;
  entrega: {
    id: number;
    estado: TaskSubmissionStatus;
    calificacion: string | number | null;
    comentario_docente: string | null;
    fecha_calificacion: string | null;
    fecha_entrega: string;
  } | null;
};

export type GradebookAttendanceItem = {
  id: number;
  fecha: string;
  estado: AttendanceStatus;
  comentario: string | null;
};

export type GradebookSummary = {
  tareas_total: number;
  tareas_calificadas: number;
  puntos_obtenidos: number;
  puntos_posibles: number;
  promedio_porcentaje: number | null;
  asistencia_total: number;
  asistencias_presentes: number;
  asistencias_tarde: number;
  asistencias_justificadas: number;
  asistencias_ausentes: number;
  asistencia_porcentaje: number | null;
};

export type MyCourseGradebook = {
  curso: {
    id: number;
    titulo: string;
  };
  resumen: GradebookSummary;
  tareas: GradebookTaskItem[];
  asistencia: GradebookAttendanceItem[];
};
