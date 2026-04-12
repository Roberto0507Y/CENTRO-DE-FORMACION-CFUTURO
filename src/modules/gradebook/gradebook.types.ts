export type GradebookCourse = {
  id: number;
  titulo: string;
};

export type GradebookTaskItem = {
  id: number;
  titulo: string;
  puntos: string;
  fecha_entrega: string;
  estado: "borrador" | "publicada" | "cerrada";
  entrega: {
    id: number;
    estado: "entregada" | "revisada" | "devuelta" | "atrasada" | "no_entregada";
    calificacion: string | number | null;
    comentario_docente: string | null;
    fecha_calificacion: string | null;
    fecha_entrega: string;
  } | null;
};

export type GradebookAttendanceItem = {
  id: number;
  fecha: string;
  estado: "presente" | "ausente" | "tarde" | "justificado";
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
  curso: GradebookCourse;
  resumen: GradebookSummary;
  tareas: GradebookTaskItem[];
  asistencia: GradebookAttendanceItem[];
};
