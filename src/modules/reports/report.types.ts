export type ReportCourse = {
  id: number;
  titulo: string;
  docente_id: number;
  docente: {
    nombres: string;
    apellidos: string;
  };
};

export type ReportStudent = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
};

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
  estudiante: ReportStudent;
  tareas: ZoneReportBucket;
  quizzes: ZoneReportBucket;
  zona: Pick<ZoneReportBucket, "puntos_obtenidos" | "puntos_posibles" | "porcentaje">;
};

export type ZoneReportSummary = {
  estudiantes: number;
  tareas_total: number;
  quizzes_total: number;
  tareas_puntos_posibles: number;
  quizzes_puntos_posibles: number;
  zona_puntos_obtenidos: number;
  zona_puntos_posibles: number;
  zona_promedio_porcentaje: number | null;
};

export type ZoneReportResponse = {
  curso: ReportCourse;
  resumen: ZoneReportSummary;
  rows: ZoneReportRow[];
};
