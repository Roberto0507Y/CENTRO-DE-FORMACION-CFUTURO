export type AttendanceStatus = "presente" | "ausente" | "tarde" | "justificado";

export type AttendanceRow = {
  id: number;
  curso_id: number;
  estudiante_id: number;
  fecha: string; // YYYY-MM-DD
  estado: AttendanceStatus;
  comentario: string | null;
  registrado_por: number;
  created_at: string;
  updated_at: string;
};

export type AttendanceStudentItem = {
  estudiante: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
    foto_url: string | null;
  };
  asistencia: null | Pick<AttendanceRow, "id" | "fecha" | "estado" | "comentario" | "registrado_por">;
};

export type UpsertAttendanceItemInput = {
  estudiante_id: number;
  estado: AttendanceStatus;
  comentario?: string | null;
};

